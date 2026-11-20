// Le cœur de Wawa TV : la même idée que le script proxyivshook, mais sans « pirater » le lecteur.
// On demande la playlist vidéo à chaque proxy actif, dans l'ordre ; le premier qui renvoie
// une vraie playlist HLS gagne. Sinon, on revient à l'adresse officielle de Twitch.
import type { Proxy, Settings } from './store';
import { officialPlaylistUrl } from './twitch';

export type Quality = { name: string; url: string; height?: number };
export type Playback = { url: string; source: string; viaProxy: boolean; qualities: Quality[]; triedMs: number; failures: string[] };

/** Raison lisible d'un échec (délai dépassé, réponse du serveur, pas de réseau…). */
export function reason(e: any, timeoutMs: number) {
  const m = String(e?.message ?? e);
  if (e?.name === 'AbortError' || /abort/i.test(m)) return `pas de réponse en ${timeoutMs / 1000} s`;
  if (/network request failed/i.test(m)) return 'connexion impossible';
  return m;
}

const isPlaylist = (txt: string) => txt.includes('#EXTM3U') || txt.includes('#EXT-X-');

async function fetchText(url: string, timeoutMs: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' } as RequestInit);
    const txt = await res.text();
    if (!res.ok) throw new Error(`le serveur répond ${res.status}${txt ? ` (${txt.slice(0, 60).replace(/\s+/g, ' ')})` : ''}`);
    return txt;
  } finally {
    clearTimeout(t);
  }
}

export const proxyUrl = (p: Proxy, channel: string) => p.url.replace('{channel}', encodeURIComponent(channel.toLowerCase()));

/** Qualités disponibles (1080p60, 720p60, audio…) lues dans la playlist principale. */
export function parseQualities(master: string, base: string): Quality[] {
  const lines = master.split('\n').map((l) => l.trim());
  const out: Quality[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('#EXT-X-STREAM-INF')) continue;
    const url = lines.slice(i + 1).find((l) => l && !l.startsWith('#'));
    if (!url) continue;
    const video = /VIDEO="([^"]+)"/.exec(lines[i])?.[1];
    const res = /RESOLUTION=\d+x(\d+)/.exec(lines[i])?.[1];
    const fps = /FRAME-RATE=([\d.]+)/.exec(lines[i])?.[1];
    // Twitch donne le joli nom (« 1080p60 (source) ») dans la ligne #EXT-X-MEDIA du même groupe
    const media = video ? lines.find((l) => l.startsWith('#EXT-X-MEDIA') && l.includes(`GROUP-ID="${video}"`)) : undefined;
    let name = (media && /NAME="([^"]+)"/.exec(media)?.[1]) || (res ? `${res}p${fps && Math.round(+fps) > 30 ? Math.round(+fps) : ''}` : video || 'Audio');
    if (video === 'audio_only') name = 'Audio seul';
    let abs = url;
    try {
      abs = new URL(url, base).toString();
    } catch {}
    if (!out.some((q) => q.url === abs)) out.push({ name, url: abs, height: res ? +res : 0 });
  }
  return out.sort((a, b) => (b.height ?? 0) - (a.height ?? 0));
}

export async function resolvePlayback(channel: string, s: Settings, onTry?: (name: string) => void): Promise<Playback> {
  const t0 = Date.now();
  const failures: string[] = [];
  if (s.proxyOn) {
    for (const p of s.proxies.filter((x) => x.enabled && x.url.includes('{channel}'))) {
      onTry?.(p.name);
      const url = proxyUrl(p, channel);
      try {
        const txt = await fetchText(url, s.timeoutMs);
        if (isPlaylist(txt)) return { url, source: p.name, viaProxy: true, qualities: parseQualities(txt, url), triedMs: Date.now() - t0, failures };
        failures.push(`${p.name} : réponse inattendue (${txt.slice(0, 40).replace(/\s+/g, ' ')})`);
      } catch (e) {
        failures.push(`${p.name} : ${reason(e, s.timeoutMs)}`);
      }
    }
    if (!s.fallback) throw new Error(`Aucun proxy n’a répondu :\n${failures.join('\n')}`);
  }
  onTry?.('Twitch');
  const url = await officialPlaylistUrl(channel);
  const txt = await fetchText(url, 10000);
  if (!isPlaylist(txt)) throw new Error('La chaîne n’est pas en direct');
  return { url, source: 'Twitch (avec pubs)', viaProxy: false, qualities: parseQualities(txt, url), triedMs: Date.now() - t0, failures };
}

/** Bouton « Tester » : temps de réponse de chaque proxy pour une chaîne en direct. */
export async function testProxy(p: Proxy, channel: string, timeoutMs: number) {
  const t0 = Date.now();
  try {
    const txt = await fetchText(proxyUrl(p, channel), timeoutMs);
    const ok = isPlaylist(txt);
    return { ok, ms: Date.now() - t0, at: Date.now(), error: ok ? undefined : `réponse inattendue (${txt.slice(0, 40).replace(/\s+/g, ' ')})`, channel };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, at: Date.now(), error: reason(e, timeoutMs), channel };
  }
}
