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
  /** True only on the frame the jump input transitions to pressed. */
  jumpPressed: boolean;
  /** Fire button held (baseline blaster). */
  fireHeld: boolean;
  /** True only on the frame the punch button transitions to pressed. */
  punchPressed: boolean;
  /** World-space aim direction (normalized by the combat pass; 0 = facing). */
  aimX: number;
  aimZ: number;
  /** Debug-fly mode: hover — gravity and ground-stick are skipped. */
  fly: boolean;
  /** Debug-fly vertical input: -1 descend, 0 hover, +1 ascend. */
  flyUp: number;
}

export const NO_INTENT: Intent = {
  moveX: 0,
  moveZ: 0,
  jumpHeld: false,
  jumpPressed: false,
  fireHeld: false,
  punchPressed: false,
  aimX: 0,
  aimZ: 0,
  fly: false,
  flyUp: 0,
};

/** The player avatar. Becomes the full armour rig in M4+. */
export interface PlayerState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Facing angle in radians, 0 = +Z. */
  yaw: number;
  /** Feet are on a walkable surface. */
  grounded: boolean;
  /** Jumps used since last landing (universal double-jump → max 2). */
  jumps: number;
}

/** Root simulation state. Grows per milestone; keeps a stable shape for saves/tests. */
export interface WorldState {
  /** Sim seconds elapsed since deployment. */
  time: number;
  player: PlayerState;
  /** Collision world (defaults to the infinite test plane in headless tests). */
  collision?: import('./city/colliders').CollisionWorld;
  /** Combat pass state (M3). */
  combat: import('./combat').CombatState;
  /** Reactor energy (M3). */
  reactor: import('./energy').Reactor;
  /** Run stats: hull, currency, deaths (M3). */
  stats: import('./combat').RunStats;
}

/** Camera-relative input bundle consumed by the input layer (render-side only). */
export interface MoveAxes {
  strafe: number; // [-1, 1], screen-right positive
  forward: number; // [-1, 1], screen-up positive
}
