/**
 * Render-side projection of the sim player: a placeholder capsule with a
 * facing tick, plus a blob shadow projected onto the highest collision
 * surface below — height and landing points read clearly during jumps
 * (plan §10). M4 replaces the capsule with the full armour rig.
 */

import { Mesh, MeshBuilder, Scene, StandardMaterial, Color3, Vector3 } from '@babylonjs/core';
import type { PlayerState } from '../sim/types';

export class PlayerView {
  readonly root: Mesh;
  private readonly shadow: Mesh;
  private readonly shadowMat: StandardMaterial;

  constructor(scene: Scene) {
    this.root = MeshBuilder.CreateCapsule('player', { height: 1.9, radius: 0.45 }, scene);
    const mat = new StandardMaterial('playerMat', scene);
    mat.diffuseColor = new Color3(0.35, 0.75, 0.95);
    mat.specularColor = new Color3(0.2, 0.2, 0.2);
    this.root.material = mat;

    // Facing tick so orbit direction is readable.
    const tick = MeshBuilder.CreateBox('playerTick', { width: 0.24, height: 0.24, depth: 0.6 }, scene);
    tick.parent = this.root;
    tick.position.z = 0.5;
    const tickMat = new StandardMaterial('playerTickMat', scene);
    tickMat.diffuseColor = new Color3(0.95, 0.75, 0.2);
    tickMat.emissiveColor = new Color3(0.4, 0.3, 0.05);
    tick.material = tickMat;

    // Blob shadow.
    this.shadow = MeshBuilder.CreateDisc('playerShadow', { radius: 0.55, tessellation: 24 }, scene);
    this.shadow.rotation.x = Math.PI / 2;
    this.shadowMat = new StandardMaterial('playerShadowMat', scene);
    this.shadowMat.diffuseColor = Color3.Black();
    this.shadowMat.emissiveColor = Color3.Black();
    this.shadowMat.specularColor = Color3.Black();
    this.shadowMat.alpha = 0.35;
    this.shadow.material = this.shadowMat;
    this.shadow.isPickable = false;
  }

  /** Copy sim transform into the render mesh. */
  sync(player: PlayerState): void {
    this.root.position.set(player.x, player.y + 0.95, player.z);
    this.root.rotation.y = player.yaw;
  }

  /**
   * Project the blob shadow onto the surface top `topY` below the player.
   * Fades and widens with height; hidden when nothing is below (null).
   */
  updateShadow(x: number, y: number, z: number, topY: number | null): void {
    if (topY === null) {
      this.shadow.setEnabled(false);
      return;
    }
    const h = Math.max(0, y - topY);
    this.shadow.setEnabled(true);
    this.shadow.position.set(x, topY + 0.04, z);
    const grow = 1 + Math.min(1.2, h * 0.04);
    this.shadow.scaling.set(grow, grow, grow);
    this.shadowMat.alpha = Math.max(0.12, 0.38 - h * 0.018);
  }
}

/** Convenience for main.ts — keeps Vector3 usage contained to render code. */
export function playerTarget(player: PlayerState, out: Vector3): Vector3 {
  return out.set(player.x, player.y + 1, player.z);
}
