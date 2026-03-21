// ════════════════════════════════════════
// js/planet4.js — Planet 4 Orchestrator
// Aquatic Planet Neptuna — Defeat the Evil Octopus Boss
// Uses: p4-data.js, p4-logic.js, p4-draw.js
// ════════════════════════════════════════

function launchP4() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const TILE = 26, COLS = 48, ROWS = 28;

  // Build game data from data layer
  const data = buildP4Data(TILE, COLS, ROWS);

  // Player state
  const player = {
    x: 2 * TILE + 13, y: 2 * TILE + 13, size: 13,
    speed: save.items.includes('boots') ? 4 : 2.5,
    keys: {}, invincible: 0,
  };
  const cam = { x: 0, y: 0 };

  // Initialize shared state for logic and draw layers
  p4InitData({
    canvas, ctx, TILE, COLS, ROWS,
    map: data.map,
    resources: data.resources,
    enemies: data.enemies,
    SEAHORSES: data.SEAHORSES,
    player, cam,
    particles: [],
    activeWeapon: save.items.find(i => i.startsWith('w:'))?.slice(2) || null,
    weaponCooldown: 0,
    bossDefeated: false,
    cleanup  // Pass cleanup function for loseLife callback
  });

  // ── Input handlers ──────────────────────────────────────
  function handleKeyDown(e) {
    if (!gamePaused) player.keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') { e.preventDefault(); doP4Action(p4.player.x, p4.player.y); }
  }
  function handleKeyUp(e) { player.keys[e.key.toLowerCase()] = false; }
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  canvas.onclick = function(e) {
    if (gamePaused) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left + cam.x;
    const my = e.clientY - rect.top + cam.y;
    doP4Action(mx, my);
  };

  // ── Main game loop ──────────────────────────────────────
  function loop() {
    if (gamePaused) { animFrameId = requestAnimationFrame(loop); return; }
    updateP4();
    drawP4(ctx);
    animFrameId = requestAnimationFrame(loop);
  }

  // ── Cleanup function ────────────────────────────────────
  function cleanup() {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    canvas.onclick = null;
  }

  // Make cleanup accessible to p4 state
  p4.cleanup = cleanup;

  // ── Show intro message and start ────────────────────────
  showMsg('🌊 Aquatic Planet Neptuna', 'Dive deep into the underwater world! Defeat the evil octopus boss with help from friendly seahorses. Watch out for squids and piranhas!', () => { gamePaused = false; });
  gamePaused = true;
  loop();
}
