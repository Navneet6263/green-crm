"use client";

import { formatIndiaDateTime } from "../../../lib/dateTime";

export function buildQueryPath(path, params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      query.set(key, value);
    }
  });

  const search = query.toString();
  return search ? `${path}?${search}` : path;
}

export function formatLeadMoney(value) {
  return `INR ${Number(value || 0).toLocaleString("en-IN")}`;
}

export function titleizeLeadValue(value) {
  return String(value || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatLeadDate(value, withTime = false) {
  return formatIndiaDateTime(value, withTime);
}

export function cleanLeadText(value = "") {
  return String(value || "").trim();
}

export function hasLetters(value = "") {
  return /[A-Za-z]/.test(cleanLeadText(value));
}

export function leadInitials(...values) {
  const source =
    values.map(cleanLeadText).find((value) => value && hasLetters(value)) ||
    values.map(cleanLeadText).find(Boolean) ||
    "Lead";

  return source
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export function leadPrimaryName(lead = {}) {
  const contact = cleanLeadText(lead.contact_person);
  const company = cleanLeadText(lead.company_name);

  if (contact && hasLetters(contact)) {
    return contact;
  }

  if (company) {
    return company;
  }

  return contact || "Lead";
}

export function leadSecondaryName(lead = {}) {
  const contact = cleanLeadText(lead.contact_person);
  const company = cleanLeadText(lead.company_name);

  if (contact && hasLetters(contact) && company && company !== contact) {
    return company;
  }

  if ((!contact || !hasLetters(contact)) && company && contact && company !== contact) {
    return contact;
  }

  return "";
}

export function formatLeadLocation(lead = {}) {
  return [lead.address_city, lead.address_state, lead.address_country].filter(Boolean).join(", ");
}
