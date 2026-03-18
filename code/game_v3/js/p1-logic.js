// ════════════════════════════════════════
// js/p1-logic.js — Planet 1 Logic Layer
// Earth / Area 51 — update logic, AI, collision
// ════════════════════════════════════════

// ── Shared state for P1 (initialized by planet1.js) ─────
let p1 = null;

// Initialize shared P1 state — called from planet1.js
function p1InitData(state) {
  p1 = state;
}

// ── Collision Helper ─────────────────────────────────────
function isSolidP1(px, py) {
  const tx = Math.floor(px / p1.TILE), ty = Math.floor(py / p1.TILE);
  if (tx < 0 || ty < 0 || tx >= p1.COLS || ty >= p1.ROWS) return true;
  return p1.map[ty][tx] === 1 || p1.map[ty][tx] === 3;
}

// ── Particle Helper ──────────────────────────────────────
function addP1(x, y, color, n = 8) {
  for (let i = 0; i < n; i++) {
    p1.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 30,
      color
    });
  }
}

// ── Action Handler (F key / click) ───────────────────────
function doP1Action(mx, my) {
  if (gamePaused) return;

  // Check for resources first (higher priority than spaceship)
  for (let i = p1.resources.length - 1; i >= 0; i--) {
    const r = p1.resources[i];
    const rx = r.x * p1.TILE + p1.TILE / 2;
    const ry = r.y * p1.TILE + p1.TILE / 2;
    const reach = save.items.includes('scanner') ? p1.TILE * 3.5 : p1.TILE * 2;
    if (Math.hypot(mx - rx, my - ry) < p1.TILE * 0.9 && Math.hypot(p1.player.x - rx, p1.player.y - ry) < reach) {
      r.hp--; addP1(rx, ry, r.color);
      if (r.hp <= 0) {
        save.resources[r.type] = (save.resources[r.type] || 0) + 1;
        p1.resources.splice(i, 1);
        updateHUD();
      }
      return;
    }
  }

  // Check for aliens (higher priority than spaceship)
  for (let i = p1.aliens.length - 1; i >= 0; i--) {
    const a = p1.aliens[i];
    if (Math.hypot(mx - a.x, my - a.y) < a.size + 10 && Math.hypot(p1.player.x - a.x, p1.player.y - a.y) < p1.TILE * 3) {
      a.hp--; addP1(a.x, a.y, '#f44');
      if (a.hp <= 0) {
        addP1(a.x, a.y, '#ff0', 12);
        p1.aliens.splice(i, 1);
      }
      return;
    }
  }

  // Check spaceship last
  if (mx > p1.rocket.x && mx < p1.rocket.x + p1.rocket.w && my > p1.rocket.y && my < p1.rocket.y + p1.rocket.h) {
    if (save.resources.fuel >= 10) {
      if (!save.planetsCleared.includes(1)) save.planetsCleared.push(1);
      save.resources.fuel = 0; persist();
      stopGame();
      showTransition('🚀 Blasting Off!\n🌍 → Zorbax', 'Jungle planet ahead...', () => startPlanet(2));
    } else {
      showMsg('Need More Fuel!', 'Collect 10 ⚡ fuel. Have: ' + save.resources.fuel + '/10.');
    }
    return;
  }

  // Nothing nearby fallback
  showMsg('Nothing Here', 'Walk closer to resources, aliens, or the saucer to interact.');
}

// ── Main Update Function ─────────────────────────────────
function updateP1() {
  if (gamePaused) return;

  // Move player
  let dx = 0, dy = 0;
  if (p1.player.keys['ArrowLeft'] || p1.player.keys['a'] || p1.player.keys['A']) dx -= p1.player.speed;
  if (p1.player.keys['ArrowRight'] || p1.player.keys['d'] || p1.player.keys['D']) dx += p1.player.speed;
  if (p1.player.keys['ArrowUp'] || p1.player.keys['w'] || p1.player.keys['W']) dy -= p1.player.speed;
  if (p1.player.keys['ArrowDown'] || p1.player.keys['s'] || p1.player.keys['S']) dy += p1.player.speed;

  const r = p1.player.size;
  const nx = p1.player.x + dx, ny = p1.player.y + dy;
  if (!isSolidP1(nx - r, p1.player.y - r) && !isSolidP1(nx + r, p1.player.y - r) && !isSolidP1(nx - r, p1.player.y + r) && !isSolidP1(nx + r, p1.player.y + r)) p1.player.x = nx;
  if (!isSolidP1(p1.player.x - r, ny - r) && !isSolidP1(p1.player.x + r, ny - r) && !isSolidP1(p1.player.x - r, ny + r) && !isSolidP1(p1.player.x + r, ny + r)) p1.player.y = ny;

  // Alien AI
  p1.aliens.forEach(a => {
    const pd = Math.hypot(p1.player.x - a.x, p1.player.y - a.y);
    if (pd < p1.TILE * 5) {
      const ang = Math.atan2(p1.player.y - a.y, p1.player.x - a.x);
      a.x += Math.cos(ang) * a.speed * 0.6;
      a.y += Math.sin(ang) * a.speed * 0.6;
      if (pd < a.size + p1.player.size) {
        const dmg = save.items.includes('shield') ? 0.025 : 0.05;
        save.hp = Math.max(0, save.hp - dmg);
        updateHUD();
        if (save.hp <= 0) {
          loseLife(() => { closeMsg(); startPlanet(1); });
        }
      }
    } else {
      a.x += a.dx; a.y += a.dy;
      if (a.x < p1.TILE || a.x > (p1.COLS - 1) * p1.TILE) a.dx *= -1;
      if (a.y < p1.TILE || a.y > (p1.ROWS - 1) * p1.TILE) a.dy *= -1;
    }
  });

  // Particle update
  p1.particles = p1.particles.filter(p => p.life > 0);
  p1.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });

  // Fuel magnet
  if (save.items.includes('magnet')) {
    for (let i = p1.resources.length - 1; i >= 0; i--) {
      const r = p1.resources[i];
      if (r.type !== 'fuel') continue;
      const rx = r.x * p1.TILE + p1.TILE / 2;
      const ry = r.y * p1.TILE + p1.TILE / 2;
      if (Math.hypot(p1.player.x - rx, p1.player.y - ry) < p1.TILE * 3) {
        save.resources.fuel++;
        p1.resources.splice(i, 1);
        updateHUD();
      }
    }
  }

  // Camera
  p1.cam.x = Math.max(0, Math.min(p1.player.x - 400, p1.COLS * p1.TILE - 800));
  p1.cam.y = Math.max(0, Math.min(p1.player.y - 260, p1.ROWS * p1.TILE - 520));
}
