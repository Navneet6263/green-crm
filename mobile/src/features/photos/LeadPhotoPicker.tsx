import { useRef, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Button, Card, Notice } from '../../ui/components';
import { styles } from '../../ui/theme';
import { choosePhoto, type LeadPhoto } from './photoApi';
export function LeadPhotoPicker({ photos, onChange, busy, saved = false, onPickingChange }: { photos: LeadPhoto[]; onChange: (photos: LeadPhoto[]) => void; busy: boolean; saved?: boolean; onPickingChange?: (picking: boolean) => void }) {
  const [error, setError] = useState(''), [picking, setPicking] = useState(false);
  const lock = useRef(false);
  const pick = async (camera: boolean) => {
    if (lock.current || busy || saved || photos.length >= 3) return;
    lock.current = true; setPicking(true); onPickingChange?.(true); setError('');
    try { const photo = await choosePhoto(camera); if (photo) onChange([...photos, photo]); }
    catch (failure) { setError((failure as Error).message); }
    finally { lock.current = false; setPicking(false); onPickingChange?.(false); }
  };
  return <Card><Text style={styles.heading}>Lead photos</Text><Text style={styles.small}>Up to 3 photos per submission. Saved privately after the lead is created. Requires internet; selected photos are not an offline draft.</Text>
    {error ? <Notice error message={error} /> : null}
    {photos.map(photo => <View key={photo.id} style={{ gap: 8 }}><Image source={{ uri: photo.uri }} accessibilityLabel="Selected lead photo" style={{ width: '100%', height: 160, borderRadius: 12 }} resizeMode="cover" />
      <Text style={styles.small}>{photo.uploaded ? 'Uploaded to CRM' : 'Not uploaded yet'}</Text>
      {!photo.uploaded ? <Button secondary title="Remove selected photo" disabled={busy || picking} onPress={() => onChange(photos.filter(item => item.id !== photo.id))} /> : null}</View>)}
    {!saved && photos.length < 3 ? <><Button secondary title="Take photo" disabled={busy || picking} onPress={() => void pick(true)} /><Button secondary title="Choose photo" disabled={busy || picking} onPress={() => void pick(false)} /></> : null}
  </Card>;
}
