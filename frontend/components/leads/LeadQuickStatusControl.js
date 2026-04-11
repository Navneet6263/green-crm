"use client";

import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../lib/api";

const STATUS_OPTIONS = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "closed-won",
  "closed-lost",
];

const NOTE_HINTS = {
  new: "Capture what just came in and what should happen next.",
  contacted: "Note the first outreach, response, or call outcome.",
  qualified: "Record why this lead is now qualified and what is confirmed.",
  proposal: "Mention proposal scope, pricing, or commercial expectation.",
  negotiation: "Note objections, negotiation pressure, or decision blockers.",
  "closed-won": "Capture the winning reason and handoff readiness.",
  "closed-lost": "Record the loss reason so history stays useful.",
};

const SELECT_CLASS =
  "min-h-[38px] rounded-full border border-[#eadfcd] bg-white px-3 py-2 text-xs font-semibold text-[#5d503c] outline-none transition focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const NOTE_CLASS =
  "min-h-[96px] w-full rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#060710] outline-none transition placeholder:text-[#9c8e76] focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const DONE_CLASS =
  "inline-flex min-h-[38px] items-center justify-center rounded-full border border-[#d7b258] bg-[#f3dfab] px-4 py-2 text-xs font-semibold text-[#060710] shadow-[0_12px_24px_rgba(203,169,82,0.16)] transition hover:-translate-y-0.5 hover:bg-[#efd48f] disabled:cursor-not-allowed disabled:opacity-60";
const CANCEL_CLASS =
  "inline-flex min-h-[38px] items-center justify-center rounded-full border border-[#eadfcd] bg-white px-4 py-2 text-xs font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:text-[#060710]";

function titleize(value = "") {
  return String(value)
    .replaceAll("_", "-")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function LeadQuickStatusControl({
  lead,
  token,
  disabled = false,
  className = "",
  onUpdated,
  hideLabel = false,
  selectClassName = "",
  notePanelClassName = "",
  placeholder = "What changed on this lead?",
}) {
  const currentStatus = String(lead?.status || "new").toLowerCase();
  const [draftStatus, setDraftStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraftStatus(currentStatus);
    setNote("");
    setError("");
  }, [lead?.lead_id, currentStatus]);

  const changed = draftStatus !== currentStatus;
  const hint = useMemo(() => NOTE_HINTS[draftStatus] || "Leave one useful note for this status change.", [draftStatus]);

  function resetDraft() {
    setDraftStatus(currentStatus);
    setNote("");
    setError("");
  }

  async function submitStatusChange() {
    if (!changed || !token || !lead?.lead_id || disabled) {
      return;
    }

    if (!note.trim()) {
      setError("Status note is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const updatedLead = await apiRequest(`/leads/${lead.lead_id}`, {
        method: "PATCH",
        token,
        body: {
          status: draftStatus,
          change_note: note.trim(),
        },
      });

      setDraftStatus(String(updatedLead.status || draftStatus).toLowerCase());
      setNote("");
      setError("");

      if (onUpdated) {
        await onUpdated(updatedLead);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {!hideLabel ? <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#9a886d]">Status</span> : null}
        <select
          className={`${SELECT_CLASS} ${selectClassName}`.trim()}
          value={draftStatus}
          onChange={(event) => {
            setDraftStatus(event.target.value);
            setError("");
          }}
          disabled={disabled || saving}
        >
          {STATUS_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {titleize(item)}
            </option>
          ))}
        </select>
      </div>

      {changed ? (
        <div className={`rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] p-3 shadow-[0_12px_24px_rgba(79,58,22,0.05)] ${notePanelClassName}`.trim()}>
          <p className="text-[11px] font-semibold text-[#8f816a]">{hint}</p>
          <textarea
            rows="3"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={placeholder}
            className={`${NOTE_CLASS} mt-3 resize-y`}
          />
          {error ? <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p> : null}
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button className={CANCEL_CLASS} type="button" onClick={resetDraft} disabled={saving}>
              Cancel
            </button>
            <button className={DONE_CLASS} type="button" onClick={submitStatusChange} disabled={saving || !note.trim()}>
              {saving ? "Saving..." : "Done"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
