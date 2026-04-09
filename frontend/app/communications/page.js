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
const PANEL_CLASS = "rounded-[30px] border border-[#eadfcd] bg-white/82 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)] md:p-6";
const INPUT_CLASS = "w-full rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#060710] outline-none transition placeholder:text-[#9c8e76] focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const PRIMARY_BUTTON_CLASS = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#d7b258] bg-[#f3dfab] px-4 py-2.5 text-sm font-semibold text-[#060710] shadow-[0_16px_30px_rgba(203,169,82,0.18)] transition hover:-translate-y-0.5 hover:bg-[#efd48f] disabled:cursor-not-allowed disabled:opacity-60";
const GHOST_BUTTON_CLASS = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#eadfcd] bg-white px-4 py-2.5 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:text-[#060710] disabled:cursor-not-allowed disabled:opacity-60";
const KICKER_CLASS = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";

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
  const PAGE_SIZE = 10;
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
  const [currentPage, setCurrentPage] = useState(1);
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
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const paginatedRecords = useMemo(
    () => filteredRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, filteredRecords]
  );

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
    setCurrentPage(1);
  }, [entityFilter, search]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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

  return (
    <DashboardShell
      session={session}
      title="Communications"
      hideTitle
      heroStats={[]}
    >
      {error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}
      {message ? <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div> : null}
      {loading ? <div className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-3 text-sm font-medium text-[#6f614c]">Loading communication workspace...</div> : null}
      {!loading ? (
        <section className="space-y-5">
          <article className="rounded-[34px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(247,240,227,0.96)_42%,_rgba(241,232,215,1)_100%)] p-5 shadow-[0_22px_60px_rgba(79,58,22,0.08)] md:p-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-4">
                <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                  CRM Delivery
                </span>
                <h2 className="text-4xl font-semibold tracking-tight text-[#060710] md:text-[3rem] md:leading-[1.04]">
                  Lead and customer communication, cleaned into one sharper email desk.
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-[#746853] md:text-base">
                  Pick a lead or customer, load a ready draft, and send the message from the same premium workspace without jumping across older screens.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: "Lead Contacts", value: leads.length },
                    { label: "Customers", value: customers.length },
                    { label: "With Email", value: records.filter((record) => Boolean(record.email)).length },
                    { label: "Selected", value: selectedRecord ? titleCase(selectedRecord.entity_type) : "--" },
                  ].map((item, index) => (
                    <article key={item.label} className={`rounded-[24px] border border-[#eadfcd] p-4 shadow-[0_12px_28px_rgba(79,58,22,0.05)] ${index === 0 ? "bg-[#fff6e4]" : "bg-white/82"}`}>
                      <p className={KICKER_CLASS}>{item.label}</p>
                      <p className="mt-4 text-2xl font-semibold tracking-tight text-[#060710]">{item.value}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 xl:min-w-[400px] xl:max-w-[440px] xl:w-full">
                <div className="rounded-[24px] border border-[#eadfcd] bg-white/85 p-4 shadow-[0_12px_28px_rgba(79,58,22,0.05)]">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#10111d] text-white">
                      <DashboardIcon name="message" className="h-5 w-5" />
                    </div>
                    <div>
                      <p className={KICKER_CLASS}>Routing</p>
                      <p className="mt-2 text-sm leading-7 text-[#746853]">
                        Tenant SMTP is used when configured. Otherwise the platform route logs and delivers the draft through CRM fallback.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {["all", "lead", "customer"].map((type) => {
                    const active = entityFilter === type;
                    return (
                      <button
                        key={type}
                        className={`inline-flex min-h-[46px] items-center justify-center rounded-[18px] border px-4 py-2.5 text-sm font-semibold transition ${
                          active
                            ? "border-[#d7b258] bg-[#f3dfab] text-[#060710] shadow-[0_12px_24px_rgba(203,169,82,0.16)]"
                            : "border-[#eadfcd] bg-white text-[#5d503c]"
                        }`}
                        type="button"
                        onClick={() => setEntityFilter(type)}
                      >
                        {type === "all" ? "All Records" : type === "lead" ? "Leads" : "Customers"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </article>

          <div className="grid gap-5 xl:grid-cols-[0.86fr_1.14fr] xl:items-start">
            <aside className={PANEL_CLASS}>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className={KICKER_CLASS}>Directory</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Choose a record</h3>
                </div>
                <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                  Page {currentPage} of {totalPages}
                </span>
              </div>

              <label className="grid gap-2">
                <span className={KICKER_CLASS}>Search</span>
                <div className="relative">
                  <DashboardIcon name="leads" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9c8e76]" />
                  <input
                    className={`${INPUT_CLASS} pl-11`}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search company, contact, email, or owner"
                  />
                </div>
              </label>

              <div className="mt-4 space-y-3">
                {paginatedRecords.length ? (
                  paginatedRecords.map((record) => {
                    const active = record.key === selectedKey;
                    return (
                      <button
                        key={record.key}
                        type="button"
                        className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                          active
                            ? "border-[#d7b258] bg-[#fff6e4] shadow-[0_12px_28px_rgba(203,169,82,0.14)]"
                            : "border-[#eadfcd] bg-[#fffaf1] hover:bg-white"
                        }`}
                        onClick={() => setSelectedKey(record.key)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <strong className="block text-base text-[#060710]">{record.title}</strong>
                            <p className="mt-1 text-sm text-[#6f614c]">{record.subtitle}</p>
                          </div>
                          <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                            {record.status}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#8f816a]">
                          <span>{titleCase(record.entity_type)}</span>
                          <span>{record.email || "No email on file"}</span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-14 text-center text-sm text-[#7a6b57]">
                    No records matched the current search.
                  </div>
                )}
              </div>
              {filteredRecords.length ? (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-3">
                  <span className="text-sm font-semibold text-[#7c6d55]">
                    {filteredRecords.length} total records
                  </span>
                  <div className="flex gap-2">
                    <button
                      className={GHOST_BUTTON_CLASS}
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                    <button
                      className={GHOST_BUTTON_CLASS}
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </aside>

            <div className="space-y-5">
              {selectedRecord ? (
                <>
                  <article className={PANEL_CLASS}>
                    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fff6e4] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                          {titleCase(selectedRecord.entity_type)}
                        </span>
                        <div>
                          <h3 className="text-2xl font-semibold tracking-tight text-[#060710]">{selectedRecord.subtitle}</h3>
                          <p className="mt-2 text-sm leading-7 text-[#746853]">{selectedRecord.title}</p>
                        </div>
                      </div>
                      <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                        {selectedRecord.status}
                      </span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {[
                        ["Email", selectedRecord.email || "Add an email before sending"],
                        ["Phone", selectedRecord.phone || "No phone on file"],
                        ["Context", selectedRecord.product],
                        ["Owner", selectedRecord.owner],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                          <span className={KICKER_CLASS}>{label}</span>
                          <strong className="mt-3 block text-sm leading-6 text-[#060710]">{value}</strong>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className={PANEL_CLASS}>
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <p className={KICKER_CLASS}>Templates</p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Email direction</h3>
                      </div>
                      <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                        {templates.length} options
                      </span>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-3">
                      {templates.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          className={`rounded-[22px] border px-4 py-4 text-left transition ${
                            selectedTemplateId === template.id
                              ? "border-[#d7b258] bg-[#fff6e4] shadow-[0_12px_28px_rgba(203,169,82,0.14)]"
                              : "border-[#eadfcd] bg-[#fffaf1] hover:bg-white"
                          }`}
                          onClick={() => {
                            setSelectedTemplateId(template.id);
                            setSubject(template.subject);
                            setBody(template.body);
                          }}
                        >
                          <strong className="block text-base text-[#060710]">{template.name}</strong>
                          <span className="mt-2 block text-sm leading-6 text-[#746853]">{template.subject}</span>
                        </button>
                      ))}
                    </div>
                  </article>

                  <article className={PANEL_CLASS}>
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <p className={KICKER_CLASS}>Compose</p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Send email from CRM</h3>
                      </div>
                      <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                        {titleCase(selectedRecord.entity_type)} sync
                      </span>
                    </div>

                    <div className="grid gap-4">
                      <label className="grid gap-2">
                        <span className={KICKER_CLASS}>Recipient</span>
                        <input
                          className={INPUT_CLASS}
                          type="email"
                          value={recipient}
                          onChange={(event) => setRecipient(event.target.value)}
                          placeholder="recipient@company.com"
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className={KICKER_CLASS}>Subject</span>
                        <input
                          className={INPUT_CLASS}
                          value={subject}
                          onChange={(event) => setSubject(event.target.value)}
                          placeholder="Email subject"
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className={KICKER_CLASS}>Message</span>
                        <textarea
                          className={`${INPUT_CLASS} min-h-[280px] resize-y`}
                          rows="12"
                          value={body}
                          onChange={(event) => setBody(event.target.value)}
                          placeholder="Write the email body"
                        />
                      </label>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button className={GHOST_BUTTON_CLASS} type="button" onClick={handleCopyDraft}>
                        <DashboardIcon name="documents" className="h-4 w-4" />
                        {copyState === "copied" ? "Copied" : "Copy Draft"}
                      </button>
                      <button
                        className={PRIMARY_BUTTON_CLASS}
                        type="button"
                        onClick={handleSendEmail}
                        disabled={sending}
                      >
                        <DashboardIcon name="message" className="h-4 w-4" />
                        {sending ? "Sending..." : "Send Email"}
                      </button>
                    </div>
                  </article>
                </>
              ) : (
                <article className={`${PANEL_CLASS} grid min-h-[420px] place-items-center text-center`}>
                  <div className="space-y-4">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-[20px] bg-[#fff6e4] text-[#8d6e27] shadow-[0_12px_24px_rgba(79,58,22,0.08)]">
                      <DashboardIcon name="message" className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-semibold tracking-tight text-[#060710]">Select a lead or customer to start drafting</h3>
                      <p className="max-w-xl text-sm leading-7 text-[#746853]">
                        The composer and template desk will populate once a record is selected from the directory.
                      </p>
                    </div>
                  </div>
                </article>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </DashboardShell>
  );
}
