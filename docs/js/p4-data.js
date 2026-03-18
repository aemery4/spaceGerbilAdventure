// ════════════════════════════════════════
// js/p4-data.js — Planet 4 Data Layer
// Aquatic Planet Neptuna — map, resources, enemies
// ════════════════════════════════════════

function buildP4Data(TILE, COLS, ROWS) {
  // Underwater map with coral reefs, trenches, and caves
  const map = [];
  for (let r = 0; r < ROWS; r++) {
    map[r] = [];
    for (let c = 0; c < COLS; c++) {
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
        map[r][c] = 1; // walls
      } else if ((r > 5 && r < 10 && c > 10 && c < 20) || (r > 15 && r < 22 && c > 25 && c < 35)) {
        map[r][c] = 3; // coral reefs
      } else if (r > 20 && c > 5 && c < 15) {
        map[r][c] = 2; // deep trench
      } else {
        map[r][c] = 0; // open water
      }
    }
  }

  // Resources scattered around the ocean floor
  const resources = [
    { type: 'crystal', x: 5 * TILE + 13, y: 8 * TILE + 13, collected: false },
    { type: 'plant', x: 12 * TILE + 13, y: 15 * TILE + 13, collected: false },
    { type: 'rock', x: 20 * TILE + 13, y: 6 * TILE + 13, collected: false },
    { type: 'fuel', x: 35 * TILE + 13, y: 18 * TILE + 13, collected: false },
    { type: 'crystal', x: 8 * TILE + 13, y: 22 * TILE + 13, collected: false },
    { type: 'plant', x: 25 * TILE + 13, y: 12 * TILE + 13, collected: false },
    { type: 'rock', x: 40 * TILE + 13, y: 8 * TILE + 13, collected: false },
    { type: 'fuel', x: 15 * TILE + 13, y: 25 * TILE + 13, collected: false },
  ];

  // Underwater enemies: squids, piranhas, and the evil octopus boss
  const enemies = [
    // Small squids
    { x: 8 * TILE + 13, y: 6 * TILE + 13, hp: 2, maxHp: 2, speed: 2, type: 'squid', aggro: false, dir: 0 },
    { x: 15 * TILE + 13, y: 10 * TILE + 13, hp: 2, maxHp: 2, speed: 2, type: 'squid', aggro: false, dir: 0 },
    { x: 30 * TILE + 13, y: 14 * TILE + 13, hp: 2, maxHp: 2, speed: 2, type: 'squid', aggro: false, dir: 0 },
    { x: 22 * TILE + 13, y: 20 * TILE + 13, hp: 2, maxHp: 2, speed: 2, type: 'squid', aggro: false, dir: 0 },

    // Piranhas - faster and more aggressive
    { x: 18 * TILE + 13, y: 8 * TILE + 13, hp: 3, maxHp: 3, speed: 3, type: 'piranha', aggro: false, dir: 0 },
    { x: 28 * TILE + 13, y: 16 * TILE + 13, hp: 3, maxHp: 3, speed: 3, type: 'piranha', aggro: false, dir: 0 },
    { x: 12 * TILE + 13, y: 22 * TILE + 13, hp: 3, maxHp: 3, speed: 3, type: 'piranha', aggro: false, dir: 0 },

    // Evil Octopus Boss - center of map
    { x: 24 * TILE + 13, y: 14 * TILE + 13, hp: 15, maxHp: 15, speed: 1, type: 'octopus', aggro: false, dir: 0, lastAttack: 0 },
  ];

  // Helpful seahorses (NPCs)
  const SEAHORSES = [
    {
      id: 'seahorse1', name: 'Coral the Seahorse', emoji: '🐴', color: '#FF6B9D',
      x: 6 * TILE + 13, y: 4 * TILE + 13,
      dialog: 'Welcome to Neptuna! Beware the evil octopus in the center. The seahorses are here to help!',
      interacted: false
    },
    {
      id: 'seahorse2', name: 'Finn the Seahorse', emoji: '🐴', color: '#4ECDC4',
      x: 38 * TILE + 13, y: 22 * TILE + 13,
      dialog: 'The octopus has many tentacles! Stay mobile and strike when you can!',
      interacted: false
    },
  ];

  return { map, resources, enemies, SEAHORSES };
}
