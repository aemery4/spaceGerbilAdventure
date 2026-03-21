// ════════════════════════════════════════
// js/planet2.js — Planet 2 Orchestrator
// Jungle Planet Zorbax — main entry point
// Requires: p2-data.js, p2-logic.js, p2-draw.js
// ════════════════════════════════════════

function launchP2() {
  console.log("[SGA] launchP2 started");
  stopGame();
  document.getElementById('planet').textContent = 'Jungle Planet — Zorbax';
  document.getElementById('fuelMax').textContent = '15';
  document.getElementById('bh').style.display = '';
  save.resources.fuel = 0;
  updateHUD();

  const canvas = document.getElementById('game');
  canvas.width = 800; canvas.height = 520;
  const ctx = canvas.getContext('2d');
  console.log("[SGA] canvas id=game, width=" + canvas.width + ", height=" + canvas.height + ", ctx ok=" + (!!ctx));

  const TILE = 26;
  const COLS = 48, ROWS = 28;

  // Get all data from data layer
  const data = buildP2Data(TILE, COLS, ROWS);

  // Initialize shared state for logic/draw layers
  p2InitData({
    canvas: canvas,
    ctx: ctx,
    TILE: TILE,
    COLS: COLS,
    ROWS: ROWS,
    map: data.map,
    resources: data.resources,
    miniBoss: data.miniBoss,
    monkeys: data.monkeys,
    golems: data.golems,
    lizards: data.lizards,
    panthers: data.panthers,
    bunnies: data.bunnies,
    parrots: data.parrots,
    chests: data.chests,
    VILLAGE_MERCHANTS: data.VILLAGE_MERCHANTS,
    player: {
      x: 2 * TILE + 14,
      y: 2 * TILE + 14,
      size: 14,
      speed: save.items.includes('boots') ? 6 : 4,
      keys: {},
      invincible: 0
    },
    cam: { x: 0, y: 0 },
    p2state: { mapRevealed: false, climbCount: 0, bossDead: false },
    particles: [],
    vineAnim: 0,
    activeWeapon: save.items.find(i => i.startsWith('w:'))?.slice(2) || null,
    weaponCooldown: 0,
    cutscene: {
      active: false,
      phase: 'walkin',
      gx: -40,
      gy: canvas.height / 2 + 60,
      gSize: 10,
      targetSize: 10,
      potionX: canvas.width / 2 - 20,
      potionY: canvas.height / 2 + 55,
      potionVisible: true,
      timer: 0,
      drinkStarted: false,
      facing: 1
    }
  });

  console.log("[SGA] P2: state initialized");

  // Event handlers
  const onKey = e => {
    p2.player.keys[e.key] = true;
    if (e.key === 'm' || e.key === 'M') {
      if (!p2.p2state.mapRevealed) { showToast('No Map Yet', 'Climb a vine or tree first!'); return; }
      const ov = document.getElementById('mapOv');
      ov.style.display = ov.style.display === 'none' || ov.style.display === '' ? 'block' : 'none';
      if (ov.style.display === 'block') drawP2Minimap();
    }
    if (e.key === ' ') doP2Action(p2.player.x, p2.player.y);
    e.preventDefault();
  };
  const offKey = e => p2.player.keys[e.key] = false;
  const onClick = e => {
    const rect = canvas.getBoundingClientRect();
    doP2Action(e.clientX - rect.left + p2.cam.x, e.clientY - rect.top + p2.cam.y);
  };

  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', offKey);
  canvas.addEventListener('click', onClick);
  console.log("[SGA] P2: event listeners added");

  // Game loop
  function loop() {
    if (!window._sgaLogged) { window._sgaLogged = true; console.log("[SGA] loop() first frame, gamePaused=" + gamePaused + ", canvas.width=" + canvas.width); }

    // Update
    updateP2();

    // Draw
    drawP2(ctx);

    animFrameId = requestAnimationFrame(loop);
  }

  console.log("[SGA] P2: starting loop");
  animFrameId = requestAnimationFrame(loop);

  // Start cutscene function
  function startCutscene() {
    p2.cutscene.active = true;
    gamePaused = true;
  }

  // Show welcome message
  showMsg('🌴 Welcome to Zorbax!',
    'You have landed on the Jungle Planet!\n\n🐒 Red-eyed monkeys lurk in the shadows\n🐰 Fluffy bunnies will heal you — stay close!\n🌿 Click vines/trees to CLIMB and reveal the map\n👑 Find and defeat the JUNGLE KING mini-boss\n⚡ Collect 15 fuel to reach Planet 3',
    () => { setTimeout(startCutscene, 300); });
}
