"use client";

import { LEADS_PAGE_SIZE } from "./leadPageConstants";

export function normalizeLeadMeta(meta = {}, pageNumber = 1) {
  return {
    page: Number(meta.page || pageNumber || 1),
    page_size: Number(meta.page_size || LEADS_PAGE_SIZE),
    total: Number(meta.total || 0),
    total_pages: Math.max(Number(meta.total_pages || 1), 1),
    workflow_summary: meta.workflow_summary || null,
    total_value: meta.total_value,
    total_closed_won: meta.total_closed_won,
    total_advance_received: meta.total_advance_received,
  };
}

export function mapProductOptions(productStats = []) {
  return (Array.isArray(productStats) ? productStats : [])
    .map((item) => ({
      value: item.product_id,
      label: item.name || "Unnamed Product",
      count: Number(item.total_leads || 0),
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function buildLeadProductPool(leads = [], productOptions = []) {
  if (productOptions.length) {
    return productOptions;
  }

  const map = new Map();

  leads.forEach((lead) => {
    const key = lead.product_id || lead.product_name;
    if (!key) {
      return;
    }

    const current = map.get(key) || {
      value: key,
      label: lead.product_name || "Unnamed Product",
      count: 0,
    };

    current.count += 1;
    map.set(key, current);
  });

  return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function updateLeadCollections(collection = [], updatedLead = {}) {
  return collection.map((lead) => (lead.lead_id === updatedLead.lead_id ? { ...lead, ...updatedLead } : lead));
}

export function applyOwnerToLeadCollections(collection = [], leadIds = [], nextOwner = "", label = "") {
  return collection.map((lead) =>
    leadIds.includes(lead.lead_id)
      ? { ...lead, assigned_to: nextOwner, assigned_to_name: label }
      : lead
  );
}

export function removeLeadFromCollection(collection = [], leadId = "") {
  return collection.filter((lead) => lead.lead_id !== leadId);
}
