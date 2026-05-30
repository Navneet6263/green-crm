import { GHOST_BUTTON_CLASS, INPUT_CLASS, KICKER_CLASS } from "./constants";
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

export default function SMTPConfigSection({ draft, setDraft, testing, onSendTestEmail }) {
  const hasSmtp = draft.smtp_host && draft.smtp_user;
  
  return (
    <CollapsibleSection 
      title="SMTP Configuration" 
      subtitle="Email delivery routing and sender identity"
      defaultOpen={false}
      badge={hasSmtp ? "Configured" : "Not Set"}
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field 
            label="SMTP Host" 
            value={draft.smtp_host} 
            onChange={(value) => setDraft((c) => ({ ...c, smtp_host: value }))} 
            placeholder="smtp.gmail.com" 
          />
          <Field 
            label="SMTP Port" 
            value={draft.smtp_port} 
            onChange={(value) => setDraft((c) => ({ ...c, smtp_port: value }))} 
            placeholder="587" 
          />
          <Field 
            label="SMTP User" 
            value={draft.smtp_user} 
            onChange={(value) => setDraft((c) => ({ ...c, smtp_user: value }))} 
            placeholder="crm@company.com" 
          />
          <Field 
            label="SMTP Password" 
            value={draft.smtp_password} 
            onChange={(value) => setDraft((c) => ({ ...c, smtp_password: value }))} 
            placeholder="Leave blank to keep current" 
            type="password" 
          />
          <Field 
            label="From Email" 
            value={draft.smtp_from_email} 
            onChange={(value) => setDraft((c) => ({ ...c, smtp_from_email: value }))} 
            placeholder="crm@company.com" 
          />
          <Field 
            label="From Name" 
            value={draft.smtp_from_name} 
            onChange={(value) => setDraft((c) => ({ ...c, smtp_from_name: value }))} 
            placeholder="Company CRM" 
          />
          <Field 
            label="Reply To" 
            value={draft.smtp_reply_to} 
            onChange={(value) => setDraft((c) => ({ ...c, smtp_reply_to: value }))} 
            placeholder="support@company.com" 
            full 
          />
        </div>

        <div className="rounded-[18px] border border-[#eadfcd] bg-[#fffaf1] p-4">
          <p className={KICKER_CLASS}>Test Email Delivery</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <input 
              className={`${INPUT_CLASS} flex-1 min-w-[240px]`}
              value={draft.test_email_to} 
              onChange={(e) => setDraft((c) => ({ ...c, test_email_to: e.target.value }))} 
              placeholder="test@company.com" 
            />
            <button 
              className={GHOST_BUTTON_CLASS} 
              type="button" 
              onClick={onSendTestEmail} 
              disabled={testing || !draft.test_email_to.trim()}
            >
              {testing ? "Sending..." : "Send Test"}
            </button>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}
