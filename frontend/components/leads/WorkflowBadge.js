// file: frontend/components/leads/WorkflowBadge.js
"use client";

import { useState } from "react";
import { API_BASE, apiRequest } from "../../lib/api";
import { loadSession } from "../../lib/session";

export default function WorkflowBadge({ status, leadId, role, onAction, lead }) {
  const [loading, setLoading] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState(""); // "approve" or "reject"
  const [comments, setComments] = useState("");
  const [error, setError] = useState("");

  const session = loadSession();
  const token = session?.token;
  const userRole = role || session?.user?.role;
  const isAdminOrManager = ["admin", "manager", "super-admin", "platform-admin"].includes(userRole);
  const isSales = userRole === "sales";

  let files = [];
  if (lead && lead.completed_files) {
    try {
      files = typeof lead.completed_files === "string"
        ? JSON.parse(lead.completed_files)
        : lead.completed_files;
      if (!Array.isArray(files)) {
        files = [];
      }
    } catch (e) {
      console.error("Failed to parse completed_files JSON", e);
    }
  }

  const resolveHref = (url) => {
    if (!url) return "#";
    if (/^(https?:\/\/|blob:)/i.test(url)) return url;
    return `${API_BASE}${url}`;
  };

  async function handleReviewSubmit(e) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest(`/workflow/${leadId}/review`, {
        method: "POST",
        token,
        body: { action: reviewAction, comments },
      });
      setCommentOpen(false);
      setComments("");
      if (onAction) onAction(res.lead || res);
    } catch (err) {
      setError(err.message || "Failed to update review status");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeliver() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest(`/workflow/${leadId}/deliver`, {
        method: "POST",
        token,
      });
      if (onAction) onAction(res.lead || res);
    } catch (err) {
      setError(err.message || "Failed to deliver work");
    } finally {
      setLoading(false);
    }
  }

  async function handleCloseWon() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      // Update status to 'closed-won'
      const res = await apiRequest(`/leads/${leadId}`, {
        method: "PATCH",
        token,
        body: {
          status: "closed-won",
          change_note: "Automatically marked Closed Won after workflow delivery.",
        },
      });
      if (onAction) onAction(res.lead || res);
    } catch (err) {
      setError(err.message || "Failed to update status to Closed Won");
    } finally {
      setLoading(false);
    }
  }

  // Render correct badge depending on status
  const badgeStyles = {
    in_progress: "bg-blue-50 text-blue-700 border-blue-200",
    pending_qa: "bg-purple-50 text-purple-700 border-purple-200",
    revisions_needed: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-green-50 text-green-700 border-green-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  const currentStyle = badgeStyles[status] || "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <div className="flex flex-col gap-2 p-1.5 border border-slate-100 bg-slate-50/50 rounded-xl">
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${currentStyle}`}>
          {status === "in_progress" && (isAdminOrManager ? "Waiting for Expert" : "🔵 Expert Working")}
          {status === "pending_qa" && "🟣 Under QA Review"}
          {status === "revisions_needed" && "🟡 Revision Requested"}
          {status === "approved" && "🟢 Work Approved"}
          {status === "completed" && "✅ Delivered"}
        </span>

        {loading && (
          <span className="text-[10px] text-slate-400 font-medium animate-pulse">Processing...</span>
        )}
      </div>

      {error && <p className="text-[10px] font-semibold text-rose-600 px-1">{error}</p>}

      {/* Deliverables Section for Admins, Managers, and Sales */}
      {(isAdminOrManager || isSales) && (files.length > 0 || lead?.expert_link || lead?.expert_notes) && (
        <div className="mt-1 p-2 bg-white border border-slate-100 rounded-lg space-y-2 text-[11px] shadow-2xs">
          {files.length > 0 && (
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Deliverable Files</span>
              <div className="space-y-1 mt-1">
                {files.map((file, idx) => (
                  <a
                    key={idx}
                    href={resolveHref(file.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 p-1 rounded border border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
                  >
                    <span>📎</span>
                    <span className="truncate flex-1 font-semibold">{file.name}</span>
                    <span className="text-blue-600 font-bold hover:underline shrink-0 text-[10px] uppercase mr-1">Download</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {lead?.expert_link && (
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">External Link</span>
              <a
                href={lead.expert_link.startsWith("http") ? lead.expert_link : `https://${lead.expert_link}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold break-all hover:underline"
              >
                🌐 {lead.expert_link}
              </a>
            </div>
          )}

          {lead?.expert_notes && (
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Expert Notes</span>
              <p className="text-slate-600 bg-slate-50 p-1.5 rounded mt-0.5 whitespace-pre-wrap leading-normal font-medium">{lead.expert_notes}</p>
            </div>
          )}

          {lead?.quality && (
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Quality Tier</span>
              <span className="inline-block text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full mt-0.5">{lead.quality}</span>
            </div>
          )}
        </div>
      )}

      {/* Action buttons based on status and user role */}
      <div className="flex flex-wrap gap-1.5 mt-0.5">
        {status === "pending_qa" && isAdminOrManager && !commentOpen && (
          <>
            <button
              onClick={() => {
                setReviewAction("approve");
                setCommentOpen(true);
              }}
              className="px-2.5 py-1 text-xs font-bold bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
            >
              Approve
            </button>
            <button
              onClick={() => {
                setReviewAction("reject");
                setCommentOpen(true);
              }}
              className="px-2.5 py-1 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition"
            >
              Reject
            </button>
          </>
        )}

        {status === "approved" && isSales && (
          <button
            onClick={handleDeliver}
            disabled={loading}
            className="px-2.5 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Mark Delivered
          </button>
        )}

        {status === "completed" && isSales && (
          <button
            onClick={handleCloseWon}
            disabled={loading}
            className="px-2.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
          >
            Close Won
          </button>
        )}
      </div>

      {commentOpen && (
        <form onSubmit={handleReviewSubmit} className="mt-2 p-2 border border-slate-200 bg-white rounded-lg space-y-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Review Comments ({reviewAction === "approve" ? "Approval" : "Rejection"})
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full text-xs p-1.5 border border-slate-200 rounded outline-none focus:border-blue-400"
            rows="2"
            placeholder="Provide feedback..."
            required={reviewAction === "reject"}
          />
          <div className="flex gap-1.5 justify-end">
            <button
              type="button"
              onClick={() => setCommentOpen(false)}
              className="px-2 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-2 py-1 text-[11px] font-bold text-white rounded ${
                reviewAction === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              Confirm
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
