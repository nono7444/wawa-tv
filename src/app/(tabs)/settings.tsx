import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenTitle } from '@/components/cards';
import { Row, Section, Stepper, SwitchRow } from '@/components/rows';
import { useSettings } from '@/lib/store';
import { C } from '@/lib/theme';

export default function Settings() {
  const { s, set } = useSettings();
  const active = s.proxies.filter((p) => p.enabled).length;
  const hiddenCount = s.hidden.channels.length + s.hidden.categories.length + s.hidden.keywords.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <ScreenTitle>Réglages</ScreenTitle>

        <Section title="Lecture sans pubs" footer="Les directs passent par des proxys en Europe, où Twitch ne met pas de pubs. Si aucun ne répond, Wawa TV revient au lecteur officiel (avec pubs).">
          <SwitchRow icon="shield-checkmark-outline" label="Utiliser les proxys" value={s.proxyOn} onChange={(v) => set({ proxyOn: v })} />
          <Row icon="server-outline" label="Proxys" value={`${active} actif${active > 1 ? 's' : ''}`} onPress={() => router.push('/proxies')} />
        </Section>

        <Section title="Contenus">
          <Row icon="eye-off-outline" label="Contenus masqués" value={hiddenCount ? String(hiddenCount) : 'Aucun'} onPress={() => router.push('/hidden')} />
          <Row icon="grid-outline" label="Multi-stream" onPress={() => router.push('/multi')} />
        </Section>

        <Section title="Affichage" footer="Le filtre chaud se règle aussi avec le bouton soleil dans le lecteur.">
          <Row
            icon="sunny-outline"
            label="Filtre lumière chaude"
            right={<Stepper value={`${Math.round(s.warm * 100)} %`} onMinus={() => set({ warm: Math.max(0, +(s.warm - 0.15).toFixed(2)) })} onPlus={() => set({ warm: Math.min(0.6, +(s.warm + 0.15).toFixed(2)) })} />}
          />
          <Row
            icon="text-outline"
            label="Taille du chat"
            right={<Stepper value={String(s.chatSize)} onMinus={() => set({ chatSize: Math.max(11, s.chatSize - 1) })} onPlus={() => set({ chatSize: Math.min(22, s.chatSize + 1) })} />}
          />
        </Section>

        <Section title="Chaînes suivies" footer="Tes chaînes suivies sont gardées sur ce téléphone, sans compte Twitch.">
          <Row icon="heart-outline" label="Chaînes suivies" value={String(s.follows.length)} />
          <Row
            icon="trash-outline"
            label="Tout effacer"
            danger
            onPress={() =>
              Alert.alert('Ne plus suivre personne ?', 'La liste de tes chaînes suivies sera vidée.', [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Effacer', style: 'destructive', onPress: () => set({ follows: [] }) },
              ])
            }
          />
        </Section>

        <Text style={{ color: C.textFaint, textAlign: 'center', fontSize: 12 }}>Wawa TV {Constants.expoConfig?.version ?? ''}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
