"use client";

import LeadInlineFollowUpPanel from "./LeadInlineFollowUpPanel";
import LeadCollaboratorPanel from "./LeadCollaboratorPanel";
import LeadOwnerControls from "./LeadOwnerControls";
import LeadTransferPanel from "./LeadTransferPanel";

export default function LeadExpandedDetails({
  archiveLead,
  assigning,
  canManage,
  canTransfer,
  company,
  collaboratorUsersMessage,
  deleting,
  isPlatformConsole,
  lead,
  legalTeam,
  legalTransferNote,
  legalTransferOwner,
  legalUsersMessage,
  loading,
  onInlineNoteSaved,
  onOwnerChange,
  onOwnerNoteChange,
  pendingCollaborator,
  owner,
  ownerNote,
  ownerUsersMessage,
  removeCollaborator,
  removingCollaboratorId,
  saveCollaborator,
  saveOwner,
  savingCollaborators,
  scopedLegalUsers,
  sessionToken,
  setPendingCollaborator,
  setLegalTransferNote,
  setLegalTransferOwner,
  teamUsers,
  transferLeadToLegal,
  transferring,
}) {
  return (
    <div className="mt-5 space-y-4 border-t border-[#efe6d8] pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]">Lead Access</p>
          <h4 className="mt-2 text-lg font-semibold text-[#060710]">Assignment, access, and transfer</h4>
        </div>
        {loading ? (
          <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fffaf1] px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
            Refreshing...
          </span>
        ) : null}
      </div>

      <LeadInlineFollowUpPanel
        lead={lead}
        onLeadUpdate={onInlineNoteSaved}
        sessionToken={sessionToken}
      />

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
  );
}
