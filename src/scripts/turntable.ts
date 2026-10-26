// The record room.
//
// The deck is the interface; Spotify's embedded player does the actual streaming, and the
// platter follows whatever it reports. One state machine owns the sequence, so hammering
// the sleeves can't desync the room.

type Track = { id: string; uri: string; title: string; artist: string; duration: number | null; cover: string | null; label: string; paper: string };
type Payload = { url: string; name: string; crate: number; tracks: Track[] };

type SpotifyController = {
  loadUri(uri: string): void;
  play(): void;
  pause(): void;
  addListener(event: string, cb: (e: { data: PlaybackData }) => void): void;
};
type PlaybackData = { isPaused: boolean; isBuffering: boolean; position: number; duration: number };

const RPM_BASE = 1800; // ms per revolution at 33⅓
const PITCH_RANGE = 8; // ± percent on the platter
const FLIER_PX = 320;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const inOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function initMusicRoom(room: HTMLElement) {
  const payload: Payload = JSON.parse(room.dataset.playlist ?? '{"tracks":[]}');
  const tracks = payload.tracks;
  if (!tracks.length) return;

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

  // ── state ─────────────────────────────────────
  const crate = picks.map((_, i) => i); // which track sits in each sleeve slot
  let slot = -1; // the sleeve currently on the platter, -1 = empty
  let track = -1; // index into `tracks`
  let spinning = false;
  let rpm = 33 + 1 / 3;
  let pitch = 0;
  let token = 0;

  const rate = () => (rpm / (100 / 3)) * (1 + pitch / 100);

  const spin = spinGroup.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], {
    duration: RPM_BASE,
    iterations: Infinity,
    easing: 'linear',
  });
  spin.playbackRate = 0;
  spin.pause();

  const strobeDrift = strobe.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], {
    duration: 9000,
    iterations: Infinity,
    easing: 'linear',
  });
  strobeDrift.playbackRate = 0;
  strobeDrift.pause();

  const syncStrobe = () => {
    const drift = spinning && !reduceMotion.matches ? pitch / PITCH_RANGE : 0;
    if (Math.abs(drift) < 0.01) return strobeDrift.pause();
    strobeDrift.playbackRate = drift;
    strobeDrift.play();
  };

  let rampToken = 0;
  function ramp(to: number, ms: number) {
    const mine = ++rampToken;
    const from = spin.playbackRate;
    // Reduced motion: the platter never turns. The arm, the lamp and the button still
    // say whether something is playing.
    if (reduceMotion.matches) {
      spin.playbackRate = 0;
      spin.pause();
      return Promise.resolve();
    }
    if (to > 0) spin.play();
    const start = performance.now();
    return new Promise<void>((resolve) => {
      const step = (now: number) => {
        if (mine !== rampToken) return resolve();
        const t = clamp((now - start) / ms, 0, 1);
        spin.playbackRate = lerp(from, to, inOut(t));
        if (t < 1) return requestAnimationFrame(step);
        if (to === 0) spin.pause();
        resolve();
      };
      requestAnimationFrame(step);
    });
  }

  // ── Spotify ───────────────────────────────────
  let controller: SpotifyController | null = null;
  let wantPlay = false;
  let endedAt = -1;
  let booting = false;
  let pendingUri = '';

  const amp = $<HTMLElement>('[data-amp]');

  /**
   * Spotify only gets loaded once you actually pick a record. That keeps their cookies and
   * scripts off the page for anyone just looking around, and it means the player starts
   * from a real click, which is what browsers want before they'll allow sound.
   */
  function startSpotify(uri: string) {
    if (booting) {
      pendingUri = uri;
      return;
    }
    booting = true;
    pendingUri = uri;
    amp?.classList.add('is-live');
    const host = $<HTMLElement>('[data-embed]');
    if (!host) return;

    (window as unknown as { onSpotifyIframeApiReady?: unknown }).onSpotifyIframeApiReady = (
      api: { createController(el: HTMLElement, opts: object, cb: (c: SpotifyController) => void): void },
    ) => {
      api.createController(host, { uri: pendingUri || uri, width: '100%', height: 80 }, (c) => {
        controller = c;
        const frame = amp?.querySelector('iframe');
        frame?.setAttribute('title', `Spotify player for ${payload.name}`);
        c.addListener('playback_update', (e) => onPlayback(e.data));
        wantPlay = true;
        c.play();
      });
    };

    const tag = document.createElement('script');
    tag.src = 'https://open.spotify.com/embed/iframe-api/v1';
    tag.async = true;
    document.head.append(tag);
  }

  function sendToSpotify(uri: string, mine: number) {
    if (!controller) return startSpotify(uri);
    wantPlay = true;
    controller.loadUri(uri);
    window.setTimeout(() => {
      if (wantPlay && mine === token) {
        wantPlay = false;
        controller?.play();
      }
    }, 900);
  }

  /** The platter follows the player, not the other way round. */
  function onPlayback(d: PlaybackData) {
    if (!d) return;
    if (wantPlay && d.isPaused) {
      wantPlay = false;
      controller?.play();
      return;
    }
    const playing = !d.isPaused;
    if (playing) info.cue.hidden = true;
    if (playing !== spinning) setSpinning(playing, false);

    // Spotify pauses at the end of a track (or of a 30s preview): move the needle on.
    if (d.isPaused && d.duration > 0 && d.position >= d.duration - 1200 && track !== endedAt) {
      endedAt = track;
      step(1);
    }
  }

  // ── deck state ────────────────────────────────
  function setSpinning(next: boolean, tellSpotify = true) {
    if (next === spinning) return Promise.resolve();
    spinning = next;
    toggle.setAttribute('aria-pressed', String(next));
    power.setAttribute('aria-pressed', String(next));
    toggleLabel.textContent = next ? 'Pause' : 'Play';
    arm.style.setProperty('--angle', `${next ? ARM_PLAY : ARM_REST}deg`);
    syncStrobe();
    if (tellSpotify && controller) next ? controller.play() : controller.pause();
    return ramp(next ? rate() : 0, next ? 1200 : 1100);
  }

  // ── the flight ────────────────────────────────
  function platterMatrix() {
    const ctm = spinGroup.getScreenCTM();
    if (!ctm) return null;
    const k = 320 / (FLIER_PX / 2); // DISC.r, mirrored from Turntable.astro
    const A = ctm.a * k;
    const B = ctm.b * k;
    const C = ctm.c * k;
    const D = ctm.d * k;
    const half = FLIER_PX / 2;
    return { A, B, C, D, E: ctm.e - half * (A + C), F: ctm.f - half * (B + D) };
  }

  function sleeveMatrix(pick: HTMLElement) {
    const r = pick.querySelector<HTMLElement>('.pick__disc')!.getBoundingClientRect();
    const s = r.width / FLIER_PX;
    return { A: s, B: 0, C: 0, D: s, E: r.left, F: r.top };
  }

  type M = ReturnType<typeof sleeveMatrix>;
  const css = (m: M, turn = 0) =>
    `matrix(${m.A.toFixed(4)},${m.B.toFixed(4)},${m.C.toFixed(4)},${m.D.toFixed(4)},${m.E.toFixed(2)},${m.F.toFixed(2)})` +
    ` translate(${FLIER_PX / 2}px, ${FLIER_PX / 2}px) rotate(${turn.toFixed(2)}deg) translate(${-FLIER_PX / 2}px, ${-FLIER_PX / 2}px)`;

  function flightFrames(from: M, to: M, arc: number, turn: number, steps = 18) {
    return Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps;
      const p = inOut(t);
      const hop = Math.sin(Math.PI * t);
      return {
        transform: css(
          {
            A: lerp(from.A, to.A, p),
            B: lerp(from.B, to.B, p),
            C: lerp(from.C, to.C, p),
            D: lerp(from.D, to.D, p),
            E: lerp(from.E, to.E, p),
            F: lerp(from.F, to.F, p) - hop * arc,
          },
          hop * turn,
        ),
      };
    });
  }

  const showFlier = (m: M) => {
    flierDisc.style.transform = css(m);
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

  // ── painting ──────────────────────────────────
  function paintSleeve(i: number) {
    const t = tracks[crate[i]];
    const pick = picks[i];
    const sleeve = pick.querySelector<HTMLElement>('[data-sleeve]')!;
    const cover = pick.querySelector<HTMLImageElement>('[data-cover]')!;
    const blank = pick.querySelector<HTMLElement>('[data-blank]')!;
    sleeve.style.setProperty('--paper', t.paper);
    sleeve.style.setProperty('--label', t.label);
    pick.querySelector<HTMLElement>('.pick__disc')!.style.setProperty('--label', t.label);
    pick.querySelector<HTMLElement>('[data-pick-title]')!.textContent = t.title;
    pick.querySelector<HTMLElement>('[data-pick-artist]')!.textContent = t.artist;
    if (t.cover) {
      cover.src = t.cover;
      cover.hidden = false;
      blank.hidden = true;
    } else {
      cover.hidden = true;
      blank.hidden = false;
      pick.querySelector<HTMLElement>('[data-blank-title]')!.textContent = t.title;
      pick.querySelector<HTMLElement>('[data-blank-artist]')!.textContent = t.artist;
    }
  }

  function paintRecord(t: Track) {
    labelCircle.setAttribute('fill', t.label);
    flierDisc.style.setProperty('--label', t.label);
    if (t.cover) {
      labelArt.setAttribute('href', t.cover);
      labelArt.removeAttribute('hidden');
      labelTitle.textContent = '';
      labelArtist.textContent = '';
    } else {
      labelArt.removeAttribute('href');
      labelArt.setAttribute('hidden', '');
      labelTitle.textContent = t.title;
      labelArtist.textContent = t.artist;
    }
  }

  const info = {
    empty: $<HTMLElement>('[data-now-empty]')!,
    card: $<HTMLElement>('[data-now-card]')!,
    title: $<HTMLElement>('[data-now-title]')!,
    artist: $<HTMLElement>('[data-now-artist]')!,
    link: $<HTMLAnchorElement>('[data-now-link]')!,
    cue: $<HTMLElement>('[data-cue]')!,
  };

  // Browsers can refuse to start audio inside a cross-origin frame. Rather than spin a
  // silent platter, say so and point at Spotify's own play button.
  let cueTimer = 0;
  const armCue = () => {
    window.clearTimeout(cueTimer);
    info.cue.hidden = true;
    cueTimer = window.setTimeout(() => (info.cue.hidden = spinning || !controller), 3000);
  };

  function paintInfo(t: Track) {
    info.empty.hidden = true;
    info.card.hidden = false;
    info.title.textContent = t.title;
    info.artist.textContent = t.artist;
    info.link.href = `https://open.spotify.com/track/${t.id}`;
  }

  const markPicks = () => picks.forEach((p, i) => p.setAttribute('aria-pressed', String(i === slot)));

  // ── sequences ─────────────────────────────────
  async function liftOff(mine: number) {
    if (slot < 0) return;
    const pick = picks[slot];
    void setSpinning(false);
    await wait(reduceMotion.matches ? 0 : 460);
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
    slot = -1;
    markPicks();
  }

  /** Make sure a track has a sleeve in the crate, and say which slot it landed in. */
  function slotFor(index: number, avoid: number) {
    const found = crate.indexOf(index);
    if (found >= 0) return found;
    const target = avoid < 0 ? 0 : (avoid + 1) % crate.length;
    crate[target] = index;
    paintSleeve(target);
    return target;
  }

  /** Pick it up, slide it out, fly it over, drop the needle. */
  async function load(index: number) {
    const mine = ++token;
    const t = tracks[index];
    if (!t) return;

    if (index === track && slot >= 0) {
      if (!flier.classList.contains('is-flying')) {
        hideFlier();
        recordGroup.removeAttribute('hidden');
      }
      await setSpinning(!spinning);
      return;
    }

    const from = slot;
    await liftOff(mine);
    if (mine !== token) return;

    slot = slotFor(index, from);
    track = index;
    endedAt = -1;
    markPicks();
    paintRecord(t);
    paintInfo(t);

    // hand the track to Spotify while the record is still in the air
    armCue();
    sendToSpotify(t.uri, mine);

    const to = platterMatrix();
    if (reduceMotion.matches || !to) {
      recordGroup.removeAttribute('hidden');
      await setSpinning(true);
      return;
    }

    // 1–2 · the sleeve lifts (CSS, via aria-pressed) and the record slides out
    const start = sleeveMatrix(picks[slot]);
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

  function step(delta: number) {
    const next = track < 0 ? 0 : (track + delta + tracks.length) % tracks.length;
    void load(next);
  }

  // ── controls ──────────────────────────────────
  picks.forEach((pick, i) => pick.addEventListener('click', () => void load(crate[i])));

  toggle.addEventListener('click', () => (track < 0 ? void load(crate[0]) : void setSpinning(!spinning)));
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

  const randomTrack = () => {
    if (tracks.length < 2) return 0;
    let n = track;
    while (n === track) n = Math.floor(Math.random() * tracks.length);
    return n;
  };
  $<HTMLButtonElement>('[data-shuffle]')!.addEventListener('click', () => void load(randomTrack()));

  // Rummage: refill the pile with a fresh handful from the playlist.
  $<HTMLButtonElement>('[data-dig]')?.addEventListener('click', () => {
    const pool = tracks.map((_, i) => i).filter((i) => i !== track);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    picks.forEach((_, i) => {
      if (i === slot) return; // leave the record that's playing where it is
      crate[i] = pool.pop() ?? crate[i];
      paintSleeve(i);
    });
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
  const TRAVEL = 104;

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

  addEventListener('resize', () => {
    if (flier.classList.contains('is-flying')) return;
    const m = platterMatrix();
    if (m && flier.classList.contains('is-on')) flierDisc.style.transform = css(m);
  });
}
