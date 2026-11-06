/**
 * Enemies (M3): two test types — Skitter (melee chaff) and Spitter (ranged).
 * All stats and spawn points are data-driven (data/enemies.json). AI is
 * deliberately simple: aggro → chase/stand-off → attack, with wall blocking,
 * ground-stick, knockback and pairwise separation. No pathfinding (M3 scope).
 */

import data from '../data/enemies.json';
import { STREET_Y } from './city/city';
import { topSurfaceAt, wallBlocks, type CollisionWorld } from './city/colliders';
import { STEP_H } from './world';

export type EnemyType = 'skitter' | 'hopper' | 'spitter' | 'bulwark' | 'conductor';

export interface EnemyTypeDef {
  hp: number;
  speed: number;
  radius: number;
  aggroRange: number;
  credits: number;
  scrap: number;
  // skitter / hopper / bulwark / conductor
  contactDamage?: number;
  contactCooldown?: number;
  // hopper
  lungeInterval?: number;
  lungeSpeed?: number;
  lungeTime?: number;
  // bulwark: damage reduction when hit from its facing arc
  frontalResist?: number;
  // conductor: each conductor in a chain grants extra hops
  chainBonus?: number;
  // spitter
  projectileDamage?: number;
  projectileSpeed?: number;
  projectileTtl?: number;
  fireInterval?: number;
  standoffMin?: number;
  standoffMax?: number;
}

export const ENEMY_TYPES: Record<string, EnemyTypeDef> = data.types as Record<string, EnemyTypeDef>;
const SPAWNS: Array<{ type: string; x: number; z: number }> = data.spawns;

export interface EnemyState {
  id: number;
  type: EnemyType;
  def: EnemyTypeDef;
  x: number;
  y: number;
  z: number;
  hp: number;
  /** Facing (radians, 0 = +Z) — render only. */
  yaw: number;
  /** Anim phase for squash/hop (render only, stable per enemy). */
  phase: number;
  /** Attack cooldown. */
  cooldown: number;
  /** Latched aggro — once provoked, stays provoked. */
  aggro: boolean;
  /** Knockback velocity (decays exponentially). */
  kx: number;
  kz: number;
  /** Hit flash timer (render). */
  hitFlash: number;
  alive: boolean;
  /** Snapped to its spawn surface on first update (spawns are x/z-only in data). */
  settled: boolean;
  /** One-shot loot guard. */
  looted?: boolean;
  // Hopper lunge state.
  lungeCd: number;
  lungeT: number;
  lungeDx: number;
  lungeDz: number;
}

let nextId = 1;

/** Fresh enemy list from the spawn table (used at mission start / player death). */
export function spawnEnemies(): EnemyState[] {
  nextId = 1;
  const out: EnemyState[] = [];
  for (const s of SPAWNS) {
    const def = ENEMY_TYPES[s.type];
    if (!def) continue; // unknown type in data — skip rather than crash
    out.push({
      id: nextId++,
      type: s.type as EnemyType,
      def,
      x: s.x,
      y: 0,
      z: s.z,
      hp: def.hp,
      yaw: 0,
      phase: (s.x * 7 + s.z * 13) % 6.28,
      cooldown: 0,
      aggro: false,
      kx: 0,
      kz: 0,
      hitFlash: 0,
      alive: true,
      settled: false,
      lungeCd: 1 + ((s.x * 7 + s.z) % 15) / 10, // staggered, deterministic
      lungeT: 0,
      lungeDx: 0,
      lungeDz: 0,
    });
  }
  return out;
}

/** Apply damage; returns true if this hit killed the enemy.
 * `fromDot`: dot product of the enemy's facing vs the attack approach —
 * Bulwarks resist frontal hits (tech-tree "guards front, backs exposed"). */
export function damageEnemy(e: EnemyState, amount: number, kx = 0, kz = 0, fromDot = 0): boolean {
  if (!e.alive) return false;
  let dmg = amount;
  if (e.def.frontalResist && fromDot > 0.3) dmg *= 1 - e.def.frontalResist;
  e.hp -= dmg;
  e.hitFlash = 0.12;
  e.kx += kx;
  e.kz += kz;
  e.aggro = true;
  if (e.hp <= 0) {
    e.alive = false;
    return true;
  }
  return false;
}

const PLAYER_BODY_H = 1.9;

/** Per-step enemy update. `onDeath` spawns drops; `onShoot` spawns projectiles. */
export function stepEnemies(
  enemies: EnemyState[],
  col: CollisionWorld,
  player: { x: number; y: number; z: number },
  dt: number,
  onDeath: (e: EnemyState) => void,
  onShoot: (e: EnemyState, dirX: number, dirZ: number) => void,
): void {
  // ── AI + movement ────────────────────────────────────────────────────
  for (const e of enemies) {
    if (!e.alive) continue;

    // Settle onto the spawn surface (spawns are x/z-only; snap to street level,
    // or the top interior slab if the spawn is inside a building footprint).
    if (!e.settled) {
      e.settled = true;
      const g = topSurfaceAt(col.surfaces, e.x, e.z, STREET_Y + 1);
      if (g) e.y = g.y;
    }

    e.cooldown = Math.max(0, e.cooldown - dt);
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    e.kx *= Math.max(0, 1 - 8 * dt);
    e.kz *= Math.max(0, 1 - 8 * dt);

    const dx = player.x - e.x;
    const dz = player.z - e.z;
    const dist = Math.hypot(dx, dz);
    if (dist <= e.def.aggroRange) e.aggro = true;

    let mvx = 0;
    let mvz = 0;
    if (e.aggro) {
      const ux = dist > 0.01 ? dx / dist : 1;
      const uz = dist > 0.01 ? dz / dist : 0;
      if (e.type === 'spitter') {
        // Hold the standoff band, shoot on cooldown.
        const min = e.def.standoffMin ?? 12;
        const max = e.def.standoffMax ?? 20;
        if (dist > max) {
          mvx = ux * e.def.speed;
          mvz = uz * e.def.speed;
        } else if (dist < min && dist > 0.01) {
          mvx = -ux * e.def.speed;
          mvz = -uz * e.def.speed;
        }
        if (e.cooldown <= 0) {
          onShoot(e, ux, uz);
          e.cooldown = e.def.fireInterval ?? 2.2;
        }
      } else if (e.type === 'hopper') {
        // Walk in, lunge on a cycle — burst of speed along a locked direction.
        e.lungeCd -= dt;
        if (e.lungeT > 0) {
          e.lungeT -= dt;
          mvx = e.lungeDx;
          mvz = e.lungeDz;
        } else if (e.lungeCd <= 0 && dist > 2 && dist < 16) {
          e.lungeCd = e.def.lungeInterval ?? 2.2;
          e.lungeT = e.def.lungeTime ?? 0.35;
          e.lungeDx = ux * (e.def.lungeSpeed ?? 16);
          e.lungeDz = uz * (e.def.lungeSpeed ?? 16);
        } else if (dist > 0.01) {
          mvx = ux * e.def.speed;
          mvz = uz * e.def.speed;
        }
      } else {
        // skitter / bulwark / conductor: straight chasers.
        if (dist > 0.01) {
          mvx = ux * e.def.speed;
          mvz = uz * e.def.speed;
        }
      }

      // Melee contact damage (all non-spitter types).
      if (e.type !== 'spitter' && dist < e.def.radius + 0.8 && e.cooldown <= 0 &&
          Math.abs(player.y - e.y) < 2) {
        onShoot(e, ux, uz); // signal: contact hit (reuses the shoot callback slot)
        e.cooldown = e.def.contactCooldown ?? 0.9;
      }

      e.yaw = Math.atan2(ux, uz);
    }

    // Knockback + movement, axis-separated with wall blocking + ground stick.
    const tryMove = (ax: 'x' | 'z', delta: number): void => {
      if (Math.abs(delta) < 1e-9) return;
      const nx = ax === 'x' ? e.x + delta : e.x;
      const nz = ax === 'z' ? e.z + delta : e.z;
      if (!wallBlocks(col.walls, nx, nz, e.y, e.def.radius, PLAYER_BODY_H)) {
        e.x = nx;
        e.z = nz;
      }
    };
    tryMove('x', (mvx + e.kx) * dt);
    tryMove('z', (mvz + e.kz) * dt);

    const ground = topSurfaceAt(col.surfaces, e.x, e.z, e.y + STEP_H);
    if (ground) e.y = ground.y;
  }

  // ── Pairwise separation (keeps chaff readable) ───────────────────────
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i]!;
    if (!a.alive) continue;
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j]!;
      if (!b.alive) continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const min = a.def.radius + b.def.radius;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const push = (min - d) / 2;
        const ux = dx / d;
        const uz = dz / d;
        a.x -= ux * push;
        a.z -= uz * push;
        b.x += ux * push;
        b.z += uz * push;
      }
    }
  }
}
