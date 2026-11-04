"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../lib/api";

// layout: { sheets: [sheetKey…], columns: { sheetKey: [columnKey…] }, options: { sheetKey: { optionKey: value } } }
export function defaultLayout(catalog) {
  return {
    sheets: catalog.filter((s) => s.selectedByDefault !== false).map((s) => s.key),
    columns: Object.fromEntries(catalog.map((s) => [s.key, s.columns.filter((c) => c.selected).map((c) => c.key)])),
    options: Object.fromEntries(catalog.map((s) => [s.key, Object.fromEntries((s.options || []).map((o) => [o.key, o.choices[0][0]]))])),
  };
}

/** Fills gaps in a preset or saved layout from the catalog, dropping unknown keys. */
function normalise(catalog, layout) {
  const base = defaultLayout(catalog);
  if (!layout) return base;
  const known = new Set(catalog.map((s) => s.key));
  const sheets = (layout.sheets || base.sheets).filter((k) => known.has(k));
  const columns = {};
  const options = {};
  for (const sheet of catalog) {
    const allowed = new Set(sheet.columns.map((c) => c.key));
    const picked = (layout.columns?.[sheet.key] || []).filter((k) => allowed.has(k));
    columns[sheet.key] = picked.length ? picked : base.columns[sheet.key];
    options[sheet.key] = { ...base.options[sheet.key], ...(layout.options?.[sheet.key] || {}) };
  }
  return { sheets: sheets.length ? sheets : base.sheets, columns, options };
}

export function layoutQuery(catalog, layout) {
  const params = new URLSearchParams();
  params.set("sheets", layout.sheets.join(","));
  for (const key of layout.sheets) {
    const sheet = catalog.find((s) => s.key === key);
    if (sheet?.columns.length) params.set(`cols_${key}`, (layout.columns[key] || []).join(","));
    for (const [option, value] of Object.entries(layout.options[key] || {})) params.set(`${option}_${key}`, value);
  }
  return params.toString();
}

const move = (list, item, step) => {
  const i = list.indexOf(item);
  const j = i + step;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

/** Loads the column catalog from `catalogPath` and keeps the user's choice on this device. */
export function useReportLayout({ token, catalogPath, storageKey, presets = [] }) {
  const [catalog, setCatalog] = useState(null);
  const [layout, setLayout] = useState(null);
  const [presetKey, setPresetKey] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiRequest(catalogPath, { token })
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.data || [];
        setCatalog(list);
        let saved = null;
        try { saved = JSON.parse(window.localStorage.getItem(storageKey) || "null"); } catch (_error) { /* storage unavailable */ }
        setLayout(normalise(list, saved?.layout));
        setPresetKey(saved?.preset || "");
      })
      .catch((err) => { if (!cancelled) setError(err.message || "Report options could not be loaded."); });
    return () => { cancelled = true; };
  }, [token, catalogPath, storageKey]);

  const update = useCallback((fn, preset = "") => {
    setLayout((current) => {
      const next = fn(current);
      try { window.localStorage.setItem(storageKey, JSON.stringify({ layout: next, preset })); } catch (_error) { /* ignore */ }
      return next;
    });
    setPresetKey(preset);
  }, [storageKey]);

  const ops = useMemo(() => catalog && ({
    toggleSheet: (key) => update((l) => ({ ...l, sheets: l.sheets.includes(key) ? l.sheets.filter((k) => k !== key) : [...l.sheets, key] })),
    moveSheet: (key, step) => update((l) => ({ ...l, sheets: move(l.sheets, key, step) })),
    toggleColumn: (sheet, column) => update((l) => {
      const list = l.columns[sheet] || [];
      return { ...l, columns: { ...l.columns, [sheet]: list.includes(column) ? list.filter((k) => k !== column) : [...list, column] } };
    }),
    moveColumn: (sheet, column, step) => update((l) => ({ ...l, columns: { ...l.columns, [sheet]: move(l.columns[sheet], column, step) } })),
    setAll: (sheet, on) => update((l) => {
      const all = catalog.find((s) => s.key === sheet).columns.map((c) => c.key);
      return { ...l, columns: { ...l.columns, [sheet]: on ? [...l.columns[sheet], ...all.filter((k) => !l.columns[sheet].includes(k))] : l.columns[sheet].slice(0, 1) } };
    }),
    setOption: (sheet, option, value) => update((l) => ({ ...l, options: { ...l.options, [sheet]: { ...l.options[sheet], [option]: value } } })),
    applyPreset: (preset) => update(() => normalise(catalog, preset.layout), preset.key),
  }), [catalog, update]);

  const query = useMemo(() => (catalog && layout ? layoutQuery(catalog, layout) : ""), [catalog, layout]);
  const columnCount = layout ? layout.sheets.reduce((sum, key) => sum + (layout.columns[key]?.length || 0), 0) : 0;
  return { catalog, layout, ops, query, presets, presetKey, columnCount, error };
}
