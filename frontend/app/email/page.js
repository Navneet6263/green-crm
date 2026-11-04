"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CustomerComposer from "../../components/communications/CustomerComposer";
import { ALLOWED_ROLES } from "../../components/communications/constants";
import DashboardShell from "../../components/dashboard/DashboardShell";
import RepliesList from "../../components/email/RepliesList";
import SentEmails from "../../components/email/SentEmails";
import { apiRequest } from "../../lib/api";
import { loadSession } from "../../lib/session";

const TABS = [["write", "Write to customer"], ["sent", "Sent"], ["replies", "Replies"]];

/** Email: write to customers, every email sent from the CRM (customers and team), and their replies. */
export default function EmailPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState("write");
  const [leadId, setLeadId] = useState("");
  const [inbox, setInbox] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const s = loadSession();
    if (!s) { router.replace("/login?next=/email"); return; }
    setSession(s);
    const params = new URLSearchParams(window.location.search);
    const canWrite = ALLOWED_ROLES.includes(s.user?.role);
    if (TABS.some(([key]) => key === params.get("tab")) && (canWrite || params.get("tab") !== "write")) setTab(params.get("tab"));
    else if (!canWrite) setTab("sent");
    setLeadId(params.get("lead_id") || "");
  }, [router]);

  const pick = (key) => {
    setTab(key);
    setNotice("");
    const url = new URL(window.location.href);
    url.searchParams.set("tab", key);
    if (key !== "sent") url.searchParams.delete("lead_id");
    window.history.replaceState(null, "", url);
  };
  const onInbox = useCallback((value) => setInbox(value || null), []);

  async function testInbox() {
    setSyncing(true);
    setNotice("");
    try {
      const res = await apiRequest("/nudges/inbox/test", { token: session.token, fresh: true });
      setNotice(res.ok ? `✓ Connected: the CRM can read ${res.mailbox}.` : `Not working: ${res.error}`);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setSyncing(false);
    }
  }

  async function syncNow() {
    setSyncing(true);
    setNotice("");
    try {
      const res = await apiRequest("/nudges/inbox/sync", { method: "POST", token: session.token });
      setNotice(res.found ? `${res.found} new repl${res.found === 1 ? "y" : "ies"} found.` : "No new replies.");
    } catch (err) {
      setNotice(err.message);
    } finally {
      setSyncing(false);
    }
  }

  const isAdmin = session?.user?.role === "admin";
  const tabs = ALLOWED_ROLES.includes(session?.user?.role) ? TABS : TABS.filter(([key]) => key !== "write");
  return (
    <DashboardShell session={session} title="Email" hideTitle heroStats={[]}>
      <div className="tw-buttons min-w-0 space-y-4 pb-10">
        <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Email</h1>
            <p className="text-[13px] text-slate-500">Write to customers, see every email sent from the CRM, and the replies</p>
          </div>
          {isAdmin && tab !== "write" ? (
            <span className="flex gap-2">
              <button type="button" onClick={testInbox} disabled={syncing} className="h-9 rounded-[10px] bg-white px-3 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50">Test Microsoft connection</button>
              {inbox?.connected ? <button type="button" onClick={syncNow} disabled={syncing} className="h-9 rounded-[10px] bg-brand-700 px-3 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:opacity-50">{syncing ? "Checking…" : "Check for replies"}</button> : null}
            </span>
          ) : null}
        </div>

        <div className="flex gap-1 overflow-x-auto rounded-[12px] bg-white p-1 ring-1 ring-slate-200 sm:inline-flex" role="tablist" aria-label="Email">
          {tabs.map(([key, name]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => pick(key)}
              className={`shrink-0 rounded-[9px] px-4 py-2 text-[13px] font-semibold ${tab === key ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{name}</button>
          ))}
        </div>

        {tab !== "write" && inbox && !inbox.connected ? (
          <p className="rounded-[12px] bg-amber-50 px-4 py-3 text-[13px] text-amber-900 ring-1 ring-amber-100">
            <b className="font-semibold">Replies are not connected yet.</b> Sent emails show here now. Replies from customers and the team will appear here and on the lead once the Microsoft 365 inbox is connected.
          </p>
        ) : null}
        {isAdmin && inbox?.last_error && tab !== "write" ? <p className="rounded-[12px] bg-rose-50 px-4 py-2 text-[12.5px] text-rose-700">Last inbox check failed: {inbox.last_error}</p> : null}
        {notice ? <p className="text-[12.5px] text-slate-600">{notice}</p> : null}

        {session && tab === "write" ? <CustomerComposer /> : null}
        {session && tab === "sent" ? <SentEmails key={leadId} session={session} initialLeadId={leadId} onInbox={onInbox} /> : null}
        {session && tab === "replies" ? <RepliesList session={session} onInbox={onInbox} /> : null}
      </div>
    </DashboardShell>
  );
}
