"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";

export default function NewCustomerPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [form, setForm] = useState({
    name: "",
    company_name: "",
    email: "",
    phone: "",
    total_value: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) {
      router.replace("/login");
      return;
    }

    setSession(activeSession);
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await apiRequest("/customers", {
        method: "POST",
        token: session.token,
        body: {
          ...form,
          total_value: Number(form.total_value || 0),
        },
      });
      router.push(`/customers/${response.customer_id}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell session={session} title="Create Customer" eyebrow="New Customer">
      {error ? <div className="alert error">{error}</div> : null}
      <section className="panel">
        <div className="panel-header"><h2>Customer Details</h2></div>
        <form className="form-grid two-column" onSubmit={handleSubmit}>
          <label className="field"><span>Name</span><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></label>
          <label className="field"><span>Company Name</span><input value={form.company_name} onChange={(event) => setForm((current) => ({ ...current, company_name: event.target.value }))} required /></label>
          <label className="field"><span>Email</span><input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required /></label>
          <label className="field"><span>Phone</span><input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} required /></label>
          <label className="field"><span>Total Value</span><input type="number" value={form.total_value} onChange={(event) => setForm((current) => ({ ...current, total_value: event.target.value }))} /></label>
          <label className="field full-width"><span>Notes</span><textarea rows="4" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label>
          <button className="button primary" type="submit" disabled={saving}>{saving ? "Creating..." : "Create Customer"}</button>
        </form>
      </section>
    </DashboardShell>
  );
}
