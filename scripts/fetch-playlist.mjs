// Pulls a public Spotify playlist into src/data/playlist.json at build time.
//
//   npm run playlist
//
// Where the data comes from (both public, no credentials, no login):
//   • the playlist's embed page, for the track list
//   • Spotify's oEmbed endpoint, for each track's album art
//
// Covers are hotlinked from Spotify's CDN rather than copied into the repo, which is how
// Spotify expects their artwork to be used. Album art and recordings stay theirs.
//
// Heads up: the embed page's shape is Spotify's internal JSON, so a redesign on their side
// could break this script. It only runs when you ask it to, so the site keeps working on
// whatever playlist.json was last committed.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLAYLIST = process.env.PLAYLIST_ID ?? '1kMBWjQXu5W8u77h36J8jH';
const out = fileURLToPath(new URL('../src/data/playlist.json', import.meta.url));
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (res.status === 429) {
        await sleep(1500 * (i + 1));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === tries - 1) throw err;
      await sleep(600 * (i + 1));
    }
  }
}

// ── 1. the track list ─────────────────────────
console.log(`fetching playlist ${PLAYLIST}…`);
const page = await fetch(`https://open.spotify.com/embed/playlist/${PLAYLIST}`, { headers: { 'User-Agent': UA } });
if (!page.ok) throw new Error(`playlist page returned HTTP ${page.status} — is the playlist public?`);
const html = await page.text();
const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
if (!match) throw new Error("couldn't find the playlist data on the embed page (Spotify may have changed it)");

const entity = JSON.parse(match[1]).props.pageProps.state.data.entity;
const tracks = (entity.trackList ?? []).filter((t) => t.uri?.startsWith('spotify:track:') && t.isPlayable !== false);
if (!tracks.length) throw new Error('that playlist has no playable tracks');
console.log(`  "${entity.name}" — ${tracks.length} tracks`);

// ── 2. album art, reusing whatever we already have ──
let cache = {};
try {
  cache = Object.fromEntries(JSON.parse(readFileSync(out, 'utf8')).tracks.map((t) => [t.id, t.cover]));
} catch {}

const bigger = (url) => url.replace('ab67616d00001e02', 'ab67616d0000b273');
let fetched = 0;

async function coverFor(track) {
  const id = track.uri.split(':').pop();
  if (cache[id]) return cache[id];
  const data = await getJson(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${id}`).catch(() => null);
  fetched++;
  return data?.thumbnail_url ? bigger(data.thumbnail_url) : null;
}

// A few at a time: polite to Spotify, still quick.
const results = [];
const LANES = 5;
for (let i = 0; i < tracks.length; i += LANES) {
  const slice = tracks.slice(i, i + LANES);
  results.push(...(await Promise.all(slice.map(coverFor))));
  process.stdout.write(`\r  covers ${Math.min(i + LANES, tracks.length)}/${tracks.length}`);
}
console.log(`\n  ${fetched} fetched, ${tracks.length - fetched} already cached`);

// ── 3. write it out ───────────────────────────
const payload = {
  id: PLAYLIST,
  name: entity.name ?? 'playlist',
  url: `https://open.spotify.com/playlist/${PLAYLIST}`,
  cover: entity.coverArt?.sources?.[0]?.url ?? null,
  fetched: new Date().toISOString().slice(0, 10),
  tracks: tracks.map((t, i) => ({
    id: t.uri.split(':').pop(),
    uri: t.uri,
    title: t.title,
    artist: t.subtitle,
    duration: t.duration ?? null,
    cover: results[i] ?? null,
  })),
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(payload, null, 1)}\n`);
console.log(`saved ${payload.tracks.length} tracks → src/data/playlist.json`);
