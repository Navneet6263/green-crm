"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardIcon from "../../components/dashboard/icons";
import SettingsLayout from "../../components/settings/SettingsLayout";
import { settingsFor } from "../../components/settings/settingsNav";
import { loadSession } from "../../lib/session";

const COLORS = { profile: "#3b6fd8", company: "#0c605d", integrations: "#e06a10", users: "#8a55e6", teams: "#d9467c", products: "#b98300", customize: "#009a8c" };

/** Settings home: every settings area this person can open, with what it is for. */
export default function SettingsHome() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  useEffect(() => {
    const s = loadSession();
    if (!s) { router.replace("/login?next=/settings"); return; }
    setSession(s);
  }, [router]);
  const sections = settingsFor(session?.user?.role || "");

  return (
    <SettingsLayout session={session} title="Settings" description="Your profile, company details, integrations and how leads work">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{section.title}</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {section.items.map((item) => (
              <Link key={item.key} href={item.href} prefetch className="group flex items-start gap-3 rounded-[14px] bg-white p-4 ring-1 ring-slate-200 transition hover:-translate-y-px hover:shadow-sm hover:ring-slate-300">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px]" style={{ background: `${COLORS[item.key]}1a`, color: COLORS[item.key] }}>
                  <DashboardIcon name={item.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-[14px] font-semibold text-slate-900">{item.label}<span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500">→</span></span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-slate-500">{item.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </SettingsLayout>
  );
}
