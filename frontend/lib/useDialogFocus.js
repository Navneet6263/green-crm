"use client";

import { useEffect, useRef } from "react";

export function useDialogFocus(ref, open, onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open || !ref.current) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const root = ref.current;
    const focusable = () => [...root.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')].filter(el => el.getClientRects().length);
    document.body.style.overflow = "hidden";
    (focusable()[0] || root).focus();
    const onKey = event => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeRef.current?.(); }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0]; const last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); root.focus(); return; }
      if (!root.contains(document.activeElement) || (event.shiftKey && document.activeElement === first)) {
        event.preventDefault(); (event.shiftKey ? last : first).focus();
      } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    root.addEventListener("keydown", onKey);
    return () => {
      root.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, ref]);
}
