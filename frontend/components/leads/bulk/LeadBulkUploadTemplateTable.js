"use client";

import {
  LEAD_GHOST_BUTTON_CLASS,
  LEAD_KICKER_CLASS,
} from "../shared/leadPageConstants";

export default function LeadBulkUploadTemplateTable({
  blankBulkSheet,
  bulkImportMaxRows,
  bulkImportFields,
  loadBulkTemplate,
  sampleBulkSheet,
}) {
  return (
    <div className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4 shadow-[0_10px_24px_rgba(79,58,22,0.04)]">
      <div className="space-y-2">
        <p className={LEAD_KICKER_CLASS}>Sheet Template</p>
        <h3 className="text-lg font-semibold tracking-tight text-[#060710]">Simple Add Lead sheet</h3>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button className={LEAD_GHOST_BUTTON_CLASS} type="button" onClick={() => loadBulkTemplate(blankBulkSheet, "Blank sheet template")}>
          Use Blank Sheet
        </button>
        <button className={LEAD_GHOST_BUTTON_CLASS} type="button" onClick={() => loadBulkTemplate(sampleBulkSheet, "Sample sheet template")}>
          Use Sample Sheet
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-[22px] border border-[#eadfcd] bg-white">
        <div className="max-h-[360px] overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-[#fbf6ec] text-[10px] font-bold uppercase tracking-[0.22em] text-[#8f816a]">
              <tr>
                <th className="px-4 py-3">Column</th>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Required</th>
                <th className="px-4 py-3">Example</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0e8da]">
              {bulkImportFields.map((item) => (
                <tr key={item.key} className="align-top">
                  <td className="px-4 py-3 text-[#060710]"><code>{item.key}</code></td>
                  <td className="px-4 py-3 font-medium text-[#060710]">{item.label}</td>
                  <td className="px-4 py-3 text-[#7a6b57]">{item.required}</td>
                  <td className="px-4 py-3 text-[#7a6b57]">{item.example || "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-[#8f816a]">Keep the exact order shown in this table. Max {bulkImportMaxRows} rows in one upload.</p>
    </div>
  );
}
