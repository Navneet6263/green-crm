"use client";

import {
  LEAD_GHOST_BUTTON_CLASS,
  LEAD_INPUT_CLASS,
  LEAD_KICKER_CLASS,
  LEAD_PANEL_CLASS,
  LEAD_PRIMARY_BUTTON_CLASS,
} from "../shared/leadPageConstants";

export default function LeadBulkAssignCard({
  bulkAssign,
  bulkAssigning,
  bulkNote,
  bulkOwner,
  bulkUsers,
  bulkUsersMessage,
  clearBulkSelection,
  company,
  isPlatformConsole,
  pickedCount,
  pickedTeamIds,
  setBulkNote,
  setBulkOwner,
}) {
  if (!pickedCount) {
    return null;
  }

  return (
    <article className={`${LEAD_PANEL_CLASS} bg-[#fffaf1] p-5 md:p-6`}>
      <div className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr] xl:items-start">
        <div className="space-y-3">
          <p className={LEAD_KICKER_CLASS}>Bulk Assign</p>
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-[#060710]">{pickedCount} selected leads ready</h3>
            <p className="mt-2 text-sm leading-7 text-[#746853]">Choose the new owner and log one note for this reassignment so the history stays clean.</p>
          </div>
        </div>

        <div className="grid gap-4">
          {isPlatformConsole && company === "all" ? (
            <p className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#7a6b57]">Select a company before bulk assignment.</p>
          ) : pickedTeamIds.length > 1 ? (
            <p className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{bulkUsersMessage}</p>
          ) : bulkUsers.length ? (
            <>
              <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
                <label className="space-y-2">
                  <span className={LEAD_KICKER_CLASS}>New Owner</span>
                  <select className={LEAD_INPUT_CLASS} value={bulkOwner} onChange={(event) => setBulkOwner(event.target.value)}>
                    <option value="">Assign selected leads to...</option>
                    {bulkUsers.map((item) => <option key={item.user_id} value={item.user_id}>{item.name} | {item.role}</option>)}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className={LEAD_KICKER_CLASS}>Assignment Note *</span>
                  <textarea
                    rows="3"
                    value={bulkNote}
                    onChange={(event) => setBulkNote(event.target.value)}
                    placeholder="Why are these selected leads being reassigned?"
                    className={`${LEAD_INPUT_CLASS} min-h-[120px] resize-y`}
                  />
                </label>
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <button className={LEAD_GHOST_BUTTON_CLASS} type="button" onClick={clearBulkSelection}>
                  Clear
                </button>
                <button className={LEAD_PRIMARY_BUTTON_CLASS} type="button" onClick={bulkAssign} disabled={bulkAssigning || !bulkOwner || !bulkNote.trim()}>
                  {bulkAssigning ? "Assigning..." : "Assign Selected"}
                </button>
              </div>
            </>
          ) : (
            <p className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#7a6b57]">{bulkUsersMessage}</p>
          )}
        </div>
      </div>
    </article>
  );
}
