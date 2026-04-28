"use client";

import { useState } from "react";

import DashboardIcon from "../../dashboard/icons";

const ACCEPTED_TYPES =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*";

function formatFileSize(size) {
  if (!size) {
    return "Size not available";
  }

  const inKb = Number(size) / 1024;
  return `${inKb >= 1024 ? `${(inKb / 1024).toFixed(1)} MB` : `${inKb.toFixed(1)} KB`}`;
}

export default function LeadDocumentsPanel({
  canUpload = true,
  documents,
  emptyMessage = "No documents uploaded yet.",
  ghostButtonClassName,
  helperText,
  kickerClassName,
  onUpload,
  primaryButtonClassName,
  renderWhen,
  resolveHref,
  uploading = false,
}) {
  const [uploadError, setUploadError] = useState("");

  async function handleFilePick(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!files.length || !onUpload || uploading) {
      return;
    }

    setUploadError("");

    try {
      for (const file of files) {
        await onUpload(file);
      }
    } catch (requestError) {
      setUploadError(requestError.message || "Could not upload this document.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] bg-[#fffaf1] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <span className={kickerClassName}>Upload Documents</span>
            <p className="mt-2 text-sm leading-6 text-[#6f614c]">
              {helperText || "Upload PDF, image, DOC, or DOCX files for this lead."}
            </p>
          </div>
          {canUpload ? (
            <label className={`${primaryButtonClassName} cursor-pointer`}>
              <DashboardIcon name="documents" className="h-4 w-4" />
              {uploading ? "Uploading..." : "Choose Files"}
              <input
                className="hidden"
                type="file"
                accept={ACCEPTED_TYPES}
                multiple
                onChange={handleFilePick}
                disabled={uploading}
              />
            </label>
          ) : (
            <div className="rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm font-medium text-[#7a6b57]">
              Upload access is not available for this role.
            </div>
          )}
        </div>
        {uploadError ? (
          <div className="mt-4 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-700">
            {uploadError}
          </div>
        ) : null}
      </div>

      {documents?.length ? (
        <div className="space-y-3">
          {documents.map((file, index) => (
            <div
              key={file.id || `${file.file_name}-${index}`}
              className="rounded-[22px] bg-[#fffaf1] px-4 py-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fffaf1] px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                      {file.sourceLabel || "Lead file"}
                    </span>
                    {file.document_type ? (
                      <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                        {file.document_type}
                      </span>
                    ) : null}
                  </div>
                  <strong className="mt-3 block truncate text-sm text-[#060710]">{file.file_name || "Document"}</strong>
                  <span className="mt-1 block text-xs text-[#7a6b57]">
                    {file.uploaded_by_name || "Team"} | {renderWhen(file.uploaded_at, true)} | {formatFileSize(file.file_size)}
                  </span>
                </div>
                <a
                  className={ghostButtonClassName}
                  href={resolveHref(file.file_url)}
                  target="_blank"
                  rel="noreferrer"
                >
                  View
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-4 py-10 text-center text-sm text-[#7a6b57]">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
