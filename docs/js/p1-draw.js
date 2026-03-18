// ════════════════════════════════════════
// js/p1-draw.js — Planet 1 Draw Layer
// Earth / Area 51 — all rendering
// ════════════════════════════════════════

// Uses shared p1 state from p1-logic.js

// ── Draw Single Tile ─────────────────────────────────────
function drawP1Tile(ctx, tx, ty) {
  const t = p1.map[ty][tx];
  const sx = tx * p1.TILE - p1.cam.x;
  const sy = ty * p1.TILE - p1.cam.y;

  // 0 = base floor (dirt/grass compound)
  if (t === 0) {
    ctx.fillStyle = '#1a2e10'; ctx.fillRect(sx, sy, p1.TILE, p1.TILE);
    if ((tx * 7 + ty * 13) % 5 === 0) { ctx.fillStyle = 'rgba(40,70,15,0.4)'; ctx.fillRect(sx + 4, sy + 4, p1.TILE - 8, p1.TILE - 8); }
    if ((tx * 3 + ty * 11) % 8 === 0) { ctx.fillStyle = 'rgba(80,50,10,0.2)'; ctx.fillRect(sx + 6, sy + 10, p1.TILE - 12, 8); }
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 0.5; ctx.strokeRect(sx, sy, p1.TILE, p1.TILE); ctx.lineWidth = 1;
  }

  // 1 = concrete wall (Area 51 bunker)
  if (t === 1) {
    ctx.fillStyle = '#3a3a3a'; ctx.fillRect(sx, sy, p1.TILE, p1.TILE);
    const row = ty % 2 === 0;
    ctx.fillStyle = '#464646';
    for (let i = 0; i < 2; i++) {
      const bx = row ? (i * 22) : (i * 22 + 11);
      ctx.fillRect(sx + bx + 1, sy + 2, 20, p1.TILE / 2 - 3);
      ctx.fillRect(sx + bx + 1, sy + p1.TILE / 2 + 1, 20, p1.TILE / 2 - 3);
    }
    if ((tx * 9 + ty * 5) % 11 < 2) {
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(sx + 8, sy + 6); ctx.lineTo(sx + 14, sy + 18); ctx.stroke(); ctx.lineWidth = 1;
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.5; ctx.strokeRect(sx, sy, p1.TILE, p1.TILE); ctx.lineWidth = 1;
  }

  // 2 = radioactive water pool
  if (t === 2) {
    ctx.fillStyle = '#0a1830'; ctx.fillRect(sx, sy, p1.TILE, p1.TILE);
    const gw = ctx.createRadialGradient(sx + p1.TILE / 2, sy + p1.TILE / 2, 2, sx + p1.TILE / 2, sy + p1.TILE / 2, p1.TILE / 2);
    gw.addColorStop(0, 'rgba(0,200,80,0.35)'); gw.addColorStop(1, 'rgba(0,60,30,0.1)');
    ctx.fillStyle = gw; ctx.fillRect(sx, sy, p1.TILE, p1.TILE);
    const rp = Math.sin(Date.now() * 0.002 + (tx + ty) * 0.8) * 0.12 + 0.18;
    ctx.strokeStyle = `rgba(0,255,100,${rp})`; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(sx + p1.TILE / 2, sy + p1.TILE / 2, p1.TILE / 2 - 5, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.shadowColor = 'rgba(0,255,80,0.4)'; ctx.shadowBlur = 8;
    ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(sx, sy, 1, 1);
    ctx.shadowBlur = 0;
  }

  // 3 = desert sand
  if (t === 3) {
    ctx.fillStyle = '#c8a040'; ctx.fillRect(sx, sy, p1.TILE, p1.TILE);
    ctx.fillStyle = 'rgba(200,160,40,0.5)';
    for (let i = 0; i < 3; i++) {
      const wy = sy + 6 + i * 10;
      ctx.beginPath(); ctx.moveTo(sx + 2, wy); ctx.quadraticCurveTo(sx + p1.TILE / 2, wy - 3, sx + p1.TILE - 2, wy); ctx.stroke();
    }
    if ((tx * 6 + ty * 4) % 7 === 0) {
      ctx.fillStyle = 'rgba(255,220,100,0.3)';
      ctx.beginPath(); ctx.ellipse(sx + p1.TILE / 2 - 3, sy + p1.TILE / 2 - 3, 6, 4, 0.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(160,110,10,0.3)'; ctx.lineWidth = 0.5; ctx.strokeRect(sx, sy, p1.TILE, p1.TILE); ctx.lineWidth = 1;
  }
}

// ── Draw Resources ───────────────────────────────────────
function drawP1Resources(ctx) {
  p1.resources.forEach(r => {
    const sx = r.x * p1.TILE + p1.TILE / 2 - p1.cam.x;
    const sy = r.y * p1.TILE + p1.TILE / 2 - p1.cam.y;
    ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.fillText(r.label, sx, sy + 5);
    if (r.hp < r.maxhp) {
      ctx.fillStyle = '#333'; ctx.fillRect(sx - 9, sy + 8, 18, 3);
      ctx.fillStyle = '#4f4'; ctx.fillRect(sx - 9, sy + 8, 18 * (r.hp / r.maxhp), 3);
    }
  });
}

// ── Draw Aliens ──────────────────────────────────────────
function drawP1Aliens(ctx) {
  p1.aliens.forEach(a => {
    const ax = a.x - p1.cam.x, ay = a.y - p1.cam.y;
    ctx.fillStyle = a.color;
    ctx.beginPath(); ctx.arc(ax, ay, a.size, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(ax - 3, ay - 2, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ax + 3, ay - 2, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#300'; ctx.fillRect(ax - 10, ay - a.size - 7, 20, 3);
    ctx.fillStyle = '#f44'; ctx.fillRect(ax - 10, ay - a.size - 7, 20 * (a.hp / a.maxhp), 3);
  });
}

// ── Draw Rocket ──────────────────────────────────────────
function drawP1Rocket(ctx) {
  const rx = p1.rocket.x - p1.cam.x;
  const ry = p1.rocket.y - p1.cam.y;
  if (save.resources.fuel >= 10) { ctx.shadowColor = '#ff0'; ctx.shadowBlur = 18; }
  ctx.fillStyle = '#aaa';
  ctx.beginPath(); ctx.ellipse(rx + 28, ry + 28, 20, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(100,200,255,.6)';
  ctx.beginPath(); ctx.ellipse(rx + 28, ry + 24, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff'; ctx.font = '10px Courier New'; ctx.textAlign = 'center';
  ctx.fillText('🛸 SAUCER', rx + 28, ry + 48);
}

// ── Draw Particles ───────────────────────────────────────
function drawP1Particles(ctx) {
  p1.particles.forEach(p => {
    ctx.globalAlpha = p.life / 30;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x - p1.cam.x, p.y - p1.cam.y, 2.5, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ── Draw Player ──────────────────────────────────────────
function drawP1Player(ctx) {
  const px = p1.player.x - p1.cam.x;
  const py = p1.player.y - p1.cam.y;
  drawPlayerSkin(ctx, px, py, p1.player.size);
  ctx.fillStyle = '#300'; ctx.fillRect(px - 18, py - p1.player.size - 9, 36, 4);
  ctx.fillStyle = save.hp > 50 ? '#4f4' : save.hp > 25 ? '#fa0' : '#f44';
  ctx.fillRect(px - 18, py - p1.player.size - 9, 36 * (save.hp / save.maxHp), 4);
}

// ── Main Draw Function ───────────────────────────────────
function drawP1(ctx) {
  // Background
  ctx.fillStyle = '#080818'; ctx.fillRect(0, 0, 800, 520);

  // Tiles
  for (let ty = 0; ty < p1.ROWS; ty++) {
    for (let tx = 0; tx < p1.COLS; tx++) {
      drawP1Tile(ctx, tx, ty);
    }
  }

  // Rocket
  drawP1Rocket(ctx);

  // Resources
  drawP1Resources(ctx);

  // Aliens
  drawP1Aliens(ctx);

  // Particles
  drawP1Particles(ctx);

  // Player
  drawP1Player(ctx);

  // Paused overlay
  if (gamePaused) {
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0, 0, 800, 520);
  }
}
