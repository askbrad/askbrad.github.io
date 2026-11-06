/**
 * Bootstrap M4: two scenes — Foundry hub and City mission — sharing one sim
 * model (per-scene WorldState) and one fixed-timestep loop. Deploy switches
 * world+scene; returning happens at the extract tram (hold E).
 */

import { Engine, Matrix, Vector3, Axis } from '@babylonjs/core';
import { advance, createAccumulator } from './sim/loop';
import { createWorld, stepWorld } from './sim/world';
import { STREET_Y, floorAt, floorLabel } from './sim/city/city';
import { buildCollision, topSurfaceAt, type CollisionWorld } from './sim/city/colliders';
import { createScene } from './render/sceneSetup';
import { buildFoundryScene, buildFoundryCollision, ENGINEERING_POS, ASSEMBLY_POS, LAUNCH_ZONE } from './render/foundryView';
import { InputManager } from './render/input';
import { CameraRig, PITCH_DEG, orbitOffset } from './render/cameraRig';
import { PlayerView, playerTarget } from './render/playerView';
import { CombatView } from './render/combatView';
import { Hud } from './render/hud';
import { EngineeringUI } from './render/ui/engineering';
import { PauseMenu } from './render/ui/pauseMenu';
import { AssemblyUI } from './render/ui/assembly';
import { ArmourRig } from './render/armourView';
import { createLoadout, maxEnergy, modesOwned } from './sim/build';
import { objectiveLines } from './sim/mission';
import { createPersistence, type SaveDataV1 } from './save/persistence';
import { applyCosmeticsData, createCosmetics, serializeCosmetics, type Cosmetics, type PartId } from './sim/cosmetics';

const FLY_SPEED_MULT = 3;
const AIM_PLANE_OFFSET = 1.0; // aim plane rides at chest height when grounded
const EXTRACT_HOLD = 1.0; // seconds of E at the tram to return to foundry

function main(): void {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const hudRoot = document.getElementById('hud') as HTMLDivElement;

  const engine = new Engine(canvas, true, { stencil: false }, false);

  // ── Shared state ────────────────────────────────────────────────────────
  const persistence = createPersistence(window.localStorage);
  const saved = persistence.load();
  const loadout = createLoadout(saved?.credits ?? 10);
  if (saved) {
    loadout.mode = (saved.mode as typeof loadout.mode) ?? 'STANDARD';
    loadout.toggles = saved.toggles ?? loadout.toggles;
    loadout.modules = (saved.modules ?? []).map((m) => ({
      branch: m.branch as typeof loadout.modules[number]['branch'],
      tier: m.tier,
      sockets: m.sockets,
    }));
  }
  const lifetimeScrap = saved?.scrap ?? 0;
  const lifetimeDeaths = saved?.deaths ?? 0;
  const cosmetics: Cosmetics = createCosmetics();
  if (saved?.cosmetics) applyCosmeticsData(cosmetics, saved.cosmetics);
  const missionCollision: CollisionWorld = buildCollision();
  const foundryCollision = buildFoundryCollision();

  const foundry = buildFoundryScene(engine);
  const foundryWorld = createWorld(foundryCollision, loadout);
  foundryWorld.stats.scrap = lifetimeScrap;
  foundryWorld.stats.deaths = lifetimeDeaths;
  const foundryView = new PlayerView(foundry.scene);
  // Assembly mannequin: rotating live preview of the suit.
  const manne = new ArmourRig(foundry.scene, 'mannequin');
  manne.root.position.set(13, 0, -6.5);
  manne.root.rotation.y = -0.9;

  const mission = createScene(engine); // city (builds once, reused)
  let missionWorld = createWorld(missionCollision, loadout);
  missionWorld.stats.scrap = lifetimeScrap;
  missionWorld.stats.deaths = lifetimeDeaths;
  const missionView = new PlayerView(mission.scene);
  const combatView = new CombatView(mission.scene);

  // Cosmetics + build → all rigs.
  for (const view of [foundryView, missionView]) {
    view.applyCosmetics(cosmetics);
    view.applyBuild(loadout);
  }
  manne.applyCosmetics(cosmetics);
  manne.applyBuild(loadout);

  function saveNow(): void {
    const data: SaveDataV1 = {
      version: 1,
      credits: loadout.credits,
      scrap: Math.max(foundryWorld.stats.scrap, missionWorld.stats.scrap),
      deaths: Math.max(foundryWorld.stats.deaths, missionWorld.stats.deaths),
      mode: loadout.mode,
      toggles: loadout.toggles,
      modules: loadout.modules.map((m) => ({ branch: m.branch, tier: m.tier, sockets: [...m.sockets] })),
      cosmetics: serializeCosmetics(cosmetics),
    };
    persistence.save(data);
  }

  type SceneMode = 'foundry' | 'mission';
  let sceneMode: SceneMode = 'foundry';
  let world = foundryWorld;
  let activeScene = foundry.scene;
  let activeCamera = foundry.camera;
  let activeView = foundryView;

  const input = new InputManager(canvas);
  const rig = new CameraRig();
  const acc = createAccumulator();

  const hud = new Hud(hudRoot);
  const assembly = new AssemblyUI(hudRoot, () => cosmetics, {
    onChanged: (part: PartId) => {
      // Live preview: apply to all rigs immediately, then persist.
      foundryView.applyCosmetics(cosmetics);
      missionView.applyCosmetics(cosmetics);
      manne.applyCosmetics(cosmetics);
      void part;
      saveNow();
    },
    onClose: () => {},
  });
  const pauseMenu = new PauseMenu(hudRoot, {
    onResume: () => {},
    onAbandon: () => {
      returnToFoundry();
      saveNow();
    },
    mission: () => sceneMode === 'mission',
  });
  const engineering = new EngineeringUI(hudRoot, () => loadout, {
    onChanged: () => {
      // Build changed → reactors re-clamp, tier attachments rebuild, save.
      recompute(foundryWorld);
      recompute(missionWorld);
      foundryView.applyBuild(loadout);
      missionView.applyBuild(loadout);
      manne.applyBuild(loadout);
      saveNow();
    },
    onDeploy: () => deploy(),
    onRefill: () => {
      foundryWorld.reactor.energy = foundryWorld.reactor.max;
      missionWorld.reactor.energy = missionWorld.reactor.max;
    },
  });

  function recompute(w: { reactor: { max: number; energy: number } }): void {
    const m = maxEnergy(loadout);
    w.reactor.max = m;
    if (w.reactor.energy > m) w.reactor.energy = m;
  }

  function deploy(): void {
    // Fresh mission world each deployment; enemies reset, build/credits persist.
    missionWorld = createWorld(missionCollision, loadout);
    missionWorld.stats.credits = loadout.credits;
    world = missionWorld;
    activeScene = mission.scene;
    activeCamera = mission.camera;
    activeView = missionView;
    sceneMode = 'mission';
    lastDeaths = missionWorld.stats.deaths;
    missionView.applyCosmetics(cosmetics);
    missionView.applyBuild(loadout);
  }

  function returnToFoundry(): void {
    loadout.credits = missionWorld.stats.credits; // bank collected credits
    world = foundryWorld;
    activeScene = foundry.scene;
    activeCamera = foundry.camera;
    activeView = foundryView;
    sceneMode = 'foundry';
    saveNow();
  }

  const pitchRad = (PITCH_DEG * Math.PI) / 180;

  // Scratch vectors — reused every frame.
  const target = new Vector3();
  const fwd = new Vector3();
  const right = new Vector3();
  const identity = Matrix.Identity();

  let fly = false;
  let lastDeaths = 0;
  let extractHold = 0;
  let last = performance.now();

  engine.runRenderLoop(() => {
    const now = performance.now();
    const frameDt = (now - last) / 1000;
    last = now;
    const clampedDt = Math.min(frameDt, 0.1);

    // Camera rig (shared across scenes).
    const camInput = input.getCameraInput(clampedDt);
    rig.update(camInput, clampedDt);
    const yawRad = (rig.yawDeg * Math.PI) / 180;
    const offset = orbitOffset(yawRad, pitchRad, rig.dist);

    const p = world.player;

    // Camera basis projected onto the ground plane, for movement rebasing.
    activeCamera.getDirectionToRef(Axis.X, right);
    activeCamera.getDirectionToRef(Axis.Z, fwd);
    const frLen = Math.hypot(fwd.x, fwd.z) || 1;
    const rtLen = Math.hypot(right.x, right.z) || 1;

    // Debug-fly toggle.
    if (input.keyEdge('KeyG')) {
      fly = !fly;
      if (!fly) {
        p.y = sceneMode === 'mission' ? STREET_Y : 0;
        p.vy = 0;
      }
    }

    // Aim (unconditional — see M3 fix).
    const pointer = input.getPointer();
    const rect = canvas.getBoundingClientRect();
    let aimX = 0;
    let aimZ = 0;
    {
      const ray = activeScene.createPickingRay(pointer.x - rect.left, pointer.y - rect.top, identity, activeCamera);
      const dy = ray.direction.y;
      const planeY = p.grounded && !fly ? p.y + AIM_PLANE_OFFSET : Math.max(STREET_Y, p.y - 6) + 1;
      if (Math.abs(dy) > 1e-5) {
        const t = (planeY - ray.origin.y) / dy;
        if (t > 0) {
          const hx = ray.origin.x + ray.direction.x * t - p.x;
          const hz = ray.origin.z + ray.direction.z * t - p.z;
          const hl = Math.hypot(hx, hz);
          if (hl > 0.25) {
            aimX = hx / hl;
            aimZ = hz / hl;
          }
        }
      }
    }

    const intent = input.getIntent(
      { x: fwd.x / frLen, z: fwd.z / frLen },
      { x: right.x / rtLen, z: right.z / rtLen },
      { x: aimX, z: aimZ },
    );
    if (fly) {
      intent.moveX *= FLY_SPEED_MULT;
      intent.moveZ *= FLY_SPEED_MULT;
      intent.fly = true;
      intent.flyUp = (intent.jumpHeld ? 1 : 0) - (input.keyDown('KeyC') ? 1 : 0);
      intent.jumpPressed = false;
    }

    // Pause (Esc) — freezes the sim while the menu is open.
    if (input.keyEdge('Escape')) pauseMenu.toggle();
    const paused = pauseMenu.isOpen() || engineering.isOpen();

    // Foundry interactions (paused while a panel is open).
    if (sceneMode === 'foundry' && !paused) {
      const atEng = Math.hypot(p.x - ENGINEERING_POS.x, p.z - (ENGINEERING_POS.z + 2.5)) < 2.2;
      const atAsm = Math.hypot(p.x - ASSEMBLY_POS.x, p.z - (ASSEMBLY_POS.z + 2.5)) < 2.2;
      if (atEng && input.keyEdge('KeyE')) { engineering.toggle(); assembly.close(); }
      if (atAsm && input.keyEdge('KeyE')) { assembly.toggle(); engineering.close(); }
      // Launch pad walk-in trigger.
      if (Math.abs(p.x - LAUNCH_ZONE.x) < LAUNCH_ZONE.halfWidth && p.z < LAUNCH_ZONE.z + 1.2) {
        deploy();
      }
    }
    if (paused) {
      intent.moveX = 0;
      intent.moveZ = 0;
      intent.fireHeld = false;
      intent.jumpPressed = false;
      intent.dashPressed = false;
      intent.interactHeld = false;
    }
    const moving = Math.hypot(intent.moveX, intent.moveZ);

    // Extract tram (mission): hold E to bank and return — only once objectives
    // are complete (M5).
    if (sceneMode === 'mission') {
      const atExtract = Math.hypot(p.x - world.collision!.spawn.x, p.z - world.collision!.spawn.z) < 4;
      if (world.mission.completed && atExtract && intent.interactHeld) {
        extractHold += clampedDt;
        if (extractHold >= EXTRACT_HOLD) {
          extractHold = 0;
          returnToFoundry();
        }
      } else {
        extractHold = 0;
      }
      hud.setHackProgress(world.mission.completed && atExtract ? 1 - extractHold / EXTRACT_HOLD : null);
    } else {
      hud.setHackProgress(null);
    }

    // Fixed-step simulation (frozen while paused).
    if (!paused) {
      advance(acc, frameDt, (dt) => stepWorld(world, intent, dt));
      (window as { __lastIntent?: unknown }).__lastIntent = intent;
    }
    (window as { __world?: unknown }).__world = world; // QA: always the active world

    // 3. Render sync.
    playerTarget(p, target);
    activeView.sync(p);
    activeView.animate(clampedDt, moving);
    foundryView.animate(clampedDt, sceneMode === 'foundry' ? moving : 0);
    manne.root.rotation.y += clampedDt * 0.6;
    if (sceneMode === 'mission') {
      const groundTop = topSurfaceAt(world.collision!.surfaces, p.x, p.z, p.y + 0.01);
      missionView.updateShadow(p.x, p.y, p.z, groundTop ? groundTop.y : null);
      mission.camera.position.set(target.x + offset.x, target.y + offset.y, target.z + offset.z);
      mission.camera.setTarget(target);
      mission.city.update(p.x, p.y, p.z, clampedDt);
      combatView.update(world.combat, world.time);
      // Gate + relay visuals follow sim state.
      for (const g of missionCollision.gates) {
        mission.city.setGateOpen(g.id, !missionCollision.walls.includes(g.wall));
      }
      for (const r of world.mission.relays) {
        mission.city.setRelayActive(r.id, r.active);
      }
      hud.setFloor(floorLabel(floorAt(p.x, p.y, p.z)));
      hud.setObjectives(objectiveLines(world.mission, world.stats.kills), world.mission.timer, true);
    } else {
      foundry.camera.position.set(target.x + offset.x, target.y + offset.y, target.z + offset.z);
      foundry.camera.setTarget(target);
      hud.setFloor('FOUNDRY');
    }

    hud.setCameraMode(rig);
    hud.setVitals(
      world.stats.hull / world.stats.maxHull,
      world.reactor.energy / Math.max(1, world.reactor.max),
      world.stats.credits,
      world.stats.scrap,
      world.stats.deaths,
    );
    hud.setMode(`${world.loadout.mode} · ${modesOwned(loadout).length} modes`);
    if (world.hack.target) hud.setHackProgress(world.hack.progress);
    else if (sceneMode === 'mission') {
      // Relay channels reuse the same progress bar.
      const relay = world.mission.relays.find((r) => r.progress > 0 && !r.active);
      hud.setHackProgress(relay ? relay.progress : null);
    }
    if (world.stats.deaths !== lastDeaths) {
      lastDeaths = world.stats.deaths;
      hud.flashDeath();
    }
    activeScene.render();
  });

  window.addEventListener('resize', () => engine.resize());

  // QA hook: lets the in-app browser read sim state (window.__world).
  (window as { __world?: unknown }).__world = foundryWorld;
  (window as { __scenes?: unknown }).__scenes = { foundry: foundry.scene, mission: mission.scene };
  (window as { __save?: unknown }).__save = { saveNow, persistence };
}

main();
