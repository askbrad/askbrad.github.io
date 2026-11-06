/**
 * Procedural city builder: turns CITY data into Babylon meshes.
 *
 * Readability rules (plan §4, tech-tree §10) are binding:
 *  - walkable surfaces (street, slabs, caps) warm + bright, with pale rims;
 *  - background architecture cool + subdued, non-glowing windows (later polish);
 *  - trees thin-instanced (2 draw calls total for trunk + canopy sets).
 *
 * Cutaway: each enterable building's exterior walls are grouped per storey.
 * `update(px, py, pz, dt)` fades the walls at/above the player's storey while
 * they are inside, so interiors stay readable from the fixed high camera
 * (plan §4). Uses per-mesh `visibility` — no material clones.
 *
 * NOTE (M1 spike scope): sewer shafts are open holes in the corridor ceiling
 * with a dark chute box rising to street level; the street-side opening is a
 * rimmed decal. True through-holes in the street slab arrive with M2 colliders.
 */

import { Color3, Matrix, Mesh, MeshBuilder, Quaternion, StandardMaterial, Vector3 } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';
import {
  CITY,
  LAYER,
  STOREY_H,
  STREET_Y,
  TREES,
  floorAt,
  type BuildingDef,
  type Rect,
} from '../../sim/city/city';

const WALL_T = 0.5; // exterior wall thickness
const SLAB_T = 0.4; // floor slab thickness
const RIM_H = 0.14;
const RIM_T = 0.6;
const FADED = 0.07;
const FADE_RATE = 10; // lerp rate toward target visibility

function mat(scene: Scene, name: string, r: number, g: number, b: number, emissive = 0): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = new Color3(r, g, b);
  m.specularColor = new Color3(0.03, 0.03, 0.03);
  if (emissive > 0) m.emissiveColor = new Color3(r * emissive, g * emissive, b * emissive);
  return m;
}

interface BuildingRender {
  def: BuildingDef;
  /** Exterior wall meshes keyed by storey (1-based). */
  wallsByStorey: Mesh[][];
  /** Floor slab + rims per storey (1-based); the top entry is the roof cap. */
  slabsByStorey: Mesh[][];
}

export interface CityRender {
  update(px: number, py: number, pz: number, dt: number): void;
  /** Hide/show a gate force field (M4 hacking). */
  setGateOpen(id: string, open: boolean): void;
  /** Energize a relay's ring when its objective completes (M5). */
  setRelayActive(id: string, active: boolean): void;
}

export function buildCity(scene: Scene): CityRender {
  const E = CITY.meta.extent;

  // ── Materials ─────────────────────────────────────────────────────────
  const streetMat = mat(scene, 'street', 0.42, 0.37, 0.31); // warm asphalt
  const parkMat = mat(scene, 'park', 0.3, 0.42, 0.24); // warm-green grass
  const slabMat = mat(scene, 'slab', 0.56, 0.47, 0.34); // warm walkable interior
  const rimMat = mat(scene, 'rim', 0.9, 0.84, 0.66, 0.35); // pale landing rims
  const wallMat = mat(scene, 'wall', 0.27, 0.32, 0.41); // cool architecture
  const blockMat = mat(scene, 'block', 0.24, 0.29, 0.37);
  const sewerMat = mat(scene, 'sewer', 0.17, 0.18, 0.21);
  const trunkMat = mat(scene, 'trunk', 0.3, 0.22, 0.14);
  const canopyMat = mat(scene, 'canopy', 0.22, 0.38, 0.2);

  const box = (name: string, w: number, h: number, d: number, x: number, y: number, z: number, m: StandardMaterial): Mesh => {
    const b = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
    b.position.set(x, y, z);
    b.material = m;
    b.isPickable = false;
    return b;
  };

  /** Pale landing rim strips along a slab's 4 edges. */
  const addRim = (r: Rect, topY: number): Mesh[] => {
    const w = r.x1 - r.x0;
    const d = r.z1 - r.z0;
    const cx = (r.x0 + r.x1) / 2;
    const cz = (r.z0 + r.z1) / 2;
    return [
      box('rim', w, RIM_H, RIM_T, cx, topY + RIM_H / 2, r.z0 + RIM_T / 2, rimMat),
      box('rim', w, RIM_H, RIM_T, cx, topY + RIM_H / 2, r.z1 - RIM_T / 2, rimMat),
      box('rim', RIM_T, RIM_H, d, r.x0 + RIM_T / 2, topY + RIM_H / 2, cz, rimMat),
      box('rim', RIM_T, RIM_H, d, r.x1 - RIM_T / 2, topY + RIM_H / 2, cz, rimMat),
    ];
  };

  /** Walkable slab + rim; top surface at topY. Returns [slab, ...rims]. */
  const addSlab = (r: Rect, topY: number, m: StandardMaterial): Mesh[] => {
    const slab = box('slab', r.x1 - r.x0, SLAB_T, r.z1 - r.z0, (r.x0 + r.x1) / 2, topY - SLAB_T / 2, (r.z0 + r.z1) / 2, m);
    return [slab, ...addRim(r, topY)];
  };

  // ── Street + parks ────────────────────────────────────────────────────
  const street = box('street', E * 2, SLAB_T, E * 2, 0, STREET_Y - SLAB_T / 2, 0, streetMat);
  const sewerShell: Mesh[] = [street]; // ghosts when the player is underground
  for (const p of CITY.parks) {
    sewerShell.push(
      box(`park_${p.id}`, p.x1 - p.x0, 0.06, p.z1 - p.z0, (p.x0 + p.x1) / 2, STREET_Y + 0.03, (p.z0 + p.z1) / 2, parkMat),
    );
  }

  // ── Trees (thin instances — 2 draw calls) ─────────────────────────────
  const trunk = MeshBuilder.CreateCylinder('treeTrunk', { height: 2.6, diameter: 0.5 }, scene);
  trunk.material = trunkMat;
  const canopy = MeshBuilder.CreateIcoSphere('treeCanopy', { radius: 1.9, subdivisions: 1 }, scene);
  canopy.material = canopyMat;
  trunk.thinInstanceAdd(TREES.map((t) => Matrix.Translation(t.x, STREET_Y + 1.3 * t.s, t.z)));
  canopy.thinInstanceAdd(
    TREES.map((t) =>
      Matrix.Compose(
        new Vector3(t.s, t.s, t.s),
        Quaternion.Identity(),
        new Vector3(t.x, STREET_Y + (1.3 + 2.4) * t.s, t.z),
      ),
    ),
  );
  trunk.isPickable = false;
  canopy.isPickable = false;

  // ── Solid background blocks (roofs are walkable landing surfaces) ─────
  for (const s of CITY.solidBlocks) {
    box(`block_${s.id}`, s.x1 - s.x0, s.h, s.z1 - s.z0, (s.x0 + s.x1) / 2, STREET_Y + s.h / 2, (s.z0 + s.z1) / 2, blockMat);
    addSlab(s, STREET_Y + s.h + 0.001, slabMat);
  }

  // ── Enterable buildings ───────────────────────────────────────────────
  const tools: BuilderTools = { box, addSlab, wallMat, slabMat };
  const renders: BuildingRender[] = CITY.buildings.map((def) => buildEnterable(scene, def, tools));

  // ── Sewer ─────────────────────────────────────────────────────────────
  buildSewer(CITY.sewer, { box, addRim, sewerMat, sewerShell });

  // ── Upgrade gates: force field + terminal ─────────────────────────────
  const gateMat = new StandardMaterial('gateField', scene);
  gateMat.diffuseColor = new Color3(0.9, 0.2, 0.15);
  gateMat.emissiveColor = new Color3(0.55, 0.08, 0.05);
  gateMat.alpha = 0.45;
  const terminalMat = mat(scene, 'terminal', 0.2, 0.24, 0.3);
  const terminalScreenMat = mat(scene, 'terminalScreen', 0.1, 0.85, 0.35, 1.2);
  const gateMeshes = new Map<string, Mesh>();
  for (const g of CITY.gates ?? []) {
    const w = g.wall;
    const field = box(`gate_${g.id}`, w.x1 - w.x0, w.y1 - w.y0, w.z1 - w.z0, (w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2, (w.z0 + w.z1) / 2, gateMat);
    gateMeshes.set(g.id, field);
    box(`terminal_${g.id}`, 0.9, 2.4, 0.9, g.terminal.x, STREET_Y + 1.2, g.terminal.z, terminalMat);
    box(`terminal_screen_${g.id}`, 0.7, 0.9, 0.15, g.terminal.x, STREET_Y + 1.7, g.terminal.z + 0.45, terminalScreenMat).rotation.x = -0.35;
  }

  // ── Objective relays: pylons with an activation ring ──────────────────
  const relayMat = mat(scene, 'relayPylon', 0.3, 0.35, 0.42);
  const relayRingOff = mat(scene, 'relayRingOff', 0.5, 0.5, 0.55, 0.4);
  const relayRingOn = mat(scene, 'relayRingOn', 0.2, 0.95, 0.45, 1.0);
  const relayRingMeshes = new Map<string, Mesh>();
  for (const r of CITY.relays ?? []) {
    box(`relay_${r.id}`, 0.7, 3.2, 0.7, r.x, STREET_Y + 1.6, r.z, relayMat);
    const ring = MeshBuilder.CreateTorus(`relay_ring_${r.id}`, { diameter: 3, thickness: 0.12, tessellation: 32 }, scene);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(r.x, STREET_Y + 0.2, r.z);
    ring.material = relayRingOff;
    ring.isPickable = false;
    relayRingMeshes.set(r.id, ring);
  }

  // ── Cutaway driver ────────────────────────────────────────────────────
  // Diablo rule: inside a building, structure AT/ABOVE the player's storey
  // goes ghost — walls from the player's storey up, floor slabs (ceilings)
  // strictly above it. The player's own floor stays solid underfoot.
  // Underground (sewer): the street plane, sewer ceilings and shaft chutes
  // ghost so the top-down camera can see the corridor.
  const vis = new Map<Mesh, { cur: number; target: number }>();
  for (const r of renders) {
    for (const arr of [...r.wallsByStorey, ...r.slabsByStorey]) {
      for (const w of arr) vis.set(w, { cur: 1, target: 1 });
    }
  }
  const shellVis = new Map<Mesh, { cur: number; target: number }>();
  for (const m of sewerShell) shellVis.set(m, { cur: 1, target: 1 });

  return {
    update(px, py, pz, dt) {
      // Underground → full x-ray: street, ceilings, chutes AND all building
      // structure ghost so the top-down camera sees the corridor (the faint
      // city outline above doubles as an orientation cue).
      const underground = floorAt(px, py, pz).layer === LAYER.SEWER;
      const shellTarget = underground ? FADED : 1;
      const structureTarget: number | null = underground ? FADED : null; // null → per-storey rules
      for (const v of shellVis.values()) v.target = shellTarget;

      for (const r of renders) {
        const inside = px >= r.def.x0 && px <= r.def.x1 && pz >= r.def.z0 && pz <= r.def.z1;
        const storey = inside
          ? Math.min(r.def.floors, Math.max(1, Math.floor((py - STREET_Y) / STOREY_H) + 1))
          : 0;

        for (let s = 1; s <= r.def.floors; s++) {
          const wallTarget = structureTarget ?? (inside && s >= storey ? FADED : 1);
          for (const w of r.wallsByStorey[s - 1] ?? []) {
            const v = vis.get(w);
            if (v) v.target = wallTarget;
          }
          const slabTarget = structureTarget ?? (inside && s > storey ? FADED : 1);
          for (const m of r.slabsByStorey[s - 1] ?? []) {
            const v = vis.get(m);
            if (v) v.target = slabTarget;
          }
        }
      }

      for (const [mesh, v] of vis) {
        v.cur += (v.target - v.cur) * Math.min(1, FADE_RATE * dt);
        if (Math.abs(v.cur - v.target) < 0.005) v.cur = v.target;
        mesh.visibility = v.cur;
      }
      for (const [mesh, v] of shellVis) {
        v.cur += (v.target - v.cur) * Math.min(1, FADE_RATE * dt);
        if (Math.abs(v.cur - v.target) < 0.005) v.cur = v.target;
        mesh.visibility = v.cur;
      }
    },
    setGateOpen(id, open) {
      gateMeshes.get(id)?.setEnabled(!open);
    },
    setRelayActive(id, active) {
      const ring = relayRingMeshes.get(id);
      if (ring) ring.material = active ? relayRingOn : relayRingOff;
    },
  };
}

interface BuilderTools {
  box(name: string, w: number, h: number, d: number, x: number, y: number, z: number, m: StandardMaterial): Mesh;
  addSlab(r: Rect, topY: number, m: StandardMaterial): Mesh[];
  wallMat: StandardMaterial;
  slabMat: StandardMaterial;
}

/** One enterable building: slabs + rims per storey, per-storey exterior walls (door gap on storey 1), interior ramp, roof cap. */
function buildEnterable(scene: Scene, def: BuildingDef, t: BuilderTools): BuildingRender {
  const { x0, z0, x1, z1 } = def;
  const w = x1 - x0;
  const d = z1 - z0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;

  const wallsByStorey: Mesh[][] = [];
  const slabsByStorey: Mesh[][] = [];

  for (let s = 1; s <= def.floors; s++) {
    const base = STREET_Y + (s - 1) * STOREY_H;
    const walls: Mesh[] = [];

    // Walkable slab at this storey's base (top surface = base).
    const slabParts = t.addSlab(def, base, t.slabMat);

    const wall = (tag: string, ww: number, dd: number, wx: number, wz: number): void => {
      walls.push(t.box(`${def.id}_w${s}_${tag}`, ww, STOREY_H, dd, wx, base + STOREY_H / 2, wz, t.wallMat));
    };

    // Four elevations; north = -Z, south = +Z, west = -X, east = +X.
    const northWall = () => wall('n', w + WALL_T, WALL_T, cx, z0 - WALL_T / 2);
    const southWall = () => wall('s', w + WALL_T, WALL_T, cx, z1 + WALL_T / 2);
    const westWall = () => wall('w', WALL_T, d, x0 - WALL_T / 2, cz);
    const eastWall = () => wall('e', WALL_T, d, x1 + WALL_T / 2, cz);

    /** Two wall segments flanking the door gap on the entrance elevation. */
    const dooredWall = (): void => {
      const along = def.entrance.side === 'north' || def.entrance.side === 'south' ? 'x' : 'z';
      const len = along === 'x' ? w : d;
      const centre = along === 'x' ? cx : cz;
      const gap = def.entrance.width;
      const off = def.entrance.offset;
      const segA = len / 2 + off - gap / 2; // wall length from low edge to gap
      const segB = len / 2 - off - gap / 2; // from gap to high edge
      const atLow = centre - (len / 2 - segA / 2);
      const atHigh = centre + (len / 2 - segB / 2);
      const outer = along === 'x'
        ? (def.entrance.side === 'south' ? z1 + WALL_T / 2 : z0 - WALL_T / 2)
        : (def.entrance.side === 'east' ? x1 + WALL_T / 2 : x0 - WALL_T / 2);

      if (segA > 0.01) {
        walls.push(along === 'x'
          ? t.box(`${def.id}_w1_dA`, segA, STOREY_H, WALL_T, atLow, base + STOREY_H / 2, outer, t.wallMat)
          : t.box(`${def.id}_w1_dA`, WALL_T, STOREY_H, segA, outer, base + STOREY_H / 2, atLow, t.wallMat));
      }
      if (segB > 0.01) {
        walls.push(along === 'x'
          ? t.box(`${def.id}_w1_dB`, segB, STOREY_H, WALL_T, atHigh, base + STOREY_H / 2, outer, t.wallMat)
          : t.box(`${def.id}_w1_dB`, WALL_T, STOREY_H, segB, outer, base + STOREY_H / 2, atHigh, t.wallMat));
      }
    };

    if (s === 1) {
      // Three solid elevations, then the doored one split.
      if (def.entrance.side === 'south') { northWall(); westWall(); eastWall(); dooredWall(); }
      else if (def.entrance.side === 'north') { southWall(); westWall(); eastWall(); dooredWall(); }
      else if (def.entrance.side === 'west') { northWall(); southWall(); eastWall(); dooredWall(); }
      else { northWall(); southWall(); westWall(); dooredWall(); }
    } else {
      northWall();
      southWall();
      westWall();
      eastWall();
    }

    // Interior ramp to the next storey (replaced by authored stairs in M2+).
    if (s < def.floors) {
      const run = Math.min(w - 6, 24);
      const len = Math.hypot(STOREY_H, run);
      const ramp = t.box(`${def.id}_ramp${s}`, len, 0.3, 2.6, cx + w / 2 - run / 2 - 2, base + STOREY_H / 2, z0 + 2.2, t.slabMat);
      ramp.rotation.z = Math.atan2(STOREY_H, run);
    }

    wallsByStorey.push(walls);
    slabsByStorey.push(slabParts);
  }

  // Roof props (cool, subdued).
  const capTop = STREET_Y + def.floors * STOREY_H;
  let propIndex = 0;
  for (const p of def.roofProps) {
    const px = x0 + 4 + propIndex * 6;
    const pz = z0 + 4;
    if (p === 'hvac') t.box(`${def.id}_hvac${propIndex}`, 3, 1.6, 2.2, px, capTop + 0.8, pz, t.wallMat);
    if (p === 'antenna') t.box(`${def.id}_ant${propIndex}`, 0.4, 6, 0.4, px, capTop + 3, pz, t.wallMat);
    propIndex++;
  }

  return { def, wallsByStorey, slabsByStorey };
}

interface SewerTools {
  box(name: string, w: number, h: number, d: number, x: number, y: number, z: number, m: StandardMaterial): Mesh;
  addRim(r: Rect, topY: number): void;
  sewerMat: StandardMaterial;
  /** Meshes that ghost when the player is in the sewer (ceilings, chutes, grates). */
  sewerShell: Mesh[];
}

/** Sewer corridors: dark floor/walls/ceiling with bright-rimmed shaft holes. */
function buildSewer(sewer: typeof CITY.sewer, t: SewerTools): void {
  const { floorY, ceilY } = sewer;
  const h = ceilY - floorY;

  for (let ci = 0; ci < sewer.corridors.length; ci++) {
    const c = sewer.corridors[ci]!;
    const w = c.x1 - c.x0;
    const d = c.z1 - c.z0;
    const cx = (c.x0 + c.x1) / 2;
    const cz = (c.z0 + c.z1) / 2;

    t.box(`sewer_floor_${ci}`, w, 0.7, d, cx, floorY - 0.35, cz, t.sewerMat);
    t.box(`sewer_wallN_${ci}`, w + 1, h, 0.8, cx, floorY + h / 2, c.z0 - 0.4, t.sewerMat);
    t.box(`sewer_wallS_${ci}`, w + 1, h, 0.8, cx, floorY + h / 2, c.z1 + 0.4, t.sewerMat);
    t.box(`sewer_wallW_${ci}`, 0.8, h, d, c.x0 - 0.4, floorY + h / 2, cz, t.sewerMat);
    t.box(`sewer_wallE_${ci}`, 0.8, h, d, c.x1 + 0.4, floorY + h / 2, cz, t.sewerMat);

    // Ceiling segments with gaps at shafts (horizontal corridors run along x, vertical along z).
    const horizontal = w >= d;
    const lo = horizontal ? c.x0 : c.z0;
    const hi = horizontal ? c.x1 : c.z1;
    const holes = sewer.shafts
      .filter((sh) =>
        sh.x >= c.x0 && sh.x <= c.x1 && sh.z >= c.z0 && sh.z <= c.z1)
      .map((sh) => (horizontal ? sh.x : sh.z))
      .sort((a, b) => a - b);

    const edges = [lo - 4, ...holes.flatMap((hp) => [hp - 3.5, hp + 3.5]), hi + 4];
    for (let i = 0; i < edges.length; i += 2) {
      const a = edges[i]!;
      const b = edges[i + 1]!;
      if (b <= a) continue;
      const len = b - a;
      const mid = (a + b) / 2;
      if (horizontal) t.sewerShell.push(t.box(`sewer_ceil_${ci}_${i}`, len, 0.6, d, mid, ceilY + 0.3, cz, t.sewerMat));
      else t.sewerShell.push(t.box(`sewer_ceil_${ci}_${i}`, w, 0.6, len, cx, ceilY + 0.3, mid, t.sewerMat));
    }

    // Dark chutes + street-side grate decals + bright rims at each shaft.
    for (const sh of sewer.shafts) {
      if (sh.x < c.x0 || sh.x > c.x1 || sh.z < c.z0 || sh.z > c.z1) continue;
      t.addRim({ x0: sh.x - 3.5, z0: sh.z - 3.5, x1: sh.x + 3.5, z1: sh.z + 3.5 }, ceilY + 0.62);
      // Chute interior (dark walls rising to street level; punched through in M2).
      const ch = STREET_Y - ceilY;
      t.sewerShell.push(t.box(`shaft_chuteN_${sh.x}_${sh.z}`, 7.6, ch, 0.4, sh.x, ceilY + ch / 2, sh.z - 3.6, t.sewerMat));
      t.sewerShell.push(t.box(`shaft_chuteS_${sh.x}_${sh.z}`, 7.6, ch, 0.4, sh.x, ceilY + ch / 2, sh.z + 3.6, t.sewerMat));
      t.sewerShell.push(t.box(`shaft_chuteW_${sh.x}_${sh.z}`, 0.4, ch, 7.6, sh.x - 3.6, ceilY + ch / 2, sh.z, t.sewerMat));
      t.sewerShell.push(t.box(`shaft_chuteE_${sh.x}_${sh.z}`, 0.4, ch, 7.6, sh.x + 3.6, ceilY + ch / 2, sh.z, t.sewerMat));
      // Street-level grate rim decal.
      t.addRim({ x0: sh.x - 3.5, z0: sh.z - 3.5, x1: sh.x + 3.5, z1: sh.z + 3.5 }, STREET_Y + 0.02);
    }
  }
}
