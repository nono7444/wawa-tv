import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatView } from '@/components/chat-view';
import { TwitchPlayer } from '@/components/twitch-player';
import { useSettings } from '@/lib/store';
import { C, R } from '@/lib/theme';
import { channels, type Channel } from '@/lib/twitch';

/** Multi-stream : deux directs l'un au-dessus de l'autre, un seul chat avec bouton d'échange (comme XtraATV). */
export default function Multi() {
  useKeepAwake();
  const { s } = useSettings();
  const [live, setLive] = useState<Channel[]>([]);
  const [pick, setPick] = useState<string[]>([]);
  const [sound, setSound] = useState(0); // quel direct a le son
  const [chat, setChat] = useState(0); // quel chat est affiché

  useEffect(() => {
    channels(s.follows)
      .then((r) => setLive(r.filter((c) => c.stream).sort((a, b) => (b.stream?.viewersCount ?? 0) - (a.stream?.viewersCount ?? 0))))
      .catch(() => {});
  }, [s.follows]);

  const ready = pick.length === 2;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Pressable hitSlop={10} onPress={() => (ready ? setPick([]) : router.back())}>
          <Ionicons name={ready ? 'swap-horizontal' : 'chevron-down'} size={24} color={C.text} />
        </Pressable>
        <Text style={styles.title}>{ready ? 'Multi-stream' : 'Choisis 2 directs'}</Text>
        {ready ? (
          <Pressable hitSlop={10} style={styles.swap} onPress={() => setChat((c) => 1 - c)}>
            <Ionicons name="chatbubbles-outline" size={16} color="#fff" />
            <Text style={styles.swapText}>Chat : {live.find((c) => c.login === pick[chat])?.displayName ?? pick[chat]}</Text>
          </Pressable>
        ) : null}
      </View>

      {ready ? (
        <>
          {pick.map((l, i) => (
            <TwitchPlayer key={l} login={l} compact muted={sound !== i} onToggleMute={() => setSound(i)} />
          ))}
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.border }} />
          <ChatView key={pick[chat]} channel={pick[chat]} />
        </>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 8 }}>
          {!live.length ? <Text style={{ color: C.textDim }}>Il faut au moins 2 chaînes suivies en direct.</Text> : null}
          {live.map((c) => {
            const on = pick.includes(c.login);
            return (
              <Pressable
                key={c.id}
                style={[styles.item, on && { borderColor: C.accent }]}
                onPress={() => setPick((p) => (on ? p.filter((x) => x !== c.login) : [...p, c.login].slice(-2)))}>
                <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={on ? C.accent : C.textFaint} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '700' }}>{c.displayName}</Text>
                  <Text style={{ color: C.textDim, fontSize: 12 }} numberOfLines={1}>
                    {c.stream?.game?.displayName} · {c.stream?.title}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingBottom: 8 },
  title: { flex: 1, color: C.text, fontWeight: '700', fontSize: 16 },
  swap: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.surfaceHigh, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, maxWidth: 190 },
  swapText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: R.md, padding: 12, borderWidth: 1, borderColor: 'transparent' },
});
