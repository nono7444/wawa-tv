import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { C, R } from '@/lib/theme';

export function Section({ title, children, footer }: { title?: string; children: ReactNode; footer?: string }) {
  return (
    <View style={{ marginBottom: 22 }}>
      {title ? <Text style={styles.sTitle}>{title}</Text> : null}
      <View style={styles.group}>{children}</View>
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

export function Row({ icon, label, value, onPress, right, danger }: { icon?: keyof typeof Ionicons.glyphMap; label: string; value?: string; onPress?: () => void; right?: ReactNode; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && onPress ? { backgroundColor: C.surfaceHigh } : null]}>
      {icon ? <Ionicons name={icon} size={19} color={danger ? C.danger : C.accent} /> : null}
      <Text style={[styles.label, danger && { color: C.danger }]}>{label}</Text>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={16} color={C.textFaint} /> : null)}
    </Pressable>
  );
}

export function SwitchRow({ icon, label, value, onChange }: { icon?: keyof typeof Ionicons.glyphMap; label: string; value: boolean; onChange: (v: boolean) => void }) {
  return <Row icon={icon} label={label} right={<Switch value={value} onValueChange={onChange} trackColor={{ true: C.accent }} />} />;
}

export function Stepper({ value, onMinus, onPlus }: { value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Pressable hitSlop={8} onPress={onMinus}>
        <Ionicons name="remove-circle-outline" size={24} color={C.accent} />
      </Pressable>
      <Text style={{ color: C.text, minWidth: 44, textAlign: 'center', fontWeight: '600' }}>{value}</Text>
      <Pressable hitSlop={8} onPress={onPlus}>
        <Ionicons name="add-circle-outline" size={24} color={C.accent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sTitle: { color: C.textDim, fontSize: 12.5, fontWeight: '700', textTransform: 'uppercase', marginLeft: 16, marginBottom: 6 },
  group: { backgroundColor: C.surface, borderRadius: R.md, marginHorizontal: 14, overflow: 'hidden' },
  footer: { color: C.textFaint, fontSize: 12, marginHorizontal: 16, marginTop: 6, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  label: { flex: 1, color: C.text, fontSize: 15 },
  value: { color: C.textDim, fontSize: 14 },
});
