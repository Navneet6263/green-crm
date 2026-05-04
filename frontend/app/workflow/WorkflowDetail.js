"use client";

import Link from "next/link";
import DashboardIcon from "../../components/dashboard/icons";
import { API_BASE } from "../../lib/api";
import { T, Pill, STAGE_PILL, STATUS_PILL, PRIORITY_PILL } from "./workflow-tokens";
import { compact, formatDuration, money, titleize, when } from "./workflow-utils";

function MetricCell({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3">
      <p className={T.kicker}>{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

function Timeline({ title, items, empty }) {
  return (
    <div>
      <p className={`${T.kicker} mb-3`}>{title}</p>
      {items.length ? (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-400 mt-2" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{item.copy}</p>
                <p className="mt-1 text-[11px] font-semibold text-amber-700">{item.meta}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">{empty}</p>
      )}
    </div>
  );
}

export function WorkflowDetail({ selectedLead, analysis, detailLoading }) {
  if (!selectedLead) {
    return (
      <div className={`${T.panel} flex min-h-[320px] flex-col items-center justify-center gap-3 px-5 py-8 text-center`}>
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-400">
          <DashboardIcon name="workflow" className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700">Select a lead to inspect</p>
        <p className="max-w-xs text-xs text-slate-400">
          {detailLoading ? "Loading selected lead…" : "Click any lead in the queue to see stage pressure, transfer trail, doc gaps, and movement history."}
        </p>
      </div>
    );
  }

  const owner = selectedLead.assigned_to_name || selectedLead.legal_owner_name || selectedLead.finance_owner_name || "Unassigned";
  const docs = [...(selectedLead.legal_documents || []), ...(selectedLead.finance_documents || [])].slice(0, 6);

  const stageHistory = (selectedLead.stage_history || []).map(item => ({
    title: titleize(item.stage || "sales"),
    copy: item.exited_at ? `Entered ${when(item.entered_at, true)} · Exited ${when(item.exited_at, true)}` : `Entered ${when(item.entered_at, true)} · Still active`,
    meta: formatDuration(item.duration),
  }));

  const transferTrail = (selectedLead.transfer_history || []).map(item => ({
    title: `${titleize(item.from_stage)} → ${titleize(item.to_stage)}`,
    copy: `${item.transferred_by_name || "Team"} → ${item.transferred_to_name || "next owner"}${item.notes ? ` · ${item.notes}` : ""}`,
    meta: when(item.transferred_at, true),
  }));

  const score = analysis?.score || 0;
  const scoreTone = score >= 82 ? "text-rose-600 bg-rose-50 border-rose-200" : score >= 64 ? "text-amber-700 bg-amber-50 border-amber-200" : "text-emerald-700 bg-emerald-50 border-emerald-200";

  return (
    <div className={`${T.panel} space-y-5 px-5 py-5`}>
      {/* Lead identity */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={T.kicker}>Selected Lead</p>
          <h2 className="mt-0.5 text-lg font-bold text-slate-900">{selectedLead.company_name || "Untitled lead"}</h2>
          <p className="text-xs text-slate-400">{selectedLead.contact_person || "No contact"} · {owner} · {selectedLead.email || "No email"}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Pill label={titleize(selectedLead.workflow_stage || "sales")} map={STAGE_PILL} />
          <Pill label={titleize(selectedLead.status || "new")} map={STATUS_PILL} />
          <Pill label={titleize(selectedLead.priority || "medium")} map={PRIORITY_PILL} />
        </div>
      </div>

      {/* Attention score */}
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${scoreTone}`}>
        <div className="text-2xl font-bold">{score}</div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest">{analysis?.tone || "Stable"}</p>
          <p className="text-xs">{analysis?.customerSignal || "—"}</p>
        </div>
        {analysis?.flags?.length ? (
          <div className="ml-auto flex flex-wrap gap-1.5">
            {analysis.flags.map(f => <span key={f} className="rounded-full border border-current/20 bg-white/60 px-2 py-0.5 text-[10px] font-semibold">{f}</span>)}
          </div>
        ) : null}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        {(analysis?.metrics || []).map(m => <MetricCell key={m.label} label={m.label} value={m.value} />)}
      </div>

      {/* Signals */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3">
          <p className={T.kicker}>Customer Signal</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">{analysis?.customerSignal || "—"}</p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3">
          <p className={T.kicker}>Latest Note</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">{selectedLead.latest_note || "No note yet."}</p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          ["Source", titleize(selectedLead.lead_source || "unknown")],
          ["Product", selectedLead.product_name || "Not mapped"],
          ["Value", money(selectedLead.invoice_amount || selectedLead.estimated_value)],
          ["Legal Owner", selectedLead.legal_owner_name || "Unassigned"],
          ["Finance Owner", selectedLead.finance_owner_name || "Unassigned"],
          ["Requirements", selectedLead.requirements || "None captured"],
        ].map(([l, v]) => <MetricCell key={l} label={l} value={v} />)}
      </div>

      {/* Stage history */}
      <Timeline title="Stage History" items={stageHistory} empty="No stage history recorded yet." />

      {/* Transfer trail */}
      <Timeline title="Transfer Trail" items={transferTrail} empty="No transfer trail recorded yet." />

      {/* Documents */}
      <div>
        <p className={`${T.kicker} mb-3`}>Documents</p>
        {docs.length ? (
          <div className="space-y-2">
            {docs.map((doc, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{doc.file_name || "Document"}</p>
                  <p className="text-xs text-slate-400">{doc.uploaded_by_name || "Team"} · {when(doc.uploaded_at, true)}</p>
                </div>
                <a
                  href={doc.file_url?.startsWith("http") ? doc.file_url : `${API_BASE}${doc.file_url || ""}`}
                  target="_blank" rel="noreferrer"
                  className={T.btn}
                >Open</a>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">No workflow documents uploaded yet.</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 border-t border-slate-50 pt-3">
        <Link href={`/leads/${selectedLead.lead_id}`} className={T.gold}>
          <DashboardIcon name="leads" className="h-4 w-4" />Open Lead
        </Link>
        <Link href="/analytics" className={T.btn}>
          <DashboardIcon name="analytics" className="h-4 w-4" />Analytics
        </Link>
      </div>
    </div>
  );
}
