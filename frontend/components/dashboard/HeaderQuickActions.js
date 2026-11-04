"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { apiRequest } from "../../lib/api";
import QuickNotes from "./QuickNotes";

const BTN = "relative grid h-9 w-9 place-items-center rounded-[10px] text-slate-500 transition hover:bg-slate-100 hover:text-slate-800";

/** Header buttons: Discuss (with unread count) and a quick Notes panel. */
export default function HeaderQuickActions({ token }) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const closeNotes = useCallback(() => setNotesOpen(false), []);
  const pathname = usePathname();
  const onDiscuss = pathname?.startsWith("/discuss");

  useEffect(() => {
    if (!token || onDiscuss) return undefined;
    let cancelled = false;
    const check = () => apiRequest("/discuss/unread", { token, fresh: true }).then((r) => { if (!cancelled) setUnread(Number(r?.unread || 0)); }).catch(() => {});
    check();
    const timer = setInterval(check, 60000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [token, onDiscuss]);

  return (
    <>
      <Link href="/discuss" prefetch={false} title="Discuss" aria-label={unread ? `Discuss, ${unread} unread` : "Discuss"} className={`${BTN} ${onDiscuss ? "bg-brand-50 text-brand-800" : ""}`}>
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /><path d="M17 9h3a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v3l-3.5-3H12" />
        </svg>
        {unread && !onDiscuss ? <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-700 px-1 text-[10px] font-bold text-white ring-2 ring-white">{unread > 99 ? "99+" : unread}</span> : null}
      </Link>
      <button type="button" onClick={() => setNotesOpen(true)} title="My notes" aria-label="My notes" className={`${BTN} ${notesOpen ? "bg-gold-50 text-gold-800" : ""}`}>
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 4h16v10.5L14.5 20H4V4Z" /><path d="M14 20v-5.5h6M8 9h8M8 12.5h4" />
        </svg>
      </button>
      {/* The header has a backdrop blur, which would trap a fixed panel inside it; render at page level. */}
      {notesOpen ? createPortal(<QuickNotes open onClose={closeNotes} />, document.body) : null}
    </>
  );
}
