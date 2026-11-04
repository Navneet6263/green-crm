"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** A panel that slides in from the right, for details and forms opened from a list. Esc or the backdrop closes it. */
export default function SideDrawer({ open, onClose, title, subtitle, children, footer, width = "max-w-[520px]" }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open || !mounted) return null;
  return createPortal(
    <>
      <div className="fixed inset-0 z-[90] bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <aside role="dialog" aria-label={typeof title === "string" ? title : "Details"} className={`tw-buttons fixed inset-y-0 right-0 z-[95] flex w-full ${width} flex-col bg-[#f7f8f6] shadow-[-24px_0_60px_-30px_rgba(15,23,42,0.45)]`}>
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div className="min-w-0">
            <div className="text-[16px] font-bold text-slate-900">{title}</div>
            {subtitle ? <div className="mt-0.5 text-[12.5px] text-slate-500">{subtitle}</div> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer ? <footer className="border-t border-slate-200 bg-white px-5 py-3">{footer}</footer> : null}
      </aside>
    </>,
    document.body
  );
}
