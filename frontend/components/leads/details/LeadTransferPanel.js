"use client";

import { formatWorkflowOwnerIdentity } from "../../../lib/workflowOwners";
import ManageCard, { FIELD, FIELD_LABEL, PRIMARY_BTN } from "./ManageCard";

/** A won lead goes to the legal team next: pick who checks it and say what to check. */
export default function LeadTransferPanel({
  canTransfer, legalTeam, legalTransferNote, legalTransferOwner, legalUsersMessage, scopedLegalUsers,
  setLegalTransferNote, setLegalTransferOwner, transferLeadToLegal, transferring,
}) {
  if (!canTransfer) return null;
  return (
    <ManageCard icon="legal" tone="emerald" title="Send to legal" subtitle="This deal is won. Legal checks the agreement next, then finance."
      badge={<span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">Won</span>}>
      <div className="grid gap-3">
        <label className="block">
          <span className={FIELD_LABEL}>Legal owner</span>
          <select className={`${FIELD} h-9 py-0`} value={legalTransferOwner} onChange={(event) => setLegalTransferOwner(event.target.value)}>
            <option value="">Assign later</option>
            {legalTeam.map((item) => <option key={item.user_id} value={item.user_id}>{formatWorkflowOwnerIdentity(item.name, item.user_id, "Legal user")}</option>)}
          </select>
          {!scopedLegalUsers.length ? <span className="mt-1 block text-[11.5px] text-slate-500">{legalUsersMessage}</span> : null}
        </label>
        <label className="block">
          <span className={FIELD_LABEL}>What should legal check?</span>
          <textarea rows={2} value={legalTransferNote} onChange={(event) => setLegalTransferNote(event.target.value)}
            placeholder="For example: MOU signed by email, check the payment terms" className={`${FIELD} resize-y`} />
        </label>
        <div className="flex justify-end">
          <button type="button" className={PRIMARY_BTN} disabled={transferring || !legalTransferNote.trim()} onClick={transferLeadToLegal}>
            {transferring ? "Sending…" : "Send to legal"}
          </button>
        </div>
      </div>
    </ManageCard>
  );
}
