import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
export async function shareExport(csv: string) {
  if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device.');
  const directory = new Directory(Paths.cache, 'greencrm-lead-exports');
  directory.create({ idempotent: true, intermediates: true });
  // The Android chooser can resolve before the receiving app reads the file.
  // Keep successful handoffs in app-private cache; clean old exports on next use.
  for (const entry of directory.list()) {
    if (entry instanceof File && /^GreenCRM-leads-\d+-[a-z0-9]+\.csv$/.test(entry.name) &&
      Number(entry.name.split('-')[2]) < Date.now() - 86400000) entry.delete();
  }
  const file = new File(directory, `GreenCRM-leads-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.csv`);
  try {
    file.create(); file.write(csv);
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: 'Save or share lead export' });
  } catch (error) { if (file.exists) file.delete(); throw error; }
}
