"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import CustomerHeader from "../../../components/customers/detail/CustomerHeader";
import MembersCard from "../../../components/customers/detail/MembersCard";
import FollowUpActivityModal from "../../../components/customers/FollowUpActivityModal";
import MoneyCard from "../../../components/customers/money/MoneyCard";
import RecordPaymentModal from "../../../components/customers/money/RecordPaymentModal";
import OnboardingChecklist from "../../../components/customers/onboarding/OnboardingChecklist";
import CustomerAddSubscriptionModal from "../../../components/customers/premium/CustomerAddSubscriptionModal";
import CustomerProfilePanel from "../../../components/customers/premium/CustomerProfilePanel";
import CustomerSubscriptions from "../../../components/customers/premium/CustomerSubscriptions";
import CustomerTimeline from "../../../components/customers/premium/CustomerTimeline";
import { AlertError, AlertSuccess } from "../../../components/ui/Alert";
import { apiRequest } from "../../../lib/api";
import { stripCustomerProfile } from "../../../lib/customerProfile";
import { loadSession } from "../../../lib/session";
import { formatScopedError, loadUsersForScope } from "../../../lib/teamScope";

const TABS = [["onboarding", "Onboarding"], ["timeline", "Activity"], ["plans", "Plans & renewals"]];

function legacyNotes(notesText) {
  const clean = stripCustomerProfile(notesText);
  if (!clean) return [];
  return clean.split("\n").map((l) => l.trim()).filter(Boolean).map((l, i) => {
    const m = l.match(/^\[(.+?)\]\s+([^:]+):\s*(.+)$/);
    return m ? { id: `legacy-${i}`, type: "note", created_by_name: m[2].trim(), description: m[3].trim(), created_at: m[1] } : { id: `legacy-n-${i}`, type: "note", created_by_name: "Team", description: l, created_at: null };
  });
}

/** One customer: health, money, onboarding checklist, plans, activity and the account team. */
export default function CustomerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [money, setMoney] = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [activities, setActivities] = useState([]);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("onboarding");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [payOpen, setPayOpen] = useState(null);
  const [logOpen, setLogOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [savingLog, setSavingLog] = useState(false);

  const path = `/customers/${encodeURIComponent(id)}`;
  const load = useCallback(async (s) => {
    const opts = { token: s.token, fresh: true };
    const c = await apiRequest(path, opts);
    setCustomer(c?.data || c);
    apiRequest(`${path}/money`, opts).then(setMoney).catch(() => setMoney(null));
    apiRequest(`${path}/onboarding`, opts).then(setOnboarding).catch(() => setOnboarding(null));
    apiRequest(`${path}/activities?page_size=50`, opts).then((r) => setActivities(r?.items || r?.data || r || [])).catch(() => setActivities([]));
    apiRequest(`${path}/subscriptions`, opts).then((r) => setPlans(r?.data || r || [])).catch(() => setPlans([]));
  }, [path]);

  useEffect(() => {
    const s = loadSession();
    if (!s) { router.replace(`/login?next=/customers/${encodeURIComponent(id)}`); return; }
    setSession(s);
    load(s).catch((e) => setError(formatScopedError(e, "Could not load this customer.")));
    apiRequest("/products", { token: s.token }).then((r) => setProducts(r?.items || r?.data || r || [])).catch(() => setProducts([]));
  }, [id, router, load]);
  useEffect(() => {
    if (!session?.token || !customer?.company_id) return;
    loadUsersForScope(session.token, { companyId: customer.company_id, pageSize: 200 }).then(setUsers).catch(() => setUsers([]));
  }, [session?.token, customer?.company_id]);

  const canEdit = session?.user?.role !== "viewer";
  const refreshActivity = () => apiRequest(`${path}/activities?page_size=50`, { token: session.token, fresh: true }).then((r) => setActivities(r?.items || r?.data || r || [])).catch(() => {});
  const timeline = [...activities.filter((a) => a.type !== "updated"), ...legacyNotes(customer?.notes)]
    .sort((a, b) => (!a.created_at ? 1 : !b.created_at ? -1 : new Date(b.created_at) - new Date(a.created_at)));

  async function saveLog({ activityType, remarks }) {
    setSavingLog(true);
    try {
      await apiRequest(`${path}/notes`, { method: "POST", token: session.token, body: { content: `[${activityType.toUpperCase()}] ${remarks.trim()}` } });
      setNotice("Activity saved."); setLogOpen(false); await load(session);
    } catch (e) { setError(formatScopedError(e, "Could not save activity.")); return false; } finally { setSavingLog(false); }
  }
  async function addPlan(body) {
    try {
      await apiRequest(`${path}/subscriptions`, { method: "POST", token: session.token, body });
      setNotice("Plan added. The contract value went up by its amount."); setPlanOpen(false); await load(session);
    } catch (e) { setError(formatScopedError(e, "Could not add the plan.")); }
  }
  const moneyChanged = (next) => { setMoney(next); apiRequest(path, { token: session.token, fresh: true }).then((c) => setCustomer(c?.data || c)).catch(() => {}); apiRequest(`${path}/onboarding`, { token: session.token, fresh: true }).then(setOnboarding).catch(() => {}); refreshActivity(); };

  return (
    <DashboardShell session={session} title={customer?.company_name || "Customer"} hideTitle heroStats={[]}>
      <div className="tw-buttons min-w-0 space-y-4 pb-10">
        <AlertError message={error} onDismiss={() => setError("")} />
        {!error && notice ? <AlertSuccess message={notice} onDismiss={() => setNotice("")} /> : null}
        {!customer && !error ? <div className="h-[150px] animate-pulse rounded-[14px] bg-white ring-1 ring-slate-200" /> : null}
        {customer ? (
          <>
            <CustomerHeader customer={customer} health={money?.health} canEdit={canEdit} onPayment={() => setPayOpen(true)} onLog={() => setLogOpen(true)} />
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="min-w-0 space-y-3">
                <div className="inline-flex gap-1 rounded-[12px] bg-white p-1 ring-1 ring-slate-200" role="tablist" aria-label="Customer">
                  {TABS.map(([key, name]) => (
                    <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                      className={`rounded-[9px] px-4 py-2 text-[13px] font-semibold ${tab === key ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                      {name}{key === "onboarding" && onboarding ? <span className="ml-1.5 opacity-70">{onboarding.summary.percent}%</span> : key === "plans" && plans.length ? <span className="ml-1.5 opacity-70">{plans.length}</span> : null}
                    </button>
                  ))}
                </div>
                {tab === "onboarding" ? <OnboardingChecklist data={onboarding} token={session?.token} customerId={id} users={users} canEdit={canEdit} onChanged={(d) => { setOnboarding(d); refreshActivity(); }} /> : null}
                {tab === "timeline" ? <CustomerTimeline activities={timeline} onAddActivity={() => setLogOpen(true)} /> : null}
                {tab === "plans" ? <CustomerSubscriptions subscriptions={plans} onAddProduct={() => setPlanOpen(true)} /> : null}
              </div>
              <div className="min-w-0 space-y-4">
                <MoneyCard money={money} token={session?.token} customerId={id} canEdit={canEdit} onRecord={(amount) => setPayOpen(amount || true)} onChanged={moneyChanged} />
                <MembersCard token={session?.token} customer={customer} users={users} canEdit={canEdit} />
                <CustomerProfilePanel customer={customer} />
              </div>
            </div>
          </>
        ) : null}
      </div>

      <RecordPaymentModal open={Boolean(payOpen)} onClose={() => setPayOpen(null)} token={session?.token} suggested={typeof payOpen === "number" ? payOpen : null}
        customer={customer && money ? { ...customer, total_value: money.contract_value, paid_amount: money.paid, next_payment_date: money.next_payment_date } : customer}
        onSaved={(res) => { setNotice("Payment saved."); moneyChanged(res); }} />
      <CustomerAddSubscriptionModal isOpen={planOpen} onClose={() => setPlanOpen(false)} onSave={addPlan} products={products} />
      <FollowUpActivityModal isOpen={logOpen} onClose={() => setLogOpen(false)} onSave={saveLog} saving={savingLog} />
    </DashboardShell>
  );
}
