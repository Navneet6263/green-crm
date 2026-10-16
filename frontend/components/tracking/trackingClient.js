"use client";

import { API_BASE } from "../../lib/api";
import { formatIndiaCustom } from "../../lib/dateTime";

export const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
export const REFRESH_MS = 30000;
const IST_OFFSET_MS = 330 * 60 * 1000;

let mapsPromise = null;

// Loads the Google Maps JavaScript API once per page (web key, restricted to the CRM domain).
export function loadGoogleMaps() {
  if (typeof window === "undefined") return Promise.reject(new Error("Maps load in the browser only."));
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    const callback = "__greencrmMapsReady";
    window[callback] = () => resolve(window.google.maps);
    const script = document.createElement("script");
    const key = GOOGLE_MAPS_KEY ? `key=${encodeURIComponent(GOOGLE_MAPS_KEY)}&` : "";
    script.src = `https://maps.googleapis.com/maps/api/js?${key}v=weekly&callback=${callback}`;
    script.async = true;
    script.onerror = () => {
      mapsPromise = null;
      reject(new Error("Google Maps could not be loaded."));
    };
    document.head.appendChild(script);
  });
  return mapsPromise;
}

export async function downloadWithAuth(path, token, fallbackName) {
  const response = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Download failed.");
  }
  const blob = await response.blob();
  const name = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") || "")?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---- dates (IST) ----
export const todayIst = () => new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
export function shiftDate(date, days) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}
export const monthStart = (date) => `${date.slice(0, 8)}01`;

export const formatTime = (value) => (value ? formatIndiaCustom(value, { hour: "numeric", minute: "2-digit", hour12: true }) : "--");
export const formatDay = (date) => formatIndiaCustom(`${date}T06:30:00.000Z`, { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export function timeAgo(value, now = Date.now()) {
  if (!value) return "never";
  const minutes = Math.max(0, Math.round((now - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ${minutes % 60} min ago`;
  return formatIndiaCustom(value, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
}

export function formatMinutes(minutes = 0) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export const STATUS_META = {
  live: { label: "Live", dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", color: "#10b981" },
  idle: { label: "No recent update", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700 ring-amber-200", color: "#f59e0b" },
  off: { label: "Tracking off", dot: "bg-slate-300", chip: "bg-slate-100 text-slate-500 ring-slate-200", color: "#94a3b8" },
};

export const initials = (name = "") => name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
