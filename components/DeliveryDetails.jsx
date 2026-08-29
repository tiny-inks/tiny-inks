'use client';
import { useEffect, useState } from 'react';
import { useCart } from './CartContext';

/* Delivery details captured before checkout: name, phone, email, address, and
   a "Locate me" helper (browser geolocation → OpenStreetMap reverse geocode)
   that fills the address; the customer can always type it by hand. The values
   travel to Shopify checkout as cart attributes + note + buyer identity —
   Shopify checkout itself is untouched. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function DeliveryDetails({ dict, locale }) {
  const cart = useCart();
  const t = dict.delivery;
  const d = cart.delivery;
  const [geo, setGeo] = useState('idle'); // idle | asking | locating | done | denied | error | unsupported
  const [touched, setTouched] = useState({});

  useEffect(() => { if (geo === 'done') { const id = setTimeout(() => setGeo('idle'), 4000); return () => clearTimeout(id); } }, [geo]);

  const set = (k) => (e) => cart.setDelivery({ ...d, [k]: e.target.value });
  const blur = (k) => () => setTouched((s) => ({ ...s, [k]: true }));
  const errors = {
    name: touched.name && !d.name.trim() ? t.required : '',
    phone: touched.phone && !/^[+\d][\d\s()-]{6,}$/.test(d.phone.trim()) ? t.phoneInvalid : '',
    email: touched.email && d.email && !EMAIL_RE.test(d.email.trim()) ? t.emailInvalid : '',
  };

  const locate = () => {
    if (!('geolocation' in navigator)) { setGeo('unsupported'); return; }
    setGeo('locating');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = coords.latitude.toFixed(6);
        const lon = coords.longitude.toFixed(6);
        let line = '';
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=${locale}`, { headers: { Accept: 'application/json' } });
          const j = await r.json();
          const a = j.address || {};
          line = [a.building || a.house_number, a.road, a.neighbourhood || a.suburb, a.city || a.town || a.state, a.country]
            .filter(Boolean).join(', ') || j.display_name || '';
        } catch {}
        const mapLink = `https://maps.google.com/?q=${lat},${lon}`;
        cart.setDelivery({ ...d, address: line ? `${line}\n${mapLink}` : mapLink, lat, lon });
        setGeo('done');
      },
      (err) => setGeo(err.code === 1 ? 'denied' : 'error'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  return (
    <div className="delivery" id="delivery-details">
      <h3>{t.title}</h3>
      <p className="delivery-lede">{t.lede}</p>
      <div className="delivery-grid">
        <div className="field">
          <label htmlFor="dd-name">{t.name} *</label>
          <input id="dd-name" className="input" autoComplete="name" value={d.name} onChange={set('name')} onBlur={blur('name')} aria-invalid={!!errors.name} />
          {errors.name && <span className="field-err">{errors.name}</span>}
        </div>
        <div className="field">
          <label htmlFor="dd-phone">{t.phone} *</label>
          <input id="dd-phone" className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="+971 5x xxx xxxx" dir="ltr" value={d.phone} onChange={set('phone')} onBlur={blur('phone')} aria-invalid={!!errors.phone} />
          {errors.phone && <span className="field-err">{errors.phone}</span>}
        </div>
        <div className="field">
          <label htmlFor="dd-email">{t.email}</label>
          <input id="dd-email" className="input" type="email" inputMode="email" autoComplete="email" dir="ltr" value={d.email} onChange={set('email')} onBlur={blur('email')} aria-invalid={!!errors.email} />
          {errors.email && <span className="field-err">{errors.email}</span>}
        </div>
        <div className="field field-wide">
          <div className="field-head">
            <label htmlFor="dd-address">{t.address} *</label>
            <button type="button" className="btn btn-ghost btn-sm locate-btn" onClick={locate} disabled={geo === 'locating'} aria-describedby="dd-geo-note">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="8" /></svg>
              {geo === 'locating' ? t.locating : t.locate}
            </button>
          </div>
          <textarea id="dd-address" className="input" rows={3} autoComplete="street-address" placeholder={t.addressHint} value={d.address} onChange={set('address')} />
          <span id="dd-geo-note" className={`field-note ${geo}`} role="status">
            {geo === 'idle' && t.geoNote}
            {geo === 'asking' && t.geoNote}
            {geo === 'locating' && t.locating}
            {geo === 'done' && t.geoDone}
            {geo === 'denied' && t.geoDenied}
            {geo === 'error' && t.geoError}
            {geo === 'unsupported' && t.geoUnsupported}
          </span>
        </div>
      </div>
      <p className="field-note">{t.saved}</p>
    </div>
  );
}
