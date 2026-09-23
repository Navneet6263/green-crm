export function when(value?: string | null): string {
  if (!value) return 'No follow-up scheduled';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Date unavailable';
  return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}
export const label = (value?: string) => (value || 'Not set').replaceAll('-', ' ').replaceAll('_', ' ');
export function telephoneUrl(phone?: string): string | null {
  const value = String(phone || '').replace(/[^\d+]/g, '');
  return /^\+?\d{6,15}$/.test(value) ? `tel:${value}` : null;
}
