"use client";

import { useEffect, useMemo, useState } from "react";
import LeadQuickStatusControl from "../LeadQuickStatusControl";
import { STATUS_TONE } from "../shared/leadPageConstants";
import { buildQueryPath, leadPrimaryName, leadSecondaryName, titleizeLeadValue } from "../shared/leadPageFormatters";
import { apiRequest } from "../../../lib/api";
import { LEAD_STATUS_ORDER, getLeadStatusLabel } from "../../../lib/leadStatus";
import { FollowUpChip, LeadAvatar } from "./LeadsTable";
import { moneyShort } from "./leadWorkspaceConfig";

const BOARD_LIMIT = 300;
const PRIORITY_BAR = { urgent: "bg-rose-500", high: "bg-amber-500", medium: "bg-sky-400", low: "bg-slate-300" };

/** Status columns; dragging a card opens the normal status dialog so the note and follow-up are not skipped. */
export default function LeadsBoard({ token, queryBase, enabledStatuses, canEdit, teamUsers, selectedId, onOpen, onStatusUpdated, seed }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dragId, setDragId] = useState("");
  const [overStatus, setOverStatus] = useState("");
  const [moving, setMoving] = useState(null);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    setLoading(true);
    setError("");
    apiRequest(buildQueryPath("/leads", { ...queryBase, page: 1, page_size: BOARD_LIMIT, full_fetch: 1, include_workflow_summary: "0" }), { token, fresh: true })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items || []);
        setTotal(Number(res.meta?.total || 0));
      })
      .catch((err) => { if (!cancelled) setError(err.message || "The board could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, queryBase, seed]);

  const statuses = enabledStatuses.length ? enabledStatuses : LEAD_STATUS_ORDER;
  const columns = useMemo(() => {
    const known = [...statuses, ...new Set(items.map((l) => l.status).filter((s) => s && !statuses.includes(s)))];
    return known.map((status) => {
      const leads = items.filter((l) => (l.status || "new") === status);
      return { status, leads, value: leads.reduce((sum, l) => sum + Number(l.estimated_value || 0), 0) };
    });
  }, [items, statuses]);

  function drop(status) {
    const lead = items.find((l) => l.lead_id === dragId);
    setDragId("");
    setOverStatus("");
    if (!lead || lead.status === status) return;
    setMoving({ lead, status });
  }

  function updated(next) {
    setItems((current) => current.map((l) => (l.lead_id === next.lead_id ? { ...l, ...next } : l)));
    onStatusUpdated(next);
  }

  if (error) return <div role="alert" className="rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">{error}</div>;

  return (
    <section className={`transition-opacity ${loading ? "opacity-60" : ""}`}>
      {total > items.length ? (
        <p className="mb-2 rounded-[10px] bg-gold-50 px-3 py-2 text-[12.5px] text-gold-900 ring-1 ring-gold-200">
          Board shows the latest {items.length} of {total.toLocaleString("en-IN")} leads. Add a filter, or use the table to see everything.
        </p>
      ) : null}
      <div className="flex gap-3 overflow-x-auto pb-3">
        {columns.map(({ status, leads, value }) => {
          const tone = STATUS_TONE[status] || STATUS_TONE.new;
          return (
            <div key={status}
              onDragOver={(e) => { if (dragId) { e.preventDefault(); setOverStatus(status); } }}
              onDragLeave={() => setOverStatus((s) => (s === status ? "" : s))}
              onDrop={(e) => { e.preventDefault(); drop(status); }}
              className={`flex max-h-[70vh] w-[268px] shrink-0 flex-col rounded-[14px] transition ${overStatus === status ? "bg-brand-50 ring-2 ring-brand-300" : "bg-slate-100/70"}`}>
              <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: tone[1] }} />
                  <span className="truncate text-[13px] font-bold text-slate-800">{getLeadStatusLabel(status)}</span>
                  <span className="rounded-full bg-white px-1.5 text-[11.5px] font-semibold text-slate-500">{leads.length}</span>
                </span>
                {value ? <span className="whitespace-nowrap text-[11.5px] font-semibold tabular-nums text-slate-500">{moneyShort(value)}</span> : null}
              </div>
              <div className="min-h-[80px] flex-1 space-y-2 overflow-y-auto px-2 pb-2">
                {leads.map((lead) => {
                  const canDrag = canEdit && !lead.is_workflow;
                  const secondary = leadSecondaryName(lead);
                  return (
                    <article key={lead.lead_id} draggable={canDrag} onDragStart={() => setDragId(lead.lead_id)} onDragEnd={() => { setDragId(""); setOverStatus(""); }}
                      onClick={() => onOpen(lead.lead_id)}
                      className={`relative overflow-hidden rounded-[10px] bg-white p-2.5 pl-3 shadow-sm ring-1 transition hover:shadow-md ${canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${selectedId === lead.lead_id ? "ring-2 ring-brand-500" : "ring-slate-200"} ${dragId === lead.lead_id ? "opacity-40" : ""}`}>
                      <span className={`absolute inset-y-0 left-0 w-[3px] ${PRIORITY_BAR[lead.priority] || PRIORITY_BAR.medium}`} title={`${titleizeLeadValue(lead.priority || "medium")} priority`} />
                      <div className="flex items-start gap-2">
                        <LeadAvatar lead={lead} size="h-7 w-7 text-[10.5px]" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-slate-900">{leadPrimaryName(lead)}</p>
                          {secondary ? <p className="truncate text-[11.5px] text-slate-500">{secondary}</p> : null}
                        </div>
                      </div>
                      <div className="mt-2 flex items-end justify-between gap-2">
                        <FollowUpChip lead={lead} />
                        {Number(lead.estimated_value) ? <span className="text-[12px] font-semibold tabular-nums text-slate-700">{moneyShort(lead.estimated_value)}</span> : null}
                      </div>
                      <p className="mt-1.5 truncate border-t border-slate-100 pt-1.5 text-[11.5px] text-slate-500">{lead.assigned_to_name || "Unassigned"}</p>
                    </article>
                  );
                })}
                {!leads.length ? <p className="py-5 text-center text-[12px] text-slate-400">{dragId ? "Drop here" : "No leads"}</p> : null}
              </div>
            </div>
          );
        })}
      </div>
      {moving ? (
        <LeadQuickStatusControl assigneeOptions={teamUsers} enabledStatuses={enabledStatuses} lead={moving.lead} token={token} onUpdated={updated}
          requestedStatus={moving.status} hideSelect onDialogClosed={() => setMoving(null)} />
      ) : null}
    </section>
  );
}
