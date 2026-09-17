// A tiny 2.5D engine: orthographic camera, flat plane, extruded rounded keys.
// Shared by the server render (first frame) and the browser (presses + tilt).
//
// Plane space: x → along a keyboard row, y → towards the viewer, z → up.
// 100 plane px = one key.

export const U = 100;

export type Camera = { yaw: number; pitch: number; scale: number; x: number; y: number };
type Basis = { a: number; b: number; c: number; d: number; zy: number; x: number; y: number };
type Pt = [number, number];

const f = (n: number) => (Math.abs(n) < 1e-6 ? '0' : n.toFixed(3));

export function basis(cam: Camera): Basis {
  const t = (cam.yaw * Math.PI) / 180;
  const p = (cam.pitch * Math.PI) / 180;
  const s = cam.scale;
  return {
    a: Math.cos(t) * s,
    b: Math.sin(t) * Math.sin(p) * s,
    c: -Math.sin(t) * s,
    d: Math.cos(t) * Math.sin(p) * s,
    zy: -Math.cos(p) * s,
    x: cam.x,
    y: cam.y,
  };
}

export function project(m: Basis, x: number, y: number, z: number): Pt {
  return [m.a * x + m.c * y + m.x, m.b * x + m.d * y + m.zy * z + m.y];
}

/** SVG transform that maps local plane coords (centred on cx, cy, rotated) onto the screen at height z. */
export function planeTransform(m: Basis, z: number, cx = 0, cy = 0, rot = 0): string {
  const r = (rot * Math.PI) / 180;
  const cr = Math.cos(r);
  const sr = Math.sin(r);
  const A = m.a * cr + m.c * sr;
  const B = m.b * cr + m.d * sr;
  const C = -m.a * sr + m.c * cr;
  const D = -m.b * sr + m.d * cr;
  const [E, F] = project(m, cx, cy, z);
  return `matrix(${f(A)} ${f(B)} ${f(C)} ${f(D)} ${f(E)} ${f(F)})`;
}

export type Face = { w: number; h: number; r: number; dy?: number };

function outline({ w, h, r, dy = 0 }: Face, segs = 5): Pt[] {
  const hw = w / 2;
  const hh = h / 2;
  const rr = Math.min(r, hw, hh);
  const corners: [number, number, number][] = [
    [hw - rr, -hh + rr, -90],
    [hw - rr, hh - rr, 0],
    [-hw + rr, hh - rr, 90],
    [-hw + rr, -hh + rr, 180],
  ];
  const pts: Pt[] = [];
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= segs; i++) {
      const a = ((start + (90 * i) / segs) * Math.PI) / 180;
      pts.push([cx + rr * Math.cos(a), cy + dy + rr * Math.sin(a)]);
    }
  }
  return pts;
}

function hull(points: Pt[]): Pt[] {
  const pts = points.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

export type Solid = { cx: number; cy: number; rot?: number; bottom: Face; top: Face; z0: number; z1: number };

/** Silhouette of an extruded (optionally tapered) rounded box: the hull of its bottom and top faces. */
export function solidPath(m: Basis, s: Solid): string {
  const r = ((s.rot ?? 0) * Math.PI) / 180;
  const cr = Math.cos(r);
  const sr = Math.sin(r);
  const pts: Pt[] = [];
  const add = (face: Face, z: number) => {
    for (const [u, v] of outline(face)) pts.push(project(m, s.cx + cr * u - sr * v, s.cy + sr * u + cr * v, z));
  };
  add(s.bottom, s.z0);
  add(s.top, s.z1);
  const h = hull(pts);
  return `M${h.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`;
}

/** Painter's order: things further from the viewer first. */
export function depth(m: Basis, x: number, y: number) {
  return m.b * x + m.d * y;
}
