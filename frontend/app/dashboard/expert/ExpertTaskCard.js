// file: frontend/app/dashboard/expert/ExpertTaskCard.js
"use client";

import { titleize } from "../sales/sales-tokens";

export default function ExpertTaskCard({ lead, onOpen }) {
  const taskId = lead.lead_id;
  const title = lead.requirements
    ? (lead.requirements.length > 60 ? lead.requirements.slice(0, 60) + "..." : lead.requirements)
    : `Task for ${lead.company_name || lead.contact_person || "Unnamed"}`;

  // Calculate days remaining
  let countdownLabel = "No Deadline";
  let countdownColor = "bg-slate-100 text-slate-700 border-slate-200";

  if (lead.follow_up_date) {
    const diffTime = new Date(lead.follow_up_date) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      countdownLabel = "Overdue";
      countdownColor = "bg-rose-50 text-rose-700 border-rose-200";
    } else if (diffDays <= 2) {
      countdownLabel = `${diffDays} day${diffDays !== 1 ? "s" : ""} left`;
      countdownColor = "bg-rose-50 text-rose-700 border-rose-200";
    } else if (diffDays <= 5) {
      countdownLabel = `${diffDays} days left`;
      countdownColor = "bg-amber-50 text-amber-700 border-amber-200";
    } else {
      countdownLabel = `${diffDays} days left`;
      countdownColor = "bg-green-50 text-green-700 border-green-200";
    }
  }

  const priorityColors = {
    high: "bg-rose-50 text-rose-700 border-rose-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-slate-100 text-slate-600 border-slate-200",
  };
  const priorityStyle = priorityColors[lead.priority] || priorityColors.medium;

  const statusColors = {
    in_progress: "bg-blue-50 text-blue-700 border-blue-200",
    pending_qa: "bg-purple-50 text-purple-700 border-purple-200",
    revisions_needed: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-green-50 text-green-700 border-green-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  const statusStyle = statusColors[lead.workflow_status] || "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <div className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:scale-[1.01]">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <span className="text-xs font-bold text-slate-400 bg-slate-100/80 px-2 py-0.5 rounded-md">
          #{taskId}
        </span>
        <div className="flex gap-1.5">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${priorityStyle}`}>
            {lead.priority || "Medium"}
          </span>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${statusStyle}`}>
            {lead.workflow_status === "in_progress" ? "Expert Working" : titleize(lead.workflow_status || "In Progress")}
          </span>
        </div>
      </div>

      <h3 className="text-base font-bold text-slate-800 line-clamp-2 min-h-[3rem] mb-4">
        {title}
      </h3>

      <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${countdownColor}`}>
          {countdownLabel}
        </span>
        <button
          onClick={() => onOpen(lead)}
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
        >
          Open Task
        </button>
      </div>
    </div>
  );
}
