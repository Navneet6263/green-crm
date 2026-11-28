"use client";

import { useState } from "react";
import { colorFor } from "../../dashboard/home/widgetCatalog";
import TransferLeadButton from "../TransferLeadButton";
import ManageCard, { FIELD, FIELD_LABEL, GHOST_BTN, PRIMARY_BTN } from "./ManageCard";

const initials = (name = "") => String(name).split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
const prettyRole = (role = "") => String(role).split("-").filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1)).join(" ");

/** Who owns the lead, and handing it to someone else in the same team (with a reason for the log). */
export default function LeadOwnerControls({
  assigning, canManage, company, isPlatformConsole, lead, onOwnerChange, onOwnerNoteChange, owner, ownerNote, ownerUsersMessage, saveOwner, teamUsers,
}) {
  if (!canManage) return null;
  const current = teamUsers.find((user) => user.user_id === lead.assigned_to);
  const ownerName = lead.assigned_to_name || current?.name || "";
  const others = teamUsers.filter((user) => user.user_id !== lead.assigned_to);
  const picked = owner && owner !== lead.assigned_to ? owner : "";
  const pickedUser = others.find((user) => user.user_id === picked);
  const needsCompany = isPlatformConsole && company === "all";

  return (
    <ManageCard icon="owner" title="Owner" subtitle="The person who works this lead and gets its reminders."
      footer={(
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 flex-1 text-[12px] leading-snug text-slate-500">
            Only people in {lead.team_name ? <b className="font-semibold text-slate-700">{lead.team_name}</b> : "this team"} are listed. For someone in another team, use Transfer: the lead moves when they accept.
          </p>
          <TransferLeadButton leadId={lead.id || lead.lead_id} leadName={lead.company_name || lead.contact_person} label="Transfer" className={`${GHOST_BTN} h-8! px-3! text-[12.5px]!`} />
        </div>
      )}>
      <div className="flex items-center gap-3 rounded-[10px] bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
        {ownerName ? (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: colorFor(lead.assigned_to || ownerName) }}>{initials(ownerName)}</span>
        ) : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-200 text-[12px] font-bold text-slate-500">?</span>}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold text-slate-900">{ownerName || "No owner yet"}</span>
          <span className="block truncate text-[11.5px] text-slate-500">{[prettyRole(current?.role || lead.assigned_to_role), lead.team_name].filter(Boolean).join(" · ") || "Pick someone below"}</span>
        </span>
        <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-brand-700">Current</span>
      </div>

      {needsCompany ? (
        <p className="mt-3 text-[12.5px] text-slate-500">Choose a company at the top of the list before changing the owner.</p>
      ) : !teamUsers.length ? (
        <p className="mt-3 text-[12.5px] text-slate-500">{ownerUsersMessage}</p>
      ) : !others.length ? (
        <p className="mt-3 text-[12.5px] text-slate-500">Nobody else is in this team yet. Use Transfer to send it to another team.</p>
      ) : (
        <div className="mt-3 grid gap-3">
          <label className="block">
            <span className={FIELD_LABEL}>Hand it to</span>
            <select className={`${FIELD} h-9 py-0`} value={picked} onChange={(event) => onOwnerChange(event.target.value || lead.assigned_to || "")}>
              <option value="">Choose a teammate…</option>
              {others.map((user) => <option key={user.user_id} value={user.user_id}>{user.name}{user.role ? ` · ${prettyRole(user.role)}` : ""}</option>)}
            </select>
          </label>
          {picked ? (
            <label className="block">
              <span className={FIELD_LABEL}>Reason <span className="font-normal text-slate-400">(saved in the lead history)</span></span>
              <textarea rows={2} value={ownerNote} onChange={(event) => onOwnerNoteChange(event.target.value)}
                placeholder={`Why is ${pickedUser?.name || "this person"} taking over?`} className={`${FIELD} resize-y`} />
            </label>
          ) : null}
          <div className="flex justify-end">
            <button type="button" className={PRIMARY_BTN} disabled={assigning || !picked || !ownerNote.trim()} onClick={saveOwner}>
              {assigning ? "Saving…" : picked ? `Make ${pickedUser?.name?.split(" ")[0] || "them"} the owner` : "Change owner"}
            </button>
          </div>
        </div>
      )}
    </ManageCard>
  );
}

/** Archive with the reason written right here; the lead can be restored from Deleted leads. */
export function LeadArchiveCard({ archiveLead, deleting, lead }) {
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const busy = deleting === lead.lead_id;
  return (
    <ManageCard icon="archive" tone="rose" danger title="Archive lead" subtitle="Takes it off every list and report. An admin or manager can restore it from Deleted leads.">
      {asking ? (
        <div className="grid gap-2.5">
          <label className="block">
            <span className={FIELD_LABEL}>Why are you archiving it?</span>
            <textarea rows={2} autoFocus value={reason} onChange={(event) => setReason(event.target.value)} placeholder="For example: duplicate of another lead, wrong number, not a business" className={`${FIELD} resize-y`} />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className={GHOST_BTN} disabled={busy} onClick={() => { setAsking(false); setReason(""); }}>Cancel</button>
            <button type="button" disabled={busy || !reason.trim()} onClick={() => archiveLead(lead.lead_id, reason.trim())}
              className="inline-flex h-9 items-center justify-center rounded-[10px] bg-rose-600 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? "Archiving…" : "Archive lead"}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAsking(true)} className="inline-flex h-9 items-center rounded-[10px] px-3.5 text-[13px] font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-50">
          Archive this lead…
        </button>
      )}
    </ManageCard>
  );
}
