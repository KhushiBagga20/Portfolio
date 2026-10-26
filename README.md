# khushi's little corner of the internet

Portfolio of Khushi Bagga. Astro + TypeScript, no animation or 3D libraries.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static site in dist/
```

## The idea

A scrapbook left inside a candy-colored computer from 1999. The square is the site's one motif:
windows in the collage → keys on the keyboard → section cards.

- **Ground:** periwinkle `#b9c6ff` with a faint white grid
- **Paper objects:** cream `#fff8ec` with ink `#1b1526` outlines and hard shadows
- **Accents:** lemon `#ffe14f` to highlight, tomato `#ff6a3d` to act, plus pink, lilac and mint on the keycaps
- **Type:** Bagel Fat One (big moments), Bricolage Grotesque (reading), Delicious Handrawn (notes), Silkscreen (tiny computer labels)

## 1. The collage (landing page)

Your photo sits at the bottom. Your drawing sits on top, with square holes cut in it by CSS masks.
While the hero is pinned, scrolling plays three acts: **look closer** (the photo drifts under the holes),
**open up** (the holes merge until the photo takes over), **swap** (new windows open in the photo and show the drawing).
On desktop, a square lens follows the cursor.

### Swapping in your own art

1. **Photo** → replace `src/assets/collage/photo.jpg` (portrait, 4:5, e.g. 1600×2000).
2. **Drawing** → replace `src/assets/collage/illustration.png`.
   Draw it **on top of your photo, on the same canvas size**, then export the drawing alone with a transparent background.
   That's what makes the holes line up.
3. **Holes** → edit `photoWindows` and `drawingWindows` in `src/data/collage.ts` (800×1000 grid).

## 2. The keyboard

A diagonal, extruded keyboard drawn as SVG by a tiny 2.5D engine (`src/scripts/iso.ts`):
an orthographic camera projects each key's base and top face, and the hull of the two becomes the key's body.

- Click or tap a coloured key (A about · P projects · S skills · M milestones · E experience · C contact), or **type the letter on your real keyboard**, to jump to that section.
- Keys press down and spring back; on desktop they lift on hover and the whole keyboard tilts with the cursor.
- The missing **G** key grew a garden. Hover (or tap) the watering can.
- **Spell `hello`** (click the keys or type them) and the keyboard ripples, plays a little tune, the garden blooms
  and a butterfly flies out. A tiny screen echoes what you type. The E key only jumps to its section when it isn't
  part of "he…", so spelling never gets interrupted. On phones, the ✦ key does the same (and ? drops a hint).
- **Click sounds** are synthesised live with Web Audio (`src/scripts/sound.ts`): no audio files.
  Bigger keys thock deeper. The speaker keycap in the nav mutes them, and the choice is remembered.
- Phones get their own 3×3 key pad instead of a shrunken keyboard.

Change which letters do what (label, link, colour) in `src/data/keyboard.ts`.
Camera angles, the popped-out key and the garden's position live in the same file.

## 3. Content (projects, milestones, about)

All content lives in data files, separate from the components that draw it:

| Content | File |
| --- | --- |
| Featured projects (floppy disks + case-study pages) and the archive | `src/data/projects.ts` |
| Milestones / achievements | `src/data/achievements.ts` |
| About text, education, communities, skill groups | `src/data/profile.ts` |
| Hero words, nav, contact links | `src/data/site.ts` |

Rules the site follows:

- Anything left out (a missing `oneLiner`, `role`, `stack`, section `body`, link…) shows a styled
  **"details coming soon"** instead of a guess. Fill the field in and it appears.
- Links (GitHub, demo, email, LinkedIn, résumé) only render once they're filled in.
- Each project's `todo` list is a private checklist and never shows on the site.
- Skills are grouped by hand in `profile.ts`; the "used in …" notes are worked out from project stacks.

Each featured project gets its own page at `/projects/<slug>/`. In browsers that support
cross-document view transitions, the floppy disk flies from the grid into the disk drive on that page.

## 4. Sharing, 404 and the little extras

- **Link preview image** (`public/og.png`): what LinkedIn/WhatsApp/iMessage show when the link is shared.
  It's a screenshot of the `/og/` page. After changing your photo, drawing or headline, run `npm run dev`
  and then `npm run og` to regenerate it. Once the site has a domain, set `site` in `astro.config.mjs`
  so previews use absolute URLs.
- **404 page**: `src/pages/404.astro` ("disk not found").
- **Reduced motion**: the collage doesn't play on scroll; "drawn / real / both" buttons switch it instead.
- **Contact** links and the résumé live in `src/data/site.ts` and `public/`.

## 5. The record room (`/music/`)

A turntable you can actually use, loaded from your public Spotify playlist. The deck is drawn
with the same 2.5D engine as the keyboard — brushed-metal chassis, stroboscopic dots, grooves,
a real tonearm — and Spotify's own embedded player does the streaming.

- **Pick a sleeve** and the record slides out, flies across the room, lands on the platter,
  the arm swings over and the platter winds up. Picking another reverses it first.
- **Controls:** start/stop (on the deck or the panel), previous, next, **shuffle** (anything
  from the playlist at random), **dig deeper** (refills the crate with a fresh handful),
  33⅓ / 45, and a pitch fader you can drag or nudge with arrow keys.
- **The platter follows the player.** Spotify reports what it's doing and the deck matches it,
  so the record is never spinning at something that isn't playing. When a track ends, the
  needle moves on by itself.
- **Speed and pitch move the platter only** — Spotify keeps its own tempo, and the page says so.
- **Spotify loads only once you pick a record**, so nothing third-party touches the page for
  someone just looking around. Full tracks play for signed-in Spotify listeners; everyone else
  gets the 30-second preview.
- **Reduced motion:** no flight and no spinning; the record simply appears on the platter.
- **Phones:** deck first, then controls, then a swipeable row of sleeves.

### Refreshing the playlist

```bash
npm run playlist        # re-reads the playlist into src/data/playlist.json
```

`scripts/fetch-playlist.mjs` reads two public Spotify endpoints — the playlist's embed page for
the track list, and the oEmbed endpoint for each track's album art. No account or API key needed,
as long as the playlist is public. Covers are hotlinked from Spotify's CDN rather than copied
into the repo, and no audio is ever stored here: the music stays Spotify's to serve.

To use a different playlist, change `PLAYLIST` in that script (or run it with
`PLAYLIST_ID=… npm run playlist`) and commit the regenerated JSON.

One caveat worth knowing: the track list comes from Spotify's own embed page, which is an
internal format they could change. If the script ever errors, the site keeps working on the
last committed `playlist.json` — only the refresh breaks.

## Where things live

| What | File |
| --- | --- |
| Page order | `src/pages/index.astro` |
| Case-study page | `src/pages/projects/[slug].astro` |
| Collage images + hole positions | `src/data/collage.ts` |
| Collage animation | `src/scripts/hero.ts`, `src/scripts/collage-math.ts` |
| Keyboard sections, layouts, cameras | `src/data/keyboard.ts` |
| Keyboard geometry | `src/scripts/iso.ts`, `src/scripts/keycap.ts` |
| Keyboard interactions + hello | `src/scripts/keyboard.ts` |
| Click sounds + mute toggle | `src/scripts/sound.ts`, `src/components/SoundToggle.astro` |
| Keyboard drawing | `src/components/KeyboardScene.astro`, `src/components/Garden.astro` |
| Sections | `About`, `Projects` (+ archive), `Milestones`, `Communities`, `Skills`, `Contact` in `src/components/` |
| Shared bits | `SectionHead`, `Badge`, `ComingSoon`, `FloppyDisk` in `src/components/` |
| Playlist data (generated) | `src/data/playlist.json` ← `scripts/fetch-playlist.mjs` |
| Record collection + sleeve tints | `src/data/music.ts` |
| Record room | `src/pages/music.astro`, `src/components/MusicRoom.astro` |
| Deck + sleeves | `src/components/Turntable.astro`, `src/components/Sleeve.astro` |
| Deck state machine + choreography | `src/scripts/turntable.ts` |
| Colors, type, keycap buttons, section spacing | `src/styles/global.css` |

## Next up

- [ ] Real photo + drawing
- [ ] Fill in the "coming soon" fields in `src/data/*.ts`
- [ ] Contact links in `src/data/site.ts`
- [ ] Collage squares dropping down into the keyboard as keycaps
- [ ] Blender props rendered as images (monitor, floppy disk, mouse)
