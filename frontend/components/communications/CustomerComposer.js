"use client";

import { useEffect, useState } from "react";
import ContactHeader from "./ContactHeader";
import ContactList from "./ContactList";
import EmailChannel from "./EmailChannel";
import { lockFor } from "./LockedSend";
import { CallChannel, MessageChannel } from "./PhoneChannels";
import { useCommunicationWorkspace } from "./useCommunicationWorkspace";

const CHANNELS = [
  ["email", "Email", "M3 6h18v12H3zM3 7l9 6 9-6"],
  ["whatsapp", "WhatsApp", "M21 12a9 9 0 0 1-13.5 7.8L3 21l1.2-4.5A9 9 0 1 1 21 12"],
  ["sms", "SMS", "M4 5h16v11H8l-4 3V5Z"],
  ["call", "Call", "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"],
];

/** "Write to customer": contacts on the left, the conversation tools for the picked one on the right. */
export default function CustomerComposer() {
  const w = useCommunicationWorkspace();
  const [channel, setChannel] = useState("email");
  const [showList, setShowList] = useState(true);
  const record = w.selectedRecord;
  useEffect(() => { setChannel(record && !record.email && record.phone ? "whatsapp" : "email"); }, [record?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (key) => { w.setSelectedKey(key); setShowList(false); };

  if (w.loading) {
    return <div className="grid h-[520px] grid-cols-1 gap-0 overflow-hidden rounded-[16px] bg-white ring-1 ring-slate-200 lg:grid-cols-[340px_1fr]">
      <div className="space-y-2 border-r border-slate-100 p-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 animate-pulse rounded-[10px] bg-slate-100" />)}</div>
      <div className="hidden p-5 lg:block"><div className="h-20 animate-pulse rounded-[12px] bg-slate-100" /><div className="mt-4 h-64 animate-pulse rounded-[12px] bg-slate-100" /></div>
    </div>;
  }

  return (
    <div className="space-y-3">
      {w.error ? <p role="alert" className="rounded-[12px] bg-rose-50 px-4 py-2.5 text-[13px] font-medium text-rose-700 ring-1 ring-rose-100">{w.error}</p> : null}
      {w.message ? <p role="status" className="rounded-[12px] bg-emerald-50 px-4 py-2.5 text-[13px] font-medium text-emerald-800 ring-1 ring-emerald-100">✓ {w.message}</p> : null}
      <div className="grid min-h-[600px] grid-cols-1 overflow-hidden rounded-[16px] bg-white ring-1 ring-slate-200 lg:h-[calc(100dvh-230px)] lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className={`min-h-0 border-slate-100 lg:block lg:border-r ${showList || !record ? "block" : "hidden"}`}>
          <ContactList w={{ ...w, setSelectedKey: pick }} />
        </aside>
        <section className={`min-h-0 flex-col bg-[#f7f8f7] lg:flex ${showList && record ? "hidden" : "flex"}`}>
          {record ? (
            <>
              <ContactHeader record={record} onBack={() => setShowList(true)} />
              <div className="flex gap-1 overflow-x-auto border-b border-slate-100 bg-white px-3 sm:px-4" role="tablist" aria-label="Channel">
                {CHANNELS.map(([key, name, icon]) => {
                  const on = channel === key;
                  const ok = !lockFor(w.session, w.capabilities, key);
                  return (
                    <button key={key} type="button" role="tab" aria-selected={on} onClick={() => setChannel(key)}
                      className={`relative inline-flex shrink-0 items-center gap-2 px-3 py-3 text-[13px] font-semibold transition ${on ? "text-brand-800" : "text-slate-500 hover:text-slate-800"}`}>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={icon} /></svg>
                      {name}
                      {ok ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Ready to send" />
                        : <svg className="h-3.5 w-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-label="Locked"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>}
                      {on ? <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-700" /> : null}
                    </button>
                  );
                })}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
                {channel === "email" ? <EmailChannel w={w} /> : channel === "call" ? <CallChannel w={w} /> : <MessageChannel w={w} channel={channel} />}
              </div>
            </>
          ) : (
            <div className="grid h-full place-items-center p-8 text-center">
              <div>
                <p className="text-[15px] font-semibold text-slate-700">Pick a lead or customer</p>
                <p className="mt-1 text-[13px] text-slate-500">Then email, WhatsApp, SMS or call them from here.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
