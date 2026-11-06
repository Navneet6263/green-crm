"use client";

import { useEffect, useState } from "react";
import SideDrawer from "../../components/ui/SideDrawer";
import { Badge, CodeBlock, CopyField, D, Empty, Notice, ago, apiRoot, fmt, when } from "./dev-ui";

const SCOPE_TEXT = {
  "leads:read": ["Read leads", "List and open leads, products and people"],
  "leads:write": ["Create and update leads", "Add leads, change status, add notes"],
};
const EXPIRY = [[0, "Never"], [30, "30 days"], [90, "90 days"], [180, "6 months"], [365, "1 year"]];
const STATE_TONE = { active: "green", expired: "amber", revoked: "slate" };

function NewKeyDrawer({ open, onClose, onCreate, rolled }) {
  const [form, setForm] = useState({ name: "", scopes: ["leads:read", "leads:write"], expires_in_days: 0, allowed_ips: "" });
  const [secret, setSecret] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (open && rolled) {
      setSecret(rolled);
      setError("");
    } else if (open) {
      setForm({ name: "", scopes: ["leads:read", "leads:write"], expires_in_days: 0, allowed_ips: "" });
      setSecret(null);
      setError("");
    }
  }, [open, rolled]);
  const toggle = (scope) => setForm((f) => ({ ...f, scopes: f.scopes.includes(scope) ? f.scopes.filter((s) => s !== scope) : [...f.scopes, scope] }));

  async function create() {
    setSaving(true);
    setError("");
    try {
      const key = await onCreate(form);
      setSecret(key);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const footer = secret
    ? <div className="flex justify-end"><button type="button" className={D.primary} onClick={onClose}>I have saved the key</button></div>
    : <div className="flex justify-end gap-2"><button type="button" className={D.ghost} onClick={onClose}>Cancel</button><button type="button" className={D.primary} disabled={saving || !form.name.trim() || !form.scopes.length} onClick={create}>{saving ? "Creating…" : "Create key"}</button></div>;

  return (
    <SideDrawer open={open} onClose={secret ? () => {} : onClose} title={secret ? "Copy your API key" : "New API key"} subtitle={secret ? "This is the only time it is shown" : "Give your developer or app access to the API"} footer={footer}>
      {secret ? (
        <div className="space-y-4">
          <div className="rounded-[12px] bg-amber-50 p-3.5 text-[13px] text-amber-900 ring-1 ring-amber-100">
            <p className="font-bold">Save this key now.</p>
            <p className="mt-1">GreenCRM keeps only a scrambled copy, so it cannot show it again. Keep it in your server settings, never in website code that visitors can see.</p>
            {secret.old_key_expires_at ? <p className="mt-1 font-semibold">The old key keeps working until {when(secret.old_key_expires_at)}. Put this new key in your app before then.</p> : null}
          </div>
          <CopyField value={secret.secret} />
          <CodeBlock title="Check that it works" code={`curl "${apiRoot()}/me" \\\n  -H "Authorization: Bearer ${secret.secret}"`} />
          <div className={`${D.soft} grid grid-cols-2 gap-3 p-3 text-[12.5px]`}>
            <div><p className="text-slate-400">Name</p><p className="font-semibold text-slate-800">{secret.name}</p></div>
            <div><p className="text-slate-400">Expires</p><p className="font-semibold text-slate-800">{secret.expires_at ? when(secret.expires_at, false) : "Never"}</p></div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Notice notice={error ? { tone: "error", text: error } : null} />
          <section className={`${D.panel} space-y-3 p-4`}>
            <label className={D.label}>
              <span>Name</span>
              <input className={D.input} value={form.name} maxLength={120} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Website backend, Zapier, Mobile app…" />
            </label>
            <label className={D.label}>
              <span>Expires</span>
              <select className={D.input} value={form.expires_in_days} onChange={(e) => setForm((f) => ({ ...f, expires_in_days: Number(e.target.value) }))}>
                {EXPIRY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className={D.label}>
              <span>Only from these addresses (optional)</span>
              <input className={`${D.input} font-mono text-[12.5px]`} value={form.allowed_ips} onChange={(e) => setForm((f) => ({ ...f, allowed_ips: e.target.value }))} placeholder="103.21.58.10, 10.20.0.0/16" />
              <span className="block text-[11.5px] font-normal text-slate-400">Your server's IP addresses. A stolen key then does not work from anywhere else. Leave empty to allow all.</span>
            </label>
          </section>
          <section className={`${D.panel} space-y-2 p-4`}>
            <p className="text-[13.5px] font-bold text-slate-900">What the key can do</p>
            {Object.entries(SCOPE_TEXT).map(([scope, [title, text]]) => (
              <label key={scope} className={`flex cursor-pointer items-start gap-3 rounded-[10px] px-3 py-2.5 ring-1 transition ${form.scopes.includes(scope) ? "bg-brand-50 ring-brand-100" : "ring-slate-200 hover:bg-slate-50"}`}>
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#0c605d]" checked={form.scopes.includes(scope)} onChange={() => toggle(scope)} />
                <span><span className="block text-[13px] font-semibold text-slate-800">{title}</span><span className="block text-[12px] text-slate-500">{text}</span></span>
              </label>
            ))}
            <p className="pt-1 text-[11.5px] text-slate-500">The key works with your admin access. If your account is turned off, the key stops too.</p>
          </section>
        </div>
      )}
    </SideDrawer>
  );
}

export default function KeysTab({ dev, drawerOpen, setDrawerOpen }) {
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState("");
  const [rolled, setRolled] = useState(null);

  async function roll(key) {
    if (!window.confirm(`Make a new key for "${key.name}"? The old key keeps working for 24 hours so you can switch your app over.`)) return;
    setBusy(key.key_id);
    setNotice(null);
    try {
      setRolled(await dev.rollKey(key.key_id));
      setDrawerOpen(true);
    } catch (err) {
      setNotice({ tone: "error", text: err.message });
    } finally {
      setBusy("");
    }
  }

  async function revoke(key) {
    if (!window.confirm(`Revoke "${key.name}"? Apps using it stop working at once.`)) return;
    setBusy(key.key_id);
    try {
      await dev.revokeKey(key.key_id);
      setNotice({ tone: "success", text: `"${key.name}" revoked.` });
    } catch (err) {
      setNotice({ tone: "error", text: err.message });
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-3">
      <Notice notice={notice} onClose={() => setNotice(null)} />
      {!dev.keys.length ? (
        <Empty title="No API keys yet" text="An API key lets your developer or another app read and create leads in GreenCRM. Make one key per app, so you can turn each off on its own."
          action={<button type="button" className={D.primary} onClick={() => setDrawerOpen(true)}>New API key</button>} />
      ) : (
        <div className={`${D.panel} overflow-x-auto`}>
          <table className="w-full min-w-[820px] text-left text-[12.5px]">
            <thead className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>{["Key", "Can", "Last used", "Calls", "Expires", "Made by", ""].map((h) => <th key={h} className="px-4 py-2.5 font-bold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dev.keys.map((key) => (
                <tr key={key.key_id} className={key.state === "active" ? "" : "text-slate-400"}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2"><span className="font-semibold text-slate-900">{key.name}</span><Badge tone={STATE_TONE[key.state]}>{key.state}</Badge></div>
                    <code className="mt-0.5 block font-mono text-[11.5px] text-slate-500">{key.key_prefix}••••••••</code>
                    {key.allowed_ips?.length ? <span className="mt-0.5 block text-[11px] text-slate-400" title={key.allowed_ips.join(", ")}>Only from {key.allowed_ips.length === 1 ? key.allowed_ips[0] : `${key.allowed_ips.length} addresses`}</span> : null}
                  </td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{key.scopes.map((s) => <Badge key={s} tone={s.endsWith("write") ? "blue" : "teal"}>{SCOPE_TEXT[s]?.[0] || s}</Badge>)}</div></td>
                  <td className="px-4 py-3"><p className="text-slate-700">{ago(key.last_used_at)}</p>{key.last_used_ip ? <p className="text-[11px] text-slate-400">{key.last_used_ip}</p> : null}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{fmt(key.request_count)}</td>
                  <td className="px-4 py-3 text-slate-600">{key.revoked_at ? `Revoked ${when(key.revoked_at, false)}` : key.expires_at ? when(key.expires_at, false) : "Never"}</td>
                  <td className="px-4 py-3"><p className="text-slate-700">{key.created_by_name || "–"}</p><p className="text-[11px] text-slate-400">{when(key.created_at, false)}</p></td>
                  <td className="px-4 py-3 text-right">{key.state !== "revoked" ? (
                    <div className="flex justify-end gap-1.5">
                      {key.state === "active" ? <button type="button" className={D.small} disabled={busy === key.key_id} onClick={() => roll(key)}>Roll</button> : null}
                      <button type="button" className={D.danger} disabled={busy === key.key_id} onClick={() => revoke(key)}>Revoke</button>
                    </div>
                  ) : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <NewKeyDrawer open={drawerOpen} rolled={rolled} onClose={() => { setDrawerOpen(false); setRolled(null); }} onCreate={dev.createKey} />
    </div>
  );
}
