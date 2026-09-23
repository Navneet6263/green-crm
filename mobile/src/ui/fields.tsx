import { Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, styles } from './theme';

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  return <View style={{ gap: 8 }}><Text style={{ color: colors.ink, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} {...props} style={[styles.input, props.multiline ? { minHeight: 100, textAlignVertical: 'top' } : null, props.style]} />
    {hint ? <Text style={styles.small}>{hint}</Text> : null}
  </View>;
}
export function Chips({ options, value, onChange, disabled = false }: { options: { value: string; label: string }[]; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
    {options.map(item => <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: value === item.value, disabled }} disabled={disabled}
      onPress={() => onChange(item.value)} style={{ minHeight: 44, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 13,
        backgroundColor: value === item.value ? colors.green : colors.white, borderWidth: 1, borderColor: value === item.value ? colors.green : colors.line }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: value === item.value ? colors.white : colors.muted }}>{item.label}</Text>
    </Pressable>)}
  </ScrollView>;
}
export const priorityOptions = ['low', 'medium', 'high'].map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) }));
