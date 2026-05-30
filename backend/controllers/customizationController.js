const customizationRepository = require("../repositories/customizationRepository");

async function getCustomization(req, res, next) {
  try {
    console.log("🔍 GET /customization called");
    console.log("Auth:", req.auth);
    
    const companyId = req.auth.companyId;
    console.log("Company ID:", companyId);
    
    const settings = await customizationRepository.getCustomization(companyId);
    console.log("Settings loaded:", settings ? "✅" : "❌");
    
    res.json(settings);
  } catch (error) {
    console.error("❌ Error in getCustomization:", error);
    next(error);
  }
}

async function updateCustomization(req, res, next) {
  try {
    console.log("🔍 PUT /customization called");
    
    const companyId = req.auth.companyId;
    const { lead_statuses, lead_form_fields, custom_fields } = req.body;

    // Validate lead_statuses
    if (lead_statuses && !Array.isArray(lead_statuses)) {
      return res.status(400).json({ error: "lead_statuses must be an array" });
    }

    // Validate lead_form_fields
    if (lead_form_fields && typeof lead_form_fields !== "object") {
      return res.status(400).json({ error: "lead_form_fields must be an object" });
    }

    // Validate custom_fields
    if (custom_fields && !Array.isArray(custom_fields)) {
      return res.status(400).json({ error: "custom_fields must be an array" });
    }

    const settings = await customizationRepository.updateCustomization(companyId, {
      lead_statuses: lead_statuses || [],
      lead_form_fields: lead_form_fields || {},
      custom_fields: custom_fields || [],
    });

    console.log("Settings saved:", settings ? "✅" : "❌");
    res.json(settings);
  } catch (error) {
    console.error("❌ Error in updateCustomization:", error);
    next(error);
  }
}

module.exports = {
  getCustomization,
  updateCustomization,
};
