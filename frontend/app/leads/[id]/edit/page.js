"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import DashboardShell from "../../../../components/dashboard/DashboardShell";
import DashboardIcon from "../../../../components/dashboard/icons";
import { apiRequest } from "../../../../lib/api";
import { loadSession } from "../../../../lib/session";

const PANEL_CLASS = "rounded-[30px] border border-[#eadfcd] bg-white/82 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)] md:p-6";
const SOFT_PANEL_CLASS = "rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4";
const INPUT_CLASS = "w-full rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#060710] outline-none transition placeholder:text-[#9c8e76] focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const PRIMARY_BUTTON_CLASS = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#d7b258] bg-[#f3dfab] px-4 py-2.5 text-sm font-semibold text-[#060710] shadow-[0_16px_30px_rgba(203,169,82,0.18)] transition hover:-translate-y-0.5 hover:bg-[#efd48f] disabled:cursor-not-allowed disabled:opacity-60";
const GHOST_BUTTON_CLASS = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#eadfcd] bg-white px-4 py-2.5 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:text-[#060710] disabled:cursor-not-allowed disabled:opacity-60";
const KICKER_CLASS = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";
const HERO_PANEL_CLASS = "rounded-[36px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(250,241,221,0.98)_44%,_rgba(245,231,193,0.98)_100%)] p-6 shadow-[0_24px_70px_rgba(79,58,22,0.08)] md:p-8";
const DARK_PANEL_CLASS = "rounded-[34px] border border-[#1d1a12] bg-[linear-gradient(155deg,#10111d_0%,#171a28_56%,#25212d_100%)] p-6 text-white shadow-[0_24px_80px_rgba(6,7,16,0.3)] md:p-7";

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

function normalizeEstimatedValue(value) {
  if (blank(value)) {
    return 0;
  }

  const directNumeric = Number(value);
  if (Number.isFinite(directNumeric)) {
    return directNumeric;
  }

  const cleaned = String(value).replace(/[^\d.-]/g, "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function toApiDateTime(value) {
  return value ? String(value).replace("T", " ") : null;
}

function initials(value = "Lead") {
  return String(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "L";
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
      apiRequest("/products?page_size=200", { token: activeSession.token }),
    ])
      .then(([leadResponse, productsResponse]) => {
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
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const productChoices = useMemo(() => {
    const list = [...products];
    if (originalLead?.product_id && !list.some((product) => product.product_id === originalLead.product_id)) {
      list.unshift({
        product_id: originalLead.product_id,
        name: originalLead.product_name || `${originalLead.product_id} (Current product)`,
      });
    }
    return list;
  }, [originalLead, products]);

  const productLookup = useMemo(
    () => new Map(productChoices.map((product) => [product.product_id, product.name])),
    [productChoices]
  );

  const changeItems = useMemo(() => {
    if (!form || !originalLead) {
      return [];
    }

    const nextPayload = {
      ...form,
      estimated_value: normalizeEstimatedValue(form.estimated_value),
      follow_up_date: toApiDateTime(form.follow_up_date) || "",
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
      ["follow_up_date", "Follow-up Date", originalLead.follow_up_date ? String(originalLead.follow_up_date).slice(0, 16) : "", nextPayload.follow_up_date],
      ["product_id", "Product", productLookup.get(originalLead.product_id) || originalLead.product_name || originalLead.product_id, productLookup.get(nextPayload.product_id) || nextPayload.product_id],
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
  const role = session?.user?.role || "";
  const hideTitle = ["sales", "marketing", "admin", "manager"].includes(role);

  async function handleSubmit(event) {
    event.preventDefault();
    if (requiresChangeNote && !changeNote.trim()) {
      setError("A change note is required whenever a lead is updated.");
      return;
    }

    if (!form.product_id) {
      setError("Select a product before saving the lead.");
      return;
    }

    const estimatedValue = normalizeEstimatedValue(form.estimated_value);
    if (!Number.isFinite(estimatedValue)) {
      setError("Estimated value must be a valid number.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const nextPayload = {
        ...form,
        estimated_value: estimatedValue,
        follow_up_date: toApiDateTime(form.follow_up_date),
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
    <DashboardShell session={session} title="Edit Lead" hideTitle={hideTitle} heroStats={[]}>
      {error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}
      {loading ? <div className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-3 text-sm font-medium text-[#6f614c]">Loading lead...</div> : null}
      {!loading && form ? (
        <section className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
            <article className={HERO_PANEL_CLASS}>
              <button className={GHOST_BUTTON_CLASS} type="button" onClick={() => router.back()}>
                Back
              </button>

              <div className="mt-5 flex items-start gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[22px] bg-[#10111d] text-xl font-bold text-white shadow-[0_18px_32px_rgba(6,7,16,0.18)]">
                  {initials(originalLead?.contact_person || originalLead?.company_name || "Lead")}
                </div>
                <div className="space-y-4">
                  <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                    Edit Workspace
                  </span>
                  <div>
                    <h2 className="text-4xl font-semibold tracking-tight text-[#060710] md:text-[3.15rem] md:leading-[1.02]">
                      Update this lead with clean structure and visible audit context.
                    </h2>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-[#746853]">
                      Edit the commercial details, explain the change, and keep the workflow trail readable before you save.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className={SOFT_PANEL_CLASS}>
                  <p className={KICKER_CLASS}>Lead</p>
                  <strong className="mt-3 block text-2xl font-black tracking-tight text-[#060710]">{originalLead?.lead_id || "--"}</strong>
                </div>
                <div className={SOFT_PANEL_CLASS}>
                  <p className={KICKER_CLASS}>Company</p>
                  <strong className="mt-3 block text-2xl font-black tracking-tight text-[#060710]">{originalLead?.company_name || "--"}</strong>
                </div>
                <div className="rounded-[24px] border border-[#eadfcd] bg-[#fff7e8] p-4">
                  <p className={KICKER_CLASS}>Pending Changes</p>
                  <strong className="mt-3 block text-2xl font-black tracking-tight text-[#060710]">{changeItems.length}</strong>
                </div>
              </div>
            </article>

            <article className={DARK_PANEL_CLASS}>
              <div className="space-y-4">
                <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white/70">
                  Edit Summary
                </span>
                <h3 className="text-[2rem] font-semibold leading-[1.08] tracking-tight text-white">
                  Keep the edit pass deliberate so the next owner understands exactly what changed.
                </h3>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Current Status", value: originalLead?.status || "--" },
                  { label: "Priority", value: originalLead?.priority || "--" },
                  { label: "Workflow", value: originalLead?.workflow_stage || "--" },
                  { label: "Product", value: productLookup.get(form.product_id) || originalLead?.product_name || "--" },
                ].map((item) => (
                  <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">{item.label}</p>
                    <strong className="mt-3 block text-xl font-black text-white">{item.value}</strong>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={`/leads/${params.id}`} className={GHOST_BUTTON_CLASS}>
                  <DashboardIcon name="leads" className="h-4 w-4" />
                  View Lead
                </Link>
                <button className={GHOST_BUTTON_CLASS} type="button" onClick={() => router.back()}>
                  Cancel
                </button>
              </div>
            </article>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.06fr_0.94fr] xl:items-start">
            <form className="grid gap-5" onSubmit={handleSubmit}>
              <article className={PANEL_CLASS}>
                <div className="mb-5">
                  <p className={KICKER_CLASS}>Identity</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Contact and company details</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className={KICKER_CLASS}>Contact Person</span>
                    <input className={INPUT_CLASS} value={form.contact_person} onChange={(event) => setForm((current) => ({ ...current, contact_person: event.target.value }))} required />
                  </label>
                  <label className="space-y-2">
                    <span className={KICKER_CLASS}>Company Name</span>
                    <input className={INPUT_CLASS} value={form.company_name} onChange={(event) => setForm((current) => ({ ...current, company_name: event.target.value }))} required />
                  </label>
                  <label className="space-y-2">
                    <span className={KICKER_CLASS}>Email</span>
                    <input className={INPUT_CLASS} type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
                  </label>
                  <label className="space-y-2">
                    <span className={KICKER_CLASS}>Phone</span>
                    <input className={INPUT_CLASS} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} required />
                  </label>
                </div>
              </article>

              <article className={PANEL_CLASS}>
                <div className="mb-5">
                  <p className={KICKER_CLASS}>Pipeline</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Status, workflow, value, and timing</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className={KICKER_CLASS}>Status</span>
                    <select className={INPUT_CLASS} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                      <option value="new">new</option>
                      <option value="contacted">contacted</option>
                      <option value="qualified">qualified</option>
                      <option value="proposal">proposal</option>
                      <option value="negotiation">negotiation</option>
                      <option value="closed-won">closed-won</option>
                      <option value="closed-lost">closed-lost</option>
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className={KICKER_CLASS}>Priority</span>
                    <select className={INPUT_CLASS} value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}>
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className={KICKER_CLASS}>Workflow</span>
                    <select className={INPUT_CLASS} value={form.workflow_stage} onChange={(event) => setForm((current) => ({ ...current, workflow_stage: event.target.value }))}>
                      <option value="sales">sales</option>
                      <option value="legal">legal</option>
                      <option value="finance">finance</option>
                      <option value="completed">completed</option>
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className={KICKER_CLASS}>Estimated Value</span>
                    <input className={INPUT_CLASS} type="number" value={form.estimated_value} onChange={(event) => setForm((current) => ({ ...current, estimated_value: event.target.value }))} />
                  </label>
                  <label className="space-y-2">
                    <span className={KICKER_CLASS}>Product</span>
                    <select className={INPUT_CLASS} value={form.product_id} onChange={(event) => setForm((current) => ({ ...current, product_id: event.target.value }))} required>
                      <option value="">Select product</option>
                      {productChoices.map((product) => (
                        <option key={product.product_id} value={product.product_id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className={KICKER_CLASS}>Follow-up</span>
                    <input className={INPUT_CLASS} type="datetime-local" value={form.follow_up_date} onChange={(event) => setForm((current) => ({ ...current, follow_up_date: event.target.value }))} />
                  </label>
                </div>
              </article>

              <article className={PANEL_CLASS}>
                <div className="mb-5">
                  <p className={KICKER_CLASS}>Context</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Requirements and change note</h3>
                </div>
                <div className="grid gap-4">
                  <label className="space-y-2">
                    <span className={KICKER_CLASS}>Requirements</span>
                    <textarea className={`${INPUT_CLASS} min-h-[170px] resize-y`} rows="6" value={form.requirements} onChange={(event) => setForm((current) => ({ ...current, requirements: event.target.value }))} />
                  </label>
                  <label className="space-y-2">
                    <span className={KICKER_CLASS}>{requiresChangeNote ? "Change Note *" : "Change Note"}</span>
                    <textarea
                      className={`${INPUT_CLASS} min-h-[170px] resize-y`}
                      rows="6"
                      value={changeNote}
                      onChange={(event) => setChangeNote(event.target.value)}
                      placeholder={requiresChangeNote ? "Explain why these lead details are changing. This will be stored in the note history." : "Optional note if you want to add extra context."}
                    />
                  </label>
                </div>

                <div className="mt-5 flex flex-wrap justify-end gap-3">
                  <button className={GHOST_BUTTON_CLASS} type="button" onClick={() => router.back()}>
                    Cancel
                  </button>
                  <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={saving || (requiresChangeNote && !changeNote.trim())}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </article>
            </form>

            <div className="space-y-5 xl:sticky xl:top-6">
              <article className={PANEL_CLASS}>
                <div className="mb-5">
                  <p className={KICKER_CLASS}>Audit Preview</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Pending log entry</h3>
                </div>

                {changeItems.length ? (
                  <div className="space-y-3">
                    {changeItems.map((item) => (
                      <div key={item.field} className={SOFT_PANEL_CLASS}>
                        <p className={KICKER_CLASS}>{item.label}</p>
                        <div className="mt-3 grid gap-3">
                          <div className="rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3">
                            <span className="block text-xs font-bold uppercase tracking-[0.16em] text-[#8f816a]">Current</span>
                            <strong className="mt-2 block text-sm text-[#060710]">{item.previous}</strong>
                          </div>
                          <div className="flex justify-center text-[#b2871f]">
                            <DashboardIcon name="analytics" className="h-5 w-5" />
                          </div>
                          <div className="rounded-[18px] border border-[#d7b258] bg-[#fff6e4] px-4 py-3">
                            <span className="block text-xs font-bold uppercase tracking-[0.16em] text-[#8f816a]">Next</span>
                            <strong className="mt-2 block text-sm text-[#060710]">{item.next}</strong>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-14 text-center">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-[20px] bg-white text-[#8d6e27] shadow-[0_12px_24px_rgba(79,58,22,0.08)]">
                      <DashboardIcon name="documents" className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-[#060710]">No pending edits yet</h3>
                    <p className="mt-2 text-sm text-[#7a6b57]">Update any field and the audit preview will appear here before saving.</p>
                  </div>
                )}
              </article>

              <article className={PANEL_CLASS}>
                <p className={KICKER_CLASS}>Save Rules</p>
                <div className="mt-4 space-y-3">
                  {[
                    "Select a product before saving the lead.",
                    "Estimated value must remain a valid number.",
                    "If details change, add a clear change note.",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-[20px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-[#fff0c8] text-[#8d6e27]">
                        <DashboardIcon name="documents" className="h-4 w-4" />
                      </span>
                      <strong className="text-sm text-[#060710]">{item}</strong>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>
      ) : null}
    </DashboardShell>
  );
}
