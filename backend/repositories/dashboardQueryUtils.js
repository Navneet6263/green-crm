const { getIndiaDayStartUtc } = require('../utils/indiaDateBuckets');

function buildAdvancedFilterScope(query = {}, tablePrefix = "") {
  const params = [];
  const clauses = [];
  const prefix = tablePrefix ? `${tablePrefix}.` : "";

  if (query.from_date) {
    clauses.push(`${prefix}created_at >= ?`);
    const fromDate = new Date(`${query.from_date}T00:00:00Z`);
    const fromStartUtc = getIndiaDayStartUtc(new Date(fromDate.getTime() - 330 * 60 * 1000));
    params.push(fromStartUtc);
  }

  if (query.to_date) {
    clauses.push(`${prefix}created_at < ?`);
    const toDate = new Date(`${query.to_date}T00:00:00Z`);
    const toStartUtc = getIndiaDayStartUtc(new Date(toDate.getTime() - 330 * 60 * 1000));
    // Add 1 day to make it exclusive
    const toEndUtc = new Date(toStartUtc.getTime() + 24 * 60 * 60 * 1000);
    params.push(toEndUtc);
  }

  if (query.status) {
    clauses.push(`${prefix}status = ?`);
    params.push(query.status);
  }

  if (query.priority) {
    clauses.push(`${prefix}priority = ?`);
    params.push(query.priority);
  }

  if (query.lead_source) {
    clauses.push(`${prefix}lead_source = ?`);
    params.push(query.lead_source);
  }

  if (query.product_id) {
    clauses.push(`${prefix}product_id = ?`);
    params.push(query.product_id);
  }

  if (query.assigned_to) {
    clauses.push(`${prefix}assigned_to = ?`);
    params.push(query.assigned_to);
  }

  if (clauses.length === 0) {
    return { clause: "", params: [] };
  }

  return {
    clause: " AND " + clauses.join(" AND "),
    params,
  };
}

module.exports = { buildAdvancedFilterScope };
