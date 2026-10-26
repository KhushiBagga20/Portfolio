// The record room: picking a sleeve, flying the record to the platter, and spinning it.
//
// One state machine owns the deck. Every sequence runs through `run()`, which cancels
// whatever was mid-flight before starting, so hammering the sleeves can't desync anything.

type Listen = { spotify?: string; apple?: string; youtube?: string; other?: { label: string; href: string } };

type Rec = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  year?: string;
  genre?: string;
  note?: string;
  moods?: string[];
  cover?: string;
  listen?: Listen;
  sleeve: { paper: string; ink: string; label: string };
};

const RPM_BASE = 1800; // ms per revolution at 33⅓
const PITCH_RANGE = 8; // ± percent, like a real fader
const FLIER_PX = 320; // the flier's own box, in CSS pixels

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const inOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function initMusicRoom(room: HTMLElement) {
  const records: Rec[] = JSON.parse(room.dataset.records ?? '[]');
  if (!records.length) return;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = <T extends Element>(sel: string) => room.querySelector<T>(sel);

  const deck = $<SVGSVGElement>('[data-deck]')!;
  const recordGroup = $<SVGGElement>('[data-record]')!;
  const spinGroup = $<SVGGElement>('[data-spin]')!;
  const strobe = deck.querySelector<SVGGElement>('.deck__strobe')!;
  const arm = $<SVGGElement>('[data-arm]')!;
  const labelCircle = $<SVGCircleElement>('[data-label]')!;
  const labelArt = $<SVGImageElement>('[data-label-art]')!;
  const labelTitle = $<SVGTextElement>('[data-label-title]')!;
  const labelArtist = $<SVGTextElement>('[data-label-artist]')!;
  const power = $<SVGGElement>('[data-power]')!;
  const flier = $<HTMLElement>('[data-flier]')!;
  const flierDisc = $<HTMLElement>('[data-flier-disc]')!;
  const toggle = $<HTMLButtonElement>('[data-toggle]')!;
  const toggleLabel = $<HTMLElement>('[data-toggle-label]')!;
  const picks = [...room.querySelectorAll<HTMLButtonElement>('[data-pick]')];

  const ARM_REST = Number(deck.dataset.armRest ?? 0);
  const ARM_PLAY = Number(deck.dataset.armPlay ?? -27);

  // ── deck state ────────────────────────────────
  let current = -1; // index into records, -1 = empty platter
  let spinning = false;
  let rpm = 33 + 1 / 3;
  let pitch = 0; // percent
  let token = 0; // bumped to cancel an in-flight sequence

  const rate = () => (rpm / (100 / 3)) * (1 + pitch / 100);

  const spin = spinGroup.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], {
    duration: RPM_BASE,
    iterations: Infinity,
    easing: 'linear',
  });
  spin.playbackRate = 0;
  spin.pause();

  // The strobe only drifts when the pitch is off zero — exactly like the real thing.
  const strobeDrift = strobe.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], {
    duration: 9000,
    iterations: Infinity,
    easing: 'linear',
  });
  strobeDrift.playbackRate = 0;
  strobeDrift.pause();

  const syncStrobe = () => {
    const drift = spinning && !reduceMotion.matches ? pitch / PITCH_RANGE : 0;
    if (Math.abs(drift) < 0.01) {
      strobeDrift.pause();
    } else {
      strobeDrift.playbackRate = drift;
      strobeDrift.play();
    }
  };

  let rampToken = 0;

  /** Ramps the platter up to speed (or down to a stop) the way a motor would. */
  function ramp(to: number, ms: number) {
    const mine = ++rampToken;
    const from = spin.playbackRate;
    // Reduced motion: the platter never actually turns. The arm, the lamp and the
    // button still say whether it's running.
    if (reduceMotion.matches) {
      spin.playbackRate = 0;
      spin.pause();
      return Promise.resolve();
    }
    if (ms <= 0) {
      spin.playbackRate = to;
      to === 0 ? spin.pause() : spin.play();
      return Promise.resolve();
    }
    if (to > 0) spin.play();
    const start = performance.now();
    return new Promise<void>((resolve) => {
      const step = (now: number) => {
        if (mine !== rampToken) return resolve(); // a newer ramp took over
        const t = clamp((now - start) / ms, 0, 1);
        spin.playbackRate = lerp(from, to, inOut(t));
        if (t < 1) return requestAnimationFrame(step);
        if (to === 0) spin.pause();
        resolve();
      };
      requestAnimationFrame(step);
    });
  }

  function setSpinning(next: boolean) {
    if (next === spinning) return Promise.resolve();
    spinning = next;
    toggle.setAttribute('aria-pressed', String(next));
    power.setAttribute('aria-pressed', String(next));
    toggleLabel.textContent = next ? 'Stop the turntable' : 'Start the turntable';
    arm.style.setProperty('--angle', `${next ? ARM_PLAY : ARM_REST}deg`);
    syncStrobe();
    return ramp(next ? rate() : 0, next ? 1200 : 1100);
  }

  // ── the flight ────────────────────────────────
  /** Where the record sits on the platter, as a CSS matrix for the flier's box. */
  function platterMatrix() {
    const ctm = spinGroup.getScreenCTM();
    if (!ctm) return null;
    const discR = 320; // DISC.r in plane units, mirrored from Turntable.astro
    const k = discR / (FLIER_PX / 2);
    const A = ctm.a * k;
    const B = ctm.b * k;
    const C = ctm.c * k;
    const D = ctm.d * k;
    const half = FLIER_PX / 2;
    return { A, B, C, D, E: ctm.e - half * (A + C), F: ctm.f - half * (B + D) };
  }

  function sleeveMatrix(pick: HTMLElement) {
    const disc = pick.querySelector<HTMLElement>('.pick__disc')!;
    const r = disc.getBoundingClientRect();
    const s = r.width / FLIER_PX;
    return { A: s, B: 0, C: 0, D: s, E: r.left, F: r.top };
  }

  type M = ReturnType<typeof sleeveMatrix>;
  const css = (m: M, spinDeg = 0) =>
    `matrix(${m.A.toFixed(4)},${m.B.toFixed(4)},${m.C.toFixed(4)},${m.D.toFixed(4)},${m.E.toFixed(2)},${m.F.toFixed(2)})` +
    ` translate(${FLIER_PX / 2}px, ${FLIER_PX / 2}px) rotate(${spinDeg.toFixed(2)}deg) translate(${-FLIER_PX / 2}px, ${-FLIER_PX / 2}px)`;

  function flightFrames(from: M, to: M, arc: number, turn: number, steps = 18) {
    return Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps;
      const p = inOut(t);
      const hop = Math.sin(Math.PI * t);
      const m: M = {
        A: lerp(from.A, to.A, p),
        B: lerp(from.B, to.B, p),
        C: lerp(from.C, to.C, p),
        D: lerp(from.D, to.D, p),
        E: lerp(from.E, to.E, p),
        F: lerp(from.F, to.F, p) - hop * arc,
      };
      return { transform: css(m, hop * turn) };
    });
  }

  const showFlier = (m: M, spinDeg = 0) => {
    flierDisc.style.transform = css(m, spinDeg);
    flier.classList.add('is-on');
  };
  const hideFlier = () => flier.classList.remove('is-on', 'is-flying');

  async function fly(from: M, to: M, ms: number, arc: number, turn: number) {
    flier.classList.add('is-flying');
    const anim = flierDisc.animate(flightFrames(from, to, arc, turn), { duration: ms, easing: 'linear', fill: 'forwards' });
    await anim.finished.catch(() => undefined);
    anim.cancel();
    flierDisc.style.transform = css(to);
  }

  // ── painting the record + the info card ───────
  function paintRecord(r: Rec) {
    labelCircle.setAttribute('fill', r.sleeve.label);
    flierDisc.style.setProperty('--label', r.sleeve.label);
    if (r.cover) {
      labelArt.setAttribute('href', r.cover);
      labelArt.removeAttribute('hidden');
      labelTitle.textContent = '';
      labelArtist.textContent = '';
    } else {
      labelArt.removeAttribute('href');
      labelArt.setAttribute('hidden', '');
      labelTitle.textContent = r.title || r.artist;
      labelArtist.textContent = r.title ? r.artist : '';
    }
  }

  const info = {
    empty: $<HTMLElement>('[data-now-empty]')!,
    card: $<HTMLElement>('[data-now-card]')!,
    title: $<HTMLElement>('[data-now-title]')!,
    artist: $<HTMLElement>('[data-now-artist]')!,
    album: $<HTMLElement>('[data-now-album]')!,
    meta: $<HTMLElement>('[data-now-meta]')!,
    moods: $<HTMLElement>('[data-now-moods]')!,
    why: $<HTMLElement>('[data-now-why]')!,
    note: $<HTMLElement>('[data-now-note]')!,
    linkBox: $<HTMLElement>('[data-now-links]')!,
    soon: $<HTMLElement>('[data-now-soon]')!,
  };

  function paintInfo(r: Rec) {
    info.empty.hidden = true;
    info.card.hidden = false;
    info.title.textContent = r.title || 'untitled';
    info.artist.textContent = r.artist;
    info.album.hidden = !r.album;
    if (r.album) info.album.textContent = r.album;

    const meta = [r.year, r.genre].filter(Boolean).join(' · ');
    info.meta.hidden = !meta;
    info.meta.textContent = meta;

    info.moods.hidden = !r.moods?.length;
    info.moods.replaceChildren(
      ...(r.moods ?? []).map((mood) => {
        const li = document.createElement('li');
        li.textContent = mood;
        return li;
      }),
    );

    info.why.hidden = !r.note;
    info.note.textContent = r.note ?? '';
    (info.why as HTMLDetailsElement & { open: boolean }).open = false;

    const listen = r.listen ?? {};
    const links: { label: string; href: string }[] = [
      ...(listen.spotify ? [{ label: 'Spotify', href: listen.spotify }] : []),
      ...(listen.apple ? [{ label: 'Apple Music', href: listen.apple }] : []),
      ...(listen.youtube ? [{ label: 'YouTube', href: listen.youtube }] : []),
      ...(listen.other ? [listen.other] : []),
    ];
    info.linkBox.hidden = !links.length;
    info.linkBox.replaceChildren(
      ...links.map((l) => {
        const a = document.createElement('a');
        a.className = 'key key--sm';
        a.href = l.href;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = `listen on ${l.label}`;
        const sr = document.createElement('span');
        sr.className = 'sr-only';
        sr.textContent = ' (opens in a new tab)';
        a.append(sr);
        return a;
      }),
    );
    // Nothing invented: if there's no link and no write-up, say so plainly.
    info.soon.hidden = links.length > 0 && Boolean(r.note);
  }

  // ── sequences ─────────────────────────────────
  const markPicks = () => picks.forEach((p, i) => p.setAttribute('aria-pressed', String(i === current)));

  /** Takes the record off the platter and slides it back into its sleeve. */
  async function liftOff(mine: number) {
    if (current < 0) return;
    const pick = picks[current];
    void setSpinning(false);
    await wait(reduceMotion.matches ? 0 : 480);
    if (mine !== token) return;
    if (!reduceMotion.matches) {
      const to = platterMatrix();
      if (to && pick) {
        showFlier(to);
        recordGroup.setAttribute('hidden', '');
        await fly(to, sleeveMatrix(pick), 540, 26, -10);
        if (mine !== token) return;
      }
    }
    recordGroup.setAttribute('hidden', '');
    hideFlier();
    current = -1;
    markPicks();
  }

  /** Stages 1–5: pick it up, slide it out, fly it over, drop the needle. */
  async function load(index: number) {
    const mine = ++token;
    const r = records[index];
    const pick = picks[index];
    if (!r || !pick) return;

    if (current === index) {
      // already on the platter: this is just a start/stop. Put the room back in
      // order first, in case a cancelled sequence left the record mid-air.
      if (!flier.classList.contains('is-flying')) {
        hideFlier();
        recordGroup.removeAttribute('hidden');
      }
      await setSpinning(!spinning);
      return;
    }

    await liftOff(mine);
    if (mine !== token) return;

    current = index;
    markPicks();
    paintRecord(r);
    paintInfo(r);

    const to = platterMatrix();
    if (reduceMotion.matches || !to) {
      recordGroup.removeAttribute('hidden');
      await setSpinning(true);
      return;
    }

    // 1–2 · the sleeve lifts (CSS, via aria-pressed) and the record slides out of it
    const start = sleeveMatrix(pick);
    showFlier(start);
    await wait(180);
    if (mine !== token) return;

    const out: M = { ...start, E: start.E + start.A * FLIER_PX * 0.3, F: start.F + start.D * FLIER_PX * 0.12 };
    const slide = flierDisc.animate([{ transform: css(start) }, { transform: css(out) }], {
      duration: 420,
      easing: 'cubic-bezier(0.3, 0, 0.2, 1)',
      fill: 'forwards',
    });
    await slide.finished.catch(() => undefined);
    slide.cancel();
    flierDisc.style.transform = css(out);
    if (mine !== token) return;

    // 3–4 · across the room and down onto the platter
    await fly(out, to, 920, 54, 16);
    if (mine !== token) return;

    recordGroup.removeAttribute('hidden');
    hideFlier();
    flierDisc.getAnimations().forEach((a) => a.cancel());

    // 5 · the arm comes over and the platter winds up
    await wait(120);
    if (mine !== token) return;
    await setSpinning(true);
  }

  // ── controls ──────────────────────────────────
  picks.forEach((pick, i) => pick.addEventListener('click', () => void load(i)));

  const step = (delta: number) => {
    const next = current < 0 ? 0 : (current + delta + records.length) % records.length;
    void load(next);
  };

  toggle.addEventListener('click', () => {
    if (current < 0) return void load(0);
    void setSpinning(!spinning);
  });
  power.addEventListener('click', () => toggle.click());
  power.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle.click();
    }
  });
  arm.addEventListener('click', () => toggle.click());

  $<HTMLButtonElement>('[data-prev]')!.addEventListener('click', () => step(-1));
  $<HTMLButtonElement>('[data-next]')!.addEventListener('click', () => step(1));
  $<HTMLButtonElement>('[data-shuffle]')!.addEventListener('click', () => {
    if (records.length < 2) return void load(0);
    let n = current;
    while (n === current) n = Math.floor(Math.random() * records.length);
    void load(n);
  });

  room.querySelectorAll<HTMLButtonElement>('[data-rpm]').forEach((button) =>
    button.addEventListener('click', () => {
      rpm = button.dataset.rpm === '45' ? 45 : 33 + 1 / 3;
      room.querySelectorAll<HTMLButtonElement>('[data-rpm]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      if (spinning) void ramp(rate(), 500);
      syncStrobe();
    }),
  );

  // ── pitch fader ───────────────────────────────
  const pitchGroup = $<SVGGElement>('[data-pitch]')!;
  const thumb = $<SVGGElement>('[data-pitch-thumb]')!;
  const TRAVEL = 104; // plane units either side of centre

  function setPitch(next: number) {
    pitch = clamp(next, -PITCH_RANGE, PITCH_RANGE);
    thumb.setAttribute('transform', `translate(0 ${(-pitch / PITCH_RANGE) * TRAVEL})`);
    pitchGroup.setAttribute('aria-valuenow', pitch.toFixed(1));
    pitchGroup.setAttribute('aria-valuetext', `${pitch > 0 ? '+' : ''}${pitch.toFixed(1)} percent`);
    if (spinning && !reduceMotion.matches) spin.playbackRate = rate();
    syncStrobe();
  }

  pitchGroup.addEventListener('pointerdown', (e) => {
    const ctm = pitchGroup.getScreenCTM();
    if (!ctm) return;
    pitchGroup.setPointerCapture(e.pointerId);
    const startY = e.clientY;
    const startX = e.clientX;
    const from = pitch;
    const len = ctm.c * ctm.c + ctm.d * ctm.d;

    const move = (ev: PointerEvent) => {
      // project the drag onto the fader's own axis
      const local = ((ev.clientX - startX) * ctm.c + (ev.clientY - startY) * ctm.d) / len;
      setPitch(from - (local / TRAVEL) * PITCH_RANGE);
    };
    const up = () => {
      pitchGroup.removeEventListener('pointermove', move);
      pitchGroup.removeEventListener('pointerup', up);
      pitchGroup.removeEventListener('pointercancel', up);
    };
    pitchGroup.addEventListener('pointermove', move);
    pitchGroup.addEventListener('pointerup', up);
    pitchGroup.addEventListener('pointercancel', up);
  });

  pitchGroup.addEventListener('keydown', (e) => {
    const by = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 0.5 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -0.5 : 0;
    if (by) {
      e.preventDefault();
      setPitch(pitch + by);
    } else if (e.key === 'Home' || e.key === '0') {
      e.preventDefault();
      setPitch(0);
    }
  });

  setPitch(0);

  // Keep the record glued to the platter if the page reflows mid-flight.
  addEventListener('resize', () => {
    if (flier.classList.contains('is-flying')) return;
    const m = platterMatrix();
    if (m && flier.classList.contains('is-on')) flierDisc.style.transform = css(m);
  });

  // Don't let a hidden tab keep the motor turning.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) spin.pause();
    else if (spinning) spin.play();
  });
}
