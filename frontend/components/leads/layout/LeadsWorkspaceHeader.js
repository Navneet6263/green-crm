"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import DashboardIcon from "../../dashboard/icons";
import { DownloadIcon } from "../../reports/ReportDrawer";
import LeadFiltersSection from "../filters/LeadFiltersSection";
import { LEAD_GHOST_BUTTON_CLASS, LEAD_PRIMARY_BUTTON_CLASS } from "../shared/leadPageConstants";
import { LeadColumnMenu } from "../workspace/LeadsTable";
import LeadCardMenu from "../workspace/LeadCardMenu";
import LeadCardGrid from "./LeadCardGrid";
import { LEAD_CARDS } from "../workspace/leadWorkspaceConfig";

function ViewsBar({ views, customViews, activeView, counts, onApply, onSave, onDelete }) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const chip = (on) => `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition ${on ? "bg-brand-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`;
  const countOf = (view, on) => {
    const n = view.count ? counts?.[view.count] : null;
    if (n === null || n === undefined) return null;
    return <span className={`text-[11.5px] tabular-nums ${on ? "text-white/75" : view.tone === "danger" && n ? "font-bold text-rose-600" : "text-slate-400"}`}>{Number(n).toLocaleString("en-IN")}</span>;
  };
  function save(event) {
    event.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim());
    setName("");
    setNaming(false);
  }
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Saved views">
      {views.map((view) => {
        const on = activeView === view.key;
        return <button key={view.key} type="button" role="tab" aria-selected={on} onClick={() => onApply(view)} className={chip(on)}>{view.label}{countOf(view, on)}</button>;
      })}
      {customViews.map((view) => {
        const on = activeView === view.key;
        return (
          <span key={view.key} className={`${chip(on)} !pr-1.5`}>
            <button type="button" onClick={() => onApply(view)} className="font-semibold">{view.label}</button>
            <button type="button" onClick={() => onDelete(view.key)} aria-label={`Remove view ${view.label}`} className={`grid h-5 w-5 place-items-center rounded-full ${on ? "hover:bg-white/20" : "text-slate-400 hover:bg-slate-100"}`}>×</button>
          </span>
        );
      })}
      {naming ? (
        <form onSubmit={save} className="flex shrink-0 items-center gap-1">
          <input autoFocus value={name} maxLength={30} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setNaming(false); }} placeholder="View name"
            className="h-8 w-32 rounded-full border border-brand-300 bg-white px-3 text-[12.5px] outline-none" />
          <button type="submit" className="rounded-full bg-brand-700 px-3 py-1.5 text-[12.5px] font-semibold text-white">Save</button>
        </form>
      ) : (
        <button type="button" onClick={() => setNaming(true)} className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-brand-700 hover:bg-brand-50">+ Save this view</button>
      )}
    </div>
  );
}

export default function LeadsWorkspaceHeader({
  canCreate, canImport, onImport, canManage, counts, filtersProps, ownershipLabel, views, customViews, activeView, onApplyView, onSaveView, onDeleteView,
  viewMode, onViewMode, columns, onColumns, onExport, title, cards, onCards, listMeta,
}) {
  const router = useRouter();
  const available = LEAD_CARDS.filter((card) => !card.managerOnly || canManage);
  const applyKey = (key) => {
    const view = views.find((v) => v.key === key);
    if (view) onApplyView(view);
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-0.5 text-[13px] text-slate-500">{ownershipLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LeadCardMenu cards={cards} onChange={onCards} available={available} />
          <button type="button" onClick={onExport} className={LEAD_GHOST_BUTTON_CLASS}><DownloadIcon />Excel report</button>
          {canImport ? <button className={LEAD_GHOST_BUTTON_CLASS} type="button" onClick={onImport}><DashboardIcon name="documents" className="h-4 w-4" />Bulk upload</button> : null}
          {canCreate ? <Link prefetch={false} href="/leads/new" className={LEAD_PRIMARY_BUTTON_CLASS}><DashboardIcon name="plus" className="h-4 w-4" />Create lead</Link> : null}
        </div>
      </div>

      <LeadCardGrid cards={cards} available={available} onChange={onCards} counts={counts} listMeta={listMeta} activeView={activeView}
        onCardClick={(card) => (card.view ? applyKey(card.view) : router.push(card.href))} />

      <ViewsBar views={views} customViews={customViews} activeView={activeView} counts={counts} onApply={onApplyView} onSave={onSaveView} onDelete={onDeleteView} />

      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-[260px] flex-1"><LeadFiltersSection {...filtersProps} /></div>
        {viewMode === "table" ? <LeadColumnMenu columns={columns} onChange={onColumns} /> : null}
        <div className="flex h-9 rounded-[10px] bg-slate-100 p-0.5" role="tablist" aria-label="List layout">
          {[["table", "Table"], ["board", "Board"]].map(([key, name]) => (
            <button key={key} type="button" role="tab" aria-selected={viewMode === key} onClick={() => onViewMode(key)}
              className={`rounded-[8px] px-3 text-[13px] font-semibold ${viewMode === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{name}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
