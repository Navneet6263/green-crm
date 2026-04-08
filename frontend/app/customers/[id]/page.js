"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [error, setError] = useState("");

  async function loadCustomer(activeSession) {
    const response = await apiRequest(`/customers/${params.id}`, { token: activeSession.token });
    setCustomer(response);
  }

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) {
      router.replace("/login");
      return;
    }
    setSession(activeSession);
    loadCustomer(activeSession).catch((requestError) => setError(requestError.message));
  }, [params.id, router]);

  async function addNote(event) {
    event.preventDefault();
    try {
      await apiRequest(`/customers/${params.id}/notes`, {
        method: "POST",
        token: session.token,
        body: { content: note },
      });
      setNote("");
      await loadCustomer(session);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function addFollowUp(event) {
    event.preventDefault();
    try {
      await apiRequest(`/customers/${params.id}/followups`, {
        method: "POST",
        token: session.token,
        body: { next_follow_up: followUp },
      });
      setFollowUp("");
      await loadCustomer(session);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <DashboardShell
      session={session}
      title={customer ? customer.company_name : "Customer Detail"}
      eyebrow="Customer Detail"
      heroStats={[
        { label: "Status", value: customer?.status || "--" },
        { label: "Value", value: customer ? `INR ${Number(customer.total_value || 0).toLocaleString("en-IN")}` : "--", color: "#1fc778" },
        { label: "Owner", value: customer?.assigned_to_name || "--" },
        { label: "Next Follow-up", value: customer?.next_follow_up ? new Date(customer.next_follow_up).toLocaleDateString("en-IN") : "--", color: "#f5a623" },
      ]}
    >
      {error ? <div className="alert error">{error}</div> : null}
      {!customer ? <div className="alert">Loading customer...</div> : null}
      {customer ? (
        <section className="dashboard-grid">
          <article className="panel">
            <div className="panel-header"><h2>Account Snapshot</h2></div>
            <div className="table-stack">
              <div className="table-row"><div><strong>Primary Contact</strong><span>{customer.name}</span></div><strong>{customer.phone}</strong></div>
              <div className="table-row"><div><strong>Email</strong><span>{customer.email}</span></div><strong>{customer.assigned_to_name || "Unassigned"}</strong></div>
              <div className="table-row"><div><strong>Notes</strong><span>{customer.notes || "No notes added."}</span></div></div>
            </div>
          </article>

          <article className="panel">
            <div className="panel-header"><h2>Add Note</h2></div>
            <form className="form-grid" onSubmit={addNote}>
              <label className="field"><span>Note</span><textarea rows="3" value={note} onChange={(event) => setNote(event.target.value)} /></label>
              <button className="button primary" type="submit">Save Note</button>
            </form>
          </article>

          <article className="panel">
            <div className="panel-header"><h2>Follow-up</h2></div>
            <form className="form-grid" onSubmit={addFollowUp}>
              <label className="field"><span>Next Follow-up</span><input type="datetime-local" value={followUp} onChange={(event) => setFollowUp(event.target.value)} /></label>
              <button className="button primary" type="submit">Schedule</button>
            </form>
          </article>
        </section>
      ) : null}
    </DashboardShell>
  );
}
