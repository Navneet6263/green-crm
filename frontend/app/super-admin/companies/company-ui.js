import DashboardIcon from "../../../components/dashboard/icons";
import { ACCESS_FEATURES, CONTROL_NOTES, CREATE_FORM_GROUPS, FEATURE_GROUP_STYLES, FEATURE_ICON_MAP, ROLE_LIMIT_FIELDS, SETTINGS_FORM_GROUPS } from "./company-config";
import { avatar, cn, countLimitRoles, describeSmtp, getEnabledFeatureCount, getStatusClasses, titleize } from "./company-utils";

const INPUT = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50";
const BTN = "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition disabled:opacity-50";
const BTN_P = `${BTN} bg-indigo-600 text-white hover:bg-indigo-700`;
const BTN_S = `${BTN} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;

function Head({ eyebrow, title, desc, action }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        {eyebrow ? <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{eyebrow}</p> : null}
        {title ? <h3 className="text-sm font-bold text-slate-900">{title}</h3> : null}
        {desc ? <p className="mt-0.5 text-xs text-slate-500">{desc}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 gap-1.5">{action}</div> : null}
    </div>
  );
}

function Field({ label, children, hint, full }) {
  return (
    <label className={cn("space-y-1", full && "md:col-span-2")}>
      <span className="block text-[11px] font-semibold text-slate-500">{label}</span>
      {children}
      {hint ? <small className="block text-[11px] text-slate-400">{hint}</small> : null}
    </label>
  );
}

function FormControl({ field, value, onChange }) {
  if (field.type === "select") return <select className={INPUT} value={value} onChange={e => onChange(field.key, e.target.value)}>{field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
  if (field.type === "textarea") return <textarea className={`${INPUT} min-h-[80px] resize-y`} rows={field.rows || 3} value={value} onChange={e => onChange(field.key, e.target.value)} placeholder={field.placeholder} />;
  return <input className={INPUT} type={field.type || "text"} value={value} onChange={e => onChange(field.key, e.target.value)} placeholder={field.placeholder} required={field.required} min={field.min} />;
}

function FieldGroup({ group, values, onChange }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-indigo-600">{group.eyebrow}</p>
      <p className="mb-3 text-xs text-slate-500">{group.title}</p>
      <div className="grid gap-2.5 md:grid-cols-2">
        {group.fields.map(f => <Field key={f.key} label={f.label} hint={f.hint} full={f.full}><FormControl field={f} value={values[f.key] ?? ""} onChange={onChange} /></Field>)}
      </div>
    </div>
  );
}

function CompanyTile({ company, selected, onClick }) {
  const st = getStatusClasses(company.status);
  return (
    <button type="button" onClick={onClick} className={cn("w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition", selected ? "bg-indigo-600 text-white shadow-md" : "hover:bg-slate-50 border border-slate-100")}>
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[11px] font-bold", selected ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700")}>{avatar(company.name)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{company.name}</p>
        <p className={cn("truncate text-[11px]", selected ? "text-indigo-100" : "text-slate-400")}>{company.slug} · {describeSmtp(company)}</p>
      </div>
      <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold", selected ? "bg-white/20 text-white" : st.badge)}>{titleize(company.status)}</span>
    </button>
  );
}

function FeatureToggle({ feature, enabled, disabled, onToggle }) {
  const g = FEATURE_GROUP_STYLES[feature.group] || FEATURE_GROUP_STYLES.Core;
  const icon = FEATURE_ICON_MAP[feature.key] || g.icon;
  return (
    <button type="button" onClick={onToggle} disabled={disabled} className={cn("flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition", enabled ? g.cardOn : g.cardOff, !disabled && "hover:shadow-sm")}>
      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", enabled ? "bg-white text-emerald-600 shadow-sm" : "bg-slate-100 text-slate-400")}>
        <DashboardIcon name={icon} className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-slate-900">{feature.label}</p>
        <p className="truncate text-[11px] text-slate-400">{feature.group}{feature.mandatory ? " · Required" : ""}</p>
      </div>
      <span className={cn("h-5 w-5 rounded-full border-2 flex items-center justify-center", enabled ? "border-emerald-500 bg-emerald-500" : "border-slate-300")}>
        {enabled ? <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : null}
      </span>
    </button>
  );
}

export function NoticeBanner({ notice, className }) {
  if (!notice?.text) return null;
  const c = notice.tone === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : notice.tone === "error" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-50 text-slate-700 border-slate-200";
  return <div className={cn("rounded-lg border px-3 py-2 text-sm font-medium", c, className)}>{notice.text}</div>;
}

export function PageFrame({ children }) {
  return <div className="space-y-4">{children}</div>;
}

export function CompanyDirectorySection({ companies, metrics, selectedCompany, selectedCompanyName, selectedStatusStyle, selectedFeatureCount, selectedLimitCount, settingsDraft, onSelectCompany }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {/* Left: List */}
      <div>
        <div className="mb-3 flex items-center gap-3">
          <p className="text-sm font-bold text-slate-900">All Workspaces</p>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">{companies.length}</span>
        </div>
        <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
          {companies.map(c => <CompanyTile key={c.company_id} company={c} selected={selectedCompany?.company_id === c.company_id} onClick={() => onSelectCompany(c.company_id)} />)}
        </div>
      </div>
      {/* Right: Selected summary */}
      <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
        {selectedCompany ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-sm font-bold text-white">{avatar(selectedCompanyName)}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{selectedCompanyName}</p>
                <p className="text-[11px] text-slate-400">{selectedCompany.slug} · {selectedCompany.admin_email || "—"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white px-3 py-2 border border-slate-100"><p className="text-[10px] font-bold text-slate-400">Modules</p><p className="text-sm font-bold text-slate-900">{selectedFeatureCount}/{ACCESS_FEATURES.length}</p></div>
              <div className="rounded-lg bg-white px-3 py-2 border border-slate-100"><p className="text-[10px] font-bold text-slate-400">SMTP</p><p className="text-sm font-bold text-slate-900">{describeSmtp(settingsDraft)}</p></div>
              <div className="rounded-lg bg-white px-3 py-2 border border-slate-100"><p className="text-[10px] font-bold text-slate-400">Seats</p><p className="text-sm font-bold text-slate-900">{selectedLimitCount || "Open"}</p></div>
              <div className="rounded-lg bg-white px-3 py-2 border border-slate-100"><p className="text-[10px] font-bold text-slate-400">Status</p><p className="text-sm font-bold text-slate-900">{titleize(settingsDraft.status || selectedCompany.status)}</p></div>
            </div>
            <div className="mt-3 space-y-1.5 text-xs text-slate-500">
              <div className="flex justify-between"><span>Currency</span><span className="font-semibold text-slate-700">{settingsDraft.settings_currency || "INR"}</span></div>
              <div className="flex justify-between"><span>Timezone</span><span className="font-semibold text-slate-700">{settingsDraft.settings_timezone || "Asia/Kolkata"}</span></div>
              <div className="flex justify-between"><span>Country</span><span className="font-semibold text-slate-700">{settingsDraft.country || "India"}</span></div>
            </div>
          </>
        ) : <p className="text-sm text-slate-400 text-center py-8">Select a company</p>}
      </div>
    </div>
  );
}

export function ControlNotesCard() {
  return (
    <div className="space-y-2">
      {CONTROL_NOTES.map(n => (
        <div key={n.title} className="flex items-start gap-2.5 rounded-xl border border-slate-100 px-3 py-2.5">
          <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md", n.tone)}><DashboardIcon name={n.icon} className="h-3.5 w-3.5" /></span>
          <div><p className="text-[13px] font-semibold text-slate-800">{n.title}</p><p className="text-[11px] text-slate-500">{n.copy}</p></div>
        </div>
      ))}
    </div>
  );
}

export function CreateCompanySection({ canCreateCompany, form, onFieldChange, onSubmit, submitting }) {
  return (
    <form onSubmit={onSubmit} className={cn(!canCreateCompany && "pointer-events-none opacity-60")}>
      <div className="grid gap-3 xl:grid-cols-2">
        {CREATE_FORM_GROUPS.map(g => <FieldGroup key={g.key} group={g} values={form} onChange={onFieldChange} />)}
      </div>
      <div className="mt-3 flex items-center justify-end">
        <button className={BTN_P} type="submit" disabled={submitting || !canCreateCompany}>
          <DashboardIcon name="company" className="h-3.5 w-3.5" />
          {submitting ? "Creating…" : "Create Company"}
        </button>
      </div>
    </form>
  );
}

export function AccessSection({ selectedCompany, selectedCompanyName, selectedFeatureCount, canManageTenant, accessDraft, accessNotice, onApplyPreset, onToggleFeature, onSave, savingAccess }) {
  if (!selectedCompany) return <p className="text-sm text-slate-400 text-center py-6">Select a company to manage access.</p>;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <p className="text-sm font-bold text-slate-900">{selectedCompanyName}</p>
        <span className="text-[11px] text-slate-400">{selectedFeatureCount}/{ACCESS_FEATURES.length} enabled</span>
        <div className="ml-auto flex gap-1.5">
          <button className={BTN_S} type="button" onClick={() => onApplyPreset("full")} disabled={!canManageTenant}>All</button>
          <button className={BTN_S} type="button" onClick={() => onApplyPreset("core")} disabled={!canManageTenant}>Core</button>
          <button className={BTN_S} type="button" onClick={() => onApplyPreset("lite")} disabled={!canManageTenant}>Lite</button>
        </div>
      </div>
      <NoticeBanner notice={accessNotice} className="mb-3" />
      <div className={cn("grid gap-2 md:grid-cols-2", !canManageTenant && "pointer-events-none opacity-70")}>
        {ACCESS_FEATURES.map(f => <FeatureToggle key={f.key} feature={f} enabled={f.mandatory || accessDraft[f.key]} disabled={!canManageTenant || f.mandatory} onToggle={() => onToggleFeature(f.key)} />)}
      </div>
      <div className="mt-3 flex justify-end">
        <button className={BTN_P} type="button" onClick={onSave} disabled={savingAccess || !canManageTenant}>
          {savingAccess ? "Saving…" : "Save Access"}
        </button>
      </div>
    </div>
  );
}

export function TenantSettingsSection({ selectedCompany, selectedCompanyName, canManageTenant, settingsDraft, settingsNotice, onFieldChange, onLimitChange, onSave, onSendTestEmail, savingSettings, testingEmail }) {
  return (
    <div className={cn(!canManageTenant && "pointer-events-none opacity-70")}>
      <NoticeBanner notice={settingsNotice} className="mb-3" />
      <div className="grid gap-3 xl:grid-cols-2">
        {SETTINGS_FORM_GROUPS.map(g => <FieldGroup key={g.key} group={g} values={settingsDraft} onChange={onFieldChange} />)}
        {/* Role Limits */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-indigo-600">Staff Limits</p>
          <p className="mb-3 text-xs text-slate-500">Leave blank for unlimited.</p>
          <div className="grid gap-2 md:grid-cols-2">
            {ROLE_LIMIT_FIELDS.map(f => (
              <Field key={f.key} label={f.label}>
                <input className={INPUT} type="number" min="0" value={settingsDraft.staff_limits?.[f.key] ?? ""} onChange={e => onLimitChange(f.key, e.target.value)} placeholder="∞" />
              </Field>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <button className={BTN_S} type="button" onClick={onSendTestEmail} disabled={testingEmail || !settingsDraft.test_email_to?.trim() || !canManageTenant}>
          {testingEmail ? "Sending…" : "Test Email"}
        </button>
        <button className={BTN_P} type="button" onClick={onSave} disabled={savingSettings || !canManageTenant}>
          {savingSettings ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
