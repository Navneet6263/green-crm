const db = require("../db/connection");

async function getCustomization(companyId) {
  try {
    const [rows] = await db.query(
      "SELECT customization_settings FROM companies WHERE company_id = ?",
      [companyId]
    );
    
    const row = rows[0];
    
    if (!row || !row.customization_settings) {
      return getDefaultCustomization();
    }
    
    try {
      return JSON.parse(row.customization_settings);
    } catch {
      return getDefaultCustomization();
    }
  } catch (error) {
    console.error("Error in getCustomization:", error);
    return getDefaultCustomization();
  }
}

async function updateCustomization(companyId, settings) {
  await db.query(
    "UPDATE companies SET customization_settings = ?, updated_at = CURRENT_TIMESTAMP WHERE company_id = ?",
    [JSON.stringify(settings), companyId]
  );
  return settings;
}

function getDefaultCustomization() {
  return {
    lead_statuses: [
      "new",
      "pending",
      "contacted",
      "qualified",
      "proposal",
      "negotiation",
      "booked-demo",
      "demo-done",
      "trial-started",
      "closed-won",
      "closed-lost",
    ],
    lead_form_fields: {
      contact_person: { enabled: true, required: true, label: "Contact Person" },
      company_name: { enabled: true, required: true, label: "Company Name" },
      email: { enabled: true, required: false, label: "Email" },
      phone: { enabled: true, required: true, label: "Phone" },
      lead_source: { enabled: true, required: false, label: "Lead Source" },
      number_of_units: { enabled: true, required: false, label: "Number of Units" },
      budget: { enabled: true, required: false, label: "Budget" },
      notes: { enabled: true, required: false, label: "Notes" },
      assigned_to: { enabled: true, required: false, label: "Assigned To" },
      product_id: { enabled: true, required: false, label: "Product" },
      team_id: { enabled: true, required: false, label: "Team" },
    },
    custom_fields: [],
  };
}

module.exports = {
  getCustomization,
  updateCustomization,
  getDefaultCustomization,
};
