import { PANEL_CLASS, PRIMARY_BUTTON_CLASS } from "./constants";
import CompanyProfileSection from "./CompanyProfileSection";
import SMTPConfigSection from "./SMTPConfigSection";
import AuthDeliverySection from "./AuthDeliverySection";

export default function CompactCompanySettingsForm({ 
  draft, 
  setDraft, 
  saving, 
  testing, 
  onSubmit, 
  onSendTestEmail 
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <CompanyProfileSection draft={draft} setDraft={setDraft} />
      <SMTPConfigSection 
        draft={draft} 
        setDraft={setDraft} 
        testing={testing} 
        onSendTestEmail={onSendTestEmail} 
      />
      <AuthDeliverySection draft={draft} setDraft={setDraft} />
      
      <div className={`${PANEL_CLASS} flex justify-end`}>
        <button 
          className={PRIMARY_BUTTON_CLASS} 
          type="submit" 
          disabled={saving}
        >
          {saving ? "Saving..." : "Save All Changes"}
        </button>
      </div>
    </form>
  );
}
