/**
 * Armour build / loadout system (M4) — data-driven from data/techtree.json.
 *
 * Rules ported from tech-tree.md (binding decisions section):
 *  - Purchase rank = prerequisite graph (tier N requires N−1 in the branch).
 *  - Test prices 1/2/3/4 credits; no component costs yet.
 *  - Named hardpoints, single-occupancy sockets, alternative mounts, manual
 *    relocation and full recycling (test refunds are instant).
 *  - Reservation (passive load) per installed module applies in ALL modes;
 *    max energy = 100 + capacity bonus − total reservation.
 *  - Attack modes cycle only through owned loadouts; passives are always on.
 *  - Lab toggles: free purchases (sockets still enforced) and infinite energy.
 */

import data from '../data/techtree.json';

// ── Data shapes ─────────────────────────────────────────────────────────────

export type BranchId = keyof typeof data.branches;

export interface TierDef {
  tier: number;
  name: string;
  cost: number;
  reservation: number;
  effects: Record<string, number>;
}

export interface BranchDef {
  name: string;
  mode: 'flight' | 'weapon' | 'passive' | 'movement' | 'utility';
  count: number; // sockets occupied
  mounts: string[];
  tiers: TierDef[];
}

export const TREE = data.branches as unknown as Record<BranchId, BranchDef>;
export const BRANCH_IDS = Object.keys(TREE) as BranchId[];
export const SOCKETS = data.sockets as unknown as Record<string, string[]>;
export const ALL_SOCKETS: string[] = Object.values(SOCKETS).flat();
export const PRESETS = data.presets as unknown as Record<string, Record<string, number>>;

export function tierDef(branch: BranchId, tier: number): TierDef {
  return TREE[branch].tiers[tier - 1]!;
}

/** Highest tier installed in a branch (0 = not installed). */
export function tierOf(loadout: Loadout, branch: BranchId): number {
  return loadout.modules.find((m) => m.branch === branch)?.tier ?? 0;
}

// ── Loadout ─────────────────────────────────────────────────────────────────

export interface InstalledModule {
  branch: BranchId;
  tier: number;
  sockets: string[];
}

export interface LabToggles {
  freePurchases: boolean;
  infiniteEnergy: boolean;
}

export type AttackMode = 'STANDARD' | 'THUNDER' | 'VECTOR';

export interface Loadout {
  credits: number;
  modules: InstalledModule[];
  mode: AttackMode;
  toggles: LabToggles;
}

export function createLoadout(credits = 0): Loadout {
  return { credits, modules: [], mode: 'STANDARD', toggles: { freePurchases: false, infiniteEnergy: false } };
}

export function socketsInUse(loadout: Loadout): Set<string> {
  const used = new Set<string>();
  for (const m of loadout.modules) for (const s of m.sockets) used.add(s);
  return used;
}

/** First free socket combination for a branch, or null if none fits. */
function findFreeSockets(loadout: Loadout, branch: BranchId): string[] | null {
  const def = TREE[branch];
  const used = socketsInUse(loadout);
  const free = def.mounts.filter((s) => !used.has(s));
  return free.length >= def.count ? free.slice(0, def.count) : null;
}

export interface PurchaseResult {
  ok: boolean;
  reason?: 'no-module' | 'owned' | 'credits' | 'sockets';
}

/**
 * Buy the next tier of a branch (installs tier 1 if absent).
 * Socket occupancy is ALWAYS enforced — even with free purchases (tech-tree
 * integration rule); lab free purchases only waive the credit cost.
 */
export function buy(loadout: Loadout, branch: BranchId): PurchaseResult {
  const def = TREE[branch];
  const current = tierOf(loadout, branch);
  if (current >= def.tiers.length) return { ok: false, reason: 'owned' };

  const next = current + 1;
  const td = tierDef(branch, next);
  if (!loadout.toggles.freePurchases && loadout.credits < td.cost) return { ok: false, reason: 'credits' };

  if (current === 0) {
    // New module: needs free sockets.
    if (existingSockets(loadout, branch) === null && findFreeSockets(loadout, branch) === null) {
      return { ok: false, reason: 'sockets' };
    }
    const sockets = findFreeSockets(loadout, branch)!;
    loadout.modules.push({ branch, tier: next, sockets });
  } else {
    // Upgrade in place — same sockets.
    const mod = loadout.modules.find((m) => m.branch === branch)!;
    mod.tier = next;
  }

  if (!loadout.toggles.freePurchases) loadout.credits -= td.cost;
  return { ok: true };
}

function existingSockets(loadout: Loadout, branch: BranchId): string[] | null {
  return loadout.modules.find((m) => m.branch === branch)?.sockets ?? null;
}

/** Recycle a module: full test refund of all tiers bought, sockets freed. */
export function recycle(loadout: Loadout, branch: BranchId): boolean {
  const idx = loadout.modules.findIndex((m) => m.branch === branch);
  if (idx < 0) return false;
  const mod = loadout.modules[idx]!;
  let refund = 0;
  for (let t = 1; t <= mod.tier; t++) refund += tierDef(branch, t).cost;
  loadout.credits += refund;
  loadout.modules.splice(idx, 1);
  // Mode may have been powered by this branch.
  if (!modesOwned(loadout).includes(loadout.mode)) loadout.mode = 'STANDARD';
  return true;
}

/** Relocate a module to the first free valid socket combination. */
export function relocate(loadout: Loadout, branch: BranchId): boolean {
  const mod = loadout.modules.find((m) => m.branch === branch);
  if (!mod) return false;
  const used = socketsInUse(loadout);
  for (const s of mod.sockets) used.delete(s); // own sockets are freed during the move
  const def = TREE[branch];
  const free = def.mounts.filter((s) => !used.has(s));
  if (free.length < def.count) return false;
  mod.sockets = free.slice(0, def.count);
  return true;
}

// ── Energy math ─────────────────────────────────────────────────────────────

export const BASE_ENERGY = 100;

/** Total passive reservation across all installed modules. */
export function reservationTotal(loadout: Loadout): number {
  let sum = 0;
  for (const m of loadout.modules) sum += tierDef(m.branch, m.tier).reservation;
  return sum;
}

export function capacityBonus(loadout: Loadout): number {
  const t = tierOf(loadout, 'capacity');
  return t > 0 ? (tierDef('capacity', t).effects['bonus'] ?? 0) : 0;
}

/** Max usable energy = 100 + capacity − passive load (applies in all modes). */
export function maxEnergy(loadout: Loadout): number {
  return Math.max(20, BASE_ENERGY + capacityBonus(loadout) - reservationTotal(loadout));
}

// ── Modes & ability tiers ───────────────────────────────────────────────────

/** Modes currently owned: STANDARD always; THUNDER with lightning; VECTOR with vector. */
export function modesOwned(loadout: Loadout): AttackMode[] {
  const modes: AttackMode[] = ['STANDARD'];
  if (tierOf(loadout, 'lightning') > 0) modes.push('THUNDER');
  if (tierOf(loadout, 'vector') > 0) modes.push('VECTOR');
  return modes;
}

export function cycleMode(loadout: Loadout, dir: 1 | -1): AttackMode {
  const owned = modesOwned(loadout);
  const idx = owned.indexOf(loadout.mode);
  const next = owned[(idx + dir + owned.length) % owned.length]!;
  loadout.mode = next;
  return next;
}

export function aerialTier(loadout: Loadout): number {
  return tierOf(loadout, 'aerial');
}
export function vectorTier(loadout: Loadout): number {
  return tierOf(loadout, 'vector');
}
export function lightningTier(loadout: Loadout): number {
  return tierOf(loadout, 'lightning');
}
export function hackingTier(loadout: Loadout): number {
  return tierOf(loadout, 'hacking');
}
export function recoveryEffects(loadout: Loadout): { regenBonus: number; killRefund: number; landingReserve: number } {
  const t = tierOf(loadout, 'recovery');
  if (t === 0) return { regenBonus: 0, killRefund: 0, landingReserve: 0 };
  const e = tierDef('recovery', t).effects;
  return { regenBonus: e['regenBonus'] ?? 0, killRefund: e['killRefund'] ?? 0, landingReserve: e['landingReserve'] ?? 0 };
}

/** Flight only when Aerial is owned and the mode permits (Vector disables it). */
export function flightAllowed(loadout: Loadout): boolean {
  return aerialTier(loadout) > 0 && loadout.mode !== 'VECTOR';
}

// ── Presets & lab ───────────────────────────────────────────────────────────

/**
 * Apply a named preset: replaces the build outright (old demo rule) and grants
 * the test credits needed — presets are a testing tool, not progression.
 */
export function applyPreset(loadout: Loadout, presetName: string): boolean {
  const preset = PRESETS[presetName];
  if (!preset) return false;
  loadout.modules = [];
  loadout.credits = 0; // presets manage their own economy
  for (const [branch, tier] of Object.entries(preset)) {
    const bid = branch as BranchId;
    const sockets = findFreeSockets(loadout, bid);
    if (!sockets) return false; // malformed preset — abort (all-or-nothing)
    loadout.modules.push({ branch: bid, tier, sockets });
  }
  if (!modesOwned(loadout).includes(loadout.mode)) loadout.mode = 'STANDARD';
  return true;
}

/** Refunds all spent credits (lab convenience). */
export function grantTestCredits(loadout: Loadout, amount: number): void {
  loadout.credits += amount;
}
