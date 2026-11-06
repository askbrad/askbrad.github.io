/**
 * Fixed-timestep accumulator.
 *
 * Rendering runs at display rate; simulation always steps at FIXED_DT so the
 * sim is deterministic and headless-testable. `advance` clamps huge frame
 * deltas (tab switches, breakpoints) so a single frame can never spiral into
 * hundreds of catch-up steps.
 */

export const FIXED_DT = 1 / 60;

/** Largest frame delta accepted before clamping (seconds). */
export const MAX_FRAME_DT = 0.25;

export interface Accumulator {
  /** Leftover sim time not yet consumed, in seconds, range [0, FIXED_DT). */
  acc: number;
}

export function createAccumulator(): Accumulator {
  return { acc: 0 };
}

export interface AdvanceResult {
  /** Number of fixed steps executed this frame (0 or more). */
  steps: number;
  /** Fraction [0, 1) of the next step already elapsed — render interpolation factor. */
  alpha: number;
}

/**
 * Advance the simulation by `frameDt` seconds, invoking `step` once per fixed
 * tick. Returns the step count and interpolation alpha for rendering.
 */
export function advance(
  accumulator: Accumulator,
  frameDt: number,
  step: (dt: number) => void,
): AdvanceResult {
  const clamped = Math.max(0, Math.min(frameDt, MAX_FRAME_DT));
  accumulator.acc += clamped;

  let steps = 0;
  while (accumulator.acc >= FIXED_DT) {
    step(FIXED_DT);
    accumulator.acc -= FIXED_DT;
    steps++;
  }

  return { steps, alpha: accumulator.acc / FIXED_DT };
}
