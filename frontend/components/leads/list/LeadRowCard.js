"use client";

import Link from "next/link";
import DashboardIcon from "../../dashboard/icons";
import LeadExpandedDetails from "../details/LeadExpandedDetails";
import LeadQuickStatusControl from "../LeadQuickStatusControl";
import { PRIORITY_TONE, STATUS_TONE } from "../shared/leadPageConstants";
import {
  formatLeadDate, formatLeadLocation, formatLeadMoney,
  leadInitials, leadPrimaryName, leadSecondaryName, titleizeLeadValue,
} from "../shared/leadPageFormatters";

// Avatar bg by first letter — gives each lead a unique but calm color
const AVATAR_PALETTE = [
  "bg-emerald-600","bg-amber-600","bg-sky-600","bg-violet-600",
  "bg-orange-600","bg-cyan-600","bg-rose-600","bg-blue-600",
];
function avatarBg(name = "") {
  const code = (name.charCodeAt(0) || 0) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[code];
}
function validHex(v) {
  return /^#[0-9a-f]{6}$/i.test(String(v || "").trim()) ? String(v).toLowerCase() : null;
}

const ACT = "grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-100";

function ActionLink({ href, icon, label }) {
  return (
    <Link prefetch={false} href={href} aria-label={label} title={label} className={ACT}>
      <DashboardIcon name={icon} className="h-4 w-4" />
    </Link>
  );
}
function ActionBtn({ icon, label, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={`${ACT} disabled:opacity-40 disabled:cursor-not-allowed`}>
      <DashboardIcon name={icon} className="h-4 w-4" />
    </button>
  );
}

export default function LeadRowCard({
  activeLead, archiveLead, assigning, canTransferRow, canEdit, canManage,
  collaboratorUsersMessage, company, deleting, detailLoading,
  handleInlineStatusUpdate, isPlatformConsole, legalTeam, legalTransferNote,
  legalTransferOwner, legalUsersMessage, lead, onInlineNoteSaved, onOwnerChange,
  onOwnerNoteChange, onPickToggle, onSelectToggle, owner, ownerNote,
  ownerUsersMessage, pendingCollaborator, picked, removeCollaborator,
  removingCollaboratorId, saveCollaborator, saveOwner, savingCollaborators,
  scopedLegalUsers, selected, sessionToken, setPendingCollaborator,
  setLegalTransferNote, setLegalTransferOwner, teamBadgeLabel, teamUsers,
  transferLeadToLegal, transferring,
}) {
  const primaryName   = leadPrimaryName(lead);
  const secondaryName = leadSecondaryName(lead);
  const noteCount     = Number(lead.note_count || 0);
  const locationLabel = formatLeadLocation(lead);
  const statusTone    = STATUS_TONE[lead.status] || STATUS_TONE.new;
  const priorityTone  = PRIORITY_TONE[lead.priority] || PRIORITY_TONE.medium;
  const phoneHref     = lead.phone ? `tel:${String(lead.phone).replace(/[^\d+]/g, "")}` : "";
  const expandedLead  = selected && activeLead?.lead_id === lead.lead_id ? activeLead : lead;
  const productHex    = validHex(lead.product_color);
  const avBg          = productHex ? null : avatarBg(primaryName);

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] ${
        selected
          ? "border-amber-300 shadow-[0_4px_20px_rgba(203,169,82,0.15)]"
          : "border-slate-100 shadow-sm"
      }`}
    >
      {/* shimmer sweep on hover */}
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-500 group-hover:translate-x-full" />

      <div className="relative px-4 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">

          {/* LEFT — identity */}
          <div className="flex flex-1 gap-3">
            {canManage ? (
              <label className="pt-1.5">
                <input
                  type="checkbox" checked={picked} onChange={onPickToggle}
                  className="h-4 w-4 rounded border-slate-300 accent-amber-500"
                />
              </label>
            ) : null}

            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button type="button" onClick={onSelectToggle} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                  {/* Avatar — uses product color if available */}
                  <div
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-bold text-white ${avBg || ""}`}
                    style={productHex ? { backgroundColor: productHex } : undefined}
                  >
                    {leadInitials(lead.contact_person, lead.company_name, lead.email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {lead.product_name ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                          {productHex ? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: productHex }} /> : null}
                          {lead.product_name}
                        </span>
                      ) : null}
                      {teamBadgeLabel(lead) ? (
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                          {teamBadgeLabel(lead)}
                        </span>
                      ) : null}
                      {noteCount ? (
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                          {noteCount} notes
                        </span>
                      ) : null}
                    </div>
                    <h4 className="mt-1.5 truncate text-base font-bold text-slate-900">{primaryName}</h4>
                    {secondaryName ? <p className="mt-0.5 truncate text-sm text-slate-500">{secondaryName}</p> : null}
                  </div>
                </button>

                {/* Action icons */}
                <div className="flex items-center gap-1.5">
                  <ActionLink href={`/leads/${lead.lead_id}`} icon="eye" label="View lead" />
                  {canEdit ? <ActionLink href={`/leads/${lead.lead_id}/edit`} icon="edit" label="Edit lead" /> : null}
                  {phoneHref
                    ? <a href={phoneHref} aria-label="Call" title="Call" className={ACT}><DashboardIcon name="phone" className="h-4 w-4" /></a>
                    : <ActionBtn disabled icon="phone" label="No phone" />
                  }
                  <ActionLink href={`/leads/${lead.lead_id}#follow-up-notes`} icon="message" label="Notes" />
                </div>
              </div>

              {/* Contact row */}
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 pl-14 text-xs text-slate-400">
                {lead.contact_person ? <span>{lead.contact_person}</span> : null}
                {lead.email ? <span>{lead.email}</span> : null}
                {lead.phone ? <span>{lead.phone}</span> : null}
                {locationLabel ? <span>{locationLabel}</span> : null}
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap gap-x-5 gap-y-0.5 pl-14 text-xs text-slate-400">
                <span>Source: <strong className="text-slate-600">{titleizeLeadValue(lead.lead_source || "website")}</strong></span>
                <span>Value: <strong className="text-slate-600">{formatLeadMoney(lead.estimated_value)}</strong></span>
                <span>Created: <strong className="text-slate-600">{formatLeadDate(lead.created_at, true)}</strong></span>
              </div>
            </div>
          </div>

          {/* RIGHT — status + owner panel */}
          <div className="flex flex-col gap-2.5 xl:min-w-[240px] xl:max-w-[260px]">
            {/* Status + priority pills */}
            <div className="flex flex-wrap gap-1.5 xl:justify-end">
              <span
                className="inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                style={{ background: statusTone[0], color: statusTone[1] }}
              >
                {titleizeLeadValue(lead.status || "new")}
              </span>
              <span
                className="inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                style={{ background: priorityTone[0], color: priorityTone[1] }}
              >
                {titleizeLeadValue(lead.priority || "medium")}
              </span>
            </div>

            {/* Owner + follow-up mini card */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-400">Owner</span>
                <span className="truncate font-semibold text-slate-700">{lead.assigned_to_name || "Unassigned"}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-400">Follow-up</span>
                <span className="font-semibold text-slate-700">{formatLeadDate(lead.follow_up_date, true)}</span>
              </div>
              <button
                type="button" onClick={onSelectToggle}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-amber-300 hover:text-amber-800"
              >
                <span>{selected ? "Hide panel" : "Manage access"}</span>
                <DashboardIcon name={selected ? "eye" : "users"} className="h-3.5 w-3.5" />
              </button>
            </div>

            {canEdit ? (
              <LeadQuickStatusControl
                assigneeOptions={teamUsers}
                lead={lead}
                token={sessionToken}
                onUpdated={handleInlineStatusUpdate}
                hideLabel
                selectClassName="min-h-[36px] w-full bg-white pr-8 text-[11px] shadow-none"
                notePanelClassName="xl:w-[280px]"
                placeholder="Why is this lead moving?"
              />
            ) : null}
          </div>
        </div>

        {/* Expanded panel */}
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
