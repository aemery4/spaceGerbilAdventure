// ════════════════════════════════════════
// js/p4-data.js — Planet 4 Data Layer
// Aquatic Planet Neptuna — map, resources, enemies
// Tile types: 0=water, 1=rock wall, 2=trench, 3=coral, 4=kelp, 5=sand, 6=thermal vent, 7=shipwreck
// ════════════════════════════════════════

function buildP4Data(TILE, COLS, ROWS) {
  // Hand-crafted underwater map with varied terrain
  const map = [];
  for (let r = 0; r < ROWS; r++) {
    map[r] = [];
    for (let c = 0; c < COLS; c++) {
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
        map[r][c] = 1; // rock walls (border)
      } else {
        map[r][c] = 0; // default: open water
      }
    }
  }

  // Coral reef clusters — colorful obstacles
  // North reef
  for (let r = 5; r < 10; r++) for (let c = 10; c < 18; c++) {
    if ((r + c) % 3 !== 0) map[r][c] = 3;
    else map[r][c] = 0; // gaps for swimming through
  }
  // South-east reef
  for (let r = 16; r < 22; r++) for (let c = 28; c < 36; c++) {
    if ((r * 2 + c) % 4 !== 0) map[r][c] = 3;
  }
  // Small reef patch near spawn
  map[3][5] = 3; map[3][6] = 3; map[4][5] = 3;

  // Deep trench — dangerous dark area
  for (let r = 20; r < 26; r++) for (let c = 5; c < 14; c++) {
    map[r][c] = 2;
  }
  // Trench extension
  map[19][8] = 2; map[19][9] = 2; map[19][10] = 2;

  // Kelp forests — slow movement, cover
  for (let r = 10; r < 15; r++) for (let c = 3; c < 7; c++) map[r][c] = 4;
  for (let r = 14; r < 18; r++) for (let c = 38; c < 43; c++) map[r][c] = 4;
  // Scattered kelp
  map[8][22] = 4; map[8][23] = 4; map[9][22] = 4;
  map[17][20] = 4; map[17][21] = 4;

  // Sandy patches — floor detail
  for (let r = 2; r < 5; r++) for (let c = 2; c < 6; c++) map[r][c] = 5;
  for (let r = 24; r < 27; r++) for (let c = 38; c < 46; c++) map[r][c] = 5;
  for (let r = 12; r < 15; r++) for (let c = 20; c < 26; c++) map[r][c] = 5;

  // Thermal vents — rare hazards
  map[22][10] = 6; map[23][8] = 6;
  map[14][42] = 6; map[25][40] = 6;

  // Shipwreck area — exploration zone
  for (let r = 3; r < 7; r++) for (let c = 35; c < 42; c++) {
    if ((r + c) % 2 === 0) map[r][c] = 7;
  }

  // Boss arena — clear sandy area in center
  for (let r = 12; r < 17; r++) for (let c = 22; c < 28; c++) {
    map[r][c] = 5;
  }

  // Resources scattered around the ocean floor
  const resources = [
    { type: 'crystal', x: 5 * TILE + 13, y: 8 * TILE + 13, collected: false, hp: 2, maxhp: 2 },
    { type: 'plant', x: 12 * TILE + 13, y: 15 * TILE + 13, collected: false, hp: 2, maxhp: 2 },
    { type: 'rock', x: 20 * TILE + 13, y: 6 * TILE + 13, collected: false, hp: 2, maxhp: 2 },
    { type: 'fuel', x: 35 * TILE + 13, y: 18 * TILE + 13, collected: false, hp: 1, maxhp: 1 },
    { type: 'crystal', x: 8 * TILE + 13, y: 22 * TILE + 13, collected: false, hp: 2, maxhp: 2 },
    { type: 'plant', x: 25 * TILE + 13, y: 12 * TILE + 13, collected: false, hp: 2, maxhp: 2 },
    { type: 'rock', x: 40 * TILE + 13, y: 8 * TILE + 13, collected: false, hp: 2, maxhp: 2 },
    { type: 'fuel', x: 15 * TILE + 13, y: 25 * TILE + 13, collected: false, hp: 1, maxhp: 1 },
    { type: 'crystal', x: 30 * TILE + 13, y: 4 * TILE + 13, collected: false, hp: 2, maxhp: 2 },
    { type: 'plant', x: 42 * TILE + 13, y: 20 * TILE + 13, collected: false, hp: 2, maxhp: 2 },
    { type: 'rock', x: 10 * TILE + 13, y: 18 * TILE + 13, collected: false, hp: 2, maxhp: 2 },
    { type: 'fuel', x: 38 * TILE + 13, y: 5 * TILE + 13, collected: false, hp: 1, maxhp: 1 },
  ];

  // Underwater enemies: squids, piranhas, and the evil octopus boss
  const enemies = [
    // Squids — patrol in pairs
    { x: 8 * TILE + 13, y: 6 * TILE + 13, hp: 4, maxHp: 4, speed: 1.8, type: 'squid', aggro: false, dx: 0.8, dy: 0.4, size: 12 },
    { x: 15 * TILE + 13, y: 10 * TILE + 13, hp: 4, maxHp: 4, speed: 1.8, type: 'squid', aggro: false, dx: -0.6, dy: 0.7, size: 12 },
    { x: 30 * TILE + 13, y: 14 * TILE + 13, hp: 4, maxHp: 4, speed: 1.8, type: 'squid', aggro: false, dx: 0.5, dy: -0.6, size: 12 },
    { x: 22 * TILE + 13, y: 20 * TILE + 13, hp: 4, maxHp: 4, speed: 1.8, type: 'squid', aggro: false, dx: -0.7, dy: 0.5, size: 12 },
    { x: 40 * TILE + 13, y: 10 * TILE + 13, hp: 4, maxHp: 4, speed: 1.8, type: 'squid', aggro: false, dx: 0.4, dy: -0.8, size: 12 },

    // Piranhas — faster, more aggressive
    { x: 18 * TILE + 13, y: 8 * TILE + 13, hp: 5, maxHp: 5, speed: 2.8, type: 'piranha', aggro: false, dx: 1.2, dy: 0.3, size: 10 },
    { x: 28 * TILE + 13, y: 16 * TILE + 13, hp: 5, maxHp: 5, speed: 2.8, type: 'piranha', aggro: false, dx: -1.0, dy: 0.8, size: 10 },
    { x: 12 * TILE + 13, y: 22 * TILE + 13, hp: 5, maxHp: 5, speed: 2.8, type: 'piranha', aggro: false, dx: 0.9, dy: -0.6, size: 10 },
    { x: 36 * TILE + 13, y: 22 * TILE + 13, hp: 5, maxHp: 5, speed: 2.8, type: 'piranha', aggro: false, dx: -0.7, dy: -0.9, size: 10 },

    // Evil Octopus Boss — center of map
    { x: 25 * TILE + 13, y: 14 * TILE + 13, hp: 20, maxHp: 20, speed: 1.2, type: 'octopus', aggro: false, dx: 0, dy: 0, size: 22, lastAttack: 0 },
  ];

  // Helpful seahorses (NPCs)
  const SEAHORSES = [
    {
      id: 'seahorse1', name: 'Coral', emoji: '🐴', color: '#FF6B9D',
      x: 4 * TILE + 13, y: 3 * TILE + 13,
      dialog: 'Welcome to Neptuna! Beware the evil octopus lurking in the center. Use Space to attack nearby enemies or gather resources!',
      interacted: false
    },
    {
      id: 'seahorse2', name: 'Finn', emoji: '🐴', color: '#4ECDC4',
      x: 42 * TILE + 13, y: 24 * TILE + 13,
      dialog: 'The octopus has many tentacles! Stay mobile and strike when you can. Watch out for piranhas — they are fast!',
      interacted: false
    },
  ];

  return { map, resources, enemies, SEAHORSES };
}
