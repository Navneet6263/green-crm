import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSession } from '../../src/auth/SessionProvider';
import { addNote, getLead } from '../../src/api/crm';
import { useResource } from '../../src/hooks/useResource';
import { useUnsavedChanges } from '../../src/hooks/useUnsavedChanges';
import { NoteHistory } from '../../src/features/leads/NoteHistory';
import { FollowUpEditor } from '../../src/features/leads/FollowUpEditor';
import { LeadPhotos } from '../../src/features/photos/LeadPhotos';
import { Badge, Button, Card, IconButton, Notice, Screen } from '../../src/ui/components';
import { Icon } from '../../src/ui/Icon';
import { label, telephoneUrl, when } from '../../src/ui/format';
import { colors, styles } from '../../src/ui/theme';

export default function LeadDetail() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const { session } = useSession();
  const result = useResource(`lead:${session?.user.user_id}:${id}`, () => getLead(session!, id));
  const [note, setNote] = useState(''), [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(''), [revision, setRevision] = useState(0), [error, setError] = useState('');
  const lock = useRef(false);
  useUnsavedChanges(Boolean(note.trim()), saving);
  useEffect(() => { setNote(''); setNotice(''); setError(''); }, [id]);
  const back = () => router.canGoBack() ? router.back() : router.replace('/leads');
  const save = async () => {
    if (lock.current || !session || !note.trim()) return;
    lock.current = true; setSaving(true); setError(''); setNotice('');
    try { await addNote(session, id, note); setNote(''); setNotice('Conversation note saved to the CRM.'); setRevision(n => n + 1); }
    catch (failure) { setError(`${failure instanceof Error ? failure.message : 'Could not save.'} If the connection dropped, check note history before retrying to avoid a duplicate.`); }
    finally { lock.current = false; setSaving(false); }
  };
  const open = (url: string) => { setError(''); void Linking.openURL(url).catch(() => setError('This device could not open that action.')); };
  const lead = result.data, phone = telephoneUrl(lead?.phone);
  const address = [lead?.address_street, lead?.address_city, lead?.address_state, lead?.address_zip].filter(Boolean).join(', ');
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Screen title="Lead workspace" subtitle="The contact, the conversation, the next step."
      action={<IconButton name="back" label="Back to leads" onPress={back} />}>
      {notice ? <Notice message={notice} /> : null}{error ? <Notice error message={error} /> : null}
      {result.loading ? <ActivityIndicator color={colors.green} /> : result.error ? <><Notice error message={result.error} /><Button title="Retry" onPress={result.reload} /></> : lead ? <>
        <Card>
          <View style={[styles.row, { flexWrap: 'wrap' }]}><Badge>{label(lead.status)}</Badge>{lead.priority === 'high' ? <Badge warm>High priority</Badge> : null}</View>
          <Text style={[styles.title, { fontSize: 26 }]}>{lead.company_name || lead.contact_person}</Text>
          <View style={styles.row}><Icon name="user" size={17} color={colors.muted} /><Text style={styles.body}>{lead.contact_person}</Text></View>
          <View style={styles.divider} />
          {lead.phone ? <View style={styles.row}><Icon name="phone" size={17} color={colors.muted} /><Text style={styles.body}>{lead.phone}</Text></View> : null}
          {lead.email ? <View style={styles.row}><Icon name="mail" size={17} color={colors.muted} /><Text style={[styles.subtitle, { flex: 1 }]}>{lead.email}</Text></View> : null}
          <View style={[styles.row, { flexWrap: 'wrap' }]}>{phone ? <View style={{ flex: 1, minWidth: 120 }}><Button icon="phone" title="Call contact" onPress={() => open(phone)} /></View> : null}
            {lead.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email) ? <View style={{ flex: 1, minWidth: 120 }}><Button secondary icon="mail" title="Email" onPress={() => open(`mailto:${encodeURIComponent(lead.email!)}`)} /></View> : null}</View>
          <Text style={styles.small}>Calls and emails open your device apps; they are not automatically logged.</Text>
        </Card>
        <Card><View style={styles.row}><Icon name="calendar" color={colors.green} /><Text style={styles.heading}>Next follow-up</Text></View>
          <Text style={[styles.body, { fontSize: 18, fontWeight: '600' }]}>{when(lead.follow_up_date)}</Text><Text style={styles.small}>India Standard Time · {label(lead.priority)} priority</Text>
          <FollowUpEditor lead={lead} onSaved={() => { setNotice('Lead status and follow-up saved.'); result.reload(); }} />
        </Card>
        <Card><Text style={styles.eyebrow}>LEAD DETAILS</Text>
          <View style={{ gap: 5 }}><Text style={styles.small}>Product</Text><Text style={styles.body}>{lead.product_name || lead.product_id || 'Not set'}</Text></View>
          <View style={{ gap: 5 }}><Text style={styles.small}>Team</Text><Text style={styles.body}>{lead.team_name || lead.team_id || 'Not set'}</Text></View>
          {address ? <><View style={styles.divider} /><View style={styles.row}><Icon name="pin" size={18} color={colors.muted} /><Text style={[styles.subtitle, { flex: 1 }]}>{address}</Text></View>
            <Button secondary title="Open address in Maps" icon="pin" onPress={() => open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`)} /></> : null}
          {lead.requirements ? <><View style={styles.divider} /><Text style={styles.small}>Requirements</Text><Text style={styles.body}>{lead.requirements}</Text></> : null}
        </Card>
        <Card><Text style={styles.heading}>Log a conversation</Text><Text style={styles.subtitle}>Keep the context for your next follow-up.</Text>
          <TextInput accessibilityLabel="Conversation note" value={note} onChangeText={setNote} editable={!saving} multiline maxLength={4000}
            placeholder="What did you discuss? What should happen next?" placeholderTextColor={colors.muted} style={[styles.input, { minHeight: 125, textAlignVertical: 'top' }]} />
          <Text style={styles.small}>{note.length}/4000 · Saved only when you submit</Text>
          <Button title="Save note" icon="check" loading={saving} disabled={!note.trim()} onPress={() => void save()} />
        </Card>
        {session ? <><LeadPhotos key={`photos:${id}`} session={session} leadId={id} /><NoteHistory key={id} session={session} id={id} revision={revision} /></> : null}
      </> : null}
    </Screen>
  </KeyboardAvoidingView>;
}
