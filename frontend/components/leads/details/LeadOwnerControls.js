"use client";

import {
  LEAD_DANGER_BUTTON_CLASS,
  LEAD_INPUT_CLASS,
  LEAD_KICKER_CLASS,
  LEAD_PRIMARY_BUTTON_CLASS,
} from "../shared/leadPageConstants";

export default function LeadOwnerControls({
  archiveLead,
  assigning,
  canManage,
  company,
  deleting,
  isPlatformConsole,
  lead,
  onOwnerChange,
  onOwnerNoteChange,
  owner,
  ownerNote,
  ownerUsersMessage,
  saveOwner,
  teamUsers,
}) {
  if (!canManage) {
    return null;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[24px] border border-[#eadfcd] bg-white p-4">
        <p className={LEAD_KICKER_CLASS}>Assignment</p>
        <h4 className="mt-2 text-lg font-semibold text-[#060710]">Lead owner control</h4>
        {isPlatformConsole && company === "all" ? (
          <p className="mt-4 text-sm text-[#7a6b57]">Select a company before updating ownership.</p>
        ) : teamUsers.length ? (
          <div className="mt-4 grid gap-4">
            <label className="space-y-2">
              <span className={LEAD_KICKER_CLASS}>Lead Owner</span>
              <select className={LEAD_INPUT_CLASS} value={owner} onChange={(event) => onOwnerChange(event.target.value)}>
                <option value="">Select lead owner</option>
                {teamUsers.map((item) => <option key={item.user_id} value={item.user_id}>{item.name} | {item.role}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className={LEAD_KICKER_CLASS}>Change Note *</span>
              <textarea
                rows="3"
                value={ownerNote}
                onChange={(event) => onOwnerNoteChange(event.target.value)}
                placeholder="Why are you changing the owner?"
                className={`${LEAD_INPUT_CLASS} min-h-[120px] resize-y`}
              />
            </label>
            <div className="flex justify-end">
              <button className={LEAD_PRIMARY_BUTTON_CLASS} type="button" disabled={assigning || !owner || owner === lead.assigned_to || !ownerNote.trim()} onClick={saveOwner}>
                {assigning ? "Saving..." : "Update Owner"}
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#7a6b57]">{ownerUsersMessage}</p>
        )}
      </div>

      <div className="rounded-[24px] border border-rose-200 bg-white p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-rose-500">Danger Zone</p>
        <h4 className="mt-2 text-lg font-semibold text-[#060710]">Archive this lead</h4>
        <p className="mt-3 text-sm leading-7 text-[#6f614c]">This action archives the lead instead of deleting it permanently.</p>
        <div className="mt-5">
          <button className={LEAD_DANGER_BUTTON_CLASS} type="button" disabled={deleting === lead.lead_id} onClick={() => archiveLead(lead.lead_id)}>
            {deleting === lead.lead_id ? "Archiving..." : "Archive Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}
