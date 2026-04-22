export function titleCase(value) {
  return String(value || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildEntityRecords(leads = [], customers = []) {
  const leadRecords = leads.map((lead) => ({
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
  }));

  const customerRecords = customers.map((customer) => ({
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
  }));

  return [...leadRecords, ...customerRecords];
}

export function buildTemplates(record) {
  const contact = record?.subtitle || "[Contact name]";
  const company = record?.title || "[Company name]";
  const sender = "[Your name]";

  if (record?.entity_type === "customer") {
    return [
      { id: "account-check-in", name: "Account Check-in", subject: `Quick check-in for ${company}`, body: `Hello ${contact},\n\nChecking in on your current priorities for ${company}.\n\nIf there is anything pending from our side, please reply here and I will coordinate the next step immediately.\n\nRegards,\n${sender}` },
      { id: "renewal", name: "Renewal / Upsell", subject: `Next growth step for ${company}`, body: `Hello ${contact},\n\nWe wanted to share the next recommended step for ${company} based on the current usage and support history.\n\nIf helpful, I can send a short summary with the most relevant improvements and rollout options.\n\nRegards,\n${sender}` },
      { id: "support-follow-up", name: "Support Follow-up", subject: `Following up on the latest request from ${company}`, body: `Hello ${contact},\n\nFollowing up on the recent activity from ${company}.\n\nPlease let me know if the last update resolved the issue or if you want us to continue with the next action from our side.\n\nRegards,\n${sender}` },
    ];
  }

  const product = record?.product && record.product !== "No product tagged" ? record.product : "our CRM workspace";
  return [
    { id: "intro", name: "Introduction", subject: `A practical CRM workflow for ${company}`, body: `Hello ${contact},\n\nI am reaching out from GreenCRM regarding a more structured way to manage leads, follow-ups, and customer handoffs inside ${company}.\n\nWe have been helping teams improve response time, keep ownership clear, and reduce missed follow-ups without adding extra process overhead.\n\nIf you are open to it, I can share a short overview of how ${product} can fit your current workflow.\n\nRegards,\n${sender}` },
    { id: "follow-up", name: "Follow-up", subject: `Following up with ${company}`, body: `Hello ${contact},\n\nFollowing up on my earlier note regarding ${company}.\n\nIf this is still relevant, I can send a concise walkthrough or arrange a short discussion this week.\n\nRegards,\n${sender}` },
    { id: "proposal", name: "Proposal", subject: `Working proposal for ${company}`, body: `Hello ${contact},\n\nI have prepared a working proposal for ${company} based on the current requirements we discussed.\n\nIf useful, I can walk you through the scope, rollout approach, and expected outcomes in a short review call.\n\nRegards,\n${sender}` },
  ];
}

export function buildPhoneDraft(record) {
  if (!record) {
    return "";
  }

  return record.entity_type === "customer"
    ? `Hello ${record.subtitle}, checking in from GreenCRM regarding ${record.title}.`
    : `Hello ${record.subtitle}, following up regarding ${record.title}.`;
}

export async function loadRequestedEntity(type, id, token, apiRequest) {
  if (!type || !id) {
    return null;
  }

  const path = type === "customer" ? `/customers/${id}` : `/leads/${id}`;
  return apiRequest(path, { token });
}

export function mergeUpdatedEntity(items, entityType, entity) {
  const key = entityType === "lead" ? "lead_id" : "customer_id";
  return items.map((item) => (item[key] === entity[key] ? { ...item, ...entity } : item));
}
