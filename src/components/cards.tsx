import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '@/lib/store';
import { C, formatViewers, R } from '@/lib/theme';
import type { Channel, Game, Stream } from '@/lib/twitch';

export const openStream = (login: string) => router.push({ pathname: '/watch/[login]', params: { login } });
export const openGame = (name: string) => router.push({ pathname: '/category/[name]', params: { name } });

/** Appui long : suivre, masquer la chaîne ou la catégorie (comme XtraATV). */
function useStreamMenu() {
  const { isFollowed, toggleFollow, set } = useSettings();
  return (st: Stream) => {
    const login = st.broadcaster?.login ?? '';
    const name = st.broadcaster?.displayName ?? login;
    const buttons: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
      { text: isFollowed(login) ? 'Ne plus suivre' : 'Suivre', onPress: () => toggleFollow(login) },
      {
        text: `Masquer ${name}`,
        style: 'destructive',
        onPress: () => set((o) => ({ hidden: { ...o.hidden, channels: [...new Set([...o.hidden.channels, login.toLowerCase()])] } })),
      },
    ];
    if (st.game?.name)
      buttons.push({
        text: `Masquer la catégorie ${st.game.displayName}`,
        style: 'destructive',
        onPress: () => set((o) => ({ hidden: { ...o.hidden, categories: [...new Set([...o.hidden.categories, st.game!.name])] } })),
      });
    buttons.push({ text: 'Annuler', style: 'cancel' });
    Alert.alert(name, st.title, buttons);
  };
}

export function StreamCard({ st }: { st: Stream }) {
  const menu = useStreamMenu();
  const login = st.broadcaster?.login ?? '';
  return (
    <Pressable style={styles.card} onPress={() => openStream(login)} onLongPress={() => menu(st)}>
      <View>
        <Image source={{ uri: `${st.previewImageURL}?t=${Math.floor(Date.now() / 120000)}` }} style={styles.thumb} contentFit="cover" transition={150} />
        <View style={styles.live}>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <View style={styles.viewers}>
          <Text style={styles.viewersText}>{formatViewers(st.viewersCount)} spectateurs</Text>
        </View>
      </View>
      <View style={styles.info}>
        <Image source={{ uri: st.broadcaster?.profileImageURL }} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {st.title}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {st.broadcaster?.displayName}
          </Text>
          {st.game ? (
            <Text style={styles.game} numberOfLines={1} onPress={() => openGame(st.game!.name)}>
              {st.game.displayName}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export function GameCard({ g, width }: { g: Game; width: number }) {
  return (
    <Pressable style={{ width }} onPress={() => openGame(g.name)}>
      <Image source={{ uri: g.boxArtURL }} style={{ width, height: width * 1.33, borderRadius: R.sm, backgroundColor: C.surface }} contentFit="cover" />
      <Text style={styles.gameName} numberOfLines={1}>
        {g.displayName}
      </Text>
      {g.viewersCount != null ? <Text style={styles.sub}>{formatViewers(g.viewersCount)} spectateurs</Text> : null}
    </Pressable>
  );
}

export function ChannelRow({ ch, right }: { ch: Channel; right?: ReactNode }) {
  return (
    <Pressable style={styles.chRow} onPress={() => openStream(ch.login)}>
      <Image source={{ uri: ch.profileImageURL }} style={[styles.avatarBig, ch.stream ? { borderColor: C.live, borderWidth: 2 } : null]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{ch.displayName}</Text>
        <Text style={styles.sub} numberOfLines={1}>
          {ch.stream ? `En direct · ${ch.stream.game?.displayName ?? ''} · ${formatViewers(ch.stream.viewersCount)}` : 'Hors ligne'}
        </Text>
      </View>
      {right}
    </Pressable>
  );
}

export function FollowButton({ login }: { login: string }) {
  const { isFollowed, toggleFollow } = useSettings();
  const on = isFollowed(login);
  return (
    <Pressable hitSlop={8} onPress={() => toggleFollow(login)} style={[styles.follow, on && { backgroundColor: C.surfaceHigh }]}>
      <Ionicons name={on ? 'heart' : 'heart-outline'} size={16} color={on ? C.accent : '#fff'} />
      <Text style={styles.followText}>{on ? 'Suivi' : 'Suivre'}</Text>
    </Pressable>
  );
}

export function Empty({ icon, text, loading }: { icon?: keyof typeof Ionicons.glyphMap; text: string; loading?: boolean }) {
  return (
    <View style={styles.empty}>
      {loading ? <ActivityIndicator color={C.accent} /> : <Ionicons name={icon ?? 'tv-outline'} size={40} color={C.textFaint} />}
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export function ScreenTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <Text style={styles.h1}>{children}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 14, marginBottom: 18 },
  thumb: { width: '100%', aspectRatio: 16 / 9, borderRadius: R.md, backgroundColor: C.surface },
  live: { position: 'absolute', top: 8, left: 8, backgroundColor: C.live, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  liveText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  viewers: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  viewersText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  info: { flexDirection: 'row', gap: 10, marginTop: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface },
  avatarBig: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.surface },
  title: { color: C.text, fontWeight: '700', fontSize: 14 },
  sub: { color: C.textDim, fontSize: 12.5, marginTop: 1 },
  game: { color: C.accent, fontSize: 12.5, marginTop: 1 },
  gameName: { color: C.text, fontWeight: '600', fontSize: 13, marginTop: 6 },
  chRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 9 },
  follow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.accent, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  followText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  emptyText: { color: C.textDim, textAlign: 'center', fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10 },
  h1: { color: C.text, fontSize: 30, fontWeight: '800' },
});
