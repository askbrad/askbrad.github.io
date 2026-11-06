/**
 * Mission objectives (M5): "3 relays in any order + clear N hostiles + extract"
 * (plan §11.3, with lots of enemies spread around). Relays channel like
 * terminals (hold E nearby); extraction only arms once objectives are done.
 * Pure TS.
 */

import { CITY } from './city/city';
import type { Intent } from './types';

export const KILLS_REQUIRED = 10;
export const RELAY_CHANNEL_TIME = 2.5; // seconds of E near the relay
export const RELAY_RANGE = 3.5;

export interface RelayState {
  id: string;
  x: number;
  z: number;
  active: boolean;
  /** Channel progress [0, 1). */
  progress: number;
}

export interface MissionState {
  relays: RelayState[];
  killsRequired: number;
  extractUnlocked: boolean;
  /** Mission clock (sim seconds since deployment). */
  timer: number;
  /** Set when objectives complete — extraction armed, HUD celebrates. */
  completed: boolean;
}

export function createMission(): MissionState {
  return {
    relays: (CITY.relays ?? []).map((r) => ({ id: r.id, x: r.x, z: r.z, active: false, progress: 0 })),
    killsRequired: KILLS_REQUIRED,
    extractUnlocked: false,
    timer: 0,
    completed: false,
  };
}

export function objectivesComplete(mission: MissionState, kills: number): boolean {
  return mission.relays.every((r) => r.active) && kills >= mission.killsRequired;
}

/** Per-step objective update. E-channel relays; arms extraction when done. */
export function stepMission(
  mission: MissionState,
  player: { x: number; y: number; z: number },
  intent: Intent,
  dt: number,
  kills: number,
): void {
  mission.timer += dt;

  for (const relay of mission.relays) {
    if (relay.active) continue;
    const d = Math.hypot(relay.x - player.x, relay.z - player.z);
    if (d <= RELAY_RANGE && Math.abs(player.y - 14) < 4 && intent.interactHeld) {
      relay.progress += dt / RELAY_CHANNEL_TIME;
      if (relay.progress >= 1) {
        relay.progress = 0;
        relay.active = true;
      }
    } else if (relay.progress > 0) {
      relay.progress = Math.max(0, relay.progress - dt * 0.5); // decays when you walk away
    }
  }

  if (!mission.completed && objectivesComplete(mission, kills)) {
    mission.completed = true;
    mission.extractUnlocked = true;
  }
}

/** Human-readable objective lines for the HUD. */
export function objectiveLines(mission: MissionState, kills: number): string[] {
  const relays = mission.relays.filter((r) => r.active).length;
  const lines = [
    `RELAYS ${relays}/${mission.relays.length}`,
    `HOSTILES ${Math.min(kills, mission.killsRequired)}/${mission.killsRequired}`,
  ];
  if (mission.completed) lines.unshift('★ EXTRACT AT THE DEPLOY TRAM (beacon of light)');
  return lines;
}
