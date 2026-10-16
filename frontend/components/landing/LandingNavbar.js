"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import AppLogo from "../branding/AppLogo";
import { NAV_MENUS } from "./landing-data";
import { btnPrimarySmall, btnSecondarySmall } from "./landing-styles";

function MenuLink({ link, onNavigate, compact = false }) {
  const body = (
    <>
      <span className="flex items-center gap-1 text-sm font-semibold text-slate-800 group-hover/link:text-brand-700">
        {link.label}
        {link.external ? <span className="text-xs text-slate-400">↗</span> : null}
      </span>
      {link.desc && !compact ? <span className="mt-0.5 block text-xs leading-snug text-slate-500">{link.desc}</span> : null}
    </>
  );
  const className = `group/link block rounded-xl px-3 ${compact ? "py-2" : "py-2.5"} transition hover:bg-brand-50`;

  if (link.external) {
    return <a href={link.href} target="_blank" rel="noopener noreferrer" className={className} onClick={onNavigate}>{body}</a>;
  }
  return <Link href={link.href} className={className} onClick={onNavigate}>{body}</Link>;
}

function MenuColumns({ menu, onNavigate }) {
  return (
    <div className={`grid gap-6 ${menu.columns.length > 1 ? "sm:grid-cols-2" : ""}`}>
      {menu.columns.map((column) => (
        <div key={column.title}>
          <p className="px-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">{column.title}</p>
          <div className="mt-2 grid gap-0.5">
            {column.links.map((link) => (
              <MenuLink key={link.href} link={link} onNavigate={onNavigate} compact={menu.wide} />
            ))}
          </div>
          {column.footer ? (
            <Link href={column.footer.href} onClick={onNavigate} className="mt-2 inline-block px-3 text-sm font-semibold text-brand-700 hover:text-brand-800">
              {column.footer.label}
            </Link>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Chevron({ open }) {
  return (
    <svg viewBox="0 0 20 20" className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m5 7.5 5 5 5-5" />
    </svg>
  );
}

export default function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const navRef = useRef(null);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    const onClick = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) setOpenMenu(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const closeAll = () => {
    setOpenMenu(null);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-brand-100/70 bg-white/85 shadow-[0_10px_40px_-18px_rgba(12,96,93,0.35)] backdrop-blur-xl">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[radial-gradient(40rem_4rem_at_20%_0%,rgba(232,189,0,0.18),transparent_70%),radial-gradient(40rem_4rem_at_80%_0%,rgba(12,96,93,0.14),transparent_70%)]" />
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center text-[#0d1f1b]" onClick={closeAll}>
          <AppLogo size="lg" variant="landing" priority />
        </Link>

        <nav ref={navRef} className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV_MENUS.map((menu) => {
            const open = openMenu === menu.label;
            return (
              <div key={menu.label} className="relative" onMouseEnter={() => setOpenMenu(menu.label)} onMouseLeave={() => setOpenMenu(null)}>
                <button
                  type="button"
                  className={`inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition ${open ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:text-brand-700"}`}
                  aria-expanded={open}
                  onClick={() => setOpenMenu(open ? null : menu.label)}
                >
                  {menu.label}
                  <Chevron open={open} />
                </button>
                {open ? (
                  <div className={`absolute top-full pt-3 ${menu.wide ? "right-0 w-[560px]" : menu.columns.length > 1 ? "left-1/2 w-[480px] -translate-x-1/2" : "left-1/2 w-80 -translate-x-1/2"}`}>
                    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xl shadow-slate-900/10">
                      <MenuColumns menu={menu} onNavigate={closeAll} />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/login" className={btnSecondarySmall}>Login</Link>
          <Link href="/book-demo" className={btnPrimarySmall}>Book Demo</Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          className="grid h-11 w-11 place-items-center rounded-full border border-[#d8dfd4] bg-white/88 text-[#21453d] lg:hidden"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            {mobileOpen ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {mobileOpen ? (
        <div className="max-h-[calc(100vh-4.5rem)] overflow-y-auto border-t border-slate-100 bg-white lg:hidden">
          <div className="mx-auto grid max-w-7xl gap-1 px-4 py-4 sm:px-6">
            {NAV_MENUS.map((menu) => (
              <details key={menu.label} className="group rounded-xl">
                <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-3 text-base font-semibold text-slate-800 hover:bg-cream [&::-webkit-details-marker]:hidden">
                  {menu.label}
                  <span className="text-slate-400 transition group-open:rotate-180"><Chevron open={false} /></span>
                </summary>
                <div className="pb-3 pt-1">
                  <MenuColumns menu={menu} onNavigate={closeAll} />
                </div>
              </details>
            ))}
            <div className="grid gap-3 border-t border-slate-100 pt-4">
              <Link href="/login" className={btnSecondarySmall} onClick={closeAll}>Login</Link>
              <Link href="/book-demo" className={btnPrimarySmall} onClick={closeAll}>Book Demo</Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
