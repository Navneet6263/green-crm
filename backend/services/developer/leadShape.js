// The /api/v1 lead shape. Field names stay the same even if the CRM's own screens change.
function publicLead(row) {
  if (!row) return null;
  return {
    id: row.lead_id,
    contact_person: row.contact_person,
    company_name: row.company_name,
    email: row.email || null,
    phone: row.phone || null,
    city: row.address_city || null,
    state: row.address_state || null,
    country: row.address_country || null,
    industry: row.industry || null,
    source: row.lead_source || null,
    status: row.status,
    priority: row.priority,
    product_id: row.product_id || null,
    product_name: row.product_name || null,
    owner_id: row.assigned_to || null,
    owner_name: row.assigned_to_name || null,
    estimated_value: row.estimated_value === null || row.estimated_value === undefined ? null : Number(row.estimated_value),
    follow_up_date: row.follow_up_date || null,
    requirements: row.requirements || null,
    created_at: row.created_at,
    updated_at: row.updated_at || null,
  };
}

module.exports = { publicLead };
