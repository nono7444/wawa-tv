import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FollowButton, openGame } from '@/components/cards';
import { ChatView } from '@/components/chat-view';
import { TwitchPlayer } from '@/components/twitch-player';
import { C, formatViewers } from '@/lib/theme';
import { channels, type Channel } from '@/lib/twitch';

export default function Watch() {
  useKeepAwake();
  const { login } = useLocalSearchParams<{ login: string }>();
  const [ch, setCh] = useState<Channel | null>(null);
  const [chatKey, setChatKey] = useState(0);

  useEffect(() => {
    channels([login]).then((r) => setCh(r[0] ?? null)).catch(() => {});
    // Infos (titre, spectateurs) rafraîchies chaque minute
    const t = setInterval(() => channels([login]).then((r) => r[0] && setCh(r[0])).catch(() => {}), 60000);
    return () => clearInterval(t);
  }, [login]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="chevron-down" size={26} color={C.text} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          {ch?.displayName ?? login}
        </Text>
        <Pressable hitSlop={10} onPress={() => setChatKey((n) => n + 1)}>
          <Ionicons name="chatbubbles-outline" size={20} color={C.textDim} />
        </Pressable>
      </View>
      <TwitchPlayer login={login} title={ch?.stream?.title} />
      <View style={styles.info}>
        <Image source={{ uri: ch?.profileImageURL }} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{ch?.displayName ?? login}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {ch?.stream?.title ?? (ch ? 'Hors ligne' : '')}
          </Text>
          {ch?.stream ? (
            <Text style={styles.meta}>
              <Text style={{ color: C.accent }} onPress={() => ch.stream?.game && openGame(ch.stream.game.name)}>
                {ch.stream.game?.displayName ?? ''}
              </Text>
              {`  ·  ${formatViewers(ch.stream.viewersCount)} spectateurs`}
            </Text>
          ) : null}
        </View>
        <FollowButton login={login} />
      </View>
      <View style={styles.sep} />
      <ChatView channel={login} restartKey={chatKey} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingBottom: 6 },
  topTitle: { flex: 1, color: C.text, fontWeight: '700', fontSize: 16 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.surface },
  name: { color: C.text, fontWeight: '700', fontSize: 15 },
  title: { color: C.textDim, fontSize: 13, marginTop: 1 },
  meta: { color: C.textDim, fontSize: 12, marginTop: 2 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: C.border },
});
