"use client";

import Link from "next/link";
import { useState } from "react";

import AppLogo from "../branding/AppLogo";
import { LANDING_NAV_ITEMS } from "./landing-data";
import { btnPrimarySmall, btnSecondarySmall } from "./landing-styles";

const linkClass = "text-sm font-medium text-slate-600 transition hover:text-emerald-600";

export default function LandingNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center text-[#0d1f1b]">
          <AppLogo size="lg" variant="landing" priority />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {LANDING_NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/login" className={btnSecondarySmall}>Login</Link>
          <Link href="/book-demo" className={btnPrimarySmall}>Book Demo</Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="grid h-11 w-11 place-items-center rounded-full border border-[#d8dfd4] bg-white/88 text-[#21453d] lg:hidden"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            {open ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open ? (
        <div className="border-t border-white/60 bg-[rgba(255,255,255,0.96)] lg:hidden">
          <div className="mx-auto grid max-w-7xl gap-3 px-4 py-4 sm:px-6">
            {LANDING_NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass} onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ))}
            <div className="grid gap-3 pt-2">
              <Link href="/login" className={btnSecondarySmall} onClick={() => setOpen(false)}>Login</Link>
              <Link href="/book-demo" className={btnPrimarySmall} onClick={() => setOpen(false)}>Book Demo</Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
