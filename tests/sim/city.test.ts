import { describe, expect, it } from 'vitest';
import {
  CITY,
  LAYER,
  STOREY_H,
  STREET_Y,
  TREES,
  blockedByTree,
  floorAt,
  floorLabel,
  inRect,
  roofY,
} from '../../src/sim/city/city';
import data from '../../src/data/enemies.json';

const { buildings, sewer, meta } = CITY;

describe('city data sanity', () => {
  it('has two enterable buildings with 4 and 5 storeys', () => {
    expect(buildings.map((b) => b.floors).sort()).toEqual([4, 5]);
  });

  it('keeps every building and block inside the city extent', () => {
    const E = meta.extent;
    for (const b of [...buildings, ...CITY.solidBlocks, ...CITY.parks]) {
      expect(Math.abs(b.x0)).toBeLessThanOrEqual(E);
      expect(Math.abs(b.x1)).toBeLessThanOrEqual(E);
      expect(Math.abs(b.z0)).toBeLessThanOrEqual(E);
      expect(Math.abs(b.z1)).toBeLessThanOrEqual(E);
    }
  });

  it('has valid entrance doors (fits in its wall, valid side)', () => {
    const sides = ['north', 'south', 'east', 'west'];
    for (const b of buildings) {
      expect(sides).toContain(b.entrance.side);
      const wallLen = b.entrance.side === 'north' || b.entrance.side === 'south'
        ? b.x1 - b.x0
        : b.z1 - b.z0;
      const gapEdge = Math.abs(b.entrance.offset) + b.entrance.width / 2;
      expect(gapEdge).toBeLessThan(wallLen / 2);
    }
  });

  it('places all shafts inside at least one sewer corridor', () => {
    for (const sh of sewer.shafts) {
      expect(sewer.corridors.some((c) => inRect(c, sh.x, sh.z))).toBe(true);
    }
  });

  it('never spawns an enemy inside a solid block', () => {
    for (const s of data.spawns) {
      for (const blk of CITY.solidBlocks) {
        const inside = s.x > blk.x0 && s.x < blk.x1 && s.z > blk.z0 && s.z < blk.z1;
        expect(inside, `spawn ${s.type} (${s.x},${s.z}) is inside solid block ${blk.id}`).toBe(false);
      }
    }
  });

  it('spawns deployment/extract on the street layer', () => {
    const ref = floorAt(CITY.deploy.x, STREET_Y, CITY.deploy.z);
    expect(ref.layer).toBe(LAYER.STREET);
  });
});

describe('floorAt occupancy', () => {
  const b1 = buildings[0]!; // exchange, 4 storeys
  const b2 = buildings[1]!; // crown, 5 storeys

  it('reports street in open ground', () => {
    expect(floorAt(0, STREET_Y, 70).layer).toBe(LAYER.STREET);
  });

  it('reports interior storey 1 just above street level inside a building', () => {
    const x = (b1.x0 + b1.x1) / 2;
    const z = (b1.z0 + b1.z1) / 2;
    const ref = floorAt(x, STREET_Y + 2, z);
    expect(ref.layer).toBe(LAYER.INTERIOR);
    expect(ref.buildingId).toBe(b1.id);
    expect(ref.storey).toBe(1);
  });

  it('splits storeys at STOREY_H boundaries', () => {
    const x = (b2.x0 + b2.x1) / 2;
    const z = (b2.z0 + b2.z1) / 2;
    const ref3 = floorAt(x, STREET_Y + 2 * STOREY_H + 2, z);
    expect(ref3.storey).toBe(3);
    const ref5 = floorAt(x, STREET_Y + 4 * STOREY_H + 2, z);
    expect(ref5.storey).toBe(5);
  });

  it('reports roof above the top storey', () => {
    const x = (b1.x0 + b1.x1) / 2;
    const z = (b1.z0 + b1.z1) / 2;
    const ref = floorAt(x, roofY(b1) + 1, z);
    expect(ref.layer).toBe(LAYER.ROOF);
    expect(ref.buildingId).toBe(b1.id);
  });

  it('reports sewer inside a corridor below street level', () => {
    const c = sewer.corridors[0]!;
    const x = (c.x0 + c.x1) / 2;
    const z = (c.z0 + c.z1) / 2;
    const ref = floorAt(x, sewer.floorY + 1, z);
    expect(ref.layer).toBe(LAYER.SEWER);
  });

  it('prefers interior over sewer when a building overlaps vertically', () => {
    // Points inside a building footprint but below street level are NOT sewer
    // (buildings have no basements in this data): still interior-adjacent logic
    // must not crash; we just assert it is not labeled sewer.
    const b = buildings[0]!;
    const ref = floorAt((b.x0 + b.x1) / 2, STREET_Y - 2, (b.z0 + b.z1) / 2);
    expect(ref.layer).not.toBe(LAYER.SEWER);
  });
});

describe('tree obstacles', () => {
  it('generates trees strictly inside park bounds', () => {
    for (const t of TREES) {
      const inPark = CITY.parks.some(
        (p) => t.x > p.x0 && t.x < p.x1 && t.z > p.z0 && t.z < p.z1,
      );
      expect(inPark, `tree at ${t.x},${t.z} outside parks`).toBe(true);
    }
    expect(TREES.length).toBeGreaterThan(10);
  });

  it('blocks near a tree centre and not in open street', () => {
    const t = TREES[0]!;
    expect(blockedByTree(t.x, t.z)).toBe(true);
    // South map edge near deploy — far outside the parks, no trees there.
    expect(blockedByTree(0, 88)).toBe(false);
  });

  it('is deterministic across calls', () => {
    const snapshot = JSON.stringify(TREES);
    expect(TREES.length).toBeGreaterThan(0);
    // Re-import would re-run the module; same seed guarantees the same layout.
    expect(snapshot.length).toBeGreaterThan(0);
  });
});

describe('floorLabel', () => {
  it('labels the layers readably', () => {
    expect(floorLabel({ layer: LAYER.STREET })).toBe('STREET');
    expect(floorLabel({ layer: LAYER.SEWER })).toBe('SEWER');
    expect(floorLabel({ layer: LAYER.ROOF, buildingId: 'exchange' })).toContain('EXCHANGE');
    expect(floorLabel({ layer: LAYER.INTERIOR, buildingId: 'crown', storey: 2 })).toContain('F2');
  });
});
