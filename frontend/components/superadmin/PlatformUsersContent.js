"use client";

import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../lib/api";
import { formatDateTime, titleize } from "./format";
import {
  Badge,
  EmptyState,
  GHOST_BUTTON_CLASS,
  INPUT_CLASS,
  MetricCard,
  MetricGrid,
  Modal,
  Notice,
  PANEL_CLASS,
  PageIntro,
  Panel,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  SUB_PANEL_CLASS,
} from "./ui";

const PLATFORM_ROLE_OPTIONS = ["platform-admin", "platform-manager"];
const TENANT_ROLE_OPTIONS = ["admin", "manager", "sales", "marketing", "support", "legal-team", "finance-team", "viewer"];

function createDefaultForm(canCreatePlatformRoles) {
  return {
    name: "",
    email: "",
    password: "",
    role: canCreatePlatformRoles ? "admin" : "manager",
    company_id: "",
    managed_company_ids: [],
  };
}

function isPlatformOperatorRole(role) {
  return PLATFORM_ROLE_OPTIONS.includes(role);
}

function isPlatformRootRole(role) {
  return role === "super-admin" || isPlatformOperatorRole(role);
}

function formatCompanyNames(companyIds, companiesById) {
  const items = (Array.isArray(companyIds) ? companyIds : [])
    .map((companyId) => companiesById.get(companyId)?.name || companyId)
    .filter(Boolean);
  return items.length ? items.join(", ") : "No company assignment";
}

function buildCreateFeedback(response) {
  const delivery = response?.credential_delivery?.delivery || "preview";
  const email = response?.email || "this inbox";
  const previewLogin = response?.credential_delivery?.preview_login_url ? ` Preview login: ${response.credential_delivery.preview_login_url}.` : "";
  const tempPassword = response?.temporary_password ? ` Temporary password: ${response.temporary_password}.` : "";
  const deliveryError = response?.credential_delivery?.error ? ` Mail error: ${response.credential_delivery.error}.` : "";

  if (delivery === "email") {
    return `User created and credentials email sent to ${email}.${previewLogin}`;
  }

  if (delivery === "queued") {
    return `User created for ${email}. Credentials email is sending in background.${tempPassword}${previewLogin}`;
  }

  return `User created for ${email}, but credentials email was not confirmed.${tempPassword}${previewLogin}${deliveryError}`;
}

function getAccessState(user) {
  if (!user?.is_active) {
    return { label: "Disabled", tone: "rose" };
  }

  if (user.last_login_at) {
    return { label: "Signed in", tone: "emerald" };
  }

  if (user.is_temporary_password) {
    return { label: "Pending first login", tone: "amber" };
  }

  return { label: "Access created", tone: "blue" };
}

export default function PlatformUsersContent({ session, data, error, loading, refresh }) {
  const canCreatePlatformRoles = session?.user?.role === "super-admin";
  const [form, setForm] = useState(createDefaultForm(canCreatePlatformRoles));
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const users = data.users?.items || [];
  const companies = data.companies?.items || [];
  const safety = data.safety || {};
  const companiesById = useMemo(() => new Map(companies.map((company) => [company.company_id, company])), [companies]);
  const roleOptions = canCreatePlatformRoles ? ["super-admin", ...PLATFORM_ROLE_OPTIONS, ...TENANT_ROLE_OPTIONS] : TENANT_ROLE_OPTIONS;
  const selectedRoleIsPlatformRoot = isPlatformRootRole(form.role);
  const selectedRoleIsPlatformOperator = isPlatformOperatorRole(form.role);
  const filteredUsers = useMemo(() => {
    const search = query.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [user.name, user.email, user.company_name, user.company_id, user.user_id, user.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }, [query, roleFilter, users]);
  const openSuperAdminSlots = Math.max(0, Number(safety.max_super_admins || 0) - Number(safety.super_admin_count || 0));

  useEffect(() => {
    setForm(createDefaultForm(canCreatePlatformRoles));
  }, [canCreatePlatformRoles]);

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setNotice(null);
  }

  function toggleManagedCompany(companyId) {
    setForm((current) => ({
      ...current,
      managed_company_ids: current.managed_company_ids.includes(companyId)
        ? current.managed_company_ids.filter((item) => item !== companyId)
        : [...current.managed_company_ids, companyId],
    }));
    setNotice(null);
  }

  async function handleCreateIdentity(event) {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);

    try {
      const response = await apiRequest("/auth/create-employee", {
        method: "POST",
        token: session.token,
        body: {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          ...(selectedRoleIsPlatformOperator ? { managed_company_ids: form.managed_company_ids } : {}),
          ...(!selectedRoleIsPlatformRoot && form.company_id ? { company_id: form.company_id } : {}),
        },
      });

      setNotice({ tone: "success", text: buildCreateFeedback(response) });
      setForm(createDefaultForm(canCreatePlatformRoles));
      await refresh();
    } catch (requestError) {
      setNotice({ tone: "error", text: requestError.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleUser(user) {
    setTogglingUserId(user.user_id);
    setNotice(null);

    try {
      await apiRequest(user.is_active ? `/super-admin/deactivate/${user.user_id}` : `/super-admin/activate/${user.user_id}`, {
        method: "PUT",
        token: session.token,
      });

      setNotice({ tone: "success", text: `${user.name || user.user_id} is now ${user.is_active ? "disabled" : "active"}.` });
      await refresh();
    } catch (requestError) {
      setNotice({ tone: "error", text: requestError.message });
    } finally {
      setTogglingUserId("");
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    if (!resetTarget) {
      return;
    }

    setResetting(true);
    setNotice(null);

    try {
      await apiRequest(`/super-admin/reset-password/${resetTarget.user_id}`, {
        method: "PUT",
        token: session.token,
        body: { password: resetPassword },
      });

      setNotice({ tone: "success", text: `Password updated for ${resetTarget.email}.` });
      setResetTarget(null);
      setResetPassword("");
      await refresh();
    } catch (requestError) {
      setNotice({ tone: "error", text: requestError.message });
    } finally {
      setResetting(false);
    }
  }

  return (
    <>
      <Notice tone="error" text={error} className="mb-4" />
      {notice ? <Notice tone={notice.tone} text={notice.text} className="mb-4" /> : null}
      {loading ? <Notice tone="info" text="Loading platform access desk..." className="mb-4" /> : null}

      {!loading ? (
        <div className="space-y-6">
          <PageIntro
            eyebrow="Platform Users"
            title="Access desk for tenant and platform identities"
            description="Create new identities, recover blocked access, and keep company ownership unblocked from a single premium control surface."
            meta={
              <>
                <Badge tone="violet">{titleize(session?.user?.role || "platform")}</Badge>
                <Badge tone={safety.can_create_more ? "emerald" : "amber"}>{openSuperAdminSlots} super-admin slots left</Badge>
                <Badge tone="slate">{companies.length} visible companies</Badge>
              </>
            }
          />

          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_360px]">
            <Panel
              eyebrow="Create Identity"
              title="Issue access without leaving the control room"
              description={canCreatePlatformRoles ? "Super Admin can create platform operators, super-admins, and tenant users. Platform roles stay company-agnostic while tenant roles require a company target." : "Platform Admin can create tenant users only inside assigned companies."}
            >
              <form className="space-y-4" onSubmit={handleCreateIdentity}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Role</span>
                    <select
                      className={INPUT_CLASS}
                      value={form.role}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          role: event.target.value,
                          company_id: isPlatformRootRole(event.target.value) ? "" : current.company_id,
                          managed_company_ids: isPlatformOperatorRole(event.target.value) ? current.managed_company_ids : [],
                        }))
                      }
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {titleize(role)}
                        </option>
                      ))}
                    </select>
                  </label>

                  {!selectedRoleIsPlatformRoot ? (
                    <label className="space-y-2">
                      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Target company</span>
                      <select className={INPUT_CLASS} value={form.company_id} onChange={(event) => updateForm("company_id", event.target.value)} required>
                        <option value="">Select company</option>
                        {companies.map((company) => (
                          <option key={company.company_id} value={company.company_id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Name</span>
                    <input className={INPUT_CLASS} value={form.name} onChange={(event) => updateForm("name", event.target.value)} required />
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Email</span>
                    <input className={INPUT_CLASS} type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} required />
                  </label>
                </div>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Password</span>
                  <input className={INPUT_CLASS} type="password" value={form.password} onChange={(event) => updateForm("password", event.target.value)} placeholder="Optional. Leave blank to auto-generate." />
                </label>

                {selectedRoleIsPlatformOperator ? (
                  <div className="space-y-3">
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Managed companies</span>
                    <div className="grid gap-3 md:grid-cols-2">
                      {companies.map((company) => {
                        const active = form.managed_company_ids.includes(company.company_id);
                        return (
                          <button
                            key={company.company_id}
                            type="button"
                            onClick={() => toggleManagedCompany(company.company_id)}
                            className={`${SUB_PANEL_CLASS} cursor-pointer text-left transition ${active ? "border-emerald-200 bg-emerald-50" : "hover:border-slate-300 hover:bg-white"}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <strong className="text-sm text-slate-900">{company.name}</strong>
                              <Badge tone={active ? "emerald" : "slate"}>{active ? "Assigned" : "Tap to assign"}</Badge>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">{company.slug || company.company_id}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={submitting}>
                    {submitting ? "Creating..." : "Create Access"}
                  </button>
                  <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => setForm(createDefaultForm(canCreatePlatformRoles))}>
                    Reset Form
                  </button>
                </div>
              </form>
            </Panel>

            <div className="space-y-6">
              <MetricGrid className="2xl:grid-cols-2">
                <MetricCard icon="security" label="Super Admin Seats" value={safety.super_admin_count || 0} note={`${openSuperAdminSlots} slots still open under current cap.`} tone="violet" />
                <MetricCard icon="users" label="Active Identities" value={users.filter((user) => user.is_active).length} note={`${users.filter((user) => !user.is_active).length} identities currently disabled.`} tone="emerald" />
              </MetricGrid>

              <article className={PANEL_CLASS}>
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Access Rules</span>
                <div className="mt-4 space-y-3">
                  <div className={SUB_PANEL_CLASS}>
                    <strong className="text-sm text-slate-900">Platform roles stay restricted</strong>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Only Super Admin can mint other platform operators or additional super-admin seats.</p>
                  </div>
                  <div className={SUB_PANEL_CLASS}>
                    <strong className="text-sm text-slate-900">Tenant roles require workspace context</strong>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Admin, manager, sales, support, legal, finance, and viewer users remain attached to a specific company.</p>
                  </div>
                  <div className={SUB_PANEL_CLASS}>
                    <strong className="text-sm text-slate-900">Password intervention stays visible</strong>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Use reset from the directory when someone is blocked and the tenant admin cannot recover it quickly.</p>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <Panel
            eyebrow="Identity Directory"
            title="Every platform-visible access seat"
            description="Search by user, company, role, or ID. Activation state and first-login readiness stay visible at scan speed."
            action={
              <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row">
                <input className={INPUT_CLASS} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, company, role, or ID" />
                <select className={INPUT_CLASS} value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                  <option value="all">All roles</option>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {titleize(role)}
                    </option>
                  ))}
                </select>
              </div>
            }
          >
            {filteredUsers.length ? (
              <div className="space-y-3">
                {filteredUsers.map((user) => {
                  const accessState = getAccessState(user);
                  return (
                    <div key={user.user_id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-base text-slate-900">{user.name || user.user_id}</strong>
                            <Badge tone="slate">{user.user_id}</Badge>
                            <Badge tone={user.is_active ? "emerald" : "rose"}>{user.is_active ? "Active" : "Inactive"}</Badge>
                            <Badge tone={accessState.tone}>{accessState.label}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-slate-600">{user.email} | {user.company_name || user.company_id || "Platform workspace"}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge tone={isPlatformRootRole(user.role) ? "violet" : "blue"}>{titleize(user.role)}</Badge>
                            {isPlatformOperatorRole(user.role) ? <Badge tone="slate">{formatCompanyNames(user.managed_company_ids, companiesById)}</Badge> : null}
                            {user.last_login_at ? <Badge tone="slate">Last login {formatDateTime(user.last_login_at)}</Badge> : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button type="button" className={GHOST_BUTTON_CLASS} onClick={() => { setResetTarget(user); setResetPassword(""); }}>
                            Reset Password
                          </button>
                          <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => handleToggleUser(user)} disabled={togglingUserId === user.user_id}>
                            {togglingUserId === user.user_id ? "Updating..." : user.is_active ? "Disable" : "Enable"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon="users" title="No matching identities" description="Try another role filter or search term to find the access seat you need to manage." />
            )}
          </Panel>
        </div>
      ) : null}

      {resetTarget ? (
        <Modal title={`Reset password for ${resetTarget.name || resetTarget.user_id}`} description="Set a fresh password directly from the platform access desk. This is best used when tenant operators are blocked." onClose={() => setResetTarget(null)}>
          <form className="space-y-4" onSubmit={handleResetPassword}>
            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">New password</span>
              <input className={INPUT_CLASS} type="password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} minLength={8} required />
            </label>
            <div className="flex flex-wrap gap-3">
              <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={resetting}>
                {resetting ? "Saving..." : "Save Password"}
              </button>
              <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => setResetTarget(null)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
