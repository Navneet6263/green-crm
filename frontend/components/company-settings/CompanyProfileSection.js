import { INPUT_CLASS, KICKER_CLASS } from "./constants";
import CollapsibleSection from "./CollapsibleSection";

function Field({ label, value, onChange, placeholder = "", type = "text", full = false }) {
  return (
    <label className={full ? "space-y-2 md:col-span-2" : "space-y-2"}>
      <span className={KICKER_CLASS}>{label}</span>
      <input 
        className={INPUT_CLASS} 
        type={type} 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder} 
      />
    </label>
  );
}

export default function CompanyProfileSection({ draft, setDraft }) {
  return (
    <CollapsibleSection 
      title="Company Profile" 
      subtitle="Basic tenant identity and contact information"
      defaultOpen={true}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field 
          label="Company Name" 
          value={draft.name} 
          onChange={(value) => setDraft((c) => ({ ...c, name: value }))} 
        />
        <Field 
          label="Contact Email" 
          value={draft.contact_email} 
          onChange={(value) => setDraft((c) => ({ ...c, contact_email: value }))} 
        />
        <Field 
          label="Admin Email" 
          value={draft.admin_email} 
          onChange={(value) => setDraft((c) => ({ ...c, admin_email: value }))} 
        />
        <Field 
          label="Contact Phone" 
          value={draft.contact_phone} 
          onChange={(value) => setDraft((c) => ({ ...c, contact_phone: value }))} 
        />
        <Field 
          label="Industry" 
          value={draft.industry} 
          onChange={(value) => setDraft((c) => ({ ...c, industry: value }))} 
        />
        <Field 
          label="Website" 
          value={draft.website} 
          onChange={(value) => setDraft((c) => ({ ...c, website: value }))} 
        />
        <Field 
          label="Currency" 
          value={draft.settings_currency} 
          onChange={(value) => setDraft((c) => ({ ...c, settings_currency: value }))} 
        />
        <Field 
          label="Timezone" 
          value={draft.settings_timezone} 
          onChange={(value) => setDraft((c) => ({ ...c, settings_timezone: value }))} 
        />
        <Field 
          label="Country" 
          value={draft.country} 
          onChange={(value) => setDraft((c) => ({ ...c, country: value }))} 
          full 
        />
      </div>
    </CollapsibleSection>
  );
}
