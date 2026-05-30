"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import CompanyLeadershipPanel from "../../../components/company-settings/CompanyLeadershipPanel";
import CompanySnapshotPanel from "../../../components/company-settings/CompanySnapshotPanel";
import CompactCompanySettingsForm from "../../../components/company-settings/CompactCompanySettingsForm";
import CompactHero from "../../../components/company-settings/CompactHero";
import CollapsibleSection from "../../../components/company-settings/CollapsibleSection";
import { buildDraft } from "../../../components/company-settings/utils";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import CommunicationSettingsSection from "../../../components/integrations/CommunicationSettingsSection";
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

  const isPlatformRoot = company?.company_id === "platform-root";
  const canEditPermissions = session?.user?.role === "super-admin" && !isPlatformRoot;

  return (
    <DashboardShell session={session} title="Company Settings" hideTitle heroStats={[]}>
      <div className="mx-auto max-w-[1400px] space-y-4 px-1">
        {error && (
          <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {message}
          </div>
        )}
        
        {!company ? (
          <div className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-3 text-sm font-medium text-[#6f614c]">
            Loading company settings...
          </div>
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

            <CollapsibleSection
              title={isPlatformRoot ? "Platform Communication Providers" : "Communication Providers"}
              subtitle="Manage call, SMS, and WhatsApp integrations"
              defaultOpen={false}
            >
              <CommunicationSettingsSection
                companyId={company.company_id}
                token={session?.token}
                title=""
                description={
                  isPlatformRoot
                    ? "Define the shared provider credentials and office attendance IP policy used when companies are approved for platform-managed channels."
                    : "Manage tenant credentials, review managed paid service status, and see the backend-resolved capability for each communication channel."
                }
                canEditIntegrations={["super-admin", "admin"].includes(session?.user?.role)}
                canEditPermissions={canEditPermissions}
                platformRoot={isPlatformRoot}
              />
            </CollapsibleSection>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
