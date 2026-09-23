import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, IconButton, Notice } from './components';
import { Field } from './fields';
import { Icon } from './Icon';
import { when } from './format';
import { fromIst, istParts } from './dates';
import { colors, styles } from './theme';

export function DateTimeField({ value, onChange, label = 'Next follow-up', disabled = false, required = false }: {
  value: string | null; onChange: (value: string | null) => void; label?: string; disabled?: boolean; required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(istParts());
  const [hour, setHour] = useState('10'), [minute, setMinute] = useState('00');
  const [error, setError] = useState('');
  const show = () => {
    const next = istParts(value || new Date().toISOString());
    setDate(next); setHour(String(value ? next.hour : 10).padStart(2, '0')); setMinute(String(value ? next.minute : 0).padStart(2, '0')); setError(''); setOpen(true);
  };
  const changeMonth = (offset: number) => {
    const next = new Date(Date.UTC(date.year, date.month + offset, 1));
    setDate({ ...date, year: next.getUTCFullYear(), month: next.getUTCMonth(), day: 1 });
  };
  const save = () => {
    try {
      if (!/^\d{1,2}$/.test(hour) || !/^\d{1,2}$/.test(minute)) throw new Error('Enter both hour and minute.');
      onChange(fromIst(date.year, date.month, date.day, Number(hour), Number(minute))); setOpen(false);
    } catch (failure) { setError((failure as Error).message); }
  };
  const offset = new Date(Date.UTC(date.year, date.month, 1)).getUTCDay();
  const days = new Date(Date.UTC(date.year, date.month + 1, 0)).getUTCDate();
  return <View style={{ gap: 8 }}><Text style={{ color: colors.ink, fontSize: 13, fontWeight: '600' }}>{label}{required ? ' *' : ''}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value ? when(value) : 'Not scheduled'}`} disabled={disabled} onPress={show} style={[styles.input, styles.row]}>
      <Icon name="calendar" color={colors.green} /><Text style={[styles.body, { flex: 1 }]}>{value ? when(value) : 'Choose date & time'}</Text><Icon name="chevron" size={16} />
    </Pressable>
    <Text style={styles.small}>India Standard Time (IST)</Text>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#10282088', justifyContent: 'center', padding: 16 }}>
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: '95%', width: '100%', maxWidth: 420, alignSelf: 'center', borderRadius: 20 }} contentContainerStyle={[styles.card, { gap: 16 }]}>
          <Text style={styles.heading}>{label}</Text>
          <View style={styles.spread}><IconButton name="back" label="Previous month" onPress={() => changeMonth(-1)} />
            <Text style={styles.heading}>{new Date(Date.UTC(date.year, date.month, 1)).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' })}</Text>
            <IconButton name="arrow" label="Next month" onPress={() => changeMonth(1)} /></View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <Text key={`label-${index}`} style={[styles.small, { width: '14.2857%', textAlign: 'center', paddingBottom: 8 }]}>{day}</Text>)}
            {Array.from({ length: offset + days }, (_, index) => index - offset + 1).map((day, index) => day < 1
              ? <View key={index} style={{ width: '14.2857%', height: 44 }} />
              : <Pressable key={index} accessibilityRole="button" accessibilityLabel={`${day}`} accessibilityState={{ selected: date.day === day }} onPress={() => setDate({ ...date, day })}
                style={{ width: '14.2857%', minHeight: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: date.day === day ? colors.green : colors.white }}>
                <Text style={{ color: date.day === day ? colors.white : colors.ink, fontWeight: '600' }}>{day}</Text></Pressable>)}
          </View>
          <View style={styles.row}><View style={{ flex: 1 }}><Field label="Hour (00–23)" value={hour} onChangeText={setHour} keyboardType="number-pad" maxLength={2} /></View>
            <View style={{ flex: 1 }}><Field label="Minute (00–59)" value={minute} onChangeText={setMinute} keyboardType="number-pad" maxLength={2} /></View></View>
          {error ? <Notice message={error} error /> : null}
          <Button title="Set date & time" onPress={save} />
          {!required && value ? <Button secondary title="Remove scheduled date" onPress={() => { onChange(null); setOpen(false); }} /> : null}
          <Button secondary title="Cancel" onPress={() => setOpen(false)} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  </View>;
}
