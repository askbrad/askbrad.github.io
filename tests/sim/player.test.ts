import { describe, expect, it } from 'vitest';
import { FIXED_DT } from '../../src/sim/loop';
import { createWorld, stepWorld, GRAVITY, JUMP_V } from '../../src/sim/world';
import { buildCollision, subtractRect, elevationWalls, wallBlocks, topSurfaceAt } from '../../src/sim/city/colliders';
import { CITY, LAYER, STREET_Y, STOREY_H, floorAt, roofY } from '../../src/sim/city/city';
import type { Intent } from '../../src/sim/types';

const COL = buildCollision();
const intent = (over: Partial<Intent> = {}): Intent => ({ moveX: 0, moveZ: 0, jumpHeld: false, jumpPressed: false, ...over });

/** Run `secs` of sim time. */
function run(world: ReturnType<typeof createWorld>, secs: number, over: Partial<Intent> = {}): void {
  const steps = Math.round(secs / FIXED_DT);
  for (let i = 0; i < steps; i++) stepWorld(world, intent(over), FIXED_DT);
}

describe('collision data', () => {
  it('punches street holes at all three shafts', () => {
    for (const sh of CITY.sewer.shafts) {
      // No street surface at the shaft: the highest surface below street level
      // there is the sewer floor (the fall-through path).
      const top = topSurfaceAt(COL.surfaces, sh.x, sh.z, STREET_Y);
      expect(top, `shaft ${sh.x},${sh.z} should not find street`).not.toBeNull();
      expect(top!.y).toBeLessThan(STREET_Y - 1);
    }
  });

  it('keeps street surface away from the shafts', () => {
    expect(topSurfaceAt(COL.surfaces, 0, 86, STREET_Y)?.y).toBe(STREET_Y); // deploy area solid
  });

  it('builds elevation walls with a door gap only on storey 1', () => {
    const b = CITY.buildings[0]!; // entrance: south
    const gapCentre = (b.x0 + b.x1) / 2 + b.entrance.offset;
    const probe = (walls: ReturnType<typeof elevationWalls>) =>
      walls.some((w) => gapCentre > w.x0 - 0.45 && gapCentre < w.x1 + 0.45 && w.z0 > b.z1 - 0.01);
    expect(probe(elevationWalls(b, 1))).toBe(false); // door open on storey 1
    expect(probe(elevationWalls(b, 2))).toBe(true); // solid on storey 2
  });
});

describe('gravity & landing', () => {
  it('falls onto the street and grounds', () => {
    const world = createWorld(COL);
    world.player.x = 0;
    world.player.z = 86;
    world.player.y = 20;
    world.player.grounded = false;
    run(world, 2);
    expect(world.player.y).toBeCloseTo(STREET_Y, 2);
    expect(world.player.grounded).toBe(true);
  });

  it('falls through a shaft hole into the sewer', () => {
    const sh = CITY.sewer.shafts[0]!;
    const world = createWorld(COL);
    world.player.x = sh.x;
    world.player.z = sh.z;
    world.player.y = STREET_Y + 0.5;
    world.player.grounded = false;
    run(world, 3);
    expect(world.player.y).toBeCloseTo(CITY.sewer.floorY, 2);
    expect(floorAt(world.player.x, world.player.y, world.player.z).layer).toBe(LAYER.SEWER);
  });
});

describe('jumping', () => {
  it('single jump rises ~2m and lands back', () => {
    const world = createWorld(COL);
    run(world, 1); // settle
    expect(world.player.grounded).toBe(true);
    stepWorld(world, intent({ jumpPressed: true }), FIXED_DT);
    expect(world.player.vy).toBeCloseTo(JUMP_V, 1);
    let apex = world.player.y;
    for (let i = 0; i < 120; i++) {
      stepWorld(world, intent(), FIXED_DT);
      apex = Math.max(apex, world.player.y);
    }
    expect(world.player.grounded).toBe(true);
    expect(apex - STREET_Y).toBeGreaterThan(1.5);
    expect(apex - STREET_Y).toBeLessThan(3);
  });

  it('double jump works mid-air; a third does not', () => {
    const world = createWorld(COL);
    run(world, 1); // settle grounded
    stepWorld(world, intent({ jumpPressed: true }), FIXED_DT); // jump 1
    run(world, 0.35); // past apex, still airborne
    expect(world.player.grounded).toBe(false);
    stepWorld(world, intent({ jumpPressed: true }), FIXED_DT); // jump 2
    expect(world.player.vy).toBeCloseTo(JUMP_V, 1);
    run(world, 0.3);
    stepWorld(world, intent({ jumpPressed: true }), FIXED_DT); // jump 3 — refused
    expect(world.player.vy).toBeLessThan(JUMP_V);
  });
});

describe('walls', () => {
  it('blocks walking through the exchange east elevation (away from the door)', () => {
    const b = CITY.buildings[0]!; // entrance south
    const world = createWorld(COL);
    // Approach the east wall from outside, mid-storey-1 height on street.
    world.player.x = b.x1 + 3;
    world.player.z = (b.z0 + b.z1) / 2 + 10; // away from south door
    world.player.y = STREET_Y;
    world.player.grounded = true;
    run(world, 1.5, { moveX: -1 }); // walk west into the wall
    expect(world.player.x).toBeGreaterThan(b.x1); // never crossed
    expect(wallBlocks(COL.walls, b.x1 + 0.25, world.player.z, STREET_Y, 0.45, 1.9)).toBe(true);
  });

  it('lets the player walk in through the south door gap', () => {
    const b = CITY.buildings[0]!;
    const world = createWorld(COL);
    const centreX = (b.x0 + b.x1) / 2;
    world.player.x = centreX;
    world.player.z = b.z1 + 3; // just outside the south wall
    world.player.y = STREET_Y;
    world.player.grounded = true;
    run(world, 1.5, { moveZ: -1 }); // walk north through the door
    expect(world.player.z).toBeLessThan(b.z1 - 0.5); // inside
    const ref = floorAt(world.player.x, world.player.y + 0.5, world.player.z);
    expect(ref.layer).toBe(LAYER.INTERIOR);
  });
});

describe('ramps & roofs', () => {
  it('walks up the interior ramp to the next storey', () => {
    const b = CITY.buildings[0]!;
    const world = createWorld(COL);
    // Ramp low end for storey 1: near cx + w/2 - rampRun - 2; walk +x up it.
    const w = b.x1 - b.x0;
    const rampRun = Math.min(w - 6, 24);
    const lowX = (b.x0 + b.x1) / 2 + w / 2 - rampRun - 2;
    world.player.x = lowX - 1;
    world.player.z = b.z0 + 2.2;
    world.player.y = STREET_Y;
    world.player.grounded = true;
    run(world, 4, { moveX: 1 });
    expect(world.player.y).toBeGreaterThan(STREET_Y + STOREY_H - 0.6); // reached storey 2
    expect(world.player.y).toBeLessThan(STREET_Y + STOREY_H + 0.6);
  });

  it('walks on a solid-block roof without falling', () => {
    const blk = CITY.solidBlocks[0]!;
    const world = createWorld(COL);
    world.player.x = (blk.x0 + blk.x1) / 2;
    world.player.z = (blk.z0 + blk.z1) / 2;
    world.player.y = STREET_Y + blk.h;
    world.player.grounded = true;
    run(world, 1);
    expect(world.player.y).toBeCloseTo(STREET_Y + blk.h, 2);
    expect(world.player.grounded).toBe(true);
  });

  it('keeps the player from entering a solid block', () => {
    const blk = CITY.solidBlocks[1]!;
    const world = createWorld(COL);
    world.player.x = blk.x0 - 3;
    world.player.z = (blk.z0 + blk.z1) / 2;
    world.player.y = STREET_Y;
    world.player.grounded = true;
    run(world, 1, { moveX: 1 });
    expect(world.player.x).toBeLessThan(blk.x0 + 0.5);
  });
});

describe('trees', () => {
  it('pushes the player out of a trunk radius', () => {
    const world = createWorld(COL);
    const t = COL.trees[0]!;
    world.player.x = t.x;
    world.player.z = t.z;
    world.player.y = STREET_Y;
    world.player.grounded = true;
    stepWorld(world, intent({ moveZ: 0, moveX: 0, jumpPressed: false }), FIXED_DT);
    // Even with zero intent the push-out resolves the overlap.
    const d = Math.hypot(world.player.x - t.x, world.player.z - t.z);
    expect(d).toBeGreaterThanOrEqual(t.r + 0.45 - 0.01);
  });
});

describe('subtractRect', () => {
  it('splits a rect around a centered hole into 4 pieces', () => {
    const base = { x0: -10, z0: -10, x1: 10, z1: 10 };
    const hole = { x0: -2, z0: -2, x1: 2, z1: 2 };
    const pieces = subtractRect(base, hole);
    expect(pieces.length).toBe(4);
    const area = pieces.reduce((a, p) => a + (p.x1 - p.x0) * (p.z1 - p.z0), 0);
    expect(area).toBeCloseTo(400 - 16, 5);
  });

  it('returns the base untouched when the hole is outside', () => {
    const base = { x0: -10, z0: -10, x1: 10, z1: 10 };
    const hole = { x0: 50, z0: 50, x1: 60, z1: 60 };
    expect(subtractRect(base, hole).length).toBe(1);
  });
});

describe('bounds & safety', () => {
  it('respawns from below the world instead of falling forever', () => {
    const world = createWorld(COL);
    world.player.x = -95; // outside the map walls? inside bounds actually; force below-world
    world.player.y = -25;
    world.player.grounded = false;
    run(world, 0.5);
    expect(world.player.y).toBeCloseTo(COL.spawn.y, 2);
    expect(world.player.x).toBeCloseTo(COL.spawn.x, 2);
  });

  it('roof of the exchange is a walkable surface at roofY', () => {
    const b = CITY.buildings[0]!;
    expect(topSurfaceAt(COL.surfaces, (b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2, roofY(b) + 1)?.y).toBeCloseTo(roofY(b), 3);
  });
});

describe('gravity tuning sanity', () => {
  it('jump apex stays reachable and gravity is stronger than floaty', () => {
    expect(GRAVITY).toBeLessThan(-20); // snappy fall
    expect(JUMP_V / -GRAVITY).toBeLessThan(0.5); // sub-half-second rise
  });
});
