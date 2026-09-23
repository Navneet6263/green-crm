import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import type { Session } from '../../api/types';
import { validateBaseUrl } from '../../api/client';
import { API_BASE } from '../../api/runtime';
export type LeadPhoto = { id: string; uri: string; uploaded: boolean };
export async function choosePhoto(camera: boolean): Promise<LeadPhoto | null> {
  if (camera && Platform.OS !== 'web' && !(await ImagePicker.requestCameraPermissionsAsync()).granted) throw new Error('Camera permission was denied. You can choose a photo from the library instead.');
  const result = await (camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync)({ mediaTypes: ['images'], quality: 0.8, exif: false });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  context.resize({ width: Math.min(asset.width || 1600, 1600) });
  const rendered = await context.renderAsync();
  const photo = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.75 });
  return { id: Crypto.randomUUID(), uri: photo.uri, uploaded: false };
}
export async function uploadPhoto(session: Session, leadId: string, photo: LeadPhoto) {
  const body = Platform.OS === 'web' ? await (await fetch(photo.uri)).blob() : new Uint8Array(await new File(photo.uri).bytes());
  const size = body instanceof Uint8Array ? body.byteLength : body.size;
  if (size > 5 * 1024 * 1024) throw new Error('Photo is larger than 5 MB. Choose a smaller photo.');
  const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 45000);
  try {
    const response = await fetch(`${validateBaseUrl(API_BASE, __DEV__)}/leads/${encodeURIComponent(leadId)}/photos/${photo.id}`, {
      method: 'PUT', headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'image/jpeg' }, body, signal: abort.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.success === false) throw new Error(data?.error || `Photo upload failed (${response.status}).`);
    if (!(data?.data?.saved || data?.saved)) throw new Error('Photo acknowledgement missing. Retry this photo, not lead creation.');
  } finally { clearTimeout(timer); }
}
