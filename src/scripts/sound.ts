// Keyboard sounds, synthesised on the fly with Web Audio (no audio files to load).
// A press is a short filtered-noise click plus a low "thock"; a release is a lighter click.

const STORAGE_KEY = 'khushi:sound';
const listeners = new Set<(on: boolean) => void>();

let on = true;
try {
  on = localStorage.getItem(STORAGE_KEY) !== 'off';
} catch {}

export const isSoundOn = () => on;

export function setSound(value: boolean) {
  on = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off');
  } catch {}
  listeners.forEach((fn) => fn(on));
}

export function onSoundChange(fn: (on: boolean) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let ctx: AudioContext | null = null;
let out: GainNode;
let noise: AudioBuffer;

/** Lazily creates (and un-suspends) the audio context. Browsers only allow this after a user gesture. */
function audio(): AudioContext | null {
  if (!on) return null;
  if (!ctx) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
    out = ctx.createGain();
    out.gain.value = 0.5;
    out.connect(ctx.destination);
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Call from pointerdown/keydown so iOS unlocks audio as early as possible. */
export const warmUp = () => void audio();

function envelope(ac: AudioContext, peak: number, attack: number, decay: number, at: number) {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  g.connect(out);
  return g;
}

function click(ac: AudioContext, freq: number, peak: number, decay: number, at: number) {
  const src = ac.createBufferSource();
  src.buffer = noise;
  const band = ac.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = freq;
  band.Q.value = 1.1;
  src.connect(band).connect(envelope(ac, peak, 0.002, decay, at));
  src.start(at, Math.random() * 0.1);
  src.stop(at + decay + 0.02);
}

/** `size` is the key width in keys: bigger keys sound deeper. */
export function keyDown(size = 1) {
  const ac = audio();
  if (!ac) return;
  const at = ac.currentTime;
  const vary = 0.9 + Math.random() * 0.2;
  click(ac, 3400 * vary, 0.35, 0.03, at);

  const thock = ac.createOscillator();
  const f = (230 / Math.sqrt(size)) * vary;
  thock.type = 'sine';
  thock.frequency.setValueAtTime(f, at);
  thock.frequency.exponentialRampToValueAtTime(f * 0.45, at + 0.07);
  thock.connect(envelope(ac, 0.55, 0.003, 0.08, at));
  thock.start(at);
  thock.stop(at + 0.1);
}

export function keyUp() {
  const ac = audio();
  if (!ac) return;
  click(ac, 5200 * (0.9 + Math.random() * 0.2), 0.14, 0.018, ac.currentTime);
}

/** A soft marimba-ish note, for little melodies. */
export function bloop(freq: number, delay = 0, peak = 0.22) {
  const ac = audio();
  if (!ac) return;
  const at = ac.currentTime + delay;
  for (const [mult, type, gain] of [
    [1, 'triangle', peak],
    [2, 'sine', peak * 0.35],
  ] as const) {
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.value = freq * mult;
    osc.connect(envelope(ac, gain, 0.006, 0.34, at));
    osc.start(at);
    osc.stop(at + 0.4);
  }
}
