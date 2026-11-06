"use client";

import { useState } from "react";
import DeliveriesDrawer from "./DeliveriesDrawer";
import WebhookEditor from "./WebhookEditor";
import { Badge, CodeBlock, CopyButton, D, Empty, Notice, Tabs, ago, fmt } from "./dev-ui";
import { SAMPLE_EVENT, VERIFY } from "./webhookExamples";

function Secret({ value }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-[10px] bg-slate-50 p-1.5 pl-3 ring-1 ring-slate-200">
      <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-slate-700">{shown ? value : `${value.slice(0, 8)}••••••••••••••••`}</code>
      <button type="button" className={D.small} onClick={() => setShown((s) => !s)}>{shown ? "Hide" : "Show"}</button>
      <CopyButton text={value} />
    </div>
  );
}

/** Outgoing webhooks: one card per address, with its numbers, secret and actions. */
export default function WebhooksTab({ dev, editorOpen, setEditorOpen }) {
  const [editing, setEditing] = useState(null);
  const [deliveriesFor, setDeliveriesFor] = useState(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState(null);
  const [lang, setLang] = useState("0");
  const events = dev.overview?.events || {};

  async function act(id, run, done) {
    setBusy(id);
    setNotice(null);
    try {
      await run();
      setNotice({ tone: "success", text: done });
    } catch (err) {
      setNotice({ tone: "error", text: err.message });
    } finally {
      setBusy("");
    }
  }
  const open = (hook) => { setEditing(hook); setEditorOpen(true); };

  return (
    <div className="space-y-4">
      <Notice notice={notice} onClose={() => setNotice(null)} />
      {!dev.hooks.length ? (
        <Empty title="No webhooks yet" text="A webhook tells your other software the moment a lead is added, changes status, gets a new owner or a note. No need for your app to keep asking."
          action={<button type="button" className={D.primary} onClick={() => open(null)}>New webhook</button>} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {dev.hooks.map((hook) => (
            <article key={hook.webhook_id} className={`${D.panel} flex flex-col p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[15px] font-bold text-slate-900">{hook.name}</p>
                    <Badge tone={hook.is_active ? (hook.failure_streak ? "amber" : "green") : "red"}>{hook.is_active ? (hook.failure_streak ? "Failing" : "On") : "Off"}</Badge>
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[11.5px] text-slate-500" title={hook.url}>{hook.url}</p>
                </div>
                <button type="button" role="switch" aria-checked={hook.is_active} aria-label={hook.is_active ? "Turn off" : "Turn on"} disabled={busy === hook.webhook_id}
                  onClick={() => act(hook.webhook_id, () => dev.saveHook(hook.webhook_id, { is_active: !hook.is_active }), hook.is_active ? "Webhook turned off." : "Webhook turned on.")}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${hook.is_active ? "bg-brand-700" : "bg-slate-300"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${hook.is_active ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>

              {hook.disabled_reason ? <p className="mt-2 rounded-[10px] bg-rose-50 px-3 py-2 text-[12px] text-rose-800 ring-1 ring-rose-100">{hook.disabled_reason}</p> : null}

              <div className="mt-3 flex flex-wrap gap-1">{hook.events.map((e) => <Badge key={e} tone="teal">{e}</Badge>)}</div>

              <div className="mt-3 grid grid-cols-4 gap-2 rounded-[12px] bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
                {[["Delivered", fmt(hook.sent_7d)], ["Failed", fmt(hook.failed_7d)], ["Waiting", fmt(hook.pending)], ["Last OK", ago(hook.last_success_at)]].map(([label, value]) => (
                  <div key={label} className="min-w-0"><p className="text-[11px] font-semibold text-slate-400">{label}</p><p className="truncate text-[13.5px] font-bold text-slate-900">{value}</p></div>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Last 7 days</p>

              <div className="mt-2"><p className={D.kicker}>Signing secret</p><div className="mt-1"><Secret value={hook.secret} /></div></div>

              <div className="mt-auto flex flex-wrap gap-2 pt-3">
                <button type="button" className={D.primary} disabled={busy === hook.webhook_id} onClick={() => act(hook.webhook_id, () => dev.pingHook(hook.webhook_id), "Test sent. It shows in Deliveries within a minute.")}>Send test</button>
                <button type="button" className={D.small} onClick={() => setDeliveriesFor(hook)}>Deliveries</button>
                <button type="button" className={D.small} onClick={() => open(hook)}>Edit</button>
                <button type="button" className={D.small} disabled={busy === hook.webhook_id} onClick={() => {
                  if (window.confirm("Make a new signing secret? Calls are signed with the new one at once, so update your app right after.")) act(hook.webhook_id, () => dev.rotateHookSecret(hook.webhook_id), "New secret made. Copy it into your app.");
                }}>New secret</button>
                <button type="button" className={D.danger} disabled={busy === hook.webhook_id} onClick={() => {
                  if (window.confirm(`Delete "${hook.name}"? Its delivery history goes too.`)) act(hook.webhook_id, () => dev.deleteHook(hook.webhook_id), "Webhook deleted.");
                }}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}

      <section className={`${D.panel} grid gap-4 p-4 xl:grid-cols-2`}>
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-slate-900">What your app receives</p>
          <p className="mt-0.5 text-[12.5px] text-slate-500">A POST with this JSON, plus the headers X-GreenCRM-Event, X-GreenCRM-Event-Id and X-GreenCRM-Signature.</p>
          <div className="mt-3"><CodeBlock title="lead.status_changed" code={SAMPLE_EVENT} /></div>
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-slate-900">Check the signature</p>
          <p className="mt-0.5 text-[12.5px] text-slate-500">Refuse any call whose signature does not match, or that is older than 5 minutes.</p>
          <div className="mt-3 space-y-2">
            <Tabs items={VERIFY.map(([label], i) => [String(i), label])} value={lang} onChange={setLang} size="sm" />
            <CodeBlock title={VERIFY[Number(lang)][0]} code={VERIFY[Number(lang)][1]} />
          </div>
        </div>
      </section>

      <WebhookEditor open={editorOpen} hook={editing} events={events} onClose={() => { setEditorOpen(false); setEditing(null); }}
        onSave={async (id, body) => {
          await dev.saveHook(id, body);
          setNotice({ tone: "success", text: id ? "Webhook saved." : "Webhook created. Copy its signing secret into your app, then press Send test." });
        }} />
      <DeliveriesDrawer hook={deliveriesFor} dev={dev} onClose={() => setDeliveriesFor(null)} />
    </div>
  );
}
