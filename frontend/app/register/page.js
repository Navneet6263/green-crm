"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import SiteHeader from "../../components/SiteHeader";
import { apiRequest } from "../../lib/api";
import { ROLE_HOME_ROUTE } from "../../lib/roles";
import { saveSession } from "../../lib/session";

const ROLE_IN_COMPANY_OPTIONS = [
  "Founder",
  "CEO",
  "Director",
  "Operations Head",
  "Sales Head",
  "Admin Lead",
];

const INDUSTRY_OPTIONS = [
  "Staffing",
  "Real Estate",
  "Finance",
  "IT Services",
  "Education",
  "Healthcare",
  "Manufacturing",
  "Other",
];

const TEAM_SIZE_OPTIONS = ["1-10", "11-25", "26-50", "51-100", "100+"];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    admin_name: "",
    admin_email: "",
    admin_phone: "",
    role_in_company: "Founder",
    company_name: "",
    company_url: "",
    industry: "Staffing",
    team_size: "1-10",
    city: "",
    country: "India",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const session = await apiRequest("/auth/register", {
        method: "POST",
        body: {
          ...form,
          website: form.company_url,
        },
      });

      saveSession(session);
      router.push(ROLE_HOME_ROUTE[session?.user?.role] || "/dashboard");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <SiteHeader compact />

      <main className="auth-page auth-sky-page">
        <section className="auth-stage register">
          <div className="auth-stage-form">
            <div className="auth-stage-topbar">
              <span className="eyebrow">Sign Up</span>
              <div className="auth-stage-switch">
                <span>Already have access?</span>
                <Link href="/login">Login</Link>
              </div>
            </div>

            <div className="auth-copy-block">
              <h1>Create your company workspace</h1>
              <p>Tell us about the company owner and the business so the first admin dashboard starts with the right context.</p>
            </div>

            {error ? <div className="alert error">{error}</div> : null}

            <form className="form-grid two-column" onSubmit={handleSubmit}>
              <label className="field">
                <span>Your Name</span>
                <input
                  value={form.admin_name}
                  onChange={(event) => setForm((current) => ({ ...current, admin_name: event.target.value }))}
                  placeholder="Aman Verma"
                  required
                />
              </label>

              <label className="field">
                <span>Work Email</span>
                <input
                  type="email"
                  value={form.admin_email}
                  onChange={(event) => setForm((current) => ({ ...current, admin_email: event.target.value }))}
                  placeholder="founder@company.com"
                  required
                />
              </label>

              <label className="field">
                <span>Phone Number</span>
                <input
                  value={form.admin_phone}
                  onChange={(event) => setForm((current) => ({ ...current, admin_phone: event.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </label>

              <label className="field">
                <span>Your Role In Company</span>
                <select
                  value={form.role_in_company}
                  onChange={(event) => setForm((current) => ({ ...current, role_in_company: event.target.value }))}
                >
                  {ROLE_IN_COMPANY_OPTIONS.map((option) => (
                    <option value={option} key={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Company Name</span>
                <input
                  value={form.company_name}
                  onChange={(event) => setForm((current) => ({ ...current, company_name: event.target.value }))}
                  placeholder="Vision India Services"
                  required
                />
              </label>

              <label className="field">
                <span>Company URL</span>
                <input
                  value={form.company_url}
                  onChange={(event) => setForm((current) => ({ ...current, company_url: event.target.value }))}
                  placeholder="https://visionindia.com"
                />
              </label>

              <label className="field">
                <span>Industry</span>
                <select
                  value={form.industry}
                  onChange={(event) => setForm((current) => ({ ...current, industry: event.target.value }))}
                >
                  {INDUSTRY_OPTIONS.map((option) => (
                    <option value={option} key={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Team Size</span>
                <select
                  value={form.team_size}
                  onChange={(event) => setForm((current) => ({ ...current, team_size: event.target.value }))}
                >
                  {TEAM_SIZE_OPTIONS.map((option) => (
                    <option value={option} key={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>City</span>
                <input
                  value={form.city}
                  onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                  placeholder="Noida"
                />
              </label>

              <label className="field">
                <span>Country</span>
                <input
                  value={form.country}
                  onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
                  placeholder="India"
                />
              </label>

              <label className="field full-width">
                <span>Password</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  required
                />
              </label>

              <div className="auth-actions-row">
                <button className="button primary" type="submit" disabled={loading}>
                  {loading ? "Creating workspace..." : "Create Workspace"}
                </button>

                <Link href="/login" className="button ghost" style={{ justifyContent: "center" }}>
                  I already have access
                </Link>
              </div>
            </form>
          </div>

          <div className="auth-stage-visual">
            <div className="auth-visual-chip">Company onboarding</div>

            <div className="auth-visual-card tall">
              <span>Launch flow</span>
              <strong>Start with the right details</strong>
              <p>Name, company URL, role in company, industry, and team size shape the first admin workspace.</p>
            </div>

            <div className="auth-visual-card stat">
              <span>Setup blocks</span>
              <strong>03</strong>
              <div className="auth-pill-stack">
                <span>Company profile</span>
                <span>Owner access</span>
                <span>Dashboard ready</span>
              </div>
            </div>

            <div className="auth-visual-rule">
              <div className="auth-visual-lines">
                <span />
                <span />
                <span />
              </div>
              <div>
                <strong>Your CRM, Your Rules</strong>
                <p>Every tenant gets its own company-safe setup from the first signup step.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
