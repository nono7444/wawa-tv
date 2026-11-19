import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { C } from '@/lib/theme';

const icon =
  (name: keyof typeof Ionicons.glyphMap) =>
  ({ color, size }: { color: import('react-native').ColorValue; size: number }) => <Ionicons name={name} color={color as string} size={size} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.textFaint,
        tabBarStyle: { backgroundColor: C.bg, borderTopColor: C.border },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Suivis', tabBarIcon: icon('heart') }} />
      <Tabs.Screen name="browse" options={{ title: 'Parcourir', tabBarIcon: icon('compass') }} />
      <Tabs.Screen name="search" options={{ title: 'Recherche', tabBarIcon: icon('search') }} />
      <Tabs.Screen name="settings" options={{ title: 'Réglages', tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
