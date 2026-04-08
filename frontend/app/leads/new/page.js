"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import DashboardIcon from "../../../components/dashboard/icons";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";

const ALLOWED_ROLES = ["super-admin", "admin", "manager", "sales", "marketing"];
const ASSIGNMENT_ROLES = ["super-admin", "admin", "manager"];

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

function createInitialForm(companyId = "") {
  return {
    company_id: companyId,
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

function buildScopedPath(path, query = {}) {
  const search = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });

  const queryString = search.toString();
  return queryString ? `${path}?${queryString}` : path;
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
  const canAssign = ASSIGNMENT_ROLES.includes(role);
  const isSuperAdmin = role === "super-admin";
  const selectedCompanyId = isSuperAdmin ? form.company_id : session?.user?.company_id || session?.company?.company_id || "";
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
  const selectedAssignee = useMemo(
    () => assignableUsers.find((user) => user.user_id === form.assigned_to) || null,
    [assignableUsers, form.assigned_to]
  );
  const minimumDateTime = useMemo(() => formatDateTimeMin(), []);

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
        if (activeSession.user?.role === "super-admin") {
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

      if (isSuperAdmin && !form.company_id) {
        setProducts([]);
        setAssignableUsers([]);
        setProductHistory([]);
        return;
      }

      setResourceLoading(true);
      setError("");

      try {
        const productPath = buildScopedPath("/products", {
          page_size: 50,
          company_id: isSuperAdmin ? form.company_id : undefined,
        });
        const requests = [apiRequest(productPath, { token: session.token })];

        if (canAssign) {
          requests.push(
            apiRequest(
              buildScopedPath("/auth/users", {
                page_size: 50,
                company_id: isSuperAdmin ? form.company_id : undefined,
              }),
              { token: session.token }
            )
          );
        }

        if (!isSuperAdmin) {
          requests.push(apiRequest("/leads/user/product-history", { token: session.token }));
        }

        const [productResponse, userResponse, historyResponse] = await Promise.all(requests);

        if (ignore) {
          return;
        }

        const nextProducts = productResponse.items || [];
        const nextUsers = canAssign ? (userResponse?.items || []).filter((user) => user.is_active) : [];
        const nextHistory = !isSuperAdmin ? historyResponse || [] : [];

        setProducts(nextProducts);
        setAssignableUsers(nextUsers);
        setProductHistory(nextHistory);
        setForm((current) => ({
          ...current,
          product_id: nextProducts.some((product) => product.product_id === current.product_id) ? current.product_id : "",
          assigned_to: nextUsers.some((user) => user.user_id === current.assigned_to) ? current.assigned_to : "",
        }));
      } catch (requestError) {
        if (!ignore) {
          setError(requestError.message);
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
  }, [canAssign, form.company_id, isSuperAdmin, session]);

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
        .filter((item) => item.product_id);
    }

    return products.slice(0, 3).map((product) => ({
      product_id: product.product_id,
      name: product.name,
      subtitle: "Quick pick",
      color: product.color || "#16b67b",
    }));
  }, [productHistory, products]);

  const readinessItems = useMemo(
    () => [
      { label: "Tenant linked", done: !isSuperAdmin || Boolean(form.company_id) },
      { label: "Product selected", done: Boolean(form.product_id) },
      { label: "Decision maker added", done: Boolean(form.contact_person.trim()) },
      { label: "Contact channel ready", done: Boolean(form.email.trim() && form.phone.trim()) },
      { label: "Lead owner ready", done: isSuperAdmin ? Boolean(form.assigned_to) : true },
    ],
    [form.assigned_to, form.company_id, form.contact_person, form.email, form.phone, form.product_id, isSuperAdmin]
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

    if (isSuperAdmin && !form.company_id) {
      nextErrors.company_id = "Select a company before creating a lead.";
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

    if (isSuperAdmin && !form.assigned_to) {
      nextErrors.assigned_to = "Super admin must assign this lead to a tenant user.";
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
          company_id: isSuperAdmin ? form.company_id : undefined,
          product_id: form.product_id,
          contact_person: form.contact_person.trim(),
          company_name: form.company_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          industry: form.industry || null,
          lead_source: form.lead_source === "other" ? form.custom_lead_source.trim() : form.lead_source,
          follow_up_date: form.follow_up_date ? form.follow_up_date.replace("T", " ") : null,
          estimated_value: Number(form.estimated_value || 0),
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
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    router.push("/leads");
  }

  return (
    <DashboardShell session={session} title="Create Lead" eyebrow="Sales Intake">
      {error ? <div className="alert error">{error}</div> : null}
      {loading ? <div className="alert">Loading lead composer...</div> : null}

      {!loading ? (
        <section className="lead-compose-shell">
          <article className="lead-compose-card">
            <div className="lead-compose-header">
              <div className="lead-compose-title-wrap">
                <div className="lead-compose-glyph">
                  <DashboardIcon name="leads" />
                </div>
                <div className="lead-compose-title-copy">
                  <span className="eyebrow">Lead Composer</span>
                  <h2>Add New Lead</h2>
                  <p>
                    A richer intake surface mapped to the current Next.js flow and CRM backend structure.
                  </p>
                </div>
              </div>

              <button className="lead-compose-close" type="button" onClick={handleCancel} aria-label="Close lead form">
                <span />
                <span />
              </button>
            </div>

            <div className="lead-compose-body">
              <form className="lead-compose-form" onSubmit={handleSubmit}>
                <section className="lead-compose-section">
                  <div className="lead-section-head">
                    <div>
                      <span className="lead-kicker">Ownership</span>
                      <h3>Tenant, product, and lead owner</h3>
                    </div>
                    {resourceLoading ? <span className="pill">Refreshing...</span> : null}
                  </div>

                  <div className="lead-field-grid">
                    {isSuperAdmin ? (
                      <label className={`field full-width lead-field ${errors.company_id ? "error" : ""}`}>
                        <span>Choose Company</span>
                        <select
                          value={form.company_id}
                          onChange={(event) => handleFieldChange("company_id", event.target.value)}
                        >
                          <option value="">Select tenant company</option>
                          {companies.map((company) => (
                            <option key={company.company_id} value={company.company_id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                        {errors.company_id ? <small className="lead-field-error">{errors.company_id}</small> : null}
                      </label>
                    ) : null}

                    <label className={`field full-width lead-field ${errors.product_id ? "error" : ""}`}>
                      <span>Select Product or Service</span>
                      {quickProductPicks.length ? (
                        <div className="lead-product-picks">
                          {quickProductPicks.map((item) => (
                            <button
                              key={item.product_id}
                              className={`lead-product-pill ${form.product_id === item.product_id ? "active" : ""}`}
                              type="button"
                              onClick={() => handleFieldChange("product_id", item.product_id)}
                              style={{ "--chip": item.color }}
                            >
                              <span className="lead-product-dot" />
                              <strong>{item.name}</strong>
                              <small>{item.subtitle}</small>
                            </button>
                          ))}
                        </div>
                      ) : null}

                      <select
                        value={form.product_id}
                        onChange={(event) => handleFieldChange("product_id", event.target.value)}
                      >
                        <option value="">Choose a product or service</option>
                        {products.map((product) => (
                          <option key={product.product_id} value={product.product_id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                      {errors.product_id ? <small className="lead-field-error">{errors.product_id}</small> : null}
                      {!products.length ? (
                        <small className="lead-field-note">
                          No active products found for this workspace. Publish products first from product settings.
                        </small>
                      ) : null}
                    </label>

                    {canAssign ? (
                      <label className={`field full-width lead-field ${errors.assigned_to ? "error" : ""}`}>
                        <span>{isSuperAdmin ? "Assign Lead Owner" : "Assign To"}</span>
                        <select
                          value={form.assigned_to}
                          onChange={(event) => handleFieldChange("assigned_to", event.target.value)}
                        >
                          <option value="">
                            {isSuperAdmin ? "Select tenant owner or sales rep" : "Keep with me by default"}
                          </option>
                          {assignableUsers.map((user) => (
                            <option key={user.user_id} value={user.user_id}>
                              {user.name} | {user.role}
                            </option>
                          ))}
                        </select>
                        {errors.assigned_to ? <small className="lead-field-error">{errors.assigned_to}</small> : null}
                        <small className="lead-field-note">
                          {isSuperAdmin
                            ? "Super admin lead must belong to an active user inside the selected tenant."
                            : "If left blank, the lead will stay assigned to your own login."}
                        </small>
                      </label>
                    ) : null}
                  </div>
                </section>

                <section className="lead-compose-section">
                  <div className="lead-section-head">
                    <div>
                      <span className="lead-kicker">Contact</span>
                      <h3>Decision maker snapshot</h3>
                    </div>
                  </div>

                  <div className="lead-field-grid">
                    <label className={`field lead-field ${errors.contact_person ? "error" : ""}`}>
                      <span>Contact Person Name</span>
                      <input
                        value={form.contact_person}
                        onChange={(event) => handleFieldChange("contact_person", event.target.value)}
                        placeholder="Enter full name"
                      />
                      {errors.contact_person ? <small className="lead-field-error">{errors.contact_person}</small> : null}
                    </label>

                    <label className={`field lead-field ${errors.company_name ? "error" : ""}`}>
                      <span>Company Name</span>
                      <input
                        value={form.company_name}
                        onChange={(event) => handleFieldChange("company_name", event.target.value)}
                        placeholder="Enter company name"
                      />
                      {errors.company_name ? <small className="lead-field-error">{errors.company_name}</small> : null}
                    </label>

                    <label className={`field lead-field ${errors.email ? "error" : ""}`}>
                      <span>Email Address</span>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) => handleFieldChange("email", event.target.value)}
                        placeholder="contact@company.com"
                      />
                      {errors.email ? <small className="lead-field-error">{errors.email}</small> : null}
                    </label>

                    <label className={`field lead-field ${errors.phone ? "error" : ""}`}>
                      <span>Phone Number</span>
                      <input
                        value={form.phone}
                        onChange={(event) => handleFieldChange("phone", event.target.value)}
                        placeholder="+91 9876543210"
                      />
                      {errors.phone ? <small className="lead-field-error">{errors.phone}</small> : null}
                    </label>
                  </div>
                </section>

                <section className="lead-compose-section">
                  <div className="lead-section-head">
                    <div>
                      <span className="lead-kicker">Opportunity</span>
                      <h3>Source, value, follow-up, and notes</h3>
                    </div>
                  </div>

                  <div className="lead-field-grid">
                    <label className="field lead-field">
                      <span>Industry</span>
                      <select value={form.industry} onChange={(event) => handleFieldChange("industry", event.target.value)}>
                        {INDUSTRY_OPTIONS.map((option) => (
                          <option key={option.value || "blank"} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field lead-field">
                      <span>Lead Source</span>
                      <select value={form.lead_source} onChange={(event) => handleFieldChange("lead_source", event.target.value)}>
                        {LEAD_SOURCE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    {form.lead_source === "other" ? (
                      <label className={`field full-width lead-field ${errors.custom_lead_source ? "error" : ""}`}>
                        <span>Custom Lead Source</span>
                        <input
                          value={form.custom_lead_source}
                          onChange={(event) => handleFieldChange("custom_lead_source", event.target.value)}
                          placeholder="Specify custom source"
                        />
                        {errors.custom_lead_source ? (
                          <small className="lead-field-error">{errors.custom_lead_source}</small>
                        ) : null}
                      </label>
                    ) : null}

                    <label className="field lead-field">
                      <span>Follow-up Date</span>
                      <input
                        type="datetime-local"
                        min={minimumDateTime}
                        value={form.follow_up_date}
                        onChange={(event) => handleFieldChange("follow_up_date", event.target.value)}
                      />
                    </label>

                    <label className="field lead-field">
                      <span>Estimated Deal Value (INR)</span>
                      <input
                        type="number"
                        min="0"
                        value={form.estimated_value}
                        onChange={(event) => handleFieldChange("estimated_value", event.target.value)}
                        placeholder="Enter amount"
                      />
                    </label>

                    <label className="field lead-field">
                      <span>Priority Level</span>
                      <select value={form.priority} onChange={(event) => handleFieldChange("priority", event.target.value)}>
                        {PRIORITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field full-width lead-field">
                      <span>Requirements or Notes</span>
                      <textarea
                        rows="5"
                        value={form.requirements}
                        onChange={(event) => handleFieldChange("requirements", event.target.value)}
                        placeholder="Describe the requirement, urgency, or product expectation..."
                      />
                    </label>
                  </div>
                </section>

                <section className="lead-compose-section">
                  <div className="lead-section-head">
                    <div>
                      <span className="lead-kicker">Address</span>
                      <h3>Location and service geography</h3>
                    </div>
                  </div>

                  <div className="lead-field-grid">
                    <label className="field full-width lead-field">
                      <span>Street Address</span>
                      <input
                        value={form.address_street}
                        onChange={(event) => handleFieldChange("address_street", event.target.value)}
                        placeholder="Enter street address"
                      />
                    </label>

                    <label className="field lead-field">
                      <span>City</span>
                      <input
                        value={form.address_city}
                        onChange={(event) => handleFieldChange("address_city", event.target.value)}
                        placeholder="Enter city"
                      />
                    </label>

                    <label className="field lead-field">
                      <span>State</span>
                      <input
                        value={form.address_state}
                        onChange={(event) => handleFieldChange("address_state", event.target.value)}
                        placeholder="Enter state"
                      />
                    </label>

                    <label className="field lead-field">
                      <span>Postal Code</span>
                      <input
                        value={form.address_zip}
                        onChange={(event) => handleFieldChange("address_zip", event.target.value)}
                        placeholder="Enter postal code"
                      />
                    </label>

                    <label className="field lead-field">
                      <span>Country</span>
                      <input
                        value={form.address_country}
                        onChange={(event) => handleFieldChange("address_country", event.target.value)}
                        placeholder="Enter country"
                      />
                    </label>
                  </div>
                </section>
              </form>

              <aside className="lead-compose-side">
                <article className="lead-side-card accent">
                  <span className="lead-kicker">Live Preview</span>
                  <h3>{form.company_name || "New Lead Opportunity"}</h3>
                  <p>
                    {form.contact_person || "Decision maker not added yet"} | {form.email || "email pending"} |{" "}
                    {form.phone || "phone pending"}
                  </p>

                  <div className="lead-preview-grid">
                    <div>
                      <span>Tenant</span>
                      <strong>{selectedCompany?.name || "Select tenant"}</strong>
                    </div>
                    <div>
                      <span>Source</span>
                      <strong>{form.lead_source === "other" ? form.custom_lead_source || "Custom source" : form.lead_source}</strong>
                    </div>
                    <div>
                      <span>Priority</span>
                      <strong>{form.priority}</strong>
                    </div>
                    <div>
                      <span>Value</span>
                      <strong>
                        {form.estimated_value ? `INR ${Number(form.estimated_value).toLocaleString("en-IN")}` : "Not set"}
                      </strong>
                    </div>
                  </div>
                </article>

                <article className="lead-side-card">
                  <div className="lead-side-head">
                    <div className="lead-side-icon">
                      <DashboardIcon name="products" />
                    </div>
                    <div>
                      <span className="lead-kicker">Product</span>
                      <h4>{selectedProduct?.name || "Select a product"}</h4>
                    </div>
                  </div>
                  <p className="muted">
                    {selectedProduct
                      ? "Product mapped. Lead will be validated against the tenant catalog before save."
                      : "Product selection is mandatory before this lead can be created."}
                  </p>
                </article>

                <article className="lead-side-card">
                  <div className="lead-side-head">
                    <div className="lead-side-icon">
                      <DashboardIcon name="users" />
                    </div>
                    <div>
                      <span className="lead-kicker">Owner</span>
                      <h4>
                        {selectedAssignee?.name ||
                          (isSuperAdmin ? "Assignment required" : session?.user?.name || "Self assignment")}
                      </h4>
                    </div>
                  </div>
                  <p className="muted">
                    {selectedAssignee
                      ? `${selectedAssignee.role} will receive this lead as initial owner.`
                      : isSuperAdmin
                        ? "Pick an active tenant user before saving."
                        : "If no assignee is chosen, the lead stays with your current login."}
                  </p>
                </article>

                <article className="lead-side-card">
                  <span className="lead-kicker">Submission Checks</span>
                  <div className="lead-checklist">
                    {readinessItems.map((item) => (
                      <div className={`lead-check-item ${item.done ? "done" : ""}`} key={item.label}>
                        <span className="lead-check-dot" />
                        <strong>{item.label}</strong>
                      </div>
                    ))}
                  </div>
                </article>
              </aside>
            </div>

            <div className="lead-compose-footer">
              <button className="button ghost" type="button" onClick={handleCancel}>
                Cancel
              </button>
              <button
                className="button primary"
                type="button"
                onClick={handleSubmit}
                disabled={saving || resourceLoading || !products.length}
              >
                <DashboardIcon name={saving ? "analytics" : "message"} />
                {saving ? "Creating..." : "Create Lead"}
              </button>
            </div>
          </article>
        </section>
      ) : null}
    </DashboardShell>
  );
}
