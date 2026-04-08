"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../components/dashboard/DashboardShell";
import DashboardIcon from "../../components/dashboard/icons";
import { apiRequest } from "../../lib/api";
import { loadSession } from "../../lib/session";

const ALLOWED_ROLES = ["admin", "manager", "sales", "marketing", "support"];

function titleCase(value) {
  return String(value || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function buildMailto(recipient, subject, body) {
  return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function buildTemplates(lead) {
  const contact = lead?.contact_person || "[Contact name]";
  const company = lead?.company_name || "[Company name]";
  const sender = "[Your name]";
  const product = lead?.product_name || "our CRM workspace";

  return [
    {
      id: "intro",
      name: "Introduction",
      subject: `A practical CRM workflow for ${company}`,
      body: `Hello ${contact},

I am reaching out from GreenCRM regarding a more structured way to manage leads, follow-ups, and customer handoffs inside ${company}.

We have been helping teams improve response time, keep ownership clear, and reduce missed follow-ups without adding extra process overhead.

If you are open to it, I can share a short overview of how ${product} can fit your current workflow and where it can remove friction for your team.

Please let me know a suitable time for a quick discussion.

Regards,
${sender}`,
    },
    {
      id: "follow-up",
      name: "Follow-up",
      subject: `Following up on our previous discussion with ${company}`,
      body: `Hello ${contact},

Following up on my earlier note regarding support for ${company}.

Based on what we discussed, the main areas where we can help are:
- cleaner lead tracking
- faster follow-up visibility
- clearer ownership across the team

If this is still relevant, I can send a concise walkthrough or arrange a short discussion this week.

Regards,
${sender}`,
    },
    {
      id: "proposal",
      name: "Proposal",
      subject: `Working proposal for ${company}`,
      body: `Hello ${contact},

I have prepared a working proposal for ${company} based on your current requirements.

The proposal focuses on:
- lead intake and qualification
- follow-up discipline
- reporting visibility for admins and managers
- smoother movement from lead to customer

If helpful, I can walk you through the scope, rollout approach, and expected outcomes in a short review call.

Regards,
${sender}`,
    },
    {
      id: "check-in",
      name: "Check-in",
      subject: `Checking in on next steps for ${company}`,
      body: `Hello ${contact},

Checking in to see whether you would like to continue the conversation around ${product} for ${company}.

If priorities have shifted, I can keep this concise and reconnect at a better time. If the need is active, I can send the next recommended steps today.

Regards,
${sender}`,
    },
  ];
}

export default function CommunicationsPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestedLeadId, setRequestedLeadId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState(requestedLeadId);
  const [selectedTemplateId, setSelectedTemplateId] = useState("intro");
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copyState, setCopyState] = useState("idle");
  const [openingMail, setOpeningMail] = useState(false);

  const selectedLead = useMemo(
    () => leads.find((item) => item.lead_id === selectedLeadId) || null,
    [leads, selectedLeadId]
  );

  const templates = useMemo(
    () => buildTemplates(selectedLead),
    [selectedLead]
  );

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();
    const ordered = [...leads].sort(
      (left, right) => new Date(right.updated_at || right.created_at || 0) - new Date(left.updated_at || left.created_at || 0)
    );

    if (!query) {
      return ordered;
    }

    return ordered.filter((lead) =>
      [
        lead.company_name,
        lead.contact_person,
        lead.email,
        lead.phone,
        lead.status,
        lead.product_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [leads, search]);

  async function loadCommunicationWorkspace(activeSession) {
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest("/leads?page_size=80", { token: activeSession.token });
      let items = response.items || [];

      if (
        requestedLeadId &&
        !items.some((item) => item.lead_id === requestedLeadId)
      ) {
        try {
          const focusedLead = await apiRequest(`/leads/${requestedLeadId}`, {
            token: activeSession.token,
          });
          items = [focusedLead, ...items];
        } catch (_error) {
          // Ignore a missing preselected lead and fall back to the loaded list.
        }
      }

      setLeads(items);
      setSelectedLeadId((current) => current || requestedLeadId || items[0]?.lead_id || "");
    } catch (requestError) {
      setError(requestError.message);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setRequestedLeadId(params.get("lead") || "");
  }, []);

  useEffect(() => {
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
    loadCommunicationWorkspace(activeSession);
  }, [requestedLeadId, router]);

  useEffect(() => {
    if (!selectedLeadId && requestedLeadId) {
      setSelectedLeadId(requestedLeadId);
    }
  }, [requestedLeadId, selectedLeadId]);

  useEffect(() => {
    if (!selectedLead) {
      return;
    }

    setRecipient(selectedLead.email || "");
  }, [selectedLead]);

  useEffect(() => {
    const activeTemplate =
      templates.find((item) => item.id === selectedTemplateId) || templates[0];

    if (!activeTemplate) {
      return;
    }

    setSelectedTemplateId(activeTemplate.id);
    setSubject(activeTemplate.subject);
    setBody(activeTemplate.body);
  }, [selectedLeadId, selectedTemplateId, templates]);

  async function handleCopyDraft() {
    if (!recipient || !subject || !body) {
      setError("Recipient, subject, and message body are required.");
      return;
    }

    try {
      await navigator.clipboard.writeText(`To: ${recipient}\nSubject: ${subject}\n\n${body}`);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch (_error) {
      setError("Clipboard access is unavailable in this browser.");
    }
  }

  async function handleOpenMail() {
    if (!recipient || !subject || !body) {
      setError("Recipient, subject, and message body are required.");
      return;
    }

    setError("");
    setOpeningMail(true);

    try {
      if (selectedLead?.lead_id && session?.token) {
        await apiRequest(`/leads/${selectedLead.lead_id}/activity`, {
          method: "POST",
          token: session.token,
          body: {
            type: "email",
            description: `Prepared email draft: ${subject}`,
          },
        });
      }
    } catch (_error) {
      // Keep the flow usable even if activity logging fails.
    } finally {
      setOpeningMail(false);
      window.location.href = buildMailto(recipient, subject, body);
    }
  }

  const heroStats = [
    { label: "Lead Contacts", value: leads.length },
    {
      label: "With Email",
      value: leads.filter((lead) => Boolean(lead.email)).length,
      color: "#5b7cfa",
    },
    {
      label: "Needs Follow-up",
      value: leads.filter((lead) => lead.follow_up_date).length,
      color: "#b58a31",
    },
    {
      label: "Selected Lead",
      value: selectedLead ? titleCase(selectedLead.status || "active") : "--",
      color: "#66758f",
    },
  ];

  return (
    <DashboardShell
      session={session}
      title="Communications"
      eyebrow="Email Workspace"
      heroStats={heroStats}
    >
      {error ? <div className="alert error">{error}</div> : null}
      {loading ? <div className="alert">Loading communication workspace...</div> : null}
      {!loading ? (
        <section className="comm-shell">
          <article className="comm-intro">
            <div>
              <span className="eyebrow">Drafting</span>
              <h2>Email communication hub</h2>
              <p>
                Select a lead, load a structured draft, adjust the message, and
                open the mail app with the draft prefilled.
              </p>
            </div>
            <div className="comm-intro-note">
              <DashboardIcon name="message" />
              <span>Email is enabled here for now. WhatsApp and meeting actions can be added later without changing the lead workflow.</span>
            </div>
          </article>

          <section className="comm-layout">
            <aside className="comm-sidebar">
              <div className="comm-sidebar-head">
                <div>
                  <span className="eyebrow">Lead List</span>
                  <h3>Choose a lead</h3>
                </div>
                <span>{filteredLeads.length}</span>
              </div>

              <label className="field">
                <span>Search leads</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search company, contact, email, or status"
                />
              </label>

              <div className="comm-lead-list">
                {filteredLeads.length ? (
                  filteredLeads.map((lead) => {
                    const active = lead.lead_id === selectedLeadId;
                    return (
                      <button
                        key={lead.lead_id}
                        type="button"
                        className={`comm-lead-card ${active ? "active" : ""}`}
                        onClick={() => setSelectedLeadId(lead.lead_id)}
                      >
                        <div className="comm-lead-card-top">
                          <strong>{lead.company_name || "Unnamed company"}</strong>
                          <span>{titleCase(lead.status || "new")}</span>
                        </div>
                        <p>{lead.contact_person || "No contact person"}</p>
                        <small>{lead.email || "No email on file"}</small>
                      </button>
                    );
                  })
                ) : (
                  <div className="comm-empty-state">
                    <DashboardIcon name="leads" />
                    <p>No leads matched the current search.</p>
                  </div>
                )}
              </div>
            </aside>

            <article className="comm-compose">
              {selectedLead ? (
                <>
                  <div className="comm-contact-card">
                    <div className="comm-contact-head">
                      <div>
                        <span className="eyebrow">Selected Lead</span>
                        <h3>{selectedLead.contact_person || "Lead contact"}</h3>
                        <p>{selectedLead.company_name || "No company name"}</p>
                      </div>
                      <div className="comm-status-pill">
                        {titleCase(selectedLead.status || "new")}
                      </div>
                    </div>

                    <div className="comm-contact-grid">
                      <div>
                        <span>Email</span>
                        <strong>{selectedLead.email || "Add an email before sending"}</strong>
                      </div>
                      <div>
                        <span>Phone</span>
                        <strong>{selectedLead.phone || "No phone on file"}</strong>
                      </div>
                      <div>
                        <span>Product</span>
                        <strong>{selectedLead.product_name || "No product tagged"}</strong>
                      </div>
                      <div>
                        <span>Owner</span>
                        <strong>{selectedLead.assigned_to_name || selectedLead.created_by_name || "Unassigned"}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="comm-template-panel">
                    <div className="comm-panel-head">
                      <div>
                        <span className="eyebrow">Templates</span>
                        <h3>Email direction</h3>
                      </div>
                      <span>{templates.length} options</span>
                    </div>
                    <div className="comm-template-grid">
                      {templates.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          className={`comm-template-card ${selectedTemplateId === template.id ? "active" : ""}`}
                          onClick={() => {
                            setSelectedTemplateId(template.id);
                            setSubject(template.subject);
                            setBody(template.body);
                          }}
                        >
                          <strong>{template.name}</strong>
                          <span>{template.subject}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="comm-compose-panel">
                    <div className="comm-panel-head">
                      <div>
                        <span className="eyebrow">Compose</span>
                        <h3>Email draft</h3>
                      </div>
                      <span>Mail app handoff</span>
                    </div>

                    <div className="form-grid">
                      <label className="field">
                        <span>Recipient</span>
                        <input
                          type="email"
                          value={recipient}
                          onChange={(event) => setRecipient(event.target.value)}
                          placeholder="recipient@company.com"
                        />
                      </label>

                      <label className="field">
                        <span>Subject</span>
                        <input
                          value={subject}
                          onChange={(event) => setSubject(event.target.value)}
                          placeholder="Email subject"
                        />
                      </label>

                      <label className="field">
                        <span>Message</span>
                        <textarea
                          rows="12"
                          value={body}
                          onChange={(event) => setBody(event.target.value)}
                          placeholder="Write the email body"
                        />
                      </label>
                    </div>

                    <div className="comm-action-row">
                      <button
                        className="button ghost"
                        type="button"
                        onClick={handleCopyDraft}
                      >
                        <DashboardIcon name="documents" />
                        {copyState === "copied" ? "Copied" : "Copy Draft"}
                      </button>
                      <button
                        className="button primary"
                        type="button"
                        onClick={handleOpenMail}
                        disabled={openingMail}
                      >
                        <DashboardIcon name="message" />
                        {openingMail ? "Opening..." : "Open Mail App"}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="comm-empty-state large">
                  <DashboardIcon name="message" />
                  <h3>Select a lead to start drafting</h3>
                  <p>The composer will populate once a lead is selected from the list.</p>
                </div>
              )}
            </article>
          </section>
        </section>
      ) : null}
    </DashboardShell>
  );
}
