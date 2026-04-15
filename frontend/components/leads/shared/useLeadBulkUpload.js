"use client";

import { useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import {
  BULK_IMPORT_COLUMNS,
  BULK_IMPORT_FIELDS,
  BULK_IMPORT_MAX_ROWS,
  buildLeadBulkImportSheet,
  parseLeadBulkImportText,
} from "../../../lib/leadBulkImport";
import { formatScopedError } from "../../../lib/teamScope";

export function useLeadBulkUpload({ onImported, setError, setNotice, token }) {
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState("");
  const [bulkUploadReport, setBulkUploadReport] = useState(null);
  const [bulkUploadText, setBulkUploadText] = useState("");
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const blankBulkSheet = useMemo(() => buildLeadBulkImportSheet({ includeSample: false }), []);
  const sampleBulkSheet = useMemo(() => buildLeadBulkImportSheet({ includeSample: true }), []);

  const bulkUploadPreview = useMemo(() => {
    try {
      return { ...parseLeadBulkImportText(bulkUploadText), error: "" };
    } catch (previewError) {
      return { rows: [], rowCount: 0, hasHeader: false, delimiter: "tab", preview: null, error: previewError.message };
    }
  }, [bulkUploadText]);

  function resetBulkUploadPanel() {
    setBulkUploadText("");
    setBulkUploadFile("");
    setBulkUploadReport(null);
  }

  async function handleBulkFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      setBulkUploadText(text);
      setBulkUploadFile(file.name);
      setBulkUploadReport(null);
      setShowBulkUpload(true);
    } catch (_error) {
      setError("Could not read the selected file.");
    } finally {
      event.target.value = "";
    }
  }

  function loadBulkTemplate(content, label) {
    setBulkUploadText(content);
    setBulkUploadFile(label);
    setBulkUploadReport(null);
    setError("");
    setNotice(`${label} loaded in the upload sheet.`);
  }

  function downloadBulkTemplate(filename, content) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  async function submitBulkUpload() {
    if (!token) {
      return;
    }

    if (bulkUploadPreview.error) {
      setError(bulkUploadPreview.error);
      return;
    }

    if (!bulkUploadPreview.rows.length) {
      setError("Paste at least one formatted lead row before uploading.");
      return;
    }

    setBulkImporting(true);
    setError("");
    setNotice("");
    setBulkUploadReport(null);

    try {
      const response = await apiRequest("/leads/bulk-upload", { method: "POST", token, body: { rows: bulkUploadPreview.rows } });
      setBulkUploadReport(response);
      onImported?.();

      if (response.failed) {
        setNotice(`${response.imported} leads imported. ${response.failed} rows need review.`);
      } else {
        setNotice(`${response.imported} leads imported successfully.`);
        resetBulkUploadPanel();
        setShowBulkUpload(false);
      }
    } catch (requestError) {
      setError(formatScopedError(requestError, "Could not upload the selected leads."));
    } finally {
      setBulkImporting(false);
    }
  }

  return {
    blankBulkSheet,
    bulkImporting,
    bulkUploadFile,
    bulkUploadPreview,
    bulkUploadReport,
    bulkUploadText,
    BULK_IMPORT_COLUMNS,
    BULK_IMPORT_FIELDS,
    BULK_IMPORT_MAX_ROWS,
    downloadBulkTemplate,
    handleBulkFileChange,
    loadBulkTemplate,
    resetBulkUploadPanel,
    sampleBulkSheet,
    setBulkUploadText,
    setShowBulkUpload,
    showBulkUpload,
    submitBulkUpload,
  };
}
