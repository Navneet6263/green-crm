"use client";

import { useMemo, useState } from "react";

import { apiRequest } from "../../lib/api";
import { formatDateTime, titleize } from "./format";
import {
  Badge,
  EmptyState,
  INPUT_CLASS,
  MetricCard,
  MetricGrid,
  Notice,
  PageIntro,
  Panel,
  SECONDARY_BUTTON_CLASS,
} from "./ui";

export default function DemoRequestsContent({ session, data, error, loading, refresh }) {
  const requests = data.requests?.items || [];
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState("");
  const [notice, setNotice] = useState(null);
  const filteredRequests = useMemo(() => {
    const search = query.trim().toLowerCase();
    return requests.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [item.name, item.email, item.company, item.phone, item.message]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }, [query, requests, statusFilter]);

  async function updateRequestStatus(request, nextStatus) {
    setUpdatingId(String(request.id));
    setNotice(null);

    try {
      await apiRequest(`/demo-requests/${request.id}`, {
        method: "PATCH",
        token: session.token,
        body: { status: nextStatus },
      });
      setNotice({ tone: "success", text: `${request.name} is now marked ${nextStatus}.` });
      await refresh();
    } catch (requestError) {
      setNotice({ tone: "error", text: requestError.message });
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <>
      <Notice tone="error" text={error} className="mb-4" />
      {notice ? <Notice tone={notice.tone} text={notice.text} className="mb-4" /> : null}
      {loading ? <Notice tone="info" text="Loading demo request queue..." className="mb-4" /> : null}

      {!loading ? (
        <div className="space-y-6">
          <PageIntro
            eyebrow="Inbound Demand"
            title="Demo requests and first-response control"
            description="Super Admin can see the full inbound queue, qualify demand quickly, and keep top-of-funnel response times under control."
            meta={
              <>
                <Badge tone="amber">{requests.filter((item) => item.status === "pending").length} pending</Badge>
                <Badge tone="emerald">{requests.filter((item) => item.status !== "pending").length} reviewed</Badge>
              </>
            }
          />

          <MetricGrid className="2xl:grid-cols-3">
            <MetricCard icon="demo" label="Requests" value={requests.length} note="Total records in the current inbox sample." tone="violet" />
            <MetricCard icon="company" label="Companies" value={new Set(requests.map((item) => item.company).filter(Boolean)).size} note="Distinct companies represented in the current queue." tone="blue" />
            <MetricCard icon="message" label="Pending Review" value={requests.filter((item) => item.status === "pending").length} note="Requests that still need human response or routing." tone="amber" />
          </MetricGrid>

          <Panel
            eyebrow="Queue"
            title="Review, qualify, and close the loop"
            description="Search by contact, company, or message. Mark requests reviewed once the platform team has taken ownership."
            action={
              <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row">
                <input className={INPUT_CLASS} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, company, phone, or note" />
                <select className={INPUT_CLASS} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                </select>
              </div>
            }
          >
            {filteredRequests.length ? (
              <div className="space-y-3">
                {filteredRequests.map((request) => (
                  <div key={request.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-base text-slate-900">{request.name}</strong>
                          <Badge tone={request.status === "pending" ? "amber" : "emerald"}>{titleize(request.status || "pending")}</Badge>
                          {request.company ? <Badge tone="blue">{request.company}</Badge> : null}
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{request.email} | {request.phone || "No phone captured"}</p>
                        <p className="mt-3 text-sm leading-6 text-slate-500">{request.message || "No extra qualification note attached to this request."}</p>
                        <p className="mt-3 text-xs text-slate-500">Requested {formatDateTime(request.created_at)}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <a href={`mailto:${request.email}`} className={SECONDARY_BUTTON_CLASS}>
                          Email
                        </a>
                        {request.status === "pending" ? (
                          <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => updateRequestStatus(request, "reviewed")} disabled={updatingId === String(request.id)}>
                            {updatingId === String(request.id) ? "Updating..." : "Mark Reviewed"}
                          </button>
                        ) : (
                          <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => updateRequestStatus(request, "pending")} disabled={updatingId === String(request.id)}>
                            {updatingId === String(request.id) ? "Updating..." : "Reopen"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="demo" title="No matching demo requests" description="Try a different search term or status filter to surface the request you want to review." />
            )}
          </Panel>
        </div>
      ) : null}
    </>
  );
}
