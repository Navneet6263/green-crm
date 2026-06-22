"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import DashboardShell from "../../../../components/dashboard/DashboardShell";
import { apiRequest } from "../../../../lib/api";
import { loadSession } from "../../../../lib/session";
import { useCustomization } from "../../../../lib/useCustomization";
import { getEnabledStatuses } from "../../../../lib/leadStatusHelper";
import {
  canManageScopedAssignments,
  formatScopedError,
  filterRecordsByTeam,
  loadProductsForScope,
  loadTeamScopeResources,
  shouldShowTeamSelector,
  scopedProductsEmptyMessage,
  scopedUsersEmptyMessage,
  teamBadgeLabel,
  teamSelectLabel,
  teamSelectionRequiredMessage,
} from "../../../../lib/teamScope";
import { AlertError } from "../../../../components/ui/Alert";
import { CustomizationDebug } from "../../../../components/debug/CustomizationDebug";
import { EditLeadHeader, EditIdentitySection } from "./EditLeadFormSections";
import { EditPipelineSection } from "./EditLeadPipelineSection";
import { EditPaymentSection } from "./EditLeadPaymentSection";
import { EditContextSection } from "./EditLeadContextSection";

function blank(value) {
  return value === undefined || value === null || value === "";
}

function printable(value) {
  if (blank(value)) return "--";
  return String(value);
}

function comparable(value) {
  if (blank(value)) return "";
  return String(value).trim().replace("T", " ").replace(/\.000Z$/, "").replace(/Z$/, "");
}

function normalizeEstimatedValue(value) {
  if (blank(value)) return 0;
  const directNumeric = Number(value);
  if (Number.isFinite(directNumeric)) return directNumeric;
  const cleaned = String(value).replace(/[^\d.-]/g, "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizeUnitCount(value) {
  if (blank(value)) return null;
  const directNumeric = Number(value);
  if (Number.isFinite(directNumeric)) {
    return Number.isInteger(directNumeric) ? directNumeric : NaN;
  }
  const cleaned = String(value).replace(/[^\d-]/g, "").trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isInteger(parsed) ? parsed : NaN;
}

function toApiDateTime(value) {
  return value ? String(value).replace("T", " ") : null;
}

export default function EditLeadPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    contact_person: "", company_name: "", email: "", phone: "",
    lead_source: "website", priority: "medium", status: "new", workflow_stage: "sales",
    estimated_value: "", number_of_units: "", no_of_employees: "", active_users: "",
    payment_mode: "", payment_date: "", subscription_start_date: "", next_payment_date: "",
    team_id: "", assigned_to: "", product_id: "",
    requirements: "", follow_up_date: "", advance_received: ""
  });
  const [originalLead, setOriginalLead] = useState(null);
  const [changeNote, setChangeNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resourceLoading, setResourceLoading] = useState(false);
  const initialTeamLoadedRef = useRef(false);
  const loadedTeamIdRef = useRef(null);

  // Load customization settings
  const { customization } = useCustomization(session?.token);
  const enabledStatuses = customization ? getEnabledStatuses(customization) : [];

  const role = session?.user?.role || "";
  const canManageAssignment = canManageScopedAssignments(role);
  const teamSelectorVisible = shouldShowTeamSelector(role, teams);
  const teamSelectionPending = teamSelectorVisible && !form?.team_id;
  const selectedTeam = useMemo(() => teams.find((team) => team.team_id === form?.team_id) || null, [form?.team_id, teams]);
  const filteredProducts = useMemo(
    () => (teamSelectionPending ? [] : filterRecordsByTeam(products, form?.team_id)),
    [form?.team_id, products, teamSelectionPending]
  );
  const selectedOwner = useMemo(() => users.find((user) => user.user_id === form?.assigned_to) || null, [form?.assigned_to, users]);
  const ownerEmptyMessage = useMemo(() => {
    if (!canManageAssignment || resourceLoading) return "";
    if (teamSelectionPending) return "Choose a team to load available owners.";
    if (!users.length) return scopedUsersEmptyMessage(selectedTeam);
    return "";
  }, [canManageAssignment, resourceLoading, selectedTeam, teamSelectionPending, users.length]);
  
  const productEmptyMessage = useMemo(() => {
    if (resourceLoading) return "";
    if (teamSelectionPending) return "Choose a team to load products for this lead.";
    if (!filteredProducts.length) return scopedProductsEmptyMessage(selectedTeam);
    return "";
  }, [filteredProducts.length, resourceLoading, selectedTeam, teamSelectionPending]);

  const productChoices = useMemo(() => {
    const list = [...filteredProducts];
    if (originalLead?.product_id && !list.some((product) => product.product_id === originalLead.product_id)) {
      list.unshift({
        product_id: originalLead.product_id,
        name: originalLead.product_name || `${originalLead.product_id} (Current product)`,
      });
    }
    return list;
  }, [filteredProducts, originalLead]);

  const productLookup = useMemo(
    () => new Map(productChoices.map((product) => [product.product_id, product.name])),
    [productChoices]
  );

  const changeItems = useMemo(() => {
    if (!form || !originalLead) return [];

    const nextPayload = {
      ...form,
      estimated_value: normalizeEstimatedValue(form.estimated_value),
      number_of_units: normalizeUnitCount(form.number_of_units),
      no_of_employees: form.no_of_employees?.trim() || null,
      active_users: form.active_users === "" ? null : Number(form.active_users),
      payment_mode: form.payment_mode || null,
      payment_date: form.payment_date || null,
      client_tenure: form.client_tenure?.trim() || null,
      subscription_start_date: form.subscription_start_date || null,
      next_payment_date: form.next_payment_date || null,
      follow_up_date: toApiDateTime(form.follow_up_date) || "",
      advance_received: form.advance_received === "" ? 0 : Number(form.advance_received),
    };

    const tracked = [
      ["contact_person", "Contact Person", originalLead.contact_person, nextPayload.contact_person],
      ["company_name", "Company Name", originalLead.company_name, nextPayload.company_name],
      ["email", "Email", originalLead.email, nextPayload.email],
      ["phone", "Phone", originalLead.phone, nextPayload.phone],
      ["status", "Status", originalLead.status, nextPayload.status],
      ["priority", "Priority", originalLead.priority, nextPayload.priority],
      ["workflow_stage", "Workflow Stage", originalLead.workflow_stage, nextPayload.workflow_stage],
      ["estimated_value", "Estimated Value", originalLead.estimated_value, nextPayload.estimated_value],
      ["number_of_units", "Number of Units", originalLead.number_of_units, nextPayload.number_of_units],
      ["no_of_employees", "No. of Employees", originalLead.no_of_employees, nextPayload.no_of_employees],
      ["active_users", "Active Users", originalLead.active_users, nextPayload.active_users],
      ["payment_mode", "Payment Mode", originalLead.payment_mode, nextPayload.payment_mode],
      ["payment_date", "Payment Received Date", originalLead.payment_date ? String(originalLead.payment_date).slice(0, 10) : "", nextPayload.payment_date],
      ["client_tenure", "Client Tenure", originalLead.client_tenure, nextPayload.client_tenure],
      ["subscription_start_date", "Subscription Start Date", originalLead.subscription_start_date ? String(originalLead.subscription_start_date).slice(0, 10) : "", nextPayload.subscription_start_date],
      ["next_payment_date", "Next Payment Date", originalLead.next_payment_date ? String(originalLead.next_payment_date).slice(0, 10) : "", nextPayload.next_payment_date],
      ["team_id", "Team", originalLead.team_name || originalLead.team_id, selectedTeam?.name || selectedTeam?.team_id || nextPayload.team_id],
      ["assigned_to", "Lead Owner", originalLead.assigned_to_name || originalLead.assigned_to, selectedOwner?.name || nextPayload.assigned_to],
      ["requirements", "Requirements", originalLead.requirements, nextPayload.requirements],
      ["follow_up_date", "Follow-up Date", originalLead.follow_up_date ? toApiDateTime(String(originalLead.follow_up_date).slice(0, 16)) : "", nextPayload.follow_up_date],
      ["product_id", "Product", productLookup.get(originalLead.product_id) || originalLead.product_name || originalLead.product_id, productLookup.get(nextPayload.product_id) || nextPayload.product_id],
      ["advance_received", "Advance Received", originalLead.advance_received, nextPayload.advance_received],
    ];

    return tracked
      .filter(([, , previous, next]) => comparable(previous) !== comparable(next))
      .map(([field, label, previous, next]) => ({
        field,
        label,
        previous: printable(previous),
        next: printable(next),
      }));
  }, [form, originalLead, productLookup, selectedOwner?.name, selectedTeam?.name, selectedTeam?.team_id]);

  const requiresChangeNote = changeItems.length > 0;
  const hideTitle = ["sales", "marketing", "admin", "manager"].includes(role);
  const isAdmin = ["super-admin", "platform-admin", "admin"].includes(role);

  function onChange(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) {
      router.replace("/login");
      return;
    }

    setSession(activeSession);
    router.prefetch(`/leads/${params.id}`);
    const allowAssignments = canManageScopedAssignments(activeSession.user?.role);
    apiRequest(`/leads/${params.id}`, { token: activeSession.token })
      .then(async (leadResponse) => {
        const [productsResponse, scopeResponse] = await Promise.all([
          loadProductsForScope(activeSession.token, {
            companyId: leadResponse.company_id,
            pageSize: 200,
          }),
          loadTeamScopeResources(activeSession.token, {
            companyId: leadResponse.company_id,
            teamId: leadResponse.team_id || "",
            includeUsers: allowAssignments,
          }),
        ]);
        const teamItems = scopeResponse.teams || [];
        const userItems = scopeResponse.users || [];
        const nextTeamId = scopeResponse.teamId || "";
        const scopedProducts = filterRecordsByTeam(productsResponse || [], nextTeamId);

        setProducts(productsResponse || []);
        setTeams(teamItems);
        setUsers(userItems);
        setOriginalLead(leadResponse);
        setForm({
          contact_person: leadResponse.contact_person || "",
          company_name: leadResponse.company_name || "",
          email: leadResponse.email || "",
          phone: leadResponse.phone || "",
          lead_source: leadResponse.lead_source || "website",
          priority: leadResponse.priority || "medium",
          status: leadResponse.status || "new",
          workflow_stage: leadResponse.workflow_stage || "sales",
          estimated_value: leadResponse.estimated_value || "",
          number_of_units: leadResponse.number_of_units ?? "",
          no_of_employees: leadResponse.no_of_employees || "",
          active_users: leadResponse.active_users ?? "",
          payment_mode: leadResponse.payment_mode || "",
          payment_date: leadResponse.payment_date ? String(leadResponse.payment_date).slice(0, 10) : "",
          client_tenure: leadResponse.client_tenure || "",
          subscription_start_date: leadResponse.subscription_start_date ? String(leadResponse.subscription_start_date).slice(0, 10) : "",
          next_payment_date: leadResponse.next_payment_date ? String(leadResponse.next_payment_date).slice(0, 10) : "",
          team_id: nextTeamId,
          assigned_to: userItems.some((user) => user.user_id === leadResponse.assigned_to) ? leadResponse.assigned_to || "" : "",
          product_id: leadResponse.product_id || "",
          requirements: leadResponse.requirements || "",
          follow_up_date: leadResponse.follow_up_date ? String(leadResponse.follow_up_date).slice(0, 16) : "",
          advance_received: leadResponse.advance_received || "",
        });
        loadedTeamIdRef.current = nextTeamId;
        if (leadResponse.product_id && !scopedProducts.some((product) => product.product_id === leadResponse.product_id)) {
          setForm((current) => current ? { ...current, product_id: "" } : current);
        }
      })
      .catch((requestError) => setError(formatScopedError(requestError, "Failed to load lead.")))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  useEffect(() => {
    let ignore = false;

    async function reloadScopedUsers() {
      if (!session?.token || !originalLead?.company_id || !canManageAssignment || !form) {
        return;
      }

      if (form.team_id === loadedTeamIdRef.current) {
        return;
      }

      // Skip the first run — data was already loaded in the mount useEffect
      if (!initialTeamLoadedRef.current) {
        initialTeamLoadedRef.current = true;
        return;
      }

      setResourceLoading(true);

      try {
        if (teamSelectionPending) {
          if (!ignore) {
            setUsers([]);
            setForm((current) => (current ? { ...current, assigned_to: "" } : current));
          }
          return;
        }

        const scopedResponse = await loadTeamScopeResources(session.token, {
          companyId: originalLead.company_id,
          teamId: form.team_id,
          includeUsers: true,
        });
        const scopedUsers = scopedResponse.users || [];

        if (ignore) return;

        loadedTeamIdRef.current = form.team_id;
        setUsers(scopedUsers);
        setForm((current) =>
          current
            ? {
                ...current,
                assigned_to: scopedUsers.some((user) => user.user_id === current.assigned_to) ? current.assigned_to : "",
              }
            : current
        );
      } catch (_error) {
        if (!ignore) setUsers([]);
      } finally {
        if (!ignore) setResourceLoading(false);
      }
    }

    reloadScopedUsers();

    return () => {
      ignore = true;
    };
  }, [canManageAssignment, form?.team_id, originalLead?.company_id, session, teamSelectionPending]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.product_id) {
      setError("Select a product before saving the lead.");
      return;
    }

    if (teamSelectorVisible && !form.team_id) {
      setError(teamSelectionRequiredMessage("lead"));
      return;
    }
    if (canManageAssignment && originalLead?.team_id !== form.team_id && !form.assigned_to) {
      setError("Choose a lead owner from the selected team before saving.");
      return;
    }

    const estimatedValue = normalizeEstimatedValue(form.estimated_value);
    if (!Number.isFinite(estimatedValue)) {
      setError("Estimated value must be a valid number.");
      return;
    }

    const unitCount = normalizeUnitCount(form.number_of_units);
    if (unitCount !== null && (!Number.isInteger(unitCount) || unitCount < 0)) {
      setError("Number of units must be a whole number.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      let finalChangeNote = changeNote.trim();
      if (!finalChangeNote && changeItems.length > 0) {
        finalChangeNote = changeItems.map(c => `${c.label}: ${c.previous} → ${c.next}`).join("\n");
      }

      const nextPayload = {
        ...form,
        estimated_value: estimatedValue,
        number_of_units: unitCount,
        no_of_employees: form.no_of_employees?.trim() || null,
        active_users: form.active_users === "" ? null : Number(form.active_users),
        payment_mode: form.payment_mode || null,
        payment_date: form.payment_date || null,
        client_tenure: form.client_tenure?.trim() || null,
        subscription_start_date: form.subscription_start_date || null,
        next_payment_date: form.next_payment_date || null,
        follow_up_date: toApiDateTime(form.follow_up_date),
        team_id: form.team_id || undefined,
        assigned_to: canManageAssignment ? form.assigned_to || undefined : undefined,
        change_note: finalChangeNote,
        advance_received: form.advance_received === "" ? 0 : Number(form.advance_received),
      };

      await apiRequest(`/leads/${params.id}`, {
        method: "PUT",
        token: session.token,
        body: nextPayload,
      });

      router.push(`/leads/${params.id}`);
    } catch (requestError) {
      setError(formatScopedError(requestError, "Failed to save lead changes."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell session={session} title="Edit Lead" hideTitle={hideTitle} heroStats={[]}>
      <div className={`mx-auto max-w-5xl space-y-4 px-3 py-4 sm:px-4 sm:py-5 ${loading ? 'opacity-60 pointer-events-none transition-opacity duration-300' : 'opacity-100 transition-opacity duration-300'}`}>
        <AlertError message={error} onDismiss={() => setError("")} />
        {form && (
          <section className="space-y-4">
            <EditLeadHeader originalLead={originalLead} selectedTeam={selectedTeam} params={params} router={router} />

            <form className="space-y-4" onSubmit={handleSubmit}>
              <EditIdentitySection
                form={form}
                isAdmin={isAdmin}
                teams={teams}
                users={users}
                selectedTeam={selectedTeam}
                teamSelectorVisible={teamSelectorVisible}
                canManageAssignment={canManageAssignment}
                resourceLoading={resourceLoading}
                teamSelectionPending={teamSelectionPending}
                ownerEmptyMessage={ownerEmptyMessage}
                onChange={onChange}
              />
              <EditPipelineSection
                form={form}
                productChoices={productChoices}
                teamSelectionPending={teamSelectionPending}
                productEmptyMessage={productEmptyMessage}
                onChange={onChange}
                enabledStatuses={enabledStatuses}
              />
              <EditPaymentSection
                form={form}
                onChange={onChange}
              />
              <EditContextSection
                form={form}
                changeNote={changeNote}
                requiresChangeNote={requiresChangeNote}
                saving={saving}
                router={router}
                params={params}
                onChange={onChange}
                onChangeNoteChange={setChangeNote}
              />
            </form>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
