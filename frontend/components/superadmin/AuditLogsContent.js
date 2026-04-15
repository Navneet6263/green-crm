"use client";

import { useMemo, useState } from "react";

import { formatDateTime, parseJson, titleize } from "./format";
import { Badge, EmptyState, INPUT_CLASS, MetricCard, MetricGrid, Notice, PageIntro, Panel } from "./ui";

function getDetailPreview(details) {
  const parsed = parseJson(details);
  const entries = Object.entries(parsed).slice(0, 3);
  return entries.length ? entries.map(([key, value]) => `${key}: ${String(value)}`).join(" | ") : "No structured details captured.";
}

function isHighSignalAction(action = "") {
  return /(deactivate|suspend|reset|super_admin|delete|archive|transfer)/i.test(action);
}

export default function AuditLogsContent({ data, error, loading }) {
  const logs = data.logs?.items || [];
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const actions = useMemo(() => [...new Set(logs.map((log) => log.action).filter(Boolean))].sort(), [logs]);
  const filteredLogs = useMemo(() => {
    const search = query.trim().toLowerCase();
    return logs.filter((log) => {
      if (actionFilter !== "all" && log.action !== actionFilter) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [log.action, log.user_email, log.user_role, log.company_id, log.audit_id, getDetailPreview(log.details)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }, [actionFilter, logs, query]);

  return (
    <>
      <Notice tone="error" text={error} className="mb-4" />
      {loading ? <Notice tone="info" text="Loading audit stream..." className="mb-4" /> : null}

      {!loading ? (
        <div className="space-y-6">
          <PageIntro
            eyebrow="Platform Audit Trail"
            title="Audit stream for security and operational review"
            description="Every platform-side intervention should be easy to scan, search, and verify when a tenant asks what changed."
            meta={
              <>
                <Badge tone="violet">{logs.filter((log) => !log.company_id).length} platform scoped</Badge>
                <Badge tone="blue">{logs.filter((log) => log.company_id).length} tenant scoped</Badge>
                <Badge tone="rose">{logs.filter((log) => isHighSignalAction(log.action)).length} high-signal actions</Badge>
              </>
            }
          />

          <MetricGrid className="2xl:grid-cols-3">
            <MetricCard icon="audit" label="Recent Entries" value={logs.length} note="Latest audit batch loaded into the console." tone="slate" />
            <MetricCard icon="company" label="Unique Actions" value={actions.length} note="Distinct action types appearing in this recent stream." tone="blue" />
            <MetricCard icon="security" label="High-Signal" value={logs.filter((log) => isHighSignalAction(log.action)).length} note="Actions that typically mean recovery, restriction, or privileged change." tone="rose" />
          </MetricGrid>

          <Panel
            eyebrow="Audit Stream"
            title="Searchable platform timeline"
            description="Filter by action or search by email, role, company, ID, or captured details."
            action={
              <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row">
                <input className={INPUT_CLASS} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search action, email, role, company, ID, or details" />
                <select className={INPUT_CLASS} value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
                  <option value="all">All actions</option>
                  {actions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </div>
            }
          >
            {filteredLogs.length ? (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div key={log.audit_id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-base text-slate-900">{titleize(log.action || "activity")}</strong>
                          <Badge tone={log.company_id ? "blue" : "violet"}>{log.company_id || "Platform"}</Badge>
                          <Badge tone={isHighSignalAction(log.action) ? "rose" : "slate"}>{isHighSignalAction(log.action) ? "High signal" : "Normal"}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{log.user_email || "System"} | {log.user_role || "platform"} | {formatDateTime(log.logged_at)}</p>
                        <p className="mt-3 text-sm leading-6 text-slate-500">{getDetailPreview(log.details)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone="slate">{log.audit_id}</Badge>
                        {log.target_user ? <Badge tone="amber">{log.target_user}</Badge> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="audit" title="No matching audit entries" description="Try another action filter or search term to find the platform event you want to inspect." />
            )}
          </Panel>
        </div>
      ) : null}
    </>
  );
}
