/**
 * Bootstrap: engine → scene → input → sim loop → render sync.
 * The fixed-timestep sim is authoritative; rendering just projects it.
 */

import { Engine, Vector3, Axis } from '@babylonjs/core';
import { advance, createAccumulator } from './sim/loop';
import { createWorld, stepWorld } from './sim/world';
import { createScene } from './render/sceneSetup';
import { InputManager } from './render/input';
import { CameraRig, PITCH_DEG, orbitOffset } from './render/cameraRig';
import { PlayerView, playerTarget } from './render/playerView';
import { Hud } from './render/hud';

function main(): void {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const hudRoot = document.getElementById('hud') as HTMLDivElement;

  const engine = new Engine(canvas, true, { stencil: false }, false);
  const { scene, camera } = createScene(engine, canvas);

  const input = new InputManager(canvas);
  const rig = new CameraRig();
  const world = createWorld();
  const acc = createAccumulator();

  const playerView = new PlayerView(scene);
  const hud = new Hud(hudRoot);
  hud.setEnergy(1);

  const pitchRad = (PITCH_DEG * Math.PI) / 180;

  // Scratch vectors — reused every frame, no per-frame allocation.
  const target = new Vector3();
  const fwd = new Vector3();
  const right = new Vector3();

  let last = performance.now();

  engine.runRenderLoop(() => {
    const now = performance.now();
    const frameDt = (now - last) / 1000;
    last = now;
    const clampedDt = Math.min(frameDt, 0.1);

    // 1. Camera input + rig (render-side state, not part of the sim).
    const camInput = input.getCameraInput(clampedDt);
    rig.update(camInput, clampedDt);

    const yawRad = (rig.yawDeg * Math.PI) / 180;
    const offset = orbitOffset(yawRad, pitchRad, rig.dist);

    // Camera basis projected onto the ground plane, for movement rebasing.
    camera.getDirectionToRef(Axis.X, right);
    camera.getDirectionToRef(Axis.Z, fwd);
    const frLen = Math.hypot(fwd.x, fwd.z) || 1;
    const rtLen = Math.hypot(right.x, right.z) || 1;

    // 2. Fixed-step simulation. Intent is sampled once per frame and held for
    // every fixed step this frame — input is polled at display rate.
    const intent = input.getIntent(
      { x: fwd.x / frLen, z: fwd.z / frLen },
      { x: right.x / rtLen, z: right.z / rtLen },
    );
    advance(acc, frameDt, (dt) => stepWorld(world, intent, dt));

    // 3. Render sync.
    playerTarget(world.player, target);
    playerView.sync(world.player);
    camera.position.set(target.x + offset.x, target.y + offset.y, target.z + offset.z);
    camera.setTarget(target);

    hud.setCameraMode(rig);
    scene.render();
  });

  window.addEventListener('resize', () => engine.resize());
}

main();
