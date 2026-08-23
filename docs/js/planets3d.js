// ════════════════════════════════════════
// js/planets3d.js — Per-planet 3D theme table
// Maps the existing 2D data layers (pN-data.js) into 3D worlds.
// The engine (engine3d.js) reads these descriptors; the maps,
// resources and enemies themselves come straight from buildPNData().
// ════════════════════════════════════════

// Tile ids that block movement, slow it, or hurt, per planet.
// (Derived from the tile keys documented in each pN-data.js.)
const PLANETS_3D = {
  1: {
    name: 'Earth — Area 51', emoji: '🌍', tile: 40, cols: 32, rows: 22,
    build: (T, C, R) => buildP1Data(T, C, R),
    enemyKeys: ['aliens'],
    solid: [1, 3], slow: [], damage: [],
    fuelTarget: 10,
    spawn: { tx: 3, tz: 3 },
    sky: 0x0a1020, fog: [0x0a1020, 14, 40],
    ground: 0x2e402e, grid: 0x3d5a3d,
    wall: { color: 0x5a5a66, h: 2.2 },
    // decoration tiles → mesh spec
    deco: { 2: { kind: 'rock', color: 0x777782, h: 0.8 } },
    ambient: 0x556070, sun: 0xfff2d0, sunPos: [8, 16, 6],
    enemyKind: 'alien'
  },
  2: {
    name: 'Jungle — Zorbax', emoji: '🌴', tile: 26, cols: 48, rows: 28,
    build: (T, C, R) => buildP2Data(T, C, R),
    enemyKeys: ['monkeys', 'golems', 'lizards', 'panthers', 'parrots', 'miniBoss'],
    solid: [1, 3], slow: [2, 6], damage: [8],
    fuelTarget: 15,
    spawn: { tx: 2, tz: 2 },
    sky: 0x06170a, fog: [0x06170a, 16, 46],
    ground: 0x1f3d1c, grid: 0x2f5a29,
    wall: { color: 0x2b3a22, h: 2.4 },
    deco: {
      2: { kind: 'bush', color: 0x2f7a34, h: 0.7 },
      3: { kind: 'tree', color: 0x3a2a18, h: 3.0 },
      4: { kind: 'vine', color: 0x4fb24f, h: 1.4 },
      6: { kind: 'swamp', color: 0x2a3a2a, h: 0.05 },
      8: { kind: 'lava', color: 0xff5522, h: 0.05 },
      9: { kind: 'floor', color: 0x3a3630, h: 0.05 },
      7: { kind: 'floor', color: 0x5a4a30, h: 0.05 }
    },
    ambient: 0x25502a, sun: 0xd8ffb0, sunPos: [6, 14, 4],
    enemyKind: 'beast', village: true
  },
  3: {
    name: 'Tundra Frigia', emoji: '❄️', tile: 26, cols: 48, rows: 28,
    build: (T, C, R) => buildP3Data(T, C, R),
    enemyKeys: ['tigers', 'mammoths', 'yeti'],
    solid: [1, 3], slow: [2], damage: [8],
    fuelTarget: 20,
    spawn: { tx: 2, tz: 2 },
    sky: 0x1a2838, fog: [0xbcd0e0, 10, 40],
    ground: 0xdfeaf4, grid: 0xafc4dd,
    wall: { color: 0x9fc4e6, h: 2.4 },
    deco: {
      2: { kind: 'snow', color: 0xeef6ff, h: 0.25 },
      3: { kind: 'tree', color: 0xd6e8f5, h: 2.8 },
      6: { kind: 'ice', color: 0x8fd0ff, h: 0.05 },
      9: { kind: 'rock', color: 0x8899aa, h: 1.0 },
      7: { kind: 'floor', color: 0xcfe0ee, h: 0.05 }
    },
    ambient: 0x8aa0b8, sun: 0xffffff, sunPos: [4, 16, 8],
    enemyKind: 'beast', village: true, campStyle: 'snow'
  },
  4: {
    name: 'Aquatic Neptuna', emoji: '🌊', tile: 26, cols: 48, rows: 28,
    build: (T, C, R) => buildP4Data(T, C, R),
    enemyKeys: ['enemies'],
    solid: [1], slow: [4], damage: [6],
    fuelTarget: 25,
    spawn: { tx: 2, tz: 2 },
    sky: 0x03243a, fog: [0x05304d, 8, 34],
    ground: 0x0a4a63, grid: 0x0f6a8a,
    wall: { color: 0x0b3245, h: 2.2 },
    deco: {
      2: { kind: 'trench', color: 0x021826, h: 0.02 },
      3: { kind: 'coral', color: 0xff6f8a, h: 1.2 },
      4: { kind: 'kelp', color: 0x2f9a5a, h: 2.2 },
      5: { kind: 'sand', color: 0xcbb887, h: 0.05 },
      6: { kind: 'vent', color: 0xff7733, h: 0.4 },
      7: { kind: 'wreck', color: 0x5a4a3a, h: 0.9 }
    },
    ambient: 0x2a6a88, sun: 0x9fe8ff, sunPos: [2, 14, 5],
    enemyKind: 'fish', underwater: true
  },
  5: {
    name: 'Home Planet', emoji: '🏠', tile: 40, cols: 32, rows: 22,
    build: (T, C, R) => buildP5Data(T, C, R),
    enemyKeys: [],
    solid: [1, 5], slow: [], damage: [],
    fuelTarget: 0, // peaceful hub — no exit gate
    spawn: { tx: 5, tz: 6 },
    sky: 0x101830, fog: [0x101830, 18, 50],
    ground: 0x2c6a2c, grid: 0x3f8a3f,
    wall: { color: 0x7a5a3a, h: 1.6 },
    deco: {
      2: { kind: 'path', color: 0xbfa46a, h: 0.03 },
      3: { kind: 'pond', color: 0x2a6acc, h: 0.05 },
      4: { kind: 'garden', color: 0xd24aa0, h: 0.4 },
      5: { kind: 'building', color: 0xcaa06a, h: 1.6 }
    },
    ambient: 0x5566aa, sun: 0xfff0c0, sunPos: [6, 16, 6],
    enemyKind: 'none', home: true
  },
  6: {
    name: 'Volcano Magmara', emoji: '🌋', tile: 26, cols: 48, rows: 28,
    build: (T, C, R) => buildP6Data(T, C, R),
    enemyKeys: ['golems', 'lizards', 'magma'],
    enemyColors: { golems: 0xc0401a, lizards: 0xff8a3a }, // magma golems + fire salamanders
    solid: [1, 3], slow: [2], damage: [8],
    fuelTarget: 30,
    spawn: { tx: 2, tz: 2 },
    sky: 0x1c0705, fog: [0x2a0a04, 12, 42],
    ground: 0x3a1712, grid: 0x6a2a14,
    wall: { color: 0x241018, h: 2.4 },
    deco: {
      2: { kind: 'ash',  color: 0x2a2420, h: 0.05 },
      3: { kind: 'rock', color: 0x3a201a, h: 1.0 },
      8: { kind: 'lava', color: 0xff5a1e, h: 0.05 },
      9: { kind: 'vent', color: 0xff7a2a, h: 0.5 }
    },
    ambient: 0x6a2a1a, sun: 0xffb060, sunPos: [6, 14, 5],
    enemyKind: 'beast'
  }
};
