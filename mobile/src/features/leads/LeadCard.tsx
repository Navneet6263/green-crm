import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Lead } from '../../api/types';
import { Badge } from '../../ui/components';
import { Icon } from '../../ui/Icon';
import { label, when } from '../../ui/format';
import { colors, styles } from '../../ui/theme';

export function LeadCard({ lead }: { lead: Lead }) {
  const overdue = lead.follow_up_date ? new Date(lead.follow_up_date).getTime() < Date.now() : false;
  const contact = [lead.contact_person?.trim(), lead.address_city?.trim()].filter(Boolean).join(' · ');
  const note = lead.latest_note?.replace(/\s+/g, ' ').trim();
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${lead.company_name || lead.contact_person}`}
    onPress={() => router.push({ pathname: '/leads/[id]', params: { id: lead.lead_id } })}
    style={({ pressed }) => [styles.card, { opacity: pressed ? 0.7 : 1, gap: 12 }]}>
    <View style={[styles.spread, { alignItems: 'flex-start' }]}><View style={{ flex: 1, gap: 5 }}><Text style={[styles.heading, { fontSize: 17 }]}>{lead.company_name || lead.contact_person}</Text>
      {contact ? <Text numberOfLines={2} style={styles.small}>{contact}</Text> : null}</View><Icon name="chevron" size={18} color={colors.muted} /></View>
    <View style={[styles.row, { flexWrap: 'wrap' }]}>{lead.status ? <Badge>{label(lead.status)}</Badge> : null}{lead.priority === 'high' ? <Badge>High priority</Badge> : null}
      {lead.product_name?.trim() ? <Text style={[styles.small, { flexShrink: 1 }]}>{lead.product_name}</Text> : null}</View>
    {lead.phone?.trim() ? <View style={styles.row}><Icon name="phone" size={15} color={colors.muted} /><Text style={[styles.small, { flex: 1 }]}>{lead.phone}</Text></View> : null}
    {lead.follow_up_date || note ? <View style={{ gap: 6 }}>
      {lead.follow_up_date ? <View style={styles.row}><Icon name="clock" size={15} color={colors.muted} /><Text style={[styles.small, { flex: 1 }]}>{overdue ? 'Follow-up overdue' : 'Follow-up'} · {when(lead.follow_up_date)}</Text></View> : null}
      {note ? <Text numberOfLines={2} style={styles.small}>Note: {note}</Text> : null}
    </View> : null}
  </Pressable>;
}
