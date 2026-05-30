// file: frontend/components/leads/WorkflowReviewModal.js
"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { API_BASE, apiRequest } from "../../lib/api";
import { loadSession } from "../../lib/session";

function resolveHref(url) {
  if (!url) return "#";
  if (/^(https?:\/\/|blob:)/i.test(url)) return url;
  return `${API_BASE}${url}`;
}

function parseFiles(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) { return []; }
}

const ICON = {
  pdf: "📄", zip: "📦", mp4: "🎥", mkv: "🎥", doc: "📝", docx: "📝", xls: "📊", xlsx: "📊",
};
function fileIcon(name = "") {
  const ext = String(name).split(".").pop().toLowerCase();
  return ICON[ext] || "📁";
}

export default function WorkflowReviewModal({ lead, onClose, onAction }) {
  const session = loadSession();
  const token = session?.token;
  const userRole = session?.user?.role;
  const isAdminOrManager = ["admin", "manager", "super-admin", "platform-admin"].includes(userRole);
  const isSales = userRole === "sales";

  const [reviewAction, setReviewAction] = useState(""); // "" | "approve" | "reject"
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Lock body scroll while modal open
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const files = parseFiles(lead?.completed_files);
  const status = lead?.workflow_status;

  const statusMeta = {
    in_progress:      { label: "Expert Working",      dot: "bg-blue-500",   text: "text-blue-700",   bg: "bg-blue-50" },
    pending_qa:       { label: "Pending Your Review",  dot: "bg-purple-500", text: "text-purple-700", bg: "bg-purple-50" },
    revisions_needed: { label: "Revision Requested",   dot: "bg-amber-500",  text: "text-amber-700",  bg: "bg-amber-50" },
    approved:         { label: "Work Approved",         dot: "bg-green-500",  text: "text-green-700",  bg: "bg-green-50" },
    completed:        { label: "Delivered",             dot: "bg-emerald-500",text: "text-emerald-700",bg: "bg-emerald-50" },
  };
  const sm = statusMeta[status] || { label: status || "Unknown", dot: "bg-slate-400", text: "text-slate-700", bg: "bg-slate-50" };

  async function submitReview(e) {
    e.preventDefault();
    if (!token || loading) return;
    setLoading(true);
    setError("");
    try {
      const updatedLead = await apiRequest(`/workflow/${lead.lead_id}/review`, {
        method: "POST", token,
        body: { action: reviewAction, comments },
      });
      if (onAction && updatedLead) onAction(updatedLead);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to submit review");
      setLoading(false);
    }
  }

  async function handleDeliver() {
    if (!token || loading) return;
    setLoading(true);
    setError("");
    try {
      const updatedLead = await apiRequest(`/workflow/${lead.lead_id}/deliver`, { method: "POST", token });
      if (onAction && updatedLead) onAction(updatedLead);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to deliver");
      setLoading(false);
    }
  }

  async function handleCloseWon() {
    if (!token || loading) return;
    setLoading(true);
    setError("");
    try {
      const updatedLead = await apiRequest(`/leads/${lead.lead_id}`, {
        method: "PATCH", token,
        body: { status: "closed-won", change_note: "Marked Closed Won after delivery." },
      });
      if (onAction && updatedLead) onAction(updatedLead);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update");
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog" aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Expert Workflow</p>
            <h2 className="mt-0.5 text-base font-bold text-slate-900 leading-tight">
              {lead?.contact_person || lead?.company_name || "Lead Review"}
            </h2>
          </div>
          {/* Status chip */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${sm.bg} ${sm.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${sm.dot}`} />
              {sm.label}
            </span>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-4">

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {/* Expert Notes + Quality */}
          {(lead?.expert_notes || lead?.quality) && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
              {lead.quality && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quality</span>
                  <span className="rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                    {lead.quality}
                  </span>
                </div>
              )}
              {lead.expert_notes && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Expert Notes</span>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{lead.expert_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* External Link */}
          {lead?.expert_link && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">External Link</span>
              <a
                href={lead.expert_link.startsWith("http") ? lead.expert_link : `https://${lead.expert_link}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition break-all"
              >
                🌐 {lead.expert_link}
              </a>
            </div>
          )}

          {/* Deliverable Files */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-2">
              Deliverable Files {files.length > 0 ? `(${files.length})` : ""}
            </span>
            {files.length > 0 ? (
              <div className="space-y-2">
                {files.map((file, idx) => (
                  <a
                    key={idx}
                    href={resolveHref(file.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={file.name}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <span className="text-lg">{fileIcon(file.name)}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-xs font-semibold text-slate-800">{file.name || "File"}</span>
                      <span className="text-[10px] text-slate-400">Click to download</span>
                    </span>
                    <span className="shrink-0 rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase text-blue-600 hover:bg-blue-50 transition">
                      ↓ Download
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-slate-400">No files submitted yet.</p>
            )}
          </div>

          {/* Review form — approve or reject */}
          {status === "pending_qa" && isAdminOrManager && (
            <div className="border-t border-slate-100 pt-4">
              {reviewAction === "" ? (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewAction("approve")}
                    className="flex-1 rounded-xl border border-green-300 bg-green-600 py-2.5 text-sm font-bold text-white transition hover:bg-green-700"
                  >
                    ✓ Approve Work
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction("reject")}
                    className="flex-1 rounded-xl border border-amber-300 bg-amber-500 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600"
                  >
                    ↩ Request Revision
                  </button>
                </div>
              ) : (
                <form onSubmit={submitReview} className="space-y-3">
                  <div className={`rounded-xl border px-3 py-2 text-xs font-bold ${reviewAction === "approve" ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                    {reviewAction === "approve" ? "✓ Approving this submission" : "↩ Requesting revision"}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                      Comments {reviewAction === "reject" ? "(required)" : "(optional)"}
                    </label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-50 resize-none"
                      rows="3"
                      placeholder={reviewAction === "approve" ? "Great work! (optional)" : "Please explain what needs to be revised..."}
                      required={reviewAction === "reject"}
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setReviewAction(""); setComments(""); }}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold text-white transition disabled:opacity-60 ${
                        reviewAction === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-amber-500 hover:bg-amber-600"
                      }`}
                    >
                      {loading ? "Submitting..." : reviewAction === "approve" ? "Confirm Approval" : "Send for Revision"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Sales actions */}
          {status === "approved" && isSales && (
            <div className="border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handleDeliver}
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "Processing..." : "📦 Mark as Delivered to Client"}
              </button>
            </div>
          )}
          {status === "completed" && isSales && (
            <div className="border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handleCloseWon}
                disabled={loading}
                className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? "Processing..." : "🏆 Mark as Closed Won"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
