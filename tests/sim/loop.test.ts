import { describe, expect, it } from 'vitest';
import { FIXED_DT, MAX_FRAME_DT, advance, createAccumulator } from '../../src/sim/loop';

describe('fixed-timestep accumulator', () => {
  it('runs exactly one step per fixed tick', () => {
    const acc = createAccumulator();
    let steps = 0;
    const result = advance(acc, FIXED_DT * 5, () => steps++);
    expect(steps).toBe(5);
    expect(result.steps).toBe(5);
  });

  it('reports leftover time as interpolation alpha in [0, 1)', () => {
    const acc = createAccumulator();
    const result = advance(acc, FIXED_DT * 2.5, () => {});
    expect(result.steps).toBe(2);
    expect(result.alpha).toBeCloseTo(0.5, 5);
  });

  it('carries remainder across frames', () => {
    const acc = createAccumulator();
    let steps = 0;
    advance(acc, FIXED_DT * 0.75, () => steps++);
    advance(acc, FIXED_DT * 0.75, () => steps++);
    expect(steps).toBe(1); // 1.5 ticks elapsed, only one full step due
    expect(acc.acc).toBeCloseTo(FIXED_DT * 0.5, 5);
  });

  it('clamps huge frame deltas so a stall cannot spiral', () => {
    const acc = createAccumulator();
    const result = advance(acc, 30, () => {}); // 30s frame (tab switch, breakpoint)
    expect(result.steps).toBeLessThanOrEqual(Math.floor(MAX_FRAME_DT / FIXED_DT) + 1);
  });

  it('rejects negative deltas', () => {
    const acc = createAccumulator();
    const result = advance(acc, -1, () => {});
    expect(result.steps).toBe(0);
    expect(result.alpha).toBe(0);
  });
});
