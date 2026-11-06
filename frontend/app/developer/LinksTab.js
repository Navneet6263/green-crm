"use client";

import { useState } from "react";
import LinkEditor from "./LinkEditor";
import LinkSetup from "./LinkSetup";
import { Badge, D, Empty, Notice, ago, fmt, sourceLabel } from "./dev-ui";

function Stat({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold text-slate-400">{label}</p>
      <p className="truncate text-[14px] font-bold text-slate-900">{value}</p>
    </div>
  );
}

/** Lead capture links: one card per link with its numbers and actions. */
export default function LinksTab({ dev, editorOpen, setEditorOpen }) {
  const [editing, setEditing] = useState(null);
  const [setupId, setSetupId] = useState(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState(null);
  const names = new Map(dev.people.map((p) => [p.user_id, p.name]));
  const setup = dev.links.find((l) => l.form_id === setupId) || null;

  async function act(id, run, done) {
    setBusy(id);
    setNotice(null);
    try {
      await run();
      setNotice({ tone: "success", text: done });
    } catch (err) {
      setNotice({ tone: "error", text: err.message });
    } finally {
      setBusy("");
    }
  }

  const openEditor = (link) => { setEditing(link); setEditorOpen(true); };
  const rotate = (link) => {
    if (!window.confirm(`Make a new address for "${link.name}"? The old one stops working at once, so update your forms after this.`)) return;
    act(link.form_id, () => dev.rotateLink(link.form_id), "New link made. Copy it from Set up and paste it in your forms.");
  };
  const remove = (link) => {
    if (!window.confirm(`Delete "${link.name}"? Forms using it stop sending leads. Leads already received stay in the CRM.`)) return;
    act(link.form_id, () => dev.deleteLink(link.form_id), "Link deleted.");
  };
  const toggle = (link) => act(link.form_id, () => dev.saveLink(link.form_id, { is_active: !link.is_active }), link.is_active ? "Link turned off." : "Link turned on.");

  return (
    <div className="space-y-3">
      <Notice notice={notice} onClose={() => setNotice(null)} />
      {!dev.links.length ? (
        <Empty title="No lead links yet" text="A lead link is a secret address. Put it on your website form, Facebook or Google ads, or IndiaMART, and every enquiry becomes a lead with an owner."
          action={<button type="button" className={D.primary} onClick={() => openEditor(null)}>New lead link</button>} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {dev.links.map((link) => {
            const owners = link.owner_ids.map((id) => names.get(id)).filter(Boolean);
            return (
              <article key={link.form_id} className={`${D.panel} flex flex-col p-4 ${link.is_active ? "" : "opacity-80"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[15px] font-bold text-slate-900">{link.name}</p>
                      <Badge tone={link.is_active ? "green" : "slate"}>{link.is_active ? "On" : "Off"}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-slate-500">{sourceLabel(link.lead_source)} · {link.product_name || "No product"}</p>
                  </div>
                  <button type="button" role="switch" aria-checked={link.is_active} aria-label={link.is_active ? "Turn off" : "Turn on"} disabled={busy === link.form_id} onClick={() => toggle(link)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${link.is_active ? "bg-brand-700" : "bg-slate-300"}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${link.is_active ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3 rounded-[12px] bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
                  <Stat label="New leads" value={fmt(link.lead_count)} />
                  <Stat label="Asked again" value={fmt(link.repeat_count)} />
                  <Stat label="Last lead" value={ago(link.last_lead_at)} />
                </div>

                <p className="mt-3 text-[12px] text-slate-500">
                  <span className="font-semibold text-slate-700">Owners: </span>
                  {owners.length ? `${owners.slice(0, 3).join(", ")}${owners.length > 3 ? ` +${owners.length - 3}` : ""}${owners.length > 1 ? " (round robin)" : ""}` : "You (no one picked)"}
                </p>

                <div className="mt-auto flex flex-wrap gap-2 pt-3">
                  <button type="button" className={D.primary} onClick={() => setSetupId(link.form_id)}>Set up &amp; test</button>
                  <button type="button" className={D.small} onClick={() => openEditor(link)}>Edit</button>
                  <button type="button" className={D.small} disabled={busy === link.form_id} onClick={() => rotate(link)}>New address</button>
                  <button type="button" className={D.danger} disabled={busy === link.form_id} onClick={() => remove(link)}>Delete</button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <LinkEditor open={editorOpen} link={editing} products={dev.products} people={dev.people}
        onClose={() => { setEditorOpen(false); setEditing(null); }}
        onSave={async (id, body) => {
          const saved = await dev.saveLink(id, body);
          setNotice({ tone: "success", text: id ? "Link saved." : "Link created. Now set it up on your website or ads." });
          if (!id && saved?.form_id) setSetupId(saved.form_id);
        }} />
      <LinkSetup link={setup} onClose={() => setSetupId(null)} onChanged={dev.reload} />
    </div>
  );
}
