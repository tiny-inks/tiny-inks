'use client';
import { useEffect, useRef, useState } from 'react';
import { LocateFixed } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

/* Map + draggable pin for the delivery address.

   Why a map at all: a typed street line is often not enough to find a door in
   Abu Dhabi, and reverse geocoding alone drops the customer wherever the GPS
   happened to land. Dragging a pin is the only way they can correct it.

   Leaflet is loaded with a dynamic import inside the effect, so none of it is
   in the checkout bundle until someone actually opens the map. Tiles come from
   OpenStreetMap, which needs no API key — same source as the Nominatim
   reverse-geocoder this page already used. */

const SHOP = { lat: 24.407344, lon: 54.506051 }; // the Rabdan shop, as a sensible default view

async function reverseGeocode(lat, lon, locale) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=${locale}`,
      { headers: { Accept: 'application/json' } }
    );
    const j = await r.json();
    const a = j.address || {};
    const line = [a.building || a.house_number, a.road, a.neighbourhood || a.suburb, a.city || a.town || a.state, a.country]
      .filter(Boolean).join(', ') || j.display_name || '';
    /* city is kept separately so the Shopify order carries the real emirate
       instead of a hardcoded one */
    return { line, city: a.city || a.town || a.state || '' };
  } catch { return { line: '', city: '' }; }
}

export default function LocationPicker({ lat, lon, locale, dict, onChange }) {
  const holder = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const debounce = useRef(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');
  const t = dict.delivery;

  /* one place that records a new pin position and refreshes the address */
  const commit = (la, lo) => {
    onChange({ lat: la.toFixed(6), lon: lo.toFixed(6), line: null, city: null });
    /* Nominatim's usage policy allows at most 1 request per second. A trailing
       debounce longer than 1s guarantees that: every request needs a full
       quiet period first, so back-to-back pin drags can never issue two
       lookups inside the same second. */
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const { line, city } = await reverseGeocode(la, lo, locale);
      if (line) onChange({ lat: la.toFixed(6), lon: lo.toFixed(6), line, city });
    }, 1100);
  };

  useEffect(() => {
    let dead = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (dead || !holder.current || map.current) return;

      const start = [Number(lat) || SHOP.lat, Number(lon) || SHOP.lon];
      const m = L.map(holder.current, { zoomControl: true, attributionControl: true }).setView(start, lat ? 17 : 14);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(m);

      /* brand pin as a divIcon — avoids Leaflet's broken default icon paths
         under a bundler and keeps the marker on-palette */
      const icon = L.divIcon({
        className: '',
        html: `<span style="display:block;width:30px;height:42px">
                 <svg viewBox="0 0 30 42" width="30" height="42" xmlns="http://www.w3.org/2000/svg">
                   <path d="M15 41c0 0 13-15.5 13-25A13 13 0 1 0 2 16c0 9.5 13 25 13 25Z"
                         fill="var(--coral)" stroke="var(--ink)" stroke-width="1.5"/>
                   <circle cx="15" cy="15.5" r="5" fill="#fff"/>
                 </svg>
               </span>`,
        iconSize: [30, 42],
        iconAnchor: [15, 41],
      });

      const mk = L.marker(start, { draggable: true, icon, keyboard: true, autoPan: true }).addTo(m);
      mk.on('dragend', () => { const p = mk.getLatLng(); commit(p.lat, p.lng); });
      m.on('click', (e) => { mk.setLatLng(e.latlng); commit(e.latlng.lat, e.latlng.lng); });

      map.current = m;
      marker.current = mk;
      /* the panel animates open, so size the canvas once it has settled */
      setTimeout(() => m.invalidateSize(), 250);
    })();
    return () => {
      dead = true;
      clearTimeout(debounce.current);
      if (map.current) { map.current.remove(); map.current = null; marker.current = null; }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) { setGeoError(t.geoUnsupported); return; }
    setLocating(true); setGeoError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const la = coords.latitude, lo = coords.longitude;
        if (map.current && marker.current) {
          map.current.setView([la, lo], 17);
          marker.current.setLatLng([la, lo]);
        }
        commit(la, lo);
      },
      (err) => { setLocating(false); setGeoError(err.code === 1 ? t.geoDenied : t.geoError); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-border">
      <div ref={holder} className="h-[260px] w-full sm:h-[300px]" role="application" aria-label={t.mapLabel} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-secondary/40 px-4 py-3">
        <p className="text-xs text-muted-foreground">{t.dragPin}</p>
        <button type="button" onClick={useMyLocation} disabled={locating} className="ui-btn ui-btn-sm ui-btn-quiet">
          <LocateFixed className="h-3.5 w-3.5" strokeWidth={2} />
          {locating ? t.locating : t.locate}
        </button>
      </div>
      {geoError && <p role="alert" className="border-t border-border bg-blush/40 px-4 py-2 text-xs text-ink">{geoError}</p>}
    </div>
  );
}
