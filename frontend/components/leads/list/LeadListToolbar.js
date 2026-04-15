"use client";

import { LEAD_PANEL_CLASS } from "../shared/leadPageConstants";

export default function LeadListToolbar({
  backgroundSync,
  closedWonCount,
  ownershipLabel,
  pageRefreshing,
  setStatus,
  status,
  totalMatched,
  transferredCount,
}) {
  return (
    <article className={`${LEAD_PANEL_CLASS} p-5 md:p-6`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex rounded-full border border-[#ddd3c2] bg-[#fff6e4] px-3 py-1 text-[11px] font-bold text-[#7a6230]">
            {totalMatched} leads matched
          </span>
          <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
            {ownershipLabel}
          </span>
          {pageRefreshing ? <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">Updating page</span> : null}
          {backgroundSync ? <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">Syncing roster</span> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${status === "closed-won" ? "border-[#d7b258] bg-[#fff2cf] text-[#7a6230]" : "border-[#eadfcd] bg-white text-[#7c6d55]"}`} type="button" onClick={() => setStatus("closed-won")}>
            Closed Won {closedWonCount}
          </button>
          <button className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${status === "transferred" ? "border-[#d7b258] bg-[#fff2cf] text-[#7a6230]" : "border-[#eadfcd] bg-white text-[#7c6d55]"}`} type="button" onClick={() => setStatus("transferred")}>
            Transferred {transferredCount}
          </button>
        </div>
      </div>
    </article>
  );
}
