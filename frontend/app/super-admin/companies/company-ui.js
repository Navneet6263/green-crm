import DashboardIcon from "../../../components/dashboard/icons";
import {
  ACCESS_FEATURES,
  CONTROL_NOTES,
  CREATE_FORM_GROUPS,
  FEATURE_GROUP_STYLES,
  FEATURE_ICON_MAP,
  ROLE_LIMIT_FIELDS,
  SETTINGS_FORM_GROUPS,
} from "./company-config";
import {
  avatar,
  cn,
  countLimitRoles,
  describeSmtp,
  getEnabledFeatureCount,
  getStatusClasses,
  titleize,
} from "./company-utils";

const PANEL_CLASS = "rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]";
const SUB_PANEL_CLASS = "rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_6px_16px_rgba(15,23,42,0.03)]";
const INPUT_CLASS =
  "w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100";
const PRIMARY_BUTTON_CLASS =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[14px] border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(22,163,74,0.16)] transition hover:bg-emerald-700 hover:border-emerald-700 disabled:cursor-not-allowed disabled:opacity-60";
const SECONDARY_BUTTON_CLASS =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

function SectionHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-3xl">
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700/80">{eyebrow}</span>
        <h2 className="mt-2 text-[clamp(1.45rem,2vw,2rem)] font-black leading-tight text-slate-900">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

function SummaryStat({ icon, label, value, tone }) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-[0_4px_12px_rgba(15,23,42,0.03)]">
      <span className={cn("grid h-9 w-9 flex-shrink-0 place-items-center rounded-[12px] text-white", tone)}>
        <DashboardIcon name={icon} className="h-4 w-4" />
      </span>
      <div>
        <strong className="block text-xl font-black leading-none text-slate-900">{value}</strong>
        <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</span>
      </div>
    </div>
  );
}

function DetailMetric({ label, value, note }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <strong className="mt-2 block text-xl font-black text-slate-900">{value}</strong>
      <p className="mt-2 text-sm leading-6 text-slate-500">{note}</p>
    </div>
  );
}

function SelectorTile({ company, selected, onClick }) {
  const statusStyle = getStatusClasses(company.status);
  const featureCount = getEnabledFeatureCount(company.access);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-[22px] border p-4 text-left transition-all",
        selected
          ? "border-emerald-200 bg-emerald-600 text-white shadow-[0_18px_36px_rgba(22,163,74,0.18)]"
          : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/50"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "grid h-12 w-12 flex-shrink-0 place-items-center rounded-[16px] text-sm font-black",
              selected ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"
            )}
          >
            {avatar(company.name)}
          </span>
          <div className="min-w-0">
            <strong className="block truncate text-[15px] font-bold">{company.name}</strong>
            <span className={cn("mt-1 block truncate text-xs", selected ? "text-emerald-50" : "text-slate-400")}>
              {company.slug} | {company.admin_email || "No admin email"}
            </span>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]",
            selected ? "bg-white/15 text-white" : statusStyle.badge
          )}
        >
          {titleize(company.status)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className={cn("rounded-2xl p-3", selected ? "bg-white/10" : "bg-slate-50")}>
          <span className={cn("block text-[10px] font-bold uppercase tracking-[0.16em]", selected ? "text-emerald-50" : "text-slate-400")}>
            Modules
          </span>
          <strong className="mt-1 block text-sm font-bold">{featureCount}</strong>
        </div>
        <div className={cn("rounded-2xl p-3", selected ? "bg-white/10" : "bg-slate-50")}>
          <span className={cn("block text-[10px] font-bold uppercase tracking-[0.16em]", selected ? "text-emerald-50" : "text-slate-400")}>
            SMTP
          </span>
          <strong className="mt-1 block text-sm font-bold">{describeSmtp(company)}</strong>
        </div>
        <div className={cn("rounded-2xl p-3", selected ? "bg-white/10" : "bg-slate-50")}>
          <span className={cn("block text-[10px] font-bold uppercase tracking-[0.16em]", selected ? "text-emerald-50" : "text-slate-400")}>
            Seats
          </span>
          <strong className="mt-1 block text-sm font-bold">{countLimitRoles(company.settings?.staff_limits) || "Open"}</strong>
        </div>
      </div>
    </button>
  );
}

function Field({ label, children, hint, full = false }) {
  return (
    <label className={cn("space-y-2", full && "md:col-span-2")}>
      <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</span>
      {children}
      {hint ? <small className="block text-xs leading-5 text-slate-400">{hint}</small> : null}
    </label>
  );
}

function FormFieldControl({ field, value, onChange }) {
  if (field.type === "select") {
    return (
      <select className={INPUT_CLASS} value={value} onChange={(event) => onChange(field.key, event.target.value)}>
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        className={cn(INPUT_CLASS, "min-h-[132px] resize-y")}
        rows={field.rows || 4}
        value={value}
        onChange={(event) => onChange(field.key, event.target.value)}
        placeholder={field.placeholder}
      />
    );
  }

  return (
    <input
      className={INPUT_CLASS}
      type={field.type || "text"}
      value={value}
      onChange={(event) => onChange(field.key, event.target.value)}
      placeholder={field.placeholder}
      required={field.required}
      min={field.min}
    />
  );
}

function FormFieldGrid({ fields, values, onChange }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {fields.map((field) => (
        <Field key={field.key} label={field.label} hint={field.hint} full={field.full}>
          <FormFieldControl field={field} value={values[field.key] ?? ""} onChange={onChange} />
        </Field>
      ))}
    </div>
  );
}

function FieldGroupCard({ group, values, onChange }) {
  return (
    <section className={SUB_PANEL_CLASS}>
      <div className="mb-5">
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700/80">{group.eyebrow}</span>
        <h3 className="mt-2 text-xl font-black text-slate-900">{group.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{group.description}</p>
      </div>
      <FormFieldGrid fields={group.fields} values={values} onChange={onChange} />
    </section>
  );
}

function FeatureCard({ feature, enabled, disabled, onToggle }) {
  const groupStyle = FEATURE_GROUP_STYLES[feature.group] || FEATURE_GROUP_STYLES.Core;
  const iconName = FEATURE_ICON_MAP[feature.key] || groupStyle.icon;

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "rounded-[22px] border p-4 text-left transition-all",
        enabled ? groupStyle.cardOn : groupStyle.cardOff,
        disabled && !feature.mandatory ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5"
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]", groupStyle.chip)}>
          {feature.group}
        </span>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]",
            feature.mandatory
              ? "bg-slate-900 text-white"
              : enabled
                ? "bg-white text-slate-700 ring-1 ring-slate-200"
                : "bg-slate-100 text-slate-500"
          )}
        >
          {feature.mandatory ? "Required" : enabled ? "Enabled" : "Locked"}
        </span>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <span className={cn("grid h-11 w-11 place-items-center rounded-[16px] bg-white text-slate-700 shadow-sm", enabled && "text-emerald-700")}>
          <DashboardIcon name={iconName} className="h-5 w-5" />
        </span>
        <strong className="text-[15px] font-bold text-slate-900">{feature.label}</strong>
      </div>

      <p className="text-sm leading-6 text-slate-500">{feature.description}</p>
    </button>
  );
}

function RoleLimitsCard({ values, onChange }) {
  return (
    <section className={SUB_PANEL_CLASS}>
      <div className="mb-5">
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700/80">Staff Limits</span>
        <h3 className="mt-2 text-xl font-black text-slate-900">Control active seats by role.</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">Leave blank for unlimited. Limits are checked when admins add or reactivate users.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {ROLE_LIMIT_FIELDS.map((field) => (
          <Field key={field.key} label={field.label}>
            <input
              className={INPUT_CLASS}
              type="number"
              min="0"
              value={values[field.key]}
              onChange={(event) => onChange(field.key, event.target.value)}
              placeholder="Unlimited"
            />
          </Field>
        ))}
      </div>
    </section>
  );
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="grid min-h-[240px] place-items-center rounded-[24px] border border-dashed border-slate-300 bg-white p-8 text-center">
      <div>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-[20px] bg-slate-100 text-slate-700">
          <DashboardIcon name={icon} className="h-6 w-6" />
        </span>
        <h3 className="mt-4 text-lg font-black text-slate-900">{title}</h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export function NoticeBanner({ notice, className }) {
  if (!notice?.text) return null;

  const toneClass =
    notice.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : notice.tone === "error"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-slate-200 bg-white text-slate-700";

  return <div className={cn("rounded-[18px] border px-4 py-3 text-sm font-semibold", toneClass, className)}>{notice.text}</div>;
}

export function PageFrame({ children }) {
  return (
    <div className="rounded-[34px] border border-slate-200 bg-slate-100/90 p-4 sm:p-5 lg:p-6">
      <div className="space-y-6">{children}</div>
    </div>
  );
}

export function CompanyDirectorySection({
  companies,
  metrics,
  selectedCompany,
  selectedCompanyName,
  selectedStatusStyle,
  selectedFeatureCount,
  selectedLimitCount,
  settingsDraft,
  onSelectCompany,
}) {
  const selectedSummaryLabel = selectedCompany ? `${selectedFeatureCount}/${ACCESS_FEATURES.length} modules live` : "Pick any company to review";

  return (
    <article className={PANEL_CLASS}>
      <SectionHeader
        eyebrow="Tenant Directory"
        title="Tenant workspaces in one cleaner board."
        description="White cards keep the workspace readable, while the outer shell stays soft grey for separation."
        action={
          <div className="min-w-[230px] rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              {selectedCompany ? avatar(selectedCompanyName) : "NA"}
            </span>
            <strong className="mt-1 block text-lg font-black text-slate-900">{selectedCompanyName}</strong>
            <span className="block text-xs text-slate-500">{selectedSummaryLabel}</span>
          </div>
        }
      />

      <div className="mt-5 grid grid-cols-4 gap-3">
        <SummaryStat icon="company" label="Tenants" value={metrics.total} tone="bg-slate-900" />
        <SummaryStat icon="message" label="Tenant SMTP" value={metrics.smtpReady} tone="bg-emerald-600" />
        <SummaryStat icon="security" label="Custom Login" value={metrics.customLogin} tone="bg-blue-600" />
        <SummaryStat icon="users" label="Seat Policies" value={metrics.seatPolicies} tone="bg-amber-500" />
      </div>

      {companies.length ? (
        <div className="mt-5 grid gap-4 2xl:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)]">
          <div className={SUB_PANEL_CLASS}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Workspace List</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{companies.length}</span>
            </div>
            <div className="grid max-h-[420px] gap-3 overflow-y-auto pr-1">
              {companies.map((company) => (
                <SelectorTile
                  key={company.company_id}
                  company={company}
                  selected={selectedCompany?.company_id === company.company_id}
                  onClick={() => onSelectCompany(company.company_id)}
                />
              ))}
            </div>
          </div>

          <div className={SUB_PANEL_CLASS}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Selected Summary</span>
                <h3 className="mt-2 text-xl font-black text-slate-900">{selectedCompanyName}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {selectedCompany
                    ? `${selectedCompany.slug} | ${selectedCompany.admin_email || "No admin email"}`
                    : "Create a tenant first or pick one from the directory rail."}
                </p>
              </div>
              {selectedCompany ? (
                <span className={cn("inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold", selectedStatusStyle.badge)}>
                  {titleize(settingsDraft.status || selectedCompany.status)}
                </span>
              ) : null}
            </div>

            {selectedCompany ? (
              <>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <DetailMetric label="Access Mix" value={`${selectedFeatureCount}/${ACCESS_FEATURES.length}`} note="Enabled modules for this tenant plan." />
                  <DetailMetric label="Delivery Mode" value={describeSmtp(settingsDraft)} note="Mail route currently active for this workspace." />
                  <DetailMetric label="Seat Rules" value={selectedLimitCount || "Open"} note="Roles with configured active-user limits." />
                  <DetailMetric label="Auth Link" value={settingsDraft.login_url ? "Custom URL" : "Default URL"} note={settingsDraft.login_url || "Platform login URL fallback in use."} />
                </div>

                <div className="mt-5 rounded-[24px] bg-slate-950 p-5 text-white">
                  <div className="flex items-center gap-3">
                    <span className={cn("grid h-12 w-12 place-items-center rounded-[18px] bg-gradient-to-br text-sm font-black", selectedStatusStyle.card)}>
                      {avatar(selectedCompanyName)}
                    </span>
                    <div>
                      <strong className="block text-lg font-black">{selectedCompanyName}</strong>
                      <span className="block text-sm text-slate-300">
                        {settingsDraft.settings_currency} | {settingsDraft.settings_timezone}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 text-sm text-slate-300">
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3">
                      <span>Contact Email</span>
                      <strong className="truncate text-right text-white">{settingsDraft.contact_email || settingsDraft.admin_email || "Not set"}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3">
                      <span>Website</span>
                      <strong className="truncate text-right text-white">{settingsDraft.website || "Not set"}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3">
                      <span>Country</span>
                      <strong className="text-white">{settingsDraft.country || "India"}</strong>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                No tenant selected. Pick any company from the left rail to inspect access, SMTP, and seat settings.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            icon="company"
            title="No companies in the directory yet"
            description="Create the first tenant workspace to unlock SMTP setup, access plans, and seat governance from this screen."
          />
        </div>
      )}
    </article>
  );
}

export function ControlNotesCard() {
  return (
    <aside className={PANEL_CLASS}>
      <SectionHeader
        eyebrow="Control Notes"
        title="Everything needed for tenant launch."
        description="The side rail stays simple: creation, access, delivery, and seat limits are all grouped below."
      />

      <div className="mt-6 grid gap-3">
        {CONTROL_NOTES.map((item) => (
          <div key={item.title} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <span className={cn("grid h-11 w-11 place-items-center rounded-[16px]", item.tone)}>
                <DashboardIcon name={item.icon} className="h-5 w-5" />
              </span>
              <div>
                <strong className="block text-[15px] font-bold text-slate-900">{item.title}</strong>
                <p className="mt-2 text-sm leading-6 text-slate-500">{item.copy}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

export function CreateCompanySection({ canCreateCompany, form, onFieldChange, onSubmit, submitting }) {
  return (
    <article className={PANEL_CLASS}>
      <SectionHeader
        eyebrow="Tenant Launch"
        title={canCreateCompany ? "Create a new tenant company." : "Tenant creation is locked for this role."}
        description={
          canCreateCompany
            ? "Split into smaller cards so profile and delivery settings are easier to scan."
            : "Super-admin creates tenants. Platform-admin and platform-manager can still review and manage assigned workspaces."
        }
        action={
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
            {canCreateCompany ? "Super Admin Only" : "Read Only"}
          </span>
        }
      />

      <form onSubmit={onSubmit} className={cn("mt-6 space-y-4", !canCreateCompany && "pointer-events-none opacity-60")}>
        <div className="grid gap-4 xl:grid-cols-2">
          {CREATE_FORM_GROUPS.map((group) => (
            <FieldGroupCard key={group.key} group={group} values={form} onChange={onFieldChange} />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-sm leading-6 text-slate-500">Tenant launch stores login URL and SMTP override with the company record from day one.</p>
          <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={submitting || !canCreateCompany}>
            <DashboardIcon name="company" className="h-4 w-4" />
            {submitting ? "Creating..." : "Create Company"}
          </button>
        </div>
      </form>
    </article>
  );
}

export function AccessSection({
  selectedCompany,
  selectedCompanyName,
  selectedFeatureCount,
  canManageTenant,
  accessDraft,
  accessNotice,
  onApplyPreset,
  onToggleFeature,
  onSave,
  savingAccess,
}) {
  return (
    <article className={PANEL_CLASS}>
      <SectionHeader
        eyebrow="Access Matrix"
        title="Shape the tenant plan."
        description="Turn modules on or off, keep mandatory modules fixed, and save the plan back into the company record."
        action={
          <>
            <button className={SECONDARY_BUTTON_CLASS} type="button" onClick={() => onApplyPreset("full")} disabled={!selectedCompany || !canManageTenant}>
              All Access
            </button>
            <button className={SECONDARY_BUTTON_CLASS} type="button" onClick={() => onApplyPreset("core")} disabled={!selectedCompany || !canManageTenant}>
              Core Only
            </button>
            <button className={SECONDARY_BUTTON_CLASS} type="button" onClick={() => onApplyPreset("lite")} disabled={!selectedCompany || !canManageTenant}>
              Lite Plan
            </button>
          </>
        }
      />

      {selectedCompany ? (
        <div className="mt-6">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Selected Tenant</span>
                <h3 className="mt-2 text-xl font-black text-slate-900">{selectedCompanyName}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {selectedCompany.slug} | {selectedCompany.admin_email || "No admin email"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={cn("inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold", getStatusClasses(selectedCompany.status).badge)}>
                  {titleize(selectedCompany.status)}
                </span>
                <span className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                  {selectedFeatureCount}/{ACCESS_FEATURES.length} live
                </span>
              </div>
            </div>
          </div>

          {!canManageTenant ? (
            <p className="mt-4 text-sm leading-6 text-slate-500">
              Read-only mode is active for this account. Access rules can be changed by super-admin or platform-admin.
            </p>
          ) : null}

          <NoticeBanner notice={accessNotice} className="mt-4" />

          <div className={cn("mt-5 grid gap-4 md:grid-cols-2", !canManageTenant && "pointer-events-none opacity-70")}>
            {ACCESS_FEATURES.map((feature) => {
              const enabled = feature.mandatory ? true : accessDraft[feature.key];
              return (
                <FeatureCard
                  key={feature.key}
                  feature={feature}
                  enabled={enabled}
                  disabled={!canManageTenant || feature.mandatory}
                  onToggle={() => onToggleFeature(feature.key)}
                />
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm leading-6 text-slate-500">Mandatory modules stay locked on. Other services can be packaged tenant by tenant.</p>
            <button className={PRIMARY_BUTTON_CLASS} type="button" onClick={onSave} disabled={savingAccess || !canManageTenant}>
              <DashboardIcon name="settings" className="h-4 w-4" />
              {savingAccess ? "Saving..." : "Save Access Rules"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState icon="settings" title="Select a company first" description="Create a tenant first or pick one from the directory above to manage module access." />
        </div>
      )}
    </article>
  );
}

export function TenantSettingsSection({
  selectedCompany,
  selectedCompanyName,
  canManageTenant,
  settingsDraft,
  settingsNotice,
  onFieldChange,
  onLimitChange,
  onSave,
  onSendTestEmail,
  savingSettings,
  testingEmail,
}) {
  return (
    <article className={PANEL_CLASS}>
      <SectionHeader
        eyebrow="Tenant Delivery And Seats"
        title="Delivery, branding, and staff governance."
        description="Everything saved here is reused for SMTP delivery, auth emails, tenant identity, and role seat checks."
        action={
          <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Workspace</span>
            <strong className="mt-1 block text-lg font-black text-slate-900">{selectedCompanyName}</strong>
            <span className="block text-xs text-slate-500">{selectedCompany.slug}</span>
          </div>
        }
      />

      <NoticeBanner notice={settingsNotice} className="mt-5" />

      {!canManageTenant ? (
        <p className="mt-5 text-sm leading-6 text-slate-500">
          This tenant is visible in read-only mode. Platform-manager can review but cannot change status, SMTP, or seat limits.
        </p>
      ) : null}

      <div className={cn("mt-6 grid gap-4 xl:grid-cols-2", !canManageTenant && "pointer-events-none opacity-70")}>
        {SETTINGS_FORM_GROUPS.map((group) => (
          <FieldGroupCard key={group.key} group={group} values={settingsDraft} onChange={onFieldChange} />
        ))}
        <RoleLimitsCard values={settingsDraft.staff_limits} onChange={onLimitChange} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="text-sm leading-6 text-slate-500">SMTP, login URL, credential copy, and role seat limits now live inside this tenant record.</p>
        <div className="flex flex-wrap gap-3">
          <button
            className={SECONDARY_BUTTON_CLASS}
            type="button"
            onClick={onSendTestEmail}
            disabled={testingEmail || !settingsDraft.test_email_to.trim() || !canManageTenant}
          >
            <DashboardIcon name="message" className="h-4 w-4" />
            {testingEmail ? "Sending Test..." : "Send Test Email"}
          </button>
          <button className={PRIMARY_BUTTON_CLASS} type="button" onClick={onSave} disabled={savingSettings || !canManageTenant}>
            <DashboardIcon name="settings" className="h-4 w-4" />
            {savingSettings ? "Saving..." : "Save Tenant Settings"}
          </button>
        </div>
      </div>
    </article>
  );
}
