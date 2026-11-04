"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AdminPage from "../../components/layout/AdminPage";
import ReportDrawer, { DownloadIcon } from "../../components/reports/ReportDrawer";
import { useReportLayout } from "../../components/reports/useReportLayout";
import { API_BASE } from "../../lib/api";
import { loadSession } from "../../lib/session";
import InsightsTab from "./InsightsTab";
import WorkflowTab from "./WorkflowTab";

const INSIGHT_ROLES = ["admin", "manager", "marketing"];
const WORKFLOW_ROLES = ["admin", "manager"];
const TABS = [
  { key: "insights", label: "Insights", hint: "Numbers for leads created in the period", roles: INSIGHT_ROLES },
  { key: "workflow", label: "Workflow", hint: "Won leads moving Sales → Legal → Finance → Completed", roles: WORKFLOW_ROLES },
];
const PRESETS = [
  { key: "summary", label: "Pipeline summary", description: "Headline numbers, status and stages", layout: { sheets: ["summary", "status", "workflow"] } },
  { key: "people", label: "Team review", description: "Each owner's leads, won and pipeline", layout: { sheets: ["summary", "owners", "sources"] } },
  { key: "tracker", label: "Workflow list", description: "Every workflow lead with owners and documents", layout: { sheets: ["tracker"] } },
  { key: "all", label: "Everything", description: "All sheets with the usual columns", layout: { sheets: ["summary", "status", "workflow", "owners", "sources", "products", "priority", "trend", "tracker"] } },
];

function PipelinePage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [session, setSession] = useState(null);
  const [insightQuery, setInsightQuery] = useState({ range: "month" });
  const [workflowQuery, setWorkflowQuery] = useState({});
  const [reportOpen, setReportOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [reportError, setReportError] = useState("");

  useEffect(() => {
    const active = loadSession();
    if (!active) return router.replace("/login");
    if (!INSIGHT_ROLES.includes(active.user?.role)) return router.replace("/dashboard");
    setSession(active);
  }, [router]);

  const role = session?.user?.role || "";
  const tabs = TABS.filter((t) => t.roles.includes(role));
  const tab = tabs.some((t) => t.key === params.get("tab")) ? params.get("tab") : "insights";
  const canWorkflow = WORKFLOW_ROLES.includes(role);
  const report = useReportLayout({ token: session?.token, catalogPath: "/leads/analytics/report/columns", storageKey: `greencrm:pipeline-report:${session?.user?.user_id || "me"}`, presets: canWorkflow ? PRESETS : PRESETS.filter((p) => p.key !== "tracker").map((p) => ({ ...p, layout: { sheets: p.layout.sheets.filter((s) => s !== "tracker") } })) });
  const onInsightQuery = useCallback((q) => setInsightQuery(q), []);
  const onWorkflowQuery = useCallback((q) => setWorkflowQuery(q), []);

  const pick = (key) => {
    const next = new URLSearchParams(params.toString());
    next.set("tab", key);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  async function download() {
    setDownloading(true);
    setReportError("");
    try {
      const query = new URLSearchParams(Object.entries({ ...insightQuery, ...(canWorkflow ? workflowQuery : {}) }).filter(([, v]) => v !== undefined && v !== ""));
      const response = await fetch(`${API_BASE}/leads/analytics/report?${query}&${report.query}`, { headers: { Authorization: `Bearer ${session.token}` }, cache: "no-store" });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "The report could not be created.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") || "")?.[1] || "GreenCRM-pipeline.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setReportError(err.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <AdminPage session={session} title="Pipeline" description="How leads are moving: the numbers, and the won deals going through legal and finance"
      actions={<button type="button" onClick={() => setReportOpen(true)} disabled={!session} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-brand-700 px-3.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:opacity-50"><DownloadIcon />Excel report</button>}>
      {tabs.length > 1 ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200">
          {tabs.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => pick(t.key)}
              className={`-mb-px border-b-2 px-1 pb-2.5 pt-1 text-[14px] font-semibold transition ${tab === t.key ? "border-brand-600 text-brand-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
              {t.label}
            </button>
          ))}
          <span className="ml-auto hidden pb-2 text-[12px] text-slate-400 sm:block">{TABS.find((t) => t.key === tab)?.hint}</span>
        </div>
      ) : null}

      {session ? (tab === "workflow" && canWorkflow
        ? <WorkflowTab session={session} onQueryChange={onWorkflowQuery} />
        : <InsightsTab session={session} onQueryChange={onInsightQuery} />) : null}

      <ReportDrawer open={reportOpen} onClose={() => setReportOpen(false)} title="Pipeline report" report={report} onDownload={download} downloading={downloading} error={reportError}
        subtitle={`Uses the filters you set on ${canWorkflow ? "both tabs" : "this page"} · ${{ week: "last 7 days", month: "last 31 days", quarter: "last 92 days", year: "last 365 days" }[insightQuery.range] || "last 31 days"}`} />
    </AdminPage>
  );
}

export default function PipelinePageWrapper() {
  return <Suspense fallback={null}><PipelinePage /></Suspense>;
}
