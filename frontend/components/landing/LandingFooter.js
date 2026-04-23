import Link from "next/link";

import AppLogo from "../branding/AppLogo";
import { BRAND_COPY, BRAND_NAME } from "../branding/brandConfig";
import { FOOTER_LINK_GROUPS } from "./landing-data";

export default function LandingFooter() {
  return (
    <footer className="border-t border-slate-200/70 bg-white/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div>
          <div className="text-slate-950">
            <AppLogo size="md" nameClassName="text-base font-semibold tracking-[0.08em] text-slate-950" />
            <p className="mt-3 text-sm text-slate-500">{BRAND_COPY.footer}</p>
          </div>
          <p className="mt-5 max-w-xl text-sm leading-8 text-slate-600">
            Sales CRM built for leads, calls, WhatsApp, attendance, and team dashboards.
          </p>

          <div className="mt-6 rounded-[1.6rem] border border-slate-200 bg-[#f8fafc] p-5">
            <p className="text-sm font-semibold text-slate-950">Contact GreenCRM</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Use the demo request form for product queries, pricing, and setup support.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link href="/book-demo" className="inline-flex items-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                Book Free Demo
              </Link>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
                Built for growing teams
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          {FOOTER_LINK_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-sm font-semibold text-slate-950">{group.title}</p>
              <div className="mt-4 grid gap-3">
                {group.links.map((link) => (
                  <Link key={link.href} href={link.href} className="text-sm text-slate-600 transition hover:text-emerald-700">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-slate-200/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-sm text-slate-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>&copy; {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.</p>
          <p>GreenCRM and GreenCall CRM branding may be used across campaigns and demo flows.</p>
        </div>
      </div>
    </footer>
  );
}
