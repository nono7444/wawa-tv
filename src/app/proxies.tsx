import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Row, Section, Stepper, SwitchRow } from '@/components/rows';
import { testProxy } from '@/lib/playback';
import { DEFAULT_PROXIES, useSettings, type Proxy } from '@/lib/store';
import { C, R } from '@/lib/theme';
import { channels, topStreams } from '@/lib/twitch';

/** Gestion des proxys : activer, ordre, ajout, suppression, délai, retour à Twitch, test (comme proxyivshook). */
export default function Proxies() {
  const { s, set } = useSettings();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);

  const update = (fn: (list: Proxy[]) => Proxy[]) => set((o) => ({ proxies: fn(o.proxies) }));
  const move = (i: number, d: number) =>
    update((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const c = [...l];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  const add = () => {
    if (!url.includes('{channel}')) return Alert.alert('Adresse invalide', 'L’adresse doit contenir {channel}, remplacé par le nom de la chaîne.');
    if (!/^https:\/\//.test(url.trim())) return Alert.alert('Adresse invalide', 'L’adresse doit commencer par https://');
    update((l) => [...l, { id: `custom-${Date.now()}`, name: name.trim() || 'Mon proxy', url: url.trim(), enabled: true }]);
    setName('');
    setUrl('');
  };

  // Test sur une chaîne suivie en direct, sinon sur le plus gros direct du moment
  const runTest = async () => {
    setTesting(true);
    try {
      let login: string | undefined;
      if (s.follows.length) login = (await channels(s.follows)).find((c) => c.stream)?.login;
      if (!login) login = (await topStreams()).items[0]?.broadcaster?.login;
      if (!login) throw new Error('Aucun direct trouvé pour tester');
      const results = await Promise.all(s.proxies.filter((p) => p.enabled).map(async (p) => [p.id, await testProxy(p, login!, s.timeoutMs)] as const));
      const map = Object.fromEntries(results);
      update((l) => l.map((p) => (map[p.id] ? { ...p, lastTest: map[p.id] } : p)));
    } catch (e: any) {
      Alert.alert('Test impossible', e?.message ?? String(e));
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <Section footer="Les proxys actifs sont essayés dans l’ordre ; le premier qui renvoie une playlist vidéo est utilisé.">
        <SwitchRow icon="shield-checkmark-outline" label="Utiliser les proxys" value={s.proxyOn} onChange={(v) => set({ proxyOn: v })} />
        <SwitchRow icon="return-down-back-outline" label="Revenir à Twitch si aucun ne répond" value={s.fallback} onChange={(v) => set({ fallback: v })} />
        <Row
          icon="timer-outline"
          label="Délai par proxy"
          right={<Stepper value={`${s.timeoutMs / 1000} s`} onMinus={() => set({ timeoutMs: Math.max(2000, s.timeoutMs - 1000) })} onPlus={() => set({ timeoutMs: Math.min(10000, s.timeoutMs + 1000) })} />}
        />
        <Row icon="speedometer-outline" label="Tester les proxys actifs" onPress={testing ? undefined : runTest} right={testing ? <ActivityIndicator color={C.accent} /> : undefined} />
      </Section>

      <Section title="Proxys">
        {s.proxies.map((p, i) => (
          <View key={p.id} style={styles.item}>
            <Switch value={p.enabled} onValueChange={(v) => update((l) => l.map((x) => (x.id === p.id ? { ...x, enabled: v } : x)))} trackColor={{ true: C.accent }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.url} numberOfLines={1}>
                {p.url.replace(/^https:\/\//, '').split('?')[0]}
              </Text>
              {p.lastTest ? (
                <Text style={{ color: p.lastTest.ok ? C.success : C.danger, fontSize: 11.5, marginTop: 2 }}>
                  {p.lastTest.ok ? `OK · ${p.lastTest.ms} ms` : `Échec · ${p.lastTest.ms} ms`}
                </Text>
              ) : null}
            </View>
            <Pressable hitSlop={6} onPress={() => move(i, -1)}>
              <Ionicons name="chevron-up" size={20} color={i === 0 ? C.textFaint : C.textDim} />
            </Pressable>
            <Pressable hitSlop={6} onPress={() => move(i, 1)}>
              <Ionicons name="chevron-down" size={20} color={i === s.proxies.length - 1 ? C.textFaint : C.textDim} />
            </Pressable>
            <Pressable
              hitSlop={6}
              onPress={() =>
                Alert.alert(`Supprimer ${p.name} ?`, undefined, [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Supprimer', style: 'destructive', onPress: () => update((l) => l.filter((x) => x.id !== p.id)) },
                ])
              }>
              <Ionicons name="trash-outline" size={18} color={C.danger} />
            </Pressable>
          </View>
        ))}
      </Section>

      <Section title="Ajouter un proxy" footer="Exemple : https://mon-proxy.fr/live/{channel}?allow_source=true">
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nom" placeholderTextColor={C.textFaint} />
        <TextInput style={styles.input} value={url} onChangeText={setUrl} placeholder="https://…/{channel}…" placeholderTextColor={C.textFaint} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        <Row icon="add-circle-outline" label="Ajouter" onPress={add} />
      </Section>

      <Section>
        <Row
          icon="refresh-outline"
          label="Remettre la liste par défaut"
          danger
          onPress={() =>
            Alert.alert('Remettre les proxys par défaut ?', 'Tes proxys ajoutés seront supprimés.', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Remettre', style: 'destructive', onPress: () => set({ proxies: DEFAULT_PROXIES, timeoutMs: 4000, fallback: true }) },
            ])
          }
        />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  name: { color: C.text, fontWeight: '600', fontSize: 14.5 },
  url: { color: C.textFaint, fontSize: 11.5, marginTop: 1 },
  input: { color: C.text, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.border, backgroundColor: C.surface, borderRadius: R.sm },
});
