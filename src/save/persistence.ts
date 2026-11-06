/**
 * Persistence (M5): versioned localStorage saves via an injected Storage
 * (DI for headless tests). Saves bank credits, the build, lab toggles and
 * lifetime stats. Schema migrations stub is ready for v2.
 */

export interface SaveDataV1 {
  version: 1;
  credits: number;
  scrap: number;
  deaths: number;
  mode: string;
  toggles: { freePurchases: boolean; infiniteEnergy: boolean };
  modules: Array<{ branch: string; tier: number; sockets: string[] }>;
  /** M6: optional armour cosmetics (part → variant/paint). */
  cosmetics?: Record<string, { variant: number; main: string; accent: string }>;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const KEY = 'engineer-save-v1';

export function createPersistence(storage: StorageLike) {
  return {
    save(data: SaveDataV1): void {
      storage.setItem(KEY, JSON.stringify(data));
    },
    load(): SaveDataV1 | null {
      const raw = storage.getItem(KEY);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as SaveDataV1;
        if (parsed.version !== 1) return migrate(parsed);
        return parsed;
      } catch {
        return null; // corrupted save — start fresh rather than crash
      }
    },
    clear(): void {
      storage.removeItem(KEY);
    },
  };
}

/** Migration chain: v0/v-unknown → v1 (currently a pass-through stub). */
function migrate(data: unknown): SaveDataV1 | null {
  // Future: if ((data as any).version === 0) …upgrade…
  return data as SaveDataV1;
}

/** In-memory storage for tests. */
export function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}
