// Turns whatever a website form, Zapier/Make/Pabbly, Facebook Lead Ads, Google Ads lead forms
// or IndiaMART sends into one lead: name, email, phone, company, city, message and extra details.

const FIELD_NAMES = {
  name: ["name", "fullname", "yourname", "contactperson", "contactname", "customername", "clientname", "sendername"],
  first_name: ["firstname", "fname", "givenname"],
  last_name: ["lastname", "lname", "surname", "familyname"],
  email: ["email", "emailaddress", "youremail", "mail", "emailid", "workemail", "senderemail"],
  phone: ["phone", "phonenumber", "mobile", "mobilenumber", "mobileno", "contactnumber", "contactno", "tel", "telephone", "whatsapp", "whatsappnumber", "yourphone", "sendermobile", "senderphone"],
  company: ["company", "companyname", "organisation", "organization", "business", "businessname", "firm", "sendercompany"],
  city: ["city", "location", "yourcity", "sendercity"],
  state: ["state", "region", "senderstate"],
  country: ["country", "countryiso", "sendercountryiso"],
  message: ["message", "yourmessage", "comments", "comment", "requirement", "requirements", "enquiry", "inquiry", "query", "querymessage", "description", "notes", "details", "subject"],
};
const LOOKUP = Object.entries(FIELD_NAMES).reduce((map, [field, names]) => {
  names.forEach((name) => map.set(name, field));
  return map;
}, new Map());
// Google Ads lead form column ids.
const GOOGLE_COLUMNS = {
  FULL_NAME: "name", FIRST_NAME: "first_name", LAST_NAME: "last_name", EMAIL: "email", WORK_EMAIL: "email",
  PHONE_NUMBER: "phone", WORK_PHONE: "phone", COMPANY_NAME: "company", CITY: "city", REGION: "state", COUNTRY: "country",
};
// Form settings and spam traps, never saved on the lead.
const IGNORED = new Set(["redirect", "next", "gotcha", "honey", "honeypot", "googlekey", "apiversion", "formid", "token", "istest"]);
const SPAM_TRAPS = ["_gotcha", "_honey", "_honeypot"];

const keyOf = (name) => String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const clean = (value, max = 500) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** 10-digit Indian numbers lose +91 / 0; other numbers keep their digits and a leading +. */
function normalizePhone(value) {
  const text = String(value || "").trim();
  const digits = text.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length === 10) return digits;
  return text.startsWith("+") ? `+${digits}` : digits;
}

function flatten(body) {
  const entries = [];
  const source = body && typeof body === "object" ? body : {};
  // IndiaMART push wraps the enquiry in RESPONSE.
  const root = source.RESPONSE && typeof source.RESPONSE === "object" ? { ...source, ...source.RESPONSE } : source;

  if (Array.isArray(root.user_column_data)) {
    root.user_column_data.forEach((column) => {
      const field = GOOGLE_COLUMNS[String(column.column_id || "").toUpperCase()];
      entries.push([field || column.column_name || column.column_id, column.string_value, Boolean(field)]);
    });
  }
  if (Array.isArray(root.field_data)) {
    root.field_data.forEach((item) => entries.push([item.name, Array.isArray(item.values) ? item.values.join(", ") : item.values, false]));
  }
  Object.entries(root).forEach(([key, value]) => {
    if (["RESPONSE", "user_column_data", "field_data"].includes(key)) return;
    if (value === null || value === undefined || typeof value === "object") return;
    entries.push([key, value, false]);
  });
  return entries;
}

function parseLead(body = {}) {
  const lead = { name: "", first_name: "", last_name: "", email: "", phone: "", company: "", city: "", state: "", country: "", message: "" };
  const extras = [];

  flatten(body).forEach(([rawKey, rawValue, known]) => {
    const value = clean(rawValue, 2000);
    if (!value) return;
    const key = keyOf(rawKey);
    if (!key || IGNORED.has(key) || String(rawKey).startsWith("_")) return;
    const field = known ? rawKey : LOOKUP.get(key);
    if (field && !lead[field]) lead[field] = field === "message" ? value : clean(value, 191);
    else if (field === "message") lead.message = `${lead.message}\n${value}`;
    else if (!field && extras.length < 30) extras.push([clean(rawKey, 60), clean(value, 300)]);
  });

  const name = lead.name || [lead.first_name, lead.last_name].filter(Boolean).join(" ");
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email) ? lead.email.toLowerCase() : "";
  if (lead.email && !email) extras.push(["email (not valid)", lead.email]);
  return {
    name: clean(name, 191),
    email,
    phone: normalizePhone(lead.phone),
    company: lead.company,
    city: lead.city,
    state: lead.state,
    country: lead.country,
    message: lead.message.slice(0, 2000),
    extras,
    isTest: body?.is_test === true || String(body?.is_test || "").toLowerCase() === "true",
  };
}

function isSpam(body = {}) {
  return SPAM_TRAPS.some((key) => clean(body?.[key]));
}

/** Text saved as the lead's requirements: the message, then every other detail they sent. */
function requirementsText(parsed, formName) {
  const lines = [];
  if (parsed.message) lines.push(parsed.message);
  if (parsed.extras.length) {
    lines.push("", "Other details:");
    parsed.extras.forEach(([key, value]) => lines.push(`${key}: ${value}`));
  }
  lines.push("", `Came in through: ${formName}`);
  return lines.join("\n").trim().slice(0, 4000);
}

module.exports = { isSpam, normalizePhone, parseLead, requirementsText };
