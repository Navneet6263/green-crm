import { useEffect, useState } from "react";
import { apiRequest } from "./api";

export function useCustomization(token) {
  const [customization, setCustomization] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    async function loadCustomization() {
      try {
        const data = await apiRequest("/customization", { token });
        setCustomization(data);
      } catch (error) {
        console.error("Failed to load customization:", error);
        // Set default if API fails
        setCustomization(getDefaultCustomization());
      } finally {
        setLoading(false);
      }
    }

    loadCustomization();
  }, [token]);

  return { customization, loading };
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
