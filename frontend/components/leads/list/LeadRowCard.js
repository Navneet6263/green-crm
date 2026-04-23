"use client";

import { useState } from "react";

import LeadQuickStatusControl from "../LeadQuickStatusControl";
import LeadExpandedDetails from "../details/LeadExpandedDetails";
import { PRIORITY_TONE, STATUS_TONE } from "../shared/leadPageConstants";
import {
  formatLeadDate,
  formatLeadLocation,
  formatLeadMoney,
  leadInitials,
  leadPrimaryName,
  leadSecondaryName,
  titleizeLeadValue,
} from "../shared/leadPageFormatters";

export default function LeadRowCard({
  activeLead,
  archiveLead,
  assigning,
  canEdit,
  canManage,
  canTransferRow,
  company,
  collaboratorUsersMessage,
  deleting,
  detailLoading,
  handleInlineStatusUpdate,
  isPlatformConsole,
  legalTeam,
  legalTransferNote,
  legalTransferOwner,
  legalUsersMessage,
  lead,
  onOwnerChange,
  onOwnerNoteChange,
  pendingCollaborator,
  onPickToggle,
  onQuickAddNote,
  onSelectToggle,
  owner,
  ownerNote,
  ownerUsersMessage,
  picked,
  removeCollaborator,
  removingCollaboratorId,
  saveCollaborator,
  saveOwner,
  savingCollaborators,
  scopedLegalUsers,
  selected,
  sessionToken,
  setPendingCollaborator,
  setLegalTransferNote,
  setLegalTransferOwner,
  teamBadgeLabel,
  teamUsers,
  transferLeadToLegal,
  transferring,
}) {
  const statusTone = STATUS_TONE[lead.status] || STATUS_TONE.new;
  const priorityTone = PRIORITY_TONE[lead.priority] || PRIORITY_TONE.medium;
  const primaryName = leadPrimaryName(lead);
  const secondaryName = leadSecondaryName(lead);
  const noteCount = Number(lead.note_count || 0);
  const unitCount = lead.number_of_units ?? null;
  const locationLabel = formatLeadLocation(lead);
  const selectedLead = selected && activeLead?.lead_id === lead.lead_id ? activeLead : lead;
  const [quickNoteSaving, setQuickNoteSaving] = useState(false);
  const handleSelectLead = () => {
    onSelectToggle();
  };

  const handleSelectLeadKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectToggle();
    }
  };

  async function handleQuickAddNote() {
    if (!onQuickAddNote || quickNoteSaving) {
      return;
    }

    const note = window.prompt("Add a quick note for this lead.")?.trim();
    if (!note) {
      return;
    }

    setQuickNoteSaving(true);

    try {
      await onQuickAddNote(lead, note);
    } finally {
      setQuickNoteSaving(false);
    }
  }

  return (
    <article
      className={`rounded-[28px] border p-4 transition ${
        selected
          ? "border-[#d7b258] bg-[#fff8e9] shadow-[0_16px_32px_rgba(203,169,82,0.14)]"
          : "border-[#eadfcd] bg-white/88 shadow-[0_10px_24px_rgba(79,58,22,0.05)] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(79,58,22,0.08)]"
      }`}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex flex-1 gap-3">
          {canManage ? (
            <label className="pt-1">
              <input type="checkbox" checked={picked} onChange={onPickToggle} className="h-4 w-4 rounded border-[#d9ccb8] text-[#cba952] focus:ring-[#f3dfab]" />
            </label>
          ) : null}

          <div className="flex flex-1 items-start gap-4">
            <button type="button" className="grid h-14 w-14 shrink-0 cursor-pointer place-items-center rounded-[20px] bg-[#10111d] text-lg font-bold text-white shadow-[0_18px_30px_rgba(6,7,16,0.16)]" onClick={handleSelectLead}>
              {leadInitials(lead.contact_person, lead.company_name, lead.email)}
            </button>

            <div
              className="min-w-0 flex-1 cursor-pointer space-y-2"
              onClick={handleSelectLead}
              onKeyDown={handleSelectLeadKeyDown}
              role="button"
              tabIndex={0}
            >
              <div className="min-w-0 text-left">
                <div className="flex flex-wrap gap-2">
                  {lead.product_name ? <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fff6e4] px-3 py-1 text-[11px] font-bold text-[#7a6230]">{lead.product_name}</span> : null}
                  {teamBadgeLabel(lead) ? <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">{teamBadgeLabel(lead)}</span> : null}
                  {noteCount ? <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">{noteCount} {noteCount === 1 ? "note" : "notes"}</span> : null}
                </div>
                <div className="mt-2 min-w-0">
                  <h4 className="truncate text-lg font-semibold text-[#060710]">{primaryName}</h4>
                  {secondaryName ? <p className="mt-1 text-sm text-[#746853]">{secondaryName}</p> : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#7a6b57] select-text">
                <span>{lead.contact_person || "No contact name"}</span>
                <span>{lead.email || "No email"}</span>
                <span>{lead.phone || "No phone"}</span>
                {locationLabel ? <span>{locationLabel}</span> : null}
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm text-[#8f816a]">
                <span>Source: {titleizeLeadValue(lead.lead_source || "website")}</span>
                <span>Value: {formatLeadMoney(lead.estimated_value)}</span>
                {unitCount !== null ? <span>Units: {unitCount}</span> : null}
                <span>Created: {formatLeadDate(lead.created_at)}</span>
                <span>By: {lead.created_by_name || "Unknown"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 xl:min-w-[220px] xl:max-w-[240px] xl:self-start">
          <div className="flex flex-wrap gap-2 xl:justify-end">
            {!canEdit ? <span className="inline-flex rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: statusTone[0], color: statusTone[1] }}>{titleizeLeadValue(lead.status)}</span> : null}
            <span className="inline-flex rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: priorityTone[0], color: priorityTone[1] }}>
              {titleizeLeadValue(lead.priority || "medium")}
            </span>
            {canEdit ? (
              <LeadQuickStatusControl
                lead={selectedLead}
                token={sessionToken}
                onUpdated={handleInlineStatusUpdate}
                hideLabel
                className="xl:w-[220px]"
                selectClassName="min-h-[36px] w-full bg-white/95 pr-8 text-[11px] shadow-none"
                notePanelClassName="xl:w-[280px]"
                placeholder="Why is this lead moving to the new status?"
              />
            ) : null}
          </div>
          <div className="grid gap-2">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${lead.assigned_to ? "border-[#dce8cf] bg-[#eff9e9] text-[#2a7f43]" : "border-[#eadfcd] bg-white text-[#7c6d55]"}`}>
              <span>{lead.assigned_to_name || "Unassigned"}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#eadfcd] bg-white px-3 py-2 text-xs font-semibold text-[#7c6d55]">
              <span>Follow-up {formatLeadDate(lead.follow_up_date, true)}</span>
            </div>
            <button
              className="inline-flex min-h-[38px] items-center justify-center rounded-[14px] border border-[#eadfcd] bg-white px-3 py-2 text-xs font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:text-[#060710] disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              onClick={handleQuickAddNote}
              disabled={quickNoteSaving}
            >
              {quickNoteSaving ? "Saving..." : "Add Note"}
            </button>
          </div>
          {selected && detailLoading ? <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">Refreshing...</span> : null}
        </div>
      </div>

      {selected ? (
        <LeadExpandedDetails
          archiveLead={archiveLead}
          assigning={assigning}
          canEdit={canEdit}
          canManage={canManage}
          canTransfer={canTransferRow}
          company={company}
          collaboratorUsersMessage={collaboratorUsersMessage}
          deleting={deleting}
          isPlatformConsole={isPlatformConsole}
          lead={selectedLead}
          legalTeam={legalTeam}
          legalTransferNote={legalTransferNote}
          legalTransferOwner={legalTransferOwner}
          legalUsersMessage={legalUsersMessage}
          onOwnerChange={onOwnerChange}
          onOwnerNoteChange={onOwnerNoteChange}
          pendingCollaborator={pendingCollaborator}
          owner={owner}
          ownerNote={ownerNote}
          ownerUsersMessage={ownerUsersMessage}
          removeCollaborator={removeCollaborator}
          removingCollaboratorId={removingCollaboratorId}
          saveCollaborator={saveCollaborator}
          saveOwner={saveOwner}
          savingCollaborators={savingCollaborators}
          scopedLegalUsers={scopedLegalUsers}
          setPendingCollaborator={setPendingCollaborator}
          setLegalTransferNote={setLegalTransferNote}
          setLegalTransferOwner={setLegalTransferOwner}
          teamBadgeLabel={teamBadgeLabel}
          teamUsers={teamUsers}
          transferLeadToLegal={transferLeadToLegal}
          transferring={transferring}
        />
      ) : null}
    </article>
  );
}
