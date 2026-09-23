import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Lead } from '../../api/types';
import { Badge } from '../../ui/components';
import { Icon } from '../../ui/Icon';
import { label, when } from '../../ui/format';
import { colors, styles } from '../../ui/theme';

export function LeadCard({ lead }: { lead: Lead }) {
  const overdue = lead.follow_up_date ? new Date(lead.follow_up_date).getTime() < Date.now() : false;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${lead.company_name || lead.contact_person}`}
    onPress={() => router.push({ pathname: '/leads/[id]', params: { id: lead.lead_id } })}
    style={({ pressed }) => [styles.card, { opacity: pressed ? 0.7 : 1, gap: 14 }]}>
    <View style={[styles.spread, { alignItems: 'flex-start' }]}><View style={{ flex: 1, gap: 5 }}><Text style={[styles.heading, { fontSize: 17 }]}>{lead.company_name || lead.contact_person}</Text>
      <Text style={styles.small}>{lead.contact_person || 'Contact not added'}{lead.address_city ? ` · ${lead.address_city}` : ''}</Text></View><Icon name="chevron" size={18} color={colors.muted} /></View>
    <View style={[styles.row, { flexWrap: 'wrap' }]}><Badge>{label(lead.status)}</Badge>{lead.priority === 'high' ? <Badge warm>High priority</Badge> : null}
      {lead.product_name ? <Text style={styles.small}>{lead.product_name}</Text> : null}</View>
    <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12, gap: 8 }}>
      <View style={styles.row}><Icon name="clock" size={16} color={overdue ? colors.orange : colors.green} /><Text style={[styles.small, { color: overdue ? colors.orange : colors.muted, flex: 1 }]}>{when(lead.follow_up_date)}</Text></View>
      {lead.latest_note ? <Text numberOfLines={2} style={styles.small}>{lead.latest_note}</Text> : null}
    </View>
  </Pressable>;
}
