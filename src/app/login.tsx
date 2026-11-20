import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Section } from '@/components/rows';
import { useAuth, type DeviceCode } from '@/lib/auth';
import { C, R } from '@/lib/theme';

/** Connexion au compte Twitch par code (twitch.tv/activate). */
export default function Login() {
  const { clientId, setClientId, session, start, poll, logout } = useAuth();
  const [id, setId] = useState(clientId);
  const [code, setCode] = useState<DeviceCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => setId(clientId), [clientId]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const begin = async () => {
    setError(null);
    setBusy(true);
    try {
      if (id.trim() !== clientId) setClientId(id);
      const d = await start();
      setCode(d);
      Linking.openURL(d.verification_uri).catch(() => {});
      // On demande à Twitch toutes les quelques secondes si tu as validé le code
      const deadline = Date.now() + d.expires_in * 1000;
      const tick = async () => {
        const r = await poll(d).catch(() => 'pending' as const);
        if (r === 'ok') {
          setCode(null);
          setBusy(false);
          router.back();
        } else if (r === 'pending' && Date.now() < deadline) timer.current = setTimeout(tick, Math.max(d.interval, 3) * 1000);
        else {
          setCode(null);
          setBusy(false);
          setError(r === 'denied' ? 'Connexion refusée sur Twitch.' : 'Le code a expiré, recommence.');
        }
      };
      timer.current = setTimeout(tick, Math.max(d.interval, 3) * 1000);
    } catch (e: any) {
      setBusy(false);
      setError(e?.message ?? String(e));
    }
  };

  if (session)
    return (
      <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: 16 }}>
        <Section footer="Tes chaînes suivies sur Twitch s’affichent dans l’onglet Suivis, et tu peux écrire dans le chat.">
          <View style={styles.me}>
            <Ionicons name="person-circle" size={44} color={C.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.big}>{session.login}</Text>
              <Text style={styles.dim}>Connecté à Twitch</Text>
            </View>
          </View>
        </Section>
        <Pressable style={[styles.btn, { backgroundColor: C.surfaceHigh }]} onPress={logout}>
          <Text style={[styles.btnText, { color: C.danger }]}>Se déconnecter</Text>
        </Pressable>
      </ScrollView>
    );

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      {code ? (
        <View style={styles.codeBox}>
          <Text style={styles.dim}>Sur la page Twitch qui s’est ouverte, entre ce code :</Text>
          <Text selectable style={styles.code}>
            {code.user_code}
          </Text>
          <Pressable style={styles.btn} onPress={() => Linking.openURL(code.verification_uri)}>
            <Text style={styles.btnText}>Ouvrir twitch.tv/activate</Text>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 14 }}>
            <ActivityIndicator color={C.accent} />
            <Text style={styles.dim}>En attente de ta validation…</Text>
          </View>
        </View>
      ) : (
        <>
          <Section
            title="Client ID Twitch"
            footer={
              'À créer une seule fois, gratuitement, sur dev.twitch.tv/console → « Register Your Application » :\n' +
              '• Nom : Wawa TV (ou ce que tu veux)\n' +
              '• OAuth Redirect URL : http://localhost\n' +
              '• Catégorie : Application Integration\n' +
              '• Type de client : Public\n' +
              'Copie ensuite le « Client ID » ici. Il reste sur ton téléphone.'
            }>
            <TextInput
              value={id}
              onChangeText={setId}
              placeholder="ex. abcd1234…"
              placeholderTextColor={C.textFaint}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Section>
          <Pressable style={[styles.btn, (!id.trim() || busy) && { opacity: 0.5 }]} disabled={!id.trim() || busy} onPress={begin}>
            <Text style={styles.btnText}>Se connecter avec Twitch</Text>
          </Pressable>
          <Pressable style={{ alignSelf: 'center', marginTop: 14 }} onPress={() => Linking.openURL('https://dev.twitch.tv/console/apps/create')}>
            <Text style={{ color: C.accent }}>Ouvrir dev.twitch.tv</Text>
          </Pressable>
        </>
      )}
      {error ? <Text style={styles.err}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: { color: C.text, fontSize: 15, paddingHorizontal: 14, paddingVertical: 13 },
  btn: { backgroundColor: C.accent, borderRadius: R.md, paddingVertical: 14, alignItems: 'center', marginHorizontal: 14 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  codeBox: { alignItems: 'center', padding: 20, gap: 10 },
  code: { color: C.text, fontSize: 40, fontWeight: '800', letterSpacing: 4, marginVertical: 10 },
  dim: { color: C.textDim, fontSize: 14, textAlign: 'center' },
  big: { color: C.text, fontSize: 18, fontWeight: '700' },
  me: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  err: { color: C.danger, textAlign: 'center', marginTop: 16, marginHorizontal: 20 },
});
