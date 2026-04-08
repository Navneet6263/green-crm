"use client";

import { useState } from "react";

import SiteHeader from "../../components/SiteHeader";
import { apiRequest } from "../../lib/api";

export default function BookDemoPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    requirements: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await apiRequest("/demo-requests", {
        method: "POST",
        body: {
          ...form,
          message: form.requirements,
        },
      });
      setSubmitted(true);
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
          <span className="eyebrow">Book Demo</span>
          <h1>Walk through the showroom version of GreenCRM</h1>
          <p>Share the team size and workflow you want. We can tune the same design system around your actual modules.</p>

          {submitted ? <div className="alert">Demo request captured. Our team can now review it from the super-admin demo requests page.</div> : null}
          {error ? <div className="alert error">{error}</div> : null}

          <form className="form-grid two-column" onSubmit={handleSubmit}>
            <label className="field">
              <span>Name</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>Company</span>
              <input
                value={form.company}
                onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>Phone</span>
              <input
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="+91 98765 43210"
              />
            </label>

            <label className="field full-width">
              <span>Requirements</span>
              <textarea
                rows="5"
                value={form.requirements}
                onChange={(event) => setForm((current) => ({ ...current, requirements: event.target.value }))}
                placeholder="Tell us about leads, teams, role views, products, or integrations."
              />
            </label>

            <button className="button primary" type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send Demo Request"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
