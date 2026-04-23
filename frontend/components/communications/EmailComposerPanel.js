import DashboardIcon from "../dashboard/icons";

import {
  GHOST_BUTTON_CLASS,
  INPUT_CLASS,
  KICKER_CLASS,
  PANEL_CLASS,
  PRIMARY_BUTTON_CLASS,
} from "./constants";

export default function EmailComposerPanel({
  recipient,
  cc,
  subject,
  body,
  setRecipient,
  setCc,
  setSubject,
  setBody,
  copyDraft,
  copyState,
  sendEmail,
  sending,
  record,
  capability,
}) {
  if (!record) {
    return null;
  }

  const statusLabel = capability?.enabled
    ? capability?.source === "platform"
      ? "Platform SMTP"
      : "Own SMTP"
    : "Managed service locked";
  const note = capability?.enabled
    ? capability?.source === "platform"
      ? "Uses superadmin-approved GreenCall SMTP because tenant SMTP is not available for this action."
      : "Uses the company's own SMTP route."
    : "Email remains visible for discovery. Sending will be blocked until own SMTP is configured or superadmin enables GreenCall SMTP.";

  return (
    <article className={PANEL_CLASS}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className={KICKER_CLASS}>Compose</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Send email from CRM</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#746853]">{note}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">{record.entity_type} sync</span>
          <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${capability?.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>{statusLabel}</span>
        </div>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-2"><span className={KICKER_CLASS}>Recipient</span><input className={INPUT_CLASS} type="email" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="recipient@company.com" /></label>
        <label className="grid gap-2"><span className={KICKER_CLASS}>CC</span><input className={INPUT_CLASS} value={cc} onChange={(event) => setCc(event.target.value)} placeholder="leader@company.com, ops@company.com" /></label>
        <label className="grid gap-2"><span className={KICKER_CLASS}>Subject</span><input className={INPUT_CLASS} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Email subject" /></label>
        <label className="grid gap-2"><span className={KICKER_CLASS}>Message</span><textarea className={`${INPUT_CLASS} min-h-[280px] resize-y`} rows="12" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write the email body" /></label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button className={GHOST_BUTTON_CLASS} type="button" onClick={copyDraft}>
          <DashboardIcon name="documents" className="h-4 w-4" />
          {copyState === "copied" ? "Copied" : "Copy Draft"}
        </button>
        <button className={PRIMARY_BUTTON_CLASS} type="button" onClick={sendEmail} disabled={sending === "/communications/email"}>
          <DashboardIcon name="message" className="h-4 w-4" />
          {sending === "/communications/email" ? "Sending..." : "Send Email"}
        </button>
      </div>
    </article>
  );
}
