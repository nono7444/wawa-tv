// API publique de Twitch (GraphQL), la même que le site twitch.tv.
// Aucun compte ni clé secrète : on utilise l'identifiant public du lecteur web.
const GQL = 'https://gql.twitch.tv/gql';
export const WEB_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';
const DEVICE_ID = Array.from({ length: 32 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');

export type Stream = {
  id: string;
  title: string;
  viewersCount: number;
  previewImageURL: string;
  game: { id: string; name: string; displayName: string } | null;
  broadcaster: { id: string; login: string; displayName: string; profileImageURL: string } | null;
  freeformTags?: { name: string }[] | null;
};

export type Game = { id: string; name: string; displayName: string; boxArtURL: string; viewersCount: number | null };

export type Channel = {
  id: string;
  login: string;
  displayName: string;
  profileImageURL: string;
  stream: Stream | null;
};

const STREAM_FIELDS = `id title viewersCount previewImageURL(width: 640, height: 360)
  game { id name displayName }
  broadcaster { id login displayName profileImageURL(width: 70) }
  freeformTags { name }`;

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const run = async (q: string) => {
    const res = await fetch(GQL, {
      method: 'POST',
      headers: { 'Client-ID': WEB_CLIENT_ID, 'X-Device-Id': DEVICE_ID, 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ query: q, variables }),
    });
    if (!res.ok) throw new Error(`Twitch a répondu ${res.status}`);
    return (await res.json()) as { data?: T; errors?: { message: string }[] };
  };
  let json = await run(query);
  // Si Twitch refuse le champ des tags, on refait la requête sans lui
  if (json.errors?.length && query.includes('freeformTags')) json = await run(query.replace(/freeformTags \{ name \}/g, ''));
  if (!json.data) throw new Error(json.errors?.[0]?.message ?? 'Réponse vide de Twitch');
  return json.data;
}

type Edges<N> = { edges: { cursor?: string; node: N }[] | null; pageInfo?: { hasNextPage: boolean } } | null;
const nodes = <N,>(e: Edges<N>) => (e?.edges ?? []).map((x) => x.node).filter(Boolean);

export async function topStreams(after?: string) {
  const d = await gql<{ streams: Edges<Stream> }>(
    `query($after: Cursor) { streams(first: 30, after: $after) { edges { cursor node { ${STREAM_FIELDS} } } pageInfo { hasNextPage } } }`,
    { after: after ?? null },
  );
  const edges = d.streams?.edges ?? [];
  return { items: nodes(d.streams), next: d.streams?.pageInfo?.hasNextPage ? edges[edges.length - 1]?.cursor : undefined };
}

export async function topGames() {
  const d = await gql<{ games: Edges<Game> }>(
    `query { games(first: 60) { edges { node { id name displayName boxArtURL(width: 188, height: 250) viewersCount } } } }`,
  );
  return nodes(d.games);
}

export async function gameStreams(name: string) {
  const d = await gql<{ game: { displayName: string; streams: Edges<Stream> } | null }>(
    `query($name: String!) { game(name: $name) { displayName streams(first: 40) { edges { node { ${STREAM_FIELDS} } } } } }`,
    { name },
  );
  return nodes(d.game?.streams ?? null);
}

export async function searchChannels(q: string) {
  const d = await gql<{ searchUsers: Edges<Channel> }>(
    `query($q: String!) { searchUsers(userQuery: $q, first: 20) { edges { node { id login displayName profileImageURL(width: 70) stream { ${STREAM_FIELDS} } } } } }`,
    { q },
  );
  return nodes(d.searchUsers);
}

export async function searchGames(q: string) {
  const d = await gql<{ searchCategories: Edges<Game> }>(
    `query($q: String!) { searchCategories(query: $q, first: 10) { edges { node { id name displayName boxArtURL(width: 188, height: 250) viewersCount } } } }`,
    { q },
  );
  return nodes(d.searchCategories);
}

/** Infos des chaînes suivies (en direct ou non), par paquets de 50. */
export async function channels(logins: string[]): Promise<Channel[]> {
  const out: Channel[] = [];
  for (let i = 0; i < logins.length; i += 50) {
    const d = await gql<{ users: (Channel | null)[] }>(
      `query($logins: [String!]) { users(logins: $logins) { id login displayName profileImageURL(width: 70) stream { ${STREAM_FIELDS} } } }`,
      { logins: logins.slice(i, i + 50) },
    );
    out.push(...(d.users ?? []).filter((u): u is Channel => !!u));
  }
  return out;
}

/** Adresse officielle de la vidéo (sans proxy) : jeton de lecture + serveur Usher de Twitch. */
export async function officialPlaylistUrl(login: string) {
  const d = await gql<{ streamPlaybackAccessToken: { value: string; signature: string } | null }>(
    `query($login: String!) { streamPlaybackAccessToken(channelName: $login, params: { platform: "web", playerBackend: "mediaplayer", playerType: "site" }) { value signature } }`,
    { login },
  );
  const t = d.streamPlaybackAccessToken;
  if (!t) throw new Error('Chaîne introuvable');
  const p = new URLSearchParams({
    client_id: WEB_CLIENT_ID,
    token: t.value,
    sig: t.signature,
    allow_source: 'true',
    allow_audio_only: 'true',
    fast_bread: 'true',
    player_backend: 'mediaplayer',
    playlist_include_framerate: 'true',
    supported_codecs: 'avc1',
    p: String(Math.floor(Math.random() * 1e7)),
  });
  return `https://usher.ttvnw.net/api/channel/hls/${encodeURIComponent(login.toLowerCase())}.m3u8?${p}`;
}
