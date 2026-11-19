import { Ionicons } from '@expo/vector-icons';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { resolvePlayback, type Playback } from '@/lib/playback';
import { useSettings } from '@/lib/store';
import { C, R } from '@/lib/theme';

type Props = { login: string; title?: string; compact?: boolean; muted?: boolean; onToggleMute?: () => void };

/** Lecteur d'un direct Twitch : passe par les proxys, choix de la qualité, filtre chaud, relance. */
export function TwitchPlayer({ login, title, compact, muted, onToggleMute }: Props) {
  const { s, set } = useSettings();
  const [pb, setPb] = useState<Playback | null>(null);
  const [trying, setTrying] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [quality, setQuality] = useState('Auto');
  const [menu, setMenu] = useState(false);
  const [restart, setRestart] = useState(0);
  const settingsRef = useRef(s);
  settingsRef.current = s;

  const player = useVideoPlayer(null, (p) => {
    p.staysActiveInBackground = true;
    p.showNowPlayingNotification = !compact;
  });

  const load = useCallback(
    async (uri: string) => {
      setLoading(true);
      try {
        await player.replaceAsync({ uri, contentType: 'hls', metadata: { title: title || login, artist: 'Wawa TV' } });
        player.play();
      } catch (e: any) {
        setError(e?.message ?? String(e));
      }
    },
    [player, title, login],
  );

  useEffect(() => {
    let alive = true;
    setError(null);
    setPb(null);
    setQuality('Auto');
    resolvePlayback(login, settingsRef.current, (n) => alive && setTrying(n))
      .then((r) => {
        if (!alive) return;
        setPb(r);
        load(r.url);
      })
      .catch((e) => alive && (setError(e?.message ?? String(e)), setLoading(false)));
    return () => {
      alive = false;
    };
  }, [login, restart, load]);

  useEffect(() => {
    player.muted = !!muted;
  }, [player, muted]);

  useEventListener(player, 'statusChange', ({ status, error: err }) => {
    if (status === 'readyToPlay') setLoading(false);
    else if (status === 'loading') setLoading(true);
    else if (status === 'error') {
      setLoading(false);
      setError(err?.message ?? 'Lecture impossible');
    }
  });

  const pick = (name: string, url: string) => {
    setMenu(false);
    setQuality(name);
    load(url);
  };

  const warmLevels = [0, 0.15, 0.3, 0.45, 0.6];
  const nextWarm = () => set({ warm: warmLevels[(warmLevels.indexOf(s.warm) + 1) % warmLevels.length] ?? 0 });

  return (
    <View style={styles.box}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        nativeControls={!compact}
        contentFit="contain"
        allowsPictureInPicture
        startsPictureInPictureAutomatically={!compact}
      />
      {s.warm > 0 ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(255,138,30,${s.warm * 0.55})` }]} /> : null}

      {loading && !error ? (
        <View style={styles.center} pointerEvents="none">
          <ActivityIndicator color="#fff" size="large" />
          {!pb && trying ? <Text style={styles.small}>Essai : {trying}…</Text> : null}
        </View>
      ) : null}

      {error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={34} color="#fff" />
          <Text style={styles.err}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => setRestart((n) => n + 1)}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.bar}>
        {pb ? (
          <View style={[styles.badge, { backgroundColor: pb.viaProxy ? 'rgba(48,209,88,0.85)' : 'rgba(255,69,58,0.85)' }]}>
            <Ionicons name={pb.viaProxy ? 'shield-checkmark' : 'shield-outline'} size={11} color="#fff" />
            <Text style={styles.badgeText}>{compact ? (pb.viaProxy ? 'Proxy' : 'Twitch') : pb.source}</Text>
          </View>
        ) : null}
        <View style={{ flex: 1 }} />
        {onToggleMute ? (
          <Pressable hitSlop={8} style={styles.btn} onPress={onToggleMute}>
            <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={16} color="#fff" />
          </Pressable>
        ) : null}
        <Pressable hitSlop={8} style={styles.btn} onPress={nextWarm}>
          <Ionicons name={s.warm > 0 ? 'sunny' : 'sunny-outline'} size={16} color={s.warm > 0 ? '#FFB340' : '#fff'} />
        </Pressable>
        {pb?.qualities.length ? (
          <Pressable hitSlop={8} style={styles.btn} onPress={() => setMenu(true)}>
            <Ionicons name="options-outline" size={16} color="#fff" />
          </Pressable>
        ) : null}
        <Pressable hitSlop={8} style={styles.btn} onPress={() => setRestart((n) => n + 1)}>
          <Ionicons name="refresh" size={16} color="#fff" />
        </Pressable>
      </View>

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenu(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Qualité</Text>
            <ScrollView>
              {[{ name: 'Auto', url: pb?.url ?? '' }, ...(pb?.qualities ?? [])].map((q) => (
                <Pressable key={q.name + q.url} style={styles.row} onPress={() => pick(q.name, q.url)}>
                  <Text style={styles.rowText}>{q.name}</Text>
                  {quality === q.name ? <Ionicons name="checkmark" size={18} color={C.accent} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', overflow: 'hidden' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  small: { color: '#fff', fontSize: 12, opacity: 0.8 },
  err: { color: '#fff', textAlign: 'center', fontSize: 13 },
  retry: { backgroundColor: C.accent, borderRadius: R.sm, paddingHorizontal: 14, paddingVertical: 7 },
  retryText: { color: '#fff', fontWeight: '600' },
  bar: { position: 'absolute', top: 6, left: 6, right: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  btn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, padding: 16, paddingBottom: 36, maxHeight: '60%' },
  sheetTitle: { color: C.text, fontSize: 17, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  rowText: { color: C.text, fontSize: 15 },
});
