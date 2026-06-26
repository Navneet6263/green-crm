"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LeadExpandedDetails from "../details/LeadExpandedDetails";
import LeadFollowUpStatusButton from "../LeadFollowUpStatusButton";
import LeadQuickStatusControl from "../LeadQuickStatusControl";
import TransferLeadButton from "../TransferLeadButton";
import WorkflowBadge from "../WorkflowBadge";
import { PRIORITY_TONE, STATUS_TONE } from "../shared/leadPageConstants";
import {
  formatLeadDate, formatLeadMoney,
  leadInitials, leadPrimaryName, leadSecondaryName, titleizeLeadValue,
} from "../shared/leadPageFormatters";
import { apiRequest } from "../../../lib/api";

const AVATAR_PALETTE = ["bg-emerald-600", "bg-amber-600", "bg-sky-600", "bg-violet-600", "bg-orange-600", "bg-cyan-600", "bg-rose-600", "bg-blue-600"];
const ACTION_BTN = "inline-flex min-h-[32px] items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800";
const FOLLOW_UP_BTN = "inline-flex min-h-[32px] items-center justify-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100";
const CREATE_CUSTOMER_BTN = "inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed";
const META_CHIP = "inline-flex min-h-[27px] max-w-full items-center gap-1.5 rounded-full bg-slate-50 px-2.5 text-xs text-slate-500 ring-1 ring-slate-100";
const BADGE = "inline-flex min-h-[22px] items-center rounded-full border px-2.5 text-[10px] leading-none";

function avatarBg(name = "") { return AVATAR_PALETTE[(name.charCodeAt(0) || 0) % AVATAR_PALETTE.length]; }
function validHex(value) { return /^#[0-9a-f]{6}$/i.test(String(value || "").trim()) ? String(value).toLowerCase() : null; }
function initials(name = "") { return String(name).split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "?"; }

function MiniAvatar({ name, bg = "bg-slate-300" }) {
  return <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${bg} text-[9px] font-bold text-white`}>{initials(name)}</span>;
}

export default function LeadRowCard({
  activeLead, archiveLead, assigning, canTransferRow, canEdit, canManage,
  collaboratorUsersMessage, company, deleting, detailLoading, enabledStatuses,
  handleInlineStatusUpdate, isPlatformConsole, legalTeam, legalTransferNote,
  legalTransferOwner, legalUsersMessage, lead, onInlineNoteSaved, onOwnerChange,
  onOwnerNoteChange, onPickToggle, onSelectToggle, owner, ownerNote,
  ownerUsersMessage, pendingCollaborator, picked, removeCollaborator,
  removingCollaboratorId, saveCollaborator, saveOwner, savingCollaborators,
  scopedLegalUsers, selected, sessionToken, setPendingCollaborator,
  setLegalTransferNote, setLegalTransferOwner, teamBadgeLabel, teamUsers,
  transferLeadToLegal, transferring,
}) {
  const router = useRouter();
  const [converting, setConverting] = useState(false);
  const primaryName = leadPrimaryName(lead);
  const secondaryName = leadSecondaryName(lead);
  const noteCount = Number(lead.note_count || 0);
  const statusTone = STATUS_TONE[lead.status] || STATUS_TONE.new;
  const priorityTone = PRIORITY_TONE[lead.priority] || PRIORITY_TONE.medium;
  const expandedLead = selected && activeLead?.lead_id === lead.lead_id ? activeLead : lead;
  const productHex = validHex(lead.product_color);
  const teamLabel = teamBadgeLabel(lead);
  const avatarClass = productHex ? "" : avatarBg(primaryName);
  const isClosedWon = lead.status === "closed-won";
  const isConverted = !!lead.converted_to_customer_id;

  async function handleConvertToCustomer() {
    if (!window.confirm(`Convert "${primaryName}" to customer? Lead data will be used to create the customer.`)) {
      return;
    }

    setConverting(true);
    try {
      const response = await apiRequest(`/leads/${lead.lead_id}/convert-to-customer`, {
        method: "POST",
        token: sessionToken,
      });
      router.push(`/customers/${response.customer.customer_id}`);
    } catch (error) {
      // Enhanced error message for duplicate customers
      if (error.statusCode === 409 && error.details?.duplicate) {
        const ownerName = error.details.assigned_to_name || 'the assigned owner';
        const ownerEmail = error.details.assigned_to_email ? ` (${error.details.assigned_to_email})` : '';
        alert(`⚠️ Customer Already Exists\n\nA customer with this email or company name already exists.\n\nPlease contact ${ownerName}${ownerEmail} to view this customer.`);
      } else {
        alert(error.message || "Failed to convert lead to customer.");
      }
      setConverting(false);
    }
  }

  return (
    <article className={`w-full rounded-2xl border transition duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_10px_26px_rgba(15,23,42,0.06)] ${selected ? "border-amber-300 bg-amber-50/45 shadow-[0_8px_22px_rgba(203,169,82,0.14)]" : "border-slate-100 bg-white shadow-sm"}`}>
      <div className="space-y-3 px-3.5 py-3.5 sm:px-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
            <div className="flex items-start gap-2">
              {canManage ? (
                <label className="pt-3">
                  <input type="checkbox" checked={picked} onChange={onPickToggle} className="h-4 w-4 rounded border-slate-300 accent-amber-500" />
                </label>
              ) : null}
              <button type="button" onClick={onSelectToggle} className="shrink-0" aria-label={`Select ${primaryName}`}>
                <div className="rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-100 transition group-hover:ring-amber-200">
                  <div className={`grid h-12 w-12 place-items-center rounded-xl text-sm font-bold text-white ${avatarClass}`} style={productHex ? { backgroundColor: productHex } : undefined}>
                    {leadInitials(lead.contact_person, lead.company_name, lead.email)}
                  </div>
                </div>
              </button>
            </div>

            <button type="button" onClick={onSelectToggle} className="min-w-0 text-left">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`${BADGE} font-bold uppercase`} style={{ background: statusTone[0], color: statusTone[1] }}>{titleizeLeadValue(lead.status || "new")}</span>
                <span className={`${BADGE} font-semibold`} style={{ background: priorityTone[0], color: priorityTone[1] }}>{titleizeLeadValue(lead.priority || "medium")}</span>
                {lead.product_name ? (
                  <span className={`${BADGE} min-w-0 max-w-[180px] gap-1 border-amber-200 bg-amber-50 font-bold text-amber-800`}>
                    {productHex ? <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: productHex }} /> : null}
                    <span className="truncate">{lead.product_name}</span>
                  </span>
                ) : null}
                {teamLabel ? <span className={`${BADGE} border-slate-200 bg-white font-bold text-slate-600`}>{teamLabel}</span> : null}
                {noteCount ? <span className={`${BADGE} border-slate-200 bg-white font-semibold text-slate-600`}>Notes {noteCount}</span> : null}
              </div>
              <h4 className="mt-1.5 truncate text-base font-bold text-slate-950 sm:text-[17px]">{primaryName}</h4>
              {secondaryName ? <p className="mt-0.5 truncate text-xs text-slate-500 sm:text-sm">{secondaryName}</p> : null}
            </button>
          </div>

          <div className="grid w-full gap-1.5 sm:grid-cols-[minmax(190px,1fr)_auto] sm:items-end lg:w-auto lg:min-w-[260px] lg:grid-cols-1">
            {canEdit ? (
              <div className="min-w-0">
                <TransferLeadButton leadId={lead.id} leadName={primaryName} />
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Lead Status</p>
                {lead.is_workflow ? (
                  <WorkflowBadge
                    status={lead.workflow_status}
                    leadId={lead.lead_id}
                    lead={lead}
                    onAction={(updatedLead) => {
                      if (updatedLead) {
                        handleInlineStatusUpdate(updatedLead);
                      } else {
                        router.refresh();
                        if (onInlineNoteSaved) onInlineNoteSaved();
                      }
                    }}
                  />
                ) : (
                  <LeadQuickStatusControl
                    assigneeOptions={teamUsers}
                    enabledStatuses={enabledStatuses}
                    lead={lead}
                    token={sessionToken}
                    onUpdated={handleInlineStatusUpdate}
                    hideLabel
                    selectClassName="min-h-[34px] w-full bg-white border border-slate-200 rounded-lg pr-8 text-xs font-semibold text-slate-700 shadow-none focus:border-amber-400"
                  />
                )}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-1.5">
              {isClosedWon && !isConverted ? (
                <button type="button" onClick={handleConvertToCustomer} disabled={converting} className={CREATE_CUSTOMER_BTN}>
                  {converting ? "Converting..." : "🎉 Create Customer"}
                </button>
              ) : null}
              {isConverted ? (
                <span className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                  ✓ Converted
                </span>
              ) : null}
              <Link href={`/leads/${lead.lead_id}`} className={ACTION_BTN}>View</Link>
              {canEdit ? <Link href={`/leads/${lead.lead_id}/edit`} className={ACTION_BTN}>Edit</Link> : null}
              {canEdit ? <LeadFollowUpStatusButton className={FOLLOW_UP_BTN} lead={lead} onSaved={onInlineNoteSaved} token={sessionToken} disabled={!lead.status || lead.status === "new"} /> : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className={META_CHIP}><span className="font-semibold text-slate-400">Owner</span><MiniAvatar name={lead.assigned_to_name || "?"} bg="bg-emerald-500" /><span className="truncate font-semibold text-slate-700">{lead.assigned_to_name || "Unassigned"}</span></span>
          {lead.phone ? <a href={`tel:${String(lead.phone).replace(/[^\d+]/g, "")}`} className={`${META_CHIP} hover:text-amber-700`}>{lead.phone}</a> : null}
          {lead.email ? <span className={`${META_CHIP} hidden max-w-[220px] sm:inline-flex`}><span className="truncate">{lead.email}</span></span> : null}
          {lead.created_by_name ? <span className={META_CHIP}><span className="font-semibold text-slate-400">By</span><MiniAvatar name={lead.created_by_name} bg="bg-slate-400" /><span className="truncate font-semibold text-slate-600">{lead.created_by_name}</span></span> : null}
          {lead.follow_up_date ? <span className={META_CHIP}><span className="font-semibold text-slate-400">Follow-up</span><span className="font-semibold text-amber-600">{formatLeadDate(lead.follow_up_date, true)}</span></span> : null}
          <span className={META_CHIP}><span className="font-semibold text-slate-400">Est.</span><strong className="text-slate-700">{formatLeadMoney(lead.estimated_value)}</strong></span>
          <span className={META_CHIP}><span className="font-semibold text-slate-400">Adv.</span><strong className="text-emerald-600">{formatLeadMoney(lead.advance_received)}</strong></span>
          <span className={`${META_CHIP} hidden sm:inline-flex`}>{titleizeLeadValue(lead.lead_source || "website")}</span>
          <span className={`${META_CHIP} hidden md:inline-flex`}>Created {formatLeadDate(lead.created_at, false)}</span>
        </div>

        {selected ? (
          <LeadExpandedDetails
            archiveLead={archiveLead} assigning={assigning} canManage={canManage}
            canTransfer={canTransferRow} company={company}
            collaboratorUsersMessage={collaboratorUsersMessage} deleting={deleting}
            isPlatformConsole={isPlatformConsole} lead={expandedLead} legalTeam={legalTeam}
            legalTransferNote={legalTransferNote} legalTransferOwner={legalTransferOwner}
            legalUsersMessage={legalUsersMessage} loading={detailLoading}
            onInlineNoteSaved={onInlineNoteSaved} onOwnerChange={onOwnerChange}
            onOwnerNoteChange={onOwnerNoteChange} owner={owner} ownerNote={ownerNote}
            ownerUsersMessage={ownerUsersMessage} pendingCollaborator={pendingCollaborator}
            removeCollaborator={removeCollaborator} removingCollaboratorId={removingCollaboratorId}
            saveCollaborator={saveCollaborator} saveOwner={saveOwner}
            savingCollaborators={savingCollaborators} scopedLegalUsers={scopedLegalUsers}
            sessionToken={sessionToken} setPendingCollaborator={setPendingCollaborator}
            setLegalTransferNote={setLegalTransferNote} setLegalTransferOwner={setLegalTransferOwner}
            teamUsers={teamUsers} transferLeadToLegal={transferLeadToLegal} transferring={transferring}
          />
        ) : null}
      </div>
    </article>
  );
}
