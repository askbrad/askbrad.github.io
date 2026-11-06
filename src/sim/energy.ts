/**
 * Reactor (M3 baseline): a single shared energy meter.
 * max = 100 + capacity − passive load once tech branches land (M4); for now
 * the constants in data/enemies.json are the whole story.
 * Baseline blaster draws from the reactor; at empty it enters low-power mode
 * (weaker shots, still usable — tech-tree rule: "a useful baseline attack
 * when energy is depleted").
 */

import data from '../data/enemies.json';

export const TUNE = data.player;

export interface Reactor {
  energy: number;
}

export function createReactor(): Reactor {
  return { energy: TUNE.reactorMax };
}

export function reactorMax(): number {
  return TUNE.reactorMax;
}

/** Passive regen; grounded recovery is faster (Recovery-branch preview). */
export function regenReactor(reactor: Reactor, dt: number, grounded: boolean): void {
  const rate = grounded ? TUNE.regenGrounded : TUNE.regenAir;
  reactor.energy = Math.min(reactorMax(), reactor.energy + rate * dt);
}

/**
 * Spend energy if available. Returns false when the meter is empty — callers
 * fall back to low-power behaviour instead of blocking the action.
 */
export function spend(reactor: Reactor, cost: number): boolean {
  if (reactor.energy < cost) return false;
  reactor.energy -= cost;
  return true;
}
