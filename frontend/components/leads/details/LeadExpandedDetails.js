"use client";

import LeadInlineFollowUpPanel from "./LeadInlineFollowUpPanel";
import LeadCollaboratorPanel from "./LeadCollaboratorPanel";
import LeadOwnerControls from "./LeadOwnerControls";
import LeadTransferPanel from "./LeadTransferPanel";

export default function LeadExpandedDetails({
  archiveLead, assigning, canManage, canTransfer, company, collaboratorUsersMessage,
  deleting, isPlatformConsole, lead, legalTeam, legalTransferNote, legalTransferOwner,
  legalUsersMessage, loading, onInlineNoteSaved, onOwnerChange, onOwnerNoteChange,
  pendingCollaborator, owner, ownerNote, ownerUsersMessage, removeCollaborator,
  removingCollaboratorId, saveCollaborator, saveOwner, savingCollaborators,
  scopedLegalUsers, sessionToken, setPendingCollaborator, setLegalTransferNote,
  setLegalTransferOwner, teamUsers, transferLeadToLegal, transferring,
}) {
  return (
    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Lead Access</p>
        </div>
        {loading ? (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-400 animate-pulse">
            Refreshing…
          </span>
        ) : null}
      </div>

      {/* Panels in a clean grid */}
      <div className="grid gap-3 xl:grid-cols-2">
        {/* Follow-up note */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <LeadInlineFollowUpPanel
            lead={lead}
            onLeadUpdate={onInlineNoteSaved}
            sessionToken={sessionToken}
          />
        </div>

        {/* Owner controls */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <LeadOwnerControls
            archiveLead={archiveLead}
            assigning={assigning}
            canManage={canManage}
            company={company}
            deleting={deleting}
            isPlatformConsole={isPlatformConsole}
            lead={lead}
            onOwnerChange={onOwnerChange}
            onOwnerNoteChange={onOwnerNoteChange}
            owner={owner}
            ownerNote={ownerNote}
            ownerUsersMessage={ownerUsersMessage}
            saveOwner={saveOwner}
            teamUsers={teamUsers}
          />
        </div>
      </div>

      {/* Collaborators */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
        <LeadCollaboratorPanel
          addCollaborator={saveCollaborator}
          canManage={canManage}
          collaboratorUsersMessage={collaboratorUsersMessage}
          lead={lead}
          pendingCollaborator={pendingCollaborator}
          removeCollaborator={removeCollaborator}
          removingCollaboratorId={removingCollaboratorId}
          savingCollaborators={savingCollaborators}
          setPendingCollaborator={setPendingCollaborator}
          teamUsers={teamUsers}
        />
      </div>

      {/* Legal transfer — only when eligible */}
      {canTransfer ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <LeadTransferPanel
            canTransfer={canTransfer}
            legalTeam={legalTeam}
            legalTransferNote={legalTransferNote}
            legalTransferOwner={legalTransferOwner}
            legalUsersMessage={legalUsersMessage}
            scopedLegalUsers={scopedLegalUsers}
            setLegalTransferNote={setLegalTransferNote}
            setLegalTransferOwner={setLegalTransferOwner}
            transferLeadToLegal={transferLeadToLegal}
            transferring={transferring}
          />
        </div>
      ) : null}
    </div>
  );
}
