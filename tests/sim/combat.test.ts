import { beforeEach, describe, expect, it } from 'vitest';
import { FIXED_DT } from '../../src/sim/loop';
import { createWorld, stepWorld, STEP_H } from '../../src/sim/world';
import { buildCollision } from '../../src/sim/city/colliders';
import { createReactor, reactorMax, regenReactor, spend, TUNE } from '../../src/sim/energy';
import { ENEMY_TYPES, type EnemyState } from '../../src/sim/enemies';
import {
  createCombat,
  doPunch,
  fireBlaster,
  stepCombat,
  type CombatState,
} from '../../src/sim/combat';

const COL = buildCollision();

function makeEnemy(over: Partial<EnemyState> = {}): EnemyState {
  const def = ENEMY_TYPES['skitter']!;
  return {
    id: 999,
    type: 'skitter',
    def,
    x: 3,
    y: STREET(),
    z: 0,
    hp: def.hp,
    yaw: 0,
    phase: 0,
    cooldown: 0,
    aggro: false,
    kx: 0,
    kz: 0,
    hitFlash: 0,
    alive: true,
    settled: true,
    ...over,
  };
}

function STREET(): number {
  return COL.surfaces[0]!.y === 14 ? 14 : 14; // streetY constant is 14 in city data
}

interface Ctx {
  combat: CombatState;
  reactor: ReturnType<typeof createReactor>;
  player: { x: number; y: number; z: number; yaw: number; grounded: boolean };
  stats: { hull: number; maxHull: number; credits: number; scrap: number; deaths: number };
}

function ctx(): Ctx {
  return {
    combat: createCombat(),
    reactor: createReactor(),
    player: { x: 0, y: 14, z: 86, yaw: 0, grounded: true },
    stats: { hull: TUNE.maxHull, maxHull: TUNE.maxHull, credits: 0, scrap: 0, deaths: 0 },
  };
}

function stepN(c: Ctx, n: number, fire = false, punch = false, aimX = 1, aimZ = 0): void {
  for (let i = 0; i < n; i++) {
    stepCombat(
      c.combat,
      c.reactor,
      c.player,
      { fireHeld: fire, punchPressed: punch, aimX, aimZ },
      { col: COL, onPlayerDeath: () => {} },
      FIXED_DT,
      i * FIXED_DT,
      c.stats,
    );
  }
}

beforeEach(() => {
  // fresh ids per test avoid cross-test drop-mesh/map pollution
});

describe('reactor (energy)', () => {
  it('regenerates faster grounded than airborne', () => {
    const r = createReactor();
    r.energy = 50;
    regenReactor(r, 1, true);
    const grounded = r.energy;
    r.energy = 50;
    regenReactor(r, 1, false);
    expect(grounded).toBeGreaterThan(r.energy);
    expect(grounded).toBeCloseTo(50 + TUNE.regenGrounded, 3);
  });

  it('clamps at max and refuses spends when empty', () => {
    const r = createReactor();
    regenReactor(r, 100, true);
    expect(r.energy).toBe(reactorMax());
    r.energy = TUNE.blasterCost;
    expect(spend(r, TUNE.blasterCost)).toBe(true);
    expect(r.energy).toBe(0);
    expect(spend(r, TUNE.blasterCost)).toBe(false); // empty
    expect(r.energy).toBe(0); // never negative
  });
});

describe('baseline blaster', () => {
  it('fires, drains energy, and damages an enemy in its path', () => {
    const c = ctx();
    const e = makeEnemy({ x: 6, z: 86, y: 14 });
    c.combat.enemies = [e];
    const energyBefore = c.reactor.energy;
    stepN(c, 1, true, false, 1, 0); // fire once, aiming +X toward the enemy
    expect(c.combat.projectiles.length).toBeGreaterThan(0);
    // Energy dropped by ~cost (grounded regen adds a sliver back the same step).
    const delta = energyBefore - c.reactor.energy;
    expect(Math.abs(delta - TUNE.blasterCost)).toBeLessThan(0.5);
    stepN(c, 30); // ~0.5 s: tracer (40 m/s) crosses 6 m
    expect(e.hp).toBeLessThan(ENEMY_TYPES['skitter']!.hp);
  });

  it('degrades to low-power damage when the reactor is empty', () => {
    const c = ctx();
    c.reactor.energy = 0;
    const res = fireBlaster(c.reactor, c.combat, 0, 14, 86, 1, 0);
    expect(res.fired).toBe(true);
    expect(res.lowPower).toBe(true);
    expect(c.combat.projectiles[0]!.dmg).toBe(TUNE.lowPowerDamage);
    expect(c.reactor.energy).toBe(0); // never negative
  });

  it('tracers stop at walls without hitting anything behind them', () => {
    const b = { x0: -20, z0: -60, x1: 8, z1: -40, h: 18 }; // solid block s1
    const c = ctx();
    c.player.x = b.x0 - 6;
    c.player.z = (b.z0 + b.z1) / 2;
    const e = makeEnemy({ x: b.x0 + 4, z: c.player.z, y: 14 });
    c.combat.enemies = [e];
    fireBlaster(c.reactor, c.combat, c.player.x, 14, c.player.z, 1, 0);
    stepN(c, 40);
    expect(e.hp).toBe(ENEMY_TYPES['skitter']!.hp); // wall ate the shot
    expect(c.combat.projectiles.length).toBe(0);
  });
});

describe('punch', () => {
  it('hits enemies inside the frontal arc and knocks them back', () => {
    const c = ctx();
    const e = makeEnemy({ x: 2, z: 86, y: 14 });
    c.combat.enemies = [e];
    const hits = doPunch(c.combat, c.player.x, c.player.y, c.player.z, 1, 0);
    expect(hits).toBe(1);
    expect(e.hp).toBeLessThan(ENEMY_TYPES['skitter']!.hp);
    expect(e.kx).toBeGreaterThan(0);
  });

  it('misses enemies behind the player', () => {
    const c = ctx();
    const e = makeEnemy({ x: -2, z: 86, y: 14 });
    c.combat.enemies = [e];
    const hits = doPunch(c.combat, c.player.x, c.player.y, c.player.z, 1, 0);
    expect(hits).toBe(0);
    expect(e.hp).toBe(ENEMY_TYPES['skitter']!.hp);
  });
});

describe('enemies', () => {
  it('skitter aggros, chases, and deals contact damage', () => {
    const c = ctx();
    const e = makeEnemy({ x: 8, z: 86, y: 14 }); // within 25 m aggro
    c.combat.enemies = [e];
    const hullBefore = c.stats.hull;
    stepN(c, 240); // 4 s — closes 8 m at 6.5 m/s and lands contact hits
    expect(e.aggro).toBe(true);
    expect(c.stats.hull).toBeLessThan(hullBefore);
  });

  it('spitter holds distance and fires projectiles at the player', () => {
    const c = ctx();
    const def = ENEMY_TYPES['spitter']!;
    const e = makeEnemy({ type: 'spitter', def, x: 18, z: 86, y: 14, hp: def.hp });
    c.combat.enemies = [e];
    const hullBefore = c.stats.hull;
    stepN(c, 360); // 6 s — fire interval 2.2 s → at least 2 shots
    expect(c.combat.projectiles.length + (hullBefore - c.stats.hull) / (def.projectileDamage ?? 10)).toBeGreaterThanOrEqual(2);
    expect(c.stats.hull).toBeLessThan(hullBefore);
  });

  it('kills drop loot that the player picks up', () => {
    const c = ctx();
    const e = makeEnemy({ x: 4, z: 86, y: 14 });
    c.combat.enemies = [e];
    stepN(c, 1, true, false, 1, 0); // one shot
    stepN(c, 60); // let it land; 12 dmg vs 30 hp, keep firing
    stepN(c, 1, true, false, 1, 0);
    stepN(c, 60);
    stepN(c, 1, true, false, 1, 0);
    stepN(c, 60);
    expect(e.alive).toBe(false);
    // The corpse drops credit+scrap right where the enemy stood; the player is
    // already overlapping that spot, so pickup is immediate — assert the outcome.
    stepN(c, 5);
    expect(c.stats.credits).toBeGreaterThan(0);
    expect(c.stats.scrap).toBeGreaterThan(0);
  });

  it('separates overlapping enemies', () => {
    const c = ctx();
    const a = makeEnemy({ x: 0, z: 86 });
    const b = makeEnemy({ x: 0.2, z: 86 });
    c.combat.enemies = [a, b];
    stepN(c, 12);
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    expect(d).toBeGreaterThanOrEqual(a.def.radius + b.def.radius - 0.01);
  });
});

describe('death & respawn (no penalty — plan §11.5)', () => {
  it('respawns the player at the tram with full hull and reset enemies', () => {
    const world = createWorld(COL);
    world.stats.hull = 1;
    const enemyCount = world.combat.enemies.length;
    stepWorld(world, { ...zeroIntent(), jumpPressed: false }, FIXED_DT); // tick 1
    // Dump the player into a skitter pile: teleport into an enemy and drain hull.
    world.player.x = world.combat.enemies[0]!.x;
    world.player.z = world.combat.enemies[0]!.z;
    world.stats.hull = 0.5;
    for (let i = 0; i < 600; i++) {
      stepWorld(world, zeroIntent(), FIXED_DT);
      if (world.stats.deaths > 0) break;
    }
    expect(world.stats.deaths).toBe(1);
    expect(world.stats.hull).toBe(world.stats.maxHull);
    expect(world.reactor.energy).toBe(reactorMax());
    expect(world.player.x).toBeCloseTo(COL.spawn.x, 1);
    expect(world.player.z).toBeCloseTo(COL.spawn.z, 1);
    expect(world.combat.enemies.length).toBe(enemyCount);
  });
});

describe('full-loop sanity through stepWorld', () => {
  it('movement + combat run together in one fixed step', () => {
    const world = createWorld(COL);
    const before = world.combat.enemies.length;
    expect(before).toBeGreaterThan(8); // spawn table loaded
    const i = zeroIntent();
    stepWorld(world, i, FIXED_DT);
    expect(world.time).toBeCloseTo(FIXED_DT, 5);
  });
});

function zeroIntent() {
  return {
    moveX: 0,
    moveZ: 0,
    jumpHeld: false,
    jumpPressed: false,
    fireHeld: false,
    punchPressed: false,
    aimX: 0,
    aimZ: 0,
  };
}

void STEP_H;
