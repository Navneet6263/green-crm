"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../components/dashboard/DashboardShell";
import DashboardIcon from "../../components/dashboard/icons";
import { apiRequest } from "../../lib/api";
import { loadSession } from "../../lib/session";

const ALLOWED_ROLES = [
  "admin",
  "manager",
  "sales",
  "marketing",
  "support",
  "platform-admin",
  "platform-manager",
];

function titleCase(value) {
  return String(value || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function buildEntityRecords(leads, customers) {
  const leadRecords = (leads || []).map((lead) => ({
    key: `lead:${lead.lead_id}`,
    entity_type: "lead",
    entity_id: lead.lead_id,
    title: lead.company_name || "Unnamed lead",
    subtitle: lead.contact_person || "No contact person",
    email: lead.email || "",
    phone: lead.phone || "",
    owner: lead.assigned_to_name || lead.created_by_name || "Unassigned",
    status: titleCase(lead.status || "new"),
    product: lead.product_name || "No product tagged",
    raw: lead,
  }));

  const customerRecords = (customers || []).map((customer) => ({
    key: `customer:${customer.customer_id}`,
    entity_type: "customer",
    entity_id: customer.customer_id,
    title: customer.company_name || customer.name || "Unnamed customer",
    subtitle: customer.name || "Primary contact",
    email: customer.email || "",
    phone: customer.phone || "",
    owner: customer.assigned_to_name || "Unassigned",
    status: titleCase(customer.status || "active"),
    product: `Value ${Number(customer.total_value || 0).toLocaleString("en-IN")}`,
    raw: customer,
  }));

  return [...leadRecords, ...customerRecords];
}

function buildTemplates(record) {
  const contact = record?.subtitle || "[Contact name]";
  const company = record?.title || "[Company name]";
  const sender = "[Your name]";

  if (record?.entity_type === "customer") {
    return [
      {
        id: "account-check-in",
        name: "Account Check-in",
        subject: `Quick check-in for ${company}`,
        body: `Hello ${contact},

Checking in on your current priorities for ${company}.

If there is anything pending from our side, please reply here and I will coordinate the next step immediately.

Regards,
${sender}`,
      },
      {
        id: "renewal",
        name: "Renewal / Upsell",
        subject: `Next growth step for ${company}`,
        body: `Hello ${contact},

We wanted to share the next recommended step for ${company} based on the current usage and support history.

If helpful, I can send a short summary with the most relevant improvements and rollout options.

Regards,
${sender}`,
      },
      {
        id: "support-follow-up",
        name: "Support Follow-up",
        subject: `Following up on the latest request from ${company}`,
        body: `Hello ${contact},

Following up on the recent activity from ${company}.

Please let me know if the last update resolved the issue or if you want us to continue with the next action from our side.

Regards,
${sender}`,
      },
    ];
  }

  const product = record?.product && record.product !== "No product tagged" ? record.product : "our CRM workspace";

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
      subject: `Following up with ${company}`,
      body: `Hello ${contact},

Following up on my earlier note regarding ${company}.

If this is still relevant, I can send a concise walkthrough or arrange a short discussion this week.

Regards,
${sender}`,
    },
    {
      id: "proposal",
      name: "Proposal",
      subject: `Working proposal for ${company}`,
      body: `Hello ${contact},

I have prepared a working proposal for ${company} based on the current requirements we discussed.

If useful, I can walk you through the scope, rollout approach, and expected outcomes in a short review call.

Regards,
${sender}`,
    },
  ];
}

async function loadRequestedEntity(type, id, token) {
  if (!type || !id) {
    return null;
  }

  const path = type === "customer" ? `/customers/${id}` : `/leads/${id}`;
  return apiRequest(path, { token });
}

export default function CommunicationsPage() {
  const router = useRouter();
  const [requestedType, setRequestedType] = useState("");
  const [requestedId, setRequestedId] = useState("");

  const [session, setSession] = useState(null);
  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [selectedKey, setSelectedKey] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copyState, setCopyState] = useState("idle");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const nextType =
      params.get("entity") ||
      (params.get("customer") ? "customer" : params.get("lead") ? "lead" : "");
    const nextId = params.get("id") || params.get("customer") || params.get("lead") || "";

    setRequestedType(nextType);
    setRequestedId(nextId);
    setEntityFilter(nextType || "all");
    setSelectedKey(nextType && nextId ? `${nextType}:${nextId}` : "");
  }, []);

  const records = useMemo(() => buildEntityRecords(leads, customers), [customers, leads]);
  const selectedRecord = useMemo(
    () => records.find((item) => item.key === selectedKey) || null,
    [records, selectedKey]
  );
  const templates = useMemo(() => buildTemplates(selectedRecord), [selectedRecord]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    const ordered = [...records].sort((left, right) =>
      left.entity_type === right.entity_type
        ? String(left.title || "").localeCompare(String(right.title || ""))
        : left.entity_type === "lead"
          ? -1
          : 1
    );

    return ordered.filter((record) => {
      const matchesType = entityFilter === "all" || record.entity_type === entityFilter;
      const matchesSearch =
        !query ||
        [
          record.title,
          record.subtitle,
          record.email,
          record.phone,
          record.owner,
          record.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesType && matchesSearch;
    });
  }, [entityFilter, records, search]);

  async function loadCommunicationWorkspace(activeSession) {
    setLoading(true);
    setError("");

    try {
      const [leadResponse, customerResponse] = await Promise.all([
        apiRequest("/leads?page_size=80", { token: activeSession.token }),
        apiRequest("/customers?page_size=80", { token: activeSession.token }),
      ]);

      let nextLeads = leadResponse.items || [];
      let nextCustomers = customerResponse.items || [];

      if (requestedType && requestedId) {
        try {
          const focusedEntity = await loadRequestedEntity(
            requestedType,
            requestedId,
            activeSession.token
          );
          if (requestedType === "lead" && focusedEntity && !nextLeads.some((item) => item.lead_id === requestedId)) {
            nextLeads = [focusedEntity, ...nextLeads];
          }
          if (requestedType === "customer" && focusedEntity && !nextCustomers.some((item) => item.customer_id === requestedId)) {
            nextCustomers = [focusedEntity, ...nextCustomers];
          }
        } catch (_error) {
          // Ignore deep-link misses and keep the loaded workspace usable.
        }
      }

      setLeads(nextLeads);
      setCustomers(nextCustomers);

      const nextRecords = buildEntityRecords(nextLeads, nextCustomers);
      setSelectedKey((current) =>
        current && nextRecords.some((item) => item.key === current)
          ? current
          : requestedType && requestedId
            ? `${requestedType}:${requestedId}`
            : nextRecords[0]?.key || ""
      );
    } catch (requestError) {
      setError(requestError.message);
      setLeads([]);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

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
  }, [requestedId, requestedType, router]);

  useEffect(() => {
    if (!selectedRecord) {
      return;
    }

    setRecipient(selectedRecord.email || "");
    const nextTemplate = buildTemplates(selectedRecord)[0];
    if (nextTemplate) {
      setSelectedTemplateId(nextTemplate.id);
      setSubject(nextTemplate.subject);
      setBody(nextTemplate.body);
    }
  }, [selectedRecord?.key]);

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

  async function handleSendEmail() {
    if (!selectedRecord) {
      setError("Choose a lead or customer before sending an email.");
      return;
    }

    if (!recipient || !subject || !body) {
      setError("Recipient, subject, and message body are required.");
      return;
    }

    setSending(true);
    setError("");
    setMessage("");

    try {
      const response = await apiRequest("/communications/send", {
        method: "POST",
        token: session.token,
        body: {
          entity_type: selectedRecord.entity_type,
          entity_id: selectedRecord.entity_id,
          to: recipient.trim(),
          subject: subject.trim(),
          body: body.trim(),
        },
      });

      if (response.entity_type === "lead" && response.entity) {
        setLeads((current) =>
          current.map((lead) =>
            lead.lead_id === response.entity.lead_id ? { ...lead, ...response.entity } : lead
          )
        );
      }

      if (response.entity_type === "customer" && response.entity) {
        setCustomers((current) =>
          current.map((customer) =>
            customer.customer_id === response.entity.customer_id
              ? { ...customer, ...response.entity }
              : customer
          )
        );
      }

      setMessage(
        response.delivery?.delivery === "email"
          ? "Email sent successfully."
          : "Email logged in CRM, but delivery fell back to preview mode."
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  }

  const heroStats = [
    { label: "Lead Contacts", value: leads.length },
    { label: "Customers", value: customers.length, color: "#2784ff" },
    {
      label: "With Email",
      value: records.filter((record) => Boolean(record.email)).length,
      color: "#5b7cfa",
    },
    {
      label: "Selected",
      value: selectedRecord ? titleCase(selectedRecord.entity_type) : "--",
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
      {message ? <div className="alert">{message}</div> : null}
      {loading ? <div className="alert">Loading communication workspace...</div> : null}
      {!loading ? (
        <section className="comm-shell">
          <article className="comm-intro">
            <div>
              <span className="eyebrow">CRM Delivery</span>
              <h2>Lead and customer email hub</h2>
              <p>
                Choose a lead or customer, load a working draft, edit the message, and send it
                directly through CRM delivery routing.
              </p>
            </div>
            <div className="comm-intro-note">
              <DashboardIcon name="message" />
              <span>Tenant SMTP is used when saved. Otherwise the platform SMTP route handles delivery.</span>
            </div>
          </article>

          <section className="comm-layout">
            <aside className="comm-sidebar">
              <div className="comm-sidebar-head">
                <div>
                  <span className="eyebrow">Directory</span>
                  <h3>Choose a record</h3>
                </div>
                <span>{filteredRecords.length}</span>
              </div>

              <div className="feature-preset-row" style={{ marginBottom: "1rem" }}>
                <button className="button ghost" type="button" onClick={() => setEntityFilter("all")}>All</button>
                <button className="button ghost" type="button" onClick={() => setEntityFilter("lead")}>Leads</button>
                <button className="button ghost" type="button" onClick={() => setEntityFilter("customer")}>Customers</button>
              </div>

              <label className="field">
                <span>Search</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search company, contact, email, or owner"
                />
              </label>

              <div className="comm-lead-list">
                {filteredRecords.length ? (
                  filteredRecords.map((record) => {
                    const active = record.key === selectedKey;
                    return (
                      <button
                        key={record.key}
                        type="button"
                        className={`comm-lead-card ${active ? "active" : ""}`}
                        onClick={() => setSelectedKey(record.key)}
                      >
                        <div className="comm-lead-card-top">
                          <strong>{record.title}</strong>
                          <span>{record.status}</span>
                        </div>
                        <p>{record.subtitle}</p>
                        <small>
                          {titleCase(record.entity_type)} | {record.email || "No email on file"}
                        </small>
                      </button>
                    );
                  })
                ) : (
                  <div className="comm-empty-state">
                    <DashboardIcon name="message" />
                    <p>No records matched the current search.</p>
                  </div>
                )}
              </div>
            </aside>

            <article className="comm-compose">
              {selectedRecord ? (
                <>
                  <div className="comm-contact-card">
                    <div className="comm-contact-head">
                      <div>
                        <span className="eyebrow">{titleCase(selectedRecord.entity_type)}</span>
                        <h3>{selectedRecord.subtitle}</h3>
                        <p>{selectedRecord.title}</p>
                      </div>
                      <div className="comm-status-pill">
                        {selectedRecord.status}
                      </div>
                    </div>

                    <div className="comm-contact-grid">
                      <div>
                        <span>Email</span>
                        <strong>{selectedRecord.email || "Add an email before sending"}</strong>
                      </div>
                      <div>
                        <span>Phone</span>
                        <strong>{selectedRecord.phone || "No phone on file"}</strong>
                      </div>
                      <div>
                        <span>Context</span>
                        <strong>{selectedRecord.product}</strong>
                      </div>
                      <div>
                        <span>Owner</span>
                        <strong>{selectedRecord.owner}</strong>
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
                        <h3>Send email from CRM</h3>
                      </div>
                      <span>{titleCase(selectedRecord.entity_type)} sync</span>
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
                      <button className="button ghost" type="button" onClick={handleCopyDraft}>
                        <DashboardIcon name="documents" />
                        {copyState === "copied" ? "Copied" : "Copy Draft"}
                      </button>
                      <button
                        className="button primary"
                        type="button"
                        onClick={handleSendEmail}
                        disabled={sending}
                      >
                        <DashboardIcon name="message" />
                        {sending ? "Sending..." : "Send Email"}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="comm-empty-state large">
                  <DashboardIcon name="message" />
                  <h3>Select a lead or customer to start drafting</h3>
                  <p>The composer will populate once a record is selected from the list.</p>
                </div>
              )}
            </article>
          </section>
        </section>
      ) : null}
    </DashboardShell>
  );
}
