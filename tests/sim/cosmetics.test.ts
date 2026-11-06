import { describe, expect, it } from 'vitest';
import {
  applyCosmeticsData,
  createCosmetics,
  serializeCosmetics,
  setAccent,
  setMain,
  toggleVariant,
  variantName,
} from '../../src/sim/cosmetics';
import { createPersistence, memoryStorage } from '../../src/save/persistence';

describe('cosmetics (M6)', () => {
  it('defaults: 4 parts × 2 variants, valid hex colours', () => {
    const cos = createCosmetics();
    for (const part of ['head', 'chest', 'arms', 'legs'] as const) {
      expect([0, 1]).toContain(cos[part]!.variant);
      expect(cos[part]!.main).toMatch(/^#[0-9a-f]{6}$/i);
      expect(cos[part]!.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(variantName(part, 0)).toBeTruthy();
      expect(variantName(part, 1)).toBeTruthy();
    }
  });

  it('toggleVariant cycles between exactly two options', () => {
    const cos = createCosmetics();
    const before = cos.head!.variant;
    toggleVariant(cos, 'head');
    expect(cos.head!.variant).toBe((before + 1) % 2);
    toggleVariant(cos, 'head');
    expect(cos.head!.variant).toBe(before); // wraps
  });

  it('setters only accept through typed paths', () => {
    const cos = createCosmetics();
    setMain(cos, 'chest', '#ff0000');
    setAccent(cos, 'legs', '#00ff00');
    expect(cos.chest!.main).toBe('#ff0000');
    expect(cos.legs!.accent).toBe('#00ff00');
  });

  it('serialize → apply round-trips', () => {
    const cos = createCosmetics();
    toggleVariant(cos, 'arms');
    setMain(cos, 'head', '#123456');
    const raw = serializeCosmetics(cos);
    const fresh = createCosmetics();
    applyCosmeticsData(fresh, raw);
    expect(fresh).toEqual(cos);
  });

  it('applyCosmeticsData tolerates garbage and keeps defaults', () => {
    const cos = createCosmetics();
    const before = cos.chest!.main;
    applyCosmeticsData(cos, { chest: { main: 'not-a-colour' }, bogus: 42, head: null });
    expect(cos.chest!.main).toBe(before);
  });

  it('persists through the save file', () => {
    const store = memoryStorage();
    const p = createPersistence(store);
    const cos = createCosmetics();
    toggleVariant(cos, 'legs');
    setAccent(cos, 'head', '#abcdef');
    p.save({
      version: 1, credits: 5, scrap: 0, deaths: 0, mode: 'STANDARD',
      toggles: { freePurchases: false, infiniteEnergy: false },
      modules: [],
      cosmetics: serializeCosmetics(cos),
    });
    const loaded = p.load()!;
    const restored = createCosmetics();
    applyCosmeticsData(restored, loaded.cosmetics);
    expect(restored.legs!.variant).toBe(cos.legs!.variant);
    expect(restored.head!.accent).toBe('#abcdef');
  });
});
