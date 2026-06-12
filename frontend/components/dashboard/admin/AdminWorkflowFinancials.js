import React from "react";

const HERO_STAT_CARD =
  "rounded-[26px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(247,241,233,0.92))] p-5 shadow-[0_18px_42px_rgba(33,48,74,0.10)] backdrop-blur-xl transition duration-200 ease-out hover:scale-[1.02] hover:border-[#dbcdb8] hover:shadow-[0_24px_52px_rgba(33,48,74,0.14)]";

const PAGE_SURFACE =
  "relative overflow-hidden rounded-[30px] border border-white/75 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.13),transparent_28%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(250,244,235,0.96)_52%,rgba(247,240,229,0.98)_100%)] p-5 text-[#0f172a] shadow-[0_22px_60px_rgba(33,48,74,0.10)] backdrop-blur-xl md:p-6";

export default function AdminWorkflowFinancials({ workflowSummary }) {
  if (!workflowSummary || workflowSummary.total_workflow_leads <= 0) {
    return null;
  }

  return (
    <section className={PAGE_SURFACE}>
      <div className="mb-5">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#93816a]">Workflow Overview</p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#0f172a]">Expert Workflow Financials</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748b]">
          Real-time metrics for leads routed to external experts. Shows advance collections and pending payouts.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={HERO_STAT_CARD}>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#93816a]">Total Received (Advance)</p>
          <strong className="mt-4 block text-3xl font-black tracking-tight text-[#0f8c53]">
            ₹{Number(workflowSummary.total_advance_received || 0).toLocaleString("en-IN")}
          </strong>
          <p className="mt-3 text-xs text-[#64748b]">Advance amount processed from workflow leads.</p>
        </div>
        <div className={HERO_STAT_CARD}>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#93816a]">Total Pending</p>
          <strong className="mt-4 block text-3xl font-black tracking-tight text-orange-600">
            ₹{Number(workflowSummary.total_remaining_payment || 0).toLocaleString("en-IN")}
          </strong>
          <p className="mt-3 text-xs text-[#64748b]">Remaining values to be recovered.</p>
        </div>
        <div className={HERO_STAT_CARD}>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#93816a]">Active Workflows</p>
          <strong className="mt-4 block text-3xl font-black tracking-tight text-blue-600">
            {workflowSummary.active_workflow_leads || 0}
          </strong>
          <p className="mt-3 text-xs text-[#64748b]">Leads currently in progress, review or revisions.</p>
        </div>
        <div className={HERO_STAT_CARD}>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#93816a]">Completed Deliverables</p>
          <strong className="mt-4 block text-3xl font-black tracking-tight text-[#0f8c53]">
            {workflowSummary.completed_workflow_leads || 0}
          </strong>
          <p className="mt-3 text-xs text-[#64748b]">Approved or delivered expert projects.</p>
        </div>
      </div>
    </section>
  );
}
