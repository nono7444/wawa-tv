// Connexion à ton compte Twitch, par code (comme sur une télé) : l'appli affiche un code,
// tu le valides sur twitch.tv/activate. Aucun mot de passe ne passe par l'appli.
// Le jeton est rangé dans le trousseau sécurisé de l'iPhone, jamais dans le code ni dans Git.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const SCOPES = 'user:read:follows chat:read chat:edit';
const TOKEN_KEY = 'wawatv.twitch.token';
const CLIENT_KEY = 'wawatv.twitch.clientId';

export type Session = { access: string; refresh?: string; login: string; userId: string; displayName?: string };
export type DeviceCode = { device_code: string; user_code: string; verification_uri: string; expires_in: number; interval: number };

async function form(url: string, body: Record<string, string>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json: json as any };
}

async function validate(access: string) {
  const res = await fetch('https://id.twitch.tv/oauth2/validate', { headers: { Authorization: `OAuth ${access}` } });
  if (!res.ok) return null;
  return (await res.json()) as { login: string; user_id: string };
}

type Ctx = {
  clientId: string;
  setClientId: (id: string) => void;
  session: Session | null;
  start: () => Promise<DeviceCode>;
  poll: (d: DeviceCode) => Promise<'ok' | 'pending' | 'expired' | 'denied'>;
  logout: () => void;
  helix: <T>(path: string) => Promise<T>;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [clientId, setClientIdState] = useState('');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    (async () => {
      const id = (await AsyncStorage.getItem(CLIENT_KEY)) ?? '';
      setClientIdState(id);
      const raw = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
      if (raw) setSession(JSON.parse(raw));
    })().catch(() => {});
  }, []);

  const save = useCallback(async (s: Session | null) => {
    setSession(s);
    if (s) await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(s), { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
    else await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
  }, []);

  const setClientId = useCallback((id: string) => {
    const v = id.trim();
    setClientIdState(v);
    AsyncStorage.setItem(CLIENT_KEY, v).catch(() => {});
  }, []);

  const start = useCallback(async () => {
    if (!clientId) throw new Error('Ajoute d’abord ton Client ID Twitch');
    const r = await form('https://id.twitch.tv/oauth2/device', { client_id: clientId, scopes: SCOPES });
    if (!r.ok) throw new Error(r.json?.message ?? 'Twitch refuse ce Client ID (type « Public » ?)');
    return r.json as DeviceCode;
  }, [clientId]);

  const poll = useCallback<Ctx['poll']>(
    async (d) => {
      const r = await form('https://id.twitch.tv/oauth2/token', {
        client_id: clientId,
        scopes: SCOPES,
        device_code: d.device_code,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      });
      if (!r.ok) {
        const m = String(r.json?.message ?? '');
        if (/pending/i.test(m)) return 'pending';
        if (/denied/i.test(m)) return 'denied';
        return 'expired';
      }
      const v = await validate(r.json.access_token);
      if (!v) return 'expired';
      await save({ access: r.json.access_token, refresh: r.json.refresh_token, login: v.login, userId: v.user_id });
      return 'ok';
    },
    [clientId, save],
  );

  const refresh = useCallback(async () => {
    if (!session?.refresh) return null;
    const r = await form('https://id.twitch.tv/oauth2/token', { client_id: clientId, grant_type: 'refresh_token', refresh_token: session.refresh });
    if (!r.ok) return null;
    const next = { ...session, access: r.json.access_token, refresh: r.json.refresh_token ?? session.refresh };
    await save(next);
    return next;
  }, [session, clientId, save]);

  // API officielle de Twitch avec ton compte ; renouvelle le jeton s'il a expiré
  const helix = useCallback(
    async <T,>(path: string): Promise<T> => {
      if (!session) throw new Error('Non connecté');
      const go = (access: string) => fetch(`https://api.twitch.tv/helix/${path}`, { headers: { 'Client-ID': clientId, Authorization: `Bearer ${access}` } });
      let res = await go(session.access);
      if (res.status === 401) {
        const s = await refresh();
        if (!s) {
          await save(null);
          throw new Error('Connexion expirée, reconnecte-toi');
        }
        res = await go(s.access);
      }
      if (!res.ok) throw new Error(`Twitch a répondu ${res.status}`);
      return (await res.json()) as T;
    },
    [session, clientId, refresh, save],
  );

  const value = useMemo<Ctx>(() => ({ clientId, setClientId, session, start, poll, logout: () => save(null), helix }), [clientId, setClientId, session, start, poll, save, helix]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error('AuthProvider manquant');
  return c;
}

/** Toutes les chaînes que ton compte suit sur Twitch (logins). */
export async function twitchFollows(helix: Ctx['helix'], userId: string) {
  const out: string[] = [];
  let after = '';
  for (let i = 0; i < 20; i++) {
    const r = await helix<{ data: { broadcaster_login: string }[]; pagination?: { cursor?: string } }>(
      `channels/followed?user_id=${userId}&first=100${after ? `&after=${after}` : ''}`,
    );
    out.push(...r.data.map((x) => x.broadcaster_login.toLowerCase()));
    if (!r.pagination?.cursor) break;
    after = r.pagination.cursor;
  }
  return out;
}
