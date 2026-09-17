// Keycap proportions, shared by the server render and the browser.
import type { Solid } from './iso';

export const KEY = {
  rest: 30, // cap height at rest (plane px)
  hover: 37,
  pressed: 10,
  gap: 8, // space between neighbouring caps
  taper: 16, // top face is this much narrower than the base
  back: 5, // top face leans back a touch, like sculpted caps
  r: 17,
  rTop: 14,
  plate: 40, // plate thickness
};

export const topSize = (wKeys: number) => ({
  w: wKeys * 100 - KEY.gap - KEY.taper,
  h: 100 - KEY.gap - KEY.taper - 2,
});

export function keycap(cx: number, cy: number, wKeys: number, z0: number, z1: number, rot = 0): Solid {
  const w = wKeys * 100 - KEY.gap;
  const h = 100 - KEY.gap;
  const top = topSize(wKeys);
  return {
    cx,
    cy,
    rot,
    z0,
    z1,
    bottom: { w, h, r: KEY.r },
    top: { w: top.w, h: top.h, r: KEY.rTop, dy: -KEY.back },
  };
}
