"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import CompanyLeadershipPanel from "../../../components/company-settings/CompanyLeadershipPanel";
import CompanySnapshotPanel from "../../../components/company-settings/CompanySnapshotPanel";
import CompactCompanySettingsForm from "../../../components/company-settings/CompactCompanySettingsForm";
import CompactHero from "../../../components/company-settings/CompactHero";
import { buildDraft } from "../../../components/company-settings/utils";
import Link from "next/link";
import SettingsLayout from "../../../components/settings/SettingsLayout";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";

export default function CompanySettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [company, setCompany] = useState(null);
  const [people, setPeople] = useState([]);
  const [draft, setDraft] = useState(buildDraft(null));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

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
    Promise.all([
      apiRequest("/auth/profile", { token: activeSession.token }),
      apiRequest("/auth/users?page_size=80", { token: activeSession.token }),
    ])
      .then(([response, usersResponse]) => {
        setCompany(response.company);
        setDraft(buildDraft(response.company));
        setPeople(usersResponse.items || []);
      })
      .catch((requestError) => setError(requestError.message));
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const body = {
        name: draft.name,
        contact_email: draft.contact_email,
        admin_email: draft.admin_email,
        contact_phone: draft.contact_phone,
        industry: draft.industry,
        website: draft.website,
        country: draft.country,
        settings_currency: draft.settings_currency,
        settings_timezone: draft.settings_timezone,
        smtp_host: draft.smtp_host || null,
        smtp_port: draft.smtp_port ? Number(draft.smtp_port) : null,
        smtp_user: draft.smtp_user || null,
        smtp_from_email: draft.smtp_from_email || null,
        smtp_from_name: draft.smtp_from_name || null,
        smtp_reply_to: draft.smtp_reply_to || null,
        login_url: draft.login_url || null,
        credentials_subject: draft.credentials_subject || null,
        credentials_heading: draft.credentials_heading || null,
        credentials_note: draft.credentials_note || null,
        reset_subject: draft.reset_subject || null,
      };

      if (draft.smtp_password.trim()) {
        body.smtp_password = draft.smtp_password.trim();
      }

      const response = await apiRequest(`/companies/${company.company_id}`, {
        method: "PUT",
        token: session.token,
        body,
      });

      setCompany(response);
      setDraft(buildDraft(response));
      setMessage("Company settings updated.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTestEmail() {
    if (!company || !draft.test_email_to.trim()) {
      setError("Test email recipient is required.");
      return;
    }

    setError("");
    setMessage("");
    setTesting(true);

    try {
      const response = await apiRequest("/communications/test-email", {
        method: "POST",
        token: session.token,
        body: {
          company_id: company.company_id,
          to: draft.test_email_to.trim(),
        },
      });

      setMessage(
        response.delivery?.delivery === "email"
          ? "SMTP test email sent successfully."
          : "SMTP test fell back to preview mode. Check backend SMTP routing."
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setTesting(false);
    }
  }


  return (
    <SettingsLayout session={session} active="company" wide>
      <div className="space-y-4">
        {error && (
          <div role="alert" className="rounded-[12px] bg-rose-50 px-4 py-2.5 text-[13px] font-medium text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        )}
        {message && (
          <div role="status" className="rounded-[12px] bg-emerald-50 px-4 py-2.5 text-[13px] font-medium text-emerald-800 ring-1 ring-emerald-100">
            {message}
          </div>
        )}
        
        {!company ? (
          <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-28 animate-pulse rounded-[14px] bg-white ring-1 ring-slate-200" />)}</div>
        ) : (
          <>
            <CompactHero company={company} draft={draft} />

            <div className="grid gap-4 lg:grid-cols-[1fr_380px] lg:items-start">
              <CompactCompanySettingsForm
                draft={draft}
                setDraft={setDraft}
                saving={saving}
                testing={testing}
                onSubmit={handleSubmit}
                onSendTestEmail={handleSendTestEmail}
              />

              <div className="space-y-4">
                <CompanyLeadershipPanel people={people} />
                <CompanySnapshotPanel company={company} draft={draft} />
              </div>
            </div>

            <Link href="/settings/integrations" prefetch className="flex items-center justify-between gap-3 rounded-[14px] bg-white p-4 ring-1 ring-slate-200 hover:ring-slate-300">
              <span><b className="block text-[14px] font-semibold text-slate-900">WhatsApp, SMS, calling and Microsoft 365 inbox</b><span className="text-[12.5px] text-slate-500">Moved to Integrations, with their status in one place.</span></span>
              <span className="text-[13px] font-semibold text-brand-700">Open →</span>
            </Link>
          </>
        )}
      </div>
    </SettingsLayout>
  );
}
