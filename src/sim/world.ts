/**
 * Kinematic player controller + armour abilities (M4) — pure TS, deterministic,
 * headless-testable. Movement: axis-separated horizontal moves against wall
 * AABBs, ground-stick / step-up, gravity + universal double-jump, tree
 * push-out. Abilities layered on top, all data-driven from the loadout:
 *  - Aerial hover (hold jump airborne; drains the reactor; Vector mode off)
 *  - Vector dash (charges + recharge, energy cost)
 *  - Hacking channel on gate terminals
 *  - Recovery landing reserve
 *  - Aerial move-speed multiplier
 */

import type { Intent, WorldState } from './types';
import { DEFAULT_COLLISION, openGate, topSurfaceAt, wallBlocks, type CollisionWorld } from './city/colliders';
import { createCombat, stepCombat } from './combat';
import { createMission, stepMission } from './mission';
import { TUNE, canPay, createReactor } from './energy';
import {
  aerialTier,
  cycleMode,
  flightAllowed,
  recoveryEffects,
  tierDef,
  tierOf,
  vectorTier,
  type Loadout,
} from './build';

/** Tuning knobs (data-driven candidate; move to config when the armour stat system lands). */
export const MOVE_SPEED = 8;
export const GRAVITY = -28;
export const JUMP_V = 11;
export const STEP_H = 0.7;
export const PLAYER_R = 0.45;
export const PLAYER_H = 1.9;
/** Debug-fly vertical speed (QA affordance; real flight drains the reactor). */
export const FLY_VERT_SPEED = 14;
/** Vector dash. */
export const DASH_SPEED = 26;
export const DASH_TIME = 0.18;
export const DASH_RECHARGE = 2.5;
/** Aerial hover: rise rate factor vs data hoverAscent. */
export const HOVER_RISE = 1.0;

export function createWorld(collision: CollisionWorld = DEFAULT_COLLISION, loadout: Loadout | undefined = undefined): WorldState {
  const lo = loadout ?? {
    credits: 0,
    modules: [],
    mode: 'STANDARD' as const,
    toggles: { freePurchases: false, infiniteEnergy: false },
  };
  return {
    time: 0,
    player: {
      x: collision.spawn.x,
      y: collision.spawn.y,
      z: collision.spawn.z,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: 0,
      grounded: true,
      jumps: 0,
      dashCharges: 0,
      dashRecharge: 0,
      dashTime: 0,
      dashDirX: 0,
      dashDirZ: 1,
      airTime: 0,
      hoverLocked: false,
    },
    collision,
    combat: createCombat(),
    reactor: createReactor(lo),
    stats: { hull: TUNE.maxHull, maxHull: TUNE.maxHull, credits: lo.credits, scrap: 0, deaths: 0, kills: 0 },
    loadout: lo,
    hack: { progress: 0, target: null },
    mission: createMission(),
  };
}

/**
 * Advance the world by one fixed step. Diagonal input normalized; horizontal
 * movement is axis-separated so sliding along walls feels right.
 */
export function stepWorld(world: WorldState, intent: Intent, dt: number): void {
  const p = world.player;
  const col = world.collision ?? DEFAULT_COLLISION;
  const lo = world.loadout;

  // ── Mode cycling ─────────────────────────────────────────────────────
  if (intent.modeNextPressed) cycleMode(lo, 1);
  if (intent.modePrevPressed) cycleMode(lo, -1);

  // ── Horizontal ───────────────────────────────────────────────────────
  const aerial = aerialTier(lo);
  const aerialFx = aerial > 0 ? TREE_EFFECTS_AERIAL(aerial) : null;
  const speed = MOVE_SPEED * (aerialFx?.['moveMult'] ?? 1);

  const len = Math.hypot(intent.moveX, intent.moveZ);
  let vx = 0;
  let vz = 0;
  if (len > 0.0001) {
    const scale = (len > 1 ? 1 / len : 1) * speed;
    vx = intent.moveX * scale;
    vz = intent.moveZ * scale;
  }
  p.vx = vx;
  p.vz = vz;

  // Vector dash: burst in the move direction (or facing), cost + charges.
  const vTier = vectorTier(lo);
  const vFx = vTier > 0 ? TREE_EFFECTS_VECTOR(vTier) : null;
  if (vFx && intent.dashPressed && p.dashTime <= 0 && p.dashCharges > 0 &&
      canPay(world.reactor, vFx['cost'] ?? 12, lo.toggles.infiniteEnergy)) {
    p.dashCharges--;
    p.dashTime = DASH_TIME;
    const dl = len > 0.01 ? len : 1;
    p.dashDirX = (len > 0.01 ? intent.moveX / dl : Math.sin(p.yaw)) * DASH_SPEED;
    p.dashDirZ = (len > 0.01 ? intent.moveZ / dl : Math.cos(p.yaw)) * DASH_SPEED;
    if (!lo.toggles.infiniteEnergy) world.reactor.energy = Math.max(0, world.reactor.energy - (vFx['cost'] ?? 12));
  }
  if (p.dashCharges < (vFx?.['charges'] ?? 0)) {
    p.dashRecharge -= dt;
    if (p.dashRecharge <= 0) {
      p.dashCharges++;
      p.dashRecharge = DASH_RECHARGE;
    }
  } else {
    p.dashRecharge = DASH_RECHARGE;
  }

  const dashing = p.dashTime > 0;
  if (dashing) {
    p.dashTime -= dt;
    // Dash overrides run velocity; respects walls.
    if (!wallBlocks(col.walls, p.x + p.dashDirX * dt, p.z, p.y, PLAYER_R, PLAYER_H)) p.x += p.dashDirX * dt;
    if (!wallBlocks(col.walls, p.x, p.z + p.dashDirZ * dt, p.y, PLAYER_R, PLAYER_H)) p.z += p.dashDirZ * dt;
  } else {
    const moveAxis = (axis: 'x' | 'z', delta: number): void => {
      if (Math.abs(delta) < 1e-9) return;
      const nx = axis === 'x' ? p.x + delta : p.x;
      const nz = axis === 'z' ? p.z + delta : p.z;
      if (!wallBlocks(col.walls, nx, nz, p.y, PLAYER_R, PLAYER_H)) {
        p.x = nx;
        p.z = nz;
      }
    };
    moveAxis('x', vx * dt);
    moveAxis('z', vz * dt);
  }

  // Trees: circle push-out.
  for (const t of col.trees) {
    const dx = p.x - t.x;
    const dz = p.z - t.z;
    const min = t.r + PLAYER_R;
    const d2 = dx * dx + dz * dz;
    if (d2 < min * min) {
      let d = Math.sqrt(d2);
      let nx = dx;
      let nz = dz;
      if (d < 0.001) {
        nx = 1;
        nz = 0;
        d = 1;
      }
      p.x = t.x + (nx / d) * min;
      p.z = t.z + (nz / d) * min;
    }
  }

  if (len > 0.0001) p.yaw = Math.atan2(vx, vz);

  // ── Vertical ─────────────────────────────────────────────────────────
  if (intent.fly) {
    // Debug-fly hover (QA tool — no cost; real flight is below).
    p.y = Math.max(0.6, p.y + intent.flyUp * FLY_VERT_SPEED * dt);
    p.vy = 0;
    p.grounded = false;
    p.jumps = 0;
  } else {
    // Aerial hover: hold jump while airborne. Hysteresis: once the tank runs
    // dry mid-flight, hover stays off until landing (no regen flapping).
    const hoverCandidate = flightAllowed(lo) && !p.grounded && intent.jumpHeld && !p.hoverLocked;
    const hovering = hoverCandidate && aerialFx != null &&
      (lo.toggles.infiniteEnergy || world.reactor.energy >= 1);

    if (hoverCandidate && !hovering) p.hoverLocked = true;

    if (hovering && aerialFx) {
      // Rise while held, hold altitude otherwise; drains the reactor.
      p.vy = intent.jumpHeld && !intent.jumpPressed ? HOVER_RISE * (aerialFx['hoverAscent'] ?? 7) : 0;
      p.y += p.vy * dt;
      if (!lo.toggles.infiniteEnergy) {
        world.reactor.energy = Math.max(0, world.reactor.energy - (aerialFx['hoverDrain'] ?? 24) * dt);
        if (world.reactor.energy <= 0) p.hoverLocked = true;
      }
      p.airTime += dt;
    } else if (p.grounded && !dashing) {
      const top = topSurfaceAt(col.surfaces, p.x, p.z, p.y + STEP_H);
      if (!top || top.y < p.y - STEP_H) {
        p.grounded = false;
        p.vy = 0;
      } else {
        p.y = top.y;
      }
    }

    if (!p.grounded && !hovering) {
      if (!dashing) p.vy += GRAVITY * dt;
      else p.vy = 0;
      const prevY = p.y;
      p.y += p.vy * dt;
      p.airTime += dt;
      if (p.vy <= 0) {
        const land = topSurfaceAt(col.surfaces, p.x, p.z, prevY + 0.01);
        if (land && land.y >= p.y) {
          p.y = land.y;
          p.vy = 0;
          p.grounded = true;
          p.jumps = 0;
          p.hoverLocked = false; // landing re-arms hover
          // Recovery landing reserve: refund after a long airborne stretch.
          if (p.airTime > 0.8) {
            const reserve = recoveryEffects(lo).landingReserve;
            if (reserve > 0) world.reactor.energy = Math.min(world.reactor.max, world.reactor.energy + reserve);
          }
          p.airTime = 0;
        }
      }
      if (p.y < -20) {
        p.y = col.spawn.y;
        p.x = col.spawn.x;
        p.z = col.spawn.z;
        p.vy = 0;
        p.grounded = true;
        p.jumps = 0;
        p.airTime = 0;
      }
    }
    if (p.grounded) p.airTime = 0;

    // ── Jump (universal double-jump) ───────────────────────────────────
    if (intent.jumpPressed && (p.grounded || p.jumps < 2)) {
      p.vy = JUMP_V;
      p.grounded = false;
      p.jumps++;
    }
    if (p.grounded) p.jumps = 0;
  }

  // ── Hacking (gate terminals) ─────────────────────────────────────────
  const hTier = tierOf(lo, 'hacking');
  world.hack.target = null;
  if (hTier > 0 && intent.interactHeld && !intent.fly) {
    const hFx = TREE_EFFECTS_HACK(hTier);
    for (const gate of col.gates) {
      const stillThere = col.walls.includes(gate.wall);
      if (!stillThere) continue; // already opened
      const d = Math.hypot(gate.terminal.x - p.x, gate.terminal.z - p.z);
      if (d > (hFx['range'] ?? 3.5) || Math.abs(p.y - (gate.wall.y0)) > 4) continue;
      world.hack.target = gate.id;
      if (canPay(world.reactor, hFx['hackCost'] ?? 6, lo.toggles.infiniteEnergy)) {
        world.hack.progress += dt / (hFx['hackTime'] ?? 1.5);
        if (world.hack.progress >= 1) {
          world.hack.progress = 0;
          if (!lo.toggles.infiniteEnergy) {
            world.reactor.energy = Math.max(0, world.reactor.energy - (hFx['hackCost'] ?? 6));
          }
          openGate(col, gate.id);
          world.hack.target = null;
        }
      }
      break;
    }
  } else if (world.hack.target === null) {
    world.hack.progress = 0;
  }

  // ── Mission objectives (M5): relay channels + extraction arming ──────
  stepMission(world.mission, p, intent, dt, world.stats.kills);

  // ── Combat pass ──────────────────────────────────────────────────────
  stepCombat(
    world.combat,
    world.reactor,
    p,
    {
      fireHeld: intent.fireHeld,
      punchPressed: intent.punchPressed,
      aimX: intent.aimX,
      aimZ: intent.aimZ,
      blasterHeld: intent.blasterHeld,
    },
    { col, loadout: lo, onPlayerDeath: () => {} },
    dt,
    world.time,
    world.stats,
  );

  world.time += dt;
}

// Effect accessors keep world.ts decoupled from techtree.json typing details.
function TREE_EFFECTS_AERIAL(tier: number): Record<string, number> {
  return tierDef('aerial', tier).effects;
}
function TREE_EFFECTS_VECTOR(tier: number): Record<string, number> {
  return tierDef('vector', tier).effects;
}
function TREE_EFFECTS_HACK(tier: number): Record<string, number> {
  return tierDef('hacking', tier).effects;
}
