"use client";

import { useEffect, useState } from "react";
import SideDrawer from "../../components/ui/SideDrawer";
import { D, Notice } from "./dev-ui";

const blank = { name: "", url: "", events: ["lead.created", "lead.status_changed"], is_active: true };

/** Create or edit a webhook: where to send, and which lead changes to send. */
export default function WebhookEditor({ open, hook, events, onClose, onSave }) {
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(hook ? { name: hook.name, url: hook.url, events: hook.events, is_active: hook.is_active } : blank);
    setError("");
  }, [open, hook]);

  const toggle = (event) => setForm((f) => ({ ...f, events: f.events.includes(event) ? f.events.filter((e) => e !== event) : [...f.events, event] }));
  const list = Object.entries(events || {});

  async function save() {
    setSaving(true);
    setError("");
    try {
      await onSave(hook?.webhook_id, form);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SideDrawer open={open} onClose={onClose} title={hook ? "Edit webhook" : "New webhook"} subtitle="GreenCRM calls this address the moment a lead changes"
      footer={<div className="flex justify-end gap-2"><button type="button" className={D.ghost} onClick={onClose}>Cancel</button><button type="button" className={D.primary} disabled={saving || !form.url.trim() || !form.events.length} onClick={save}>{saving ? "Checking address…" : hook ? "Save changes" : "Create webhook"}</button></div>}>
      <div className="space-y-4">
        <Notice notice={error ? { tone: "error", text: error } : null} />
        <section className={`${D.panel} space-y-3 p-4`}>
          <label className={D.label}>
            <span>Name</span>
            <input className={D.input} value={form.name} maxLength={120} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Our billing app, Zapier, Slack…" />
          </label>
          <label className={D.label}>
            <span>Address (URL)</span>
            <input className={`${D.input} font-mono text-[12.5px]`} value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://yourapp.com/webhooks/greencrm" />
            <span className="block text-[11.5px] font-normal text-slate-400">Must be a public https:// address. Addresses inside an office or server network are refused.</span>
          </label>
          {hook ? (
            <label className="flex items-center justify-between gap-3 rounded-[10px] bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
              <span><span className="block text-[13px] font-semibold text-slate-800">Webhook is on</span><span className="block text-[11.5px] text-slate-500">Turning it on again also clears the failure count.</span></span>
              <input type="checkbox" className="h-4 w-4 accent-[#0c605d]" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
            </label>
          ) : null}
        </section>
        <section className={`${D.panel} space-y-2 p-4`}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13.5px] font-bold text-slate-900">What to send</p>
            <button type="button" className="text-[12px] font-semibold text-brand-700" onClick={() => setForm((f) => ({ ...f, events: f.events.length === list.length ? [] : list.map(([e]) => e) }))}>
              {form.events.length === list.length ? "Clear all" : "Pick all"}
            </button>
          </div>
          {list.map(([event, text]) => (
            <label key={event} className={`flex cursor-pointer items-start gap-3 rounded-[10px] px-3 py-2.5 ring-1 transition ${form.events.includes(event) ? "bg-brand-50 ring-brand-100" : "ring-slate-200 hover:bg-slate-50"}`}>
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#0c605d]" checked={form.events.includes(event)} onChange={() => toggle(event)} />
              <span><code className="block font-mono text-[12.5px] font-semibold text-slate-800">{event}</code><span className="block text-[12px] text-slate-500">{text}</span></span>
            </label>
          ))}
        </section>
        <section className={`${D.soft} p-4 text-[12.5px] text-slate-600`}>
          <p className="font-semibold text-slate-800">How sending works</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            <li>Each call is signed with a secret, so your app can check it came from GreenCRM.</li>
            <li>If your app does not answer 2xx within 10 seconds, GreenCRM tries again after 1 min, 5 min, 30 min, 2 h, 6 h and 24 h.</li>
            <li>After 25 calls in a row fail completely, the webhook is switched off and you get an email.</li>
          </ul>
        </section>
      </div>
    </SideDrawer>
  );
}
