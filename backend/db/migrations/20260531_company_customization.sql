-- Company Customization Settings
-- Stores company-specific UI and field customizations

-- Add customization column to companies table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'companies') AND name = 'customization_settings')
BEGIN
    ALTER TABLE companies
    ADD customization_settings NVARCHAR(MAX) NULL;
END
GO

-- Sample customization structure (stored as JSON):
-- {
--   "lead_statuses": ["new", "contacted", "qualified", "closed-won", "closed-lost"],
--   "lead_form_fields": {
--     "contact_person": { "enabled": true, "required": true, "label": "Contact Person" },
--     "company_name": { "enabled": true, "required": true, "label": "Company Name" },
--     "email": { "enabled": true, "required": false, "label": "Email" },
--     "phone": { "enabled": true, "required": true, "label": "Phone" },
--     "lead_source": { "enabled": true, "required": false, "label": "Lead Source" },
--     "number_of_units": { "enabled": true, "required": false, "label": "Number of Units" },
--     "budget": { "enabled": true, "required": false, "label": "Budget" },
--     "notes": { "enabled": true, "required": false, "label": "Notes" }
--   },
--   "custom_fields": [
--     { "id": "cf_1", "name": "Industry", "type": "text", "required": false },
--     { "id": "cf_2", "name": "Company Size", "type": "select", "options": ["1-10", "11-50", "51-200", "200+"], "required": false }
--   ]
-- }
