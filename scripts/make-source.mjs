// Source AltStore / FlareStore / SideStore pour la dernière build de Wawa TV.
// Usage : node scripts/make-source.mjs <version> <tag> <ipa>
import { statSync, writeFileSync } from 'node:fs';

const [version, tag, ipa = 'wawa-tv-unsigned.ipa'] = process.argv.slice(2);
const repo = process.env.GITHUB_REPOSITORY || 'nono7444/wawa-tv';
const size = statSync(ipa).size;
const date = new Date().toISOString();
const notes = (process.env.RELEASE_NOTES || '')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !/^(Co-Authored-By|Claude-Session|Merge branch)/i.test(l))
  .slice(0, 15)
  .join('\n');
const downloadURL = `https://github.com/${repo}/releases/download/${tag}/${ipa}`;
const iconURL = `https://raw.githubusercontent.com/${repo}/main/assets/images/icon.png`;

const app = {
  name: 'Wawa TV',
  bundleIdentifier: 'lol.wawanono.wawatv',
  developerName: 'Norman',
  subtitle: 'Twitch sans pubs',
  localizedDescription: 'Client Twitch perso : chaînes suivies, catégories, recherche, chat, multi-stream, contenus masqués et lecture via proxy sans pubs.',
  iconURL,
  tintColor: '#9146FF',
  category: 'entertainment',
  version,
  versionDate: date,
  downloadURL,
  size,
  versions: [{ version, buildVersion: version.split('.').pop(), date, size, downloadURL, minOSVersion: '16.4', localizedDescription: notes || `Build ${tag}` }],
  appPermissions: { entitlements: [], privacy: {} },
};

writeFileSync(
  'altstore.json',
  JSON.stringify(
    {
      name: 'Wawa TV',
      identifier: 'lol.wawanono.wawatv.source',
      sourceURL: `https://github.com/${repo}/releases/latest/download/altstore.json`,
      subtitle: 'Twitch sans pubs',
      iconURL,
      tintColor: '#9146FF',
      apps: [app],
      news: [],
    },
    null,
    2,
  ),
);
console.log(`altstore.json : Wawa TV ${version} → ${downloadURL} (${size} octets)`);
