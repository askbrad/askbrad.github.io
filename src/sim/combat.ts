/**
 * Combat orchestration (M3): baseline blaster + punch, projectiles, drops and
 * pickups, hull/death/respawn, energy regen — the whole per-step combat pass.
 * Pure TS; rendering reads the state arrays.
 *
 * Balance note (prototype test values, per plan §5): the blaster costs energy
 * and weakens at empty instead of blocking — tech-tree rule "a useful baseline
 * attack when energy is depleted". The punch is free. Death costs nothing
 * (plan §11.5): respawn at the tram, enemies reset, loot and upgrades kept.
 */

import { TUNE, regenReactor, reactorMax, spend, type Reactor } from './energy';
import { damageEnemy, stepEnemies, spawnEnemies, type EnemyState } from './enemies';
import { wallBlocks, type CollisionWorld } from './city/colliders';
import { PLAYER_R } from './world';

export interface Projectile {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  ttl: number;
  dmg: number;
  fromPlayer: boolean;
}

export interface Drop {
  id: number;
  kind: 'credit' | 'scrap';
  amount: number;
  x: number;
  y: number;
  z: number;
  /** Spawn time for the bob animation (render only). */
  born: number;
}

export interface CombatState {
  projectiles: Projectile[];
  drops: Drop[];
  enemies: EnemyState[];
  fireCd: number;
  punchCd: number;
  /** Render-side damage feedback on the player. */
  hurtFlash: number;
}

/** Intent fragment consumed by the combat pass. */
export interface CombatIntent {
  fireHeld: boolean;
  punchPressed: boolean;
  /** Normalized world-space aim direction (falls back to facing). */
  aimX: number;
  aimZ: number;
}

/** Player fragments the combat pass reads/mutates. */
export interface CombatPlayer {
  x: number;
  y: number;
  z: number;
  yaw: number;
  grounded: boolean;
}

/** Run stats the combat pass mutates (also the save/HUD surface). */
export interface RunStats {
  hull: number;
  maxHull: number;
  credits: number;
  scrap: number;
  deaths: number;
}

let dropId = 1;

export function createCombat(): CombatState {
  return {
    projectiles: [],
    drops: [],
    enemies: spawnEnemies(),
    fireCd: 0,
    punchCd: 0,
    hurtFlash: 0,
  };
}

export function fireBlaster(
  reactor: Reactor,
  combat: CombatState,
  x: number,
  y: number,
  z: number,
  dirX: number,
  dirZ: number,
  target?: { x: number; y: number; z: number },
): { fired: boolean; lowPower: boolean } {
  const len = Math.hypot(dirX, dirZ);
  if (len < 1e-6) return { fired: false, lowPower: false };
  const paid = spend(reactor, TUNE.blasterCost);
  const dmg = paid ? TUNE.blasterDamage : TUNE.lowPowerDamage;

  // Pitch-only assist (per plan §5 and the design note): the player owns
  // horizontal aim 1:1 — the game corrects ONLY the vertical component so
  // shots arrive at the assisted target's height. Fine targeting stays exact.
  let vx: number;
  let vy = 0;
  let vz: number;
  if (target) {
    const hx = target.x - x;
    const hz = target.z - z;
    const distXZ = Math.hypot(hx, hz);
    if (distXZ > 0.01) {
      // Level speed along the aim direction; vy timed to arrive at target height.
      const flightTime = distXZ / TUNE.blasterSpeed;
      vy = (target.y - (y + 1.15)) / flightTime;
    }
    vx = (dirX / len) * TUNE.blasterSpeed;
    vz = (dirZ / len) * TUNE.blasterSpeed;
  } else {
    vx = (dirX / len) * TUNE.blasterSpeed;
    vz = (dirZ / len) * TUNE.blasterSpeed;
  }

  combat.projectiles.push({
    x: x + (dirX / len) * 0.7,
    y: y + 1.15,
    z: z + (dirZ / len) * 0.7,
    vx,
    vy,
    vz,
    ttl: TUNE.blasterTtl,
    dmg,
    fromPlayer: true,
  });
  return { fired: true, lowPower: !paid };
}

/**
 * Soft aim-assist: nearest alive enemy inside a small cone along the fire
 * direction, with a cheap line-of-sight check. Returns the point to aim at
 * (enemy body centre) or null — the player always picks the direction; the
 * game just bends the shot onto a valid target (plan §5 feel note).
 */
export function pickAimAssist(
  combat: CombatState,
  px: number,
  py: number,
  pz: number,
  dirX: number,
  dirZ: number,
  walls: CollisionWorld['walls'],
): { x: number; y: number; z: number } | null {
  const CONE_COS = Math.cos((15 * Math.PI) / 180);
  let best: { x: number; y: number; z: number } | null = null;
  let bestScore = -Infinity;

  for (const e of combat.enemies) {
    if (!e.alive) continue;
    const dx = e.x - px;
    const dz = e.z - pz;
    const dist = Math.hypot(dx, dz);
    if (dist < 1.5) continue; // don't assist onto point-blank bodies
    const dot = (dx / dist) * dirX + (dz / dist) * dirZ;
    if (dot < CONE_COS) continue; // outside the fire cone

    // Cheap LOS: sample the shot line at chest height; any wall → no assist.
    const sampleY = py + 1;
    const targetY = e.y + 0.9;
    let blocked = false;
    for (let t = 2; t < dist; t += 2) {
      const sx = px + (dx / dist) * t;
      const sz = pz + (dz / dist) * t;
      const sy = sampleY + ((targetY - sampleY) * t) / dist;
      if (wallBlocks(walls, sx, sz, sy - 0.3, 0.15, 0.6)) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;

    // Prefer tighter angle first, then closer distance.
    const score = dot * 2 - dist / 60;
    if (score > bestScore) {
      bestScore = score;
      best = { x: e.x, y: e.y + 0.9, z: e.z };
    }
  }
  return best;
}

/** Melee arc: all enemies inside range+arc take damage + knockback. Returns hit count. */
export function doPunch(
  combat: CombatState,
  px: number,
  py: number,
  pz: number,
  dirX: number,
  dirZ: number,
): number {
  const arcCos = Math.cos(((TUNE.punchArcDeg ?? 75) * Math.PI) / 180);
  let hits = 0;
  for (const e of combat.enemies) {
    if (!e.alive) continue;
    const dx = e.x - px;
    const dz = e.z - pz;
    const d = Math.hypot(dx, dz);
    if (d > (TUNE.punchRange ?? 2.3) + e.def.radius || Math.abs(e.y - py) > 2.2) continue;
    const dot = d < 0.01 ? 1 : (dx / d) * dirX + (dz / d) * dirZ;
    if (dot < arcCos) continue;
    damageEnemy(e, TUNE.punchDamage, (dx / (d || 1)) * (TUNE.punchKnockback ?? 9), (dz / (d || 1)) * (TUNE.punchKnockback ?? 9));
    hits++;
  }
  return hits;
}

export interface CombatRefs {
  col: CollisionWorld;
  onPlayerDeath: () => void;
}

/**
 * One fixed combat step: cooldowns, player attacks, projectiles, enemy AI,
 * drops/pickups, hull/death, energy regen.
 */
export function stepCombat(
  combat: CombatState,
  reactor: Reactor,
  player: CombatPlayer,
  intent: CombatIntent,
  refs: CombatRefs,
  dt: number,
  time: number,
  stats: RunStats,
): void {
  combat.fireCd = Math.max(0, combat.fireCd - dt);
  combat.punchCd = Math.max(0, combat.punchCd - dt);
  combat.hurtFlash = Math.max(0, combat.hurtFlash - dt);

  // Default aim direction = current facing.
  let aimX = intent.aimX;
  let aimZ = intent.aimZ;
  if (Math.hypot(aimX, aimZ) < 1e-6) {
    aimX = Math.sin(player.yaw);
    aimZ = Math.cos(player.yaw);
  }
  const aimLen = Math.hypot(aimX, aimZ) || 1;
  aimX /= aimLen;
  aimZ /= aimLen;

  // ── Player attacks ───────────────────────────────────────────────────
  if (intent.fireHeld && combat.fireCd <= 0) {
    // Aim assist: bend the shot onto the nearest valid target in the cone.
    const assist = pickAimAssist(combat, player.x, player.y, player.z, aimX, aimZ, refs.col.walls);
    fireBlaster(reactor, combat, player.x, player.y, player.z, aimX, aimZ, assist ?? undefined);
    combat.fireCd = TUNE.blasterRoF;
  }
  if (intent.punchPressed && combat.punchCd <= 0) {
    doPunch(combat, player.x, player.y, player.z, aimX, aimZ);
    combat.punchCd = TUNE.punchCooldown;
  }

  // ── Projectiles (substepped against walls and bodies) ────────────────
  const keep: Projectile[] = [];
  for (const p of combat.projectiles) {
    p.ttl -= dt;
    if (p.ttl <= 0) continue;

    const hitBody = (): boolean => {
      if (wallBlocks(refs.col.walls, p.x, p.z, p.y - 0.15, 0.15, 0.3)) return true;
      if (p.fromPlayer) {
        for (const e of combat.enemies) {
          if (!e.alive) continue;
          const rr = e.def.radius + 0.2;
          if ((p.x - e.x) ** 2 + (p.z - e.z) ** 2 < rr * rr && Math.abs(p.y - (e.y + 0.9)) < 1.6) {
            damageEnemy(e, p.dmg, p.vx * 0.06, p.vz * 0.06);
            return true;
          }
        }
      } else {
        const rr = PLAYER_R + 0.2;
        if ((p.x - player.x) ** 2 + (p.z - player.z) ** 2 < rr * rr && Math.abs(p.y - (player.y + 1)) < 1.6) {
          stats.hull -= p.dmg;
          combat.hurtFlash = 0.25;
          return true;
        }
      }
      return false;
    };

    // Check at the current position first (point-blank spawns sit inside the
    // target's hit band — without this, the first substep tunnels past).
    let dead = hitBody();
    const dist = Math.hypot(p.vx, p.vz) * dt;
    const steps = Math.max(1, Math.ceil(dist / 0.5));
    for (let s = 0; s < steps && !dead; s++) {
      p.x += (p.vx * dt) / steps;
      p.y += (p.vy * dt) / steps;
      p.z += (p.vz * dt) / steps;
      dead = hitBody();
    }
    if (!dead) keep.push(p);
  }
  combat.projectiles = keep;

  // ── Enemy AI ─────────────────────────────────────────────────────────
  stepEnemies(
    combat.enemies,
    refs.col,
    player,
    dt,
    () => {},
    (e, ux, uz) => {
      if (e.type === 'spitter') {
        const sp = e.def;
        // 3D shot at the player's chest — spitters can hit an airborne target.
        const sx = e.x + ux * (sp.radius ?? 0.9);
        const sy = e.y + 1;
        const sz = e.z + uz * (sp.radius ?? 0.9);
        const tx = player.x - sx;
        const ty = player.y + 1 - sy;
        const tz = player.z - sz;
        const l3 = Math.hypot(tx, ty, tz) || 1;
        const speed = sp.projectileSpeed ?? 14;
        combat.projectiles.push({
          x: sx,
          y: sy,
          z: sz,
          vx: (tx / l3) * speed,
          vy: (ty / l3) * speed,
          vz: (tz / l3) * speed,
          ttl: sp.projectileTtl ?? 2.5,
          dmg: sp.projectileDamage ?? 10,
          fromPlayer: false,
        });
      } else {
        // Skitter contact hit.
        stats.hull -= e.def.contactDamage ?? 8;
        combat.hurtFlash = 0.25;
      }
    },
  );

  // ── Loot ─────────────────────────────────────────────────────────────
  for (const e of combat.enemies) {
    const lootable = e as EnemyState & { looted?: boolean };
    if (!e.alive && !lootable.looted) {
      lootable.looted = true;
      combat.drops.push({ id: dropId++, kind: 'credit', amount: e.def.credits, x: e.x + 0.4, y: e.y, z: e.z, born: time });
      combat.drops.push({ id: dropId++, kind: 'scrap', amount: e.def.scrap, x: e.x - 0.4, y: e.y, z: e.z, born: time });
    }
  }
  combat.drops = combat.drops.filter((d) => {
    if ((d.x - player.x) ** 2 + (d.z - player.z) ** 2 < 1.3 * 1.3 && Math.abs(d.y - player.y) < 3) {
      if (d.kind === 'credit') stats.credits += d.amount;
      else stats.scrap += d.amount;
      return false;
    }
    return true;
  });

  // ── Death & respawn (no penalty — plan §11.5) ────────────────────────
  if (stats.hull <= 0) {
    stats.deaths++;
    stats.hull = stats.maxHull;
    reactor.energy = reactorMax();
    player.x = refs.col.spawn.x;
    player.y = refs.col.spawn.y;
    player.z = refs.col.spawn.z;
    combat.enemies = spawnEnemies();
    combat.projectiles = [];
    refs.onPlayerDeath();
  }

  // ── Reactor regen ────────────────────────────────────────────────────
  regenReactor(reactor, dt, player.grounded);
}
