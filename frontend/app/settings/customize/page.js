"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CustomFieldsManager from "../../../components/customize/CustomFieldsManager";
import LeadFormFieldsCustomizer from "../../../components/customize/LeadFormFieldsCustomizer";
import LeadStatusCustomizer from "../../../components/customize/LeadStatusCustomizer";
import SettingsLayout, { S } from "../../../components/settings/SettingsLayout";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";

const TABS = [
  ["statuses", "Lead statuses", "Which stages a lead can move through"],
  ["form", "Lead form", "Which fields show on the lead form, and which are required"],
  ["custom", "Your own fields", "Extra fields only your company needs"],
];

/** Lead customization: statuses, form fields and custom fields, in tabs, saved together. */
export default function CustomizePage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState("");
  const [tab, setTab] = useState("statuses");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const s = loadSession();
    if (!s) { router.replace("/login?next=/settings/customize"); return; }
    if (!["super-admin", "admin"].includes(s.user?.role)) { router.replace("/settings"); return; }
    setSession(s);
    apiRequest("/customization", { token: s.token })
      .then((data) => { setSettings(data); setSaved(JSON.stringify(data)); })
      .catch((err) => setError(err.message));
  }, [router]);

  const dirty = useMemo(() => Boolean(settings) && JSON.stringify(settings) !== saved, [settings, saved]);
  // Ask before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    setSaving(true); setError(""); setMessage("");
    try {
      await apiRequest("/customization", { method: "PUT", token: session.token, body: settings });
      setSaved(JSON.stringify(settings));
      setMessage("Saved. New leads and forms use these settings now.");
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  const counts = settings ? {
    statuses: (settings.lead_statuses || []).length,
    form: Object.values(settings.lead_form_fields || {}).filter((f) => f?.enabled).length,
    custom: (settings.custom_fields || []).length,
  } : {};

  return (
    <SettingsLayout session={session} active="customize">
      {error ? <p role="alert" className="rounded-[12px] bg-rose-50 px-4 py-2.5 text-[13px] text-rose-700 ring-1 ring-rose-100">{error}</p> : null}
      {message ? <p role="status" className="rounded-[12px] bg-emerald-50 px-4 py-2.5 text-[13px] font-medium text-emerald-800 ring-1 ring-emerald-100">✓ {message}</p> : null}

      <div className="flex gap-1 overflow-x-auto rounded-[12px] bg-white p-1 ring-1 ring-slate-200 sm:inline-flex" role="tablist" aria-label="Customization">
        {TABS.map(([key, name]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={`shrink-0 rounded-[9px] px-4 py-2 text-[13px] font-semibold ${tab === key ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            {name}{settings ? <span className={`ml-1.5 ${tab === key ? "text-white/70" : "text-slate-400"}`}>{counts[key]}</span> : null}
          </button>
        ))}
      </div>
      <p className="text-[12.5px] text-slate-500">{TABS.find(([key]) => key === tab)[2]}</p>

      {!settings && !error ? <div className="h-[320px] animate-pulse rounded-[14px] bg-white ring-1 ring-slate-200" /> : null}
      {settings && tab === "statuses" ? <LeadStatusCustomizer statuses={settings.lead_statuses} onChange={(v) => setSettings({ ...settings, lead_statuses: v })} /> : null}
      {settings && tab === "form" ? <LeadFormFieldsCustomizer fields={settings.lead_form_fields} onChange={(v) => setSettings({ ...settings, lead_form_fields: v })} /> : null}
      {settings && tab === "custom" ? <CustomFieldsManager customFields={settings.custom_fields} onChange={(v) => setSettings({ ...settings, custom_fields: v })} /> : null}

      {settings ? (
        <div className={`sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[14px] px-4 py-3 shadow-lg ring-1 transition ${dirty ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-500 ring-slate-200"}`}>
          <p className="text-[13px]">{dirty ? "You have unsaved changes." : "All changes saved."}</p>
          <span className="flex gap-2">
            {dirty ? <button type="button" onClick={() => setSettings(JSON.parse(saved))} disabled={saving} className="rounded-[10px] px-3 py-2 text-[13px] font-semibold text-white/80 hover:bg-white/10">Undo</button> : null}
            <button type="button" onClick={save} disabled={saving || !dirty} className={dirty ? "rounded-[10px] bg-white px-4 py-2 text-[13px] font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-50" : S.primary}>{saving ? "Saving…" : "Save changes"}</button>
          </span>
        </div>
      ) : null}
    </SettingsLayout>
  );
}
