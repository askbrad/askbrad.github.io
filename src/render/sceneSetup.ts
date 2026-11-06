/**
 * Babylon scene bootstrap for M0: engine, camera, lights, test floor.
 * Root `@babylonjs/core` imports for now — tree-shaking/perf pass comes later
 * (plan §8 perf budget applies from M1 onward).
 */

import {
  Color3,
  FreeCamera,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import type { Engine } from '@babylonjs/core';
import { PITCH_DEG, orbitOffset } from './cameraRig';

export interface SceneBundle {
  scene: Scene;
  camera: FreeCamera;
}

const PITCH_RAD = (PITCH_DEG * Math.PI) / 180;

export function createScene(engine: Engine, canvas: HTMLCanvasElement): SceneBundle {
  const scene = new Scene(engine);

  const camera = new FreeCamera('cam', new Vector3(0, 20, 20), scene);
  camera.minZ = 0.5;

  // Soft ambient so unlit sides stay readable; a fixed sun for shape.
  const hemi = new HemisphericLight('hemi', new Vector3(0.2, 1, 0.1), scene);
  hemi.intensity = 0.9;

  buildTestFloor(scene);

  // Initial framing; re-applied every frame by the rig in main.ts.
  const offset = orbitOffset(0, PITCH_RAD, 22);
  camera.position.set(0, offset.y, offset.z);
  camera.setTarget(Vector3.Zero());

  void canvas;
  return { scene, camera };
}

/** Flat warm test floor with a grid + depth-cue blocks (plan readability §10: warm walkable surfaces, cool props). */
function buildTestFloor(scene: Scene): void {
  const ground = MeshBuilder.CreateGround('floor', { width: 80, height: 80 }, scene);
  const groundMat = new StandardMaterial('floorMat', scene);
  groundMat.diffuseColor = new Color3(0.42, 0.36, 0.3); // warm asphalt-ish
  groundMat.specularColor = new Color3(0.05, 0.05, 0.05);
  ground.material = groundMat;

  // Grid lines every 4m — cheap depth/orientation cue while the city builder lands in M1.
  const lines: Vector3[][] = [];
  for (let i = -40; i <= 40; i += 4) {
    lines.push([new Vector3(i, 0.01, -40), new Vector3(i, 0.01, 40)]);
    lines.push([new Vector3(-40, 0.01, i), new Vector3(40, 0.01, i)]);
  }
  const grid = MeshBuilder.CreateLineSystem('grid', { lines }, scene);
  grid.isPickable = false;

  // A few blocks for parallax/orbit depth cues (cool, subdued palette).
  const blockMat = new StandardMaterial('blockMat', scene);
  blockMat.diffuseColor = new Color3(0.28, 0.34, 0.42); // cool, subdued
  blockMat.specularColor = new Color3(0.04, 0.04, 0.04);
  const blocks = [
    { x: -14, z: -10, w: 8, d: 6, h: 5 },
    { x: 16, z: 12, w: 6, d: 10, h: 8 },
    { x: 12, z: -16, w: 5, d: 5, h: 3 },
    { x: -18, z: 16, w: 10, d: 5, h: 6 },
  ];
  for (const b of blocks) {
    const box = MeshBuilder.CreateBox(`block_${b.x}_${b.z}`, { width: b.w, depth: b.d, height: b.h }, scene);
    box.position.set(b.x, b.h / 2, b.z);
    box.material = blockMat;
    box.isPickable = false;
  }
}
