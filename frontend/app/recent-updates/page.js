"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "../../components/dashboard/DashboardShell";
import RecentNotesPanel from "../../components/RecentNotesPanel.jsx";
import { loadSession } from "../../lib/session";

export default function RecentUpdatesPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
  }, [router]);

  if (!session) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardShell session={session} title="Recent Updates" hideTitle={false}>
      <div className="space-y-6">
        <div className="text-sm text-gray-600">
          View all recent notes and activities across leads and customers
        </div>
        <RecentNotesPanel limit={50} showFilters={true} />
      </div>
    </DashboardShell>
  );
}
