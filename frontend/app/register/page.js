"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import AuthShell from "../../components/auth/AuthShell";
import { apiRequest } from "../../lib/api";
import { ROLE_HOME_ROUTE } from "../../lib/roles";
import { saveSession } from "../../lib/session";

const INPUT_CLASS = "w-full rounded-[20px] border border-[#eadfcd] bg-white/90 px-4 py-3.5 text-sm text-[#060710] outline-none transition placeholder:text-[#9c8e76] focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const PRIMARY_BUTTON_CLASS = "inline-flex min-h-[50px] items-center justify-center rounded-[20px] border border-[#10111d] bg-[#10111d] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#1a1c2b] disabled:cursor-not-allowed disabled:opacity-60";
const GHOST_BUTTON_CLASS = "inline-flex min-h-[50px] items-center justify-center rounded-[20px] border border-[#eadfcd] bg-white px-5 py-3 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:border-[#d7b258] hover:text-[#060710]";
const SECTION_CLASS = "rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4 md:p-5";
const LABEL_CLASS = "text-[10px] font-black uppercase tracking-[0.24em] text-[#9a886d]";

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
    <AuthShell
      modeLabel="Sign Up"
      switchText="Already have access?"
      switchHref="/login"
      switchLabel="Login"
      title="Create your company workspace"
      description="Fill the owner and company details once, and GreenCRM will open the first admin workspace with the right starting structure."
      sideEyebrow="Workspace Setup"
      sideTitle="Set up your company CRM with owner, business, and team details from the first step."
      sideCopy="Create the first admin account, define company profile, and start with leads, customers, products, and team access under one workspace."
      metrics={[
        { label: "Setup Blocks", value: "3", copy: "Owner details, company profile, and workspace access." },
        { label: "Launch Ready", value: "Day 1", copy: "Admin login, team shell, and CRM structure start immediately." },
        { label: "Tenant Safe", value: "1 Workspace", copy: "Every signup opens its own company-scoped CRM." },
      ]}
      features={[
        { icon: "company", title: "Company profile first", copy: "Capture company name, URL, industry, and team size in one onboarding pass.", tone: "bg-[#fff4d9] text-[#8d6e27]" },
        { icon: "users", title: "Owner-first access", copy: "The first admin account is created with the right company identity and control.", tone: "bg-[#f6efe2] text-[#5d503c]" },
        { icon: "dashboard", title: "CRM ready from day one", copy: "The workspace opens ready for leads, customers, tasks, products, and role-based dashboards.", tone: "bg-[#ebf8ee] text-[#217346]" },
      ]}
    >
      <div className="space-y-5">
        {error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <section className={SECTION_CLASS}>
            <div className="mb-4">
              <p className={LABEL_CLASS}>Owner Profile</p>
              <h2 className="mt-2 text-lg font-semibold text-[#060710]">Primary admin details</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className={LABEL_CLASS}>Your Name</span>
                <input
                  className={INPUT_CLASS}
                  value={form.admin_name}
                  onChange={(event) => setForm((current) => ({ ...current, admin_name: event.target.value }))}
                  placeholder="Aman Verma"
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className={LABEL_CLASS}>Work Email</span>
                <input
                  className={INPUT_CLASS}
                  type="email"
                  value={form.admin_email}
                  onChange={(event) => setForm((current) => ({ ...current, admin_email: event.target.value }))}
                  placeholder="founder@company.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className={LABEL_CLASS}>Phone Number</span>
                <input
                  className={INPUT_CLASS}
                  value={form.admin_phone}
                  onChange={(event) => setForm((current) => ({ ...current, admin_phone: event.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </label>

              <label className="block space-y-2">
                <span className={LABEL_CLASS}>Role In Company</span>
                <select
                  className={INPUT_CLASS}
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
            </div>
          </section>

          <section className={SECTION_CLASS}>
            <div className="mb-4">
              <p className={LABEL_CLASS}>Company Profile</p>
              <h2 className="mt-2 text-lg font-semibold text-[#060710]">Business details</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className={LABEL_CLASS}>Company Name</span>
                <input
                  className={INPUT_CLASS}
                  value={form.company_name}
                  onChange={(event) => setForm((current) => ({ ...current, company_name: event.target.value }))}
                  placeholder="Vision India Services"
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className={LABEL_CLASS}>Company URL</span>
                <input
                  className={INPUT_CLASS}
                  value={form.company_url}
                  onChange={(event) => setForm((current) => ({ ...current, company_url: event.target.value }))}
                  placeholder="https://visionindia.com"
                />
              </label>

              <label className="block space-y-2">
                <span className={LABEL_CLASS}>Industry</span>
                <select
                  className={INPUT_CLASS}
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

              <label className="block space-y-2">
                <span className={LABEL_CLASS}>Team Size</span>
                <select
                  className={INPUT_CLASS}
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

              <label className="block space-y-2">
                <span className={LABEL_CLASS}>City</span>
                <input
                  className={INPUT_CLASS}
                  value={form.city}
                  onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                  placeholder="Noida"
                />
              </label>

              <label className="block space-y-2">
                <span className={LABEL_CLASS}>Country</span>
                <input
                  className={INPUT_CLASS}
                  value={form.country}
                  onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
                  placeholder="India"
                />
              </label>
            </div>
          </section>

          <section className={SECTION_CLASS}>
            <div className="mb-4">
              <p className={LABEL_CLASS}>Access Setup</p>
              <h2 className="mt-2 text-lg font-semibold text-[#060710]">Create login password</h2>
            </div>

            <label className="block space-y-2">
              <span className={LABEL_CLASS}>Password</span>
              <input
                className={INPUT_CLASS}
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
          </section>

          <div className="grid gap-3 pt-2 sm:grid-cols-2">
            <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={loading}>
              {loading ? "Creating workspace..." : "Create Workspace"}
            </button>
            <Link href="/login" className={GHOST_BUTTON_CLASS}>
              I already have access
            </Link>
          </div>
        </form>
      </div>
    </AuthShell>
  );
}
