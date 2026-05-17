'use client';
import { useEffect, useRef } from 'react';

export interface ClubPin {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  healthScore: number | null;
  memberCount: number;
  zoneName: string | null;
}

interface Props { pins: ClubPin[] }

interface LeafletMap { setView: (latlng: [number, number], zoom: number) => LeafletMap; remove: () => void; fitBounds: (b: [number, number][]) => void }
interface LeafletNS {
  map: (el: HTMLElement) => LeafletMap;
  tileLayer: (url: string, opts: Record<string, unknown>) => { addTo: (m: LeafletMap) => unknown };
  marker: (latlng: [number, number], opts?: Record<string, unknown>) => { addTo: (m: LeafletMap) => { bindPopup: (html: string) => unknown } };
  divIcon: (opts: Record<string, unknown>) => unknown;
}
declare global { interface Window { L?: LeafletNS } }

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

function ensureLeaflet(): Promise<LeafletNS> {
  if (window.L) return Promise.resolve(window.L);
  return new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`) as HTMLScriptElement | null;
    if (existing) { existing.addEventListener('load', () => window.L ? resolve(window.L) : reject(new Error('Leaflet load failed'))); return; }
    const script = document.createElement('script');
    script.src = LEAFLET_JS; script.async = true;
    script.onload = () => window.L ? resolve(window.L) : reject(new Error('Leaflet load failed'));
    script.onerror = () => reject(new Error('Leaflet load failed'));
    document.body.appendChild(script);
  });
}

function pinColor(health: number | null): string {
  if (health == null) return '#9ca3af';
  if (health >= 70) return '#10b981';
  if (health >= 50) return '#f59e0b';
  return '#ef4444';
}

export function ClubMap({ pins }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!ref.current || pins.length === 0) return;
    let cancelled = false;
    ensureLeaflet().then((L) => {
      if (cancelled || !ref.current) return;
      if (mapRef.current) mapRef.current.remove();
      const center: [number, number] = [pins[0].latitude!, pins[0].longitude!];
      const m = L.map(ref.current).setView(center, 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(m);

      const bounds: [number, number][] = [];
      for (const p of pins) {
        if (p.latitude == null || p.longitude == null) continue;
        const color = pinColor(p.healthScore);
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};box-shadow:0 0 0 3px rgba(255,255,255,0.9),0 0 6px rgba(0,0,0,0.3);"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        const html = `
          <div style="font-family:system-ui,sans-serif;min-width:180px">
            <div style="font-weight:700;color:#1e3a8a;margin-bottom:4px">${p.name}</div>
            <div style="font-size:11px;color:#6b7280">${[p.zoneName, p.city, p.state].filter(Boolean).join(' · ')}</div>
            <div style="margin-top:6px;display:flex;gap:8px;font-size:11px">
              <span><strong>${p.memberCount}</strong> members</span>
              <span><strong style="color:${color}">${p.healthScore ?? '—'}</strong> health</span>
            </div>
          </div>`;
        L.marker([p.latitude, p.longitude], { icon }).addTo(m).bindPopup(html);
        bounds.push([p.latitude, p.longitude]);
      }
      if (bounds.length > 1) m.fitBounds(bounds);
      mapRef.current = m;
    }).catch(() => { /* CDN unavailable — graceful no-op */ });

    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [pins]);

  if (pins.length === 0) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-10 text-center text-sm text-gray-500">
        No clubs to plot. Add coordinates to clubs to see them on the map.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div ref={ref} style={{ height: 540, width: '100%' }} />
      <div className="px-4 py-3 border-t flex items-center justify-between text-xs text-gray-600 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Legend color="#10b981" label="Healthy ≥ 70" />
          <Legend color="#f59e0b" label="Watch 50–69" />
          <Legend color="#ef4444" label="At risk < 50" />
          <Legend color="#9ca3af" label="Unassessed" />
        </div>
        <span>Tiles © OpenStreetMap contributors</span>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {label}
    </span>
  );
}
