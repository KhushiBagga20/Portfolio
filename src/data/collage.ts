// ─────────────────────────────────────────────
// The square-hole collage
//
// SWAP IN YOUR OWN ART:
//   1. Put your photo at        src/assets/collage/photo.jpg
//   2. Put your drawing at      src/assets/collage/illustration.png
//      (same canvas size as the photo, ideally traced over it, transparent background)
//   3. Nudge the holes below so they sit over your eyes, hands, etc.
//
// Coordinates use an 800 × 1000 grid (4:5), whatever your image resolution is.
// (cx, cy) = centre of the square, s = side length.
// ─────────────────────────────────────────────
import photo from '../assets/collage/photo.jpg';
import illustration from '../assets/collage/illustration.png';

export type Hole = { cx: number; cy: number; s: number };

export const collage = {
  photo: {
    src: photo,
    alt: 'A photo of Khushi (placeholder)',
    file: 'khushi_real.jpg',
  },
  illustration: {
    src: illustration,
    alt: 'A drawing of Khushi, traced over the same photo (placeholder)',
    file: 'khushi_drawn.png',
  },

  // Colour of the paper the drawing sits on (shows behind a transparent PNG).
  sheet: '#86b4f7',

  // Act 1: holes cut into the drawing. You see the photo through them.
  photoWindows: [
    { cx: 318, cy: 514, s: 150 }, // left eye
    { cx: 612, cy: 296, s: 118 }, // pencil + background
    { cx: 540, cy: 790, s: 172 }, // headphones
    { cx: 170, cy: 900, s: 108 }, // shoulder
  ] satisfies Hole[],

  // Act 3: the photo has taken over, and new windows show the drawing.
  drawingWindows: [
    { cx: 484, cy: 508, s: 142 }, // right eye
    { cx: 262, cy: 334, s: 112 }, // star clip
    { cx: 258, cy: 792, s: 160 }, // headphones
    { cx: 614, cy: 912, s: 118 }, // pixel heart
  ] satisfies Hole[],

  // The square that follows your cursor on desktop.
  lensSize: 136,
};
