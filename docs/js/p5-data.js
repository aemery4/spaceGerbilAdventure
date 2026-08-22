// ════════════════════════════════════════
// js/p5-data.js — Planet 5 Data Layer
// Home Planet — map, building catalog, alien visitors
// Tile types: 0=grass, 1=fence, 2=path, 3=pond, 4=garden, 5=building
// ════════════════════════════════════════

// Building catalog — what can be purchased with Space Coins
const P5_BUILDINGS = [
  { type: 'hut',     name: 'Space Hut',    emoji: '🏠', desc: 'A cozy home. Heals slowly while visiting.', cost: 100, w: 2, h: 2 },
  { type: 'farm',    name: 'Star Farm',    emoji: '🌾', desc: 'Generates random resources each visit.', cost: 150, w: 2, h: 2 },
  { type: 'shop',    name: 'Trading Post', emoji: '🏪', desc: 'Opens the coin shop for upgrades.', cost: 200, w: 2, h: 2 },
  { type: 'arcade',  name: 'Arcade',       emoji: '🕹️', desc: 'Play minigames to earn Space Coins!', cost: 250, w: 2, h: 1 },
  { type: 'landing', name: 'Landing Pad',  emoji: '🛬', desc: 'Attracts more alien visitors.', cost: 300, w: 2, h: 2 },
  { type: 'fountain',name: 'Fountain',     emoji: '⛲', desc: 'A decorative fountain with sparkles.', cost: 100, w: 1, h: 1 },
  { type: 'trophy',  name: 'Trophy Hall',  emoji: '🏛️', desc: 'A museum of every boss you have defeated.', cost: 250, w: 2, h: 2 },
  { type: 'observatory', name: 'Observatory', emoji: '🔭', desc: 'Launch from home to any unlocked planet.', cost: 350, w: 2, h: 2 },
];

// Trophy Hall exhibits — one per planet, earned by clearing that planet.
const P5_TROPHIES = [
  { planet: 1, emoji: '🛸', name: 'Area 51 Escape', desc: 'Slipped past the guards and out of the secret desert base.' },
  { planet: 2, emoji: '🦍', name: 'Jungle King',    desc: 'Toppled the mighty ape boss of Zorbax.' },
  { planet: 3, emoji: '⛄', name: 'Frost Yeti',      desc: 'Bested the shaggy horned terror of the tundra.' },
  { planet: 4, emoji: '🐙', name: 'Deep Octopus',    desc: 'Vanquished the ink-spewing horror of Neptuna.' },
];

// Alien visitor pool — randomly selected each visit
const P5_ALIEN_POOL = [
  { name: 'Zyx',    emoji: '👽', color: '#00ff80', dialog: 'Greetings, Space Gerbil! Your home planet is coming along nicely!' },
  { name: 'Blorp',  emoji: '🛸', color: '#ff44ff', dialog: 'I bring gifts from the cosmos! Want to trade?' },
  { name: 'Kiki',   emoji: '👾', color: '#00ccff', dialog: 'Hey hey! Wanna play Rock Paper Scissors? I bet I can win!', minigame: true },
  { name: 'Zenna',  emoji: '🌟', color: '#ffdd00', dialog: 'The stars shine brighter here. You have built a good home.' },
  { name: 'Grumbo', emoji: '🤖', color: '#aaaaaa', dialog: 'BEEP BOOP. I have traveled 47 galaxies. This base is... adequate.' },
  { name: 'Pip',    emoji: '🐾', color: '#ff8844', dialog: 'I heard there are snacks here! Got any rocks? I eat rocks!', trade: { give: 'rock', giveAmt: 3, reward: 'coins', rewardAmt: 30 } },
  { name: 'Vex',    emoji: '🔮', color: '#cc66ff', dialog: 'I sense great adventure in your future... Want some crystals?', trade: { give: 'plant', giveAmt: 5, reward: 'crystal', rewardAmt: 3 } },
];

// Home planet shop items (purchased with Space Coins)
const P5_SHOP_ITEMS = [
  { id: 'p5_snack',  name: 'Space Snack',   emoji: '🍕', desc: 'Restores 30 HP',          cost: { coins: 25 },  effect: 'heal30' },
  { id: 'p5_life',   name: 'Extra Life',    emoji: '❤️', desc: 'Gain 1 extra life',        cost: { coins: 75 },  effect: 'life' },
  { id: 'p5_shoes',  name: 'Speed Shoes',   emoji: '👟', desc: 'Grants Rocket Boots',      cost: { coins: 100 }, effect: 'boots' },
  { id: 'p5_charm',  name: 'Lucky Charm',   emoji: '🍀', desc: '+3 rock, +3 plant, +3 crystal', cost: { coins: 50 },  effect: 'charm' },
  { id: 'p5_mega',   name: 'Mega Heal',     emoji: '💚', desc: '+30 max HP permanently',   cost: { coins: 150 }, effect: 'mega' },
  { id: 'p5_shield', name: 'Force Field',   emoji: '🛡️', desc: 'Grants Energy Shield',     cost: { coins: 120 }, effect: 'shield' },
];

function buildP5Data(TILE, COLS, ROWS) {
  // Size-driven so the home base can grow. Interior is open grass with a
  // fenced border; decorative pond/gardens/paths sit in the outer area so
  // the original (top-left) building region stays buildable grass.
  COLS = COLS || 32; ROWS = ROWS || 22;
  const map = [];
  for (let z = 0; z < ROWS; z++) {
    const row = [];
    for (let x = 0; x < COLS; x++) row.push((x === 0 || x === COLS - 1 || z === 0 || z === ROWS - 1) ? 1 : 0);
    map.push(row);
  }
  const set = (x, z, v) => { if (map[z] && map[z][x] === 0) map[z][x] = v; };
  // ornamental pond in the lower-right of the expanded field
  for (let dz = 0; dz < 4; dz++) for (let dx = 0; dx < 5; dx++) set(COLS - 9 + dx, ROWS - 7 + dz, 3);
  // flower gardens tucked into the far corners
  [[COLS - 4, 2], [COLS - 3, 2], [COLS - 4, 3], [2, ROWS - 4], [3, ROWS - 4], [2, ROWS - 3]].forEach(([x, z]) => set(x, z, 4));
  // a decorative path loop around the middle of the yard
  const x0 = 4, x1 = COLS - 5, z0 = 4, z1 = ROWS - 5;
  for (let x = x0; x <= x1; x++) { set(x, z0, 2); set(x, z1, 2); }
  for (let z = z0; z <= z1; z++) { set(x0, z, 2); set(x1, z, 2); }
  return { map };
}
