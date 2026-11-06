/**
 * City data model + spatial queries for the fixed test level.
 * Pure TS (sim side): floor/layer occupancy is what drives the render-side
 * cutaway, the HUD readout, and (in M2) movement colliders.
 */

import raw from '../../data/city-test.json';

// ── Data shapes ─────────────────────────────────────────────────────────────

export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export interface EntranceDef {
  side: 'north' | 'south' | 'east' | 'west';
  /** Offset along the wall from its centre, metres. */
  offset: number;
  width: number;
}

export interface BuildingDef {
  id: string;
  name: string;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  floors: number;
  entrance: EntranceDef;
  roofProps: string[];
}

export interface SolidBlockDef extends Rect {
  id: string;
  h: number;
}

export interface ParkDef extends Rect {
  id: string;
}

export interface SewerShaft {
  x: number;
  z: number;
}

export interface SewerDef {
  floorY: number;
  ceilY: number;
  corridors: Rect[];
  shafts: SewerShaft[];
}

export interface CityData {
  meta: { name: string; extent: number; streetY: number; storeyHeight: number };
  buildings: BuildingDef[];
  solidBlocks: SolidBlockDef[];
  parks: ParkDef[];
  sewer: SewerDef;
  deploy: { x: number; z: number };
  extract: { x: number; z: number };
  gates?: GateDef[];
  relays?: Array<{ id: string; x: number; z: number }>;
}

export const CITY = raw as unknown as CityData;

export const STREET_Y = CITY.meta.streetY;
export const STOREY_H = CITY.meta.storeyHeight;
export const EXTENT = CITY.meta.extent;

export interface GateDef {
  id: string;
  terminal: { x: number; z: number };
  wall: { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number };
}

// ── Layers / occupancy ──────────────────────────────────────────────────────

export const LAYER = {
  SEWER: 'sewer',
  STREET: 'street',
  INTERIOR: 'interior',
  ROOF: 'roof',
} as const;
export type Layer = (typeof LAYER)[keyof typeof LAYER];

export interface FloorRef {
  layer: Layer;
  /** Present for interior/roof. */
  buildingId?: string;
  /** 1-based storey number, interior only. */
  storey?: number;
}

export function inRect(r: Rect, x: number, z: number, pad = 0): boolean {
  return x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad;
}

export function roofY(b: BuildingDef): number {
  return STREET_Y + b.floors * STOREY_H;
}

/**
 * Which floor/layer is the point at (x, y, z) in?
 * Priority: enterable building interior/roof → sewer → street.
 */
export function floorAt(x: number, y: number, z: number): FloorRef {
  for (const b of CITY.buildings) {
    if (!inRect(b, x, z)) continue;
    const top = roofY(b);
    if (y >= top - 0.75) return { layer: LAYER.ROOF, buildingId: b.id };
    if (y >= STREET_Y - 0.5) {
      const storey = Math.min(b.floors, Math.max(1, Math.floor((y - STREET_Y) / STOREY_H) + 1));
      return { layer: LAYER.INTERIOR, buildingId: b.id, storey };
    }
  }
  if (y < STREET_Y - 1.5) {
    for (const c of CITY.sewer.corridors) {
      if (inRect(c, x, z)) return { layer: LAYER.SEWER };
    }
  }
  return { layer: LAYER.STREET };
}

/** Human-readable HUD label for a floor ref. */
export function floorLabel(ref: FloorRef): string {
  switch (ref.layer) {
    case LAYER.SEWER:
      return 'SEWER';
    case LAYER.ROOF: {
      const b = CITY.buildings.find((x) => x.id === ref.buildingId);
      return `ROOF · ${(b?.name ?? ref.buildingId ?? '').toUpperCase()}`;
    }
    case LAYER.INTERIOR: {
      const b = CITY.buildings.find((x) => x.id === ref.buildingId);
      return `${(b?.name ?? '').toUpperCase()} · F${ref.storey}`;
    }
    default:
      return 'STREET';
  }
}

// ── Tree obstacles (sim-owned: they block movement in M2) ───────────────────

export interface TreeObstacle {
  x: number;
  z: number;
  /** Collision radius, metres. */
  r: number;
  /** Visual canopy height scale. */
  s: number;
}

function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

/** Deterministic tree scatter: grid per park with seeded jitter. */
export const TREES: TreeObstacle[] = (() => {
  const rand = lcg(1234567);
  const trees: TreeObstacle[] = [];
  for (const park of CITY.parks) {
    for (let gx = park.x0 + 4; gx <= park.x1 - 4; gx += 7) {
      for (let gz = park.z0 + 4; gz <= park.z1 - 4; gz += 7) {
        if (rand() < 0.18) continue; // natural gaps
        trees.push({
          x: gx + (rand() - 0.5) * 3,
          z: gz + (rand() - 0.5) * 3,
          r: 2.2,
          s: 0.85 + rand() * 0.5,
        });
      }
    }
  }
  return trees;
})();

/** True if (x, z) is inside a tree trunk's blocking radius. */
export function blockedByTree(x: number, z: number, pad = 0): boolean {
  return TREES.some((t) => (x - t.x) ** 2 + (z - t.z) ** 2 <= (t.r + pad) ** 2);
}
