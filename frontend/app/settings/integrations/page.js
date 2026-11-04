"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CommunicationSettingsSection from "../../../components/integrations/CommunicationSettingsSection";
import SettingsLayout, { S } from "../../../components/settings/SettingsLayout";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";

const CHANNELS = [["email", "Email sending", "Emails to customers and the team"], ["whatsapp", "WhatsApp", "Send WhatsApp messages from the CRM"], ["sms", "SMS", "Text messages to customers"], ["call", "Calling", "Click-to-call and call logs"]];

function Status({ ok, children }) {
  return <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}><span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`} />{children}</span>;
}

/** Integrations: what is connected (email, Microsoft 365 inbox, WhatsApp, SMS, calling) and how to fix what is not. */
export default function IntegrationsPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [caps, setCaps] = useState(null);
  const [inbox, setInbox] = useState(null);
  const [test, setTest] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const s = loadSession();
    if (!s) { router.replace("/login?next=/settings/integrations"); return; }
    if (!["super-admin", "admin"].includes(s.user?.role)) { router.replace("/settings"); return; }
    setSession(s);
    apiRequest("/capabilities?refresh=1", { token: s.token, fresh: true }).then(setCaps).catch(() => setCaps({}));
    apiRequest("/nudges/config", { token: s.token, fresh: true }).then((c) => setInbox(c?.inbox || null)).catch(() => setInbox(null));
  }, [router]);

  async function testInbox() {
    setTesting(true);
    try { setTest(await apiRequest("/nudges/inbox/test", { token: session.token, fresh: true })); } catch (err) { setTest({ ok: false, error: err.message }); } finally { setTesting(false); }
  }

  const companyId = session?.company?.company_id || session?.user?.company_id;
  return (
    <SettingsLayout session={session} active="integrations">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {CHANNELS.map(([key, name, hint]) => {
          const c = caps?.[key];
          return (
            <div key={key} className={S.cardPad}>
              <p className="text-[14px] font-semibold text-slate-900">{name}</p>
              <div className="mt-1.5">{caps ? <Status ok={c?.enabled}>{c?.enabled ? "Connected" : "Not connected"}</Status> : <span className="block h-5 w-24 animate-pulse rounded-full bg-slate-100" />}</div>
              <p className="mt-1 text-[12.5px] text-slate-500">{hint}</p>
              {c?.enabled ? <p className="mt-2 text-[11.5px] text-slate-400">{c.source === "platform" ? "Through GreenCRM's service" : "Through your own account"}{c.provider ? ` · ${c.provider}` : ""}</p>
                : caps ? <p className="mt-2 text-[11.5px] text-slate-400">{key === "email" ? "Add your mail server (SMTP) in Company, or ask GreenCRM to turn it on." : "Add your provider below, or ask GreenCRM to turn it on."}</p> : null}
            </div>
          );
        })}
      </div>

      <section className={S.cardPad}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={S.sectionTitle}>Microsoft 365 inbox (email replies)</h2>
            <p className="mt-0.5 text-[12.5px] text-slate-500">Reads replies to emails sent from the CRM and shows them under Email → Replies and on the lead.</p>
          </div>
          {inbox ? <Status ok={inbox.connected}>{inbox.connected ? `Set up for ${inbox.mailbox}` : "Not set up"}</Status> : null}
        </div>
        {test ? <p className={`mt-3 rounded-[10px] px-3 py-2 text-[12.5px] ${test.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{test.ok ? `✓ Working: the CRM can read ${test.mailbox}.` : `Not working: ${test.error}`}</p> : null}
        {inbox?.last_error ? <p className="mt-2 text-[12px] text-rose-700">Last check failed: {inbox.last_error}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={testInbox} disabled={testing || !session} className={S.primary}>{testing ? "Testing…" : "Test connection"}</button>
          <Link href="/email?tab=replies" prefetch={false} className={S.ghost}>Open replies</Link>
        </div>
        <details className="mt-3 rounded-[10px] bg-slate-50 px-3 py-2 text-[12.5px] text-slate-600">
          <summary className="cursor-pointer font-semibold text-slate-700">How to set it up</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Azure portal → App registrations → your app → Overview: copy the <b>Application (client) ID</b> and <b>Directory (tenant) ID</b>.</li>
            <li>Certificates &amp; secrets → New client secret → copy the <b>Value</b> (not the Secret ID).</li>
            <li>API permissions → Microsoft Graph → Application → <b>Mail.Read</b> → Grant admin consent.</li>
            <li>Put them in the server&apos;s <code>.env</code> as MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET, MS_GRAPH_MAILBOX, restart, then Test connection.</li>
          </ol>
        </details>
      </section>

      {companyId ? (
        <section className={S.cardPad}>
          <h2 className={S.sectionTitle}>WhatsApp, SMS and calling providers</h2>
          <p className="mb-3 mt-0.5 text-[12.5px] text-slate-500">Your own provider keys, or the GreenCRM service if it is turned on for your company.</p>
          <CommunicationSettingsSection companyId={companyId} token={session?.token} title="" description="" canEditIntegrations canEditPermissions={session?.user?.role === "super-admin"} platformRoot={companyId === "platform-root"} />
        </section>
      ) : null}
    </SettingsLayout>
  );
}
