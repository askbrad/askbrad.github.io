/**
 * 2.5D follow camera rig.
 *
 * Pure state + math — no Babylon imports — so orbit behaviour is unit-testable.
 * main.ts applies the rig to a Babylon camera each frame. Pitch stays fixed
 * (per plan §4); yaw is free 360° with an optional 90°-snapped mode with easing
 * (plan §11.2).
 */

export const PITCH_DEG = 57;
export const MIN_DIST = 8;
export const MAX_DIST = 45;
export const SNAP_STEP_DEG = 90;
const SNAP_EASE_RATE = 12; // higher = snappier easing toward the snapped target

export interface OrbitOffset {
  x: number;
  y: number;
  z: number;
}

/**
 * Camera offset from the follow target for a given orbit yaw/pitch/dist.
 * yaw 0 sits on +Z looking back toward −Z; positive yaw orbits counter-clockwise
 * (viewed from above).
 */
export function orbitOffset(yawRad: number, pitchRad: number, dist: number): OrbitOffset {
  const cp = Math.cos(pitchRad);
  return {
    x: dist * cp * Math.sin(yawRad),
    y: dist * Math.sin(pitchRad),
    z: dist * cp * Math.cos(yawRad),
  };
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function wrapDeg(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

export class CameraRig {
  /** 45° default so building blocks read at an angle, not face-on. */
  yawDeg = 45;
  dist = 22;

  /** Snapped mode: yaw eases toward the nearest multiple of SNAP_STEP_DEG. */
  snap = false;

  /**
   * Advance rig state for one frame.
   * In free mode, yaw accumulates the raw delta; in snap mode the delta moves
   * an internal free yaw and the visible yaw eases to the nearest snap step.
   */
  update(cam: { yawDelta: number; zoomDelta: number; snapToggled: boolean }, dt: number): void {
    if (cam.snapToggled) this.snap = !this.snap;

    this.dist = clamp(this.dist * Math.exp(-cam.zoomDelta), MIN_DIST, MAX_DIST);

    if (this.snap) {
      this.freeYawDeg = wrapDeg(this.freeYawDeg + (cam.yawDelta * 180) / Math.PI);
      const target = Math.round(this.freeYawDeg / SNAP_STEP_DEG) * SNAP_STEP_DEG;
      // Ease visible yaw toward target (shortest signed path).
      let delta = target - this.yawDeg;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      this.yawDeg = wrapDeg(this.yawDeg + delta * Math.min(1, SNAP_EASE_RATE * dt));
    } else {
      this.yawDeg = wrapDeg(this.yawDeg + (cam.yawDelta * 180) / Math.PI);
      this.freeYawDeg = this.yawDeg;
    }
  }

  private freeYawDeg = 45;
}
