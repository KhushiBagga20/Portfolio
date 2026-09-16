// Shared by the server render (static first frame) and the browser (animation).
// A hole is a square on the 800 × 1000 artwork grid.

export const W = 800;
export const H = 1000;

export type Hole = { cx: number; cy: number; s: number };

export const FULL = 'full' as const;
export type MaskLayer = Hole | typeof FULL;

/**
 * Mask stack, top → bottom:
 *   [drawing windows…, drawing lens]  add       → the drawing shows *inside* these (act 3)
 *   [full sheet]                      subtract  → the sheet everywhere, minus everything below
 *   [photo windows…, photo lens]      add       → holes cut into the drawing (act 1)
 * Result: (sheet − photoWindows) ∪ drawingWindows. Overlapping holes merge cleanly.
 */
export function maskStatic(drawingCount: number, photoCount: number) {
  const total = drawingCount + 1 + photoCount;
  const image = Array(total).fill('linear-gradient(#000 0 0)').join(',');
  const composite = [...Array(drawingCount).fill('add'), 'subtract', ...Array(photoCount).fill('add')].join(',');
  const webkitComposite = [
    ...Array(drawingCount).fill('source-over'),
    'source-out',
    ...Array(photoCount).fill('source-over'),
  ].join(',');
  return { image, composite, webkitComposite };
}

/** Converts a hole to percentage mask-position / mask-size, so it scales with the frame for free. */
export function maskGeometry(layers: MaskLayer[]) {
  const pos: string[] = [];
  const size: string[] = [];
  for (const layer of layers) {
    if (layer === FULL) {
      pos.push('0% 0%');
      size.push('100% 100%');
      continue;
    }
    let s = Math.max(0, layer.s);
    if (Math.abs(W - s) < 0.05 || Math.abs(H - s) < 0.05) s += 0.1;
    const x = ((layer.cx - s / 2) / (W - s)) * 100;
    const y = ((layer.cy - s / 2) / (H - s)) * 100;
    pos.push(`${x.toFixed(3)}% ${y.toFixed(3)}%`);
    size.push(`${((s / W) * 100).toFixed(3)}% ${((s / H) * 100).toFixed(3)}%`);
  }
  return { position: pos.join(','), size: size.join(',') };
}
