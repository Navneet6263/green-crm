// CRM fields for bulk upload, and the column names we recognise for each in people's sheets.
export const IMPORT_FIELDS = [
  { key: "company_name", label: "Company", required: true, group: "Lead", names: ["company", "company name", "firm", "firm name", "business", "business name", "organisation", "organization", "account", "client", "party", "party name"] },
  { key: "contact_person", label: "Contact person", required: true, group: "Lead", names: ["contact", "contact person", "contact name", "name", "person", "customer", "customer name", "lead name", "full name", "owner name"] },
  { key: "phone", label: "Phone", group: "Lead", names: ["phone", "mobile", "mobile no", "mobile number", "phone number", "phone no", "contact no", "contact number", "number", "whatsapp", "cell"] },
  { key: "email", label: "Email", group: "Lead", names: ["email", "e-mail", "email id", "mail", "mail id", "email address"] },
  { key: "product", label: "Product", group: "Lead", names: ["product", "product name", "service", "product code", "product id", "product_id", "interested in"] },
  { key: "owner", label: "Owner", group: "Lead", names: ["owner", "assigned to", "assigned", "assignee", "sales person", "salesperson", "executive", "employee", "owner code", "assigned_to", "rm"] },
  { key: "lead_source", label: "Source", group: "Deal", names: ["source", "lead source", "lead_source", "channel", "from"] },
  { key: "priority", label: "Priority", group: "Deal", names: ["priority"] },
  { key: "estimated_value", label: "Lead value", group: "Deal", names: ["value", "lead value", "deal value", "estimated value", "estimated_value", "amount", "budget", "price"] },
  { key: "advance_received", label: "Advance received", group: "Deal", names: ["advance", "advance received", "advance_received", "received", "paid", "payment received"] },
  { key: "follow_up_date", label: "Follow-up date", group: "Deal", names: ["follow up", "follow-up", "followup", "follow up date", "follow-up date", "next follow up", "next follow-up", "follow_up_date", "next call"] },
  { key: "requirements", label: "Requirement", group: "Deal", names: ["requirement", "requirements", "note", "notes", "remark", "remarks", "comment", "comments", "description", "details"] },
  { key: "industry", label: "Industry", group: "More", names: ["industry", "sector", "category"] },
  { key: "no_of_employees", label: "Employees", group: "More", names: ["employees", "no of employees", "employee count", "staff", "team size", "no_of_employees"] },
  { key: "number_of_units", label: "Units", group: "More", names: ["units", "number of units", "no of units", "number_of_units", "quantity", "qty"] },
  { key: "address_street", label: "Address", group: "More", names: ["address", "street", "address line", "address_street"] },
  { key: "address_city", label: "City", group: "More", names: ["city", "town", "location", "address_city"] },
  { key: "address_state", label: "State", group: "More", names: ["state", "region", "address_state"] },
  { key: "address_zip", label: "Pincode", group: "More", names: ["pincode", "pin", "pin code", "zip", "postal code", "address_zip"] },
];

const clean = (value) => String(value || "").toLowerCase().replace(/[._]/g, " ").replace(/\s+/g, " ").trim();

/** Matches file columns to fields by name. Each column is used once; exact names win. */
export function autoMatchColumns(headers) {
  const map = {};
  const used = new Set();
  const take = (test) => {
    for (const field of IMPORT_FIELDS) {
      if (map[field.key] !== undefined) continue;
      const index = headers.findIndex((header, i) => !used.has(i) && test(clean(header), field));
      if (index >= 0) { map[field.key] = index; used.add(index); }
    }
  };
  take((header, field) => field.names.includes(header) || clean(field.label) === header);
  take((header, field) => field.names.filter((name) => name.length > 4).some((name) => header.includes(name)));
  return map;
}

export const cleanPhone = (value) => String(value || "").replace(/^'/, "").replace(/\.0+$/, "").replace(/[\s\-()]/g, "");
const number = (value) => String(value || "").replace(/[₹,\s]|rs\.?|inr/gi, "");

function findByName(list, value, ...keys) {
  const wanted = clean(value);
  return wanted ? list.find((item) => keys.some((key) => clean(item[key]) === wanted)) : null;
}

/**
 * Turns one file row into an upload row. Returns { row, errors } using the file's own row number.
 * defaults: { team_id, product_id, assigned_to, lead_source }
 */
export function buildImportRow(cells, index, map, { products, users, defaults }) {
  const get = (key) => (map[key] === undefined || map[key] === "" ? "" : String(cells[map[key]] ?? "").trim());
  const errors = [];
  const company = get("company_name");
  const contact = get("contact_person");

  let productId = defaults.product_id || "";
  const productValue = get("product");
  if (productValue) {
    const product = findByName(products, productValue, "name", "product_id", "code");
    if (product) productId = product.product_id;
    else if (!productId) errors.push(`Product "${productValue}" not found`);
  }

  let owner = defaults.assigned_to || "";
  const ownerValue = get("owner");
  if (ownerValue) {
    const user = findByName(users, ownerValue, "name", "email", "user_id");
    if (user) owner = user.user_id;
    else if (!owner) errors.push(`Owner "${ownerValue}" not found`);
  }

  const priority = clean(get("priority"));
  const row = {
    __row_number: index + 2,
    contact_person: contact || company,
    company_name: company || contact,
    phone: cleanPhone(get("phone")),
    email: get("email"),
    product_id: productId,
    team_id: defaults.team_id || "",
    assigned_to: owner,
    lead_source: clean(get("lead_source")).replace(/ /g, "-") || defaults.lead_source || "other",
    priority: priority === "urgent" ? "high" : ["low", "medium", "high"].includes(priority) ? priority : "medium",
    estimated_value: number(get("estimated_value")),
    advance_received: number(get("advance_received")),
    follow_up_date: get("follow_up_date"),
    requirements: get("requirements"),
    industry: get("industry"),
    no_of_employees: get("no_of_employees"),
    number_of_units: number(get("number_of_units")),
    address_street: get("address_street"),
    address_city: get("address_city"),
    address_state: get("address_state"),
    address_zip: get("address_zip"),
  };
  if (!row.company_name) errors.push("Company or contact name is missing");
  if (!row.phone && !row.email) errors.push("Phone or email is missing");
  if (!row.product_id && !errors.some((e) => e.startsWith("Product"))) errors.push("Product is missing");
  if (row.phone && (row.phone.replace(/\D/g, "").length < 7 || row.phone.replace(/\D/g, "").length > 15)) errors.push("Phone must have 7 to 15 digits");
  if (row.email && !/\S+@\S+\.\S+/.test(row.email)) errors.push("Email looks wrong");
  return { row, errors };
}

export function toCsv(headers, rows) {
  const cell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return `﻿${[headers.map(cell).join(","), ...rows.map((row) => row.map(cell).join(","))].join("\r\n")}`;
}
