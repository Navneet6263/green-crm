import { GHOST_BUTTON_CLASS, INPUT_CLASS, KICKER_CLASS, PANEL_CLASS, PRIMARY_BUTTON_CLASS } from "./constants";

function Field({ label, value, onChange, placeholder = "", type = "text", full = false }) {
  return (
    <label className={full ? "space-y-2 md:col-span-2" : "space-y-2"}>
      <span className={KICKER_CLASS}>{label}</span>
      <input className={INPUT_CLASS} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

export default function CompanySettingsForm({ draft, setDraft, saving, testing, onSubmit, onSendTestEmail }) {
  return (
    <form className={`${PANEL_CLASS} space-y-5`} onSubmit={onSubmit}>
      <div>
        <p className={KICKER_CLASS}>Company Profile</p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Tenant identity</h3>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} />
        <Field label="Contact Email" value={draft.contact_email} onChange={(value) => setDraft((current) => ({ ...current, contact_email: value }))} />
        <Field label="Admin Email" value={draft.admin_email} onChange={(value) => setDraft((current) => ({ ...current, admin_email: value }))} />
        <Field label="Contact Phone" value={draft.contact_phone} onChange={(value) => setDraft((current) => ({ ...current, contact_phone: value }))} />
        <Field label="Industry" value={draft.industry} onChange={(value) => setDraft((current) => ({ ...current, industry: value }))} />
        <Field label="Website" value={draft.website} onChange={(value) => setDraft((current) => ({ ...current, website: value }))} />
        <Field label="Currency" value={draft.settings_currency} onChange={(value) => setDraft((current) => ({ ...current, settings_currency: value }))} />
        <Field label="Timezone" value={draft.settings_timezone} onChange={(value) => setDraft((current) => ({ ...current, settings_timezone: value }))} />
        <Field label="Country" value={draft.country} onChange={(value) => setDraft((current) => ({ ...current, country: value }))} full />
      </div>

      <div>
        <p className={KICKER_CLASS}>SMTP & Sender Identity</p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Delivery routing</h3>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="SMTP Host" value={draft.smtp_host} onChange={(value) => setDraft((current) => ({ ...current, smtp_host: value }))} placeholder="smtp.gmail.com" />
        <Field label="SMTP Port" value={draft.smtp_port} onChange={(value) => setDraft((current) => ({ ...current, smtp_port: value }))} placeholder="587" />
        <Field label="SMTP User" value={draft.smtp_user} onChange={(value) => setDraft((current) => ({ ...current, smtp_user: value }))} placeholder="crm@company.com" />
        <Field label="SMTP Password" value={draft.smtp_password} onChange={(value) => setDraft((current) => ({ ...current, smtp_password: value }))} placeholder="Leave blank to keep current password" type="password" />
        <Field label="From Email" value={draft.smtp_from_email} onChange={(value) => setDraft((current) => ({ ...current, smtp_from_email: value }))} placeholder="crm@company.com" />
        <Field label="From Name" value={draft.smtp_from_name} onChange={(value) => setDraft((current) => ({ ...current, smtp_from_name: value }))} placeholder="Company CRM" />
        <Field label="Reply To" value={draft.smtp_reply_to} onChange={(value) => setDraft((current) => ({ ...current, smtp_reply_to: value }))} placeholder="support@company.com" full />
        <Field label="Test Email To" value={draft.test_email_to} onChange={(value) => setDraft((current) => ({ ...current, test_email_to: value }))} placeholder="ops@company.com" full />
      </div>

      <div>
        <p className={KICKER_CLASS}>Invite & Reset Copy</p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Auth delivery text</h3>
      </div>
      <div className="grid gap-4">
        <Field label="Login URL" value={draft.login_url} onChange={(value) => setDraft((current) => ({ ...current, login_url: value }))} placeholder="https://crm.greencall.in/login" />
        <Field label="Credential Subject" value={draft.credentials_subject} onChange={(value) => setDraft((current) => ({ ...current, credentials_subject: value }))} placeholder="Welcome to GreenCRM" />
        <Field label="Credential Heading" value={draft.credentials_heading} onChange={(value) => setDraft((current) => ({ ...current, credentials_heading: value }))} placeholder="Your account is ready" />
        <Field label="Password Reset Subject" value={draft.reset_subject} onChange={(value) => setDraft((current) => ({ ...current, reset_subject: value }))} placeholder="Reset your workspace password" />
        <label className="space-y-2">
          <span className={KICKER_CLASS}>Credential Note</span>
          <textarea className={`${INPUT_CLASS} min-h-[130px] resize-y`} value={draft.credentials_note} onChange={(event) => setDraft((current) => ({ ...current, credentials_note: event.target.value }))} rows={4} placeholder="Please sign in and change this temporary password immediately." />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={saving}>{saving ? "Saving..." : "Save Company Settings"}</button>
        <button className={GHOST_BUTTON_CLASS} type="button" onClick={onSendTestEmail} disabled={testing || !draft.test_email_to.trim()}>{testing ? "Sending Test..." : "Send Test Email"}</button>
      </div>
    </form>
  );
}
