"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";

export default function CompanySettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) {
      router.replace("/login");
      return;
    }
    if (!["super-admin", "admin"].includes(activeSession.user?.role)) {
      router.replace("/dashboard");
      return;
    }
    setSession(activeSession);
    apiRequest("/auth/profile", { token: activeSession.token })
      .then((response) => setCompany(response.company))
      .catch((requestError) => setError(requestError.message));
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const response = await apiRequest(`/companies/${company.company_id}`, {
        method: "PUT",
        token: session.token,
        body: company,
      });
      setCompany(response);
      setMessage("Company settings updated.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const heroStats = company ? [
    { label: "Currency", value: company.settings_currency || "INR" },
    { label: "Timezone", value: company.settings_timezone || "Asia/Kolkata", color: "#4f8cff" },
    { label: "Industry", value: company.industry || "General", color: "#1fc778" },
    { label: "Website", value: company.website ? "Connected" : "Add URL", color: company.website ? "#f4a42d" : "#94a3b8" },
  ] : [];

  return (
    <DashboardShell session={session} title="Company Settings" eyebrow="Tenant Configuration" heroStats={heroStats}>
      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert">{message}</div> : null}
      {!company ? <div className="alert">Loading company settings...</div> : (
        <section className="panel">
          <div className="panel-header"><h2>Company Profile</h2></div>
          <form className="form-grid two-column" onSubmit={handleSubmit}>
            <label className="field"><span>Name</span><input value={company.name || ""} onChange={(event) => setCompany((current) => ({ ...current, name: event.target.value }))} /></label>
            <label className="field"><span>Contact Email</span><input value={company.contact_email || ""} onChange={(event) => setCompany((current) => ({ ...current, contact_email: event.target.value }))} /></label>
            <label className="field"><span>Admin Email</span><input value={company.admin_email || ""} onChange={(event) => setCompany((current) => ({ ...current, admin_email: event.target.value }))} /></label>
            <label className="field"><span>Contact Phone</span><input value={company.contact_phone || ""} onChange={(event) => setCompany((current) => ({ ...current, contact_phone: event.target.value }))} /></label>
            <label className="field"><span>Industry</span><input value={company.industry || ""} onChange={(event) => setCompany((current) => ({ ...current, industry: event.target.value }))} /></label>
            <label className="field"><span>Website</span><input value={company.website || ""} onChange={(event) => setCompany((current) => ({ ...current, website: event.target.value }))} /></label>
            <label className="field"><span>Currency</span><input value={company.settings_currency || ""} onChange={(event) => setCompany((current) => ({ ...current, settings_currency: event.target.value }))} /></label>
            <label className="field"><span>Timezone</span><input value={company.settings_timezone || ""} onChange={(event) => setCompany((current) => ({ ...current, settings_timezone: event.target.value }))} /></label>
            <div className="form-actions">
              <button className="button primary" type="submit">Save Company Settings</button>
            </div>
          </form>
        </section>
      )}
    </DashboardShell>
  );
}
