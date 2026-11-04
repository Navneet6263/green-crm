"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import { cleanSubject, when } from "./EmailThread";

/** Every reply to CRM emails, newest first, from customers and from the team. */
export default function RepliesList({ session, onInbox }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!session?.token) return;
    apiRequest("/nudges/replies?limit=60", { token: session.token, fresh: true })
      .then((res) => { setData(res); onInbox?.(res.inbox); })
      .catch((err) => setError(err.message || "Replies could not load."));
  }, [session?.token, onInbox]);

  if (error) return <p role="alert" className="rounded-[12px] bg-rose-50 px-4 py-3 text-[13px] text-rose-700">{error}</p>;
  if (!data) return <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-[12px] bg-white ring-1 ring-slate-200" />)}</div>;
  if (!data.items.length) {
    return (
      <div className="rounded-[14px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <p className="text-[15px] font-semibold text-slate-700">No replies yet</p>
        <p className="mt-1 text-[13px] text-slate-500">{data.inbox?.connected ? "Replies to emails sent from the CRM will show here." : "Replies will show here once the Microsoft 365 inbox is connected."}</p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {data.items.map((r) => (
        <li key={r.id} className="rounded-[12px] bg-white p-4 ring-1 ring-slate-200">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[13.5px] font-semibold text-slate-900">
              {r.from_name || r.from_email}
              <span className={`ml-2 rounded-full px-1.5 align-middle text-[10.5px] font-bold ${r.kind === "customer" ? "bg-sky-50 text-sky-700" : "bg-gold-50 text-gold-800"}`}>{r.kind === "customer" ? "Customer" : "Team"}</span>
            </p>
            <span className="text-[11.5px] text-slate-400">{when(r.received_at)}</span>
          </div>
          <p className="mt-0.5 truncate text-[12px] text-slate-500">Re: {cleanSubject(r.nudge_subject)}</p>
          <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-700">{r.body_text || "(no text)"}</p>
          {r.link_path ? <Link href={r.link_path} prefetch={false} className="mt-2 inline-block text-[12.5px] font-semibold text-brand-700 hover:underline">{r.customer_id ? "Open customer" : r.kind === "person" ? "Open report" : "Open lead"}</Link> : null}
        </li>
      ))}
    </ul>
  );
}
