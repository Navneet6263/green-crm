import React from "react";

function formatINR(value) {
  return "₹" + Number(value || 0).toLocaleString("en-IN");
}

const CARD_CLASS = "flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md";

export default function AdminWorkflowFinancials({ workflowSummary }) {
  if (!workflowSummary || workflowSummary.total_workflow_leads <= 0) return null;

  const received = Number(workflowSummary.total_advance_received || 0);
  const pending = Number(workflowSummary.total_remaining_payment || 0);
  const totalValue = received + pending;
  const collectionPct = totalValue > 0 ? Math.round((received / totalValue) * 100) : 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Workflow Overview</p>
        <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Expert Workflow Financials</h3>
        <p className="mt-1 text-xs text-slate-500">Real-time metrics for leads routed to external experts.</p>
      </div>

      {/* Collection Progress Bar */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Collection Progress</span>
          <span className="text-sm font-black text-emerald-500">{collectionPct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-700" style={{ width: `${collectionPct}%` }} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={CARD_CLASS}>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Total Received</p>
          <strong className="mt-3 block text-3xl font-black tracking-tight text-slate-900">
            {formatINR(received)}
          </strong>
        </div>
        <div className={CARD_CLASS}>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Total Pending</p>
          <strong className="mt-3 block text-3xl font-black tracking-tight text-slate-900">
            {formatINR(pending)}
          </strong>
        </div>
        <div className={CARD_CLASS}>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Active Workflows</p>
          <strong className="mt-3 block text-3xl font-black tracking-tight text-slate-900">
            {workflowSummary.active_workflow_leads || 0}
          </strong>
        </div>
        <div className={CARD_CLASS}>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Completed</p>
          <strong className="mt-3 block text-3xl font-black tracking-tight text-slate-900">
            {workflowSummary.completed_workflow_leads || 0}
          </strong>
        </div>
      </div>
    </section>
  );
}
