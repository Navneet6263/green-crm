"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "../../components/dashboard/DashboardShell";
import { loadSession } from "../../lib/session";
import { recentActivityApi } from "../../lib/api/recentActivity.js";
import RecentUpdatesFilter from "./RecentUpdatesFilter";
import RecentUpdatesFeed from "./RecentUpdatesFeed";

export default function RecentUpdatesPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [typeFilter, setTypeFilter] = useState("all"); // 'all' | 'lead' | 'customer'
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
  }, [router]);

  useEffect(() => {
    const fetchUpdates = async () => {
      if (!session) return;
      try {
        setLoading(true);
        const res = await recentActivityApi.getRecentNotes({ 
          limit: 100, 
          type: typeFilter === "all" ? "all" : `${typeFilter}s`,
          users: selectedUsers,
          products: selectedProducts
        });
        setNotes(res.items || res.data || res || []);
      } catch (err) {
        console.error("Error fetching recent updates:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUpdates();
  }, [session, typeFilter, selectedUsers, selectedProducts]);

  const handleNavigate = (note) => {
    if (note.note_type === "lead" && note.entity_id) {
      router.push(`/leads/${note.entity_id}`);
    } else if (note.note_type === "customer" && note.customer_id) {
      router.push(`/customers/${note.customer_id}`);
    }
  };

  return (
    <DashboardShell session={session} title="Recent Updates" hideTitle={true}>
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Modern Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
              Recent Updates
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Real-time feed of recent interactions and lead activity across your account.
            </p>
          </div>
          
          {/* Custom Sleek Tabs */}
          <div className="flex items-center gap-1.5 self-start rounded-xl bg-slate-100 p-1">
            {["all", "lead", "customer"].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                  typeFilter === t
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t}s
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area - Split Layout */}
        <div className="flex flex-col gap-8 sm:flex-row items-start">
          <RecentUpdatesFilter 
            session={session}
            selectedUsers={selectedUsers}
            setSelectedUsers={setSelectedUsers}
            selectedProducts={selectedProducts}
            setSelectedProducts={setSelectedProducts}
          />
          
          <RecentUpdatesFeed 
            notes={notes}
            loading={loading}
            onNavigate={handleNavigate}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
