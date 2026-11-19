import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { SettingsProvider, useSettings } from '@/lib/store';
import { C } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, primary: C.accent, text: C.text, border: C.border } };

function Root() {
  const { ready } = useSettings();
  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, [ready]);
  if (!ready) return null;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="watch/[login]" />
      <Stack.Screen name="category/[name]" options={{ headerShown: true, title: '', headerBackTitle: 'Retour' }} />
      <Stack.Screen name="multi" />
      <Stack.Screen name="proxies" options={{ headerShown: true, title: 'Proxys sans pubs', headerBackTitle: 'Réglages' }} />
      <Stack.Screen name="hidden" options={{ headerShown: true, title: 'Contenus masqués', headerBackTitle: 'Réglages' }} />
    </Stack>
  );
}

export default function Layout() {
  return (
    <ThemeProvider value={theme}>
      <SettingsProvider>
        <StatusBar style="light" />
        <Root />
      </SettingsProvider>
    </ThemeProvider>
  );
}
