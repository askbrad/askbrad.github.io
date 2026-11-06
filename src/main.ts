/**
 * Bootstrap: engine → city scene → input → sim loop → render sync.
 * The fixed-timestep sim is authoritative; rendering (including the cutaway
 * fades) just projects sim state. Debug-fly (G) is a render-side affordance
 * for milestone fly-throughs and is removed before playtest builds (M7).
 */

import { Engine, Vector3, Axis } from '@babylonjs/core';
import { advance, createAccumulator } from './sim/loop';
import { createWorld, stepWorld } from './sim/world';
import { STREET_Y, floorAt, floorLabel } from './sim/city/city';
import { buildCollision } from './sim/city/colliders';
import { createScene } from './render/sceneSetup';
import { InputManager } from './render/input';
import { CameraRig, PITCH_DEG, orbitOffset } from './render/cameraRig';
import { PlayerView, playerTarget } from './render/playerView';
import { Hud } from './render/hud';

const FLY_SPEED_MULT = 3;
const FLY_VERT_SPEED = 14;

function main(): void {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const hudRoot = document.getElementById('hud') as HTMLDivElement;

  const engine = new Engine(canvas, true, { stencil: false }, false);
  const { scene, camera, city } = createScene(engine);

  const input = new InputManager(canvas);
  const rig = new CameraRig();
  const world = createWorld(buildCollision());
  const acc = createAccumulator();

  const playerView = new PlayerView(scene);
  const hud = new Hud(hudRoot);
  hud.setEnergy(1);

  const pitchRad = (PITCH_DEG * Math.PI) / 180;

  // Scratch vectors — reused every frame, no per-frame allocation.
  const target = new Vector3();
  const fwd = new Vector3();
  const right = new Vector3();

  let fly = false;
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

    // Debug-fly toggle.
    if (input.keyEdge('KeyG')) {
      fly = !fly;
      if (!fly) {
        world.player.y = STREET_Y;
        world.player.vy = 0;
      }
    }

    // 2. Fixed-step simulation. Intent sampled once per frame, held per step.
    const intent = input.getIntent(
      { x: fwd.x / frLen, z: fwd.z / frLen },
      { x: right.x / rtLen, z: right.z / rtLen },
    );
    if (fly) {
      intent.moveX *= FLY_SPEED_MULT;
      intent.moveZ *= FLY_SPEED_MULT;
    }
    advance(acc, frameDt, (dt) => {
      stepWorld(world, intent, dt);
      if (fly) {
        const up = (intent.jumpHeld ? 1 : 0) - (input.keyDown('KeyC') ? 1 : 0);
        world.player.y = Math.max(0.6, world.player.y + up * FLY_VERT_SPEED * dt);
        // Fly mode is noclip: reset jump bookkeeping so landing is clean after.
        world.player.grounded = false;
        world.player.jumps = 0;
        if (!intent.jumpHeld) world.player.vy = 0;
      }
    });

    // 3. Render sync.
    playerTarget(world.player, target);
    playerView.sync(world.player);
    camera.position.set(target.x + offset.x, target.y + offset.y, target.z + offset.z);
    camera.setTarget(target);

    city.update(world.player.x, world.player.y, world.player.z, clampedDt);
    hud.setFloor(floorLabel(floorAt(world.player.x, world.player.y, world.player.z)));
    hud.setCameraMode(rig);
    scene.render();
  });

  window.addEventListener('resize', () => engine.resize());
}

main();
