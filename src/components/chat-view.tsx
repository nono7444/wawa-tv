import { useEffect, useRef, useState } from 'react';
// Image native de React Native : la seule qui s'affiche au milieu d'un texte
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useChat, type ChatMsg } from '@/lib/chat';
import { useSettings } from '@/lib/store';
import { C } from '@/lib/theme';

function Line({ m, size }: { m: ChatMsg; size: number }) {
  if (m.system) return <Text style={[styles.sys, { fontSize: size - 1 }]}>{m.parts.map((p) => ('text' in p ? p.text : '')).join('')}</Text>;
  return (
    <Text style={[styles.line, { fontSize: size, lineHeight: size * 1.5 }]}>
      <Text style={{ color: m.color, fontWeight: '700' }}>{m.user}</Text>
      <Text style={{ color: C.textDim }}> : </Text>
      {m.parts.map((p, i) =>
        'text' in p ? (
          <Text key={i}>{p.text}</Text>
        ) : (
          <Image key={i} source={{ uri: p.emote }} style={{ width: size * 1.6, height: size * 1.6 }} accessibilityLabel={p.name} />
        ),
      )}
    </Text>
  );
}

/** Chat en direct (lecture seule) avec défilement automatique, mis en pause quand on remonte. */
export function ChatView({ channel, restartKey = 0 }: { channel: string; restartKey?: number }) {
  const { s } = useSettings();
  const { messages, status } = useChat(channel, restartKey);
  const list = useRef<FlatList<ChatMsg>>(null);
  const [follow, setFollow] = useState(true);

  useEffect(() => {
    if (follow && messages.length) requestAnimationFrame(() => list.current?.scrollToEnd({ animated: false }));
  }, [messages, follow]);

  return (
    <View style={styles.wrap}>
      {status !== 'open' ? <Text style={styles.status}>{status === 'connecting' ? 'Connexion au chat…' : 'Chat déconnecté, nouvelle tentative…'}</Text> : null}
      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <Line m={item} size={s.chatSize} />}
        contentContainerStyle={{ padding: 10 }}
        onScrollBeginDrag={() => setFollow(false)}
        onMomentumScrollEnd={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 40) setFollow(true);
        }}
      />
      {!follow ? (
        <Pressable style={styles.resume} onPress={() => setFollow(true)}>
          <Text style={styles.resumeText}>Reprendre le défilement</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  line: { color: C.text, marginBottom: 2 },
  sys: { color: C.textFaint, fontStyle: 'italic', marginBottom: 4 },
  status: { color: C.textFaint, fontSize: 12, textAlign: 'center', paddingTop: 6 },
  resume: { position: 'absolute', bottom: 12, alignSelf: 'center', backgroundColor: C.accent, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7 },
  resumeText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
