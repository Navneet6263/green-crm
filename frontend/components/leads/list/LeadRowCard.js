"use client";

import Link from "next/link";

import DashboardIcon from "../../dashboard/icons";
import LeadExpandedDetails from "../details/LeadExpandedDetails";
import LeadQuickStatusControl from "../LeadQuickStatusControl";
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

const ACTION_ICON_CLASS =
  "grid h-10 w-10 place-items-center rounded-2xl border border-[#eadfcd] bg-white text-[#7a6b57] transition hover:-translate-y-0.5 hover:border-[#d7b258] hover:text-[#8d6e27] focus:outline-none focus:ring-2 focus:ring-[#f3dfab]";

function RowIconLink({ href, icon, label }) {
  return (
    <Link
      prefetch={false}
      href={href}
      aria-label={label}
      title={label}
      className={ACTION_ICON_CLASS}
    >
      <DashboardIcon name={icon} className="h-4 w-4" />
    </Link>
  );
}

function RowIconButton({ disabled = false, icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`${ACTION_ICON_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <DashboardIcon name={icon} className="h-4 w-4" />
    </button>
  );
}

export default function LeadRowCard({
  activeLead,
  archiveLead,
  assigning,
  canTransferRow,
  canEdit,
  canManage,
  collaboratorUsersMessage,
  company,
  deleting,
  detailLoading,
  handleInlineStatusUpdate,
  isPlatformConsole,
  legalTeam,
  legalTransferNote,
  legalTransferOwner,
  legalUsersMessage,
  lead,
  onInlineNoteSaved,
  onOwnerChange,
  onOwnerNoteChange,
  onPickToggle,
  onSelectToggle,
  owner,
  ownerNote,
  ownerUsersMessage,
  pendingCollaborator,
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
  const primaryName = leadPrimaryName(lead);
  const secondaryName = leadSecondaryName(lead);
  const noteCount = Number(lead.note_count || 0);
  const locationLabel = formatLeadLocation(lead);
  const statusTone = STATUS_TONE[lead.status] || STATUS_TONE.new;
  const priorityTone = PRIORITY_TONE[lead.priority] || PRIORITY_TONE.medium;
  const phoneHref = lead.phone ? `tel:${String(lead.phone).replace(/[^\d+]/g, "")}` : "";
  const expandedLead = selected && activeLead?.lead_id === lead.lead_id ? activeLead : lead;

  return (
    <article className={`group rounded-[28px] border bg-white/88 p-4 shadow-[0_10px_24px_rgba(79,58,22,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(79,58,22,0.08)] ${selected ? "border-[#d7b258] shadow-[0_18px_36px_rgba(203,169,82,0.12)]" : "border-[#eadfcd]"}`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex flex-1 gap-3">
          {canManage ? (
            <label className="pt-1">
              <input
                type="checkbox"
                checked={picked}
                onChange={onPickToggle}
                className="h-4 w-4 rounded border-[#d9ccb8] text-[#cba952] focus:ring-[#f3dfab]"
              />
            </label>
          ) : null}

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <button
                type="button"
                onClick={onSelectToggle}
                className="flex min-w-0 flex-1 items-start gap-4 text-left"
              >
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-[#10111d] text-lg font-bold text-white shadow-[0_18px_30px_rgba(6,7,16,0.14)]">
                  {leadInitials(lead.contact_person, lead.company_name, lead.email)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    {lead.product_name ? (
                      <span className="inline-flex rounded-full bg-[#fff4d8] px-3 py-1 text-[11px] font-bold text-[#8d6e27]">
                        {lead.product_name}
                      </span>
                    ) : null}
                    {teamBadgeLabel(lead) ? (
                      <span className="inline-flex rounded-full bg-[#f8f4eb] px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                        {teamBadgeLabel(lead)}
                      </span>
                    ) : null}
                    {noteCount ? (
                      <span className="inline-flex rounded-full bg-[#f8f4eb] px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                        {noteCount} notes
                      </span>
                    ) : null}
                  </div>
                  <h4 className="mt-3 truncate text-lg font-semibold text-[#060710]">{primaryName}</h4>
                  {secondaryName ? <p className="mt-1 text-sm text-[#746853]">{secondaryName}</p> : null}
                </div>
              </button>

                <div className="flex items-center gap-2">
                <RowIconLink href={`/leads/${lead.lead_id}`} icon="eye" label="View lead" />
                {canEdit ? <RowIconLink href={`/leads/${lead.lead_id}/edit`} icon="edit" label="Edit lead" /> : null}
                {phoneHref ? (
                  <a
                    href={phoneHref}
                    aria-label="Call lead"
                    title="Call lead"
                    className={ACTION_ICON_CLASS}
                  >
                    <DashboardIcon name="phone" className="h-4 w-4" />
                  </a>
                ) : (
                  <RowIconButton disabled icon="phone" label="Call not available" />
                )}
                <RowIconLink href={`/leads/${lead.lead_id}#follow-up-notes`} icon="message" label="Follow-up Notes" />
              </div>
            </div>

            <div className="pl-[72px]">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#7a6b57]">
                <span>{lead.contact_person || "No contact name"}</span>
                <span>{lead.email || "No email"}</span>
                <span>{lead.phone || "No phone"}</span>
                {locationLabel ? <span>{locationLabel}</span> : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#8f816a]">
                <span>Source: {titleizeLeadValue(lead.lead_source || "website")}</span>
                <span>Value: {formatLeadMoney(lead.estimated_value)}</span>
                <span>Created: {formatLeadDate(lead.created_at, true)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:min-w-[250px] xl:max-w-[270px]">
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <span
              className="inline-flex rounded-full px-3 py-1 text-[11px] font-bold"
              style={{ background: statusTone[0], color: statusTone[1] }}
            >
              {titleizeLeadValue(lead.status || "new")}
            </span>
            <span
              className="inline-flex rounded-full px-3 py-1 text-[11px] font-bold"
              style={{ background: priorityTone[0], color: priorityTone[1] }}
            >
              {titleizeLeadValue(lead.priority || "medium")}
            </span>
          </div>

          <div className="grid gap-2 rounded-[22px] bg-[#fffaf1] p-3">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[#7a6b57]">
              <span>Owner</span>
              <span className="truncate text-right text-[#060710]">{lead.assigned_to_name || "Unassigned"}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[#7a6b57]">
              <span>Last follow-up</span>
              <span className="text-right text-[#060710]">{formatLeadDate(lead.follow_up_date, true)}</span>
            </div>
            <button
              type="button"
              onClick={onSelectToggle}
              className="flex items-center justify-between gap-3 rounded-[16px] border border-[#eadfcd] bg-white px-3 py-2 text-left text-xs font-semibold text-[#7a6b57] transition hover:border-[#d7b258] hover:text-[#060710]"
            >
              <span>{selected ? "Hide access panel" : "Manage access"}</span>
              <DashboardIcon name={selected ? "eye" : "users"} className="h-4 w-4" />
            </button>
          </div>

          {canEdit ? (
            <LeadQuickStatusControl
              assigneeOptions={teamUsers}
              lead={lead}
              token={sessionToken}
              onUpdated={handleInlineStatusUpdate}
              hideLabel
              selectClassName="min-h-[38px] w-full bg-white pr-8 text-[11px] shadow-none"
              notePanelClassName="xl:w-[300px]"
              placeholder="Why is this lead moving to the new status?"
            />
          ) : null}
        </div>
      </div>

      {selected ? (
        <LeadExpandedDetails
          archiveLead={archiveLead}
          assigning={assigning}
          canManage={canManage}
          canTransfer={canTransferRow}
          company={company}
          collaboratorUsersMessage={collaboratorUsersMessage}
          deleting={deleting}
          isPlatformConsole={isPlatformConsole}
          lead={expandedLead}
          legalTeam={legalTeam}
          legalTransferNote={legalTransferNote}
          legalTransferOwner={legalTransferOwner}
          legalUsersMessage={legalUsersMessage}
          loading={detailLoading}
          onInlineNoteSaved={onInlineNoteSaved}
          onOwnerChange={onOwnerChange}
          onOwnerNoteChange={onOwnerNoteChange}
          owner={owner}
          ownerNote={ownerNote}
          ownerUsersMessage={ownerUsersMessage}
          pendingCollaborator={pendingCollaborator}
          removeCollaborator={removeCollaborator}
          removingCollaboratorId={removingCollaboratorId}
          saveCollaborator={saveCollaborator}
          saveOwner={saveOwner}
          savingCollaborators={savingCollaborators}
          scopedLegalUsers={scopedLegalUsers}
          sessionToken={sessionToken}
          setPendingCollaborator={setPendingCollaborator}
          setLegalTransferNote={setLegalTransferNote}
          setLegalTransferOwner={setLegalTransferOwner}
          teamUsers={teamUsers}
          transferLeadToLegal={transferLeadToLegal}
          transferring={transferring}
        />
      ) : null}
    </article>
  );
}
