import { FULL, H, W, maskGeometry, type Hole, type MaskLayer } from './collage-math';

type Config = {
  photoWindows: Hole[];
  drawingWindows: Hole[];
  lensSize: number;
  files: [string, string, string];
};

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const range = (v: number, a: number, b: number) => clamp((v - a) / (b - a));
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const out = (t: number) => 1 - (1 - t) ** 3;
const outBack = (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;

const SVG_NS = 'http://www.w3.org/2000/svg';

/*
 * The collage plays in three acts while the stage is pinned:
 *   Act 1 (look closer)  the drawing holds still; the photo drifts and zooms under the holes.
 *   Act 2 (open up)      the holes grow and merge until the photo takes over.
 *   Act 3 (swap)         new windows open in the photo, showing the drawing.
 */
export function initHero(hero: HTMLElement) {
  const $ = <T extends Element>(sel: string) => hero.querySelector<T>(sel)!;
  const stage = $<HTMLElement>('[data-stage]');
  const figure = $<HTMLElement>('[data-collage]');
  const frame = $<HTMLElement>('[data-frame]');
  const photo = $<HTMLElement>('[data-photo]');
  const drawing = $<HTMLElement>('[data-drawing]');
  const sheet = $<HTMLElement>('[data-sheet]');
  const marks = $<SVGSVGElement>('[data-marks]');
  const fileLabel = $<HTMLElement>('[data-file]');
  const config: Config = JSON.parse(figure.dataset.config!);

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

  // Crop marks + a little cast shadow for every hole, so they read as real cut-outs.
  const makeMark = () => {
    const g = document.createElementNS(SVG_NS, 'g');
    const shade = document.createElementNS(SVG_NS, 'path');
    const lines = document.createElementNS(SVG_NS, 'path');
    shade.setAttribute('class', 'shade');
    lines.setAttribute('class', 'lines');
    lines.setAttribute('vector-effect', 'non-scaling-stroke');
    g.append(shade, lines);
    marks.append(g);
    return { g, shade, lines, key: '' };
  };
  type Mark = ReturnType<typeof makeMark>;
  const photoMarks = config.photoWindows.map(makeMark);
  const drawingMarks = config.drawingWindows.map(makeMark);
  const lensMark = makeMark();

  const drawMark = (m: Mark, h: Hole, opacity: number) => {
    if (h.s < 2 || opacity < 0.01) {
      if (m.key !== 'off') m.g.setAttribute('opacity', '0');
      m.key = 'off';
      return;
    }
    const { s } = h;
    const l = h.cx - s / 2;
    const t = h.cy - s / 2;
    const key = `${l.toFixed(1)}|${t.toFixed(1)}|${s.toFixed(1)}|${opacity.toFixed(2)}`;
    if (key === m.key) return;
    m.key = key;
    const e = 24;
    const d = Math.min(11, s * 0.08);
    m.g.setAttribute('opacity', opacity.toFixed(3));
    m.lines.setAttribute('d', `M${l - e} ${t}H${l + s + e}M${l - e} ${t + s}H${l + s + e}M${l} ${t - e}V${t + s + e}M${l + s} ${t - e}V${t + s + e}`);
    m.shade.setAttribute('d', `M${l} ${t}H${l + s}V${t + d}H${l + d}V${t + s}H${l}Z`);
  };

  const state = {
    p: 0,
    pTarget: 0,
    mx: 0,
    my: 0,
    mxTarget: 0,
    myTarget: 0,
    lens: { x: W / 2, y: H / 2, on: 0, xTarget: W / 2, yTarget: H / 2, onTarget: 0 },
    introAt: -1,
  };

  let raf = 0;
  let last = 0;
  let lastMask = '';
  let lastAct = '';
  let tilt = 0;

  const readScroll = () => {
    if (reduceMotion.matches) return (state.pTarget = 0);
    const rect = hero.getBoundingClientRect();
    const travel = rect.height - window.innerHeight;
    state.pTarget = travel > 0 ? clamp(-rect.top / travel) : 0;
  };

  const readTilt = () => {
    tilt = (parseFloat(getComputedStyle(figure).getPropertyValue('--tilt')) || 0) * (Math.PI / 180);
  };

  const introT = (i: number, delay: number, now: number) => {
    if (state.introAt < 0) return 0;
    if (reduceMotion.matches) return 1;
    return clamp((now - state.introAt - delay - i * 120) / 650);
  };

  function tick(now: number) {
    const dt = Math.min(64, last ? now - last : 16.7);
    last = now;
    const k = 1 - Math.pow(1 - 0.16, dt / 16.7);
    const kLens = 1 - Math.pow(1 - 0.22, dt / 16.7);

    state.p += (state.pTarget - state.p) * k;
    state.mx += (state.mxTarget - state.mx) * k;
    state.my += (state.myTarget - state.my) * k;
    const lens = state.lens;
    lens.x += (lens.xTarget - lens.x) * kLens;
    lens.y += (lens.yTarget - lens.y) * kLens;
    lens.on += (lens.onTarget - lens.on) * kLens;

    const p = state.p;
    const act1 = inOut(range(p, 0.02, 0.42));
    const act2 = range(p, 0.4, 0.7);
    const act3 = range(p, 0.7, 0.94);
    const settle = inOut(act2);

    // Layers: the photo wanders during act 1, then returns so the full photo lands nicely.
    const photoScale = lerp(lerp(1.04, 1.36, act1), 1.04, settle);
    const photoX = lerp(lerp(0, 4.5, act1), 0, settle);
    const photoY = lerp(lerp(0, -8, act1), 0, settle);
    const photoR = lerp(lerp(0, -3, act1), 0, settle);
    const drawScale = lerp(lerp(1.04, 1.1, act1), 1.04, settle);
    const drawY = lerp(lerp(0, 3.5, act1), 0, settle);
    const drawR = lerp(lerp(0, 1.5, act1), 0, settle);
    const px = state.mx * 7;
    const py = state.my * 6;
    photo.style.transform = `translate3d(calc(${photoX.toFixed(3)}% - ${px.toFixed(2)}px), calc(${photoY.toFixed(3)}% - ${py.toFixed(2)}px), 0) rotate(${photoR.toFixed(3)}deg) scale(${photoScale.toFixed(4)})`;
    drawing.style.transform = `translate3d(${(px * 0.6).toFixed(2)}px, calc(${drawY.toFixed(3)}% + ${(py * 0.6).toFixed(2)}px), 0) rotate(${drawR.toFixed(3)}deg) scale(${drawScale.toFixed(4)})`;

    // Holes.
    const photoHoles = config.photoWindows.map((h, i) => {
      const cover = 2 * Math.max(h.cx, W - h.cx, h.cy, H - h.cy) + 40;
      const grow = inOut(range(act2, i * 0.08, 0.7 + i * 0.08));
      return { cx: h.cx, cy: h.cy, s: lerp(h.s * outBack(introT(i, 350, now)), cover, grow) };
    });
    const drawingHoles = config.drawingWindows.map((h, i) => ({
      cx: h.cx,
      cy: h.cy,
      s: h.s * outBack(range(act3, i * 0.12, 0.55 + i * 0.12)),
    }));
    const lensSize = config.lensSize * out(clamp(lens.on));
    const lensInDrawing = p > 0.55;
    const lensHole = { cx: lens.x, cy: lens.y, s: lensSize };
    const none = { cx: lens.x, cy: lens.y, s: 0 };

    const layers: MaskLayer[] = [
      ...drawingHoles,
      lensInDrawing ? lensHole : none,
      FULL,
      ...photoHoles,
      lensInDrawing ? none : lensHole,
    ];
    const geo = maskGeometry(layers);
    const maskKey = geo.position + geo.size;
    if (maskKey !== lastMask) {
      lastMask = maskKey;
      sheet.style.setProperty('-webkit-mask-position', geo.position);
      sheet.style.setProperty('mask-position', geo.position);
      sheet.style.setProperty('-webkit-mask-size', geo.size);
      sheet.style.setProperty('mask-size', geo.size);
    }

    const fadeOut = 1 - range(act2, 0, 0.3);
    photoHoles.forEach((h, i) => drawMark(photoMarks[i], h, Math.min(1, introT(i, 350, now) * 1.4) * fadeOut));
    drawingHoles.forEach((h, i) => drawMark(drawingMarks[i], h, range(act3, i * 0.12, 0.3 + i * 0.12)));
    drawMark(lensMark, lensHole, clamp(lens.on));

    // Everything else on the stage reads these.
    const act = p < 0.42 ? '1' : p < 0.72 ? '2' : '3';
    if (act !== lastAct) {
      lastAct = act;
      stage.dataset.act = act;
      fileLabel.textContent = config.files[Number(act) - 1];
    }
    stage.style.setProperty('--p', p.toFixed(4));
    stage.style.setProperty('--mx', state.mx.toFixed(4));
    stage.style.setProperty('--my', state.my.toFixed(4));

    const introBusy = state.introAt < 0 || now - state.introAt < 350 + config.photoWindows.length * 120 + 700;
    const moving =
      Math.abs(state.pTarget - p) > 0.0004 ||
      Math.abs(state.mxTarget - state.mx) > 0.001 ||
      Math.abs(state.myTarget - state.my) > 0.001 ||
      Math.abs(lens.xTarget - lens.x) > 0.3 ||
      Math.abs(lens.yTarget - lens.y) > 0.3 ||
      Math.abs(lens.onTarget - lens.on) > 0.002;

    if (moving || (introBusy && state.introAt >= 0)) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = 0;
      last = 0;
    }
  }

  const kick = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };

  // Scroll → progress.
  addEventListener('scroll', () => (readScroll(), kick()), { passive: true });
  addEventListener('resize', () => (readScroll(), readTilt(), kick()));

  // Cursor → gentle depth, plus a square lens you can peek through.
  addEventListener(
    'pointermove',
    (e) => {
      if (!finePointer.matches || reduceMotion.matches) return;
      state.mxTarget = (e.clientX / innerWidth - 0.5) * 2;
      state.myTarget = (e.clientY / innerHeight - 0.5) * 2;
      kick();
    },
    { passive: true },
  );

  frame.addEventListener('pointermove', (e) => {
    if (!finePointer.matches) return;
    const r = frame.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const lx = dx * Math.cos(-tilt) - dy * Math.sin(-tilt);
    const ly = dx * Math.sin(-tilt) + dy * Math.cos(-tilt);
    const x = (lx / frame.offsetWidth + 0.5) * W;
    const y = (ly / frame.offsetHeight + 0.5) * H;
    state.lens.xTarget = x;
    state.lens.yTarget = y;
    if (state.lens.onTarget === 0) {
      state.lens.x = x;
      state.lens.y = y;
    }
    state.lens.onTarget = 1;
    kick();
  });
  frame.addEventListener('pointerleave', () => {
    state.lens.onTarget = 0;
    kick();
  });

  // The name and copy come in straight away. The collage waits for its images
  // (or 2.5s on a slow connection), then pops in and punches its holes open.
  stage.classList.add('is-ready');
  const imgs = [...frame.querySelectorAll('img')];
  const decoded = Promise.all(imgs.map((img) => img.decode().catch(() => undefined)));
  const timeout = new Promise((resolve) => setTimeout(resolve, 2500));
  Promise.race([decoded, timeout]).then(() => {
    if (state.introAt >= 0) return;
    figure.classList.add('is-ready');
    state.introAt = performance.now();
    kick();
  });

  readTilt();
  readScroll();
  state.p = state.pTarget;
  kick();
}
