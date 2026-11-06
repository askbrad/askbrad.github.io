/**
 * Collision world for the kinematic controller (M2), derived from the same
 * CITY data that drives rendering — one source of truth, no mesh picking.
 *
 * Model (plan §3):
 *  - `surfaces`: walkable tops (street tiles, storey slabs, roofs, sewer
 *    floors, ramp steps). Point-in-rect queries; the controller lands on /
 *    steps along the highest surface beneath the feet.
 *  - `walls`: solid AABBs (building elevations with door gaps, block sides,
 *    sewer perimeter, map bounds). Span a y-range; only block when the
 *    player's body overlaps it.
 *  - `trees`: circle push-out obstacles.
 *
 * Deliberate M2 omissions (logged in prototype-plan §10): no ceiling collision
 * (jump clearance never reaches a storey slab), sewer ceiling has no collider,
 * shaft chutes are open air above the corridor hole.
 */

import {
  CITY,
  EXTENT,
  STOREY_H,
  STREET_Y,
  TREES,
  type BuildingDef,
  type Rect,
  roofY,
} from './city';

export interface BoxCollider {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

export interface Surface {
  y: number;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export interface CollisionWorld {
  walls: BoxCollider[];
  surfaces: Surface[];
  trees: Array<{ x: number; z: number; r: number }>;
  spawn: { x: number; y: number; z: number };
}

const WALL_T = 0.5;
const SHAFT_HALF = 3.5; // matches the visual chute half-width
const RAMP_STEPS = 8;
const RAMP_WIDTH = 2.6;

/** Full-extent rect. */
function extentRect(): Rect {
  return { x0: -EXTENT, z0: -EXTENT, x1: EXTENT, z1: EXTENT };
}

function rectArea(r: Rect): number {
  return (r.x1 - r.x0) * (r.z1 - r.z0);
}

/** Subtract `hole` from `base`, returning up to 4 covering rects. */
export function subtractRect(base: Rect, hole: Rect): Rect[] {
  if (hole.x0 >= base.x1 || hole.x1 <= base.x0 || hole.z0 >= base.z1 || hole.z1 <= base.z0) {
    return [base];
  }
  const pieces: Rect[] = [];
  const hx0 = Math.max(base.x0, hole.x0);
  const hx1 = Math.min(base.x1, hole.x1);
  const hz0 = Math.max(base.z0, hole.z0);
  const hz1 = Math.min(base.z1, hole.z1);
  if (hx0 > base.x0) pieces.push({ x0: base.x0, x1: hx0, z0: base.z0, z1: base.z1 });
  if (hx1 < base.x1) pieces.push({ x0: hx1, x1: base.x1, z0: base.z0, z1: base.z1 });
  if (hz0 > base.z0) pieces.push({ x0: hx0, x1: hx1, z0: base.z0, z1: hz0 });
  if (hz1 < base.z1) pieces.push({ x0: hx0, x1: hx1, z0: hz1, z1: base.z1 });
  return pieces.filter((r) => rectArea(r) > 0.01);
}

/** Exterior elevation wall boxes for one storey, honouring the storey-1 door gap. */
export function elevationWalls(b: BuildingDef, storey: number): BoxCollider[] {
  const y0 = STREET_Y + (storey - 1) * STOREY_H;
  const y1 = y0 + STOREY_H;
  const gap = storey === 1 ? b.entrance : null;
  const box = (x0: number, x1: number, z0: number, z1: number): BoxCollider => ({ x0, x1, y0, y1, z0, z1 });

  const out: BoxCollider[] = [];
  const sideIs = (s: string) => b.entrance.side === s;

  const pushXSides = (z0: number, z1: number): void => {
    out.push(box(b.x0 - WALL_T, b.x1 + WALL_T, z0, z1));
  };
  const pushZSides = (x0: number, x1: number): void => {
    out.push(box(x0, x1, b.z0 - WALL_T, b.z1 + WALL_T));
  };

  if (gap && (sideIs('north') || sideIs('south'))) {
    const zLo = sideIs('north') ? b.z0 - WALL_T : b.z1;
    const zHi = zLo + WALL_T;
    const centre = (b.x0 + b.x1) / 2;
    const gapLo = centre + b.entrance.offset - b.entrance.width / 2;
    const gapHi = centre + b.entrance.offset + b.entrance.width / 2;
    if (gapLo > b.x0) out.push(box(b.x0 - WALL_T, gapLo, zLo, zHi));
    if (b.x1 > gapHi) out.push(box(gapHi, b.x1 + WALL_T, zLo, zHi));
    pushZSides(b.x0 - WALL_T, b.x0);
    pushZSides(b.x1, b.x1 + WALL_T);
  } else if (gap) {
    const xLo = sideIs('west') ? b.x0 - WALL_T : b.x1;
    const xHi = xLo + WALL_T;
    const centre = (b.z0 + b.z1) / 2;
    const gapLo = centre + b.entrance.offset - b.entrance.width / 2;
    const gapHi = centre + b.entrance.offset + b.entrance.width / 2;
    if (gapLo > b.z0) out.push(box(xLo, xHi, b.z0 - WALL_T, gapLo));
    if (b.z1 > gapHi) out.push(box(xLo, xHi, gapHi, b.z1 + WALL_T));
    pushXSides(b.z0 - WALL_T, b.z0);
    pushXSides(b.z1, b.z1 + WALL_T);
  } else {
    pushXSides(b.z0 - WALL_T, b.z0);
    pushXSides(b.z1, b.z1 + WALL_T);
    pushZSides(b.x0 - WALL_T, b.x0);
    pushZSides(b.x1, b.x1 + WALL_T);
  }
  return out;
}

/** Walkable step surfaces along a storey's interior ramp (up toward +x, like the visual). */
export function rampSteps(b: BuildingDef, storey: number): Surface[] {
  const base = STREET_Y + (storey - 1) * STOREY_H;
  const w = b.x1 - b.x0;
  const run = Math.min(w - 6, 24);
  const lowX = (b.x0 + b.x1) / 2 + w / 2 - run - 2;
  const zLo = b.z0 + 2.2 - RAMP_WIDTH / 2;
  const zHi = zLo + RAMP_WIDTH;
  const steps: Surface[] = [];
  for (let i = 0; i < RAMP_STEPS; i++) {
    steps.push({
      y: base + (STOREY_H * (i + 1)) / RAMP_STEPS,
      x0: lowX + (i * run) / RAMP_STEPS,
      x1: lowX + ((i + 1) * run) / RAMP_STEPS,
      z0: zLo,
      z1: zHi,
    });
  }
  return steps;
}

/** Build the collision world for the fixed test city. */
export function buildCollision(): CollisionWorld {
  const walls: BoxCollider[] = [];
  const surfaces: Surface[] = [];

  // Street tiles with shaft holes punched out.
  let streetRects: Rect[] = [extentRect()];
  for (const sh of CITY.sewer.shafts) {
    const hole: Rect = { x0: sh.x - SHAFT_HALF, x1: sh.x + SHAFT_HALF, z0: sh.z - SHAFT_HALF, z1: sh.z + SHAFT_HALF };
    streetRects = streetRects.flatMap((r) => subtractRect(r, hole));
  }
  for (const r of streetRects) surfaces.push({ y: STREET_Y, ...r });

  // Enterable buildings: slabs per storey + roof, elevation walls, ramp steps.
  for (const b of CITY.buildings) {
    const r: Rect = { x0: b.x0, z0: b.z0, x1: b.x1, z1: b.z1 };
    for (let s = 1; s <= b.floors; s++) {
      surfaces.push({ y: STREET_Y + (s - 1) * STOREY_H, ...r });
      walls.push(...elevationWalls(b, s));
      surfaces.push(...rampSteps(b, s));
    }
    surfaces.push({ y: roofY(b), ...r });
  }

  // Solid blocks: one solid body + walkable roof.
  for (const blk of CITY.solidBlocks) {
    walls.push({ x0: blk.x0, x1: blk.x1, y0: STREET_Y, y1: STREET_Y + blk.h, z0: blk.z0, z1: blk.z1 });
    surfaces.push({ y: STREET_Y + blk.h, x0: blk.x0, z0: blk.z0, x1: blk.x1, z1: blk.z1 });
  }

  // Sewer: floor surface per corridor + perimeter walls.
  for (const c of CITY.sewer.corridors) {
    surfaces.push({ y: CITY.sewer.floorY, x0: c.x0, z0: c.z0, x1: c.x1, z1: c.z1 });
    walls.push({ x0: c.x0 - 1, x1: c.x1 + 1, y0: CITY.sewer.floorY, y1: CITY.sewer.ceilY, z0: c.z0 - 1, z1: c.z0 });
    walls.push({ x0: c.x0 - 1, x1: c.x1 + 1, y0: CITY.sewer.floorY, y1: CITY.sewer.ceilY, z0: c.z1, z1: c.z1 + 1 });
    walls.push({ x0: c.x0 - 1, x1: c.x0, y0: CITY.sewer.floorY, y1: CITY.sewer.ceilY, z0: c.z0, z1: c.z1 });
    walls.push({ x0: c.x1, x1: c.x1 + 1, y0: CITY.sewer.floorY, y1: CITY.sewer.ceilY, z0: c.z0, z1: c.z1 });
  }

  // Map bounds so the city feels enclosed.
  const E = EXTENT;
  walls.push({ x0: -E - 4, x1: -E, y0: -10, y1: 120, z0: -E - 4, z1: E + 4 });
  walls.push({ x0: E, x1: E + 4, y0: -10, y1: 120, z0: -E - 4, z1: E + 4 });
  walls.push({ x0: -E - 4, x1: E + 4, y0: -10, y1: 120, z0: -E - 4, z1: -E });
  walls.push({ x0: -E - 4, x1: E + 4, y0: -10, y1: 120, z0: E, z1: E + 4 });

  return {
    walls,
    surfaces,
    trees: TREES.map((t) => ({ x: t.x, z: t.z, r: t.r })),
    spawn: { x: CITY.deploy.x, y: STREET_Y, z: CITY.deploy.z },
  };
}

/** Default test world: infinite flat ground at y=0 (headless unit tests). */
export const DEFAULT_COLLISION: CollisionWorld = {
  walls: [],
  surfaces: [{ y: 0, x0: -1e9, z0: -1e9, x1: 1e9, z1: 1e9 }],
  trees: [],
  spawn: { x: 0, y: 0, z: 0 },
};

/** True if the wall blocks a capsule of radius `r` whose feet are at `feetY`. */
export function wallBlocks(
  walls: BoxCollider[],
  x: number,
  z: number,
  feetY: number,
  r: number,
  height: number,
): boolean {
  const bodyLo = feetY + 0.25;
  const bodyHi = feetY + height;
  for (const w of walls) {
    if (w.y1 <= bodyLo || w.y0 >= bodyHi) continue;
    if (x > w.x0 - r && x < w.x1 + r && z > w.z0 - r && z < w.z1 + r) return true;
  }
  return false;
}

/** Highest surface at (x, z) with y <= maxY, or null. */
export function topSurfaceAt(surfaces: Surface[], x: number, z: number, maxY: number): Surface | null {
  let best: Surface | null = null;
  for (const s of surfaces) {
    if (s.y > maxY) continue;
    if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) continue;
    if (!best || s.y > best.y) best = s;
  }
  return best;
}
