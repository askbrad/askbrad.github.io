/**
 * Shared simulation types.
 *
 * Everything in `src/sim/` is pure TypeScript with zero rendering/engine
 * dependencies so it can run headless under Vitest and stay deterministic.
 */

/** One frame of player intent, already converted to world space by the input layer. */
export interface Intent {
  /** Strafe axis, world space, range [-1, 1]. */
  moveX: number;
  /** Forward axis, world space, range [-1, 1]. */
  moveZ: number;
  /** Jump held (hover-hold semantics arrive with Aerial T1 in M4). */
  jumpHeld: boolean;
}

export const NO_INTENT: Intent = { moveX: 0, moveZ: 0, jumpHeld: false };

/** The player avatar. M0 placeholder — becomes the full armour rig in M4+. */
export interface PlayerState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Facing angle in radians, 0 = +Z. */
  yaw: number;
}

/** Root simulation state. Grows per milestone; keeps a stable shape for saves/tests. */
export interface WorldState {
  /** Sim seconds elapsed since deployment. */
  time: number;
  player: PlayerState;
}

/** Camera-relative input bundle consumed by the input layer (render-side only). */
export interface MoveAxes {
  strafe: number; // [-1, 1], screen-right positive
  forward: number; // [-1, 1], screen-up positive
}
