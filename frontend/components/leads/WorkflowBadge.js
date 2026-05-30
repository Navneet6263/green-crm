// file: frontend/components/leads/WorkflowBadge.js
"use client";

import { useState } from "react";
import { loadSession } from "../../lib/session";
import WorkflowReviewModal from "./WorkflowReviewModal";

const BADGE_STYLES = {
  in_progress:      "border-blue-200   bg-blue-50   text-blue-700",
  pending_qa:       "border-purple-200 bg-purple-50 text-purple-700",
  revisions_needed: "border-amber-200  bg-amber-50  text-amber-700",
  approved:         "border-green-200  bg-green-50  text-green-700",
  completed:        "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const BADGE_LABELS = {
  in_progress:      { admin: "⏳ Waiting for Expert", expert: "🔵 Expert Working" },
  pending_qa:       { admin: "🟣 Pending Review",     expert: "🟣 Under Review" },
  revisions_needed: { admin: "🟡 Revision Needed",    expert: "🟡 Revision Needed" },
  approved:         { admin: "🟢 Approved",            expert: "🟢 Approved" },
  completed:        { admin: "✅ Delivered",            expert: "✅ Delivered" },
};

// Statuses where a "Review" action button makes sense
const REVIEW_STATUSES = ["pending_qa", "approved", "completed", "revisions_needed", "in_progress"];

export default function WorkflowBadge({ status, leadId, role, onAction, lead }) {
  const [modalOpen, setModalOpen] = useState(false);

  const session = loadSession();
  const userRole = role || session?.user?.role;
  const isAdminOrManager = ["admin", "manager", "super-admin", "platform-admin"].includes(userRole);
  const isSales = userRole === "sales";
  const canReview = (isAdminOrManager || isSales) && REVIEW_STATUSES.includes(status);

  const badgeStyle = BADGE_STYLES[status] || "border-slate-200 bg-slate-50 text-slate-700";
  const labelMap = BADGE_LABELS[status] || {};
  const label = isAdminOrManager ? (labelMap.admin || status) : (labelMap.expert || status);

  // Show review button only for pending_qa (admin) or approved/completed (sales)
  const showReviewBtn =
    (status === "pending_qa" && isAdminOrManager) ||
    (status === "approved" && isSales) ||
    (status === "completed" && isSales);

  // Show view-only button for other statuses with deliverables
  const showViewBtn = canReview && !showReviewBtn && (
    lead?.completed_files || lead?.expert_link || lead?.expert_notes
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Compact status badge */}
        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${badgeStyle}`}>
          {label}
        </span>

        {/* Review / View button */}
        {showReviewBtn && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-purple-300 bg-purple-600 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-purple-700"
          >
            Review →
          </button>
        )}
        {showViewBtn && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
          >
            View Files
          </button>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <WorkflowReviewModal
          lead={lead}
          onClose={() => setModalOpen(false)}
          onAction={(updatedLead) => {
            setModalOpen(false);
            if (onAction && updatedLead) onAction(updatedLead);
          }}
        />
      )}
    </>
  );
}
