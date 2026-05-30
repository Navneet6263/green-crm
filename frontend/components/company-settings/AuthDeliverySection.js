import { INPUT_CLASS, KICKER_CLASS } from "./constants";
import CollapsibleSection from "./CollapsibleSection";

function Field({ label, value, onChange, placeholder = "", type = "text" }) {
  return (
    <label className="space-y-2">
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

export default function AuthDeliverySection({ draft, setDraft }) {
  const hasCustomText = draft.credentials_subject || draft.credentials_heading || draft.reset_subject;
  
  return (
    <CollapsibleSection 
      title="Auth Delivery Text" 
      subtitle="Customize invite and password reset email content"
      defaultOpen={false}
      badge={hasCustomText ? "Customized" : "Default"}
    >
      <div className="grid gap-4">
        <Field 
          label="Login URL" 
          value={draft.login_url} 
          onChange={(value) => setDraft((c) => ({ ...c, login_url: value }))} 
          placeholder="https://crm.company.com/login" 
        />
        <Field 
          label="Credential Email Subject" 
          value={draft.credentials_subject} 
          onChange={(value) => setDraft((c) => ({ ...c, credentials_subject: value }))} 
          placeholder="Welcome to GreenCRM" 
        />
        <Field 
          label="Credential Email Heading" 
          value={draft.credentials_heading} 
          onChange={(value) => setDraft((c) => ({ ...c, credentials_heading: value }))} 
          placeholder="Your account is ready" 
        />
        <Field 
          label="Password Reset Subject" 
          value={draft.reset_subject} 
          onChange={(value) => setDraft((c) => ({ ...c, reset_subject: value }))} 
          placeholder="Reset your workspace password" 
        />
        <label className="space-y-2">
          <span className={KICKER_CLASS}>Credential Note</span>
          <textarea 
            className={`${INPUT_CLASS} min-h-[100px] resize-y`} 
            value={draft.credentials_note} 
            onChange={(e) => setDraft((c) => ({ ...c, credentials_note: e.target.value }))} 
            rows={3} 
            placeholder="Please sign in and change this temporary password immediately." 
          />
        </label>
      </div>
    </CollapsibleSection>
  );
}
