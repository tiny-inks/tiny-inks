/* Order emails via Resend — server only.

   Reuses the credentials the contact form already established
   (RESEND_API_KEY / CONTACT_FROM_EMAIL / CONTACT_TO_EMAIL) and adds two
   optional overrides for order mail specifically. Never import from a client
   component.

   These are only ever called after a payment succeeded AND a real Shopify
   order was created — see app/api/stripe/webhook/route.js. Sending is
   best-effort: a mail failure must never fail the webhook, because a non-2xx
   there makes Stripe retry and re-attempt order creation. */

const API_KEY = process.env.RESEND_API_KEY || '';
const FROM = process.env.RESEND_FROM_EMAIL || process.env.CONTACT_FROM_EMAIL || 'Tiny Inks <onboarding@resend.dev>';
const STAFF_TO = process.env.ORDER_NOTIFICATION_EMAIL || process.env.CONTACT_TO_EMAIL || process.env.NEXT_PUBLIC_CONTACT_EMAIL || '';

export const ORDER_EMAIL_LIVE = Boolean(API_KEY);

const money = (fils) => `AED ${((fils || 0) / 100).toFixed(2)}`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function send({ to, subject, html, text, replyTo }) {
  if (!API_KEY) { console.warn('order email skipped: RESEND_API_KEY not set'); return { ok: false, skipped: 'no_api_key' }; }
  if (!to) { console.warn('order email skipped: no recipient'); return { ok: false, skipped: 'no_recipient' }; }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (!r.ok) {
      console.error('Resend order email failed', r.status, await r.text().catch(() => ''));
      return { ok: false, status: r.status };
    }
    return { ok: true };
  } catch (e) {
    console.error('Resend order email threw:', e.message);
    return { ok: false, error: e.message };
  }
}

/* shared bits ------------------------------------------------------------- */
const lineRows = (quote) => quote.lines.map((l) => `
  <tr>
    <td style="padding:8px 0;border-bottom:1px solid #eee;color:#133155">${esc(l.title)} × ${l.qty}</td>
    <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;color:#133155;white-space:nowrap">${money(l.totalFils)}</td>
  </tr>`).join('');

const totalsRows = (quote) => `
  <tr><td style="padding:8px 0;color:#5b6b85">Subtotal</td><td style="padding:8px 0;text-align:right;color:#133155">${money(quote.subtotalFils)}</td></tr>
  <tr><td style="padding:8px 0;color:#5b6b85">${quote.method === 'collect' ? 'Collection' : 'Delivery'}</td><td style="padding:8px 0;text-align:right;color:#133155">${quote.deliveryFils === 0 ? 'Free' : money(quote.deliveryFils)}</td></tr>
  <tr><td style="padding:12px 0 0;border-top:2px solid #133155;font-weight:800;color:#133155">Total</td><td style="padding:12px 0 0;border-top:2px solid #133155;text-align:right;font-weight:800;color:#133155">${money(quote.totalFils)}</td></tr>`;

const shell = (title, inner) => `<!doctype html><html><body style="margin:0;background:#faf6ee;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:28px 20px">
    <div style="background:#133155;border-radius:20px;padding:22px 24px">
      <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:.02em">Tiny Inks</div>
      <div style="color:#ffffffb3;font-size:12px;letter-spacing:.14em;text-transform:uppercase;margin-top:4px">${esc(title)}</div>
    </div>
    <div style="background:#fff;border:1px solid #e7ded0;border-top:0;border-radius:0 0 20px 20px;padding:24px">${inner}</div>
    <p style="color:#8a93a5;font-size:12px;text-align:center;margin:16px 0 0">Tiny Inks · 100 Al Dhaid Street, Rabdan, Abu Dhabi</p>
  </div></body></html>`;

const addressBlock = (payload) => {
  const a = payload.address || {};
  const parts = [a.line, a.city].filter(Boolean).join('\n');
  return parts ? `<p style="margin:0;color:#5b6b85;white-space:pre-line">${esc(parts)}</p>` : '<p style="margin:0;color:#8a93a5">—</p>';
};

/* customer confirmation --------------------------------------------------- */
export async function sendCustomerOrderEmail({ payload, quote, orderName }) {
  const to = payload.contact?.email;
  if (!to) return { ok: false, skipped: 'no_customer_email' };
  const name = payload.contact?.name || '';
  const html = shell('Order confirmed', `
    <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#133155">Shukran${name ? `, ${esc(name.split(' ')[0])}` : ''}!</p>
    <p style="margin:0 0 18px;color:#5b6b85">We have your order and we're getting it ready. Your order number is <strong style="color:#133155">${esc(orderName)}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">${lineRows(quote)}${totalsRows(quote)}</table>
    <p style="margin:22px 0 6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a93a5">${quote.method === 'collect' ? 'Collection' : 'Delivery address'}</p>
    ${quote.method === 'collect' ? '<p style="margin:0;color:#5b6b85">Collect from the shop in Rabdan, Abu Dhabi.</p>' : addressBlock(payload)}
    <p style="margin:22px 0 0;color:#5b6b85;font-size:14px">Questions? Reply to this email or message us on WhatsApp — we answer everything.</p>`);
  const text = `Shukran${name ? `, ${name}` : ''}!\n\nOrder ${orderName}\n\n${quote.lines.map((l) => `${l.title} x${l.qty}  ${money(l.totalFils)}`).join('\n')}\n\nSubtotal ${money(quote.subtotalFils)}\n${quote.method === 'collect' ? 'Collection' : 'Delivery'} ${quote.deliveryFils === 0 ? 'Free' : money(quote.deliveryFils)}\nTotal ${money(quote.totalFils)}\n\n${payload.address?.line || ''}`;
  return send({ to, subject: `Tiny Inks — order ${orderName} confirmed`, html, text });
}

/* staff notification ------------------------------------------------------ */
export async function sendStaffOrderEmail({ payload, quote, orderName, orderId, paymentRef, financialStatus }) {
  const c = payload.contact || {};
  const html = shell('New order', `
    <p style="margin:0 0 14px;font-size:18px;font-weight:700;color:#133155">${esc(orderName)} · ${money(quote.totalFils)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
      <tr><td style="padding:4px 0;color:#8a93a5;width:120px">Customer</td><td style="color:#133155">${esc(c.name || '—')}</td></tr>
      <tr><td style="padding:4px 0;color:#8a93a5">Phone</td><td style="color:#133155">${esc(c.phone || '—')}</td></tr>
      <tr><td style="padding:4px 0;color:#8a93a5">Email</td><td style="color:#133155">${esc(c.email || '—')}</td></tr>
      <tr><td style="padding:4px 0;color:#8a93a5">Method</td><td style="color:#133155">${quote.method === 'collect' ? 'Collect from shop' : 'Delivery'}</td></tr>
      <tr><td style="padding:4px 0;color:#8a93a5">Payment</td><td style="color:#133155">${esc(financialStatus)}</td></tr>
      <tr><td style="padding:4px 0;color:#8a93a5">Shopify</td><td style="color:#133155">${esc(orderName)}${orderId ? ` (${esc(orderId)})` : ''}</td></tr>
      <tr><td style="padding:4px 0;color:#8a93a5">Stripe</td><td style="color:#133155">${esc(paymentRef || '—')}</td></tr>
    </table>
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a93a5">Address</p>
    ${addressBlock(payload)}
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px">${lineRows(quote)}${totalsRows(quote)}</table>
    ${payload.note ? `<p style="margin:16px 0 0;color:#5b6b85"><strong style="color:#133155">Note:</strong> ${esc(payload.note)}</p>` : ''}`);
  const text = `${orderName} — ${money(quote.totalFils)}\nCustomer: ${c.name} / ${c.phone} / ${c.email}\nPayment: ${financialStatus}\nStripe: ${paymentRef || '—'}\nAddress: ${payload.address?.line || '—'}${payload.address?.city ? `, ${payload.address.city}` : ''}\n\n${quote.lines.map((l) => `${l.title} x${l.qty}  ${money(l.totalFils)}`).join('\n')}\nTotal ${money(quote.totalFils)}`;
  return send({ to: STAFF_TO, subject: `New order ${orderName} · ${money(quote.totalFils)}`, html, text, replyTo: c.email || undefined });
}
