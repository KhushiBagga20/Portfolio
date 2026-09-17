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

- Click or tap a coloured key, or **type the letter on your real keyboard**, to jump to that section.
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

## Where things live

| What | File |
| --- | --- |
| Words on the landing page | `src/data/site.ts` |
| Collage images + hole positions | `src/data/collage.ts` |
| Collage animation | `src/scripts/hero.ts`, `src/scripts/collage-math.ts` |
| Keyboard sections, layouts, cameras | `src/data/keyboard.ts` |
| Keyboard geometry | `src/scripts/iso.ts`, `src/scripts/keycap.ts` |
| Keyboard interactions + hello | `src/scripts/keyboard.ts` |
| Click sounds + mute toggle | `src/scripts/sound.ts`, `src/components/SoundToggle.astro` |
| Keyboard drawing | `src/components/KeyboardScene.astro`, `src/components/Garden.astro` |
| Section cards (placeholders) | `src/components/Sections.astro` |
| Colors, type, keycap buttons | `src/styles/global.css` |

## Next up

- [ ] Real photo + drawing
- [ ] Real content for about, projects, skills, writing, experience, contact (no invented entries)
- [ ] Collage squares dropping down into the keyboard as keycaps
- [ ] Blender props rendered as images (monitor, floppy disk, mouse)
