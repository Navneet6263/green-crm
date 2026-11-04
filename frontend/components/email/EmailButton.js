"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { loadSession } from "../../lib/session";
import EmailNudgeDialog from "./EmailNudgeDialog";

export const canSendEmail = (session) => session?.user?.role === "admin";

const MailIcon = ({ className = "h-4 w-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4 7 8 6 8-6" />
  </svg>
);

/** "Email" button that only admins see. `variant`: "button" (labelled) or "icon". */
export default function EmailButton({ session: given, variant = "button", label = "Email", className = "", ...dialog }) {
  const [open, setOpen] = useState(false);
  const [stored] = useState(() => (given || typeof window === "undefined" ? null : loadSession()));
  const session = given || stored;
  if (!canSendEmail(session)) return null;
  const look = variant === "icon"
    ? "grid h-7 w-7 place-items-center rounded-[8px] text-slate-400 hover:bg-gold-50 hover:text-gold-800"
    : "inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-white px-3 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-gold-50 hover:text-gold-900";
  return (
    <>
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(true); }} title={variant === "icon" ? label : undefined} aria-label={label} className={`${look} ${className}`}>
        <MailIcon />{variant === "icon" ? null : label}
      </button>
      {/* In a portal, so clicks inside the dialog never reach a clickable row or card behind it. */}
      {/* React still bubbles portal events to the button's parents, so stop them here too. */}
      {open ? createPortal(<div onClick={(e) => e.stopPropagation()}><EmailNudgeDialog open onClose={() => setOpen(false)} session={session} {...dialog} /></div>, document.body) : null}
    </>
  );
}
