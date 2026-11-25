"use client";

import { useMemo, useState } from "react";

import { formatDateTime, parseJson, titleize } from "./format";
import { Badge, EmptyState, INPUT_CLASS, MetricCard, Notice, PageIntro, Panel } from "./ui";

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
        <div className="tw-buttons min-w-0 space-y-4 pb-10">
          <PageIntro
            title="Audit log"
            description="Every change made on the platform and inside companies: who did it, when, and to what."
            meta={
              <>
                <Badge tone="violet">{logs.filter((log) => !log.company_id).length} platform scoped</Badge>
                <Badge tone="blue">{logs.filter((log) => log.company_id).length} tenant scoped</Badge>
                <Badge tone="rose">{logs.filter((log) => isHighSignalAction(log.action)).length} high-signal actions</Badge>
              </>
            }
          />

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <MetricCard icon="audit" label="Entries" value={logs.length} note="The latest changes loaded here" tone="slate" />
            <MetricCard icon="company" label="Kinds of change" value={actions.length} note="Different actions in this list" tone="blue" />
            <MetricCard icon="security" label="Sensitive" value={logs.filter((log) => isHighSignalAction(log.action)).length} note="Switch-offs, resets, deletes, transfers" tone="rose" />
          </div>

          <Panel
            title="Changes"
            description="Newest first. Search by person, company, ID or details."
            action={
              <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row">
                <input className={`${INPUT_CLASS} lg:w-72`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search person, company, ID or details" />
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
              <div className="-mx-4 overflow-x-auto sm:-mx-5">
                <table className="w-full min-w-[860px] text-left text-[12.5px]">
                  <thead className="border-y border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
                    <tr>{["When", "Change", "By", "Company", "Details"].map((h) => <th key={h} className="px-4 py-2.5 font-bold sm:px-5">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.map((log) => {
                      const sensitive = isHighSignalAction(log.action);
                      return (
                        <tr key={log.audit_id} className={sensitive ? "bg-rose-50/40" : "hover:bg-slate-50"}>
                          <td className="whitespace-nowrap px-4 py-2.5 text-slate-600 sm:px-5">{formatDateTime(log.logged_at)}</td>
                          <td className="px-4 py-2.5 sm:px-5">
                            <span className="flex items-center gap-1.5 font-semibold text-slate-900">{titleize(String(log.action || "activity").replace(/[._]/g, " "))}{sensitive ? <Badge tone="rose">Sensitive</Badge> : null}</span>
                            <span className="block text-[11px] text-slate-400">{log.audit_id}{log.target_user ? ` · on ${log.target_user}` : ""}</span>
                          </td>
                          <td className="px-4 py-2.5 sm:px-5"><span className="block truncate text-slate-800">{log.user_email || "System"}</span><span className="block text-[11px] text-slate-400">{titleize(log.user_role || "platform")}</span></td>
                          <td className="px-4 py-2.5 sm:px-5">{log.company_id ? <Badge tone="blue">{log.company_id}</Badge> : <Badge tone="teal">Platform</Badge>}</td>
                          <td className="max-w-[320px] truncate px-4 py-2.5 text-slate-500 sm:px-5" title={getDetailPreview(log.details)}>{getDetailPreview(log.details)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
