import { parseCustomerProfile } from "../../../lib/customerProfile";

function Field({ label, value }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-3 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value || "—"}</span>
    </div>
  );
}

export default function CustomerProfilePanel({ customer }) {
  if (!customer) return null;

  const profile = parseCustomerProfile(customer.notes);
  const address = [profile.address_street, profile.address_city, profile.address_state, profile.address_zip, profile.country].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      {/* Contact Info Card */}
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-extrabold text-slate-900">Contact Details</h3>
        <div className="flex flex-col">
          <Field label="Primary Contact" value={customer.name} />
          <Field label="Email Address" value={customer.email} />
          <Field label="Phone Number" value={customer.phone} />
          <Field label="Website" value={profile.website} />
        </div>
      </div>

      {/* Business Info Card */}
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-extrabold text-slate-900">Business Profile</h3>
        <div className="flex flex-col">
          <Field label="Industry" value={profile.industry} />
          <Field label="Address" value={address} />
          <Field label="Assigned Owner" value={customer.assigned_to_name || "Unassigned"} />
          <Field label="Team" value={customer.team_name || "Default"} />
        </div>
        
        {profile.business_summary && (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Business Summary</span>
            <p className="text-xs leading-relaxed text-slate-600">{profile.business_summary}</p>
          </div>
        )}
      </div>

      {/* Meta Info Card */}
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-extrabold text-slate-900">System Meta</h3>
        <div className="flex flex-col">
          <Field label="Customer ID" value={customer.customer_id} />
          <Field label="Created On" value={new Date(customer.created_at).toLocaleDateString()} />
          <Field label="Last Updated" value={new Date(customer.updated_at).toLocaleDateString()} />
          <Field label="Converted From Lead" value={customer.converted_from_lead_id || "Direct"} />
        </div>
      </div>
    </div>
  );
}
