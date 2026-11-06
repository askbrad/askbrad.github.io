/**
 * Foundry hub (M4): a small authored interior where the loop closes —
 * Engineering console (tech tree UI), Launch pad (deploy to the city).
 * Assembly station is an M6 placeholder. Collision uses the same
 * surfaces/walls model as the city so the player controller is identical.
 */

import { Color3, DirectionalLight, FreeCamera, HemisphericLight, MeshBuilder, Scene, StandardMaterial, Vector3 } from '@babylonjs/core';
import type { Engine } from '@babylonjs/core';
import type { CollisionWorld } from '../sim/city/colliders';
import { PITCH_DEG, orbitOffset } from './cameraRig';

export const FOUNDRY_SPAWN = { x: 0, y: 0, z: 8 };
export const ENGINEERING_POS = { x: 0, z: -9.5 };
export const ASSEMBLY_POS = { x: 9, z: -9.5 };
export const LAUNCH_ZONE = { x: 0, z: -9.5, halfWidth: 2.5 };

export function buildFoundryCollision(): CollisionWorld {
  const walls = [
    { x0: -18.6, x1: -18, y0: 0, y1: 6, z0: -12.6, z1: 12.6 },
    { x0: 18, x1: 18.6, y0: 0, y1: 6, z0: -12.6, z1: 12.6 },
    { x0: -18.6, x1: 18.6, y0: 0, y1: 6, z0: -12.6, z1: -12 },
    { x0: -18.6, x1: 18.6, y0: 0, y1: 6, z0: 12, z1: 12.6 },
    // Engineering console body
    { x0: -3, x1: 3, y0: 0, y1: 1.2, z0: -10.6, z1: -9 },
    // Assembly console body
    { x0: 7.5, x1: 10.5, y0: 0, y1: 1.2, z0: -10.6, z1: -9 },
  ];
  return {
    walls,
    surfaces: [{ y: 0, x0: -18, z0: -12, x1: 18, z1: 12 }],
    trees: [],
    spawn: { ...FOUNDRY_SPAWN, y: 0 },
    gates: [],
  };
}

export interface FoundrySceneBundle {
  scene: Scene;
  camera: FreeCamera;
}

export function buildFoundryScene(engine: Engine): FoundrySceneBundle {
  const scene = new Scene(engine);
  const camera = new FreeCamera('foundryCam', new Vector3(0, 12, 20), scene);
  camera.minZ = 0.5;

  const hemi = new HemisphericLight('fHemi', new Vector3(0.2, 1, 0.15), scene);
  hemi.intensity = 0.85;
  const sun = new DirectionalLight('fSun', new Vector3(-0.4, -1, -0.35), scene);
  sun.intensity = 0.6;

  const std = (name: string, r: number, g: number, b: number, em = 0): StandardMaterial => {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor = new Color3(r, g, b);
    m.emissiveColor = new Color3(r * em, g * em, b * em);
    m.specularColor = new Color3(0.03, 0.03, 0.03);
    return m;
  };

  const box = (name: string, w: number, h: number, d: number, x: number, y: number, z: number, m: StandardMaterial): void => {
    const b = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
    b.position.set(x, y, z);
    b.material = m;
    b.isPickable = false;
  };

  // Room shell: warm floor, cool walls.
  const floorMat = std('fFloor', 0.4, 0.36, 0.3);
  const wallMat = std('fWall', 0.26, 0.3, 0.38);
  box('f_floor', 36, 0.4, 24, 0, -0.2, 0, floorMat);
  box('f_wallN', 36, 6, 0.6, 0, 3, -12.2, wallMat);
  box('f_wallS', 36, 6, 0.6, 0, 3, 12.2, wallMat);
  box('f_wallW', 0.6, 6, 24, -18.2, 3, 0, wallMat);
  box('f_wallE', 0.6, 6, 24, 18.2, 3, 0, wallMat);

  // Engineering console (north): dark body + cyan screens.
  const consoleMat = std('fConsole', 0.2, 0.24, 0.3);
  const screenMat = std('fScreenE', 0.15, 0.6, 0.8, 0.9);
  box('f_engBody', 6, 1.2, 1.6, ENGINEERING_POS.x, 0.6, ENGINEERING_POS.z, consoleMat);
  box('f_engScreen', 5.4, 1.2, 0.2, ENGINEERING_POS.x, 1.9, ENGINEERING_POS.z - 0.5, screenMat);
  box('f_engScreen2', 0.2, 1.4, 1.2, ENGINEERING_POS.x - 2.6, 2.0, ENGINEERING_POS.z, screenMat);
  box('f_engScreen3', 0.2, 1.4, 1.2, ENGINEERING_POS.x + 2.6, 2.0, ENGINEERING_POS.z, screenMat);

  // Assembly console (east, M6 placeholder): amber screens.
  const asmScreen = std('fScreenA', 0.85, 0.6, 0.15, 0.7);
  box('f_asmBody', 3, 1.2, 1.6, ASSEMBLY_POS.x, 0.6, ASSEMBLY_POS.z, consoleMat);
  box('f_asmScreen', 2.6, 1.0, 0.2, ASSEMBLY_POS.x, 1.8, ASSEMBLY_POS.z - 0.5, asmScreen);

  // Launch pad (south): bright warm pad with rim.
  const padMat = std('fPad', 0.6, 0.5, 0.3, 0.25);
  box('f_pad', 5, 0.12, 5, LAUNCH_ZONE.x, 0.06, LAUNCH_ZONE.z, padMat);
  const padRim = std('fPadRim', 0.95, 0.8, 0.4, 0.5);
  box('f_padRimN', 5, 0.1, 0.4, LAUNCH_ZONE.x, 0.14, LAUNCH_ZONE.z - 2.4, padRim);
  box('f_padRimS', 5, 0.1, 0.4, LAUNCH_ZONE.x, 0.14, LAUNCH_ZONE.z + 2.4, padRim);
  box('f_padRimW', 0.4, 0.1, 5, LAUNCH_ZONE.x - 2.4, 0.14, LAUNCH_ZONE.z, padRim);
  box('f_padRimE', 0.4, 0.1, 5, LAUNCH_ZONE.x + 2.4, 0.14, LAUNCH_ZONE.z, padRim);

  // Initial framing on the spawn.
  const offset = orbitOffset(45 * (Math.PI / 180), (PITCH_DEG * Math.PI) / 180, 16);
  camera.position.set(FOUNDRY_SPAWN.x + offset.x, FOUNDRY_SPAWN.y + offset.y, FOUNDRY_SPAWN.z + offset.z);
  camera.setTarget(new Vector3(FOUNDRY_SPAWN.x, 1, FOUNDRY_SPAWN.z));

  return { scene, camera };
}
