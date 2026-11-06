/**
 * Babylon scene bootstrap: engine-facing camera, lights, and the city build.
 * Readability: soft ambient + a fixed sun for shape; warm/cool palette lives
 * in the city builder (plan §4).
 */

import {
  Color3,
  DirectionalLight,
  FreeCamera,
  HemisphericLight,
  Scene,
  Vector3,
} from '@babylonjs/core';
import type { Engine } from '@babylonjs/core';
import { PITCH_DEG, orbitOffset } from './cameraRig';
import { buildCity, type CityRender } from './city/cityBuilder';
import { CITY } from '../sim/city/city';

const PITCH_RAD = (PITCH_DEG * Math.PI) / 180;
const DEG2RAD = Math.PI / 180;

export interface SceneBundle {
  scene: Scene;
  camera: FreeCamera;
  city: CityRender;
}

export function createScene(engine: Engine): SceneBundle {
  const scene = new Scene(engine);

  const camera = new FreeCamera('cam', new Vector3(0, 20, 20), scene);
  camera.minZ = 0.5;

  // Soft ambient so unlit sides stay readable; a fixed sun for shape.
  const hemi = new HemisphericLight('hemi', new Vector3(0.2, 1, 0.1), scene);
  hemi.intensity = 0.75;
  const sun = new DirectionalLight('sun', new Vector3(-0.45, -1, -0.3), scene);
  sun.intensity = 0.65;
  sun.diffuse = new Color3(1, 0.96, 0.88);

  const city = buildCity(scene);

  // Initial framing (45° yaw); re-applied every frame by the rig in main.ts.
  const deployY = CITY.meta.streetY;
  const offset = orbitOffset(45 * DEG2RAD, PITCH_RAD, 26);
  camera.position.set(CITY.deploy.x + offset.x, deployY + offset.y, CITY.deploy.z + offset.z);
  camera.setTarget(new Vector3(CITY.deploy.x, deployY, CITY.deploy.z));

  return { scene, camera, city };
}
