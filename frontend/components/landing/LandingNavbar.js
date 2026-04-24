"use client";

import { useState } from "react";
import Link from "next/link";

import AppLogo from "../branding/AppLogo";
import { LANDING_NAV_ITEMS } from "./landing-data";
import { btnPrimarySmall, btnSecondarySmall } from "./landing-styles";

const linkClass =
  "text-sm font-medium text-slate-600 transition hover:text-emerald-700";

export default function LandingNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-[#f5f7fb]/86 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex max-w-[min(58vw,11rem)] items-center text-slate-950 sm:max-w-[12rem]">
          <AppLogo
            size="md"
            variant="landing"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {LANDING_NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/login" className={linkClass}>Login</Link>
          <Link href="/book-demo" className={btnPrimarySmall}>Book Demo</Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Link href="/book-demo" className={btnPrimarySmall}>Book Demo</Link>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              {open ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-slate-200/70 bg-white/96 lg:hidden">
          <div className="mx-auto grid max-w-7xl gap-3 px-4 py-4 sm:px-6">
            {LANDING_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-slate-100 pt-3">
              <Link href="/login" className={btnSecondarySmall} onClick={() => setOpen(false)}>Login</Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
