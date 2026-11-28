"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import LeadCollaboratorPanel from "../details/LeadCollaboratorPanel";
import LeadOwnerControls, { LeadArchiveCard } from "../details/LeadOwnerControls";
import LeadTransferPanel from "../details/LeadTransferPanel";
import ManageCard from "../details/ManageCard";
import { titleizeLeadValue } from "../shared/leadPageFormatters";
import { ago } from "../../updates/updateUtils";
import { formatDay } from "./leadWorkspaceConfig";

const LONG = { day: "numeric", month: "short", year: "numeric" };

function Fact({ name, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{name}</dt>
      <dd className="mt-0.5 truncate text-[13px] font-medium text-slate-800">{children || <span className="text-slate-400">Not set</span>}</dd>
    </div>
  );
}

/** Facts about the record itself: its ID (to quote to support), who made it and when, where it came from. */
function LeadRecordCard({ lead }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(lead.lead_id); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (_error) { /* clipboard blocked */ }
  };
  return (
    <ManageCard icon="record" tone="slate" title="Lead record" subtitle="Where this lead came from and its history at a glance.">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div className="col-span-2 flex items-center justify-between gap-2 rounded-[10px] bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
          <span className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Lead ID</dt>
            <dd className="truncate font-mono text-[13px] font-semibold text-slate-800">{lead.lead_id}</dd>
          </span>
          <button type="button" onClick={copy} className="shrink-0 rounded-[8px] px-2.5 py-1 text-[12px] font-semibold text-brand-700 ring-1 ring-slate-200 transition hover:bg-white" aria-live="polite">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <Fact name="Created">{lead.created_at ? `${formatDay(lead.created_at, LONG)}${lead.created_by_name ? ` · ${lead.created_by_name}` : ""}` : ""}</Fact>
        <Fact name="Last change">{lead.updated_at ? ago(lead.updated_at) : ""}</Fact>
        <Fact name="Source">{lead.lead_source ? titleizeLeadValue(lead.lead_source) : ""}</Fact>
        <Fact name="Product">{lead.product_name}</Fact>
        <Fact name="Team">{lead.team_name}</Fact>
        <Fact name="Customer">
          {lead.converted_to_customer_id
            ? <Link href={`/customers/${lead.converted_to_customer_id}`} prefetch={false} className="text-brand-700 hover:underline">Open customer</Link>
            : "Not converted yet"}
        </Fact>
      </dl>
    </ManageCard>
  );
}

/** The Manage tab of the lead side panel: owner, access, legal hand-off, the record, and archive. */
export default function LeadManageTab({ lead, canManage, canTransfer, shared }) {
  // Show only messages that came from actions on this tab, not old ones from the list page.
  const opened = useRef({ error: shared.pageError, notice: shared.pageNotice, lead: lead.lead_id });
  if (opened.current.lead !== lead.lead_id) opened.current = { error: shared.pageError, notice: shared.pageNotice, lead: lead.lead_id };
  const error = shared.pageError && shared.pageError !== opened.current.error ? shared.pageError : "";
  const notice = shared.pageNotice && shared.pageNotice !== opened.current.notice ? shared.pageNotice : "";
  return (
    <>
      {error ? <p role="alert" className="rounded-[10px] bg-rose-50 px-3 py-2.5 text-[13px] font-medium text-rose-700 ring-1 ring-rose-200">{error}</p> : null}
      {notice ? <p role="status" className="rounded-[10px] bg-emerald-50 px-3 py-2.5 text-[13px] font-medium text-emerald-800 ring-1 ring-emerald-200">{notice}</p> : null}

      {canManage ? (
        <LeadOwnerControls assigning={shared.assigning} canManage={canManage} company={shared.company} isPlatformConsole={shared.isPlatformConsole} lead={lead}
          onOwnerChange={shared.onOwnerChange} onOwnerNoteChange={shared.onOwnerNoteChange} owner={shared.owner} ownerNote={shared.ownerNote}
          ownerUsersMessage={shared.ownerUsersMessage} saveOwner={shared.saveOwner} teamUsers={shared.teamUsers} />
      ) : null}

      <LeadCollaboratorPanel addCollaborator={shared.saveCollaborator} canManage collaboratorUsersMessage={shared.collaboratorUsersMessage} lead={lead} pendingCollaborator={shared.pendingCollaborator}
        removeCollaborator={shared.removeCollaborator} removingCollaboratorId={shared.removingCollaboratorId} savingCollaborators={shared.savingCollaborators}
        setPendingCollaborator={shared.setPendingCollaborator} teamUsers={shared.teamUsers} />

      <LeadTransferPanel canTransfer={canTransfer} legalTeam={shared.legalTeam} legalTransferNote={shared.legalTransferNote} legalTransferOwner={shared.legalTransferOwner}
        legalUsersMessage={shared.legalUsersMessage} scopedLegalUsers={shared.scopedLegalUsers} setLegalTransferNote={shared.setLegalTransferNote}
        setLegalTransferOwner={shared.setLegalTransferOwner} transferLeadToLegal={shared.transferLeadToLegal} transferring={shared.transferring} />

      <LeadRecordCard lead={lead} />

      {canManage ? <LeadArchiveCard archiveLead={shared.archiveLead} deleting={shared.deleting} lead={lead} /> : null}
    </>
  );
}
