"use client";

import Link from "next/link";
import { useState } from "react";
import { FEATURE_VISUALS } from "./FeatureVisuals";

const TABS = [
  {
    id: "leads",
    label: "Leads",
    title: "Every enquiry, owned and tracked",
    desc: "Capture leads, give each one an owner, and see exactly where it stands — no more lost rows in Excel.",
    points: ["Custom statuses and fields", "Assign by user, team and product", "Bulk CSV import with preview"],
  },
  {
    id: "follow-ups",
    label: "Follow-ups",
    title: "Never miss a callback again",
    desc: "Every lead has a next step. Reps see their day at a glance and get reminded before it is too late.",
    points: ["Follow-up dates with reminders", "Calendar with month, week and agenda", "Notes with pins and tags"],
  },
  {
    id: "communication",
    label: "Calls & WhatsApp",
    title: "Call, WhatsApp and email from the lead",
    desc: "Talk to customers without leaving the CRM, and every conversation is saved on the lead's timeline.",
    points: ["Click-to-call with call logs", "WhatsApp and SMS from the lead", "Email from your company SMTP"],
  },
  {
    id: "field",
    label: "Field App",
    title: "Your field team's route, on the map",
    desc: "The Android app records the route and each client visit with GPS — and keeps working without internet.",
    points: ["Start / Stop route tracking", "Visit check-ins on the map", "Lead photos and follow-ups"],
    href: "/field-sales-app",
  },
  {
    id: "workflow",
    label: "Deal Workflow",
    title: "From won deal to paid invoice",
    desc: "Won deals move to legal for agreements, then to finance for invoices and payment — on the same record.",
    points: ["Automatic handoff to legal", "Invoice and payment tracking", "Workflow tracker for managers"],
  },
  {
    id: "analytics",
    label: "Analytics",
    title: "Know what is working",
    desc: "Dashboards for every role show lead sources, pipeline value and how each person on the team is doing.",
    points: ["Lead source and status breakdown", "Pipeline value", "Team performance"],
  },
];

export default function FeatureTabs() {
  const [active, setActive] = useState(TABS[0].id);
  const tab = TABS.find((t) => t.id === active);
  const Visual = FEATURE_VISUALS[tab.id];

  return (
    <section id="features" className="relative scroll-mt-20 overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -right-40 top-40 h-96 w-96 rounded-full bg-gold-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -left-40 bottom-0 h-96 w-96 rounded-full bg-brand-200/30 blur-3xl" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[12px] font-bold uppercase tracking-widest text-brand-600">One CRM, the whole sales journey</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Everything your team needs to sell more</h2>
        </div>

        <div role="tablist" aria-label="GreenCRM features" className="mx-auto mt-12 flex max-w-4xl gap-2 overflow-x-auto rounded-full border border-slate-200 bg-cream p-1.5 [scrollbar-width:none] sm:flex-wrap sm:justify-center [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={t.id === active}
              onClick={() => setActive(t.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${t.id === active ? "bg-white text-brand-700 shadow-md shadow-slate-900/5" : "text-slate-500 hover:text-slate-900"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div key={tab.id} role="tabpanel" className="mt-12 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="animate-[fadeIn_0.4s_ease_forwards]">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl">{tab.title}</h3>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">{tab.desc}</p>
            <ul className="mt-6 space-y-3">
              {tab.points.map((p) => (
                <li key={p} className="flex items-center gap-3 text-base text-slate-700">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">✓</span>
                  {p}
                </li>
              ))}
            </ul>
            <Link href={tab.href || `/features#${tab.id}`} className="mt-8 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
              Learn more →
            </Link>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-brand-100 via-cream to-gold-100 blur-2xl" />
            <div className="relative">
              <Visual />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
