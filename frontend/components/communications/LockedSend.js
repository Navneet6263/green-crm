"use client";

import Link from "next/link";

// The company's feature switches, set by the platform (super admin).
export function companyFeatures(session) {
  const raw = session?.company?.service_access;
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw) || {}; } catch (_e) { return {}; }
}

/**
 * Why a channel cannot send: "plan" when Communications is off for the company,
 * "setup" when it is on but this channel is not connected. null when it can send.
 */
export function lockFor(session, capabilities, channel) {
  if (companyFeatures(session).communications === false) return "plan";
  return capabilities?.[channel]?.enabled ? null : "setup";
}

const NAMES = { email: "Email", whatsapp: "WhatsApp", sms: "SMS", call: "Calling" };
const LockIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);

/** Shown where the Send button would be: what is locked, and how to unlock it for this person's role. */
export default function LockedSend({ lock, channel, session, compact = false }) {
  const isAdmin = session?.user?.role === "admin";
  const name = NAMES[channel] || "This channel";
  const title = lock === "plan" ? `${name} is not in your plan` : `${name} is not connected yet`;
  let text;
  if (!isAdmin) text = `Ask your admin to turn on ${name} for your company. You can still write and copy the message.`;
  else if (lock === "plan") text = "Communications is switched off for your company. Ask GreenCRM to upgrade your plan to send from the CRM.";
  else if (channel === "email") text = "Connect your company's own email (SMTP) in Settings, or ask GreenCRM to send through its mail.";
  else text = `Connect your own ${name} provider in Settings, or ask GreenCRM to turn it on for you.`;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${compact ? "" : "rounded-[12px] bg-amber-50 px-4 py-3 ring-1 ring-amber-100"}`}>
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-800"><LockIcon /></span>
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold text-amber-900">{title}</span>
          <span className="block text-[12px] leading-snug text-amber-800">{text}</span>
        </span>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {isAdmin && lock === "setup" ? (
          <Link href="/settings/company" prefetch={false} className="rounded-[10px] bg-white px-3 py-2 text-[12.5px] font-semibold text-slate-800 ring-1 ring-amber-200 hover:bg-amber-50">
            {channel === "email" ? "Use own SMTP" : "Open settings"}
          </Link>
        ) : null}
        {isAdmin ? (
          <Link href="/support" prefetch={false} className="rounded-[10px] bg-slate-900 px-3 py-2 text-[12.5px] font-semibold text-white hover:bg-slate-800">Ask to upgrade</Link>
        ) : (
          <Link href="/discuss" prefetch={false} className="rounded-[10px] bg-slate-900 px-3 py-2 text-[12.5px] font-semibold text-white hover:bg-slate-800">Contact admin</Link>
        )}
      </div>
    </div>
  );
}
