/**
 * Reactor (M4): a single shared energy meter with a DYNAMIC maximum —
 * max = 100 + capacity bonus − passive reservations (applies in all modes,
 * including inactive equipment — tech-tree binding decision).
 *
 * Baseline blaster draws from the reactor; at empty it enters low-power mode
 * (weaker shots, still usable). Lab infinite-energy toggle pins energy to max.
 */

import data from '../data/enemies.json';
import type { Loadout } from './build';
import { maxEnergy } from './build';

export const TUNE = data.player;

export interface Reactor {
  energy: number;
  max: number;
}

export function createReactor(loadout?: Loadout): Reactor {
  const max = loadout ? maxEnergy(loadout) : TUNE.reactorMax;
  return { energy: max, max };
}

/** Recompute the ceiling after a build change; clamps current energy. */
export function recomputeMax(reactor: Reactor, loadout: Loadout): void {
  reactor.max = maxEnergy(loadout);
  if (reactor.energy > reactor.max) reactor.energy = reactor.max;
}

/** Passive regen; grounded recovery is faster. Recovery branch adds a bonus. */
export function regenReactor(reactor: Reactor, dt: number, grounded: boolean, regenBonus = 0): void {
  const rate = (grounded ? TUNE.regenGrounded : TUNE.regenAir) + regenBonus;
  reactor.energy = Math.min(reactor.max, reactor.energy + rate * dt);
}

/**
 * Spend energy if available. Returns false when the meter is empty — callers
 * fall back to low-power behaviour instead of blocking the action.
 */
export function spend(reactor: Reactor, cost: number, ignoreLimit = false): boolean {
  if (!ignoreLimit && reactor.energy < cost) return false;
  reactor.energy = Math.max(0, reactor.energy - cost);
  return true;
}

/** True if the reactor can pay `cost` (lab infinite energy always can). */
export function canPay(reactor: Reactor, cost: number, infiniteEnergy: boolean): boolean {
  return infiniteEnergy || reactor.energy >= cost;
}
