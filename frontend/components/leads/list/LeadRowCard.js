"use client";

import Link from "next/link";
import LeadExpandedDetails from "../details/LeadExpandedDetails";
import LeadQuickStatusControl from "../LeadQuickStatusControl";
import { PRIORITY_TONE, STATUS_TONE } from "../shared/leadPageConstants";
import {
  formatLeadDate, formatLeadMoney,
  leadInitials, leadPrimaryName, leadSecondaryName, titleizeLeadValue,
} from "../shared/leadPageFormatters";

const AVATAR_PALETTE = ["bg-emerald-600","bg-amber-600","bg-sky-600","bg-violet-600","bg-orange-600","bg-cyan-600","bg-rose-600","bg-blue-600"];
function avatarBg(n="") { return AVATAR_PALETTE[(n.charCodeAt(0)||0)%AVATAR_PALETTE.length]; }
function validHex(v) { return /^#[0-9a-f]{6}$/i.test(String(v||"").trim()) ? String(v).toLowerCase() : null; }
function nameInitials(n="") { return String(n).split(" ").filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()||"").join("")||"?"; }

const BTN = "inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800";

function MiniAvatar({ name, bg = "bg-slate-300" }) {
  return (
    <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${bg} text-[9px] font-bold text-white`}>
      {nameInitials(name)}
    </span>
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
  const primaryName  = leadPrimaryName(lead);
  const secondaryName = leadSecondaryName(lead);
  const noteCount    = Number(lead.note_count || 0);
  const statusTone   = STATUS_TONE[lead.status] || STATUS_TONE.new;
  const priorityTone = PRIORITY_TONE[lead.priority] || PRIORITY_TONE.medium;
  const expandedLead = selected && activeLead?.lead_id === lead.lead_id ? activeLead : lead;
  const productHex   = validHex(lead.product_color);
  const avBg         = productHex ? null : avatarBg(primaryName);

  return (
    <article className={`group relative overflow-hidden rounded-2xl border bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.07)] ${
      selected ? "border-amber-300 shadow-[0_4px_20px_rgba(203,169,82,0.15)]" : "border-slate-100 shadow-sm"
    }`}>
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-500 group-hover:translate-x-full" />

      <div className="relative px-4 py-3.5 space-y-2.5">

        {/* ── Main row: checkbox + avatar + info + [status + buttons] on right ── */}
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          {canManage ? (
            <label className="shrink-0 pt-1">
              <input type="checkbox" checked={picked} onChange={onPickToggle}
                className="h-4 w-4 rounded border-slate-300 accent-amber-500" />
            </label>
          ) : null}

          {/* Avatar */}
          <button type="button" onClick={onSelectToggle} className="shrink-0 mt-0.5">
            <div
              className={`grid h-10 w-10 place-items-center rounded-xl text-sm font-bold text-white ${avBg || ""}`}
              style={productHex ? { backgroundColor: productHex } : undefined}
            >
              {leadInitials(lead.contact_person, lead.company_name, lead.email)}
            </div>
          </button>

          {/* Name + badges — flex-1 */}
          <button type="button" onClick={onSelectToggle} className="min-w-0 flex-1 text-left">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: statusTone[0], color: statusTone[1] }}>
                {titleizeLeadValue(lead.status || "new")}
              </span>
              <span className="inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: priorityTone[0], color: priorityTone[1] }}>
                {titleizeLeadValue(lead.priority || "medium")}
              </span>
              {lead.product_name ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  {productHex ? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: productHex }} /> : null}
                  {lead.product_name}
                </span>
              ) : null}
              {teamBadgeLabel(lead) ? (
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  {teamBadgeLabel(lead)}
                </span>
              ) : null}
              {noteCount ? (
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  {noteCount} notes
                </span>
              ) : null}
            </div>
            {/* Primary name */}
            <h4 className="mt-1 truncate text-sm font-bold text-slate-900">{primaryName}</h4>
            {secondaryName ? <p className="truncate text-xs text-slate-500">{secondaryName}</p> : null}
          </button>

          {/* Right side — status dropdown + action buttons stacked */}
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {/* Status — top right with label */}
            {canEdit ? (
              <div className="w-[170px]">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Lead Status</p>
                <LeadQuickStatusControl
                  assigneeOptions={teamUsers} lead={lead} token={sessionToken}
                  onUpdated={handleInlineStatusUpdate} hideLabel
                  selectClassName="min-h-[28px] w-full bg-slate-50 border border-slate-200 rounded-xl pr-8 text-[11px] font-semibold text-slate-700 shadow-none focus:border-amber-400"
                  notePanelClassName="xl:w-[320px]" placeholder="Why is this lead moving?"
                />
              </div>
            ) : null}
            {/* Action buttons below status */}
            <div className="flex items-center gap-1.5">
              <Link prefetch={false} href={`/leads/${lead.lead_id}`} className={BTN}>View Lead</Link>
              {canEdit ? <Link prefetch={false} href={`/leads/${lead.lead_id}/edit`} className={BTN}>Edit</Link> : null}
              <Link prefetch={false} href={`/leads/${lead.lead_id}#follow-up-notes`} className={BTN}>Notes</Link>
            </div>
          </div>
        </div>

        {/* ── Meta row — labeled, clear, scannable ── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-[52px] text-xs">

          {/* Contact */}
          {lead.contact_person ? (
            <span className="text-slate-500">{lead.contact_person}</span>
          ) : null}
          {lead.email ? (
            <span className="hidden sm:inline truncate max-w-[180px] text-slate-400">{lead.email}</span>
          ) : null}

          {/* Assigned to — with mini avatar */}
          <span className="flex items-center gap-1.5">
            <span className="text-slate-300">·</span>
            <span className="text-slate-400">Assigned</span>
            <MiniAvatar name={lead.assigned_to_name || "?"} bg="bg-emerald-500" />
            <span className="font-semibold text-slate-700">{lead.assigned_to_name || "Unassigned"}</span>
          </span>

          {/* Created by */}
          {lead.created_by_name ? (
            <span className="flex items-center gap-1.5">
              <span className="text-slate-300">·</span>
              <span className="text-slate-400">By</span>
              <MiniAvatar name={lead.created_by_name} bg="bg-slate-400" />
              <span className="font-semibold text-slate-600">{lead.created_by_name}</span>
            </span>
          ) : null}

          {/* Follow-up */}
          {lead.follow_up_date ? (
            <span className="flex items-center gap-1">
              <span className="text-slate-300">·</span>
              <span className="text-slate-400">Follow-up</span>
              <span className="font-semibold text-amber-600">{formatLeadDate(lead.follow_up_date, true)}</span>
            </span>
          ) : null}

          {/* Source */}
          <span className="hidden sm:flex items-center gap-1">
            <span className="text-slate-300">·</span>
            <span className="text-slate-400">{titleizeLeadValue(lead.lead_source || "website")}</span>
          </span>

          {/* Value */}
          <span className="flex items-center gap-1">
            <span className="text-slate-300">·</span>
            <strong className="text-slate-700">{formatLeadMoney(lead.estimated_value)}</strong>
          </span>

          {/* Created date */}
          <span className="hidden md:flex items-center gap-1">
            <span className="text-slate-300">·</span>
            <span className="text-slate-400">Created {formatLeadDate(lead.created_at, false)}</span>
          </span>
        </div>

        {/* ── Expanded panel ── */}
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
