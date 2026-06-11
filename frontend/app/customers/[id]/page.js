"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";
import { formatScopedError } from "../../../lib/teamScope";
import { AlertError, AlertSuccess } from "../../../components/ui/Alert";

import CustomerHero from "../../../components/customers/premium/CustomerHero";
import CustomerSubscriptions from "../../../components/customers/premium/CustomerSubscriptions";
import CustomerTimeline from "../../../components/customers/premium/CustomerTimeline";
import CustomerProfilePanel from "../../../components/customers/premium/CustomerProfilePanel";
import CustomerAddSubscriptionModal from "../../../components/customers/premium/CustomerAddSubscriptionModal";
import FollowUpActivityModal from "../../../components/customers/FollowUpActivityModal";
import { stripCustomerProfile, buildCustomerNotes, parseCustomerProfile } from "../../../lib/customerProfile";

function parseLegacyNotes(notesText) {
  const clean = stripCustomerProfile(notesText);
  if (!clean) return [];
  return clean.split("\n").map(l=>l.trim()).filter(Boolean).map((l,i)=>{
    const m = l.match(/^\[(.+?)\]\s+([^:]+):\s*(.+)$/);
    if (m) {
      return { id: `legacy-${i}`, type: "note", created_by_name: m[2].trim(), description: m[3].trim(), created_at: m[1] };
    }
    return { id: `legacy-n-${i}`, type: "note", created_by_name: "Team", description: l, created_at: null };
  });
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingActivity, setSavingActivity] = useState(false);
  
  const [subscriptions, setSubscriptions] = useState([]);
  const [dbActivities, setDbActivities] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [activeTab, setActiveTab] = useState("timeline");
  const [showSubModal, setShowSubModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);

  const legacyNotes = customer?.notes ? parseLegacyNotes(customer.notes) : [];
  
  // Filter out generic "updated" spam from the timeline to keep it clean
  const filteredDbActivities = dbActivities.filter(act => act.type !== 'updated');
  
  const allActivities = [...filteredDbActivities, ...legacyNotes].sort((a,b) => {
    if (!a.created_at) return 1;
    if (!b.created_at) return -1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  async function load(s) {
    const r = await apiRequest(`/customers/${params.id}`, { token: s.token });
    setCustomer(r?.data || r); // Depending on response shape

    // Fetch activities
    apiRequest(`/customers/${params.id}/activities?page_size=50`, { token: s.token })
      .then(res => setDbActivities(res?.items || res?.data || res || []))
      .catch(() => setDbActivities([]));

    // Fetch subscriptions
    apiRequest(`/customers/${params.id}/subscriptions`, { token: s.token })
      .then(res => setSubscriptions(res?.data || res || []))
      .catch(() => setSubscriptions([]));

    // Fetch products list for the modal
    apiRequest(`/products`, { token: s.token })
      .then(res => setProducts(res?.items || res?.data || res || []))
      .catch(() => setProducts([]));
  }

  useEffect(() => {
    const s = loadSession();
    if (!s) return router.replace("/login");
    setSession(s);
    load(s).catch(e => setError(formatScopedError(e, "Could not load this customer.")));
  }, [params.id, router]);

  async function handleAddSubscription(subData) {
    setError(""); setNotice("");
    try {
      await apiRequest(`/customers/${params.id}/subscriptions`, {
        method: "POST",
        token: session.token,
        body: subData
      });
      setNotice("New subscription added successfully!");
      setShowSubModal(false);
      await load(session); // Reload to get updated total value and sub list
    } catch (err) {
      setError(formatScopedError(err, "Could not add subscription."));
    }
  }

  async function saveFollowUpActivity({ activityType, remarks }) {
    setSavingActivity(true); setError(""); setNotice("");
    try {
      const existing = stripCustomerProfile(customer.notes);
      const timestamp = new Date().toISOString();
      const author = session?.user?.name || "Team";
      const entry = `[${timestamp}] ${author}: [${activityType.toUpperCase()}] ${remarks}`;
      const updatedNotes = existing ? `${existing}\n${entry}` : entry;
      
      await apiRequest(`/customers/${params.id}`, {
        method: "PATCH",
        token: session.token,
        body: {
          notes: buildCustomerNotes(parseCustomerProfile(customer.notes), updatedNotes),
          last_interaction: timestamp,
        },
      });
      setNotice("Follow-up activity saved.");
      setShowActivityModal(false);
      await load(session);
    } catch (err) {
      setError(formatScopedError(err, "Could not save activity."));
    } finally {
      setSavingActivity(false);
    }
  }

  return (
    <DashboardShell session={session} title={customer?.company_name || "Customer"} hideTitle>
      <div className="mx-auto max-w-[1280px] space-y-6 px-1 py-4">
        <AlertError message={error} onDismiss={() => setError("")} />
        {!error && notice && <AlertSuccess message={notice} onDismiss={() => setNotice("")} />}

        {!customer && <div className="p-8 text-center text-sm text-slate-500">Loading customer profile...</div>}

        {customer && (
          <>
            <CustomerHero customer={customer} />

            <div className="flex gap-4 border-b border-slate-200 pb-px pt-2">
              <button onClick={() => setActiveTab("timeline")} className={`px-4 py-3 text-sm font-black transition-all ${activeTab === "timeline" ? "border-b-2 border-indigo-600 text-indigo-700" : "text-slate-400 hover:text-slate-700"}`}>
                Activity Timeline
              </button>
              <button onClick={() => setActiveTab("subscriptions")} className={`px-4 py-3 text-sm font-black transition-all ${activeTab === "subscriptions" ? "border-b-2 border-indigo-600 text-indigo-700" : "text-slate-400 hover:text-slate-700"}`}>
                Products & Subscriptions
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] items-start gap-8">
              <div className="space-y-8">
                {activeTab === "subscriptions" ? (
                  <CustomerSubscriptions 
                    subscriptions={subscriptions} 
                    onAddProduct={() => setShowSubModal(true)} 
                  />
                ) : (
                  <CustomerTimeline 
                    activities={allActivities} 
                    onAddActivity={() => setShowActivityModal(true)} 
                  />
                )}
              </div>

              <div className="space-y-6">
                <CustomerProfilePanel customer={customer} />
              </div>
            </div>
          </>
        )}
      </div>

      <CustomerAddSubscriptionModal 
        isOpen={showSubModal} 
        onClose={() => setShowSubModal(false)}
        onSave={handleAddSubscription}
        products={products}
      />
      <FollowUpActivityModal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        onSave={saveFollowUpActivity}
        saving={savingActivity}
      />
    </DashboardShell>
  );
}
