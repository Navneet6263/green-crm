"use client";

import { useMemo } from "react";

import { titleize } from "./format";
import { Badge, EmptyState, MetricCard, MetricGrid, Notice, PageIntro, Panel } from "./ui";

export default function SecurityContent({ session, data, error, loading }) {
  const users = data.users?.items || [];
  const companies = data.companies?.items || [];
  const safety = data.safety || {};
  const inactiveAdmins = useMemo(() => users.filter((user) => user.role === "admin" && !user.is_active), [users]);
  const suspendedCompanies = useMemo(() => companies.filter((company) => company.status === "suspended"), [companies]);

  return (
    <>
      <Notice tone="error" text={error} className="mb-4" />
      {loading ? <Notice tone="info" text="Loading security posture..." className="mb-4" /> : null}

      {!loading ? (
        <div className="space-y-6">
          <PageIntro
            eyebrow="Safety Controls"
            title="Platform security and recovery posture"
            description="See guardrails, tenant suspension risk, and which admins are currently blocked so the platform team can step in before work stalls."
            meta={
              <>
                <Badge tone="violet">{titleize(session?.user?.role || "platform")}</Badge>
                <Badge tone={safety.can_create_more ? "emerald" : "amber"}>{safety.can_create_more ? "Seat headroom available" : "Super-admin cap reached"}</Badge>
              </>
            }
          />

          <MetricGrid className="2xl:grid-cols-4">
            <MetricCard icon="security" label="Super Admins" value={safety.super_admin_count || 0} note={`Max allowed: ${safety.max_super_admins || 0}`} tone="violet" />
            <MetricCard icon="users" label="Inactive Admins" value={safety.inactive_admins || 0} note="Tenant admins who currently cannot unblock their own company." tone="amber" />
            <MetricCard icon="company" label="Suspended Companies" value={safety.suspended_companies || 0} note="Workspaces that need recovery or status review." tone="rose" />
            <MetricCard icon="dashboard" label="Platform Capacity" value={safety.can_create_more ? "Healthy" : "At limit"} note="Super-admin creation headroom from the platform safety policy." tone="blue" />
          </MetricGrid>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel eyebrow="Recovery Queue" title="Inactive tenant admins" description="These admins may need reactivation, replacement, or direct platform intervention.">
              {inactiveAdmins.length ? (
                <div className="space-y-3">
                  {inactiveAdmins.map((user) => (
                    <div key={user.user_id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm text-slate-900">{user.name}</strong>
                        <Badge tone="rose">Inactive</Badge>
                        <Badge tone="blue">{user.company_name || user.company_id}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{user.email}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon="users" title="No inactive admins" description="Tenant admin coverage looks healthy across the currently visible workspace set." />
              )}
            </Panel>

            <Panel eyebrow="Tenant Status" title="Suspended workspaces" description="Suspended workspaces usually need billing, compliance, or manual enablement review from the platform side.">
              {suspendedCompanies.length ? (
                <div className="space-y-3">
                  {suspendedCompanies.map((company) => (
                    <div key={company.company_id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm text-slate-900">{company.name}</strong>
                        <Badge tone="rose">Suspended</Badge>
                        <Badge tone="slate">{company.company_id}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{company.contact_email || company.admin_email || "No contact email"}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon="company" title="No suspended companies" description="No company in the current platform scope is marked suspended right now." />
              )}
            </Panel>
          </div>
        </div>
      ) : null}
    </>
  );
}
