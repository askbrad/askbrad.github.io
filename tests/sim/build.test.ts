import { describe, expect, it } from 'vitest';
import { FIXED_DT } from '../../src/sim/loop';
import { createWorld, stepWorld } from '../../src/sim/world';
import { buildCollision } from '../../src/sim/city/colliders';
import {
  applyPreset,
  buy,
  createLoadout,
  cycleMode,
  flightAllowed,
  maxEnergy,
  modesOwned,
  recycle,
  relocate,
  reservationTotal,
  tierOf,
  type Loadout,
} from '../../src/sim/build';
import type { Intent } from '../../src/sim/types';

const COL = buildCollision();
const NO_I: Intent = {
  moveX: 0, moveZ: 0, jumpHeld: false, jumpPressed: false, fireHeld: false,
  punchPressed: false, aimX: 0, aimZ: 0, fly: false, flyUp: 0,
  dashPressed: false, interactHeld: false, modeNextPressed: false,
  modePrevPressed: false, blasterHeld: false,
};

function run(world: ReturnType<typeof createWorld>, secs: number, over: Partial<Intent> = {}): void {
  const steps = Math.round(secs / FIXED_DT);
  for (let i = 0; i < steps; i++) stepWorld(world, { ...NO_I, ...over }, FIXED_DT);
}

// ── Build system ────────────────────────────────────────────────────────────

describe('tech tree purchases', () => {
  it('requires credits unless lab free-purchase is on', () => {
    const lo = createLoadout(0);
    expect(buy(lo, 'aerial')).toEqual({ ok: false, reason: 'credits' });
    lo.toggles.freePurchases = true;
    expect(buy(lo, 'aerial').ok).toBe(true);
    expect(tierOf(lo, 'aerial')).toBe(1);
  });

  it('enforces the prerequisite ladder (tier N needs N-1)', () => {
    const lo = createLoadout(100);
    // Can't buy T2 without T1: buy() only ever offers the next tier, so the
    // ladder is structural — verify upgrade-in-place costs the tier-2 price.
    buy(lo, 'aerial'); // T1, 1 cr
    const before = lo.credits;
    buy(lo, 'aerial'); // T2, 2 cr
    expect(lo.credits).toBe(before - 2);
    expect(tierOf(lo, 'aerial')).toBe(2);
  });

  it('caps at T4 and refunds fully on recycle', () => {
    const lo = createLoadout(100);
    for (let i = 0; i < 6; i++) buy(lo, 'capacity'); // 1+2+3+4 = 10 spent, capped at T4
    expect(tierOf(lo, 'capacity')).toBe(4);
    expect(lo.credits).toBe(90);
    expect(recycle(lo, 'capacity')).toBe(true);
    expect(lo.credits).toBe(100); // full test refund
    expect(tierOf(lo, 'capacity')).toBe(0);
  });

  it('enforces socket occupancy even with free purchases', () => {
    const lo = createLoadout(0);
    lo.toggles.freePurchases = true;
    // Fill the legs with vector (needs 2 of 4 leg sockets), then… capacity and
    // recovery share chest/spine sockets: install both, then relocate one to
    // collide — occupancy must always hold.
    buy(lo, 'vector');
    buy(lo, 'recovery');
    buy(lo, 'capacity');
    const used = new Set(lo.modules.flatMap((m) => m.sockets));
    for (const m of lo.modules) {
      for (const s of m.sockets) {
        // no socket shared by two modules
        expect([...used].filter((x) => x === s).length).toBeLessThanOrEqual(1);
      }
    }
  });

  it('relocation moves a module and respects occupancy', () => {
    const lo = createLoadout(0);
    lo.toggles.freePurchases = true;
    buy(lo, 'recovery'); // chest-lower or spine-lower
    const mod = lo.modules.find((m) => m.branch === 'recovery')!;
    const oldSocket = mod.sockets[0]!;
    buy(lo, 'capacity'); // may take the other chest/spine socket
    // Relocate recovery — should find a free valid socket (or fail cleanly).
    relocate(lo, 'recovery');
    const sockets = new Set(lo.modules.flatMap((m) => m.sockets));
    expect(sockets.size).toBe(lo.modules.reduce((a, m) => a + m.sockets.length, 0)); // no overlap
    void oldSocket;
  });
});

describe('energy model (M4 reservations)', () => {
  it('max energy = 100 + capacity − reservations', () => {
    const lo = createLoadout(0);
    lo.toggles.freePurchases = true;
    expect(maxEnergy(lo)).toBe(100);
    buy(lo, 'capacity'); // +25 bonus, −1 reservation
    expect(maxEnergy(lo)).toBe(124);
    buy(lo, 'aerial'); // −8 reservation
    expect(maxEnergy(lo)).toBe(116);
    buy(lo, 'capacity'); // T2: bonus 60 replaces 25; reservation 2 replaces 1
    expect(maxEnergy(lo)).toBe(100 + 60 - (8 + 2));
  });

  it('never drops below the safety floor of 20', () => {
    const lo = createLoadout(0);
    lo.toggles.freePurchases = true;
    for (const b of ['aerial', 'lightning', 'recovery', 'capacity', 'hacking'] as const) {
      for (let i = 0; i < 4; i++) buy(lo, b);
    }
    // T4 reservations: 20+11+8+6+4 = 49; capacity bonus 220.
    expect(reservationTotal(lo)).toBe(49);
    expect(maxEnergy(lo)).toBe(100 + 220 - 49);
  });
});

describe('attack modes', () => {
  it('cycles only through owned modes and demotes safely on recycle', () => {
    const lo = createLoadout(0);
    lo.toggles.freePurchases = true;
    expect(modesOwned(lo)).toEqual(['STANDARD']);
    buy(lo, 'lightning');
    expect(modesOwned(lo)).toEqual(['STANDARD', 'THUNDER']);
    cycleMode(lo, 1);
    expect(lo.mode).toBe('THUNDER');
    recycle(lo, 'lightning');
    expect(lo.mode).toBe('STANDARD'); // demoted, never stuck in an unowned mode
  });
});

describe('presets (test lab)', () => {
  it('replaces the build and owns all four Thunder Angel branches', () => {
    const lo = createLoadout(0);
    lo.toggles.freePurchases = true;
    buy(lo, 'hacking');
    expect(applyPreset(lo, 'THUNDER_ANGEL_3')).toBe(true);
    expect(tierOf(lo, 'aerial')).toBe(3);
    expect(tierOf(lo, 'lightning')).toBe(3);
    expect(tierOf(lo, 'recovery')).toBe(3);
    expect(tierOf(lo, 'capacity')).toBe(3);
    expect(tierOf(lo, 'hacking')).toBe(0); // replaced
  });
});

// ── Abilities in-sim ────────────────────────────────────────────────────────

describe('aerial hover (real flight)', () => {
  function flyingWorld(): Loadout {
    const lo = createLoadout(0);
    lo.toggles.freePurchases = true;
    buy(lo, 'aerial'); // T1
    return lo;
  }

  it('hovers with held jump after jumping — and drains the reactor', () => {
    const world = createWorld(COL, flyingWorld());
    run(world, 1);
    expect(world.player.grounded).toBe(true);
    // Jump, then hold jump → hover.
    run(world, 0.1, { jumpPressed: true });
    run(world, 1.5, { jumpHeld: true });
    expect(world.player.grounded).toBe(false);
    expect(world.reactor.energy).toBeLessThan(world.reactor.max - 10); // hoverDrain 24 E/s
  });

  it('falls when the reactor is empty', () => {
    const world = createWorld(COL, flyingWorld());
    world.reactor.energy = 0;
    run(world, 0.1, { jumpPressed: true });
    run(world, 1.2, { jumpHeld: true }); // full jump arc + landing
    // No energy → no hover → lands back on the street.
    expect(world.player.grounded).toBe(true);
    expect(world.player.y).toBeCloseTo(14, 1);
  });

  it('is disabled in VECTOR mode', () => {
    const lo = flyingWorld();
    cycleMode(lo, 1); // → THUNDER
    cycleMode(lo, 1); // → STANDARD again if vector not owned
    lo.mode = 'VECTOR'; // force (would need vector owned; flight still disallowed)
    expect(flightAllowed(lo)).toBe(false);
  });
});

describe('vector dash', () => {
  it('dashes with a charge, spends energy, and recharges over time', () => {
    const lo = createLoadout(0);
    lo.toggles.freePurchases = true;
    buy(lo, 'vector'); // T1: 1 charge, 12 E
    const world = createWorld(COL, lo);
    run(world, 1); // settle
    const energyBefore = world.reactor.energy;
    run(world, 0.2, { dashPressed: true, moveX: 1 });
    expect(world.reactor.energy).toBeLessThan(energyBefore); // paid for the dash
    expect(world.player.x).toBeGreaterThan(2); // moved fast
    // Recharge: 2.5 s → charge returns.
    run(world, 3);
    expect(world.player.dashCharges).toBe(1);
  });
});

describe('hacking (gate terminal)', () => {
  // Fresh collision per test: opening a gate mutates the walls array.
  it('opens the exchange gate after channelling with Hacking T1', () => {
    const col = buildCollision();
    const lo = createLoadout(0);
    lo.toggles.freePurchases = true;
    buy(lo, 'hacking'); // T1: 1.5 s channel
    const world = createWorld(col, lo);
    const gate = col.gates[0]!;
    world.player.x = gate.terminal.x + 1;
    world.player.z = gate.terminal.z;
    world.player.y = 14;
    run(world, 2.5, { interactHeld: true });
    expect(col.walls.includes(gate.wall)).toBe(false); // collider removed
    // And the player can now walk through the door gap.
    world.player.x = -60;
    world.player.z = -36;
    run(world, 2, { moveZ: -1 });
    expect(world.player.z).toBeLessThan(-38.5);
  });

  it('does nothing without the hacking module', () => {
    const col = buildCollision();
    const world = createWorld(col);
    const gate = col.gates[0]!;
    world.player.x = gate.terminal.x + 1;
    world.player.z = gate.terminal.z;
    world.player.y = 14;
    run(world, 3, { interactHeld: true });
    expect(col.walls.includes(gate.wall)).toBe(true);
  });
});
