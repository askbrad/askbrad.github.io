import { describe, expect, it } from 'vitest';
import { MOVE_SPEED, createWorld, stepWorld } from '../../src/sim/world';
import { FIXED_DT } from '../../src/sim/loop';
import type { WorldState } from '../../src/sim/types';

function stepped(n = 1, moveX = 0, moveZ = 0): WorldState {
  const world = createWorld();
  for (let i = 0; i < n; i++) {
    stepWorld(world, { moveX, moveZ, jumpHeld: false, jumpPressed: false, fireHeld: false, punchPressed: false, aimX: 0, aimZ: 0, fly: false, flyUp: 0 }, FIXED_DT);
  }
  return world;
}

describe('M0 placeholder movement', () => {
  it('moves along +X at run speed', () => {
    const world = stepped(60, 1, 0); // 1 second
    expect(world.player.x).toBeCloseTo(MOVE_SPEED, 3);
    expect(world.player.z).toBeCloseTo(0, 3);
  });

  it('normalizes diagonal input so it never exceeds run speed', () => {
    const world = stepped(60, 1, 1); // 1s of full diagonal
    const speed = Math.hypot(world.player.x, world.player.z);
    expect(speed).toBeCloseTo(MOVE_SPEED, 3);
  });

  it('accepts sub-unit analog input un-scaled', () => {
    const world = stepped(60, 0.5, 0);
    expect(world.player.x).toBeCloseTo(MOVE_SPEED * 0.5, 3);
  });

  it('faces the movement direction', () => {
    const world = stepped(1, 1, 0);
    expect(world.player.yaw).toBeCloseTo(Math.atan2(1, 0), 5); // facing +X
  });

  it('keeps last facing when input stops', () => {
    const world = createWorld();
    stepWorld(world, { moveX: 1, moveZ: 0, jumpHeld: false, jumpPressed: false, fireHeld: false, punchPressed: false, aimX: 0, aimZ: 0, fly: false, flyUp: 0 }, FIXED_DT);
    const yaw = world.player.yaw;
    stepWorld(world, { moveX: 0, moveZ: 0, jumpHeld: false, jumpPressed: false, fireHeld: false, punchPressed: false, aimX: 0, aimZ: 0, fly: false, flyUp: 0 }, FIXED_DT);
    expect(world.player.yaw).toBe(yaw);
    expect(world.player.vx).toBe(0);
  });

  it('advances sim time', () => {
    const world = stepped(30);
    expect(world.time).toBeCloseTo(30 * FIXED_DT, 5);
  });
});
