"use client";

import Link from "next/link";

import DashboardIcon from "../../components/dashboard/icons";
import WorkspacePage from "../../components/dashboard/WorkspacePage";

const HERO = "rounded-[36px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(250,241,221,0.98)_44%,_rgba(245,231,193,0.98)_100%)] p-6 shadow-[0_24px_70px_rgba(79,58,22,0.08)] md:p-8";
const PANEL = "rounded-[30px] border border-[#eadfcd] bg-white/84 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)] md:p-6";
const KICKER = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";
const PRIMARY = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#d7b258] bg-[#f3dfab] px-4 py-2.5 text-sm font-semibold text-[#060710] shadow-[0_16px_30px_rgba(203,169,82,0.18)] transition hover:-translate-y-0.5 hover:bg-[#efd48f]";
const GHOST = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#eadfcd] bg-white px-4 py-2.5 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:text-[#060710]";

const money = (value) => `INR ${Number(value || 0).toLocaleString("en-IN")}`;
const when = (value, withTime = false) =>
  !value
    ? "--"
    : new Date(value).toLocaleString(
        "en-IN",
        withTime
          ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
          : { day: "numeric", month: "short", year: "numeric" }
      );
const nice = (value = "") =>
  String(value || "")
    .replaceAll("_", "-")
    .split("-")
    .filter(Boolean)
    .map((item) => item[0].toUpperCase() + item.slice(1))
    .join(" ");
const compact = (value) =>
  new Intl.NumberFormat("en-IN", {
    notation: Number(value || 0) >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
const ownerLabel = (item) => item.assigned_to_name || item.legal_owner_name || item.finance_owner_name || "Unassigned";

function docState(item, role) {
  if (role === "legal-team") {
    const approved = String(item.agreement_status || "pending").toLowerCase() === "approved";
    return {
      label: nice(item.agreement_status || "pending"),
      tone: approved ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return item.invoice_number
    ? { label: "Invoice Ready", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" }
    : { label: "Invoice Pending", tone: "border-amber-200 bg-amber-50 text-amber-700" };
}

export default function DocumentsPage() {
  return (
    <WorkspacePage
      title="Documents"
      eyebrow="Workflow Attachments"
      hideTitle
      allowedRoles={["legal-team", "finance-team"]}
      requestBuilder={() => [{ key: "queue", path: "/workflow/my-assigned?page_size=12" }]}
      heroStats={() => []}
    >
      {({ data, error, loading, session, refresh }) => {
        const queue = data.queue?.items || [];
        const role = session?.user?.role || "";
        const isLegal = role === "legal-team";
        const readyCount = queue.filter((item) => item.agreement_status === "approved" || item.invoice_number).length;
        const pendingCount = queue.filter((item) => item.agreement_status === "pending" || !item.invoice_number).length;
        const docsCount = queue.reduce((sum, item) => sum + Number(item.doc_count || 0), 0);
        const totalValue = queue.reduce((sum, item) => sum + Number(item.invoice_amount || item.estimated_value || 0), 0);
        const queueHref = isLegal ? "/workflow/legal" : "/workflow/finance";

        return (
          <div className="mx-auto grid max-w-[1380px] gap-5">
            {error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}

            {loading ? (
              <div className="grid min-h-[320px] place-items-center rounded-[30px] border border-[#eadfcd] bg-white/82 text-sm text-[#7a6b57]">
                Loading documents...
              </div>
            ) : (
              <>
                <section className={HERO}>
                  <div className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr] xl:items-start">
                    <div className="space-y-5">
                      <div>
                        <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                          Workflow Documents
                        </span>
                        <h2 className="mt-4 text-[2.2rem] font-semibold tracking-tight text-[#060710] md:text-[3.1rem] md:leading-[1.02]">
                          {isLegal
                            ? "Review legal document history without losing queue ownership context."
                            : "Keep invoice documents and closure history visible in one cleaner review surface."}
                        </h2>
                        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#746853] md:text-base">
                          This desk summarizes document-heavy leads assigned to you. Open the queue when you need to add,
                          update, or remove files.
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                          { label: "Assigned Leads", value: compact(queue.length), hint: "Leads carrying document work", icon: "workflow" },
                          { label: "Documents Count", value: compact(docsCount), hint: "Files linked across your queue", icon: "documents" },
                          { label: "Ready", value: compact(readyCount), hint: "Approved or invoice-ready records", icon: "analytics" },
                          { label: "Queue Value", value: money(totalValue), hint: "Commercial value in this desk", icon: "finance" },
                        ].map((item) => (
                          <article key={item.label} className="rounded-[24px] border border-[#eadfcd] bg-white/88 px-4 py-4 shadow-[0_12px_28px_rgba(79,58,22,0.05)]">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className={KICKER}>{item.label}</p>
                                <strong className="mt-3 block text-[1.8rem] font-black leading-none text-[#060710]">{item.value}</strong>
                                <span className="mt-2 block text-xs text-[#8f816a]">{item.hint}</span>
                              </div>
                              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff4d9] text-[#8d6e27]">
                                <DashboardIcon name={item.icon} className="h-5 w-5" />
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 xl:justify-self-end xl:w-full xl:max-w-[500px]">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <button type="button" onClick={refresh} className={GHOST}>
                          <DashboardIcon name="analytics" className="h-4 w-4" />
                          Refresh
                        </button>
                        <Link href={queueHref} className={PRIMARY}>
                          <DashboardIcon name="workflow" className="h-4 w-4" />
                          Open Queue
                        </Link>
                      </div>

                      <div className="rounded-[28px] border border-[#eadfcd] bg-white/86 p-5 shadow-[0_14px_32px_rgba(79,58,22,0.06)]">
                        <p className={KICKER}>Review Focus</p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[20px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                            <p className={KICKER}>Pending</p>
                            <p className="mt-2 text-sm font-semibold text-[#060710]">{compact(pendingCount)} leads</p>
                            <p className="mt-2 text-sm leading-6 text-[#746853]">Still waiting on approval, invoice completion, or document clarity.</p>
                          </div>
                          <div className="rounded-[20px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                            <p className={KICKER}>Where To Work</p>
                            <p className="mt-2 text-sm font-semibold text-[#060710]">{isLegal ? "Legal Queue" : "Finance Queue"}</p>
                            <p className="mt-2 text-sm leading-6 text-[#746853]">This page is the review layer. File actions continue inside the queue workspace.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <article className={PANEL}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className={KICKER}>Assigned Document Work</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">
                        {isLegal ? "Legal document history" : "Finance document history"}
                      </h3>
                    </div>
                    <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fffaf1] px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                      {queue.length} leads
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {queue.length ? (
                      queue.map((item) => {
                        const state = docState(item, role);

                        return (
                          <div key={item.lead_id} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4">
                            <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
                              <div className="min-w-0">
                                <div className="flex flex-wrap gap-2">
                                  <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${state.tone}`}>
                                    {state.label}
                                  </span>
                                  <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                                    {item.doc_count || 0} docs
                                  </span>
                                  <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                                    {nice(item.workflow_stage || (isLegal ? "legal" : "finance"))}
                                  </span>
                                </div>

                                <h4 className="mt-3 text-lg font-semibold text-[#060710]">{item.company_name || "Untitled lead"}</h4>
                                <p className="mt-1 text-sm text-[#746853]">
                                  {item.contact_person || "No contact"} | {ownerLabel(item)}
                                </p>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                  <div className="rounded-[18px] border border-[#eadfcd] bg-white px-3 py-3">
                                    <p className={KICKER}>Owner</p>
                                    <p className="mt-2 text-sm font-semibold text-[#060710]">{ownerLabel(item)}</p>
                                  </div>
                                  <div className="rounded-[18px] border border-[#eadfcd] bg-white px-3 py-3">
                                    <p className={KICKER}>Value</p>
                                    <p className="mt-2 text-sm font-semibold text-[#060710]">{money(item.invoice_amount || item.estimated_value)}</p>
                                  </div>
                                  <div className="rounded-[18px] border border-[#eadfcd] bg-white px-3 py-3">
                                    <p className={KICKER}>{isLegal ? "Agreement" : "Invoice"}</p>
                                    <p className="mt-2 text-sm font-semibold text-[#060710]">
                                      {isLegal ? nice(item.agreement_status || "pending") : item.invoice_number || "Pending"}
                                    </p>
                                  </div>
                                  <div className="rounded-[18px] border border-[#eadfcd] bg-white px-3 py-3">
                                    <p className={KICKER}>Follow-up</p>
                                    <p className="mt-2 text-sm font-semibold text-[#060710]">{when(item.follow_up_date, true)}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-3 xl:justify-end">
                                <Link href={queueHref} className={GHOST}>
                                  <DashboardIcon name="workflow" className="h-4 w-4" />
                                  Open Queue
                                </Link>
                                <Link href={`/leads/${item.lead_id}`} className={GHOST}>
                                  <DashboardIcon name="leads" className="h-4 w-4" />
                                  Open Lead
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-12 text-center text-sm text-[#7a6b57]">
                        No document work assigned.
                      </div>
                    )}
                  </div>
                </article>
              </>
            )}
          </div>
        );
      }}
    </WorkspacePage>
  );
}
