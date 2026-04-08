"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import SiteHeader from "../../components/SiteHeader";
import { apiRequest } from "../../lib/api";
import { saveSession } from "../../lib/session";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    company_name: "",
    company_slug: "",
    website: "",
    admin_name: "",
    admin_email: "",
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
        body: form,
      });

      saveSession(session);
      router.push("/dashboard");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <SiteHeader compact />

      <main className="auth-page">
        <section className="auth-card wide">
          <span className="eyebrow">Register</span>
          <h1>Create your company workspace</h1>
          <p>Start with the company admin. We can add managers, sales, marketing, and support users after this.</p>

          {error ? <div className="alert error">{error}</div> : null}

          <form className="form-grid two-column" onSubmit={handleSubmit}>
            <label className="field">
              <span>Company Name</span>
              <input
                value={form.company_name}
                onChange={(event) => setForm((current) => ({ ...current, company_name: event.target.value }))}
                placeholder="Vision India"
                required
              />
            </label>

            <label className="field">
              <span>Company Slug</span>
              <input
                value={form.company_slug}
                onChange={(event) => setForm((current) => ({ ...current, company_slug: event.target.value }))}
                placeholder="vision-india"
                required
              />
            </label>

            <label className="field">
              <span>Website</span>
              <input
                value={form.website}
                onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
                placeholder="https://visionindia.com"
              />
            </label>

            <label className="field">
              <span>Admin Name</span>
              <input
                value={form.admin_name}
                onChange={(event) => setForm((current) => ({ ...current, admin_name: event.target.value }))}
                placeholder="Aman Verma"
                required
              />
            </label>

            <label className="field">
              <span>Admin Email</span>
              <input
                type="email"
                value={form.admin_email}
                onChange={(event) => setForm((current) => ({ ...current, admin_email: event.target.value }))}
                placeholder="admin@visionindia.com"
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Minimum 8 characters"
                required
              />
            </label>

            <button className="button primary" type="submit" disabled={loading}>
              {loading ? "Creating workspace..." : "Create Workspace"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
