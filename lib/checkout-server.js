/* Custom checkout — server-only core.
   - quoteBasket(): recomputes the whole basket from Shopify/mock data (never client prices)
   - Stripe REST (fetch — no SDK): create/retrieve PaymentIntents, verify webhook signatures
   - createOrderFromPayload(): idempotent Shopify order creation (Admin REST) with a
     demo-store bridge so everything works without credentials
   Never import from a client component. */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import CHECKOUT from '@/config/checkout';
import PRINT from '@/config/print-pricing';
import { isLive, shopifyFetch } from '@/lib/shopify';
import { getProducts } from '@/lib/products';
import { LOCAL_DIR, ADMIN_LIVE, addDemoOrder, adminFetch, adminRequest } from '@/lib/print-server';

/* ------------------------------------------------------------ env */
export const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || '';
export const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
export const STRIPE_LIVE = Boolean(STRIPE_SECRET && STRIPE_PK);
const ALERT_URL = process.env.CHECKOUT_ALERT_WEBHOOK || '';

export function checkoutStatus() {
  return {
    stripe: STRIPE_LIVE,
    cod: CHECKOUT.cod.enabled,
    shopifyOrders: ADMIN_LIVE,
    catalogue: isLive() ? 'shopify' : 'demo',
  };
}

/* ------------------------------------------------------------ money helpers (AED ↔ fils) */
export const toFils = (aed) => Math.round(Number(aed) * 100);
export const toAed = (fils) => Math.round(fils) / 100;

/* ------------------------------------------------------------ basket quote (SERVER-SIDE PRICING) */
const VARIANT_NODES_QUERY = `
  query Variants($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        title
        availableForSale
        quantityAvailable
        price { amount currencyCode }
        product { title handle }
      }
    }
  }
`;

/* demo prices for the hidden print products (mirrors lib/print.js handlePrice) */
function demoPrintPrice(handle) {
  const m = handle.match(/^print-page-(a4|a3)-(bw|colour)-(single|double)$/);
  if (m) {
    const rate = PRINT.perPage[m[1].toUpperCase()][m[2]] * (m[3] === 'double' ? PRINT.doubleSidedFactor : 1);
    return Math.round(rate * 100) / 100;
  }
  if (handle === 'print-finishing-staple') return PRINT.finishing.staple.perSet;
  if (handle === 'print-finishing-spiral') return PRINT.finishing.spiral.perSet;
  if (handle === 'print-finishing-lamination') return PRINT.finishing.lamination.perPage;
  if (handle === 'print-delivery') return PRINT.delivery.fee;
  if (handle === 'print-minimum-topup') return 1;
  return null;
}

async function resolveVariantsDemo(items) {
  const products = await getProducts('en');
  return items.map(({ variantId, qty }) => {
    if (variantId?.startsWith('demo-print-')) {
      const handle = variantId.replace(/^demo-/, '');
      const price = demoPrintPrice(handle);
      if (price == null) return { variantId, qty, issue: 'not_found' };
      return { variantId, qty, price, title: handle, handle, available: true, quantityAvailable: null, print: true };
    }
    const p = products.find((x) => x.variantId === variantId);
    if (!p) return { variantId, qty, issue: 'not_found' };
    if (!p.available) return { variantId, qty, issue: 'unavailable', title: p.title };
    return { variantId, qty, price: p.price, title: p.title, handle: p.handle, available: true, quantityAvailable: null };
  });
}

async function resolveVariantsLive(items) {
  const printItems = items.filter((i) => i.variantId?.startsWith('demo-print-'));
  const realItems = items.filter((i) => !i.variantId?.startsWith('demo-print-'));
  const out = [];
  if (realItems.length) {
    const data = await shopifyFetch(VARIANT_NODES_QUERY, { ids: realItems.map((i) => i.variantId) });
    realItems.forEach((item, idx) => {
      const node = data.nodes?.[idx];
      if (!node?.id) { out.push({ ...item, issue: 'not_found' }); return; }
      if (!node.availableForSale) { out.push({ ...item, issue: 'unavailable', title: node.product?.title }); return; }
      /* quantityAvailable is null when inventory is untracked (= unlimited);
         availableForSale above already respects "continue selling when out of stock" */
      if (node.quantityAvailable != null) {
        if (node.quantityAvailable <= 0) { out.push({ ...item, issue: 'unavailable', title: node.product?.title }); return; }
        if (item.qty > node.quantityAvailable) { out.push({ ...item, issue: 'insufficient', availableQty: node.quantityAvailable, title: node.product?.title }); return; }
      }
      out.push({
        variantId: node.id, qty: item.qty, price: Number(node.price.amount), currency: node.price.currencyCode,
        title: node.product?.title + (node.title && node.title !== 'Default Title' ? ` — ${node.title}` : ''),
        handle: node.product?.handle, available: true, quantityAvailable: node.quantityAvailable,
      });
    });
  }
  /* demo print variants can't be bought in live mode — the hidden products must exist */
  printItems.forEach((i) => out.push({ ...i, issue: 'not_found' }));
  return out;
}

/* items: [{ variantId, qty, attributes? }] (attributes carried through, never priced)
   delivery: 'delivery' | 'collect' */
export async function quoteBasket(items, delivery = 'delivery') {
  const clean = (Array.isArray(items) ? items : [])
    .filter((i) => i && typeof i.variantId === 'string' && Number(i.qty) > 0)
    .slice(0, 60)
    .map((i) => ({ variantId: i.variantId.slice(0, 120), qty: Math.min(9999, Math.floor(Number(i.qty))) }));
  if (!clean.length) return { ok: false, error: 'empty' };

  const resolved = isLive() ? await resolveVariantsLive(clean) : await resolveVariantsDemo(clean);
  const issues = resolved.filter((r) => r.issue).map(({ variantId, issue, title, availableQty }) => ({ variantId, issue, title: title || null, availableQty: availableQty ?? null }));
  if (issues.length) return { ok: false, error: 'items', issues };

  const lines = resolved.map((r) => ({
    variantId: r.variantId, qty: r.qty, title: r.title, handle: r.handle,
    unitFils: toFils(r.price), totalFils: toFils(r.price) * r.qty, print: !!r.print,
  }));
  const subtotalFils = lines.reduce((s, l) => s + l.totalFils, 0);
  const hasPrintDelivery = lines.some((l) => /print-delivery$/.test(l.handle || ''));
  const method = delivery === 'collect' ? 'collect' : 'delivery';
  const deliveryFils = method === 'collect' || hasPrintDelivery
    ? 0
    : subtotalFils >= toFils(CHECKOUT.delivery.freeOver) ? 0 : toFils(CHECKOUT.delivery.fee);
  const totalFils = subtotalFils + deliveryFils;
  return {
    ok: true, currency: CHECKOUT.currency, lines, subtotalFils, deliveryFils, totalFils,
    method, freeOverFils: toFils(CHECKOUT.delivery.freeOver), taxesIncluded: CHECKOUT.taxesIncludedInPrices,
    hasPrint: lines.some((l) => l.print || /^print-/.test(l.handle || '')),
  };
}

/* ------------------------------------------------------------ Stripe REST (no SDK) */
async function stripeFetch(pathName, params, method = 'POST') {
  const body = params ? new URLSearchParams(flatten(params)).toString() : undefined;
  const r = await fetch(`https://api.stripe.com/v1/${pathName}`, {
    method,
    headers: { Authorization: `Bearer ${STRIPE_SECRET}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  const j = await r.json();
  if (!r.ok) {
    const e = new Error(j.error?.message || 'stripe_error');
    e.code = j.error?.code || j.error?.type || 'stripe_error';
    e.status = r.status;
    throw e;
  }
  return j;
}
function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v == null) continue;
    if (typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else if (Array.isArray(v)) v.forEach((x, i) => (typeof x === 'object' ? flatten(x, `${key}[${i}]`, out) : (out[`${key}[${i}]`] = String(x))));
    else out[key] = String(v);
  }
  return out;
}

/* the webhook rebuilds the order from PaymentIntent metadata (survives any server) —
   the payload is chunked into metadata keys o0..oN (500-char limit per value) */
export function chunkPayload(payload) {
  let json = JSON.stringify(payload);
  if (json.length > 17000) {
    /* too big (many print files): drop the signed URLs, keep the refs — staff can re-sign */
    const slim = JSON.parse(json);
    for (const it of slim.items || []) it.attributes = (it.attributes || []).filter((a) => a.key !== 'File URL');
    json = JSON.stringify(slim);
  }
  const chunks = {};
  for (let i = 0; i * 450 < json.length && i < 40; i++) chunks[`o${i}`] = json.slice(i * 450, (i + 1) * 450);
  chunks.oCount = String(Math.ceil(json.length / 450));
  return chunks;
}
export function unchunkPayload(metadata = {}) {
  const n = Number(metadata.oCount || 0);
  let json = '';
  for (let i = 0; i < n; i++) json += metadata[`o${i}`] || '';
  try { return JSON.parse(json); } catch { return null; }
}

export async function createPaymentIntent({ amountFils, payload, locale }) {
  return stripeFetch('payment_intents', {
    amount: amountFils,
    currency: CHECKOUT.currency.toLowerCase(),
    'automatic_payment_methods[enabled]': 'true',
    description: `tinyinks.ae order (${payload.items.length} lines)`,
    receipt_email: payload.contact?.email || undefined,
    metadata: { site: 'tinyinks.ae', locale, ...chunkPayload(payload) },
  });
}
export const retrievePaymentIntent = (id) => stripeFetch(`payment_intents/${id}`, null, 'GET');

/* Stripe webhook signature: v1 = HMAC-SHA256(secret, `${t}.${rawBody}`) */
export function verifyStripeSignature(rawBody, header, secret = STRIPE_WEBHOOK_SECRET, toleranceSec = 300) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=').map((s) => s.trim())));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest('hex');
  const given = header.split(',').filter((p) => p.trim().startsWith('v1=')).map((p) => p.trim().slice(3));
  return given.some((sig) => sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
}

/* ------------------------------------------------------------ idempotency map (pi/cod-key → order) */
const MAP_FILE = path.join(LOCAL_DIR, 'checkout-map.json');
async function readMap() {
  try { return JSON.parse(await fs.readFile(MAP_FILE, 'utf8')); } catch { return {}; }
}
async function writeMap(map) {
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(MAP_FILE, JSON.stringify(map, null, 1));
}
export async function findOrderForKey(key) {
  const map = await readMap();
  if (map[key]) return map[key];
  /* durable check: the order carries a tag with the key (works across instances) */
  if (ADMIN_LIVE) {
    try {
      const d = await adminFetch(`query($q: String!) { orders(first: 1, query: $q) { edges { node { id name } } } }`, { q: `tag:'${tagForKey(key)}'` });
      const node = d.orders?.edges?.[0]?.node;
      if (node) { map[key] = { orderName: node.name, orderId: node.id, at: new Date().toISOString() }; await writeMap(map); return map[key]; }
    } catch (e) { console.error('order lookup failed:', e.message); }
  }
  return null;
}
export async function rememberOrder(key, rec) {
  const map = await readMap();
  map[key] = { ...rec, at: new Date().toISOString() };
  await writeMap(map);
}
export const tagForKey = (key) => `pi-${String(key).replace(/[^\w-]/g, '').slice(0, 36)}`;

/* ------------------------------------------------------------ Shopify order creation (Admin REST) */
const gidToNumeric = (gid) => {
  const m = String(gid).match(/ProductVariant\/(\d+)/);
  return m ? Number(m[1]) : null;
};

function splitName(name = '') {
  const parts = String(name).trim().split(/\s+/);
  return { first_name: parts[0] || 'Customer', last_name: parts.slice(1).join(' ') || '-' };
}

/* payload: { items:[{variantId,qty,title,unitFils,attributes?}], contact, address, method, note, locale }
   payment: { kind:'stripe', pi } | { kind:'cod', key }  quote: fresh server quote */
export async function createOrderFromPayload(payload, quote, payment) {
  const key = payment.kind === 'stripe' ? payment.pi : `cod_${payment.key}`;
  const existing = await findOrderForKey(key);
  if (existing) return { ...existing, duplicate: true };

  const isPrint = quote.hasPrint || payload.items.some((i) => (i.attributes || []).some((a) => a.key === 'File ref'));
  const tags = [CHECKOUT.tags.web, tagForKey(key)];
  if (payment.kind === 'cod') tags.push(CHECKOUT.tags.cod);
  if (isPrint) tags.push(CHECKOUT.tags.print);
  const noteLines = [
    payment.kind === 'stripe' ? `Stripe payment_intent: ${payment.pi}` : `Cash on delivery (key ${payment.key})`,
    payload.note ? `Customer note: ${payload.note}` : null,
  ].filter(Boolean);

  if (!ADMIN_LIVE) {
    /* demo bridge: the staff app queue is the order book */
    const rec = await addDemoOrder({
      total: toAed(quote.totalFils),
      currency: quote.currency,
      customer: { name: payload.contact?.name || '', phone: payload.contact?.phone || '', email: payload.contact?.email || '' },
      fulfilment: quote.method,
      address: payload.address?.line || '',
      note: noteLines.join(' · '),
      pagesPrinted: sumPages(payload.items),
      channel: 'web',
      financialStatus: payment.kind === 'cod' ? 'PENDING' : 'PAID',
      items: quote.lines.map((l) => {
        const src = payload.items.find((i) => i.variantId === l.variantId);
        return { title: l.title, quantity: l.qty, amount: toAed(l.totalFils), attributes: (src?.attributes || []).slice(0, 20) };
      }),
    });
    const rememberRec = { orderName: rec.name, orderId: rec.id, demo: true };
    await rememberOrder(key, rememberRec);
    return rememberRec;
  }

  const line_items = quote.lines.map((l) => {
    const src = payload.items.find((i) => i.variantId === l.variantId);
    return {
      variant_id: gidToNumeric(l.variantId),
      quantity: l.qty,
      properties: (src?.attributes || []).slice(0, 25).map((a) => ({ name: String(a.key).slice(0, 100), value: String(a.value).slice(0, 900) })),
    };
  });
  const order = {
    line_items,
    email: payload.contact?.email || undefined,
    phone: undefined, /* phone goes on the address — order.phone must be unique per customer in Shopify */
    customer: { ...splitName(payload.contact?.name), email: payload.contact?.email || undefined },
    shipping_address: quote.method === 'delivery' ? {
      ...splitName(payload.contact?.name),
      phone: payload.contact?.phone || undefined,
      address1: (payload.address?.line || '').split('\n')[0].slice(0, 250) || 'Abu Dhabi',
      address2: (payload.address?.line || '').split('\n').slice(1).join(', ').slice(0, 250) || undefined,
      city: 'Abu Dhabi', country_code: 'AE',
    } : undefined,
    shipping_lines: [{
      title: quote.method === 'delivery' ? CHECKOUT.delivery.title.en : CHECKOUT.delivery.collectTitle.en,
      price: toAed(quote.deliveryFils).toFixed(2), code: quote.method,
    }],
    financial_status: payment.kind === 'cod' ? 'pending' : 'paid',
    transactions: payment.kind === 'stripe' ? [{ kind: 'sale', status: 'success', amount: toAed(quote.totalFils).toFixed(2), gateway: 'Stripe (tinyinks.ae)' }] : undefined,
    currency: quote.currency,
    taxes_included: CHECKOUT.taxesIncludedInPrices,
    note: noteLines.join('\n'),
    note_attributes: [
      ...(payment.kind === 'stripe' ? [{ name: 'stripe_payment_intent', value: payment.pi }] : []),
      { name: 'checkout', value: 'tinyinks.ae custom checkout' },
    ],
    tags: tags.join(', '),
    inventory_behaviour: 'decrement_obeying_policy',
    send_receipt: false,
  };

  const r = await adminRequest('/orders.json', { method: 'POST', body: JSON.stringify({ order }) });
  const j = await r.json();
  if (!r.ok || !j.order) {
    const e = new Error(`Shopify order create failed (${r.status}): ${JSON.stringify(j.errors || j).slice(0, 300)}`);
    e.status = r.status;
    throw e;
  }
  /* payment_intent also as a metafield for programmatic lookup */
  if (payment.kind === 'stripe') {
    adminRequest(`/orders/${j.order.id}/metafields.json`, {
      method: 'POST',
      body: JSON.stringify({ metafield: { namespace: 'checkout', key: 'stripe_payment_intent', type: 'single_line_text_field', value: payment.pi } }),
    }).catch((e) => console.error('metafield failed:', e.message));
  }
  const rec = { orderName: j.order.name, orderId: String(j.order.id) };
  await rememberOrder(key, rec);
  return rec;
}

const sumPages = (items) => items.reduce((s, i) => {
  const pages = (i.attributes || []).find((a) => a.key === 'Print order')?.value?.match(/(\d+) pages/);
  return s + (pages ? Number(pages[1]) : 0);
}, 0);

/* ------------------------------------------------------------ failure recording + alerting */
export async function recordFailedOrder(key, payload, error) {
  console.error(`ORDER CREATION FAILED for ${key}:`, error?.message || error);
  try {
    const dir = path.join(LOCAL_DIR, 'failed-orders');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${String(key).replace(/[^\w-]/g, '_')}.json`), JSON.stringify({ key, payload, error: String(error?.message || error), at: new Date().toISOString() }, null, 1));
  } catch {}
  if (ALERT_URL) {
    fetch(ALERT_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `⚠️ tinyinks.ae: paid order NOT created in Shopify. key=${key} error=${String(error?.message || error).slice(0, 300)}` }),
    }).catch(() => {});
  }
}

/* sanitised input helpers */
export const cleanStr = (v, n) => String(v ?? '').trim().slice(0, n);
export function cleanPayload(body, locale) {
  const items = (Array.isArray(body.items) ? body.items : []).slice(0, 60).map((i) => ({
    variantId: cleanStr(i.variantId, 120),
    qty: Math.max(1, Math.min(9999, Math.floor(Number(i.qty) || 1))),
    attributes: (Array.isArray(i.attributes) ? i.attributes : []).slice(0, 25).map((a) => ({ key: cleanStr(a.key, 100), value: cleanStr(a.value, 900) })).filter((a) => a.key),
  }));
  return {
    items,
    contact: {
      name: cleanStr(body.contact?.name, 120),
      email: cleanStr(body.contact?.email, 200),
      phone: cleanStr(body.contact?.phone, 40),
    },
    address: { line: cleanStr(body.address?.line, 500), lat: cleanStr(body.address?.lat, 20), lon: cleanStr(body.address?.lon, 20) },
    method: body.method === 'collect' ? 'collect' : 'delivery',
    note: cleanStr(body.note, 500),
    locale: locale === 'ar' ? 'ar' : 'en',
  };
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s()-]{6,}$/;
export function validateContact(payload) {
  const errs = [];
  if (!payload.contact.name) errs.push('name');
  if (!EMAIL_RE.test(payload.contact.email)) errs.push('email');
  if (!PHONE_RE.test(payload.contact.phone)) errs.push('phone');
  if (payload.method === 'delivery' && !payload.address.line.trim()) errs.push('address');
  return errs;
}
