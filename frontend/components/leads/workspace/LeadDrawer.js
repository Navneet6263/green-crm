"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import LeadCollaboratorPanel from "../details/LeadCollaboratorPanel";
import LeadOwnerControls from "../details/LeadOwnerControls";
import LeadTransferPanel from "../details/LeadTransferPanel";
import LeadTasksPanel from "../lead360/LeadTasksPanel";
import LeadTimeline from "../lead360/LeadTimeline";
import { NextStepCard, PaymentCard, QuickNote } from "../lead360/LeadSummaryCards";
import LeadQuickStatusControl from "../LeadQuickStatusControl";
import TransferLeadButton from "../TransferLeadButton";
import WorkflowBadge from "../WorkflowBadge";
import { PRIORITY_TONE } from "../shared/leadPageConstants";
import { leadPrimaryName, leadSecondaryName, titleizeLeadValue } from "../shared/leadPageFormatters";
import { apiRequest } from "../../../lib/api";
import EmailButton from "../../email/EmailButton";
import { LeadAvatar, Pill, telHref, whatsappHref } from "./LeadsTable";
import { formatDay } from "./leadWorkspaceConfig";

const TABS = [["overview", "Overview"], ["timeline", "Timeline"], ["tasks", "Tasks"], ["manage", "Manage"]];
const ICONS = {
  call: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  whatsapp: "M21 12a9 9 0 0 1-13.5 7.8L3 21l1.2-4.5A9 9 0 1 1 21 12",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  open: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z",
};
const Icon = ({ d, className = "h-4 w-4" }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
const QUICK = "inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-white px-2.5 text-[12.5px] font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-brand-50 hover:text-brand-800";

function Row({ name, children }) {
  if (!children) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 text-[13px]">
      <dt className="shrink-0 text-slate-500">{name}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-slate-800">{children}</dd>
    </div>
  );
}

/** Lead side panel: see what's next, talk to the customer and record it, without leaving the list. */
export default function LeadDrawer({
  lead, loading, onClose, onPrev, onNext, canEdit, canManage, canTransfer, enabledStatuses, onStatusUpdated, onRefresh, shared, selfId,
}) {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [notes, setNotes] = useState([]);
  const [activity, setActivity] = useState([]);
  const [historySeed, setHistorySeed] = useState(0);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState("");
  const leadId = lead?.lead_id;
  const token = shared.sessionToken;

  useEffect(() => { setTab("overview"); setError(""); setNotes([]); setActivity([]); }, [leadId]);
  useEffect(() => {
    if (!leadId || !token) return undefined;
    let cancelled = false;
    Promise.all([
      apiRequest(`/leads/${encodeURIComponent(leadId)}/notes?page_size=30`, { token, fresh: true }).catch(() => ({ items: [] })),
      apiRequest(`/leads/${encodeURIComponent(leadId)}/activity?page_size=30`, { token, fresh: true }).catch(() => ({ items: [] })),
    ]).then(([noteRes, activityRes]) => {
      if (cancelled) return;
      setNotes(noteRes?.items || noteRes?.data || []);
      setActivity(activityRes?.items || activityRes?.data || []);
    });
    return () => { cancelled = true; };
  }, [leadId, token, historySeed]);

  useEffect(() => {
    if (!leadId) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape" && !document.querySelector('[role="dialog"], .z-\\[120\\]')) onClose();
      if (["INPUT", "TEXTAREA", "SELECT"].includes(event.target?.tagName) || document.querySelector('[role="dialog"], .z-\\[120\\]')) return;
      if (event.key === "ArrowDown") { event.preventDefault(); onNext?.(); }
      if (event.key === "ArrowUp") { event.preventDefault(); onPrev?.(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [leadId, onClose, onNext, onPrev]);

  const saved = useCallback((id, content, updated) => {
    shared.onInlineNoteSaved(id, content, updated);
    setHistorySeed((s) => s + 1);
  }, [shared]);
  const statusSaved = useCallback((updated, context) => {
    onStatusUpdated(updated, context);
    setHistorySeed((s) => s + 1);
  }, [onStatusUpdated]);

  if (!lead) return null;
  const secondary = leadSecondaryName(lead);
  const isWon = lead.status === "closed-won";
  const converted = Boolean(lead.converted_to_customer_id);
  const longDate = { day: "numeric", month: "short", year: "numeric" };

  async function convert() {
    if (!window.confirm(`Convert "${leadPrimaryName(lead)}" to a customer? Lead details will be used to create the customer.`)) return;
    setConverting(true);
    setError("");
    try {
      const response = await apiRequest(`/leads/${lead.lead_id}/convert-to-customer`, { method: "POST", token });
      router.push(`/customers/${response.customer.customer_id}`);
    } catch (err) {
      setError(err.message || "The lead could not be converted.");
      setConverting(false);
    }
  }

  return (
    <aside className="tw-buttons fixed inset-y-0 right-0 z-40 flex w-full max-w-[600px] flex-col border-l border-slate-200 bg-[#f7f8f6] shadow-[-24px_0_60px_-30px_rgba(15,23,42,0.4)]" aria-label={`Lead ${leadPrimaryName(lead)}`}>
      <div className="border-b border-slate-200 bg-white px-5 pt-4">
        <div className="flex items-start gap-3">
          <LeadAvatar lead={lead} size="h-11 w-11 text-[14px]" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[17px] font-bold leading-tight text-slate-900">{lead.company_name || leadPrimaryName(lead)}</h2>
            <p className="truncate text-[13px] text-slate-500">{[lead.company_name ? lead.contact_person : secondary, lead.phone].filter(Boolean).join(" · ") || "No contact details"}</p>
          </div>
          {loading ? <span className="mt-1 text-[11.5px] font-medium text-slate-400">Refreshing…</span> : null}
          <span className="flex items-center">
            <button type="button" onClick={onPrev} disabled={!onPrev} aria-label="Previous lead" title="Previous lead (↑)" className="grid h-8 w-8 place-items-center rounded-[8px] text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"><Icon d="m18 15-6-6-6 6" /></button>
            <button type="button" onClick={onNext} disabled={!onNext} aria-label="Next lead" title="Next lead (↓)" className="grid h-8 w-8 place-items-center rounded-[8px] text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"><Icon d="m6 9 6 6 6-6" /></button>
            <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-[8px] text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Icon d="m6 6 12 12M18 6 6 18" /></button>
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="w-[170px]">
            {lead.is_workflow ? (
              <WorkflowBadge status={lead.workflow_status} leadId={lead.lead_id} lead={lead} onAction={(updated) => (updated ? statusSaved(updated) : onRefresh?.())} />
            ) : canEdit ? (
              <LeadQuickStatusControl assigneeOptions={shared.teamUsers} enabledStatuses={enabledStatuses} lead={lead} token={token} onUpdated={statusSaved} hideLabel
                selectClassName="h-8 w-[170px] min-h-0 rounded-[8px] border border-slate-200 bg-white py-0 pl-2 pr-1 text-[12.5px] font-semibold text-slate-800" />
            ) : <Pill>{titleizeLeadValue(lead.status)}</Pill>}
          </div>
          <Pill tone={PRIORITY_TONE[lead.priority] || PRIORITY_TONE.medium}>{lead.priority || "medium"}</Pill>
          {lead.product_name ? <span className="rounded-full bg-gold-50 px-2 py-0.5 text-[11px] font-semibold text-gold-800">{lead.product_name}</span> : null}
          <span className="text-[12px] text-slate-500">{lead.assigned_to_name || "Unassigned"}</span>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {lead.phone ? <a href={telHref(lead.phone)} className={QUICK}><Icon d={ICONS.call} className="h-3.5 w-3.5" />Call</a> : null}
          {lead.phone ? <a href={whatsappHref(lead.phone)} target="_blank" rel="noreferrer" className={QUICK}><Icon d={ICONS.whatsapp} className="h-3.5 w-3.5" />WhatsApp</a> : null}
          {lead.email ? <a href={`mailto:${lead.email}`} className={QUICK}><Icon d={ICONS.mail} className="h-3.5 w-3.5" />Email</a> : null}
          {canEdit ? <Link href={`/leads/${lead.lead_id}/edit`} prefetch={false} className={QUICK}><Icon d={ICONS.edit} className="h-3.5 w-3.5" />Edit</Link> : null}
          <TransferLeadButton leadId={lead.id || lead.lead_id} leadName={leadPrimaryName(lead)} className={QUICK} label="Transfer" />
          <EmailButton label="Email owner" className="h-8! rounded-[8px]! px-2.5! text-[12.5px]!" kind="lead" lead={lead} defaultTo={[lead.assigned_to]} />
          <Link href={`/leads/${lead.lead_id}`} prefetch={false} className={`${QUICK} ml-auto text-brand-800`}>Open full page<Icon d={ICONS.open} className="h-3.5 w-3.5" /></Link>
        </div>

        <div className="mt-2.5 flex gap-1" role="tablist" aria-label="Lead details">
          {TABS.filter(([key]) => key !== "manage" || canEdit).map(([key, name]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
              className={`-mb-px px-3 py-2 text-[13px] font-semibold transition ${tab === key ? "text-brand-800" : "text-slate-500 hover:text-slate-800"}`} style={{ borderBottom: `2px solid ${tab === key ? "#157672" : "transparent"}` }}>
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {error ? <p role="alert" className="rounded-[10px] bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</p> : null}

        {tab === "overview" ? (
          <>
            <NextStepCard lead={lead} token={token} canEdit={canEdit} onSaved={saved} />
            {isWon && !converted && canEdit ? (
              <button type="button" onClick={convert} disabled={converting} className="w-full rounded-[10px] bg-emerald-600 py-2.5 text-[13.5px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                {converting ? "Converting…" : "Convert to customer"}
              </button>
            ) : null}
            {canEdit ? <QuickNote lead={lead} token={token} onSaved={saved} /> : null}
            <section className="rounded-[12px] bg-white p-3.5 ring-1 ring-slate-200">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-500">Latest activity</h3>
                <button type="button" onClick={() => setTab("timeline")} className="text-[12.5px] font-semibold text-brand-700 hover:underline">See all</button>
              </div>
              <LeadTimeline notes={notes} activity={activity} limit={3} emptyText="Nothing recorded yet." />
            </section>
            <PaymentCard lead={lead} />
            <section className="rounded-[12px] bg-white px-3.5 py-2.5 ring-1 ring-slate-200">
              <h3 className="py-1 text-[12px] font-bold uppercase tracking-wider text-slate-500">Details</h3>
              <dl className="divide-y divide-slate-100">
                <Row name="Contact person">{lead.contact_person}</Row>
                <Row name="Phone">{lead.phone}</Row>
                <Row name="Email">{lead.email}</Row>
                <Row name="Source">{titleizeLeadValue(lead.lead_source || "")}</Row>
                <Row name="Team">{lead.team_name}</Row>
                <Row name="Location">{[lead.address_city, lead.address_state].filter(Boolean).join(", ")}</Row>
                <Row name="Industry">{lead.industry}</Row>
                <Row name="Requirement">{lead.requirements}</Row>
                <Row name="Created">{`${formatDay(lead.created_at, longDate)}${lead.created_by_name ? ` · ${lead.created_by_name}` : ""}`}</Row>
              </dl>
            </section>
          </>
        ) : null}

        {tab === "timeline" ? (
          <>
            {canEdit ? <QuickNote lead={lead} token={token} onSaved={saved} /> : null}
            <section className="rounded-[12px] bg-white p-3.5 ring-1 ring-slate-200"><LeadTimeline notes={notes} activity={activity} /></section>
          </>
        ) : null}

        {tab === "tasks" ? (
          <section className="rounded-[12px] bg-white p-3.5 ring-1 ring-slate-200">
            <LeadTasksPanel lead={lead} token={token} people={shared.teamUsers} selfId={selfId} canEdit={canEdit} />
          </section>
        ) : null}

        {tab === "manage" ? (
          <>
            {canManage ? (
              <div>
                <LeadOwnerControls archiveLead={shared.archiveLead} assigning={shared.assigning} canManage={canManage} company={shared.company} deleting={shared.deleting}
                  isPlatformConsole={shared.isPlatformConsole} lead={lead} onOwnerChange={shared.onOwnerChange} onOwnerNoteChange={shared.onOwnerNoteChange} owner={shared.owner}
                  ownerNote={shared.ownerNote} ownerUsersMessage={shared.ownerUsersMessage} saveOwner={shared.saveOwner} teamUsers={shared.teamUsers} />
              </div>
            ) : null}
            <div>
              <LeadCollaboratorPanel addCollaborator={shared.saveCollaborator} canManage collaboratorUsersMessage={shared.collaboratorUsersMessage} lead={lead} pendingCollaborator={shared.pendingCollaborator}
                removeCollaborator={shared.removeCollaborator} removingCollaboratorId={shared.removingCollaboratorId} savingCollaborators={shared.savingCollaborators}
                setPendingCollaborator={shared.setPendingCollaborator} teamUsers={shared.teamUsers} />
            </div>
            {canTransfer ? (
              <section className="rounded-[12px] bg-emerald-50 p-4 ring-1 ring-emerald-200">
                <LeadTransferPanel canTransfer={canTransfer} legalTeam={shared.legalTeam} legalTransferNote={shared.legalTransferNote} legalTransferOwner={shared.legalTransferOwner}
                  legalUsersMessage={shared.legalUsersMessage} scopedLegalUsers={shared.scopedLegalUsers} setLegalTransferNote={shared.setLegalTransferNote}
                  setLegalTransferOwner={shared.setLegalTransferOwner} transferLeadToLegal={shared.transferLeadToLegal} transferring={shared.transferring} />
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </aside>
  );
}
