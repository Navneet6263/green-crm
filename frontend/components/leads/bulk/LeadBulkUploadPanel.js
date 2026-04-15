"use client";

import DashboardIcon from "../../dashboard/icons";
import {
  LEAD_GHOST_BUTTON_CLASS,
  LEAD_INPUT_CLASS,
  LEAD_KICKER_CLASS,
  LEAD_PANEL_CLASS,
  LEAD_PRIMARY_BUTTON_CLASS,
} from "../shared/leadPageConstants";
import LeadBulkUploadTemplateTable from "./LeadBulkUploadTemplateTable";

export default function LeadBulkUploadPanel({
  blankBulkSheet,
  bulkImportColumns,
  bulkImportFields,
  bulkImportMaxRows,
  bulkImporting,
  bulkUploadFile,
  bulkUploadPreview,
  bulkUploadReport,
  bulkUploadText,
  downloadBulkTemplate,
  handleBulkFileChange,
  loadBulkTemplate,
  resetBulkUploadPanel,
  sampleBulkSheet,
  setBulkUploadText,
  submitBulkUpload,
}) {
  return (
    <article className={`${LEAD_PANEL_CLASS} overflow-hidden bg-[#fffdf8] p-4 md:p-5`}>
      <div className="grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <p className={LEAD_KICKER_CLASS}>Bulk Upload</p>
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-[#060710]">Import leads in the add-lead field order</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#746853]">
                  Paste rows or upload a text, TSV, or CSV file using the existing {bulkImportColumns.length}-column template.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <label className={LEAD_GHOST_BUTTON_CLASS}>
                <DashboardIcon name="products" className="h-4 w-4" />
                {bulkUploadFile ? `File: ${bulkUploadFile}` : "Choose File"}
                <input type="file" accept=".txt,.tsv,.csv" onChange={handleBulkFileChange} hidden />
              </label>
              <button className={LEAD_GHOST_BUTTON_CLASS} type="button" onClick={() => downloadBulkTemplate("greencrm-lead-template.csv", blankBulkSheet)}>
                Download Blank
              </button>
              <button className={LEAD_GHOST_BUTTON_CLASS} type="button" onClick={() => downloadBulkTemplate("greencrm-lead-sample.csv", sampleBulkSheet)}>
                Download Sample
              </button>
            </div>
          </div>

          <label className="space-y-2">
            <span className={LEAD_KICKER_CLASS}>Paste Lead Rows</span>
            <textarea
              rows="8"
              value={bulkUploadText}
              onChange={(event) => setBulkUploadText(event.target.value)}
              placeholder="Paste rows here in the same order as the template..."
              className={`${LEAD_INPUT_CLASS} min-h-[200px] resize-y`}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex rounded-full border border-[#ddd3c2] bg-[#fff6e4] px-3 py-1 text-[11px] font-bold text-[#7a6230]">{bulkUploadPreview.rowCount || 0} rows ready</span>
            <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">{bulkUploadPreview.hasHeader ? "Template header detected" : "Header optional"}</span>
            <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">{bulkUploadPreview.delimiter === "tab" ? "Tab-separated format" : "CSV format"}</span>
            <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">Max {bulkImportMaxRows} rows</span>
          </div>

          {bulkUploadPreview.error ? <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{bulkUploadPreview.error}</div> : null}

          {bulkUploadPreview.preview ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Company Code", value: bulkUploadPreview.preview.company_id || "--" },
                { label: "Product Code", value: bulkUploadPreview.preview.product_id || "--" },
                { label: "Contact", value: bulkUploadPreview.preview.contact_person || "--" },
                { label: "Company Name", value: bulkUploadPreview.preview.company_name || "--" },
              ].map((item) => (
                <div key={item.label} className="rounded-[20px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-3">
                  <p className={LEAD_KICKER_CLASS}>{item.label}</p>
                  <p className="mt-2 text-sm font-semibold text-[#060710]">{item.value}</p>
                </div>
              ))}
            </div>
          ) : null}

          {bulkUploadReport ? (
            <div className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] p-4">
              <div className="flex flex-wrap items-center gap-3">
                <strong className="text-base font-semibold text-[#060710]">{bulkUploadReport.imported} imported</strong>
                <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">{bulkUploadReport.failed || 0} failed</span>
              </div>
              {bulkUploadReport.errors?.length ? (
                <div className="mt-3 space-y-2">
                  {bulkUploadReport.errors.slice(0, 6).map((item) => (
                    <div key={`${item.row}-${item.message}`} className="rounded-[16px] border border-rose-200 bg-white px-4 py-3">
                      <strong className="block text-sm font-semibold text-[#060710]">Row {item.row}</strong>
                      <span className="mt-1 block text-sm text-[#7a6b57]">{item.message}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <LeadBulkUploadTemplateTable
          blankBulkSheet={blankBulkSheet}
          bulkImportFields={bulkImportFields}
          bulkImportMaxRows={bulkImportMaxRows}
          loadBulkTemplate={loadBulkTemplate}
          sampleBulkSheet={sampleBulkSheet}
        />
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-3">
        <button className={LEAD_GHOST_BUTTON_CLASS} type="button" onClick={resetBulkUploadPanel}>
          Clear Upload
        </button>
        <button className={LEAD_PRIMARY_BUTTON_CLASS} type="button" onClick={submitBulkUpload} disabled={bulkImporting || !bulkUploadPreview.rowCount || Boolean(bulkUploadPreview.error)}>
          {bulkImporting ? "Uploading..." : `Upload ${bulkUploadPreview.rowCount || 0} Leads`}
        </button>
      </div>
    </article>
  );
}
