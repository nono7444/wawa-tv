// Chat Twitch en lecture seule, sans compte : connexion anonyme au serveur IRC de Twitch.
import { useEffect, useRef, useState } from 'react';

export type Part = { text: string } | { emote: string; name: string };
export type ChatMsg = { id: string; user: string; color: string; parts: Part[]; system?: boolean };

const COLORS = ['#FF7F50', '#1E90FF', '#00FF7F', '#FFD700', '#FF69B4', '#9ACD32', '#DA70D6', '#5F9EA0', '#D2691E', '#B22222'];
const colorFor = (name: string) => COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

function parseTags(raw: string) {
  const out: Record<string, string> = {};
  for (const kv of raw.split(';')) {
    const i = kv.indexOf('=');
    out[kv.slice(0, i)] = kv.slice(i + 1).replace(/\\s/g, ' ');
  }
  return out;
}

/** Remplace les emotes (positions fournies par Twitch) par des images. */
function splitEmotes(text: string, emotes: string): Part[] {
  if (!emotes) return [{ text }];
  const chars = Array.from(text); // les positions comptent les caractères Unicode
  const spots: { start: number; end: number; id: string }[] = [];
  for (const e of emotes.split('/')) {
    const [id, ranges] = e.split(':');
    for (const r of (ranges ?? '').split(',')) {
      const [a, b] = r.split('-').map(Number);
      if (!Number.isNaN(a) && !Number.isNaN(b)) spots.push({ start: a, end: b, id });
    }
  }
  spots.sort((x, y) => x.start - y.start);
  const parts: Part[] = [];
  let pos = 0;
  for (const s of spots) {
    if (s.start > pos) parts.push({ text: chars.slice(pos, s.start).join('') });
    parts.push({ emote: `https://static-cdn.jtvnw.net/emoticons/v2/${s.id}/default/dark/2.0`, name: chars.slice(s.start, s.end + 1).join('') });
    pos = s.end + 1;
  }
  if (pos < chars.length) parts.push({ text: chars.slice(pos).join('') });
  return parts;
}

export type ChatAuth = { login: string; token: string } | null;

export function useChat(channel: string | null, restartKey = 0, auth: ChatAuth = null) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');
  const buffer = useRef<ChatMsg[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!channel) return;
    let ws: WebSocket | null = null;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    setMessages([]);
    buffer.current = [];

    // Les messages arrivent très vite sur les grosses chaînes : on rafraîchit l'écran 4 fois par seconde
    const flush = setInterval(() => {
      if (!buffer.current.length) return;
      const add = buffer.current;
      buffer.current = [];
      setMessages((old) => [...old, ...add].slice(-200));
    }, 250);

    const connect = () => {
      setStatus('connecting');
      ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
      wsRef.current = ws;
      ws.onopen = () => {
        ws?.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
        // Connecté : avec ton compte (tu peux écrire). Sinon : anonyme, en lecture seule.
        if (auth) {
          ws?.send(`PASS oauth:${auth.token}`);
          ws?.send(`NICK ${auth.login}`);
        } else {
          ws?.send('PASS SCHMOOPIIE');
          ws?.send(`NICK justinfan${Math.floor(10000 + Math.random() * 80000)}`);
        }
        ws?.send(`JOIN #${channel.toLowerCase()}`);
        setStatus('open');
        buffer.current.push({ id: `sys-${Date.now()}`, user: '', color: '', parts: [{ text: 'Bienvenue dans le chat !' }], system: true });
      };
      ws.onmessage = (ev) => {
        for (const line of String(ev.data).split('\r\n')) {
          if (!line) continue;
          if (line.startsWith('PING')) {
            ws?.send('PONG :tmi.twitch.tv');
            continue;
          }
          const notice = /NOTICE \S+ :(.*)$/.exec(line);
          if (notice) {
            buffer.current.push({ id: `n-${Date.now()}-${Math.random()}`, user: '', color: '', parts: [{ text: notice[1] }], system: true });
            continue;
          }
          const m = /^(?:@(\S+) )?:(\w+)!\S+ PRIVMSG #\S+ :(.*)$/.exec(line);
          if (!m) continue;
          const tags = m[1] ? parseTags(m[1]) : {};
          let text = m[3];
          const action = /^\u0001ACTION (.*)\u0001$/.exec(text);
          if (action) text = action[1];
          const user = tags['display-name'] || m[2];
          buffer.current.push({
            id: tags.id || `${Date.now()}-${Math.random()}`,
            user,
            color: tags.color || colorFor(user),
            parts: splitEmotes(text, tags.emotes ?? ''),
          });
        }
      };
      ws.onclose = () => {
        setStatus('closed');
        if (!stopped) retry = setTimeout(connect, 3000);
      };
      ws.onerror = () => ws?.close();
    };
    connect();

    return () => {
      stopped = true;
      wsRef.current = null;
      clearInterval(flush);
      if (retry) clearTimeout(retry);
      ws?.close();
    };
  }, [channel, restartKey, auth?.login, auth?.token]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || !auth || !channel || wsRef.current?.readyState !== 1) return false;
    wsRef.current.send(`PRIVMSG #${channel.toLowerCase()} :${t}`);
    // Twitch ne renvoie pas nos propres messages : on les ajoute nous-mêmes
    buffer.current.push({ id: `me-${Date.now()}`, user: auth.login, color: '#BF94FF', parts: [{ text: t }] });
    return true;
  };

  return { messages, status, canSend: !!auth, send };
}
