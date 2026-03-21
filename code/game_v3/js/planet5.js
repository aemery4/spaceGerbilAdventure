// ════════════════════════════════════════
// js/planet5.js — Planet 5 Orchestrator
// Home Planet — Build, Trade, Play!
// Uses: p5-data.js, p5-logic.js, p5-draw.js
// ════════════════════════════════════════

function launchP5() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const TILE = 40, COLS = 20, ROWS = 13;

  // Build map data
  const data = buildP5Data(TILE, COLS, ROWS);

  // Ensure save data has homePlanet
  if (!save.homePlanet) save.homePlanet = { buildings: [], minigameHighScore: 0 };
  if (!save.homePlanet.buildings) save.homePlanet.buildings = [];

  // Player state
  const player = {
    x: 5 * TILE + TILE / 2, y: 6 * TILE + TILE / 2,
    size: 13, keys: {},
  };

  // Initialize shared state
  p5InitData({
    canvas, ctx, TILE, COLS, ROWS,
    map: data.map,
    player,
    aliens: [],
    mode: 'explore', // 'explore', 'build', 'minigame'
    rpsPhase: 'choose',
    rpsPlayerWins: 0, rpsAlienWins: 0,
    rpsPlayerChoice: null, rpsAlienChoice: null,
    rpsRoundResult: null, rpsHover: null,
  });

  // Restore buildings onto the map
  save.homePlanet.buildings.forEach(b => {
    const info = P5_BUILDINGS.find(pb => pb.type === b.type);
    if (!info) return;
    for (let dr = 0; dr < info.h; dr++) {
      for (let dc = 0; dc < info.w; dc++) {
        const mr = b.gridY + dr, mc = b.gridX + dc;
        if (mr >= 0 && mr < ROWS && mc >= 0 && mc < COLS) {
          p5.map[mr][mc] = 5;
        }
      }
    }
  });

  // Spawn alien visitors
  p5.aliens = spawnP5Aliens();

  // Collect farm resources on arrival
  collectFarmResources();

  // ── Input handlers ──────────────────────────────────────
  function handleKeyDown(e) {
    if (!gamePaused) player.keys[e.key.toLowerCase()] = true;
    if (e.key === 'b' || e.key === 'B') {
      if (p5.mode === 'build') p5.mode = 'explore';
      else if (p5.mode === 'explore') p5.mode = 'build';
    }
    if (e.key === ' ') { e.preventDefault(); doP5Action(p5.player.x, p5.player.y); }
  }
  function handleKeyUp(e) { player.keys[e.key.toLowerCase()] = false; }
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  canvas.onclick = function (e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    doP5Action(mx, my);
  };

  canvas.onmousemove = function (e) {
    const rect = canvas.getBoundingClientRect();
    rpsMouseMove(e.clientX - rect.left, e.clientY - rect.top);
  };

  // ── Game loop ──────────────────────────────────────────
  function loop() {
    updateP5();
    drawP5(ctx);
    animFrameId = requestAnimationFrame(loop);
  }

  // ── Cleanup ────────────────────────────────────────────
  function cleanup() {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    canvas.onclick = null;
    canvas.onmousemove = null;
  }
  p5.cleanup = cleanup;

  // ── HUD setup ──────────────────────────────────────────
  document.getElementById('hud').style.display = 'flex';
  document.getElementById('invBar').style.display = 'block';
  document.getElementById('ctrl').style.display = 'block';
  document.getElementById('planet').textContent = 'Home Planet';
  save.currentPlanet = 5;
  updateHUD();

  // ── Welcome and start ─────────────────────────────────
  showMsg('🏠 Home Planet', 'Welcome home, Space Gerbil!\n\n' +
    'B: Toggle build mode\n' +
    'Space/Click: Interact with aliens & buildings\n' +
    'Visit aliens, build your base, play games!\n\n' +
    '🪙 ' + (save.spaceCoins || 0) + ' Space Coins available');
  gamePaused = true;
  loop();
}
