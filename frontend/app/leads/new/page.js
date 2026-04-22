"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import DashboardIcon from "../../../components/dashboard/icons";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";
import {
  canManageScopedAssignments,
  formatScopedError,
  filterRecordsByTeam,
  getTeamAssignmentState,
  isPlatformConsoleRole,
  loadProductsForScope,
  loadTeamScopeResources,
  scopedOwnersHelperText,
  scopedProductsHelperText,
  shouldShowTeamSelector,
  scopedProductsEmptyMessage,
  scopedUsersEmptyMessage,
  teamBadgeLabel,
  teamSelectLabel,
  teamSelectionRequiredMessage,
  resolveScopedCompanyId,
} from "../../../lib/teamScope";
import { AlertError } from "../../../components/ui/Alert";

const ALLOWED_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager", "sales", "marketing"];

const INDUSTRY_OPTIONS = [
  { value: "", label: "Select industry" },
  { value: "technology", label: "Technology" },
  { value: "healthcare", label: "Healthcare" },
  { value: "finance", label: "Finance" },
  { value: "education", label: "Education" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "retail", label: "Retail" },
  { value: "real-estate", label: "Real Estate" },
  { value: "services", label: "Professional Services" },
  { value: "other", label: "Other" },
];

const LEAD_SOURCE_OPTIONS = [
  { value: "website", label: "Website" },
  { value: "google", label: "Google" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "referral", label: "Referral" },
  { value: "cold-call", label: "Cold Call" },
  { value: "email-campaign", label: "Email Campaign" },
  { value: "partner", label: "Partner" },
  { value: "trade-show", label: "Trade Show" },
  { value: "walk-in", label: "Walk-in" },
  { value: "other", label: "Other" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low Priority" },
  { value: "medium", label: "Medium Priority" },
  { value: "high", label: "High Priority" },
];
const PANEL_CLASS = "rounded-[30px] border border-[#eadfcd] bg-white/82 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)] md:p-6";
const INPUT_CLASS = "w-full rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#060710] outline-none transition placeholder:text-[#9c8e76] focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const PRIMARY_BUTTON_CLASS = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#d7b258] bg-[#f3dfab] px-4 py-2.5 text-sm font-semibold text-[#060710] shadow-[0_16px_30px_rgba(203,169,82,0.18)] transition hover:-translate-y-0.5 hover:bg-[#efd48f] disabled:cursor-not-allowed disabled:opacity-60";
const GHOST_BUTTON_CLASS = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#eadfcd] bg-white px-4 py-2.5 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:text-[#060710] disabled:cursor-not-allowed disabled:opacity-60";
const KICKER_CLASS = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";

function createInitialForm(companyId = "") {
  return {
    company_id: companyId,
    team_id: "",
    product_id: "",
    contact_person: "",
    company_name: "",
    email: "",
    phone: "",
    industry: "",
    lead_source: "website",
    custom_lead_source: "",
    follow_up_date: "",
    estimated_value: "",
    number_of_units: "",
    priority: "medium",
    requirements: "",
    assigned_to: "",
    address_street: "",
    address_city: "",
    address_state: "",
    address_zip: "",
    address_country: "India",
  };
}

function formatDateTimeMin() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function NewLeadPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [teams, setTeams] = useState([]);
  const [products, setProducts] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [productHistory, setProductHistory] = useState([]);
  const [form, setForm] = useState(createInitialForm());
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const role = session?.user?.role || "";
  const canAssign = canManageScopedAssignments(role);
  const isPlatformConsole = isPlatformConsoleRole(role);
  const isSuperAdmin = role === "super-admin";
  const selectedCompanyId = resolveScopedCompanyId(session, form.company_id);
  const selectedCompany = useMemo(
    () =>
      companies.find((company) => company.company_id === selectedCompanyId) ||
      companies[0] ||
      session?.company ||
      null,
    [companies, selectedCompanyId, session?.company]
  );
  const selectedProduct = useMemo(
    () => products.find((product) => product.product_id === form.product_id) || null,
    [products, form.product_id]
  );
  const teamAssignment = useMemo(
    () => getTeamAssignmentState(teams, form.team_id, "lead"),
    [form.team_id, teams]
  );
  const selectedTeam = teamAssignment.selectedTeam;
  const teamSelectorVisible = shouldShowTeamSelector(role, teams);
  const teamSelectionPending = teamSelectorVisible && !form.team_id;
  const filteredProducts = useMemo(
    () => (teamSelectionPending ? [] : filterRecordsByTeam(products, form.team_id)),
    [products, form.team_id, teamSelectionPending]
  );
  const selectedAssignee = useMemo(
    () => assignableUsers.find((user) => user.user_id === form.assigned_to) || null,
    [assignableUsers, form.assigned_to]
  );
  const minimumDateTime = useMemo(() => formatDateTimeMin(), []);
  const hideTitle = ["sales", "marketing", "admin", "manager", "platform-admin", "platform-manager"].includes(role);
  const canOpenTeamWorkspace = ["super-admin", "platform-admin", "platform-manager", "admin", "manager"].includes(role);
  const ownerScopeSummary = useMemo(() => {
    if (teamSelectionPending) {
      return "Choose a team first. Available owners load after selection.";
    }

    if (selectedTeam) {
      return scopedOwnersHelperText(selectedTeam);
    }

    if (teamAssignment.mode === "none") {
      return "Create a team first before owner filtering becomes team-specific.";
    }

    return "Available owners update after you choose a team.";
  }, [selectedTeam, teamAssignment.mode, teamSelectionPending]);
  const productScopeSummary = useMemo(() => {
    if (teamSelectionPending) {
      return "Choose a team first. Products load after selection.";
    }

    if (selectedTeam) {
      return scopedProductsHelperText(selectedTeam);
    }

    if (teamAssignment.mode === "none") {
      return "Create a team first before product scope becomes team-specific.";
    }

    return "Products update after you choose a team.";
  }, [selectedTeam, teamAssignment.mode, teamSelectionPending]);
  const ownerHelperMessage = useMemo(() => {
    if (!canAssign || resourceLoading) {
      return "";
    }

    if (teamSelectionPending) {
      return "Choose a team to load available owners.";
    }

    if (!assignableUsers.length) {
      return scopedUsersEmptyMessage(selectedTeam);
    }

    return ownerScopeSummary;
  }, [assignableUsers.length, canAssign, ownerScopeSummary, resourceLoading, selectedTeam, teamSelectionPending]);
  const productHelperMessage = useMemo(() => {
    if (resourceLoading) {
      return "";
    }

    if (teamSelectionPending) {
      return "Choose a team to load products for this lead.";
    }

    if (!filteredProducts.length) {
      return scopedProductsEmptyMessage(selectedTeam);
    }

    return productScopeSummary;
  }, [filteredProducts.length, productScopeSummary, resourceLoading, selectedTeam, teamSelectionPending]);

  useEffect(() => {
    let ignore = false;

    async function bootstrap() {
      const activeSession = loadSession();
      if (!activeSession) {
        router.replace("/login");
        return;
      }

      if (!ALLOWED_ROLES.includes(activeSession.user?.role)) {
        router.replace("/dashboard");
        return;
      }

      setSession(activeSession);

      try {
        if (["super-admin", "platform-admin", "platform-manager"].includes(activeSession.user?.role)) {
          const companyResponse = await apiRequest("/companies?page_size=50", {
            token: activeSession.token,
          });
          if (ignore) {
            return;
          }

          const nextCompanies = companyResponse.items || [];
          const defaultCompanyId = nextCompanies[0]?.company_id || "";
          setCompanies(nextCompanies);
          setForm(createInitialForm(defaultCompanyId));
        } else {
          const currentCompany = activeSession.company
            ? [
                {
                  company_id: activeSession.company.company_id || activeSession.user?.company_id,
                  name: activeSession.company.name,
                  slug: activeSession.company.slug,
                  admin_email: activeSession.company.admin_email,
                  status: activeSession.company.status,
                },
              ]
            : [];

          setCompanies(currentCompany);
          setForm(createInitialForm(activeSession.user?.company_id || activeSession.company?.company_id || ""));
        }
      } catch (requestError) {
        if (!ignore) {
          setError(requestError.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      ignore = true;
    };
  }, [router]);

  useEffect(() => {
    let ignore = false;

    async function loadResources() {
      if (!session) {
        return;
      }

      if (isPlatformConsole && !form.company_id) {
        setTeams([]);
        setProducts([]);
        setAssignableUsers([]);
        setProductHistory([]);
        return;
      }

      setResourceLoading(true);
      setError("");

      try {
        const shouldLoadScopedUsers = canAssign && !teamSelectionPending;
        const shouldLoadScopedProducts = !teamSelectionPending;
        const requests = [
          loadTeamScopeResources(session.token, {
            companyId: selectedCompanyId,
            teamId: form.team_id,
            includeUsers: shouldLoadScopedUsers,
            userPageSize: 80,
          }),
          shouldLoadScopedProducts
            ? loadProductsForScope(session.token, {
                companyId: isPlatformConsole ? selectedCompanyId : undefined,
                teamId: form.team_id,
                pageSize: 50,
              })
            : Promise.resolve([]),
        ];

        if (!isSuperAdmin) {
          requests.push(apiRequest("/leads/user/product-history", { token: session.token }));
        }

        const [scopeResponse, productResponse, historyResponse] = await Promise.all(requests);

        if (ignore) {
          return;
        }

        const nextProducts = productResponse || [];
        const nextTeams = scopeResponse.teams || [];
        const nextUsers = scopeResponse.users || [];
        const nextHistory = !isSuperAdmin ? historyResponse || [] : [];
        const nextTeamId = scopeResponse.teamId || "";
        const scopedProducts = filterRecordsByTeam(nextProducts, nextTeamId);

        setTeams(nextTeams);
        setProducts(nextProducts);
        setAssignableUsers(nextUsers);
        setProductHistory(nextHistory);
        setForm((current) => ({
          ...current,
          team_id: nextTeamId,
          product_id: scopedProducts.some((product) => product.product_id === current.product_id) ? current.product_id : "",
          assigned_to: nextUsers.some((user) => user.user_id === current.assigned_to) ? current.assigned_to : "",
        }));
      } catch (requestError) {
        if (!ignore) {
          setError(formatScopedError(requestError, "Failed to load lead scope."));
        }
      } finally {
        if (!ignore) {
          setResourceLoading(false);
        }
      }
    }

    loadResources();

    return () => {
      ignore = true;
    };
  }, [canAssign, form.company_id, form.team_id, isPlatformConsole, isSuperAdmin, selectedCompanyId, session, teamSelectionPending]);

  const quickProductPicks = useMemo(() => {
    if (productHistory.length) {
      return productHistory
        .slice(0, 3)
        .map((item) => {
          const product = products.find((entry) => entry.product_id === item.product_id);
          return {
            product_id: item.product_id,
            name: item.name,
            subtitle: `${item.lead_count || 0} leads`,
            color: product?.color || "#16b67b",
          };
        })
        .filter((item) => item.product_id && filteredProducts.some((product) => product.product_id === item.product_id));
    }

    return filteredProducts.slice(0, 3).map((product) => ({
      product_id: product.product_id,
      name: product.name,
      subtitle: "Quick pick",
      color: product.color || "#16b67b",
    }));
  }, [filteredProducts, productHistory, products]);

  const readinessItems = useMemo(
    () => [
      { label: "Tenant linked", done: !isSuperAdmin || Boolean(form.company_id) },
      { label: "Team chosen", done: teamAssignment.mode !== "none" && (!teamSelectorVisible || Boolean(form.team_id)) },
      { label: "Product selected", done: Boolean(form.product_id) },
      { label: "Decision maker added", done: Boolean(form.contact_person.trim()) },
      { label: "Contact channel ready", done: Boolean(form.email.trim() && form.phone.trim()) },
      { label: "Lead owner ready", done: isPlatformConsole ? Boolean(form.assigned_to) : true },
    ],
    [form.assigned_to, form.company_id, form.contact_person, form.email, form.phone, form.product_id, form.team_id, isPlatformConsole, teamAssignment.mode, teamSelectorVisible]
  );

  function handleFieldChange(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }

      return {
        ...current,
        [field]: "",
      };
    });
  }

  function validateForm() {
    const nextErrors = {};

    if (isPlatformConsole && !form.company_id) {
      nextErrors.company_id = "Select a company before creating a lead.";
    }

    if (teamSelectorVisible && !form.team_id) {
      nextErrors.team_id = teamSelectionRequiredMessage("lead");
    }

    if (!form.product_id) {
      nextErrors.product_id = "Select a product or service.";
    }

    if (!form.contact_person.trim()) {
      nextErrors.contact_person = "Contact person name is required.";
    }

    if (!form.company_name.trim()) {
      nextErrors.company_name = "Company name is required.";
    }

    if (!form.email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!form.phone.trim()) {
      nextErrors.phone = "Phone number is required.";
    } else {
      const digitsOnly = form.phone.replace(/\D/g, "");
      if (digitsOnly.length < 7 || digitsOnly.length > 15) {
        nextErrors.phone = "Phone number must be between 7 and 15 digits.";
      }
    }

    if (form.lead_source === "other" && !form.custom_lead_source.trim()) {
      nextErrors.custom_lead_source = "Enter the custom lead source.";
    }

    if (form.number_of_units !== "") {
      const units = Number(form.number_of_units);
      if (!Number.isInteger(units) || units < 0) {
        nextErrors.number_of_units = "Number of units must be a whole number.";
      }
    }

    if (isPlatformConsole && !form.assigned_to) {
      nextErrors.assigned_to = "Choose the tenant owner who should receive this lead.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving || resourceLoading) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await apiRequest("/leads", {
        method: "POST",
        token: session.token,
        body: {
          company_id: isPlatformConsole ? form.company_id : undefined,
          team_id: form.team_id || undefined,
          product_id: form.product_id,
          contact_person: form.contact_person.trim(),
          company_name: form.company_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          industry: form.industry || null,
          lead_source: form.lead_source === "other" ? form.custom_lead_source.trim() : form.lead_source,
          follow_up_date: form.follow_up_date ? form.follow_up_date.replace("T", " ") : null,
          estimated_value: Number(form.estimated_value || 0),
          number_of_units: form.number_of_units === "" ? null : Number(form.number_of_units),
          priority: form.priority,
          requirements: form.requirements.trim() || null,
          assigned_to: form.assigned_to || undefined,
          address_street: form.address_street.trim() || null,
          address_city: form.address_city.trim() || null,
          address_state: form.address_state.trim() || null,
          address_zip: form.address_zip.trim() || null,
          address_country: form.address_country.trim() || "India",
        },
      });

      router.push(`/leads/${response.lead_id}`);
    } catch (requestError) {
      setError(formatScopedError(requestError, "Failed to create lead."));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    router.push("/leads");
  }

  return (
    <DashboardShell session={session} title="Create Lead" hideTitle={hideTitle} heroStats={[]}>
      <AlertError message={error} onDismiss={() => setError("")} />
      {loading ? <div className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-3 text-sm font-medium text-[#6f614c]">Loading lead composer...</div> : null}
      {!loading ? (
        <section className="space-y-5">
          <article className="rounded-[34px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(247,240,227,0.96)_42%,_rgba(241,232,215,1)_100%)] p-5 shadow-[0_22px_60px_rgba(79,58,22,0.08)] md:p-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-4">
                <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                  Lead Intake
                </span>
                <h2 className="text-3xl font-semibold tracking-tight text-[#060710] md:text-[2.2rem] md:leading-[1.08]">
                  New Lead
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-[#746853]">
                  Capture the decision maker, map the product, assign the first owner, and push the opportunity into the CRM.
                </p>
              </div>
                <div className="grid gap-3 xl:min-w-[420px] xl:max-w-[460px] xl:w-full sm:grid-cols-2">
                  {[
                    { label: "Tenant", value: selectedCompany?.name || "Select tenant" },
                    { label: "Team", value: selectedTeam?.name || (teamAssignment.mode === "none" ? "No team yet" : teams.length ? "Select team" : "Auto team") },
                    { label: "Product", value: selectedProduct?.name || "Select product" },
                    { label: "Owner", value: selectedAssignee?.name || (isPlatformConsole ? "Assignment required" : session?.user?.name || "Self owner") },
                    { label: "Value", value: form.estimated_value ? `INR ${Number(form.estimated_value).toLocaleString("en-IN")}` : "Not set" },
                    { label: "Units", value: form.number_of_units || "Not set" },
                ].map((item, index) => (
                  <div key={item.label} className={`rounded-[24px] border border-[#eadfcd] p-4 shadow-[0_12px_28px_rgba(79,58,22,0.05)] ${index === 1 ? "bg-[#fff6e4]" : "bg-white/88"}`}>
                    <p className={KICKER_CLASS}>{item.label}</p>
                    <p className="mt-4 text-xl font-semibold tracking-tight text-[#060710]">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <form className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr] xl:items-start" onSubmit={handleSubmit}>
            <div className={PANEL_CLASS}>
              <article className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className={KICKER_CLASS}>Team Ownership</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">{teamAssignment.title}</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-[#746853]">{teamAssignment.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                      {teamAssignment.mode === "auto"
                        ? "Auto-selected"
                        : teamAssignment.mode === "selected"
                          ? "Team selected"
                          : teamAssignment.mode === "manual"
                            ? "Selection required"
                            : "No team configured"}
                    </span>
                    {selectedTeam ? (
                      <>
                        <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                          {teamBadgeLabel(selectedTeam)}
                        </span>
                        <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                          {selectedTeam.member_count || 0} members
                        </span>
                        <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                          {selectedTeam.manager_count || 0} managers
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-4">
                    <span className={KICKER_CLASS}>Owners</span>
                    <p className="mt-3 text-sm leading-6 text-[#746853]">{ownerScopeSummary}</p>
                  </div>
                  <div className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-4">
                    <span className={KICKER_CLASS}>Products</span>
                    <p className="mt-3 text-sm leading-6 text-[#746853]">{productScopeSummary}</p>
                  </div>
                </div>

                {selectedTeam ? (
                  <p className="mt-4 text-sm leading-7 text-[#746853]">
                    This lead, its follow-up tasks, and later customer conversion will stay under the selected team scope.
                  </p>
                ) : null}

                {teamAssignment.mode === "none" && canOpenTeamWorkspace ? (
                  <div className="mt-4">
                    <Link prefetch={false} href="/settings/teams" className={GHOST_BUTTON_CLASS}>
                      <DashboardIcon name="users" className="h-4 w-4" />
                      Open Teams
                    </Link>
                  </div>
                ) : null}
              </article>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                {[
                  { label: isPlatformConsole ? "Choose Company" : null, name: "company_id", type: "select", options: companies.map((company) => ({ value: company.company_id, label: company.name })), hidden: !isPlatformConsole, error: errors.company_id },
                  { label: "Team", name: "team_id", type: "select", options: teams.map((team) => ({ value: team.team_id, label: teamSelectLabel(team) })), hidden: !teamSelectorVisible, error: errors.team_id },
                  { label: "Product or Service", name: "product_id", type: "select", options: filteredProducts.map((product) => ({ value: product.product_id, label: product.name })), error: errors.product_id },
                  { label: canAssign ? (isSuperAdmin ? "Assign Lead Owner" : "Assign To") : null, name: "assigned_to", type: "select", options: assignableUsers.map((user) => ({ value: user.user_id, label: `${user.name} | ${user.role}` })), hidden: !canAssign, error: errors.assigned_to },
                  { label: "Contact Person Name", name: "contact_person", type: "input", error: errors.contact_person, placeholder: "John Doe" },
                  { label: "Company Name", name: "company_name", type: "input", error: errors.company_name, placeholder: "Acme Corp" },
                  { label: "Email Address", name: "email", type: "input", inputType: "email", error: errors.email, placeholder: "john@acme.com" },
                  { label: "Phone Number", name: "phone", type: "input", error: errors.phone, placeholder: "+91 98765 43210" },
                  { label: "Industry", name: "industry", type: "select", options: INDUSTRY_OPTIONS },
                  { label: "Lead Source", name: "lead_source", type: "select", options: LEAD_SOURCE_OPTIONS },
                  { label: "Follow-up Date", name: "follow_up_date", type: "input", inputType: "datetime-local" },
                  { label: "Estimated Deal Value (INR)", name: "estimated_value", type: "input", inputType: "number", placeholder: "50000" },
                  { label: "Number of Units", name: "number_of_units", type: "input", inputType: "number", placeholder: "25", error: errors.number_of_units },
                  { label: "Priority Level", name: "priority", type: "select", options: PRIORITY_OPTIONS },
                  { label: "Street Address", name: "address_street", type: "input", className: "md:col-span-2", placeholder: "123 Business Park" },
                  { label: "City", name: "address_city", type: "input", placeholder: "Mumbai" },
                  { label: "State", name: "address_state", type: "input", placeholder: "Maharashtra" },
                  { label: "Postal Code", name: "address_zip", type: "input", placeholder: "400001" },
                  { label: "Country", name: "address_country", type: "input", placeholder: "India" },
                ].filter((field) => !field.hidden).map((field) => (
                  <label key={field.name} className={`space-y-2 ${field.className || ""}`}>
                    <span className={KICKER_CLASS}>{field.label}</span>
                    {field.type === "select" ? (
                      <select
                        className={INPUT_CLASS}
                        value={form[field.name]}
                        onChange={(event) => handleFieldChange(field.name, event.target.value)}
                        disabled={
                          (field.name === "product_id" || field.name === "assigned_to") &&
                          (resourceLoading || teamSelectionPending)
                        }
                      >
                        <option value="">{field.name === "product_id" ? "Choose a product or service" : field.name === "assigned_to" ? (isPlatformConsole ? "Select tenant owner or sales rep" : "Keep with me by default") : field.name === "company_id" ? "Select tenant company" : `Select ${field.label?.toLowerCase()}`}</option>
                        {field.options.map((option) => (
                          <option key={option.value || option.label} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className={INPUT_CLASS}
                        type={field.inputType || "text"}
                        min={field.name === "follow_up_date" ? minimumDateTime : field.name === "number_of_units" ? 0 : undefined}
                        step={field.name === "number_of_units" ? 1 : undefined}
                        placeholder={field.placeholder || ""}
                        value={form[field.name]}
                        onChange={(event) => handleFieldChange(field.name, event.target.value)}
                      />
                    )}
                    {field.error ? <small className="text-xs font-semibold text-rose-600">{field.error}</small> : null}
                    {field.name === "team_id" && !field.error ? <small className="text-xs font-semibold text-[#8f816a]">{teamAssignment.description}</small> : null}
                    {field.name === "product_id" && !field.error && productHelperMessage ? <small className="text-xs font-semibold text-[#8f816a]">{productHelperMessage}</small> : null}
                    {field.name === "assigned_to" && !field.error && ownerHelperMessage ? <small className="text-xs font-semibold text-[#8f816a]">{ownerHelperMessage}</small> : null}
                  </label>
                ))}

                {form.lead_source === "other" ? (
                  <label className="space-y-2 md:col-span-2">
                    <span className={KICKER_CLASS}>Custom Lead Source</span>
                    <input className={INPUT_CLASS} value={form.custom_lead_source} onChange={(event) => handleFieldChange("custom_lead_source", event.target.value)} />
                    {errors.custom_lead_source ? <small className="text-xs font-semibold text-rose-600">{errors.custom_lead_source}</small> : null}
                  </label>
                ) : null}

                <label className="space-y-2 md:col-span-2">
                  <span className={KICKER_CLASS}>Requirements or Notes</span>
                  <textarea className={`${INPUT_CLASS} min-h-[150px] resize-y`} rows="5" value={form.requirements} onChange={(event) => handleFieldChange("requirements", event.target.value)} placeholder="Describe the requirement, urgency, or product expectation..." />
                </label>
              </div>
            </div>

            <div className="space-y-5">
              <article className={PANEL_CLASS}>
                <p className={KICKER_CLASS}>Quick Picks</p>
                <div className="mt-4 grid gap-3">
                  {quickProductPicks.length ? quickProductPicks.map((item) => (
                    <button key={item.product_id} className={`rounded-[22px] border px-4 py-4 text-left transition ${form.product_id === item.product_id ? "border-[#d7b258] bg-[#fff6e4]" : "border-[#eadfcd] bg-[#fffaf1]"}`} type="button" onClick={() => handleFieldChange("product_id", item.product_id)}>
                      <strong className="block text-[#060710]">{item.name}</strong>
                      <small className="mt-2 block text-xs font-semibold text-[#8f816a]">{item.subtitle}</small>
                    </button>
                  )) : <p className="text-sm leading-7 text-[#746853]">{productHelperMessage || "No active products found for this workspace."}</p>}
                </div>
              </article>

              <article className={PANEL_CLASS}>
                <p className={KICKER_CLASS}>Readiness</p>
                <div className="mt-4 space-y-2">
                  {readinessItems.map((item) => (
                    <div key={item.label} className="flex items-center gap-3 rounded-[18px] border border-[#eadfcd] bg-[#fffaf1] px-3 py-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${item.done ? "bg-emerald-500" : "bg-[#d7b258]"}`} />
                      <strong className="text-sm text-[#060710]">{item.label}</strong>
                    </div>
                  ))}
                </div>
              </article>

              <div className="flex flex-wrap justify-end gap-3">
                <button className={GHOST_BUTTON_CLASS} type="button" onClick={handleCancel}>Cancel</button>
                <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={saving || resourceLoading || !filteredProducts.length}>
                  <DashboardIcon name={saving ? "analytics" : "message"} className="h-4 w-4" />
                  {saving ? "Creating..." : "Create Lead"}
                </button>
              </div>
            </div>
          </form>
        </section>
      ) : null}
    </DashboardShell>
  );
}
