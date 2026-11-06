/**
 * M0 placeholder player movement: camera-relative planar motion with instant
 * velocity. Jump, gravity, collision and the full kinematic controller arrive
 * in M2 — this exists only to prove the sim/render split and input plumbing.
 */

import type { Intent, WorldState } from './types';

/** Placeholder run speed in m/s (tuning knob; replaced by the armour stat system in M2+). */
export const MOVE_SPEED = 8;

export function createWorld(): WorldState {
  return {
    time: 0,
    player: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0 },
  };
}

/**
 * Advance the world by one fixed step.
 * Diagonal input is normalized so strafe+forward never exceeds run speed.
 */
export function stepWorld(world: WorldState, intent: Intent, dt: number): void {
  const len = Math.hypot(intent.moveX, intent.moveZ);
  let vx = 0;
  let vz = 0;

  if (len > 0.0001) {
    const scale = (len > 1 ? 1 / len : 1) * MOVE_SPEED;
    vx = intent.moveX * scale;
    vz = intent.moveZ * scale;
  }

  world.player.vx = vx;
  world.player.vz = vz;
  world.player.x += vx * dt;
  world.player.z += vz * dt;

  if (len > 0.0001) {
    world.player.yaw = Math.atan2(vx, vz);
  }

  world.time += dt;
}
