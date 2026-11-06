/**
 * Kinematic player controller (M2) — pure TS, deterministic, headless-testable.
 *
 * Model: axis-separated horizontal moves against wall AABBs, ground-stick /
 * step-up / step-down against walkable surfaces, gravity + jump arcs when
 * airborne, circle push-out for trees. No physics engine — movement states
 * (flight/dash/cling) will layer on top of this in M4+.
 */

import type { Intent, WorldState } from './types';
import { DEFAULT_COLLISION, topSurfaceAt, wallBlocks, type CollisionWorld } from './city/colliders';

/** Tuning knobs (data-driven candidate; move to config when the armour stat system lands). */
export const MOVE_SPEED = 8;
export const GRAVITY = -28;
export const JUMP_V = 11; // ≈2.1 m apex — universal double-jump reaches ≈4 m
export const STEP_H = 0.7; // max step-up/down while grounded
export const PLAYER_R = 0.45;
export const PLAYER_H = 1.9;

export function createWorld(collision: CollisionWorld = DEFAULT_COLLISION): WorldState {
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
    },
    collision,
  } as WorldState;
}

/**
 * Advance the world by one fixed step.
 * Diagonal input is normalized; horizontal movement is axis-separated so
 * sliding along walls feels right.
 */
export function stepWorld(world: WorldState, intent: Intent, dt: number): void {
  const p = world.player;
  const col = world.collision ?? DEFAULT_COLLISION;

  // ── Horizontal ───────────────────────────────────────────────────────
  const len = Math.hypot(intent.moveX, intent.moveZ);
  let vx = 0;
  let vz = 0;
  if (len > 0.0001) {
    const scale = (len > 1 ? 1 / len : 1) * MOVE_SPEED;
    vx = intent.moveX * scale;
    vz = intent.moveZ * scale;
  }
  p.vx = vx;
  p.vz = vz;

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

  // Trees: circle push-out (runs after axis moves so sliding along a trunk works).
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
        // Dead centre: push along +x (direction is arbitrary but stable).
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
  if (p.grounded) {
    // Stick / step: highest surface at or below feet+STEP_H.
    const top = topSurfaceAt(col.surfaces, p.x, p.z, p.y + STEP_H);
    if (!top || top.y < p.y - STEP_H) {
      p.grounded = false; // walked off an edge
      p.vy = 0;
    } else {
      p.y = top.y; // step up ramps, down small ledges
    }
  }

  if (!p.grounded) {
    p.vy += GRAVITY * dt;
    const prevY = p.y;
    p.y += p.vy * dt;
    if (p.vy <= 0) {
      // Land on the highest surface crossed this step.
      const land = topSurfaceAt(col.surfaces, p.x, p.z, prevY + 0.01);
      if (land && land.y >= p.y) {
        p.y = land.y;
        p.vy = 0;
        p.grounded = true;
        p.jumps = 0;
      }
    }
    if (p.y < -20) {
      // Out-of-world safety net (should not happen; respawn is render-side).
      p.y = col.spawn.y;
      p.x = col.spawn.x;
      p.z = col.spawn.z;
      p.vy = 0;
      p.grounded = true;
      p.jumps = 0;
    }
  }

  // ── Jump (universal double-jump; branch-specific overrides come in M4) ──
  if (intent.jumpPressed && (p.grounded || p.jumps < 2)) {
    p.vy = JUMP_V;
    p.grounded = false;
    p.jumps++;
  }
  if (p.grounded) p.jumps = 0;

  world.time += dt;
}
