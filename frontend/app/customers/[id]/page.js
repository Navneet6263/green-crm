"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import DashboardIcon from "../../../components/dashboard/icons";
import { apiRequest } from "../../../lib/api";
import { buildCustomerNotes, parseCustomerProfile, stripCustomerProfile } from "../../../lib/customerProfile";
import { loadSession } from "../../../lib/session";

const PANEL_CLASS = "rounded-[30px] border border-[#eadfcd] bg-white/82 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)] md:p-6";
const SOFT_PANEL_CLASS = "rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4";
const INPUT_CLASS = "w-full rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#060710] outline-none transition placeholder:text-[#9c8e76] focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const PRIMARY_BUTTON_CLASS = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#d7b258] bg-[#f3dfab] px-4 py-2.5 text-sm font-semibold text-[#060710] shadow-[0_16px_30px_rgba(203,169,82,0.18)] transition hover:-translate-y-0.5 hover:bg-[#efd48f] disabled:cursor-not-allowed disabled:opacity-60";
const GHOST_BUTTON_CLASS = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#eadfcd] bg-white px-4 py-2.5 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:text-[#060710] disabled:cursor-not-allowed disabled:opacity-60";
const KICKER_CLASS = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";
const HERO_PANEL_CLASS = "rounded-[30px] border border-[#eadfcd] bg-white/86 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)] md:p-6";
const DARK_PANEL_CLASS = "rounded-[34px] border border-[#1d1a12] bg-[linear-gradient(155deg,#10111d_0%,#171a28_56%,#25212d_100%)] p-6 text-white shadow-[0_24px_80px_rgba(6,7,16,0.3)] md:p-7";

function when(value, full = false) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString(
    "en-IN",
    full
      ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
      : { day: "numeric", month: "short", year: "numeric" }
  );
}

function money(value) {
  return `INR ${Number(value || 0).toLocaleString("en-IN")}`;
}

function initials(value = "Customer") {
  return String(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "C";
}

function parseCustomerNotes(notes) {
  const cleanNotes = stripCustomerProfile(notes);
  if (!cleanNotes) return [];

  return cleanNotes
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const match = line.match(/^\[(.+?)\]\s+([^:]+):\s*(.+)$/);
      if (match) {
        return { id: `${match[1]}-${index}`, author: match[2].trim(), content: match[3].trim(), createdAt: match[1] };
      }
      return { id: `note-${index}`, author: "Team", content: line, createdAt: "" };
    })
    .reverse();
}

function DetailCell({ label, value, className = "" }) {
  return (
    <div className={`rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4 ${className}`}>
      <span className={KICKER_CLASS}>{label}</span>
      <strong className="mt-3 block text-sm leading-6 text-[#060710]">{value || "--"}</strong>
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [completingFollowUp, setCompletingFollowUp] = useState(false);

  async function loadCustomer(activeSession) {
    const response = await apiRequest(`/customers/${params.id}`, { token: activeSession.token });
    setCustomer(response);
    setFollowUp(response.next_follow_up ? String(response.next_follow_up).slice(0, 16) : "");
  }

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) {
      router.replace("/login");
      return;
    }
    setSession(activeSession);
    loadCustomer(activeSession).catch((requestError) => setError(requestError.message));
  }, [params.id, router]);

  const profile = useMemo(() => parseCustomerProfile(customer?.notes), [customer?.notes]);
  const notes = useMemo(() => parseCustomerNotes(customer?.notes), [customer?.notes]);
  const hideTitle = true;

  async function addNote(event) {
    event.preventDefault();
    if (!note.trim()) return;
    setSavingNote(true);
    setError("");
    setNotice("");

    try {
      await apiRequest(`/customers/${params.id}/notes`, {
        method: "POST",
        token: session.token,
        body: { content: note.trim() },
      });
      setNote("");
      setNotice("Customer note saved.");
      await loadCustomer(session);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingNote(false);
    }
  }

  async function addFollowUp(event) {
    event.preventDefault();
    if (!followUp) return;
    setSavingFollowUp(true);
    setError("");
    setNotice("");

    try {
      await apiRequest(`/customers/${params.id}/followups`, {
        method: "POST",
        token: session.token,
        body: { next_follow_up: followUp },
      });
      setNotice("Follow-up scheduled.");
      await loadCustomer(session);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingFollowUp(false);
    }
  }

  async function completeFollowUp() {
    if (!customer?.next_follow_up) return;
    setCompletingFollowUp(true);
    setError("");
    setNotice("");

    try {
      const existingNotes = stripCustomerProfile(customer.notes);
      const completionEntry = `[${new Date().toISOString()}] ${session?.user?.name || "Team"}: Follow-up marked complete`;
      await apiRequest(`/customers/${params.id}`, {
        method: "PATCH",
        token: session.token,
        body: {
          next_follow_up: null,
          notes: buildCustomerNotes(
            parseCustomerProfile(customer.notes),
            existingNotes ? `${existingNotes}\n${completionEntry}` : completionEntry
          ),
        },
      });
      setNotice("Follow-up marked complete.");
      await loadCustomer(session);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setCompletingFollowUp(false);
    }
  }

  return (
    <DashboardShell session={session} title={customer ? customer.company_name : "Customer Detail"} hideTitle={hideTitle} heroStats={[]}>
      {error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}
      {!error && notice ? <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div> : null}
      {!customer ? <div className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-3 text-sm font-medium text-[#6f614c]">Loading customer...</div> : null}
      {customer ? (
        <section className="space-y-5">
          <article className={HERO_PANEL_CLASS}>
            <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button className={GHOST_BUTTON_CLASS} type="button" onClick={() => router.back()}>Back</button>
                  <div className="flex flex-wrap gap-3">
                    <Link className={PRIMARY_BUTTON_CLASS} href={`/customers/${customer.customer_id}/edit`}>
                      <DashboardIcon name="settings" className="h-4 w-4" />
                      Edit Customer
                    </Link>
                    <Link className={GHOST_BUTTON_CLASS} href={`/communications?entity=customer&id=${customer.customer_id}`}>
                      <DashboardIcon name="message" className="h-4 w-4" />
                      Email Workspace
                    </Link>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[22px] bg-[#10111d] text-xl font-bold text-white shadow-[0_18px_32px_rgba(6,7,16,0.18)]">
                    {initials(customer.company_name || customer.name)}
                  </div>
                  <div className="space-y-3">
                    <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                      Customer Desk
                    </span>
                    <div>
                      <h2 className="text-[2rem] font-semibold tracking-tight text-[#060710] md:text-[2.6rem] md:leading-[1.02]">
                        {customer.company_name || customer.name}
                      </h2>
                      <p className="mt-2 max-w-3xl text-sm leading-7 text-[#6f614c] md:text-base">
                        {customer.name || "Primary contact"}{customer.email ? ` · ${customer.email}` : ""}{customer.phone ? ` · ${customer.phone}` : ""}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className={SOFT_PANEL_CLASS}>
                    <span className={KICKER_CLASS}>Primary Contact</span>
                    <strong className="mt-3 block text-base font-black text-[#060710]">{customer.name || "Primary contact"}</strong>
                  </div>
                  <div className={SOFT_PANEL_CLASS}>
                    <span className={KICKER_CLASS}>Email</span>
                    <strong className="mt-3 block break-words text-base font-black text-[#060710]">{customer.email || "No email"}</strong>
                  </div>
                  <div className={SOFT_PANEL_CLASS}>
                    <span className={KICKER_CLASS}>Phone</span>
                    <strong className="mt-3 block text-base font-black text-[#060710]">{customer.phone || "No phone"}</strong>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <article className={DARK_PANEL_CLASS}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { label: "Status", value: customer.status || "active" },
                      { label: "Value", value: money(customer.total_value) },
                      { label: "Owner", value: customer.assigned_to_name || "Unassigned" },
                      { label: "Next Follow-up", value: when(customer.next_follow_up, true) },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">{item.label}</p>
                        <p className="mt-3 text-xl font-black tracking-tight text-white">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            </div>
          </article>

          <div className="grid gap-5 xl:grid-cols-[1.06fr_0.94fr] xl:items-start">
            <div className="space-y-5">
              <article className={PANEL_CLASS}>
                <div className="mb-5">
                  <p className={KICKER_CLASS}>Account Snapshot</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Company details</h3>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <DetailCell label="Primary Contact" value={customer.name} />
                  <DetailCell label="Email" value={customer.email} />
                  <DetailCell label="Phone" value={customer.phone} />
                  <DetailCell label="Industry" value={profile.industry || "Not set"} />
                  <DetailCell label="Website" value={profile.website || "Not set"} />
                  <DetailCell label="Owner" value={customer.assigned_to_name || "Unassigned"} />
                  <DetailCell label="Address" value={[profile.address_street, profile.address_city, profile.address_state, profile.address_zip, profile.country].filter(Boolean).join(", ") || "Not set"} className="md:col-span-2 xl:col-span-3" />
                </div>
                {profile.business_summary ? (
                  <div className="mt-4 rounded-[22px] border border-[#efe2c8] bg-[#fffaf1] px-4 py-4 text-sm leading-7 text-[#6f614c]">
                    {profile.business_summary}
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link className={GHOST_BUTTON_CLASS} href={`/communications?entity=customer&id=${customer.customer_id}`}>
                    <DashboardIcon name="message" className="h-4 w-4" />
                    Email Workspace
                  </Link>
                  <a className={GHOST_BUTTON_CLASS} href={`tel:${String(customer.phone || "").replace(/[^\d+]/g, "")}`}>
                    <DashboardIcon name="support" className="h-4 w-4" />
                    Call Customer
                  </a>
                </div>
              </article>

              <article className={PANEL_CLASS}>
                <div className="mb-5">
                  <p className={KICKER_CLASS}>Notes</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Account notes</h3>
                </div>
                <form className="grid gap-4" onSubmit={addNote}>
                  <label className="space-y-2">
                    <span className={KICKER_CLASS}>Add Note</span>
                    <textarea className={`${INPUT_CLASS} min-h-[150px] resize-y`} rows="5" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add context, update the relationship, or capture the next commercial note." />
                  </label>
                  <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={savingNote}>
                    {savingNote ? "Saving..." : "Save Note"}
                  </button>
                </form>

                <div className="mt-4 space-y-3">
                  {notes.length ? notes.map((item) => (
                    <div key={item.id} className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <strong className="text-sm text-[#060710]">{item.author}</strong>
                        <span className="text-xs font-semibold text-[#8f816a]">{item.createdAt ? when(item.createdAt, true) : "Manual note"}</span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[#5f533f]">{item.content}</p>
                    </div>
                  )) : <p className="rounded-[22px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-4 py-10 text-center text-sm text-[#7a6b57]">No account notes yet.</p>}
                </div>
              </article>
            </div>

            <div className="space-y-5">
              <article className={PANEL_CLASS}>
                <div className="mb-5">
                  <p className={KICKER_CLASS}>Follow-up Desk</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Schedule and close follow-up</h3>
                </div>
                <form className="grid gap-4" onSubmit={addFollowUp}>
                  <label className="space-y-2">
                    <span className={KICKER_CLASS}>Next Follow-up</span>
                    <input className={INPUT_CLASS} type="datetime-local" value={followUp} onChange={(event) => setFollowUp(event.target.value)} />
                  </label>
                  <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={!followUp || savingFollowUp}>
                    {savingFollowUp ? "Saving..." : "Save Follow-up"}
                  </button>
                  <button className={GHOST_BUTTON_CLASS} type="button" disabled={!customer.next_follow_up || completingFollowUp} onClick={completeFollowUp}>
                    {completingFollowUp ? "Completing..." : "Complete Follow-up"}
                  </button>
                </form>
              </article>

              <article className={PANEL_CLASS}>
                <div className="mb-5">
                  <p className={KICKER_CLASS}>History</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Relationship trail</h3>
                </div>
                <div className="grid gap-3">
                  <DetailCell label="Customer ID" value={customer.customer_id} />
                  <DetailCell label="Created" value={when(customer.created_at, true)} />
                  <DetailCell label="Updated" value={when(customer.updated_at, true)} />
                  <DetailCell label="Last Interaction" value={when(customer.last_interaction, true)} />
                </div>
              </article>
            </div>
          </div>
        </section>
      ) : null}
    </DashboardShell>
  );
}
