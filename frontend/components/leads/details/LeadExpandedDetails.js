"use client";

import Link from "next/link";

import LeadMetaGrid from "./LeadMetaGrid";
import LeadOwnerControls from "./LeadOwnerControls";
import LeadTransferPanel from "./LeadTransferPanel";
import { LEAD_GHOST_BUTTON_CLASS } from "../shared/leadPageConstants";

export default function LeadExpandedDetails({
  archiveLead,
  assigning,
  canEdit,
  canManage,
  canTransfer,
  company,
  deleting,
  isPlatformConsole,
  lead,
  legalTeam,
  legalTransferNote,
  legalTransferOwner,
  legalUsersMessage,
  onOwnerChange,
  onOwnerNoteChange,
  owner,
  ownerNote,
  ownerUsersMessage,
  saveOwner,
  scopedLegalUsers,
  setLegalTransferNote,
  setLegalTransferOwner,
  teamBadgeLabel,
  teamUsers,
  transferLeadToLegal,
  transferring,
}) {
  return (
    <div className="mt-5 space-y-4 border-t border-[#efe6d8] pt-5">
      <LeadMetaGrid lead={lead} teamBadgeLabel={teamBadgeLabel} />

      {lead.latest_note ? (
        <div className="rounded-[22px] border border-[#efe2c8] bg-[#fffaf1] px-4 py-4 text-sm text-[#6f614c]">
          <strong className="font-semibold text-[#060710]">Latest note:</strong> {lead.latest_note}
        </div>
      ) : null}

      {lead.requirements ? (
        <div className="rounded-[22px] border border-[#efe2c8] bg-[#fffaf1] px-4 py-4 text-sm text-[#6f614c]">
          <strong className="font-semibold text-[#060710]">Requirements:</strong> {lead.requirements}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link prefetch={false} href={`/leads/${lead.lead_id}`} className={LEAD_GHOST_BUTTON_CLASS}>
          View Lead
        </Link>
        {canEdit ? <Link prefetch={false} href={`/leads/${lead.lead_id}/edit`} className={LEAD_GHOST_BUTTON_CLASS}>Edit Lead</Link> : null}
      </div>

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
