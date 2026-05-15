import Link from "next/link";
import AppLogo from "../branding/AppLogo";
import { BRAND_NAME } from "../branding/brandConfig";

const LINKS = [
  { title: "Product", items: [{ l: "Features", h: "#features" }, { l: "Workflow", h: "#workflow" }, { l: "Pricing", h: "/book-demo" }, { l: "Book Demo", h: "/book-demo" }] },
  { title: "Solutions", items: [{ l: "CRM Software India", h: "/crm-software-india" }, { l: "CRM in Noida", h: "/crm-in-noida" }, { l: "CRM with Calling", h: "/crm-with-calling" }, { l: "CRM with WhatsApp", h: "/crm-with-whatsapp" }, { l: "CRM for Startups", h: "/crm-for-startups" }, { l: "CRM for Sales Team", h: "/crm-for-sales-team" }] },
  { title: "Resources", items: [{ l: "What is CRM", h: "/blog/what-is-crm-software" }, { l: "CRM vs Excel", h: "/blog/crm-vs-excel-for-sales" }, { l: "Best CRM India", h: "/blog/best-crm-tools-india" }, { l: "Why Sales Needs CRM", h: "/blog/why-sales-team-needs-crm" }, { l: "CRM for Small Business", h: "/blog/how-crm-helps-small-business" }] },
  { title: "Company", items: [{ l: "Login", h: "/login" }, { l: "Register", h: "/register" }, { l: "Blog", h: "/blog" }, { l: "Contact", h: "/book-demo" }] },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-slate-100 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          {/* Left */}
          <div>
            <AppLogo size="lg" variant="footer" />
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-500">
              GreenCRM is India's fastest-growing sales CRM. Manage leads, calls, WhatsApp, follow-ups, attendance, and analytics — all in one affordable platform built for Indian businesses.
            </p>
            {/* Location */}
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800">📍 Visit GreenCRM Office</p>
              <p className="mt-1 text-xs text-slate-500">Noida, Uttar Pradesh, India</p>
              <a href="https://maps.google.com/?q=Noida+Uttar+Pradesh+India" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition">
                Open in Google Maps →
              </a>
            </div>
          </div>

          {/* Right — Links */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {LINKS.map(g => (
              <div key={g.title}>
                <p className="text-sm font-bold text-slate-900">{g.title}</p>
                <div className="mt-3 grid gap-2.5">
                  {g.items.map(i => <Link key={i.h + i.l} href={i.h} className="text-sm text-slate-500 hover:text-emerald-600 transition">{i.l}</Link>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-slate-400 sm:px-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>© {new Date().getFullYear()} {BRAND_NAME}. All rights reserved. | Best CRM Software in Noida, India</p>
          <p>Lead Management · Sales CRM · Follow-up Tracking · WhatsApp CRM · Attendance System</p>
        </div>
      </div>
    </footer>
  );
}
