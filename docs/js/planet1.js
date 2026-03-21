// ════════════════════════════════════════
// js/planet1.js — Planet 1 Orchestrator
// Earth / Area 51 — main entry point
// Requires: p1-data.js, p1-logic.js, p1-draw.js
// ════════════════════════════════════════

function launchP1() {
  stopGame();

  const TILE = 40, COLS = 32, ROWS = 22;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // Get all data from data layer
  const data = buildP1Data(TILE, COLS, ROWS);

  // Initialize shared state for logic/draw layers
  p1InitData({
    canvas: canvas,
    ctx: ctx,
    TILE: TILE,
    COLS: COLS,
    ROWS: ROWS,
    map: data.map,
    rocket: data.rocket,
    resources: data.resources,
    aliens: data.aliens,
    player: {
      x: 3 * TILE + 20,
      y: 3 * TILE + 20,
      size: 14,
      speed: save.items.includes('boots') ? 6 : 4,
      keys: {}
    },
    cam: { x: 0, y: 0 },
    particles: []
  });

  // Event handlers
  const onKey = e => {
    p1.player.keys[e.key] = true;
    if (e.key === ' ') doP1Action(p1.player.x, p1.player.y);
    e.preventDefault();
  };
  const offKey = e => p1.player.keys[e.key] = false;
  const onClick = e => {
    const rect = canvas.getBoundingClientRect();
    doP1Action(e.clientX - rect.left + p1.cam.x, e.clientY - rect.top + p1.cam.y);
  };

  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', offKey);
  canvas.addEventListener('click', onClick);

  // Game loop
  function loop() {
    // Update
    updateP1();

    // Draw
    drawP1(ctx);

    animFrameId = requestAnimationFrame(loop);
  }

  animFrameId = requestAnimationFrame(loop);

  // Welcome message
  showMsg('🛸 Space Gerbil', 'Area 51! Collect 10 ⚡ fuel and click the saucer.\n\nWASD: move | Space or Click: gather/attack | C: craft');
}
