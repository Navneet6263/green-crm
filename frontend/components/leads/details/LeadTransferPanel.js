"use client";

import { formatWorkflowOwnerIdentity } from "../../../lib/workflowOwners";
import {
  LEAD_INPUT_CLASS,
  LEAD_KICKER_CLASS,
  LEAD_PRIMARY_BUTTON_CLASS,
} from "../shared/leadPageConstants";

export default function LeadTransferPanel({
  canTransfer,
  legalTeam,
  legalTransferNote,
  legalTransferOwner,
  legalUsersMessage,
  scopedLegalUsers,
  setLegalTransferNote,
  setLegalTransferOwner,
  transferLeadToLegal,
  transferring,
}) {
  if (!canTransfer) {
    return null;
  }

  return (
    <div className="rounded-[24px] border border-[#dce8cf] bg-[#f5fbf0] p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className={LEAD_KICKER_CLASS}>Closed Won</p>
          <h4 className="mt-2 text-lg font-semibold text-[#060710]">Transfer this lead to legal</h4>
        </div>
        <div className="grid gap-3 xl:min-w-[420px] xl:grid-cols-[0.9fr_1.1fr_auto]">
          <label className="space-y-2">
            <span className={LEAD_KICKER_CLASS}>Legal Owner</span>
            <select className={LEAD_INPUT_CLASS} value={legalTransferOwner} onChange={(event) => setLegalTransferOwner(event.target.value)}>
              <option value="">Assign later</option>
              {legalTeam.map((item) => (
                <option key={item.user_id} value={item.user_id}>
                  {formatWorkflowOwnerIdentity(item.name, item.user_id, "Legal user")}
                </option>
              ))}
            </select>
            {!scopedLegalUsers.length ? <p className="text-xs font-medium text-[#8d6e27]">{legalUsersMessage}</p> : null}
          </label>
          <label className="space-y-2">
            <span className={LEAD_KICKER_CLASS}>Transfer Note *</span>
            <textarea
              rows="3"
              value={legalTransferNote}
              onChange={(event) => setLegalTransferNote(event.target.value)}
              placeholder="What should legal check next for this won lead?"
              className={`${LEAD_INPUT_CLASS} min-h-[120px] resize-y`}
            />
          </label>
          <div className="flex items-end">
            <button className={LEAD_PRIMARY_BUTTON_CLASS} type="button" disabled={transferring || !legalTransferNote.trim()} onClick={transferLeadToLegal}>
              {transferring ? "Transferring..." : "Transfer to Legal"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
