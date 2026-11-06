"use client";

import { useEffect, useState } from "react";
import SideDrawer from "../../components/ui/SideDrawer";
import { D, LEAD_SOURCES, Notice } from "./dev-ui";

const SELLER_ROLES = ["admin", "manager", "sales", "marketing"];
const blank = { name: "", lead_source: "website", product_id: "", owner_ids: [], redirect_url: "", is_active: true };

/** Create or edit a lead capture link: name, source, product, who gets the leads, thank-you page. */
export default function LinkEditor({ open, link, products, people, onClose, onSave }) {
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(link ? { ...blank, ...link, redirect_url: link.redirect_url || "" } : { ...blank, product_id: products.length === 1 ? products[0].product_id : "" });
    setError("");
    setSearch("");
  }, [open, link, products]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const toggleOwner = (id) => set("owner_ids", form.owner_ids.includes(id) ? form.owner_ids.filter((x) => x !== id) : [...form.owner_ids, id]);
  const sellers = people.filter((p) => SELLER_ROLES.includes(p.role)).filter((p) => !search || `${p.name} ${p.email}`.toLowerCase().includes(search.toLowerCase()));

  async function save() {
    setSaving(true);
    setError("");
    try {
      await onSave(link?.form_id, { name: form.name, lead_source: form.lead_source, product_id: form.product_id, owner_ids: form.owner_ids, redirect_url: form.redirect_url, is_active: form.is_active });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SideDrawer open={open} onClose={onClose} title={link ? "Edit lead link" : "New lead link"} subtitle="Leads sent to this link land straight in your CRM"
      footer={<div className="flex justify-end gap-2"><button type="button" className={D.ghost} onClick={onClose}>Cancel</button><button type="button" className={D.primary} disabled={saving || !form.name.trim() || !form.product_id} onClick={save}>{saving ? "Saving…" : link ? "Save changes" : "Create link"}</button></div>}>
      <div className="space-y-4">
        <Notice notice={error ? { tone: "error", text: error } : null} />
        <section className={`${D.panel} space-y-3 p-4`}>
          <label className={D.label}>
            <span>Name</span>
            <input className={D.input} value={form.name} maxLength={120} onChange={(e) => set("name", e.target.value)} placeholder="Website contact form" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={D.label}>
              <span>Lead source</span>
              <select className={D.input} value={form.lead_source} onChange={(e) => set("lead_source", e.target.value)}>
                {LEAD_SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className={D.label}>
              <span>Product</span>
              <select className={D.input} value={form.product_id} onChange={(e) => set("product_id", e.target.value)}>
                <option value="">Choose a product</option>
                {products.map((p) => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
              </select>
            </label>
          </div>
          <label className={D.label}>
            <span>Thank-you page (optional)</span>
            <input className={D.input} value={form.redirect_url} onChange={(e) => set("redirect_url", e.target.value)} placeholder="https://yourwebsite.com/thank-you" />
            <span className="block text-[11.5px] font-normal text-slate-400">After a website form is sent, the visitor goes here. Leave empty for a simple thank-you message.</span>
          </label>
          <label className="flex items-center justify-between gap-3 rounded-[10px] bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
            <span><span className="block text-[13px] font-semibold text-slate-800">Link is on</span><span className="block text-[11.5px] text-slate-500">When off, the link refuses new leads.</span></span>
            <input type="checkbox" className="h-4 w-4 accent-[#0c605d]" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
          </label>
        </section>

        <section className={`${D.panel} p-4`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13.5px] font-bold text-slate-900">Who gets the leads</p>
              <p className="mt-0.5 text-[12px] text-slate-500">{form.owner_ids.length > 1 ? `Leads go to these ${form.owner_ids.length} people one by one (round robin).` : form.owner_ids.length ? "Every lead goes to this person." : "No one picked: leads come to you."}</p>
            </div>
            {form.owner_ids.length ? <button type="button" className="text-[12px] font-semibold text-slate-500 hover:text-slate-800" onClick={() => set("owner_ids", [])}>Clear</button> : null}
          </div>
          <input className={`${D.input} mt-3`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people" />
          <ul className="mt-2 max-h-[260px] space-y-1 overflow-y-auto">
            {sellers.map((p) => {
              const turn = form.owner_ids.indexOf(p.user_id);
              return (
                <li key={p.user_id}>
                  <label className={`flex cursor-pointer items-center gap-3 rounded-[10px] px-2.5 py-2 transition ${turn >= 0 ? "bg-brand-50 ring-1 ring-brand-100" : "hover:bg-slate-50"}`}>
                    <input type="checkbox" className="h-4 w-4 accent-[#0c605d]" checked={turn >= 0} onChange={() => toggleOwner(p.user_id)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-slate-800">{p.name}</span>
                      <span className="block truncate text-[11.5px] text-slate-500">{p.email} · {p.role}</span>
                    </span>
                    {turn >= 0 && form.owner_ids.length > 1 ? <span className="text-[11px] font-bold text-brand-700">#{turn + 1}</span> : null}
                  </label>
                </li>
              );
            })}
            {!sellers.length ? <li className="px-2 py-4 text-center text-[12.5px] text-slate-500">No one found.</li> : null}
          </ul>
        </section>
      </div>
    </SideDrawer>
  );
}
