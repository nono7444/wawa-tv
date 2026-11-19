import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { Stream } from './twitch';

export type Proxy = { id: string; name: string; url: string; enabled: boolean; lastTest?: { ok: boolean; ms: number; at: number } };

const P = 'allow_source=true&allow_audio_only=true&fast_bread=true';
// Même liste par défaut que le script proxyivshook (4 actifs, 8 en réserve)
export const DEFAULT_PROXIES: Proxy[] = [
  { id: 'lum-eu', name: 'Luminous EU', url: `https://eu.luminous.dev/live/{channel}?${P}`, enabled: true },
  { id: 'lum-eu2', name: 'Luminous EU 2', url: `https://eu2.luminous.dev/live/{channel}?${P}`, enabled: true },
  { id: 'pp-eu5', name: 'Perfprod EU 5', url: `https://lb-eu5.cdn-perfprod.com/live/{channel}?${P}`, enabled: true },
  { id: 'nadeko', name: 'Nadeko', url: `https://twitch-al.nadeko.net/live/{channel}?${P}`, enabled: true },
  { id: 'lum-eu3', name: 'Luminous EU 3', url: `https://eu3.luminous.dev/live/{channel}?${P}`, enabled: false },
  { id: 'pp-eu', name: 'Perfprod EU', url: `https://lb-eu.cdn-perfprod.com/live/{channel}?${P}`, enabled: false },
  { id: 'pp-eu2', name: 'Perfprod EU 2', url: `https://lb-eu2.cdn-perfprod.com/live/{channel}?${P}`, enabled: false },
  { id: 'pp-eu3', name: 'Perfprod EU 3', url: `https://lb-eu3.cdn-perfprod.com/live/{channel}?${P}`, enabled: false },
  { id: 'pp-eu4', name: 'Perfprod EU 4', url: `https://lb-eu4.cdn-perfprod.com/live/{channel}?${P}`, enabled: false },
  { id: 'pp-na', name: 'Perfprod NA', url: `https://lb-na.cdn-perfprod.com/live/{channel}?${P}`, enabled: false },
  { id: 'pp-as', name: 'Perfprod Asia', url: `https://lb-as.cdn-perfprod.com/live/{channel}?${P}`, enabled: false },
  { id: 'pp-sa', name: 'Perfprod SA', url: `https://lb-sa.cdn-perfprod.com/live/{channel}?${P}`, enabled: false },
];

export type Hidden = { channels: string[]; categories: string[]; keywords: string[] };

export type Settings = {
  follows: string[]; // logins en minuscules
  proxies: Proxy[];
  proxyOn: boolean;
  timeoutMs: number;
  fallback: boolean; // revenir à Twitch si aucun proxy ne répond
  hidden: Hidden;
  warm: number; // filtre lumière chaude, 0 à 0.6
  chatSize: number;
};

const DEFAULTS: Settings = {
  follows: [],
  proxies: DEFAULT_PROXIES,
  proxyOn: true,
  timeoutMs: 4000,
  fallback: true,
  hidden: { channels: [], categories: [], keywords: [] },
  warm: 0,
  chatSize: 14,
};

const KEY = 'wawatv.settings.v1';

type Ctx = {
  ready: boolean;
  s: Settings;
  set: (patch: Partial<Settings> | ((s: Settings) => Partial<Settings>)) => void;
  isFollowed: (login: string) => boolean;
  toggleFollow: (login: string) => void;
};

const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [s, setS] = useState<Settings>(DEFAULTS);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw) as Partial<Settings>;
          setS({ ...DEFAULTS, ...saved, hidden: { ...DEFAULTS.hidden, ...saved.hidden } });
        }
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});
  }, [s]);

  const set = useCallback<Ctx['set']>((patch) => setS((old) => ({ ...old, ...(typeof patch === 'function' ? patch(old) : patch) })), []);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      s,
      set,
      isFollowed: (login) => s.follows.includes(login.toLowerCase()),
      toggleFollow: (login) =>
        set((o) => {
          const l = login.toLowerCase();
          return { follows: o.follows.includes(l) ? o.follows.filter((x) => x !== l) : [...o.follows, l] };
        }),
    }),
    [ready, s, set],
  );

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

export function useSettings() {
  const c = useContext(SettingsCtx);
  if (!c) throw new Error('SettingsProvider manquant');
  return c;
}

/** Contenus masqués (chaînes, catégories, mots-clés dans le titre ou les tags). */
export function isHidden(st: Stream, h: Hidden) {
  const login = st.broadcaster?.login?.toLowerCase() ?? '';
  if (h.channels.includes(login)) return true;
  const game = (st.game?.name ?? '').toLowerCase();
  if (game && h.categories.some((c) => c.toLowerCase() === game)) return true;
  if (h.keywords.length) {
    const text = `${st.title ?? ''} ${(st.freeformTags ?? []).map((t) => t.name).join(' ')}`.toLowerCase();
    if (h.keywords.some((k) => k && text.includes(k.toLowerCase()))) return true;
  }
  return false;
}
