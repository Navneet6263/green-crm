"use client";

import ManagerStatsRow from "./ManagerStatsRow";
import ManagerChartsSection from "./ManagerChartsSection";
import ManagerRecentLeads from "./ManagerRecentLeads";

export default function ManagerDashboardView(props) {
  const {
    activeUsers,
    convRate,
    error,
    leadCounts,
    leads,
    loading,
    lostLeads,
    lostRate,
    overdueTasks,
    pendingFollowups,
    refresh,
    session,
    sourceMix,
    statusOrder,
    totalLeads,
    totalValue,
    wonLeads,
  } = props;

  const userName = session?.user?.full_name?.split(" ")[0] || session?.user?.name?.split(" ")[0] || "Navneet";

  return (
    <>
      {error ? (
        <div className="mb-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-3 py-10 text-sm font-medium text-slate-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          Loading dashboard...
        </div>
      ) : null}

      {!loading ? (
        <div className="pb-8">
          <div className="mb-6">
            <h1 className="text-[2rem] font-extrabold leading-tight tracking-tight text-slate-950">Dashboard</h1>
            <p className="mt-1 text-base font-medium text-slate-500">Welcome back, {userName}</p>
          </div>

          <div className="space-y-5">
            <ManagerStatsRow totalLeads={totalLeads} wonLeads={wonLeads} convRate={convRate} pendingFollowups={pendingFollowups} />
            <ManagerChartsSection
              activeUsers={activeUsers}
              convRate={convRate}
              leadCounts={leadCounts}
              lostLeads={lostLeads}
              lostRate={lostRate}
              overdueTasks={overdueTasks}
              pendingFollowups={pendingFollowups}
              sourceMix={sourceMix}
              statusOrder={statusOrder}
              totalLeads={totalLeads}
              totalValue={totalValue}
              wonLeads={wonLeads}
            />
            <ManagerRecentLeads leads={leads} refresh={refresh} session={session} />
          </div>
        </div>
      ) : null}
    </>
  );
}
