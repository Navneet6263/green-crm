import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '../../src/auth/SessionProvider';
import { getProducts, getTeams } from '../../src/api/crm';
import { createLead, type LeadInput } from '../../src/api/sales';
import { useUnsavedChanges } from '../../src/hooks/useUnsavedChanges';
import { Button, Card, IconButton, Notice, Screen } from '../../src/ui/components';
import { Field, Chips, priorityOptions } from '../../src/ui/fields';
import { DateTimeField } from '../../src/ui/DateTimeField';
import { RecordPicker } from '../../src/ui/RecordPicker';
import { Icon } from '../../src/ui/Icon';
import { colors, styles } from '../../src/ui/theme';
import { LeadExtraFields } from '../../src/features/leads/LeadExtraFields';
import { LeadPhotoPicker } from '../../src/features/photos/LeadPhotoPicker';
import { uploadPhoto, type LeadPhoto } from '../../src/features/photos/photoApi';

const initial: LeadInput = { company_name: '', contact_person: '', phone: '', email: '', product_id: '', team_id: '', address_street: '', address_city: '', requirements: '', priority: 'medium', follow_up_date: null };
export default function NewLead() {
  const { session } = useSession();
  const [form, setForm] = useState(initial), [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState('');
  const [team, setTeam] = useState<{ id: string; name: string } | null>(null), [product, setProduct] = useState<{ id: string; name: string } | null>(null);
  const lock = useRef(false);
  const [photos, setPhotos] = useState<LeadPhoto[]>([]);
  const [photoPicking, setPhotoPicking] = useState(false);
  useUnsavedChanges((!saved && JSON.stringify(form) !== JSON.stringify(initial)) || photos.some(photo => !photo.uploaded), busy || photoPicking);
  const update = <K extends keyof LeadInput>(key: K, value: LeadInput[K]) => setForm(current => ({ ...current, [key]: value }));
  const save = async () => {
    if (!session || lock.current || photoPicking) return;
    if (!form.team_id) { setError('Choose your team before creating the lead.'); return; }
    lock.current = true; setBusy(true); setError('');
    let leadId = saved;
    try {
      if (!leadId) { const lead = await createLead(session, form); leadId = lead.lead_id; setSaved(leadId); }
      for (const photo of photos.filter(item => !item.uploaded)) {
        await uploadPhoto(session, leadId, photo);
        setPhotos(current => current.map(item => item.id === photo.id ? { ...item, uploaded: true } : item));
      }
    } catch (failure) { setError(leadId ? `Lead is saved. Photo upload failed: ${(failure as Error).message} Retry the remaining photos below; do not recreate the lead.`
      : `${(failure as Error).message} If the save timed out, check My Leads before trying again to avoid a duplicate.`); }
    finally { lock.current = false; setBusy(false); }
  };
  const back = () => router.canGoBack() ? router.back() : router.replace('/leads');
  if (saved) return <Screen title="Lead created" subtitle="Saved to your CRM."><Card><Icon name="check" color={colors.green} size={36} /><Text style={styles.heading}>{form.company_name}</Text><Text style={styles.subtitle}>Your contact and next step are ready. The lead is assigned to your sales account.</Text></Card>
    {error ? <Notice error message={error} /> : null}
    {photos.length ? <LeadPhotoPicker photos={photos} onChange={setPhotos} busy={busy} saved /> : null}
    {photos.some(photo => !photo.uploaded) ? <Button title="Retry remaining photos" loading={busy} onPress={() => void save()} /> : null}
    <Button title="Open this lead" icon="arrow" onPress={() => router.replace({ pathname: '/leads/[id]', params: { id: saved } })} /><Button secondary title="Back to My Leads" onPress={() => router.replace('/leads')} /></Screen>;
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Screen title="New lead" subtitle="Capture the conversation while it's fresh." action={<IconButton name="back" label="Back to leads" onPress={back} />}>
      <Card><Text style={styles.eyebrow}>01 / BUSINESS & CONTACT</Text>
        <Field label="Business / store name *" value={form.company_name} onChangeText={value => update('company_name', value)} editable={!busy} maxLength={200} placeholder="Business name" />
        <Field label="Contact person *" value={form.contact_person} onChangeText={value => update('contact_person', value)} editable={!busy} maxLength={150} placeholder="Who did you speak with?" />
        <Field label="Phone" value={form.phone} onChangeText={value => update('phone', value)} editable={!busy} maxLength={22} keyboardType="phone-pad" placeholder="Contact number" />
        <Field label="Email" value={form.email} onChangeText={value => update('email', value)} editable={!busy} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={200} placeholder="contact@business.com" hint="At least one phone number or email is required." />
      </Card>
      <Card><Text style={styles.eyebrow}>02 / TEAM & PRODUCT</Text>
        <RecordPicker label="Team" value={team} disabled={busy} onChange={value => { setTeam(value); setProduct(null); setForm(current => ({ ...current, team_id: value.id, product_id: '' })); }}
          load={async (search, page) => { const result = await getTeams(session!, search, page); return { ...result, items: result.items.map(item => ({ id: item.team_id, name: item.name })) }; }} />
        <RecordPicker key={form.team_id} label="Product" value={product} disabled={busy || !form.team_id} onChange={value => { setProduct(value); update('product_id', value.id); }}
          load={async (search, page) => { const result = await getProducts(session!, form.team_id, search, page); return { ...result, items: result.items.map(item => ({ id: item.product_id, name: item.name, disabled: item.is_active === false || item.is_active === 0 })) }; }} />
        <Text style={styles.small}>Choose a team first. Only products accessible to that team are listed. The lead is assigned to you.</Text>
      </Card>
      <Card><Text style={styles.eyebrow}>03 / LOCATION & NEXT STEP</Text>
        <Field label="Street / store address" value={form.address_street} onChangeText={value => update('address_street', value)} editable={!busy} maxLength={250} placeholder="Building, street or locality" />
        <Field label="City" value={form.address_city} onChangeText={value => update('address_city', value)} editable={!busy} maxLength={100} placeholder="City" />
        <Text style={styles.small}>Priority</Text><Chips options={priorityOptions} value={form.priority} disabled={busy} onChange={value => update('priority', value)} />
        <DateTimeField value={form.follow_up_date} disabled={busy} onChange={value => update('follow_up_date', value)} />
        <Field label="Requirements / conversation summary" value={form.requirements} onChangeText={value => update('requirements', value)} editable={!busy} multiline maxLength={4000} placeholder="What do they need? What happens next?" />
      </Card>
      <LeadExtraFields form={form} update={update} busy={busy} />
      <LeadPhotoPicker photos={photos} onChange={setPhotos} busy={busy} onPickingChange={setPhotoPicking} />
      {error ? <Notice error message={error} /> : null}
      <Button title="Create lead in CRM" icon="plus" loading={busy} disabled={photoPicking} onPress={() => void save()} />
      <Text style={[styles.small, { textAlign: 'center' }]}>This creates a real CRM lead. No changes are saved until you submit.</Text>
    </Screen>
  </KeyboardAvoidingView>;
}
