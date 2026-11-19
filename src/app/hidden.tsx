import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Section } from '@/components/rows';
import { useSettings, type Hidden } from '@/lib/store';
import { C } from '@/lib/theme';

const KINDS: { key: keyof Hidden; title: string; placeholder: string; help: string }[] = [
  { key: 'channels', title: 'Chaînes', placeholder: 'nom de la chaîne', help: 'Astuce : appui long sur un direct pour masquer sa chaîne ou sa catégorie.' },
  { key: 'categories', title: 'Catégories', placeholder: 'ex. Just Chatting', help: 'Nom exact de la catégorie, en anglais comme sur Twitch.' },
  { key: 'keywords', title: 'Mots-clés', placeholder: 'mot dans le titre ou les tags', help: 'Un direct est masqué si son titre ou un de ses tags contient ce mot.' },
];

/** Contenus masqués des listes Parcourir et Catégories (comme XtraATV 1.4.6). */
export default function HiddenScreen() {
  const { s, set } = useSettings();
  const [draft, setDraft] = useState<Record<string, string>>({});

  const add = (k: keyof Hidden) => {
    let v = (draft[k] ?? '').trim();
    if (!v) return;
    if (k === 'channels') v = v.toLowerCase().replace(/^@/, '');
    set((o) => ({ hidden: { ...o.hidden, [k]: [...new Set([...o.hidden[k], v])] } }));
    setDraft((d) => ({ ...d, [k]: '' }));
  };
  const remove = (k: keyof Hidden, v: string) => set((o) => ({ hidden: { ...o.hidden, [k]: o.hidden[k].filter((x) => x !== v) } }));

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      {KINDS.map((k) => (
        <Section key={k.key} title={k.title} footer={k.help}>
          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              value={draft[k.key] ?? ''}
              onChangeText={(t) => setDraft((d) => ({ ...d, [k.key]: t }))}
              placeholder={k.placeholder}
              placeholderTextColor={C.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={() => add(k.key)}
              returnKeyType="done"
            />
            <Pressable hitSlop={8} onPress={() => add(k.key)}>
              <Ionicons name="add-circle" size={26} color={C.accent} />
            </Pressable>
          </View>
          {s.hidden[k.key].map((v) => (
            <View key={v} style={styles.item}>
              <Text style={styles.text}>{v}</Text>
              <Pressable hitSlop={8} onPress={() => remove(k.key, v)}>
                <Ionicons name="close-circle" size={20} color={C.textFaint} />
              </Pressable>
            </View>
          ))}
        </Section>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  input: { flex: 1, color: C.text, fontSize: 15, paddingVertical: 12 },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  text: { flex: 1, color: C.text, fontSize: 15 },
});
