import { basis, planeTransform, project, solidPath, type Camera } from './iso';
import { KEY, keycap } from './keycap';
import { bloop, keyDown, keyUp } from './sound';

type KeyDef = { id: string; legend: string; cx: number; cy: number; w: number; hole?: boolean };
type Config = {
  camera: Camera;
  keys: KeyDef[];
  plate: { x: number; y: number; w: number; h: number };
  popped: { legend: string; cx: number; cy: number; rot: number; z: number };
  gardenScale: number;
};

const MODIFIERS = new Set(['Shift', 'Meta', 'Control', 'Alt']);

export function initKeyboard(svg: SVGSVGElement) {
  const config: Config = JSON.parse(svg.dataset.kb!);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const section = svg.closest('section') ?? svg;

  const base = config.camera;
  const cam: Camera = { ...base };
  const camTarget = { yaw: base.yaw, pitch: base.pitch };

  const $ = <T extends Element>(sel: string) => svg.querySelector<T>(sel);
  const plateBody = $('[data-plate-body]');
  const plateTop = $('[data-plate-top]');
  const holeEl = $('[data-hole]');
  const holeDef = config.keys.find((k) => k.hole);
  const garden = $('[data-garden]');
  const pop = { shadow: $('[data-pop-shadow]'), body: $('[data-pop-body]'), top: $('[data-pop-top]') };

  const caps = [...svg.querySelectorAll<SVGElement>('[data-i]')].map((el) => {
    const i = Number(el.dataset.i);
    return {
      el,
      def: config.keys[i],
      body: el.querySelector('[data-body]')!,
      top: el.querySelector('[data-top]')!,
      shadow: svg.querySelector(`[data-shadow="${i}"]`),
      href: el.tagName.toLowerCase() === 'a' ? el.getAttribute('href') : null,
      z: KEY.rest,
      v: 0,
      target: KEY.rest,
      down: 0,
      pointer: false,
      hover: false,
      spelling: false,
    };
  });
  type Cap = (typeof caps)[number];
  const byId = new Map<string, Cap[]>();
  for (const c of caps) byId.set(c.def.id, [...(byId.get(c.def.id) ?? []), c]);

  // ── Drawing ────────────────────────────────
  const drawCap = (c: Cap, m: ReturnType<typeof basis>) => {
    c.body.setAttribute('d', solidPath(m, keycap(c.def.cx, c.def.cy, c.def.w, 0, c.z)));
    c.top.setAttribute('transform', planeTransform(m, c.z, c.def.cx, c.def.cy - KEY.back));
  };

  const drawScene = (m: ReturnType<typeof basis>) => {
    const { plate, popped } = config;
    const pcx = plate.x + plate.w / 2;
    const pcy = plate.y + plate.h / 2;
    const face = { w: plate.w, h: plate.h, r: 46 };
    plateBody?.setAttribute('d', solidPath(m, { cx: pcx, cy: pcy, z0: -KEY.plate, z1: 0, bottom: face, top: face }));
    plateTop?.setAttribute('transform', planeTransform(m, 0, pcx, pcy));
    for (const c of caps) {
      c.shadow?.setAttribute('transform', planeTransform(m, 0, c.def.cx + 6, c.def.cy + 11));
      drawCap(c, m);
    }
    if (holeDef) {
      holeEl?.setAttribute('transform', planeTransform(m, 0, holeDef.cx, holeDef.cy));
      const [gx, gy] = project(m, holeDef.cx, holeDef.cy, 0);
      garden?.setAttribute('transform', `translate(${gx.toFixed(1)} ${gy.toFixed(1)}) scale(${cam.scale * config.gardenScale})`);
    }
    const z = popped.z;
    pop.shadow?.setAttribute('transform', planeTransform(m, z, popped.cx + 10, popped.cy + 16, popped.rot));
    pop.body?.setAttribute('d', solidPath(m, keycap(popped.cx, popped.cy, 1, z, z + KEY.rest, popped.rot)));
    pop.top?.setAttribute('transform', planeTransform(m, z + KEY.rest, popped.cx, popped.cy, popped.rot));
  };

  // ── Springs ────────────────────────────────
  const active = new Set<Cap>();
  let raf = 0;
  let last = 0;

  function tick(now: number) {
    const dt = Math.min(0.04, last ? (now - last) / 1000 : 1 / 60);
    last = now;

    const ease = 1 - Math.pow(0.004, dt);
    const camMoving = Math.abs(camTarget.yaw - cam.yaw) > 0.003 || Math.abs(camTarget.pitch - cam.pitch) > 0.003;
    if (camMoving) {
      cam.yaw += (camTarget.yaw - cam.yaw) * ease;
      cam.pitch += (camTarget.pitch - cam.pitch) * ease;
    }
    const m = basis(cam);

    for (const c of active) {
      const pressing = c.target < c.z;
      const stiffness = pressing ? 1600 : 520;
      const damping = pressing ? 56 : 20;
      c.v += (stiffness * (c.target - c.z) - damping * c.v) * dt;
      c.z += c.v * dt;
      if (Math.abs(c.target - c.z) < 0.05 && Math.abs(c.v) < 0.6) {
        c.z = c.target;
        c.v = 0;
        active.delete(c);
      }
      if (!camMoving) drawCap(c, m);
    }
    if (camMoving) drawScene(m);

    if (camMoving || active.size) raf = requestAnimationFrame(tick);
    else raf = last = 0;
  }
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const settle = (c: Cap) => {
    c.target = c.down > 0 ? KEY.pressed : c.hover ? KEY.hover : KEY.rest;
    active.add(c);
    kick();
  };
  const press = (c: Cap, silent = false) => {
    if (!silent) keyDown(c.def.w);
    c.down++;
    settle(c);
  };
  const release = (c: Cap, silent = false) => {
    if (!silent) keyUp();
    c.down = Math.max(0, c.down - 1);
    settle(c);
  };

  // ── Navigation ─────────────────────────────
  const go = (href: string) => {
    const target = document.querySelector<HTMLElement>(href);
    window.setTimeout(() => {
      if (!target) return void (location.hash = href);
      target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', href);
      target.classList.remove('is-arrived');
      void target.offsetWidth;
      target.classList.add('is-arrived');
    }, 170);
  };

  // ── Pointer ────────────────────────────────
  for (const c of caps) {
    c.el.addEventListener('pointerenter', () => {
      if (!finePointer.matches) return;
      c.hover = true;
      settle(c);
    });
    c.el.addEventListener('pointerleave', () => {
      c.hover = false;
      if (c.pointer) (c.pointer = false), release(c);
      else settle(c);
    });
    c.el.addEventListener('pointerdown', () => {
      c.pointer = true;
      press(c);
      c.spelling = input(c.def.id, c);
      if (c.def.id === 'SPARKLE') celebrate(c);
      if (c.def.id === 'HELP') hint('psst… tap the ✦');
    });
    const up = () => {
      if (c.pointer) (c.pointer = false), release(c);
    };
    c.el.addEventListener('pointerup', up);
    c.el.addEventListener('pointercancel', up);
    if (c.href) {
      c.el.addEventListener('click', (e) => {
        e.preventDefault();
        if ((e as MouseEvent).detail === 0) {
          // Activated from the keyboard (Enter): show the press anyway.
          press(c);
          window.setTimeout(() => release(c), 120);
        } else if (c.spelling) {
          return; // part-way through spelling "hello" (h → e): stay on the keyboard
        }
        go(c.href!);
      });
    }
  }

  // ── Your real keyboard ─────────────────────
  let visible = false;
  new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), { threshold: 0.35 }).observe(svg);

  const held = new Set<string>();
  const spelledOnDown = new Map<string, boolean>();
  const idOf = (e: KeyboardEvent) => e.key.toUpperCase();

  addEventListener('keydown', (e) => {
    if (!visible || e.repeat) return;
    if (!MODIFIERS.has(e.key) && (e.metaKey || e.ctrlKey || e.altKey)) return;
    if ((e.target as HTMLElement).closest?.('input, textarea, select, [contenteditable]')) return;
    const id = idOf(e);
    if (held.has(id)) return;
    const list = byId.get(id);
    spelledOnDown.set(id, input(id, list?.[0]));
    if (!list) return;
    held.add(id);
    list.forEach((c) => press(c));
  });

  addEventListener('keyup', (e) => {
    const id = idOf(e);
    if (!held.delete(id)) return;
    const list = byId.get(id)!;
    list.forEach((c) => release(c));
    const link = list.find((c) => c.href);
    if (link && visible && !spelledOnDown.get(id) && !e.metaKey && !e.ctrlKey && !e.altKey) go(link.href!);
  });

  addEventListener('blur', () => {
    for (const id of held) byId.get(id)?.forEach((c) => release(c));
    held.clear();
  });

  // ── Say hello ──────────────────────────────
  const fly = [...svg.querySelectorAll<SVGAnimationElement>('[data-fly]')];
  const bubbleText = svg.querySelector('[data-bubble-text]');
  const screen = section.querySelector<HTMLElement>('[data-screen]');
  const screenText = section.querySelector<HTMLElement>('[data-typed]');
  const WORD = 'HELLO';
  let buffer = '';
  let idleTimer = 0;
  let partyUntil = 0;
  let hintTimer = 0;

  const showBuffer = () => {
    if (screenText) screenText.textContent = buffer.toLowerCase();
  };

  /**
   * Feeds a key into the little screen.
   * Returns true while the visitor is part-way through spelling "hello",
   * so a section key (the E) doesn't whisk them away mid-word.
   */
  function input(id: string, origin?: Cap): boolean {
    if (id === 'BACKSPACE') buffer = buffer.slice(0, -1);
    else if (id === 'ENTER') buffer = '';
    else if (id === ' ' || /^[A-Z0-9]$/.test(id)) buffer = (buffer + id).slice(-14);
    else return false;

    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => ((buffer = ''), showBuffer()), 4000);

    if (buffer.endsWith(WORD)) {
      buffer = '';
      celebrate(origin);
      return true;
    }
    showBuffer();
    for (let n = WORD.length - 1; n >= 2; n--) if (buffer.endsWith(WORD.slice(0, n))) return true;
    return false;
  }

  function hint(text: string) {
    if (bubbleText) bubbleText.textContent = text;
    svg.classList.add('is-hint');
    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => svg.classList.remove('is-hint'), 2200);
  }

  function celebrate(origin?: Cap) {
    const now = performance.now();
    if (now < partyUntil) return;
    partyUntil = now + 2600;

    const ox = origin?.def.cx ?? holeDef?.cx ?? 0;
    const oy = origin?.def.cy ?? holeDef?.cy ?? 0;

    // A ripple of key presses, with a little rising tune.
    if (!reduceMotion.matches) {
      for (const c of caps) {
        const delay = Math.hypot(c.def.cx - ox, c.def.cy - oy) * 0.5;
        window.setTimeout(() => {
          press(c, true);
          window.setTimeout(() => release(c, true), 110);
        }, delay);
      }
      fly.forEach((a) => a.beginElement());
    }
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => bloop(f, i * 0.085));

    if (bubbleText) bubbleText.textContent = 'hello to you too!';
    if (screenText) screenText.textContent = 'hello!! ✦';
    screen?.classList.remove('is-party');
    void screen?.offsetWidth;
    screen?.classList.add('is-party');
    window.setTimeout(() => {
      screen?.classList.remove('is-party');
      showBuffer();
    }, 2600);
    svg.classList.remove('is-hint', 'is-hello');
    void svg.getBoundingClientRect();
    svg.classList.add('has-bloomed', 'is-hello');
    window.setTimeout(() => svg.classList.remove('is-hello'), 3600);
  }

  // ── Tilt with the cursor (desktop) ─────────
  section.addEventListener('pointermove', (e) => {
    if (!finePointer.matches || reduceMotion.matches) return;
    const r = section.getBoundingClientRect();
    camTarget.yaw = base.yaw + ((e as PointerEvent).clientX / r.width - 0.5) * 6;
    camTarget.pitch = base.pitch - (((e as PointerEvent).clientY - r.top) / r.height - 0.5) * 5;
    kick();
  });
  section.addEventListener('pointerleave', () => {
    camTarget.yaw = base.yaw;
    camTarget.pitch = base.pitch;
    kick();
  });

  // Touch screens have no hover, so a tap waters the garden.
  svg.querySelector('.can')?.addEventListener('click', (e) => {
    const can = e.currentTarget as Element;
    can.classList.add('is-pouring');
    window.setTimeout(() => can.classList.remove('is-pouring'), 2400);
  });
}
