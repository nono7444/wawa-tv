import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList } from 'react-native';

import { Empty, StreamCard } from '@/components/cards';
import { isHidden, useSettings } from '@/lib/store';
import { C } from '@/lib/theme';
import { gameStreams, type Stream } from '@/lib/twitch';

export default function Category() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { s } = useSettings();
  const [list, setList] = useState<Stream[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    gameStreams(name).then(setList).catch((e) => setError(e?.message ?? String(e)));
  }, [name]);

  const data = (list ?? []).filter((x) => !isHidden(x, s.hidden));
  const title = list?.[0]?.game?.displayName ?? name;

  return (
    <>
      <Stack.Screen options={{ title }} />
      <FlatList
        style={{ backgroundColor: C.bg }}
        contentContainerStyle={{ paddingTop: 10 }}
        data={data}
        keyExtractor={(x) => x.id}
        renderItem={({ item }) => <StreamCard st={item} />}
        ListEmptyComponent={
          error ? <Empty icon="cloud-offline-outline" text={error} /> : list === null ? <Empty loading text="Chargement…" /> : <Empty text="Aucun direct dans cette catégorie" />
        }
      />
    </>
  );
}
