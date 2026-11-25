import type { Session } from '../api/types';

// Which parts of the app the company's GreenCRM plan includes. Modules are on unless the
// platform switched them off; a tracking-only company has leads and customers off.
function access(session: Session | null): Record<string, unknown> {
  const raw = session?.company?.service_access;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) || {}; } catch { return {}; }
  }
  return raw;
}

export const moduleOn = (session: Session | null, key: string) => access(session)[key] !== false;
export const crmOn = (session: Session | null) => moduleOn(session, 'leads') || moduleOn(session, 'customers');
