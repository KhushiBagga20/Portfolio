// ─────────────────────────────────────────────
// The keyboard
//
// `sections` decides which letters do something. Change a letter, label or colour here
// and both the desktop keyboard and the phone key pad update.
// ─────────────────────────────────────────────
import type { Camera } from '../scripts/iso';
import { KEY } from '../scripts/keycap';

const KEY_PLATE = KEY.plate;

export type Tone = 'base' | 'lemon' | 'tomato' | 'lilac' | 'mint' | 'pink' | 'cream';

export const sections: { key: string; label: string; href: string; tone: Tone }[] = [
  { key: 'A', label: 'about', href: '#about', tone: 'lemon' },
  { key: 'P', label: 'projects', href: '#projects', tone: 'tomato' },
  { key: 'S', label: 'skills', href: '#skills', tone: 'lilac' },
  { key: 'M', label: 'milestones', href: '#milestones', tone: 'mint' },
  { key: 'E', label: 'experience', href: '#experience', tone: 'pink' },
  { key: 'C', label: 'contact', href: '#contact', tone: 'cream' },
];

// Top face, light side, dark side, legend.
export const tones: Record<Tone, [string, string, string, string]> = {
  base: ['#eef3ff', '#c5d3fb', '#8da5ee', '#5a72e4'],
  lemon: ['#ffe46a', '#f6c936', '#d6a212', '#1b1526'],
  tomato: ['#ff8a63', '#f3653e', '#cc4520', '#1b1526'],
  lilac: ['#dccdff', '#bca6fb', '#9479ea', '#1b1526'],
  mint: ['#9eedc9', '#63d3a0', '#34ad78', '#1b1526'],
  pink: ['#ffadd0', '#ff7eb3', '#e0528f', '#1b1526'],
  cream: ['#fffaf0', '#f1dfc3', '#d2b98f', '#1b1526'],
};

export type KeyDef = {
  id: string; // matches KeyboardEvent.key (upper-cased) where it makes sense
  legend: string;
  cx: number; // plane px, centre
  cy: number;
  w: number; // width in keys
  hole?: boolean;
};

export type Scene = {
  name: 'desk' | 'pad';
  viewBox: [number, number];
  camera: Camera;
  keys: KeyDef[];
  plate: { x: number; y: number; w: number; h: number };
  popped: { legend: string; cx: number; cy: number; rot: number; z: number };
  garden: { scale: number; can: [x: number, y: number, flip: boolean]; bubble: [x: number, y: number] };
};

const PITCH = 100;
const row = (y: number, items: [string, number, string?][]): KeyDef[] => {
  let x = 0;
  return items.map(([legend, w, id]) => {
    const key = { id: id ?? legend.toUpperCase(), legend, cx: (x + w / 2) * PITCH, cy: (y + 0.5) * PITCH, w };
    x += w;
    return key;
  });
};

const letters = (s: string): [string, number][] => [...s].map((ch) => [ch, 1]);

const deskKeys = [
  ...row(0, [['`', 1], ...letters('1234567890-='), ['⌫', 2, 'BACKSPACE']]),
  ...row(1, [['tab', 1.5, 'TAB'], ...letters('QWERTYUIOP[]'), ['\\', 1.5]]),
  ...row(2, [['caps', 1.75, 'CAPSLOCK'], ...letters("ASDFGHJKL;'"), ['return', 2.25, 'ENTER']]),
  ...row(3, [['shift', 2.25, 'SHIFT'], ...letters('ZXCVBNM,./'), ['shift', 2.75, 'SHIFT']]),
  ...row(4, [
    ['fn', 1, 'FN'],
    ['ctrl', 1, 'CONTROL'],
    ['opt', 1, 'ALT'],
    ['cmd', 1.25, 'META'],
    ['', 6.5, ' '],
    ['cmd', 1.25, 'META'],
    ['opt', 1, 'ALT'],
    ['←', 1, 'ARROWLEFT'],
    ['→', 1, 'ARROWRIGHT'],
  ]),
].map((k) => (k.id === 'G' ? { ...k, hole: true } : k));

export const desk: Scene = {
  name: 'desk',
  viewBox: [1600, 1000],
  camera: { yaw: 30, pitch: 52, scale: 1.12, x: 330, y: 70 },
  keys: deskKeys,
  plate: { x: -30, y: -30, w: 1560, h: 560 },
  popped: { legend: 'G', cx: 700, cy: 395, rot: 28, z: 30 },
  garden: { scale: 1.15, can: [168, 64, true], bubble: [74, -268] },
};

// The garden sits in the back corner so the plant grows into empty sky, not over keys.
const padKeys = [
  ...row(0, [['G', 1], ['A', 1], ['P', 1]]),
  ...row(1, [['S', 1], ['M', 1], ['E', 1]]),
  ...row(2, [['C', 1], ['✦', 1, 'SPARKLE'], ['?', 1, 'HELP']]),
].map((k) => (k.id === 'G' ? { ...k, hole: true } : k));

export const pad: Scene = {
  name: 'pad',
  viewBox: [800, 860],
  camera: { yaw: 32, pitch: 54, scale: 1.62, x: 322, y: 226 },
  keys: padKeys,
  plate: { x: -26, y: -26, w: 352, h: 352 },
  popped: { legend: 'G', cx: 400, cy: 250, rot: -20, z: -KEY_PLATE },
  garden: { scale: 0.8, can: [-150, 46, false], bubble: [58, -214] },
};
