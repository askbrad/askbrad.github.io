import { describe, expect, it } from 'vitest';
import { MAX_DIST, MIN_DIST, PITCH_DEG, SNAP_STEP_DEG, CameraRig, clamp, orbitOffset } from '../../src/render/cameraRig';

const DEG = Math.PI / 180;

describe('camera orbit math', () => {
  it('at yaw 0 the camera sits on +Z (looking back toward the target/−Z)', () => {
    const o = orbitOffset(0, PITCH_DEG * DEG, 20);
    expect(o.x).toBeCloseTo(0, 6);
    expect(o.z).toBeGreaterThan(0);
    expect(o.y).toBeCloseTo(20 * Math.sin(PITCH_DEG * DEG), 6);
  });

  it('at yaw 90° the camera sits on +X', () => {
    const o = orbitOffset(90 * DEG, PITCH_DEG * DEG, 20);
    expect(o.x).toBeCloseTo(20 * Math.cos(PITCH_DEG * DEG), 6);
    expect(o.z).toBeCloseTo(0, 6);
  });

  it('scales linearly with distance', () => {
    const a = orbitOffset(0.5, PITCH_DEG * DEG, 10);
    const b = orbitOffset(0.5, PITCH_DEG * DEG, 20);
    expect(b.x / a.x).toBeCloseTo(2, 6);
    expect(b.y / a.y).toBeCloseTo(2, 6);
  });
});

describe('camera rig', () => {
  const frame = (rig: CameraRig, yawDelta: number, times = 1) => {
    for (let i = 0; i < times; i++) rig.update({ yawDelta, zoomDelta: 0, snapToggled: false }, 1 / 60);
  };

  it('free orbit accumulates yaw deltas', () => {
    const rig = new CameraRig();
    frame(rig, 45 * DEG);
    expect(rig.yawDeg).toBeCloseTo(45, 3);
  });

  it('snap mode eases yaw toward the nearest 90° step', () => {
    const rig = new CameraRig();
    rig.snap = true;
    // Drag to ~55° then let the ease settle.
    frame(rig, 55 * DEG, 1);
    for (let i = 0; i < 120; i++) frame(rig, 0);
    expect(rig.yawDeg).toBeCloseTo(90, 1);
  });

  it('snap toggle flips mode', () => {
    const rig = new CameraRig();
    rig.update({ yawDelta: 0, zoomDelta: 0, snapToggled: true }, 1 / 60);
    expect(rig.snap).toBe(true);
    rig.update({ yawDelta: 0, zoomDelta: 0, snapToggled: true }, 1 / 60);
    expect(rig.snap).toBe(false);
  });

  it('zoom clamps to [MIN_DIST, MAX_DIST]', () => {
    const rig = new CameraRig();
    rig.update({ yawDelta: 0, zoomDelta: 100, snapToggled: false }, 1 / 60);
    expect(rig.dist).toBe(MIN_DIST);
    rig.update({ yawDelta: 0, zoomDelta: -100, snapToggled: false }, 1 / 60);
    expect(rig.dist).toBe(MAX_DIST);
  });

  it('SNAP_STEP_DEG divides 360 evenly', () => {
    expect(360 % SNAP_STEP_DEG).toBe(0);
  });
});

describe('clamp', () => {
  it('clamps', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
});
