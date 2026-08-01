"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "../../components/dashboard/DashboardShell";
import { loadSession } from "../../lib/session";
import { recentActivityApi } from "../../lib/api/recentActivity.js";
import RecentUpdatesFilter from "./RecentUpdatesFilter";
import RecentUpdatesFeed from "./RecentUpdatesFeed";
import RecentUpdatesDateFilter from "./RecentUpdatesDateFilter";
import RecentUpdatesExport from "./RecentUpdatesExport";
import TodayUserSummary from "./TodayUserSummary";
import MonthlyLeaderboard from "./MonthlyLeaderboard";

export default function RecentUpdatesPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  
  // Date & Search & Pagination Filters
  const [datePreset, setDatePreset] = useState("last7days");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
    
    const today = new Date();
    const to = today.toISOString().split("T")[0];
    const from = new Date(today.setDate(today.getDate() - 30)).toISOString().split("T")[0];
    setFromDate(from);
    setToDate(to);
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, selectedUsers, selectedProducts, fromDate, toDate]);

  useEffect(() => {
    const fetchUpdates = async () => {
      if (!session) return;
      try {
        setLoading(true);
        const res = await recentActivityApi.getRecentNotes({ 
          limit, 
          page,
          type: typeFilter === "all" ? "all" : `${typeFilter}s`,
          users: selectedUsers,
          products: selectedProducts,
          fromDate,
          toDate,
          search: debouncedSearch
        });

        const items = res.items || res.data || (Array.isArray(res) ? res : []);
        setNotes(items);
        if (res.pagination) {
          setPagination(res.pagination);
        } else {
          setPagination({ total: items.length, totalPages: Math.ceil(items.length / limit) || 1 });
        }
      } catch (err) {
        console.error("Error fetching recent updates:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUpdates();
  }, [session, typeFilter, selectedUsers, selectedProducts, fromDate, toDate, debouncedSearch, page, limit]);

  const handleNavigate = (note) => {
    if (note.note_type === "lead" && note.entity_id) {
      router.push(`/leads/${note.entity_id}`);
    } else if (note.note_type === "customer" && note.customer_id) {
      router.push(`/customers/${note.customer_id}`);
    }
  };

  return (
    <DashboardShell session={session} title="Recent Updates" hideTitle={true}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        {/* Header Section */}
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 bg-clip-text text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent mb-1.5">
              Recent Updates & Activity
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              Track team performance, monthly leaderboards, notes, and activity across all leads.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search notes, names or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs sm:text-sm font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 w-full sm:w-auto">
              {["all", "lead", "customer"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`flex-1 sm:flex-none rounded-lg px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    typeFilter === t
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {t}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="flex flex-col gap-6 lg:flex-row items-start">
          <div className="w-full lg:w-72 shrink-0 space-y-6 flex flex-col order-2 lg:order-1">
            <RecentUpdatesExport
              session={session}
              typeFilter={typeFilter}
              selectedUsers={selectedUsers}
              selectedProducts={selectedProducts}
              fromDate={fromDate}
              toDate={toDate}
              search={debouncedSearch}
            />
            <RecentUpdatesDateFilter
              datePreset={datePreset}
              setDatePreset={setDatePreset}
              fromDate={fromDate}
              setFromDate={setFromDate}
              toDate={toDate}
              setToDate={setToDate}
            />
            <RecentUpdatesFilter 
              session={session}
              fromDate={fromDate}
              toDate={toDate}
              selectedUsers={selectedUsers}
              setSelectedUsers={setSelectedUsers}
              selectedProducts={selectedProducts}
              setSelectedProducts={setSelectedProducts}
            />
          </div>
          
          <div className="w-full flex-1 order-1 lg:order-2">
            {/* Monthly Leaderboard & Top Performer Highlights */}
            <MonthlyLeaderboard 
              notes={notes}
              session={session}
            />

            {/* Today's User Work Tracker */}
            <TodayUserSummary 
              notes={notes} 
              selectedUsers={selectedUsers} 
              setSelectedUsers={setSelectedUsers} 
            />

            {/* Timeline Feed & Pagination */}
            <RecentUpdatesFeed 
              notes={notes}
              loading={loading}
              onNavigate={handleNavigate}
              pagination={pagination}
              page={page}
              setPage={setPage}
              limit={limit}
              setLimit={setLimit}
            />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
