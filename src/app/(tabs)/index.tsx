import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChannelRow, Empty, ScreenTitle, StreamCard } from '@/components/cards';
import { twitchFollows, useAuth } from '@/lib/auth';
import { useSettings } from '@/lib/store';
import { C } from '@/lib/theme';
import { channels, type Channel } from '@/lib/twitch';

/** Chaînes suivies (gardées sur le téléphone, sans compte Twitch) : les directs d'abord. */
export default function Following() {
  const { s } = useSettings();
  const { session, helix } = useAuth();
  const [list, setList] = useState<Channel[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      // Chaînes suivies dans l'appli + celles de ton compte Twitch
      let logins = [...s.follows];
      if (session) {
        try {
          logins = [...new Set([...logins, ...(await twitchFollows(helix, session.userId))])];
        } catch (e: any) {
          setError(e?.message ?? String(e));
        }
      }
      setList(logins.length ? await channels(logins) : []);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }, [s.follows, session, helix]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const live = (list ?? []).filter((c) => c.stream).sort((a, b) => (b.stream?.viewersCount ?? 0) - (a.stream?.viewersCount ?? 0));
  const offline = (list ?? []).filter((c) => !c.stream).sort((a, b) => a.displayName.localeCompare(b.displayName));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <FlatList
        data={live}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <StreamCard st={{ ...item.stream!, broadcaster: { id: item.id, login: item.login, displayName: item.displayName, profileImageURL: item.profileImageURL } }} />}
        refreshControl={
          <RefreshControl
            tintColor={C.accent}
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListHeaderComponent={
          <ScreenTitle
            right={
              live.length >= 2 ? (
                <Pressable onPress={() => router.push('/multi')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="grid-outline" size={18} color={C.accent} />
                  <Text style={{ color: C.accent, fontWeight: '600' }}>Multi</Text>
                </Pressable>
              ) : undefined
            }>
            Suivis
          </ScreenTitle>
        }
        ListEmptyComponent={
          error ? (
            <Empty icon="cloud-offline-outline" text={`Impossible de joindre Twitch : ${error}`} />
          ) : list === null ? (
            <Empty loading text="Chargement…" />
          ) : !list.length ? (
            <Empty icon="heart-outline" text={'Tu ne suis encore personne.\nCherche une chaîne et touche « Suivre », ou connecte ton compte Twitch dans Réglages.'} />
          ) : (
            <Empty icon="moon-outline" text="Aucune chaîne suivie n'est en direct." />
          )
        }
        ListFooterComponent={
          offline.length ? (
            <View style={{ paddingBottom: 30 }}>
              <Text style={{ color: C.textDim, fontWeight: '700', fontSize: 13, paddingHorizontal: 14, paddingVertical: 8, textTransform: 'uppercase' }}>Hors ligne</Text>
              {offline.map((c) => (
                <ChannelRow key={c.id} ch={c} />
              ))}
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
