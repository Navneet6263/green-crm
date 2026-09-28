import { Text, View } from 'react-native';
import type { Lead } from '../../api/types';
import { Card } from '../../ui/components';
import { colors, styles } from '../../ui/theme';
import { fieldText, hasValue, leadFields } from './leadPresentation';
export function LeadDetailsGrid({ lead }: { lead: Lead }) {
  return <>{['Contact', 'Opportunity', 'Commercial', 'Address', 'Context', 'Record'].map(section => {
    const fields = leadFields.filter(field => field.section === section && hasValue(lead[field.key]));
    if (!fields.length) return null;
    return <Card key={section}><Text style={styles.eyebrow}>{section.toUpperCase()}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>{fields.map(field => <View key={field.key} style={{ flexGrow: 1, flexBasis: section === 'Context' || field.key === 'email' || field.key === 'address_street' ? '100%' : '44%', minWidth: 0, gap: 5, paddingVertical: 4 }}>
        <Text style={{ color: colors.muted, fontSize: 11 }}>{field.title}</Text><Text selectable style={{ color: colors.ink, fontSize: 14, lineHeight: 21, fontWeight: '500' }}>{fieldText(lead, field)}</Text>
      </View>)}</View>
    </Card>;
  })}</>;
}
