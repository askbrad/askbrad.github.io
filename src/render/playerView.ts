/**
 * Render-side projection of the sim player: a placeholder capsule with a
 * facing tick. Rotation is applied directly (no interpolation yet — motion is
 * velocity-smooth enough at 60 Hz; add alpha interpolation with M2's jump/flight).
 */

import { Mesh, MeshBuilder, Scene, StandardMaterial, Color3, Vector3 } from '@babylonjs/core';
import type { PlayerState } from '../sim/types';

export class PlayerView {
  readonly root: Mesh;

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
  }

  /** Copy sim transform into the render mesh. */
  sync(player: PlayerState): void {
    this.root.position.set(player.x, player.y + 0.95, player.z);
    this.root.rotation.y = player.yaw;
  }
}

/** Convenience for main.ts — keeps Vector3 usage contained to render code. */
export function playerTarget(player: PlayerState, out: Vector3): Vector3 {
  return out.set(player.x, player.y + 1, player.z);
}
