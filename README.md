# kai's little corner of the internet

Portfolio of Kai (Khushi Bagga). Astro + TypeScript, no animation libraries.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static site in dist/
```

## The idea

A scrapbook left inside a candy-colored computer from 1999. The square is the site's one motif:
windows in the collage → keys on the keyboard → (later) project cards.

- **Ground:** cream paper `#fff4e2` with a faint blue grid
- **World:** soft blue `#86b4f7`
- **Ink:** `#1b1526` for every outline
- **Accents, used sparingly:** yellow `#ffd23f`, pink `#ff5c9e`, purple `#7f52f5`, cyan `#38d1db`
- **Type:** Bagel Fat One (name, big moments), Bricolage Grotesque (reading), Delicious Handrawn (notes), Silkscreen (tiny computer labels)

## The collage (landing page)

Your photo sits at the bottom. Your drawing sits on top, with square holes cut in it by CSS masks.
While the hero is pinned, scrolling plays three acts:

1. **Look closer:** the holes stay put; the photo drifts and zooms under them.
2. **Open up:** the holes grow and merge until the photo takes over.
3. **Swap:** new windows open in the photo and show the drawing.

On desktop, a square lens follows the cursor so visitors can peek through themselves.
With reduced motion turned on, the collage stays still (act 1).

### Swapping in your own art

1. **Photo** → replace `src/assets/collage/photo.jpg` (portrait, 4:5, e.g. 1600×2000).
2. **Drawing** → replace `src/assets/collage/illustration.png`.
   - Draw it **on top of your photo, on the same canvas size**, then hide the photo layer and export with a transparent background.
   - That's what makes the holes line up: the drawn eye sits exactly over the real eye.
3. **Holes** → edit `photoWindows` and `drawingWindows` in `src/data/collage.ts`.
   Coordinates use an 800×1000 grid no matter what size your image is.
4. Different file type? Change the two `import` lines at the top of `src/data/collage.ts`.

Astro resizes and converts both images to WebP at build time, so big source files are fine.

## Where things live

| What | File |
| --- | --- |
| Words on the landing page | `src/data/site.ts` |
| Collage images + hole positions | `src/data/collage.ts` |
| Collage animation (acts, lens, intro) | `src/scripts/hero.ts` |
| Mask math | `src/scripts/collage-math.ts` |
| Landing layout (desktop + mobile) | `src/components/Hero.astro` |
| Stickers (star, sparkle, cursor…) | `src/components/Doodle.astro` |
| Colors, type, keycap buttons | `src/styles/global.css` |
| Keyboard placeholder | `src/components/NextUp.astro` |

## Next up

- [ ] Real photo + drawing
- [ ] The keyboard (built in code, not Blender): the collage's squares drop down and become keys
- [ ] About, projects, skills, writing, experience, contact (real content only, no invented entries)
- [ ] Blender props rendered as images (monitor, floppy disk, mouse)
