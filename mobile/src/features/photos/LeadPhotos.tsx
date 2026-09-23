import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Text, View } from 'react-native';
import type { Session } from '../../api/types';
import { API_BASE, request } from '../../api/runtime';
import { unwrap, validateBaseUrl } from '../../api/client';
import { useResource } from '../../hooks/useResource';
import { Button, Card, Notice } from '../../ui/components';
import { styles } from '../../ui/theme';
type Photo = { photo_id: string; created_at: string };

export function LeadPhotos({ session, leadId }: { session: Session; leadId: string }) {
  const path = `/leads/${encodeURIComponent(leadId)}/photos`;
  const result = useResource<Photo[]>(`photos:${session.user.user_id}:${leadId}`, async () => {
    const photos = unwrap(await request(path, session.token));
    if (!Array.isArray(photos)) throw new Error('Photo list is unavailable.');
    return photos;
  });
  const [selected, setSelected] = useState(''), [loading, setLoading] = useState(false), [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null), objectUrl = useRef('');
  useEffect(() => () => {
    controller.current?.abort();
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
  }, [leadId, session.token]);
  const open = async (photo: Photo) => {
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    const timer = setTimeout(() => abort.abort(), 20000);
    setLoading(true); setError(''); setSelected('');
    if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = ''; }
    try {
      const response = await fetch(`${validateBaseUrl(API_BASE, __DEV__)}${path}/${encodeURIComponent(photo.photo_id)}`, {
        headers: { Authorization: `Bearer ${session.token}` }, signal: abort.signal,
      });
      if (!response.ok) throw new Error(`Photo could not load (${response.status}).`);
      const mime = response.headers.get('Content-Type')?.split(';')[0];
      if (!['image/jpeg', 'image/png'].includes(mime || '')) throw new Error('Invalid photo response.');
      const blob = await response.blob();
      if (blob.size > 5 * 1024 * 1024) throw new Error('Photo is too large to preview.');
      if (abort.signal.aborted) return;
      if (Platform.OS === 'web') { objectUrl.current = URL.createObjectURL(blob); setSelected(objectUrl.current); }
      else {
        // The request is authenticated; the preview remains in memory, not public storage.
        const uri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Photo could not be read.')); reader.readAsDataURL(blob);
        });
        if (!abort.signal.aborted) setSelected(uri);
      }
    } catch (failure) {
      if (controller.current === abort) setError(failure instanceof Error ? failure.message : 'Photo could not load.');
    } finally { clearTimeout(timer); if (controller.current === abort) setLoading(false); }
  };
  return <Card><Text style={styles.heading}>Visit photos</Text><Text style={styles.small}>Private photos, available only with lead access. Internet required.</Text>
    {result.loading ? <ActivityIndicator /> : result.error ? <><Notice error message={result.error} /><Button secondary title="Retry photos" onPress={result.reload} /></> : result.data?.length ?
      <View style={{ gap: 8 }}>{result.data.map((photo, index) => <Button key={photo.photo_id} secondary title={`View photo ${index + 1}`} onPress={() => void open(photo)} />)}</View>
      : <Text style={styles.subtitle}>No photos attached.</Text>}
    {loading ? <ActivityIndicator /> : null}{error ? <Notice error message={error} /> : null}
    {selected ? <Image accessibilityLabel="Saved visit photo" source={{ uri: selected }} style={{ width: '100%', height: 280, borderRadius: 12 }} resizeMode="contain" onError={() => setError('This photo could not be displayed.')} /> : null}
  </Card>;
}
