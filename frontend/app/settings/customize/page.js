"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";
import CustomizeHeader from "../../../components/customize/CustomizeHeader";
import LeadStatusCustomizer from "../../../components/customize/LeadStatusCustomizer";
import LeadFormFieldsCustomizer from "../../../components/customize/LeadFormFieldsCustomizer";
import CustomFieldsManager from "../../../components/customize/CustomFieldsManager";
import SaveCustomizationBar from "../../../components/customize/SaveCustomizationBar";

export default function CustomizePage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    loadCustomization(activeSession);
  }, [router]);

  async function loadCustomization(activeSession) {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/customization", { token: activeSession.token });
      setSettings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!session || !settings) return;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await apiRequest("/customization", {
        method: "PUT",
        token: session.token,
        body: settings,
      });
      setMessage("Customization settings saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <DashboardShell session={session} title="Customize" hideTitle heroStats={[]}>
        <div className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-3 text-sm font-medium text-[#6f614c]">
          Loading customization settings...
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell session={session} title="Customize" hideTitle heroStats={[]}>
      <div className="mx-auto max-w-[1400px] space-y-4 px-1 pb-20">
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

        <CustomizeHeader />

        <div className="space-y-4">
          <LeadStatusCustomizer
            statuses={settings.lead_statuses}
            onChange={(statuses) => setSettings({ ...settings, lead_statuses: statuses })}
          />

          <LeadFormFieldsCustomizer
            fields={settings.lead_form_fields}
            onChange={(fields) => setSettings({ ...settings, lead_form_fields: fields })}
          />

          <CustomFieldsManager
            customFields={settings.custom_fields}
            onChange={(fields) => setSettings({ ...settings, custom_fields: fields })}
          />
        </div>

        <SaveCustomizationBar saving={saving} onSave={handleSave} />
      </div>
    </DashboardShell>
  );
}
