/**
 * Bootstrap: engine → city scene → input → sim loop → render sync.
 * The fixed-timestep sim is authoritative (movement + combat); rendering
 * projects it. Debug-fly (G) remains a noclip affordance, removed by M7.
 */

import { Engine, Matrix, Vector3, Axis } from '@babylonjs/core';
import { advance, createAccumulator } from './sim/loop';
import { createWorld, stepWorld } from './sim/world';
import { STREET_Y, floorAt, floorLabel } from './sim/city/city';
import { buildCollision, topSurfaceAt } from './sim/city/colliders';
import { createScene } from './render/sceneSetup';
import { InputManager } from './render/input';
import { CameraRig, PITCH_DEG, orbitOffset } from './render/cameraRig';
import { PlayerView, playerTarget } from './render/playerView';
import { CombatView } from './render/combatView';
import { Hud } from './render/hud';
import { reactorMax } from './sim/energy';

const FLY_SPEED_MULT = 3;
const FLY_VERT_SPEED = 14;
const AIM_PLANE_OFFSET = 1.0; // aim plane rides at chest height

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
  const combatView = new CombatView(scene);
  const hud = new Hud(hudRoot);

  const pitchRad = (PITCH_DEG * Math.PI) / 180;

  // Scratch vectors — reused every frame, no per-frame allocation.
  const target = new Vector3();
  const fwd = new Vector3();
  const right = new Vector3();
  const rayOrigin = new Vector3();
  const identity = Matrix.Identity();

  let fly = false;
  let lastDeaths = 0;
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

    // 2. Mouse-cursor aim: picking ray → intersect the chest-height plane.
    const p = world.player;
    const pointer = input.getPointer();
    const rect = canvas.getBoundingClientRect();
    const px = pointer.x - rect.left;
    const py = pointer.y - rect.top;
    let aimX = 0;
    let aimZ = 0;
    if (!fly) {
      const ray = scene.createPickingRay(px, py, identity, camera);
      rayOrigin.copyFrom(ray.origin);
      const dy = ray.direction.y;
      const planeY = p.y + AIM_PLANE_OFFSET;
      if (Math.abs(dy) > 1e-5) {
        const t = (planeY - rayOrigin.y) / dy;
        if (t > 0) {
          const hx = rayOrigin.x + ray.direction.x * t - p.x;
          const hz = rayOrigin.z + ray.direction.z * t - p.z;
          const hl = Math.hypot(hx, hz);
          if (hl > 0.25) {
            aimX = hx / hl;
            aimZ = hz / hl;
          }
        }
      }
    }

    // 3. Fixed-step simulation. Intent sampled once per frame, held per step.
    const intent = input.getIntent(
      { x: fwd.x / frLen, z: fwd.z / frLen },
      { x: right.x / rtLen, z: right.z / rtLen },
      { x: aimX, z: aimZ },
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

    // 4. Render sync.
    playerTarget(p, target);
    playerView.sync(p);
    const groundTop = topSurfaceAt(world.collision!.surfaces, p.x, p.z, p.y + 0.01);
    playerView.updateShadow(p.x, p.y, p.z, groundTop ? groundTop.y : null);
    camera.position.set(target.x + offset.x, target.y + offset.y, target.z + offset.z);
    camera.setTarget(target);

    city.update(p.x, p.y, p.z, clampedDt);
    combatView.update(world.combat, world.time);
    hud.setFloor(floorLabel(floorAt(p.x, p.y, p.z)));
    hud.setCameraMode(rig);
    hud.setVitals(
      world.stats.hull / world.stats.maxHull,
      world.reactor.energy / reactorMax(),
      world.stats.credits,
      world.stats.scrap,
      world.stats.deaths,
    );
    if (world.stats.deaths !== lastDeaths) {
      lastDeaths = world.stats.deaths;
      hud.flashDeath();
    }
    scene.render();
  });

  window.addEventListener('resize', () => engine.resize());
}

main();
