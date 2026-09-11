#!/usr/bin/env node
/* Tiny Inks — environment check. Safe to run against production values.

   Where the values come from:
     vercel env run -e production -- node scripts/check-production-env.mjs
     node scripts/check-production-env.mjs --file <dotenv file>

   Options:
     --env production|preview|development   which rules to apply (default: production)
     --expect-shop <host>                   store the Shopify variables must point at
                                            (default: tiny-inks-stationery.myshopify.com)
     --probe-shopify-token                  ALSO request an Admin token from Shopify with these
                                            exact values; prints only the HTTP status, Shopify's
                                            error code, or the granted scopes
     --no-color

   Guarantees:
     - never prints a secret: secrets show as "set (N chars, prefix)"
     - identifiers (Shopify Client ID, public tokens) are masked to first/last 4 characters
     - no network access unless --probe-shopify-token is passed
     - never creates a payment or an order, never changes anything
   Exit code: 1 if any check FAILs, 2 for bad arguments, otherwise 0.
   What every variable means: ENVIRONMENT_SETUP.md */

import fs from 'node:fs';

/* ------------------------------------------------------------ arguments */
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f) => {
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined;
};

if (has('--help') || has('-h')) {
  console.log('Usage: node scripts/check-production-env.mjs [--file <dotenv>] [--env production|preview|development] [--expect-shop <host>] [--probe-shopify-token] [--no-color]');
  process.exit(0);
}

const TARGET = (val('--env') || 'production').toLowerCase();
if (!['production', 'preview', 'development'].includes(TARGET)) {
  console.error(`--env must be production, preview or development (got "${TARGET}")`);
  process.exit(2);
}
const STRICT = TARGET !== 'development';
const EXPECTED_SHOP = (val('--expect-shop') || 'tiny-inks-stationery.myshopify.com').toLowerCase();
const PROBE = has('--probe-shopify-token');
const COLOR = !has('--no-color') && process.stdout.isTTY && !process.env.NO_COLOR;

/* ------------------------------------------------------------ load values */
const duplicates = [];
function parseDotenv(text) {
  const env = {};
  const seen = {};
  for (const line of text.replace(/^﻿/, '').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (!m) continue;
    const [, key, rest] = m;
    const t = rest.trim();
    let value;
    if (t.startsWith('"') && t.lastIndexOf('"') > 0) {
      value = t.slice(1, t.lastIndexOf('"')).replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\"/g, '"');
    } else if (t.startsWith("'") && t.lastIndexOf("'") > 0) {
      value = t.slice(1, t.lastIndexOf("'"));
    } else {
      value = t.replace(/\s+#.*$/, '');
    }
    seen[key] = (seen[key] || 0) + 1;
    env[key] = value;
  }
  for (const [k, n] of Object.entries(seen)) if (n > 1) duplicates.push([k, n]);
  return env;
}

let ENV;
let SOURCE;
if (has('--file')) {
  const file = val('--file');
  if (!file) { console.error('--file needs a path'); process.exit(2); }
  try { ENV = parseDotenv(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`cannot read ${file}: ${e.code || e.message}`); process.exit(2); }
  SOURCE = `file ${file}`;
} else {
  ENV = process.env;
  SOURCE = 'process environment';
}

const raw = (k) => (Object.prototype.hasOwnProperty.call(ENV, k) && ENV[k] != null ? String(ENV[k]) : undefined);
const present = (k) => { const v = raw(k); return v !== undefined && v !== ''; };

/* ------------------------------------------------------------ safe display */
const SECRET_VALUE_RE = /^(sk|rk)_(live|test)_|^whsec_|^re_[A-Za-z0-9_]{8,}|^shp[a-z]{2}_|^vercel_blob_rw_/i;
const PREFIXES = ['sk_live_', 'sk_test_', 'rk_live_', 'rk_test_', 'pk_live_', 'pk_test_', 'whsec_', 're_', 'shpat_', 'shpss_', 'shpca_', 'shppa_', 'vercel_blob_rw_'];
const esc = (s) => JSON.stringify(s).slice(1, -1);
const showSecret = (v) => {
  const p = PREFIXES.find((x) => v.trim().startsWith(x));
  return `set (${v.length} chars${p ? `, starts ${p}` : ''})`;
};
const showMasked = (v) => (v.length < 12 ? `set (${v.length} chars)` : `${esc(v.slice(0, 4))}…${esc(v.slice(-4))} (${v.length} chars)`);
const showEmail = (v) => JSON.stringify(v.replace(/[^\s<>@]+@/, '***@'));
const looksSecret = (v) => SECRET_VALUE_RE.test(v.trim());
function display(v, show) {
  if (show === 'secret') return showSecret(v);
  const t = v.trim();
  /* a secret pasted into the wrong (non-secret) variable must not be printed either */
  if (looksSecret(t) || (show !== 'mask' && /^[A-Za-z0-9_-]{24,}$/.test(t))) return showSecret(v);
  if (show === 'mask') return showMasked(v);
  if (show === 'email') return showEmail(v);
  const s = JSON.stringify(v);
  return s.length > 90 ? `${s.slice(0, 86)}…"` : s;
}

/* ------------------------------------------------------------ report rows */
const rows = [];
const section = (title) => rows.push({ section: title });
const add = (status, name, detail) => rows.push({ status, name, detail });
const SENSITIVE_NOTE = ' (if it is marked Sensitive in Vercel its value may not be readable outside Vercel — confirm it in the dashboard)';

function hygiene(v) {
  const out = [];
  if (v !== v.trim()) out.push(['FAIL', 'has leading/trailing whitespace or a newline — the code uses the value verbatim']);
  else if (/[\r\n\t]/.test(v)) out.push(['FAIL', 'contains a line break or tab']);
  const t = v.trim();
  if (t.length >= 2 && /^(["'`]).*\1$/.test(t)) out.push(['FAIL', 'is wrapped in quotes — the quotes become part of the value']);
  if (/^(x{3,}|your[-_ ]|change[-_ ]?me|placeholder|todo\b|<[^>@]*>$|\*{3,})/i.test(t) || /x{8,}/i.test(t)) {
    out.push(['FAIL', 'looks like a placeholder, not a real value']);
  }
  return out;
}

/* need: 'required' | 'recommended' | 'optional'. Development rules soften "required". */
function check(name, { need = 'optional', show = 'plain', rules = () => [], unsetNote = '' } = {}) {
  const v = raw(name);
  const level = STRICT ? need : need === 'required' ? 'recommended' : need;
  if (v === undefined || v === '') {
    const note = unsetNote ? ` — ${unsetNote}` : '';
    if (level === 'required') add('FAIL', name, `missing or empty${note}${show === 'secret' ? SENSITIVE_NOTE : ''}`);
    else if (level === 'recommended') add('WARN', name, `not set${note}`);
    else add('INFO', name, `not set${note}`);
    return '';
  }
  const issues = [...hygiene(v), ...rules(v.trim(), v)];
  if (show !== 'secret' && looksSecret(v) && !issues.some(([s]) => s === 'FAIL')) issues.push(['FAIL', 'holds a secret key or token — wrong variable']);
  const shown = display(v, show);
  if (!issues.length) add('PASS', name, shown);
  else add(issues.some(([s]) => s === 'FAIL') ? 'FAIL' : 'WARN', name, `${shown} — ${issues.map(([, m]) => m).join('; ')}`);
  return v;
}

/* ------------------------------------------------------------ rules */
const isHttpsUrl = (t) => { try { return new URL(t).protocol === 'https:'; } catch { return false; } };
const EMAIL_RE = /^(?:[^<>]*<\s*)?[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+\s*>?$/;
const emailRule = (t) => (EMAIL_RE.test(t) ? [] : [['WARN', 'is not an email address or "Name <email@domain>"']]);
const apiVersionRule = (t) => (/^\d{4}-(01|04|07|10)$/.test(t) ? [] : [['WARN', 'is not a Shopify API version such as 2026-01']]);
const bareHost = (v) => String(v || '').trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split('/')[0].replace(/:\d+$/, '').toLowerCase();

function shopDomainRules({ adminApi }) {
  return (t) => {
    if (looksSecret(t) || /^[A-Za-z0-9_-]{24,}$/.test(t)) return [['FAIL', 'holds a key or token, not a hostname']];
    const out = [];
    const scheme = t.match(/^[a-z][a-z0-9+.-]*:\/\//i);
    if (scheme) out.push(['FAIL', `starts with "${scheme[0]}" — remove it; the code adds https:// itself`]);
    const rest = scheme ? t.slice(scheme[0].length) : t;
    const slash = rest.indexOf('/');
    const host = slash >= 0 ? rest.slice(0, slash) : rest;
    const pathPart = slash >= 0 ? rest.slice(slash) : '';
    if (pathPart === '/') out.push(['FAIL', 'ends with "/" — remove it; the code appends /admin/… and /api/… itself']);
    else if (pathPart) out.push(['FAIL', `includes the path "${pathPart}" — hostname only; the code appends /admin/… and /api/… itself`]);
    if (/:\d+$/.test(host)) out.push(['FAIL', 'includes a port']);
    const h = host.replace(/:\d+$/, '');
    if (/\s/.test(h)) out.push(['FAIL', 'contains spaces']);
    if (h !== h.toLowerCase()) out.push(['WARN', 'has uppercase letters — use lowercase']);
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(h)) {
      out.push([adminApi ? 'FAIL' : 'WARN', `"${h}" is not a <store>.myshopify.com hostname${adminApi ? ' — the Admin API needs the myshopify.com host, not a custom domain' : ''}`]);
    } else if (h.toLowerCase() !== EXPECTED_SHOP) {
      out.push(['FAIL', `points at ${h.toLowerCase()}, expected ${EXPECTED_SHOP} (override with --expect-shop)`]);
    }
    return out;
  };
}

function clientIdRule(t) {
  if (/^shp[a-z]{2}_/i.test(t)) return [['FAIL', 'starts with a Shopify token prefix (shp…_) — that is a token or secret, not the Client ID']];
  if (looksSecret(t) || /^pk_(live|test)_/.test(t)) return [['FAIL', 'is a Stripe/Resend/Vercel key, not a Shopify Client ID']];
  if (/myshopify\.com|^https?:\/\//i.test(t)) return [['FAIL', 'is a domain or URL, not a Client ID']];
  if (/\s/.test(t)) return [['FAIL', 'contains spaces']];
  if (!/^[0-9a-f]{32}$/.test(t)) return [['WARN', 'is not 32 lowercase hex characters, the usual shape of a Shopify Client ID — compare it with Dev Dashboard → app → Settings']];
  return [];
}

function clientSecretRule(t, id) {
  const out = [];
  if (id && t === id.trim()) out.push(['FAIL', 'is identical to SHOPIFY_CLIENT_ID — the secret field holds the Client ID']);
  if (/^shpat_/.test(t)) out.push(['FAIL', 'is an Admin API access token (shpat_), not a client secret']);
  if (/^(sk|rk|pk)_(live|test)_|^whsec_|^re_[A-Za-z0-9_]{8,}|^vercel_blob_rw_/.test(t)) out.push(['FAIL', 'is a Stripe/Resend/Vercel key, not a Shopify client secret']);
  if (/\s/.test(t)) out.push(['FAIL', 'contains spaces']);
  if (t.length < 20) out.push(['WARN', 'is unusually short for a client secret']);
  return out;
}

/* ------------------------------------------------------------ checks */
section('Mode');
check('NEXT_PUBLIC_DEMO_MODE', {
  need: 'recommended',
  unsetNote: 'live mode whenever the Storefront domain and token are set; set it to false explicitly',
  rules: (t, v) => {
    if (v === 'true') return STRICT ? [['FAIL', 'demo mode is ON — sample catalogue, and orders never reach Shopify']] : [];
    if (v === 'false') return [];
    return [['WARN', 'only the exact string "true" enables demo mode; anything else (e.g. "TRUE") means live mode — use true or false']];
  },
});

section('Shopify Storefront API — catalogue and server-side prices');
check('NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN', { need: 'required', rules: shopDomainRules({ adminApi: false }) });
check('NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN', {
  need: 'required',
  show: 'mask',
  rules: (t) => {
    if (/^shp(at|ss|ca|pa)_/.test(t)) return [['FAIL', 'is an Admin credential — NEXT_PUBLIC_ values are sent to every browser; use the Storefront API public token']];
    if (looksSecret(t)) return [['FAIL', 'secret-looking value in a public variable']];
    if (/\s/.test(t)) return [['FAIL', 'contains spaces']];
    return [];
  },
});
check('NEXT_PUBLIC_SHOPIFY_API_VERSION', { unsetNote: 'defaults to 2026-01', rules: apiVersionRule });

section('Shopify Admin API — order creation (webhook) and staff queue');
const usesLegacy = present('SHOPIFY_ADMIN_TOKEN');
const clientId = check('SHOPIFY_CLIENT_ID', { need: usesLegacy ? 'optional' : 'required', show: 'mask', rules: clientIdRule });
check('SHOPIFY_CLIENT_SECRET', { need: usesLegacy ? 'optional' : 'required', show: 'secret', rules: (t) => clientSecretRule(t, clientId) });
const hasFallbackHost = present('SHOPIFY_STORE_DOMAIN') || present('NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN');
check('SHOPIFY_SHOP_DOMAIN', {
  need: hasFallbackHost ? 'recommended' : 'required',
  unsetNote: hasFallbackHost ? 'the Admin host falls back to SHOPIFY_STORE_DOMAIN, then NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN — set it explicitly' : 'the Admin API has no host',
  rules: shopDomainRules({ adminApi: true }),
});
check('SHOPIFY_STORE_DOMAIN', { unsetNote: 'correct — older fallback name, not needed', rules: shopDomainRules({ adminApi: true }) });
check('SHOPIFY_ADMIN_API_VERSION', { unsetNote: 'defaults to 2026-01', rules: apiVersionRule });
check('SHOPIFY_ADMIN_TOKEN', {
  show: 'secret',
  unsetNote: 'correct for a Dev Dashboard app — the client ID/secret are used',
  rules: (t) => {
    const out = [];
    if (present('SHOPIFY_CLIENT_ID') || present('SHOPIFY_CLIENT_SECRET')) out.push(['WARN', 'is set, so it is used INSTEAD of SHOPIFY_CLIENT_ID/SECRET and no token request is made — leave it empty for a Dev Dashboard app']);
    if (!/^shpat_/.test(t)) out.push(['WARN', 'does not start with shpat_ (the format of an Admin API access token)']);
    return out;
  },
});

const hostVar = ['SHOPIFY_SHOP_DOMAIN', 'SHOPIFY_STORE_DOMAIN', 'NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN'].find(present);
const adminHost = hostVar ? raw(hostVar) : '';
const adminLive = Boolean(adminHost && (usesLegacy || (present('SHOPIFY_CLIENT_ID') && present('SHOPIFY_CLIENT_SECRET'))));
if (!adminLive) {
  add(STRICT ? 'FAIL' : 'INFO', 'Admin API', 'not configured — paid orders are written to the demo order store, NOT to Shopify (shopifyOrders: false)');
} else {
  const hostSafe = !looksSecret(adminHost) && !/^[A-Za-z0-9_-]{24,}$/.test(adminHost.trim());
  add('INFO', 'Admin host used', hostSafe ? `${JSON.stringify(adminHost)} (from ${hostVar})` : `(hidden — value looks like a key) from ${hostVar}`);
  if (usesLegacy) {
    add('INFO', 'Admin auth', 'static SHOPIFY_ADMIN_TOKEN — no token request');
  } else {
    add('INFO', 'Token request built', hostSafe ? `POST ${JSON.stringify(`https://${adminHost}/admin/oauth/access_token`)}` : 'POST https://(hidden)/admin/oauth/access_token');
    add('INFO', 'client_id sent', display(raw('SHOPIFY_CLIENT_ID'), 'mask'));
    add('INFO', 'client_secret sent', showSecret(raw('SHOPIFY_CLIENT_SECRET')));
  }
  if (hostSafe) add('INFO', 'Order request built', `POST ${JSON.stringify(`https://${adminHost}/admin/api/${raw('SHOPIFY_ADMIN_API_VERSION') || '2026-01'}/orders.json`)}`);
}
if (present('SHOPIFY_SHOP_DOMAIN') && present('SHOPIFY_STORE_DOMAIN')) {
  if (bareHost(raw('SHOPIFY_SHOP_DOMAIN')) !== bareHost(raw('SHOPIFY_STORE_DOMAIN'))) add('FAIL', 'Duplicate host', 'SHOPIFY_SHOP_DOMAIN and SHOPIFY_STORE_DOMAIN point at different stores (SHOPIFY_SHOP_DOMAIN wins)');
  else add('WARN', 'Duplicate host', 'SHOPIFY_SHOP_DOMAIN and SHOPIFY_STORE_DOMAIN are both set — remove SHOPIFY_STORE_DOMAIN');
}
if (adminHost && present('NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN') && bareHost(adminHost) !== bareHost(raw('NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN'))) {
  const myshopify = (h) => /\.myshopify\.com$/.test(h);
  if (myshopify(bareHost(adminHost)) && myshopify(bareHost(raw('NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN')))) {
    add('FAIL', 'Store mismatch', 'the Admin host and the Storefront domain are different stores — catalogue variant IDs would not exist in the Admin store');
  } else {
    add('WARN', 'Store match', 'the Admin host and the Storefront domain are different hostnames — make sure both belong to the same store');
  }
}

section('Stripe — payments');
const pk = check('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', {
  need: 'required',
  show: 'mask',
  rules: (t) => {
    if (/^(sk|rk)_/.test(t)) return [['FAIL', 'is a SECRET key in a public variable — it is sent to every browser; treat that key as exposed']];
    if (!/^pk_(live|test)_/.test(t)) return [['FAIL', 'does not start with pk_live_ or pk_test_']];
    if (TARGET === 'production' && t.startsWith('pk_test_')) return [['WARN', 'test-mode key in production — no real payments']];
    return [];
  },
});
const sk = check('STRIPE_SECRET_KEY', {
  need: 'required',
  show: 'secret',
  rules: (t) => {
    if (t.startsWith('pk_')) return [['FAIL', 'is the publishable key, not the secret key']];
    if (!/^(sk|rk)_(live|test)_/.test(t)) return [['FAIL', 'does not start with sk_live_ / sk_test_ (or rk_ for a restricted key)']];
    if (TARGET === 'production' && /_test_/.test(t)) return [['WARN', 'test-mode key in production']];
    return [];
  },
});
if (pk && sk) {
  const mode = (k) => (/^[a-z]{2}_live_/.test(k.trim()) ? 'live' : /^[a-z]{2}_test_/.test(k.trim()) ? 'test' : 'unknown');
  if (mode(pk) !== mode(sk)) add('FAIL', 'Stripe key modes', `publishable key is ${mode(pk)} mode, secret key is ${mode(sk)} mode — the browser cannot confirm a PaymentIntent created in the other mode`);
  else add('PASS', 'Stripe key modes', `both keys are ${mode(pk)} mode`);
}
check('STRIPE_WEBHOOK_SECRET', {
  need: 'required',
  show: 'secret',
  rules: (t) => (/^whsec_/.test(t) ? [] : [['FAIL', 'does not start with whsec_ — use the signing secret of https://www.tinyinks.ae/api/stripe/webhook']]),
});
check('CHECKOUT_ALERT_WEBHOOK', {
  show: 'secret',
  unsetNote: 'no alert is sent when a paid order fails to reach Shopify',
  rules: (t) => (isHttpsUrl(t) ? [] : [['WARN', 'is not an https:// URL']]),
});

section('Email — Resend');
check('RESEND_API_KEY', {
  need: 'recommended',
  show: 'secret',
  unsetNote: 'order confirmation and staff order emails are skipped (orders are still created)',
  rules: (t) => (/^re_/.test(t) ? [] : [['WARN', 'does not start with re_']]),
});
check('RESEND_FROM_EMAIL', { show: 'email', unsetNote: 'order mail uses CONTACT_FROM_EMAIL', rules: emailRule });
check('CONTACT_FROM_EMAIL', { show: 'email', unsetNote: 'contact mail uses onboarding@resend.dev', rules: emailRule });
if (present('RESEND_API_KEY') && !present('RESEND_FROM_EMAIL') && !present('CONTACT_FROM_EMAIL')) {
  add('WARN', 'Sender', 'no sender set — mail goes out from onboarding@resend.dev (Resend’s shared testing address), not a tinyinks.ae address');
}
check('ORDER_NOTIFICATION_EMAIL', { show: 'email', unsetNote: 'staff order mail goes to CONTACT_TO_EMAIL, then NEXT_PUBLIC_CONTACT_EMAIL', rules: emailRule });
check('CONTACT_TO_EMAIL', { show: 'email', unsetNote: 'contact form uses NEXT_PUBLIC_CONTACT_EMAIL', rules: emailRule });
check('FORMSPREE_FORM_ID', { unsetNote: 'only used when RESEND_API_KEY is empty' });
if (present('RESEND_API_KEY')) {
  const staffTo = ['ORDER_NOTIFICATION_EMAIL', 'CONTACT_TO_EMAIL', 'NEXT_PUBLIC_CONTACT_EMAIL'].find(present);
  if (staffTo) add('INFO', 'Staff order mail to', `${showEmail(raw(staffTo))} (from ${staffTo})`);
  else add('WARN', 'Staff order mail to', 'no recipient — staff order emails are skipped');
}

section('Staff app, signed links, cron');
check('STAFF_PASSWORD', {
  need: 'required',
  show: 'secret',
  unsetNote: 'the staff app accepts the demo password written in the source code; with Shopify Admin connected that exposes real customer orders',
  rules: (t) => (t === 'tinyinks' ? [['FAIL', 'is the public demo password']] : t.length < 10 ? [['WARN', 'is shorter than 10 characters']] : []),
});
check('PRINT_SIGNING_SECRET', {
  need: present('STAFF_SESSION_SECRET') ? 'optional' : 'required',
  show: 'secret',
  unsetNote: present('STAFF_SESSION_SECRET')
    ? 'STAFF_SESSION_SECRET is used instead'
    : 'staff session cookies and file links are signed with the default secret from the source code, so they can be forged',
  rules: (t) => (t === 'tiny-inks-dev-secret-change-me' ? [['FAIL', 'is the default secret from the source code']] : t.length < 32 ? [['WARN', 'is shorter than 32 characters — e.g. openssl rand -hex 32']] : []),
});
check('STAFF_SESSION_SECRET', {
  show: 'secret',
  unsetNote: 'correct — older fallback name, not needed',
  rules: () => (present('PRINT_SIGNING_SECRET') ? [['WARN', 'is ignored because PRINT_SIGNING_SECRET is set — remove it']] : []),
});
check('CRON_SECRET', {
  need: 'recommended',
  show: 'secret',
  unsetNote: 'on Vercel production /api/print/cleanup answers 503, so the daily cron in vercel.json fails',
  rules: (t) => (t.length < 16 ? [['WARN', 'is shorter than 16 characters']] : []),
});
check('BLOB_READ_WRITE_TOKEN', {
  show: 'secret',
  unsetNote: 'print uploads, if used, go to the temporary folder',
  rules: (t) => (/^vercel_blob_rw_/.test(t) ? [] : [['WARN', 'does not start with vercel_blob_rw_']]),
});
const positive = (t) => (Number.isFinite(Number(t)) && Number(t) > 0 ? [] : [['WARN', 'must be a positive number']]);
check('PRINT_LINK_TTL_HOURS', { unsetNote: 'defaults to 24', rules: positive });
check('PRINT_FILE_RETENTION_DAYS', { unsetNote: 'defaults to 7', rules: positive });

section('Site details (public)');
check('NEXT_PUBLIC_SITE_URL', {
  need: 'recommended',
  unsetNote: 'defaults to https://tinyinks.ae, which redirects to www',
  rules: (t) => {
    if (!isHttpsUrl(t)) return [['FAIL', 'must be an https:// URL, e.g. https://www.tinyinks.ae']];
    const u = new URL(t);
    const out = [];
    if (u.pathname !== '/' || u.search || u.hash) out.push(['WARN', 'should be the origin only, without a path']);
    if (u.hostname === 'tinyinks.ae') out.push(['WARN', 'tinyinks.ae redirects (308) to www.tinyinks.ae, so canonical and sitemap URLs point at a redirect — use https://www.tinyinks.ae']);
    return out;
  },
});
check('NEXT_PUBLIC_WHATSAPP_NUMBER', {
  need: 'recommended',
  unsetNote: 'WhatsApp buttons use the placeholder 971500000000',
  rules: (t) => {
    const digits = t.replace(/\D/g, '');
    if (digits === '971500000000') return [['WARN', 'is the placeholder number']];
    if (digits.length < 8 || digits.length > 15) return [['WARN', 'should be digits with the country code']];
    return [];
  },
});
check('NEXT_PUBLIC_CONTACT_EMAIL', { show: 'email', unsetNote: 'defaults to hello@tinyinks.ae', rules: emailRule });
for (const k of ['NEXT_PUBLIC_INSTAGRAM_URL', 'NEXT_PUBLIC_TIKTOK_URL', 'NEXT_PUBLIC_SHOP_MAPS_URL', 'NEXT_PUBLIC_SHOP_MAP_EMBED_URL']) {
  check(k, { unsetNote: 'built-in default or hidden', rules: (t) => (isHttpsUrl(t) ? [] : [['WARN', 'is not an https:// URL']]) });
}
check('NEXT_PUBLIC_SHOP_ADDRESS', { unsetNote: 'built-in default address' });
check('NEXT_PUBLIC_SHOP_HOURS', { unsetNote: 'dictionary text' });

section('Browser exposure (NEXT_PUBLIC_*)');
let exposed = 0;
for (const k of Object.keys(ENV).filter((n) => n.startsWith('NEXT_PUBLIC_')).sort()) {
  const v = String(ENV[k] ?? '').trim();
  if (looksSecret(v)) { add('FAIL', k, 'holds a secret-looking value — every visitor can read NEXT_PUBLIC_ variables'); exposed++; }
  else if (/SECRET|PASSWORD|PRIVATE|ADMIN_TOKEN|API_KEY$/.test(k)) { add('FAIL', k, 'secret-sounding name with the NEXT_PUBLIC_ prefix — server secrets must never be NEXT_PUBLIC_'); exposed++; }
}
if (!exposed) add('PASS', 'NEXT_PUBLIC_*', 'no secret-looking values or names');

section('Unused, misspelled and duplicate variables');
const KNOWN = new Set([
  'NEXT_PUBLIC_DEMO_MODE', 'NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN', 'NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN', 'NEXT_PUBLIC_SHOPIFY_API_VERSION',
  'SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET', 'SHOPIFY_SHOP_DOMAIN', 'SHOPIFY_STORE_DOMAIN', 'SHOPIFY_ADMIN_API_VERSION', 'SHOPIFY_ADMIN_TOKEN',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'CHECKOUT_ALERT_WEBHOOK',
  'RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'ORDER_NOTIFICATION_EMAIL', 'CONTACT_TO_EMAIL', 'CONTACT_FROM_EMAIL', 'FORMSPREE_FORM_ID',
  'STAFF_PASSWORD', 'PRINT_SIGNING_SECRET', 'STAFF_SESSION_SECRET', 'CRON_SECRET', 'BLOB_READ_WRITE_TOKEN', 'PRINT_LINK_TTL_HOURS', 'PRINT_FILE_RETENTION_DAYS',
  'NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_WHATSAPP_NUMBER', 'NEXT_PUBLIC_CONTACT_EMAIL', 'NEXT_PUBLIC_INSTAGRAM_URL', 'NEXT_PUBLIC_TIKTOK_URL',
  'NEXT_PUBLIC_SHOP_ADDRESS', 'NEXT_PUBLIC_SHOP_MAPS_URL', 'NEXT_PUBLIC_SHOP_MAP_EMBED_URL', 'NEXT_PUBLIC_SHOP_HOURS',
]);
const LIKELY_MEANT = {
  SHOPIFY_API_KEY: 'SHOPIFY_CLIENT_ID', SHOPIFY_CLIENTID: 'SHOPIFY_CLIENT_ID', SHOPIFY_APP_CLIENT_ID: 'SHOPIFY_CLIENT_ID',
  SHOPIFY_API_SECRET: 'SHOPIFY_CLIENT_SECRET', SHOPIFY_API_SECRET_KEY: 'SHOPIFY_CLIENT_SECRET', SHOPIFY_SECRET: 'SHOPIFY_CLIENT_SECRET', SHOPIFY_APP_SECRET: 'SHOPIFY_CLIENT_SECRET',
  SHOPIFY_DOMAIN: 'SHOPIFY_SHOP_DOMAIN', SHOPIFY_STORE_URL: 'SHOPIFY_SHOP_DOMAIN', SHOPIFY_SHOP: 'SHOPIFY_SHOP_DOMAIN', SHOP_DOMAIN: 'SHOPIFY_SHOP_DOMAIN',
  SHOPIFY_ACCESS_TOKEN: 'SHOPIFY_ADMIN_TOKEN', SHOPIFY_ADMIN_ACCESS_TOKEN: 'SHOPIFY_ADMIN_TOKEN',
  SHOPIFY_STOREFRONT_TOKEN: 'NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN', SHOPIFY_STOREFRONT_ACCESS_TOKEN: 'NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN',
  NEXT_PUBLIC_SHOPIFY_DOMAIN: 'NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN', SHOPIFY_API_VERSION: 'SHOPIFY_ADMIN_API_VERSION or NEXT_PUBLIC_SHOPIFY_API_VERSION',
  STRIPE_PUBLISHABLE_KEY: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', STRIPE_SECRET: 'STRIPE_SECRET_KEY', STRIPE_API_KEY: 'STRIPE_SECRET_KEY',
  STRIPE_WEBHOOK_SIGNING_SECRET: 'STRIPE_WEBHOOK_SECRET', STRIPE_ENDPOINT_SECRET: 'STRIPE_WEBHOOK_SECRET',
  RESEND_KEY: 'RESEND_API_KEY', RESEND_FROM: 'RESEND_FROM_EMAIL', NEXT_PUBLIC_RESEND_API_KEY: 'RESEND_API_KEY (server-only!)',
};
const APP_LIKE = /^(NEXT_PUBLIC_|SHOPIFY|SHOP_|STRIPE|RESEND|CONTACT_|ORDER_|PRINT_|STAFF_|CRON_|BLOB_|CHECKOUT_|FORMSPREE)/;
let extras = 0;
for (const k of Object.keys(ENV).sort()) {
  if (KNOWN.has(k)) continue;
  if (LIKELY_MEANT[k]) { add('WARN', k, `is not read by the code — did you mean ${LIKELY_MEANT[k]}?`); extras++; }
  else if (APP_LIKE.test(k)) { add('INFO', k, 'is not read by the code (obsolete or misspelled?)'); extras++; }
}
for (const [k, n] of duplicates) add('WARN', k, `is defined ${n} times in the file — the last one wins`);
if (!extras && !duplicates.length) add('PASS', 'Extras', 'no unknown app variables');

/* ------------------------------------------------------------ optional live token probe */
if (PROBE) {
  section('Shopify token probe (--probe-shopify-token)');
  if (usesLegacy) {
    add('SKIP', 'Token probe', 'SHOPIFY_ADMIN_TOKEN is set, so the app makes no token request');
  } else if (!adminHost || !present('SHOPIFY_CLIENT_ID') || !present('SHOPIFY_CLIENT_SECRET')) {
    add('SKIP', 'Token probe', 'needs an Admin host, SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET');
  } else {
    /* exactly the request lib/print-server.js getAdminToken() makes: same URL, same verbatim values */
    try {
      const r = await fetch(`https://${adminHost}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: raw('SHOPIFY_CLIENT_ID'), client_secret: raw('SHOPIFY_CLIENT_SECRET') }).toString(),
      });
      const text = await r.text();
      let j = null;
      try { j = JSON.parse(text); } catch { /* Shopify answers OAuth errors with an HTML page */ }
      if (r.ok && j?.access_token) {
        /* the token itself is discarded, never printed */
        const scopes = String(j.scope || '').split(',').map((s) => s.trim()).filter(Boolean);
        const canWrite = scopes.includes('write_orders');
        add(canWrite ? 'PASS' : 'FAIL', 'Token probe', `HTTP ${r.status} — token granted (not printed), expires_in=${j.expires_in ?? '?'}, scopes: ${scopes.join(', ') || '(none reported)'}${canWrite ? '' : ' — write_orders is missing'}`);
      } else {
        /* only the error CODE is taken from the response; Shopify's page also echoes the client_id */
        const code = (text.match(/Oauth error ([a-z_]+)/i) || [])[1] || (typeof j?.error === 'string' && /^[a-z_]+$/i.test(j.error) ? j.error : '');
        const hints = {
          application_cannot_be_found: 'Shopify has no app with this Client ID — copy the Client ID again from Dev Dashboard → Tiny Inks Website Backend → Settings',
          shop_not_permitted: 'the app and the store are not in the same Shopify organization',
        };
        const unavailable = r.status === 404 && /unavailable/i.test(text) ? 'no live store at this host' : '';
        add('FAIL', 'Token probe', `HTTP ${r.status}${code ? ` — ${code}` : ''}${hints[code] ? ` — ${hints[code]}` : unavailable ? ` — ${unavailable}` : ''}`);
      }
    } catch (e) {
      add('FAIL', 'Token probe', `request failed before Shopify answered: ${e.cause?.code || e.name}`);
    }
  }
}

/* ------------------------------------------------------------ output */
const paint = (s, code) => (COLOR ? `\x1b[${code}m${s}\x1b[0m` : s);
const TONE = { PASS: '32', WARN: '33', FAIL: '31', INFO: '36', SKIP: '90' };
const knownPresent = [...KNOWN].filter(present).length;

console.log(paint('Tiny Inks — environment check', '1'));
console.log(`  rules:   ${TARGET}`);
console.log(`  source:  ${SOURCE}`);
console.log(`  store:   ${EXPECTED_SHOP}`);
console.log(`  network: ${PROBE ? 'one Shopify token request (--probe-shopify-token)' : 'none'}`);
console.log('  Secret values are never printed.');
if (!knownPresent) console.log(paint('\n  No Tiny Inks variables found. Use --file <dotenv> or: vercel env run -e production -- node scripts/check-production-env.mjs', '33'));

for (const r of rows) {
  if (r.section) { console.log(`\n${paint(r.section, '1')}`); continue; }
  console.log(`  ${paint(r.status.padEnd(4), TONE[r.status])}  ${r.name.padEnd(38)} ${r.detail}`);
}
const count = (s) => rows.filter((r) => r.status === s).length;
console.log(`\nSummary: ${count('PASS')} pass · ${count('WARN')} warn · ${count('FAIL')} fail`);
console.log(count('FAIL') ? paint('RESULT: FAIL', '31;1') : `${paint('RESULT: PASS', '32;1')}${count('WARN') ? ' (with warnings)' : ''}`);
process.exitCode = count('FAIL') ? 1 : 0;
