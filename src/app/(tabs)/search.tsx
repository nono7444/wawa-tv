import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChannelRow, Empty, FollowButton, GameCard, ScreenTitle } from '@/components/cards';
import { C, R } from '@/lib/theme';
import { searchChannels, searchGames, type Channel, type Game } from '@/lib/twitch';

export default function Search() {
  const [q, setQ] = useState('');
  const [chs, setChs] = useState<Channel[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recherche automatique 400 ms après la dernière lettre tapée
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setChs([]);
      setGames([]);
      return;
    }
    let alive = true;
    const t = setTimeout(async () => {
      setBusy(true);
      setError(null);
      try {
        const [a, b] = await Promise.all([searchChannels(term), searchGames(term).catch(() => [])]);
        if (!alive) return;
        // Les chaînes en direct d'abord
        setChs(a.sort((x, y) => Number(!!y.stream) - Number(!!x.stream)));
        setGames(b);
      } catch (e: any) {
        if (alive) setError(e?.message ?? String(e));
      } finally {
        if (alive) setBusy(false);
      }
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScreenTitle>Recherche</ScreenTitle>
      <View style={styles.box}>
        <Ionicons name="search" size={18} color={C.textFaint} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Chaîne ou catégorie"
          placeholderTextColor={C.textFaint}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
        {error ? <Empty icon="cloud-offline-outline" text={error} /> : null}
        {busy && !chs.length ? <Empty loading text="Recherche…" /> : null}
        {games.length ? (
          <>
            <Text style={styles.section}>Catégories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 14 }}>
              {games.map((g) => (
                <GameCard key={g.id} g={g} width={100} />
              ))}
            </ScrollView>
          </>
        ) : null}
        {chs.length ? <Text style={styles.section}>Chaînes</Text> : null}
        {chs.map((c) => (
          <ChannelRow key={c.id} ch={c} right={<FollowButton login={c.login} />} />
        ))}
        {!busy && q.trim().length >= 2 && !chs.length && !games.length && !error ? <Empty icon="search-outline" text="Aucun résultat" /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 14, marginBottom: 8, backgroundColor: C.surface, borderRadius: R.md, paddingHorizontal: 12 },
  input: { flex: 1, color: C.text, fontSize: 16, paddingVertical: 11 },
  section: { color: C.textDim, fontWeight: '700', fontSize: 13, paddingHorizontal: 14, paddingTop: 16, paddingBottom: 8, textTransform: 'uppercase' },
});
