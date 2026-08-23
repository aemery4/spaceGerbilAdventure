// ════════════════════════════════════════════════════════════════
// js/p6-data.js — Planet 6: Volcano Magmara (fire world)
//
// Generated volcanic arena: open charred floor with lava pools (damage),
// obsidian boulders (solid), drifting ash (slows), and glowing vents.
// The Magma Titan waits in the central caldera. Wandering magma golems
// and fire salamanders are scattered by the engine's sprinkleExtras;
// fuel is topped up by ensureFuel, so the data here stays light.
//
// Coord conventions (see engine3d.js): resources use GRID tiles {x,y};
// the boss uses PIXELS {x: col*TILE, y: row*TILE}.
// ════════════════════════════════════════════════════════════════

function buildP6Data(TILE, COLS, ROWS) {
  COLS = COLS || 48; ROWS = ROWS || 28;
  const map = [];
  for (let z = 0; z < ROWS; z++) {
    const row = [];
    for (let x = 0; x < COLS; x++) row.push((x === 0 || x === COLS - 1 || z === 0 || z === ROWS - 1) ? 1 : 0);
    map.push(row);
  }
  const bcx = Math.floor(COLS * 0.5), bcz = Math.floor(ROWS * 0.5); // boss caldera
  const nearSpawn = (x, z) => Math.abs(x - 2) < 4 && Math.abs(z - 2) < 4;
  const nearBoss = (x, z) => Math.abs(x - bcx) < 5 && Math.abs(z - bcz) < 5;
  const rand = (n) => Math.floor(Math.random() * n);
  // only overwrite open floor away from spawn + boss arena
  const set = (x, z, v) => { if (x > 0 && z > 0 && x < COLS - 1 && z < ROWS - 1 && map[z][x] === 0 && !nearSpawn(x, z) && !nearBoss(x, z)) map[z][x] = v; };

  // lava pools (damage)
  for (let i = 0; i < 11; i++) {
    const px = 2 + rand(COLS - 5), pz = 2 + rand(ROWS - 5), w = 2 + rand(3), h = 2 + rand(2);
    for (let dz = 0; dz < h; dz++) for (let dx = 0; dx < w; dx++) set(px + dx, pz + dz, 8);
  }
  // obsidian boulders (solid)
  for (let i = 0; i < 42; i++) set(2 + rand(COLS - 4), 2 + rand(ROWS - 4), 3);
  // ash drifts (slow)
  for (let i = 0; i < 22; i++) { const px = 2 + rand(COLS - 4), pz = 2 + rand(ROWS - 4); for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) set(px + dx, pz + dz, 2); }
  // glowing vents (walkable deco)
  for (let i = 0; i < 9; i++) set(2 + rand(COLS - 4), 2 + rand(ROWS - 4), 9);

  // a ring of vents around the boss caldera for drama (walkable)
  for (let a = 0; a < 8; a++) { const vx = bcx + Math.round(Math.cos(a / 8 * Math.PI * 2) * 4), vz = bcz + Math.round(Math.sin(a / 8 * Math.PI * 2) * 4); if (map[vz] && map[vz][vx] === 0) map[vz][vx] = 9; }

  // Resources (grid coords). ensureFuel/sprinkleExtras add plenty more.
  const resources = [];
  let placed = 0, guard = 0;
  while (placed < 16 && guard++ < 500) {
    const x = 2 + rand(COLS - 4), z = 2 + rand(ROWS - 4);
    if (map[z][x] !== 0 || nearBoss(x, z)) continue;
    const roll = Math.random();
    const type = roll < 0.6 ? 'fuel' : roll < 0.78 ? 'rock' : roll < 0.92 ? 'crystal' : 'plant';
    const hp = type === 'rock' ? 3 : type === 'fuel' ? 1 : 2;
    resources.push({ x, y: z, type, label: type === 'fuel' ? '⚡' : type === 'rock' ? '🪨' : type === 'crystal' ? '💎' : '🌿', color: type === 'fuel' ? '#ff0' : '#f96', hp, maxhp: hp });
    placed++;
  }

  // Magma Titan boss (pixel coords)
  const magma = { x: bcx * TILE, y: bcz * TILE, hp: 85, maxhp: 85, size: 36 };

  return { map, resources, magma };
}
