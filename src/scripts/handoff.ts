// The hand-off: as the hero scrolls away, six squares lift out of the collage and fly down
// into the keyboard, turning into its coloured keycaps.
//
// It only *reads* the collage (positions, images). The collage itself never changes.
// Desktop only, and off for reduced motion.
import { H, W, type Hole } from './collage-math';
import { sections, tones } from '../data/keyboard';

const BASE_SCALE = 1.04; // the collage layers' resting zoom (see hero.ts)

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function initHandoff() {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  const figure = document.querySelector<HTMLElement>('[data-collage]');
  const marks = figure?.querySelector<SVGSVGElement>('[data-marks]');
  const keyboard = document.getElementById('keyboard');
  const desk = keyboard?.querySelector<SVGSVGElement>('svg.kb--desk');
  if (!hero || !figure || !marks || !keyboard || !desk) return;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const wide = matchMedia('(min-width: 700px)');

  const config = JSON.parse(figure.dataset.config!) as { photoWindows: Hole[]; drawingWindows: Hole[] };
  const images = {
    drawing: figure.querySelector<HTMLImageElement>('[data-drawing] img')!,
    photo: figure.querySelector<HTMLImageElement>('[data-photo] img')!,
  };
  const sheetColor = figure.querySelector<HTMLElement>('[data-sheet]')!.style.getPropertyValue('--sheet') || '#86b4f7';

  // Which window lands on which key.
  const plan: { from: 'drawing' | 'photo'; hole: Hole; key: string }[] = [
    { from: 'drawing', hole: config.drawingWindows[1], key: 'A' },
    { from: 'drawing', hole: config.drawingWindows[0], key: 'E' },
    { from: 'drawing', hole: config.drawingWindows[2], key: 'S' },
    { from: 'drawing', hole: config.drawingWindows[3], key: 'C' },
    { from: 'photo', hole: config.photoWindows[0], key: 'M' },
    { from: 'photo', hole: config.photoWindows[1], key: 'P' },
  ];

  const layer = document.createElement('div');
  layer.className = 'handoff';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);

  const tiles = plan.map((p, i) => {
    const face = desk.querySelector<SVGRectElement>(`[data-key="${p.key}"] .k-face`);
    const section = sections.find((s) => s.key === p.key);
    const el = document.createElement('div');
    el.className = 'handoff__tile';
    const cap = document.createElement('div');
    cap.className = 'handoff__cap';
    cap.textContent = p.key;
    if (section) {
      cap.style.background = tones[section.tone][0];
      cap.style.color = tones[section.tone][3];
    }
    el.append(cap);
    layer.append(el);
    return { ...p, i, el, cap, face, landed: false, sized: false };
  });

  const paintSources = () => {
    for (const t of tiles) {
      if (!t.face) continue;
      const fw = t.face.width.baseVal.value;
      const fh = t.face.height.baseVal.value;
      // The image region under this window (the layers sit at a slight resting zoom).
      const s = t.hole.s / BASE_SCALE;
      const l = W / 2 + (t.hole.cx - t.hole.s / 2 - W / 2) / BASE_SCALE;
      const top = H / 2 + (t.hole.cy - t.hole.s / 2 - H / 2) / BASE_SCALE;
      const img = images[t.from];
      Object.assign(t.el.style, {
        width: `${fw}px`,
        height: `${fh}px`,
        backgroundColor: t.from === 'drawing' ? sheetColor : '#2a1e3a',
        backgroundImage: `url("${img.currentSrc || img.src}")`,
        backgroundSize: `${(W / s) * fw}px ${(H / s) * fh}px`,
        backgroundPosition: `${-(l / s) * fw}px ${-(top / s) * fh}px`,
      });
      t.sized = true;
    }
  };

  let raf = 0;
  let shown = false;
  let first = true; // don't bounce keys just because the page loaded mid-scroll

  function frame() {
    raf = 0;
    const active = wide.matches && !reduceMotion.matches;
    const vh = window.innerHeight;
    const progress = clamp((vh - keyboard!.getBoundingClientRect().top) / (vh * 0.85));

    if (!active || progress <= 0 || progress >= 1) {
      if (shown) {
        layer.classList.remove('is-on');
        shown = false;
      }
      if (progress >= 1) {
        for (const t of tiles) {
          if (!t.landed && !first) bump(t.key);
          t.landed = true;
        }
      } else {
        tiles.forEach((t) => (t.landed = false));
      }
      first = false;
      return;
    }

    if (!tiles[0].sized) paintSources();
    const from = marks!.getScreenCTM();
    if (!from) return;

    for (const t of tiles) {
      const to = t.face?.getScreenCTM();
      if (!to || !t.face) continue;
      const fw = t.face.width.baseVal.value;
      const fh = t.face.height.baseVal.value;
      const local = clamp((progress - t.i * 0.06) / 0.7);
      const k = inOut(local);

      // Start: the tile's box laid exactly over its window. End: exactly over the key's top face.
      const start = from
        .translate(t.hole.cx - t.hole.s / 2, t.hole.cy - t.hole.s / 2)
        .scale(t.hole.s / fw, t.hole.s / fh);
      const end = to.translate(t.face.x.baseVal.value, t.face.y.baseVal.value);
      const lift = Math.sin(Math.PI * k);
      const m = new DOMMatrix([
        lerp(start.a, end.a, k),
        lerp(start.b, end.b, k),
        lerp(start.c, end.c, k),
        lerp(start.d, end.d, k),
        lerp(start.e, end.e, k),
        lerp(start.f, end.f, k) - lift * 70,
      ])
        .translate(fw / 2, fh / 2)
        .scale(1 + lift * 0.18)
        .translate(-fw / 2, -fh / 2);

      t.el.style.transform = m.toString();
      t.el.style.opacity = local >= 1 ? '0' : '1';
      t.cap.style.opacity = String(clamp((k - 0.55) / 0.4));
      if (local >= 1 && !t.landed) bump(t.key);
      t.landed = local >= 1;
    }

    if (!shown) {
      layer.classList.add('is-on');
      shown = true;
    }
    first = false;
  }

  // A little landing bounce on the real key.
  function bump(key: string) {
    desk!.dispatchEvent(new CustomEvent('kb:bump', { detail: key }));
  }

  const request = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', () => {
    tiles.forEach((t) => (t.sized = false));
    request();
  });
  request();
}
