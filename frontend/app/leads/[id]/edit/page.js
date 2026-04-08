"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import DashboardShell from "../../../../components/dashboard/DashboardShell";
import DashboardIcon from "../../../../components/dashboard/icons";
import { apiRequest } from "../../../../lib/api";
import { loadSession } from "../../../../lib/session";

function blank(value) {
  return value === undefined || value === null || value === "";
}

function printable(value) {
  if (blank(value)) {
    return "--";
  }

  return String(value);
}

function comparable(value) {
  if (blank(value)) {
    return "";
  }

  return String(value).trim();
}

export default function EditLeadPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(null);
  const [originalLead, setOriginalLead] = useState(null);
  const [changeNote, setChangeNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) {
      router.replace("/login");
      return;
    }

    setSession(activeSession);
    Promise.all([
      apiRequest(`/leads/${params.id}`, { token: activeSession.token }),
      apiRequest("/products?page_size=50", { token: activeSession.token }),
    ]).then(([leadResponse, productsResponse]) => {
      setProducts(productsResponse.items || []);
      setOriginalLead(leadResponse);
      setForm({
        contact_person: leadResponse.contact_person || "",
        company_name: leadResponse.company_name || "",
        email: leadResponse.email || "",
        phone: leadResponse.phone || "",
        priority: leadResponse.priority || "medium",
        status: leadResponse.status || "new",
        workflow_stage: leadResponse.workflow_stage || "sales",
        estimated_value: leadResponse.estimated_value || "",
        product_id: leadResponse.product_id || "",
        requirements: leadResponse.requirements || "",
        follow_up_date: leadResponse.follow_up_date ? String(leadResponse.follow_up_date).slice(0, 16) : "",
      });
    }).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  }, [params.id, router]);

  const productLookup = useMemo(
    () => new Map(products.map((product) => [product.product_id, product.name])),
    [products]
  );

  const changeItems = useMemo(() => {
    if (!form || !originalLead) {
      return [];
    }

    const nextPayload = {
      ...form,
      estimated_value: Number(form.estimated_value || 0),
      follow_up_date: form.follow_up_date || "",
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
      ["requirements", "Requirements", originalLead.requirements, nextPayload.requirements],
      [
        "follow_up_date",
        "Follow-up Date",
        originalLead.follow_up_date ? String(originalLead.follow_up_date).slice(0, 16) : "",
        nextPayload.follow_up_date,
      ],
      [
        "product_id",
        "Product",
        productLookup.get(originalLead.product_id) || originalLead.product_name || originalLead.product_id,
        productLookup.get(nextPayload.product_id) || nextPayload.product_id,
      ],
    ];

    return tracked
      .filter(([, , previous, next]) => comparable(previous) !== comparable(next))
      .map(([field, label, previous, next]) => ({
        field,
        label,
        previous: printable(previous),
        next: printable(next),
      }));
  }, [form, originalLead, productLookup]);

  const requiresChangeNote = changeItems.length > 0;

  async function handleSubmit(event) {
    event.preventDefault();
    if (requiresChangeNote && !changeNote.trim()) {
      setError("A change note is required whenever a lead is updated.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const nextPayload = {
        ...form,
        estimated_value: Number(form.estimated_value || 0),
        follow_up_date: form.follow_up_date || null,
        change_note: changeNote.trim(),
      };

      await apiRequest(`/leads/${params.id}`, {
        method: "PUT",
        token: session.token,
        body: nextPayload,
      });

      router.push(`/leads/${params.id}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell
      session={session}
      title="Edit Lead"
      eyebrow="Update Lead"
      heroStats={[
        { label: "Company", value: originalLead?.company_name || "--" },
        { label: "Status", value: originalLead?.status || "--", color: "#2f6fdd" },
        { label: "Priority", value: originalLead?.priority || "--", color: "#b96a00" },
        { label: "Pending Changes", value: changeItems.length, color: changeItems.length ? "#0f8c53" : "#64748b" },
      ]}
    >
      {error ? <div className="alert error">{error}</div> : null}
      {loading ? <div className="alert">Loading lead...</div> : null}
      {!loading && form ? (
        <section className="lead-edit-shell">
          <article className="lead-edit-summary">
            <div>
              <span className="lead-kicker">Edit Review</span>
              <h2>Track every lead change with a note</h2>
              <p>
                Any real lead update now needs a written reason so the next user can
                see who changed the record and why.
              </p>
            </div>
            <div className="lead-edit-summary-stats">
              <span className="lead-chip neutral">Lead {originalLead?.lead_id || "--"}</span>
              <span className="lead-chip neutral">Notes {Number(originalLead?.note_count || 0)}</span>
              <span className={`lead-chip ${requiresChangeNote ? "lead-chip-emphasis" : "neutral"}`}>
                {changeItems.length} change{changeItems.length === 1 ? "" : "s"}
              </span>
            </div>
          </article>

          <div className="lead-edit-grid">
            <article className="lead-profile-card">
              <div className="panel-header">
                <div>
                  <span className="lead-kicker">Lead Form</span>
                  <h2>Edit Lead</h2>
                </div>
                <Link href={`/leads/${params.id}`} className="button ghost">
                  <DashboardIcon name="leads" />
                  Open Detail
                </Link>
              </div>

              <form className="form-grid two-column" onSubmit={handleSubmit}>
                <label className="field">
                  <span>Contact Person</span>
                  <input
                    value={form.contact_person}
                    onChange={(event) => setForm((current) => ({ ...current, contact_person: event.target.value }))}
                    required
                  />
                </label>
                <label className="field">
                  <span>Company Name</span>
                  <input
                    value={form.company_name}
                    onChange={(event) => setForm((current) => ({ ...current, company_name: event.target.value }))}
                    required
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Phone</span>
                  <input
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    required
                  />
                </label>
                <label className="field">
                  <span>Status</span>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  >
                    <option value="new">new</option>
                    <option value="contacted">contacted</option>
                    <option value="qualified">qualified</option>
                    <option value="proposal">proposal</option>
                    <option value="negotiation">negotiation</option>
                    <option value="closed-won">closed-won</option>
                    <option value="closed-lost">closed-lost</option>
                  </select>
                </label>
                <label className="field">
                  <span>Priority</span>
                  <select
                    value={form.priority}
                    onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </label>
                <label className="field">
                  <span>Workflow</span>
                  <select
                    value={form.workflow_stage}
                    onChange={(event) => setForm((current) => ({ ...current, workflow_stage: event.target.value }))}
                  >
                    <option value="sales">sales</option>
                    <option value="legal">legal</option>
                    <option value="finance">finance</option>
                    <option value="completed">completed</option>
                  </select>
                </label>
                <label className="field">
                  <span>Estimated Value</span>
                  <input
                    type="number"
                    value={form.estimated_value}
                    onChange={(event) => setForm((current) => ({ ...current, estimated_value: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Product</span>
                  <select
                    value={form.product_id}
                    onChange={(event) => setForm((current) => ({ ...current, product_id: event.target.value }))}
                  >
                    <option value="">No product</option>
                    {products.map((product) => (
                      <option key={product.product_id} value={product.product_id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Follow-up</span>
                  <input
                    type="datetime-local"
                    value={form.follow_up_date}
                    onChange={(event) => setForm((current) => ({ ...current, follow_up_date: event.target.value }))}
                  />
                </label>
                <label className="field full-width">
                  <span>Requirements</span>
                  <textarea
                    rows="4"
                    value={form.requirements}
                    onChange={(event) => setForm((current) => ({ ...current, requirements: event.target.value }))}
                  />
                </label>
                <label className="field full-width">
                  <span>{requiresChangeNote ? "Change Note *" : "Change Note"}</span>
                  <textarea
                    rows="4"
                    value={changeNote}
                    onChange={(event) => setChangeNote(event.target.value)}
                    placeholder={
                      requiresChangeNote
                        ? "Explain why these lead details are changing. This will be stored in the note history."
                        : "Optional note if you want to add extra context."
                    }
                  />
                </label>

                <div className="form-actions">
                  <button className="button ghost" type="button" onClick={() => router.back()}>
                    Cancel
                  </button>
                  <button className="button primary" type="submit" disabled={saving || (requiresChangeNote && !changeNote.trim())}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </article>

            <article className="lead-profile-card">
              <div className="panel-header">
                <div>
                  <span className="lead-kicker">Audit Preview</span>
                  <h2>Pending log entry</h2>
                </div>
              </div>

              {changeItems.length ? (
                <div className="lead-change-list">
                  {changeItems.map((item) => (
                    <div className="lead-change-item" key={item.field}>
                      <strong>{item.label}</strong>
                      <span>{item.previous}</span>
                      <DashboardIcon name="analytics" />
                      <b>{item.next}</b>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="lead-empty compact">
                  <div className="lead-empty-icon">
                    <DashboardIcon name="documents" />
                  </div>
                  <h3>No pending edits yet</h3>
                  <p>Update any field and the audit preview will appear here before saving.</p>
                </div>
              )}
            </article>
          </div>
        </section>
      ) : null}
    </DashboardShell>
  );
}
