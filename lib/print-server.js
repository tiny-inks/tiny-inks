/* Print service — server-only helpers: storage (Vercel Blob or /tmp), signed
   links, rate limiting, demo order store, staff auth, Shopify Admin client.
   Never import this from a client component. */
/* server-only: never import from a client component */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import PRINT from '@/config/print-pricing';

/* ------------------------------------------------------------ config */
export const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || '';
export const STORAGE_MODE = BLOB_TOKEN ? 'blob' : 'local';
export const LINK_TTL_HOURS = Number(process.env.PRINT_LINK_TTL_HOURS || 24);
export const RETENTION_DAYS = Number(process.env.PRINT_FILE_RETENTION_DAYS || 7);
const SIGNING_SECRET = process.env.PRINT_SIGNING_SECRET || process.env.STAFF_SESSION_SECRET || 'tiny-inks-dev-secret-change-me';
export const SIGNING_SECRET_IS_DEFAULT = !process.env.PRINT_SIGNING_SECRET && !process.env.STAFF_SESSION_SECRET;
export const LOCAL_DIR = path.join(os.tmpdir(), 'tiny-inks-print');
/* Admin API auth — Dev Dashboard apps use the client credentials grant
   (https://shopify.dev/docs/apps/build/dev-dashboard/get-api-access-tokens):
   POST /admin/oauth/access_token {grant_type=client_credentials, client_id, client_secret}
   → { access_token, expires_in: 86399 }. Cached in memory, refreshed 60 s before
   expiry, retried once on 401. A legacy SHOPIFY_ADMIN_TOKEN still works if set. */
const ADMIN_LEGACY_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN || '';
const ADMIN_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || '';
const ADMIN_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || '';
export const ADMIN_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || '';
export const ADMIN_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || '2026-01';
export const ADMIN_LIVE = Boolean(ADMIN_DOMAIN && (ADMIN_LEGACY_TOKEN || (ADMIN_CLIENT_ID && ADMIN_CLIENT_SECRET)));

/* Error text from Shopify (and anything else) can land in logs and in the signed
   webhook response. Strip credential-shaped substrings before it goes anywhere.
   Never pass raw credentials in; this is a last line of defence, not a licence. */
export function redactSecrets(value, max = 800) {
  let str;
  if (typeof value === 'string') str = value;
  else { try { str = JSON.stringify(value); } catch { str = String(value); } }
  return String(str)
    .replace(/\b(shp(?:at|ca|ss|pa|tka)_)[A-Za-z0-9]+/g, '$1[redacted]')
    .replace(/\b((?:sk|rk)_(?:live|test)_|whsec_|re_)[A-Za-z0-9_]+/g, '$1[redacted]')
    .replace(/("?(?:access_token|client_secret|refresh_token)"?\s*[:=]\s*"?)[^",&\s}]+/gi, '$1[redacted]')
    .slice(0, max);
}

/* The Admin host is used verbatim below. A value like "https://…", a custom
   domain, or a trailing path makes every Admin call fail — say so once. */
if (ADMIN_LIVE && !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(ADMIN_DOMAIN)) {
  console.warn(`shopify admin: shop domain "${redactSecrets(ADMIN_DOMAIN, 120)}" is not a bare <store>.myshopify.com host — Admin API calls use it verbatim and will likely fail`);
}

let adminTokenCache = { token: null, exp: 0 };
export async function getAdminToken(force = false) {
  if (ADMIN_LEGACY_TOKEN) return ADMIN_LEGACY_TOKEN;
  const now = Date.now();
  if (!force && adminTokenCache.token && now < adminTokenCache.exp - 60_000) return adminTokenCache.token;
  let r;
  let text = '';
  try {
    r = await fetch(`https://${ADMIN_DOMAIN}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: ADMIN_CLIENT_ID, client_secret: ADMIN_CLIENT_SECRET }).toString(),
      cache: 'no-store',
    });
    text = await r.text();
  } catch (e) {
    /* DNS / TLS / malformed host: the request never reached Shopify */
    const err = new Error(`Admin token grant request failed before Shopify answered (host=${redactSecrets(ADMIN_DOMAIN, 120)}): ${e.cause?.code || e.name}: ${redactSecrets(e.cause?.message || e.message, 200)}`);
    err.stage = 'shopify_token';
    throw err;
  }
  let j = {};
  try { j = JSON.parse(text); } catch { /* non-JSON (HTML error page) — keep the raw text below */ }
  if (!r.ok || !j.access_token) {
    const body = j && Object.keys(j).length ? j : text.slice(0, 300);
    const err = new Error(`Admin token grant failed (${r.status}) host=${redactSecrets(ADMIN_DOMAIN, 120)}: ${redactSecrets(body, 400)}`);
    err.stage = 'shopify_token';
    err.status = r.status;
    throw err;
  }
  adminTokenCache = { token: j.access_token, exp: now + Math.max(60, Number(j.expires_in) || 86399) * 1000 };
  console.log(`shopify admin: token granted host=${ADMIN_DOMAIN} version=${ADMIN_VERSION} scope=${j.scope || '(not reported)'}`);
  return adminTokenCache.token;
}

/* Every Admin API call goes through here: token injected, 401 → one forced refresh + retry */
export async function adminRequest(pathName, init = {}) {
  const doFetch = async (token) => fetch(`https://${ADMIN_DOMAIN}/admin/api/${ADMIN_VERSION}${pathName}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}), 'X-Shopify-Access-Token': token },
    cache: 'no-store',
  });
  let r = await doFetch(await getAdminToken());
  if (r.status === 401 && !ADMIN_LEGACY_TOKEN) {
    adminTokenCache = { token: null, exp: 0 };
    r = await doFetch(await getAdminToken(true));
  }
  return r;
}

export function storageStatus() {
  return {
    mode: STORAGE_MODE,
    configured: STORAGE_MODE === 'blob',
    linkTtlHours: LINK_TTL_HOURS,
    retentionDays: RETENTION_DAYS,
    warning: STORAGE_MODE === 'blob' ? null : 'BLOB_READ_WRITE_TOKEN is not set — uploads are kept in the server\'s temporary folder, which is wiped on every deploy/restart.',
  };
}

/* ------------------------------------------------------------ file validation */
const MAGIC = {
  pdf: (b) => b.slice(0, 5).toString('latin1') === '%PDF-',
  png: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  docx: (b) => b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07),
};
export function sniffType(buf, name = '') {
  if (MAGIC.pdf(buf)) return 'pdf';
  if (MAGIC.png(buf)) return 'png';
  if (MAGIC.jpg(buf)) return 'jpg';
  if (MAGIC.docx(buf) && /\.docx$/i.test(name)) return 'docx';
  return null;
}
/* returns { ok, error, pages } for PDFs: rejects encrypted / unparsable files */
export async function inspectPdf(buf) {
  const head = buf.slice(0, Math.min(buf.length, 4 * 1024 * 1024)).toString('latin1');
  const tail = buf.slice(Math.max(0, buf.length - 2 * 1024 * 1024)).toString('latin1');
  if (/\/Encrypt\b/.test(tail) || /\/Encrypt\b/.test(head)) return { ok: false, error: 'encrypted' };
  try {
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(buf, { ignoreEncryption: false, updateMetadata: false });
    const pages = doc.getPageCount();
    if (!pages) return { ok: false, error: 'corrupt' };
    return { ok: true, pages };
  } catch (e) {
    if (/encrypt/i.test(String(e?.message || e?.name))) return { ok: false, error: 'encrypted' };
    return { ok: false, error: 'corrupt' };
  }
}

/* ------------------------------------------------------------ storage */
export const safeName = (name) => String(name || 'file').replace(/[^\w.\-()؀-ۿ ]+/g, '_').slice(0, 120);
export function newStorageKey(name) {
  const id = crypto.randomBytes(12).toString('base64url');
  const day = new Date().toISOString().slice(0, 10);
  return `print/${day}/${id}-${safeName(name)}`;
}

export async function saveLocal(key, buf) {
  const full = path.join(LOCAL_DIR, key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buf);
  return `local:${key}`;
}

/* ref = "local:<key>" | "blob:<url>" — opaque to the customer, resolved only by signed links */
export async function readRef(ref) {
  if (ref.startsWith('local:')) {
    const key = ref.slice(6);
    if (key.includes('..')) throw new Error('bad ref');
    const full = path.join(LOCAL_DIR, key);
    const buf = await fs.readFile(full);
    return { buf, name: path.basename(key).replace(/^[A-Za-z0-9_-]{16}-/, '') };
  }
  if (ref.startsWith('blob:')) {
    const url = ref.slice(5);
    const r = await fetch(url, { headers: BLOB_TOKEN ? { Authorization: `Bearer ${BLOB_TOKEN}` } : {} });
    if (!r.ok) throw new Error('blob fetch failed');
    const buf = Buffer.from(await r.arrayBuffer());
    return { buf, name: decodeURIComponent(url.split('/').pop() || 'file').replace(/^[A-Za-z0-9_-]{16}-/, '') };
  }
  throw new Error('unknown ref');
}

export async function deleteRef(ref) {
  if (ref.startsWith('local:')) { await fs.rm(path.join(LOCAL_DIR, ref.slice(6)), { force: true }); return; }
  if (ref.startsWith('blob:') && BLOB_TOKEN) { const { del } = await import('@vercel/blob'); await del(ref.slice(5), { token: BLOB_TOKEN }); }
}

/* delete everything older than RETENTION_DAYS; returns counts */
export async function cleanupOld(days = RETENTION_DAYS) {
  const cutoff = Date.now() - days * 86400 * 1000;
  let removed = 0, kept = 0;
  if (BLOB_TOKEN) {
    const { list, del } = await import('@vercel/blob');
    let cursor;
    do {
      const page = await list({ prefix: 'print/', cursor, token: BLOB_TOKEN });
      for (const b of page.blobs) {
        if (new Date(b.uploadedAt).getTime() < cutoff) { await del(b.url, { token: BLOB_TOKEN }); removed++; } else kept++;
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  }
  if (fssync.existsSync(LOCAL_DIR)) {
    const walk = async (dir) => {
      for (const ent of await fs.readdir(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) { await walk(p); continue; }
        if (ent.name === 'orders.json') continue;
        const st = await fs.stat(p);
        if (st.mtimeMs < cutoff) { await fs.rm(p, { force: true }); removed++; } else kept++;
      }
    };
    await walk(LOCAL_DIR);
  }
  return { removed, kept, days };
}

/* ------------------------------------------------------------ signed links */
export function sign(payload) {
  return crypto.createHmac('sha256', SIGNING_SECRET).update(payload).digest('base64url');
}
export function signedFileLink(ref, ttlHours = LINK_TTL_HOURS, base = '') {
  const exp = Math.floor(Date.now() / 1000) + Math.round(ttlHours * 3600);
  const refB = Buffer.from(ref).toString('base64url');
  const sig = sign(`${refB}.${exp}`);
  return `${base}/api/print/file?ref=${refB}&exp=${exp}&sig=${sig}`;
}
export function verifyFileLink(refB, exp, sig) {
  if (!refB || !exp || !sig) return null;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return { expired: true };
  const good = sign(`${refB}.${exp}`);
  if (good.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig))) return null;
  return { ref: Buffer.from(refB, 'base64url').toString() };
}

/* ------------------------------------------------------------ rate limit (per instance) */
const buckets = new Map();
export function rateLimit(ip, { max = 20, windowMs = 10 * 60 * 1000 } = {}) {
  const now = Date.now();
  const b = buckets.get(ip) || { count: 0, reset: now + windowMs };
  if (now > b.reset) { b.count = 0; b.reset = now + windowMs; }
  b.count += 1;
  buckets.set(ip, b);
  if (buckets.size > 5000) buckets.clear();
  return { ok: b.count <= max, remaining: Math.max(0, max - b.count), reset: b.reset };
}
export const clientIp = (req) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';

/* ------------------------------------------------------------ staff auth */
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || '';
export const STAFF_DEMO_PASSWORD = 'tinyinks';
export const STAFF_PASSWORD_IS_DEMO = !STAFF_PASSWORD;
export const STAFF_COOKIE = 'ti_staff';
export function staffPasswordOk(pw) {
  const expected = STAFF_PASSWORD || STAFF_DEMO_PASSWORD;
  const a = Buffer.from(String(pw || '')), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export function staffToken() {
  /* same derivation as middleware.js (Web Crypto there): HMAC(secret, 'staff-session-v1') */
  return crypto.createHmac('sha256', SIGNING_SECRET).update('staff-session-v1').digest('base64url');
}

/* ------------------------------------------------------------ demo order store (no Shopify) */
const ORDERS_FILE = path.join(LOCAL_DIR, 'orders.json');
function seedOrders() {
  const now = Date.now();
  const mk = (i, ago, status, extra) => ({
    id: `demo-${1000 + i}`, name: `#P${1000 + i}`, createdAt: new Date(now - ago).toISOString(), status,
    financialStatus: 'PAID', total: 0, currency: 'AED', customer: { name: '', phone: '', email: '' }, fulfilment: 'collect', note: '', items: [], demo: true, ...extra,
  });
  return [
    mk(1, 35 * 60 * 1000, 'new', { total: 27.5, customer: { name: 'Noor Al Mazrouei', phone: '+971501234567', email: 'noor@example.com' }, fulfilment: 'collect',
      items: [{ title: 'A4 · Colour · Single-sided', quantity: 12, amount: 24.0, attributes: [{ key: 'Files', value: 'CV-final.pdf' }, { key: 'Pages', value: 'CV-final.pdf: 4' }, { key: 'Paper size', value: 'A4' }, { key: 'Colour', value: 'Colour' }, { key: 'Sides', value: 'Single-sided' }, { key: 'Copies', value: '3' }, { key: 'Finishing', value: 'staple' }, { key: 'Fulfilment', value: 'Collect from shop' }, { key: 'File ref', value: 'demo:CV-final.pdf' }] }, { title: 'Stapling', quantity: 3, amount: 3.0, attributes: [] }], pagesPrinted: 12 }),
    mk(2, 3 * 3600 * 1000, 'printing', { total: 68.0, customer: { name: 'Khalid Hassan', phone: '+971559876543', email: '' }, fulfilment: 'delivery',
      items: [{ title: 'A4 · Black & white · Double-sided', quantity: 120, amount: 54.0, attributes: [{ key: 'Files', value: 'Thesis-chapter-3.pdf' }, { key: 'Pages', value: 'Thesis-chapter-3.pdf: 120' }, { key: 'Paper size', value: 'A4' }, { key: 'Colour', value: 'Black & white' }, { key: 'Sides', value: 'Double-sided' }, { key: 'Copies', value: '1' }, { key: 'Finishing', value: 'spiral' }, { key: 'Fulfilment', value: 'Delivery' }, { key: 'Customer note', value: 'Please bind with a clear front cover' }, { key: 'File ref', value: 'demo:Thesis-chapter-3.pdf' }] }, { title: 'Spiral binding', quantity: 1, amount: 12.0, attributes: [] }, { title: 'Delivery', quantity: 1, amount: 15.0, attributes: [] }], pagesPrinted: 120, address: 'Al Reem Island, Abu Dhabi' }),
    mk(3, 30 * 3600 * 1000, 'ready', { total: 16.0, customer: { name: 'Sara M.', phone: '+971521112233', email: 'sara@example.com' }, fulfilment: 'collect',
      items: [{ title: 'A3 · Colour · Single-sided', quantity: 4, amount: 16.0, attributes: [{ key: 'Files', value: 'poster.png' }, { key: 'Pages', value: 'poster.png: 1' }, { key: 'Paper size', value: 'A3' }, { key: 'Colour', value: 'Colour' }, { key: 'Sides', value: 'Single-sided' }, { key: 'Copies', value: '4' }, { key: 'Finishing', value: 'lamination' }, { key: 'Fulfilment', value: 'Collect from shop' }, { key: 'File ref', value: 'demo:poster.png' }] }], pagesPrinted: 4 }),
  ];
}
let memOrders = null;
export async function loadDemoOrders() {
  if (memOrders) return memOrders;
  try { memOrders = JSON.parse(await fs.readFile(ORDERS_FILE, 'utf8')); }
  catch { memOrders = seedOrders(); await saveDemoOrders(memOrders).catch(() => {}); }
  return memOrders;
}
export async function saveDemoOrders(list) {
  memOrders = list;
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(ORDERS_FILE, JSON.stringify(list, null, 1));
}
export async function addDemoOrder(order) {
  const list = await loadDemoOrders();
  const n = 1000 + list.length + 1;
  const rec = { id: `demo-${n}`, name: `#P${n}`, createdAt: new Date().toISOString(), status: 'new', financialStatus: 'PAID', demo: true, ...order };
  list.unshift(rec);
  await saveDemoOrders(list);
  return rec;
}

/* ------------------------------------------------------------ Shopify Admin API */
export async function adminFetch(query, variables = {}) {
  const r = await adminRequest('/graphql.json', { method: 'POST', body: JSON.stringify({ query, variables }) });
  const j = await r.json();
  if (j.errors) throw new Error(j.errors[0]?.message || 'Admin API error');
  return j.data;
}

export const STATUSES = ['new', 'printing', 'ready', 'done'];
const STATUS_TAGS = STATUSES.map((s) => `print:${s}`);
export const statusFromTags = (tags = []) => STATUSES.find((s) => tags.includes(`print:${s}`)) || 'new';

const ORDERS_QUERY = `
  query PrintOrders($q: String!) {
    orders(first: 100, query: $q, sortKey: CREATED_AT, reverse: true) {
      edges { node {
        id name createdAt tags displayFinancialStatus note
        totalPriceSet { shopMoney { amount currencyCode } }
        customer { displayName phone email }
        email phone
        shippingAddress { address1 address2 city phone }
        customAttributes { key value }
        lineItems(first: 30) { edges { node { title quantity originalTotalSet { shopMoney { amount } } customAttributes { key value } } } }
      } }
    }
  }
`;
export async function fetchAdminOrders() {
  const data = await adminFetch(ORDERS_QUERY, { q: `tag:${PRINT.orderTag}` });
  return (data.orders?.edges || []).map(({ node: o }) => {
    const items = (o.lineItems?.edges || []).map(({ node: li }) => ({
      title: li.title, quantity: li.quantity, amount: Number(li.originalTotalSet?.shopMoney?.amount || 0), attributes: li.customAttributes || [],
    }));
    const attr = (k) => items.flatMap((i) => i.attributes).find((a) => a.key === k)?.value || (o.customAttributes || []).find((a) => a.key === k)?.value || '';
    const pagesPrinted = items.filter((i) => /^Print|A4|A3/.test(i.title) || i.attributes.some((a) => a.key === 'Pages')).reduce((s, i) => s + (i.attributes.some((a) => a.key === 'Pages') ? i.quantity : 0), 0);
    return {
      id: o.id, name: o.name, createdAt: o.createdAt, status: statusFromTags(o.tags), tags: o.tags,
      financialStatus: o.displayFinancialStatus, total: Number(o.totalPriceSet?.shopMoney?.amount || 0), currency: o.totalPriceSet?.shopMoney?.currencyCode || 'AED',
      customer: { name: o.customer?.displayName || attr('Delivery name') || '', phone: o.customer?.phone || o.phone || o.shippingAddress?.phone || attr('Phone') || '', email: o.customer?.email || o.email || '' },
      fulfilment: /deliver/i.test(attr('Fulfilment')) ? 'delivery' : 'collect',
      address: [o.shippingAddress?.address1, o.shippingAddress?.address2, o.shippingAddress?.city].filter(Boolean).join(', ') || attr('Delivery address'),
      note: o.note || attr('Customer note'), items, pagesPrinted, demo: false,
    };
  });
}
export async function setAdminStatus(id, status) {
  const remove = STATUS_TAGS.filter((t) => t !== `print:${status}`);
  await adminFetch(`mutation($id: ID!, $tags: [String!]!) { tagsRemove(id: $id, tags: $tags) { userErrors { message } } }`, { id, tags: remove });
  const d = await adminFetch(`mutation($id: ID!, $tags: [String!]!) { tagsAdd(id: $id, tags: $tags) { userErrors { message } } }`, { id, tags: [`print:${status}`] });
  const err = d.tagsAdd?.userErrors?.[0]?.message;
  if (err) throw new Error(err);
}
