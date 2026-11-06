/**
 * Render-side combat views: enemy bodies (squash/hop deformation per the plan
 * §7 brief), pooled projectile tracers, and spinning loot drops. All state is
 * read from sim arrays — no simulation logic lives here.
 */

import { Color3, Mesh, MeshBuilder, StandardMaterial } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';
import type { CombatState } from '../sim/combat';
import { ENEMY_TYPES } from '../sim/enemies';

function mat(scene: Scene, name: string, r: number, g: number, b: number, emissive = 0.35): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = new Color3(r, g, b);
  m.emissiveColor = new Color3(r * emissive, g * emissive, b * emissive);
  m.specularColor = new Color3(0.05, 0.05, 0.05);
  return m;
}

interface EnemyMesh {
  root: Mesh;
  baseMat: StandardMaterial;
  type: string;
  radius: number;
}

export class CombatView {
  private readonly enemies = new Map<number, EnemyMesh>();
  private readonly tracers: Mesh[] = [];
  private readonly tracerPlayerMat: StandardMaterial;
  private readonly tracerEnemyMat: StandardMaterial;
  private readonly dropMeshes = new Map<number, Mesh>();
  private readonly creditMat: StandardMaterial;
  private readonly scrapMat: StandardMaterial;
  private readonly assistRing: Mesh;
  private readonly assistRingMat: StandardMaterial;

  constructor(private readonly scene: Scene) {
    this.tracerPlayerMat = mat(scene, 'tracerP', 0.95, 0.8, 0.3, 0.9); // gold (ballistic FX colour)
    this.tracerEnemyMat = mat(scene, 'tracerE', 0.65, 0.3, 0.9, 0.9); // violet
    this.creditMat = mat(scene, 'dropCredit', 0.95, 0.78, 0.25, 0.6);
    this.scrapMat = mat(scene, 'dropScrap', 0.55, 0.6, 0.68, 0.25);

    // Translucent target ring shown under the current aim-assist target —
    // makes what the assist is doing legible (playtest feedback).
    this.assistRing = MeshBuilder.CreateTorus('assistRing', { diameter: 2, thickness: 0.14, tessellation: 32 }, scene);
    this.assistRing.rotation.x = Math.PI / 2; // lie flat on the ground
    this.assistRingMat = new StandardMaterial('assistRingMat', scene);
    this.assistRingMat.emissiveColor = new Color3(1, 0.78, 0.25); // warm gold
    this.assistRingMat.diffuseColor = new Color3(0, 0, 0);
    this.assistRingMat.specularColor = new Color3(0, 0, 0);
    this.assistRingMat.alpha = 0.4;
    this.assistRingMat.disableDepthWrite = true; // never swallowed by the target's body
    this.assistRingMat.zOffset = -2; // pull toward the camera
    this.assistRing.material = this.assistRingMat;
    this.assistRing.isPickable = false;
    this.assistRing.setEnabled(false);
  }

  private makeEnemyMesh(type: string): EnemyMesh {
    const def = ENEMY_TYPES[type]!;
    const radius = def.radius ?? 0.8;
    let mesh: Mesh;
    let base: StandardMaterial;
    if (type === 'skitter') {
      mesh = MeshBuilder.CreateIcoSphere(`enemy_${type}`, { radius, subdivisions: 1 }, this.scene);
      base = mat(this.scene, `enemyMat_${type}`, 0.85, 0.3, 0.38); // hostile red
    } else {
      mesh = MeshBuilder.CreateSphere(`enemy_${type}`, { diameter: radius * 2, segments: 10 }, this.scene);
      base = mat(this.scene, `enemyMat_${type}`, 0.45, 0.16, 0.72, 0.55); // saturated violet
    }
    mesh.material = base;
    mesh.isPickable = false;
    return { root: mesh, baseMat: base, type, radius };
  }

  /** Sync all combat visuals. Call once per rendered frame. */
  update(combat: CombatState, time: number): void {
    // ── Enemies ────────────────────────────────────────────────────────
    const seen = new Set<number>();
    for (const e of combat.enemies) {
      if (!e.alive) continue;
      seen.add(e.id);
      let em = this.enemies.get(e.id);
      if (!em || em.type !== e.type) {
        em?.root.dispose();
        em = this.makeEnemyMesh(e.type);
        this.enemies.set(e.id, em);
      }
      // Bounce deform: squash-stretch + skitter hop (plan §7 "simple bouncing deforms").
      const squash = 1 + 0.14 * Math.sin(time * 9 + e.phase);
      em.root.scaling.set(1 / squash, squash, 1 / squash);
      const hop = e.type === 'skitter' ? Math.abs(Math.sin(time * 6 + e.phase)) * 0.35 : 0;
      em.root.position.set(e.x, e.y + em.radius * squash + hop, e.z);
      em.root.rotation.y = e.yaw;

      // Hit flash: brighten via emissive overlay on a cloned material.
      const curMat = em.root.material;
      if (e.hitFlash > 0) {
        if (curMat === em.baseMat) {
          const flash = em.baseMat.clone(`${em.baseMat.name}_flash`);
          flash.emissiveColor = flash.diffuseColor.scale(1.6);
          em.root.material = flash;
        }
      } else if (curMat !== em.baseMat && curMat !== null) {
        curMat.dispose();
        em.root.material = em.baseMat;
      }
    }
    for (const [id, em] of this.enemies) {
      if (!seen.has(id)) {
        const curMat = em.root.material;
        if (curMat !== em.baseMat && curMat !== null) curMat.dispose();
        em.root.dispose();
        this.enemies.delete(id);
      }
    }

    // ── Projectiles (pooled) ───────────────────────────────────────────
    let ti = 0;
    for (const p of combat.projectiles) {
      let m = this.tracers[ti];
      if (!m) {
        m = MeshBuilder.CreateSphere(`tracer${ti}`, { diameter: 0.28, segments: 6 }, this.scene);
        m.isPickable = false;
        this.tracers.push(m);
      }
      m.setEnabled(true);
      m.material = p.fromPlayer ? this.tracerPlayerMat : this.tracerEnemyMat;
      m.position.set(p.x, p.y, p.z);
      ti++;
    }
    for (; ti < this.tracers.length; ti++) this.tracers[ti]!.setEnabled(false);

    // ── Aim-assist target ring ─────────────────────────────────────────
    const assist = combat.assistEnemyId !== null
      ? combat.enemies.find((e) => e.id === combat.assistEnemyId && e.alive)
      : undefined;
    if (assist) {
      this.assistRing.setEnabled(true);
      const rr = (assist.def.radius ?? 0.8) + 0.9;
      this.assistRing.scaling.set(rr, rr, 1); // torus radius 1 → ring radius rr
      this.assistRing.position.set(assist.x, assist.y + 0.3, assist.z);
      // Gentle alpha pulse so it reads as "live lock", not decoration.
      this.assistRingMat.alpha = 0.35 + 0.15 * Math.sin(time * 6);
    } else {
      this.assistRing.setEnabled(false);
    }

    // ── Drops ──────────────────────────────────────────────────────────
    const seenDrops = new Set<number>();
    for (const d of combat.drops) {
      seenDrops.add(d.id);
      let m = this.dropMeshes.get(d.id);
      if (!m) {
        m = MeshBuilder.CreatePolyhedron(`drop${d.id}`, { type: 1, size: 0.22 }, this.scene); // octahedron
        m.material = d.kind === 'credit' ? this.creditMat : this.scrapMat;
        m.isPickable = false;
        this.dropMeshes.set(d.id, m);
      }
      m.setEnabled(true);
      const bob = 0.25 + Math.sin(time * 3 + d.born) * 0.12;
      m.position.set(d.x, d.y + bob, d.z);
      m.rotation.y = time * 2 + d.born;
    }
    for (const [id, m] of this.dropMeshes) {
      if (!seenDrops.has(id)) {
        m.dispose();
        this.dropMeshes.delete(id);
      }
    }
  }
}
