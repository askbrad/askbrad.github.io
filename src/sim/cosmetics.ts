/**
 * Armour cosmetics state (M6): per-part variant choice + main/accent paint.
 * Pure data — the render layer translates this into materials/meshes.
 * Persisted inside the save (optional field, additive to v1).
 */

import data from '../data/cosmetics.json';

export type PartId = 'head' | 'chest' | 'arms' | 'legs';

export interface PartCosmeticsDef {
  variants: [string, string]; // exactly two visual options per part (plan §6)
  defaultVariant: 0 | 1;
  defaultMain: string;
  defaultAccent: string;
}

export const COSMETIC_PARTS = data.parts as unknown as Record<PartId, PartCosmeticsDef>;
export const PART_IDS = Object.keys(COSMETIC_PARTS) as PartId[];

export interface PartCosmetics {
  variant: 0 | 1;
  main: string;
  accent: string;
}

export type Cosmetics = Record<PartId, PartCosmetics>;

export function createCosmetics(): Cosmetics {
  const out = {} as Cosmetics;
  for (const part of PART_IDS) {
    const def = COSMETIC_PARTS[part]!;
    out[part] = { variant: def.defaultVariant, main: def.defaultMain, accent: def.defaultAccent };
  }
  return out;
}

/** Cycle to the other visual variant of a part (2 options per part). */
export function toggleVariant(cos: Cosmetics, part: PartId): void {
  const def = COSMETIC_PARTS[part]!;
  cos[part].variant = (((cos[part].variant as number) + 1) % def.variants.length) as 0 | 1;
}

export function setMain(cos: Cosmetics, part: PartId, hex: string): void {
  cos[part].main = hex;
}

export function setAccent(cos: Cosmetics, part: PartId, hex: string): void {
  cos[part].accent = hex;
}

/** Variant display name (UI). */
export function variantName(part: PartId, variant: number): string {
  return COSMETIC_PARTS[part]!.variants[variant] ?? '?';
}

/** Serialize for the save file. */
export function serializeCosmetics(cos: Cosmetics): Record<string, PartCosmetics> {
  const out: Record<string, PartCosmetics> = {};
  for (const part of PART_IDS) out[part] = { ...cos[part]! };
  return out;
}

/** Apply save data (partial tolerated — unknown/missing parts keep defaults). */
export function applyCosmeticsData(cos: Cosmetics, raw: unknown): void {
  if (!raw || typeof raw !== 'object') return;
  for (const part of PART_IDS) {
    const v = (raw as Record<string, Partial<PartCosmetics>>)[part];
    if (!v) continue;
    if (v.variant === 0 || v.variant === 1) cos[part].variant = v.variant;
    if (typeof v.main === 'string' && /^#[0-9a-f]{6}$/i.test(v.main)) cos[part].main = v.main;
    if (typeof v.accent === 'string' && /^#[0-9a-f]{6}$/i.test(v.accent)) cos[part].accent = v.accent;
  }
}
