"use client";

import { useEffect, useRef, useState } from "react";
import { GOOGLE_MAPS_KEY, loadGoogleMaps } from "./trackingClient";

const INDIA = { lat: 22.5, lng: 79 };
const svgIcon = (svg) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
const escapeXml = (text) => String(text).replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));

function personIcon(maps, label, color, selected) {
  const size = selected ? 52 : 44;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 44 44">
    <circle cx="22" cy="22" r="20" fill="${color}" opacity="0.25"/>
    <circle cx="22" cy="22" r="15" fill="#0c605d" stroke="#fff" stroke-width="3"/>
    <text x="22" y="26.5" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="#fff">${escapeXml(label)}</text>
    <circle cx="34" cy="10" r="6" fill="${color}" stroke="#fff" stroke-width="2"/></svg>`;
  return { url: svgIcon(svg), scaledSize: new maps.Size(size, size), anchor: new maps.Point(size / 2, size / 2) };
}

function pinIcon(maps, number, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
    <path d="M16 41s14-15 14-25A14 14 0 0 0 2 16c0 10 14 25 14 25z" fill="${color}" stroke="#fff" stroke-width="2"/>
    <text x="16" y="21" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="#fff">${escapeXml(number)}</text></svg>`;
  return { url: svgIcon(svg), scaledSize: new maps.Size(32, 42), anchor: new maps.Point(16, 41) };
}

/**
 * people: [{ id, position: {lat,lng}, label, color, title, html }]
 * paths:  [[{lat,lng}, ...], ...]
 * pins:   [{ id, position, number, color, title, html }]
 */
export default function TrackingMap({ people = [], paths = [], pins = [], selectedId, onSelect, fitKey, className = "h-[520px]" }) {
  const box = useRef(null);
  const map = useRef(null);
  const overlays = useRef([]);
  const info = useRef(null);
  const lastFit = useRef(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !box.current || map.current) return;
        map.current = new maps.Map(box.current, {
          center: INDIA, zoom: 5, mapTypeControl: false, streetViewControl: false, fullscreenControl: true,
          clickableIcons: false, gestureHandling: "greedy",
        });
        info.current = new maps.InfoWindow();
        setReady(true);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const maps = window.google.maps;
    overlays.current.forEach((o) => o.setMap(null));
    overlays.current = [];
    const bounds = new maps.LatLngBounds();
    const openInfo = (marker, html) => { info.current.setContent(html); info.current.open({ map: map.current, anchor: marker }); };

    for (const path of paths) {
      if (path.length < 2) continue;
      overlays.current.push(new maps.Polyline({ map: map.current, path, strokeColor: "#157672", strokeOpacity: 0.9, strokeWeight: 4 }));
      path.forEach((p) => bounds.extend(p));
    }
    for (const pin of pins) {
      const marker = new maps.Marker({ map: map.current, position: pin.position, icon: pinIcon(maps, pin.number, pin.color || "#e8bd00"), title: pin.title, zIndex: 20 });
      if (pin.html) marker.addListener("click", () => openInfo(marker, pin.html));
      overlays.current.push(marker);
      bounds.extend(pin.position);
    }
    for (const person of people) {
      const selected = person.id === selectedId;
      const marker = new maps.Marker({
        map: map.current, position: person.position, title: person.title,
        icon: personIcon(maps, person.label, person.color, selected), zIndex: selected ? 50 : 30,
      });
      marker.addListener("click", () => {
        onSelect?.(person.id);
        if (person.html) openInfo(marker, person.html);
      });
      overlays.current.push(marker);
      bounds.extend(person.position);
    }

    // Re-fit only when the caller changes what is being viewed, not on every 30 s refresh.
    if (fitKey !== lastFit.current && !bounds.isEmpty()) {
      lastFit.current = fitKey;
      map.current.fitBounds(bounds, 60);
      maps.event.addListenerOnce(map.current, "idle", () => { if (map.current.getZoom() > 16) map.current.setZoom(16); });
    }
  }, [ready, people, paths, pins, selectedId, fitKey, onSelect]);

  useEffect(() => {
    if (!ready || !selectedId) return;
    const person = people.find((p) => p.id === selectedId);
    if (person) map.current.panTo(person.position);
  }, [ready, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`relative overflow-hidden rounded-[20px] border border-slate-200 bg-slate-100 ${className}`}>
      <div ref={box} className="absolute inset-0" />
      {!ready && !error ? <div className="absolute inset-0 grid place-items-center text-sm font-medium text-slate-500">Loading map…</div> : null}
      {error ? <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm font-medium text-rose-600">{error}</div> : null}
      {!GOOGLE_MAPS_KEY ? (
        <div className="absolute left-3 top-3 max-w-[18rem] rounded-[12px] bg-white/95 px-3 py-2 text-xs text-amber-700 shadow">
          Map is in development mode. Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to remove the watermark.
        </div>
      ) : null}
    </div>
  );
}
