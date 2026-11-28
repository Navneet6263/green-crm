"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Small "i" button that explains a number. Opens on hover, keyboard focus or tap,
 * and closes on Escape, a tap outside, or moving away.
 */
export default function InfoTip({ label, children, panelClassName = "auto" }) {
  const [open, setOpen] = useState(false);
  // "auto": open towards whichever side of the screen has room.
  const [side, setSide] = useState("left-0");
  const id = useId();
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const box = ref.current?.getBoundingClientRect();
    if (box) setSide(box.left > window.innerWidth / 2 ? "right-0" : "left-0");
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    const onDown = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [open]);

  return (
    <span ref={ref} className="inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label={`What is ${label}?`} aria-expanded={open} aria-describedby={open ? id : undefined}
        onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen(true); }}
        onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        className="relative z-[2] grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold leading-none text-slate-400 ring-1 ring-slate-300 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
        i
      </button>
      {open ? (
        <span id={id} role="tooltip"
          className={`absolute top-[calc(100%+6px)] z-30 w-[min(280px,calc(100vw-2rem))] ${panelClassName === "auto" ? side : panelClassName} rounded-[10px] bg-white p-3 text-left text-[12px] font-normal leading-[1.45] text-slate-600 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.35)] ring-1 ring-slate-200`}>
          {children}
        </span>
      ) : null}
    </span>
  );
}
