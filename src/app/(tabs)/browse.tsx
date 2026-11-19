import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Empty, GameCard, ScreenTitle, StreamCard } from '@/components/cards';
import { isHidden, useSettings } from '@/lib/store';
import { C } from '@/lib/theme';
import { topGames, topStreams, type Game, type Stream } from '@/lib/twitch';

export default function Browse() {
  const { s } = useSettings();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<'streams' | 'games'>('streams');
  const [streams, setStreams] = useState<Stream[] | null>(null);
  const [next, setNext] = useState<string | undefined>();
  const [games, setGames] = useState<Game[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setError(null);
    try {
      if (tab === 'streams') {
        const r = await topStreams();
        setStreams(r.items);
        setNext(r.next);
      } else setGames(await topGames());
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const more = async () => {
    if (!next) return;
    const cur = next;
    setNext(undefined);
    try {
      const r = await topStreams(cur);
      setStreams((old) => {
        const seen = new Set((old ?? []).map((x) => x.id));
        return [...(old ?? []), ...r.items.filter((x) => !seen.has(x.id))];
      });
      setNext(r.next);
    } catch {}
  };

  const refresh = (
    <RefreshControl
      tintColor={C.accent}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
    />
  );

  const header = (
    <View>
      <ScreenTitle>Parcourir</ScreenTitle>
      <View style={styles.seg}>
        {(['streams', 'games'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.segBtn, tab === t && styles.segOn]}>
            <Text style={[styles.segText, tab === t && { color: '#fff' }]}>{t === 'streams' ? 'Directs' : 'Catégories'}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const empty = error ? <Empty icon="cloud-offline-outline" text={`Impossible de joindre Twitch : ${error}`} /> : <Empty loading text="Chargement…" />;
  const hiddenGames = s.hidden.categories.map((c) => c.toLowerCase());
  const colW = (width - 14 * 2 - 12 * 2) / 3;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      {tab === 'streams' ? (
        <FlatList
          key="streams"
          data={(streams ?? []).filter((x) => !isHidden(x, s.hidden))}
          keyExtractor={(x) => x.id}
          renderItem={({ item }) => <StreamCard st={item} />}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          refreshControl={refresh}
          onEndReached={more}
          onEndReachedThreshold={0.6}
        />
      ) : (
        <FlatList
          key="games"
          data={(games ?? []).filter((g) => !hiddenGames.includes(g.name.toLowerCase()))}
          keyExtractor={(g) => g.id}
          numColumns={3}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 14, marginBottom: 16 }}
          renderItem={({ item }) => <GameCard g={item} width={colW} />}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          refreshControl={refresh}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', marginHorizontal: 14, marginBottom: 14, backgroundColor: C.surface, borderRadius: 10, padding: 3 },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segOn: { backgroundColor: C.accent },
  segText: { color: C.textDim, fontWeight: '600' },
});
