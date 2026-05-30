// file: frontend/app/dashboard/expert/page.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import ExpertTaskCard from "./ExpertTaskCard";
import ExpertTaskDrawer from "./ExpertTaskDrawer";

function ExpertDashboardView({ data, error, loading, session, onRefresh }) {
  const router = useRouter();
  const [activeLead, setActiveLead] = useState(null);
  const leads = data?.leads?.items || [];

  const inProgress = leads.filter(l => ["in_progress", "revisions_needed"].includes(l.workflow_status)).length;
  const pendingQa = leads.filter(l => l.workflow_status === "pending_qa").length;
  const completed = leads.filter(l => ["approved", "completed"].includes(l.workflow_status)).length;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center text-sm text-slate-400">
          Loading assigned tasks...
        </div>
      ) : (
        <>
          {/* Header */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Expert Console</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
              Welcome back, {session?.user?.name || "Expert"} 👋
            </h1>
            <p className="mt-0.5 text-sm text-slate-400">Here are your active workflow deliverables.</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500">In Progress</p>
              <p className="mt-1 text-2xl font-extrabold text-blue-900">{inProgress}</p>
            </div>
            <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-4 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-widest text-purple-500">Pending Review</p>
              <p className="mt-1 text-2xl font-extrabold text-purple-900">{pendingQa}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Done</p>
              <p className="mt-1 text-2xl font-extrabold text-emerald-900">{completed}</p>
            </div>
          </div>

          {/* Tasks Grid */}
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Your Tasks</h2>
            {leads.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2">
                {leads.map((lead) => (
                  <ExpertTaskCard
                    key={lead.lead_id}
                    lead={lead}
                    onOpen={(l) => setActiveLead(l)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
                <span className="text-3xl mb-2">🎉</span>
                <h3 className="text-sm font-bold text-slate-700">All caught up!</h3>
                <p className="text-xs text-slate-400 mt-0.5">No tasks currently assigned to you.</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeLead && (
        <ExpertTaskDrawer
          lead={activeLead}
          onClose={() => setActiveLead(null)}
          onSuccess={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}

export default function ExpertDashboard() {
  return (
    <WorkspacePage
      title="Expert Dashboard"
      eyebrow="Expert Workspace"
      allowedRoles={["expert"]}
      hideTitle
      requestBuilder={() => [
        { key: "leads", path: "/leads?page_size=50&is_workflow=true" },
      ]}
    >
      {({ data, error, loading, session, refresh }) => (
        <ExpertDashboardView data={data} error={error} loading={loading} session={session} onRefresh={refresh} />
      )}
    </WorkspacePage>
  );
}
