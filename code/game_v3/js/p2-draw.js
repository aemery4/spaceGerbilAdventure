// ════════════════════════════════════════
// js/p2-draw.js — Planet 2 Draw Layer
// Jungle Planet Zorbax — all rendering
// ════════════════════════════════════════

// Uses shared p2 state from p2-logic.js

// ── Helper: Rounded Rectangle ────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Draw Minimap ─────────────────────────────────────────
function drawP2Minimap() {
  const mc = document.getElementById('minimap');
  const mx = mc.getContext('2d');
  const tw = 400 / p2.COLS, th = 280 / p2.ROWS;
  const tileC = ['#1e3a1e', '#4a4a4a', '#1a2a10', '#3a2010', '#0a4a0a', '#2a4a3a', '#1a3060'];
  for (let ty = 0; ty < p2.ROWS; ty++) {
    for (let tx = 0; tx < p2.COLS; tx++) {
      mx.fillStyle = tileC[p2.map[ty][tx]] || '#1e3a1e';
      mx.fillRect(tx * tw, ty * th, tw, th);
    }
  }
  p2.resources.forEach(r => {
    mx.fillStyle = r.type === 'fuel' ? '#ff0' : r.type === 'banana' ? '#fa0' : '#4f4';
    mx.fillRect(r.x * tw + 2, r.y * th + 2, tw - 4, th - 4);
  });
  mx.fillStyle = '#4af';
  mx.beginPath();
  mx.arc(p2.player.x / p2.TILE * tw + tw / 2, p2.player.y / p2.TILE * th + th / 2, 4, 0, Math.PI * 2);
  mx.fill();
  if (p2.miniBoss.alive) {
    mx.fillStyle = '#f00';
    mx.beginPath();
    mx.arc(p2.miniBoss.x / p2.TILE * tw + tw / 2, p2.miniBoss.y / p2.TILE * th + th / 2, 6, 0, Math.PI * 2);
    mx.fill();
  }
}

// ── Draw Single Tile ─────────────────────────────────────
function drawP2Tile(ctx, tx, ty) {
  const t = p2.map[ty][tx];
  const sx = tx * p2.TILE - p2.cam.x, sy = ty * p2.TILE - p2.cam.y;

  // 0 = jungle floor
  if (t === 0) {
    ctx.fillStyle = '#0f2208'; ctx.fillRect(sx, sy, p2.TILE, p2.TILE);
    if ((tx * 11 + ty * 7) % 6 === 0) { ctx.fillStyle = 'rgba(60,120,20,0.18)'; ctx.beginPath(); ctx.ellipse(sx + p2.TILE / 2, sy + p2.TILE / 2, p2.TILE / 2 - 4, p2.TILE / 2 - 6, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = 'rgba(20,50,10,0.5)'; ctx.lineWidth = 0.5; ctx.strokeRect(sx, sy, p2.TILE, p2.TILE); ctx.lineWidth = 1;
  }
  // 1 = wall
  if (t === 1) {
    ctx.fillStyle = '#1e1e1e'; ctx.fillRect(sx, sy, p2.TILE, p2.TILE);
    const row = ty % 2 === 0;
    ctx.fillStyle = '#262a20';
    for (let i = 0; i < 2; i++) {
      const bx = row ? (i * 20) : (i * 20 + 10);
      ctx.fillRect(sx + bx + 1, sy + 2, 18, p2.TILE / 2 - 3);
      ctx.fillRect(sx + bx + 1, sy + p2.TILE / 2 + 1, 18, p2.TILE / 2 - 3);
    }
    if ((tx * 5 + ty * 9) % 7 < 2) { ctx.fillStyle = 'rgba(40,90,20,0.35)'; ctx.fillRect(sx + 2, sy + p2.TILE - 5, p2.TILE - 4, 4); }
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 0.5; ctx.strokeRect(sx, sy, p2.TILE, p2.TILE); ctx.lineWidth = 1;
  }
  // 2 = bush (slows)
  if (t === 2) {
    ctx.fillStyle = '#0a2200'; ctx.fillRect(sx, sy, p2.TILE, p2.TILE);
    const g = ctx.createRadialGradient(sx + p2.TILE / 2, sy + p2.TILE / 2, 2, sx + p2.TILE / 2, sy + p2.TILE / 2, p2.TILE / 2);
    g.addColorStop(0, 'rgba(30,90,10,0.7)'); g.addColorStop(1, 'rgba(5,30,0,0.3)');
    ctx.fillStyle = g; ctx.fillRect(sx, sy, p2.TILE, p2.TILE);
    ctx.font = '17px serif'; ctx.textAlign = 'center'; ctx.fillText('🌿', sx + p2.TILE / 2, sy + p2.TILE / 2 + 6);
  }
  // 3 = tree (solid)
  if (t === 3) {
    ctx.fillStyle = '#0a1a06'; ctx.fillRect(sx, sy, p2.TILE, p2.TILE);
    ctx.fillStyle = '#5a3010'; ctx.fillRect(sx + p2.TILE / 2 - 4, sy + p2.TILE - 12, 8, 12);
    const cg = ctx.createRadialGradient(sx + p2.TILE / 2, sy + 10, 2, sx + p2.TILE / 2, sy + 14, p2.TILE / 2 - 2);
    cg.addColorStop(0, '#2a8a10'); cg.addColorStop(0.7, '#1a5a08'); cg.addColorStop(1, 'rgba(10,40,5,0)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(sx + p2.TILE / 2, sy + 14, p2.TILE / 2 - 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(80,200,40,0.2)'; ctx.beginPath(); ctx.arc(sx + p2.TILE / 2 - 4, sy + 10, 6, 0, Math.PI * 2); ctx.fill();
  }
  // 4 = vine
  if (t === 4) {
    ctx.fillStyle = '#0f2208'; ctx.fillRect(sx, sy, p2.TILE, p2.TILE);
    const sway = Math.sin(p2.vineAnim + tx * 0.5) * 3;
    ctx.shadowColor = 'rgba(60,200,20,0.4)'; ctx.shadowBlur = 6;
    ctx.strokeStyle = '#3ab010'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(sx + p2.TILE / 2 + sway, sy);
    ctx.quadraticCurveTo(sx + p2.TILE / 2 + sway * 2.5, sy + p2.TILE / 2, sx + p2.TILE / 2 + sway, sy + p2.TILE); ctx.stroke();
    ctx.shadowBlur = 0; ctx.lineWidth = 1;
    ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.fillText('🍃', sx + p2.TILE / 2 + sway, sy + p2.TILE / 2 + 6);
  }
  // 5 = hidden room
  if (t === 5) {
    if (p2.p2state.mapRevealed) {
      const pulse = Math.sin(Date.now() * 0.003) * 0.08 + 0.12;
      ctx.fillStyle = `rgba(80,255,80,${pulse})`; ctx.fillRect(sx, sy, p2.TILE, p2.TILE);
      ctx.strokeStyle = 'rgba(60,255,60,0.4)'; ctx.lineWidth = 0.5; ctx.strokeRect(sx, sy, p2.TILE, p2.TILE); ctx.lineWidth = 1;
    } else {
      ctx.fillStyle = '#0f2208'; ctx.fillRect(sx, sy, p2.TILE, p2.TILE);
      ctx.strokeStyle = 'rgba(20,50,10,0.5)'; ctx.lineWidth = 0.5; ctx.strokeRect(sx, sy, p2.TILE, p2.TILE); ctx.lineWidth = 1;
    }
  }
  // 6 = swamp
  if (t === 6) {
    const bg = ctx.createLinearGradient(sx, sy, sx, sy + p2.TILE);
    bg.addColorStop(0, '#0f2215'); bg.addColorStop(1, '#081510');
    ctx.fillStyle = bg; ctx.fillRect(sx, sy, p2.TILE, p2.TILE);
    const sw = Math.sin(Date.now() * 0.0015 + tx * 0.7) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(10,80,30,${0.3 + sw * 0.2})`;
    ctx.beginPath(); ctx.ellipse(sx + p2.TILE / 2, sy + p2.TILE / 2, p2.TILE / 2 - 3, p2.TILE / 2 - 5, 0, 0, Math.PI * 2); ctx.fill();
    if ((tx * 3 + ty) % 5 === 0 && Math.floor(Date.now() / 800 + tx) % 3 === 0) { ctx.fillStyle = 'rgba(40,180,80,0.4)'; ctx.beginPath(); ctx.arc(sx + 8, sy + p2.TILE - 8, 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.5; ctx.strokeRect(sx, sy, p2.TILE, p2.TILE); ctx.lineWidth = 1;
  }
  // 7 = treetop platform (village)
  if (t === 7) {
    const plankG = ctx.createLinearGradient(sx, sy, sx, sy + p2.TILE);
    plankG.addColorStop(0, '#8b5e2a'); plankG.addColorStop(0.5, '#7a5025'); plankG.addColorStop(1, '#6b4020');
    ctx.fillStyle = plankG; ctx.fillRect(sx, sy, p2.TILE, p2.TILE);
    ctx.strokeStyle = 'rgba(50,25,5,0.4)'; ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(sx, sy + i * 10); ctx.lineTo(sx + p2.TILE, sy + i * 10); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(100,60,20,0.2)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(sx + 5, sy); ctx.lineTo(sx + 8, sy + p2.TILE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + 20, sy); ctx.lineTo(sx + 18, sy + p2.TILE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + 32, sy); ctx.lineTo(sx + 35, sy + p2.TILE); ctx.stroke();
    ctx.fillStyle = 'rgba(200,150,80,0.25)'; ctx.fillRect(sx, sy, p2.TILE, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(sx, sy + p2.TILE - 3, p2.TILE, 3);
    ctx.lineWidth = 1;
    const glow = Math.sin(Date.now() * 0.0008 + tx * 0.3 + ty * 0.5) * 0.04 + 0.06;
    ctx.fillStyle = `rgba(255,200,80,${glow})`; ctx.fillRect(sx, sy, p2.TILE, p2.TILE);
  }
  // 8 = lava
  if (t === 8) {
    const lv = Math.sin(Date.now() * 0.003 + tx * 0.5 + ty * 0.7) * 0.5 + 0.5;
    const lg = ctx.createLinearGradient(sx, sy, sx, sy + p2.TILE);
    lg.addColorStop(0, `rgba(255,${80 + lv * 40 | 0},0,0.95)`);
    lg.addColorStop(1, `rgba(180,${20 + lv * 20 | 0},0,0.98)`);
    ctx.fillStyle = lg; ctx.fillRect(sx, sy, p2.TILE, p2.TILE);
    ctx.shadowColor = 'rgba(255,120,0,0.9)'; ctx.shadowBlur = 16;
    ctx.fillStyle = `rgba(255,200,0,${0.15 + lv * 0.2})`;
    ctx.beginPath(); ctx.ellipse(sx + p2.TILE / 2, sy + p2.TILE / 2, p2.TILE / 2 - 4, p2.TILE / 2 - 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    if ((tx * 3 + ty * 7 + Math.floor(Date.now() / 400)) % 5 === 0) {
      ctx.fillStyle = 'rgba(255,200,50,0.6)'; ctx.beginPath(); ctx.arc(sx + 8 + ((tx * 5) % 24), sy + 6, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  // 9 = ruins floor
  if (t === 9) {
    const rg = ctx.createLinearGradient(sx, sy, sx + p2.TILE, sy + p2.TILE);
    rg.addColorStop(0, '#3a3228'); rg.addColorStop(1, '#2a241c');
    ctx.fillStyle = rg; ctx.fillRect(sx, sy, p2.TILE, p2.TILE);
    ctx.strokeStyle = 'rgba(80,70,50,0.6)'; ctx.lineWidth = 0.8;
    ctx.strokeRect(sx + 2, sy + 2, p2.TILE / 2 - 3, p2.TILE / 2 - 3);
    ctx.strokeRect(sx + p2.TILE / 2 + 1, sy + 2, p2.TILE / 2 - 3, p2.TILE / 2 - 3);
    ctx.strokeRect(sx + 2, sy + p2.TILE / 2 + 1, p2.TILE / 2 - 3, p2.TILE / 2 - 3);
    ctx.strokeRect(sx + p2.TILE / 2 + 1, sy + p2.TILE / 2 + 1, p2.TILE / 2 - 3, p2.TILE / 2 - 3);
    ctx.lineWidth = 1;
    if ((tx * 11 + ty * 7) % 6 === 0) { ctx.strokeStyle = 'rgba(60,50,30,0.4)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(sx + 5, sy + 5); ctx.lineTo(sx + 15, sy + 18); ctx.stroke(); ctx.lineWidth = 1; }
    if ((tx + ty * 3) % 7 === 0) { ctx.fillStyle = 'rgba(40,80,20,0.3)'; ctx.fillRect(sx + 22, sy + 20, 8, 6); }
  }
  // 10 = chest
  if (t === 10) {
    ctx.fillStyle = '#162614'; ctx.fillRect(sx, sy, p2.TILE, p2.TILE);
    const cx2 = tx * p2.TILE + p2.TILE / 2, cy2 = ty * p2.TILE + p2.TILE / 2;
    const ch = p2.chests.find(c => Math.abs(c.x - cx2) < p2.TILE && Math.abs(c.y - cy2) < p2.TILE);
    if (ch && ch.opened) {
      ctx.fillStyle = 'rgba(100,70,20,0.5)'; ctx.fillRect(sx + 6, sy + 10, p2.TILE - 12, p2.TILE - 16);
      ctx.strokeStyle = 'rgba(140,100,40,0.4)'; ctx.lineWidth = 1; ctx.strokeRect(sx + 6, sy + 10, p2.TILE - 12, p2.TILE - 16);
    } else {
      const glow = Math.sin(Date.now() * 0.004 + tx + ty) * 0.3 + 0.7;
      ctx.shadowColor = 'rgba(255,200,50,0.8)'; ctx.shadowBlur = 12 * glow;
      ctx.fillStyle = '#6b4a14'; ctx.fillRect(sx + 4, sy + 10, p2.TILE - 8, p2.TILE - 14);
      ctx.fillStyle = '#8b6a28'; ctx.fillRect(sx + 4, sy + 10, p2.TILE - 8, 6);
      ctx.fillStyle = 'rgba(255,200,80,0.8)'; ctx.fillRect(sx + p2.TILE / 2 - 4, sy + 14, 8, 4);
      ctx.shadowBlur = 0;
      ctx.font = '11px serif'; ctx.textAlign = 'center'; ctx.fillText('📦', sx + p2.TILE / 2, sy + p2.TILE - 4);
    }
  }
}

// ── Draw Village Elements ────────────────────────────────
function drawP2Hut(ctx, hx, hy) {
  const sx = hx - p2.cam.x, sy = hy - p2.cam.y;
  if (sx < -80 || sx > p2.canvas.width + 80 || sy < -80 || sy > p2.canvas.height + 80) return;
  ctx.fillStyle = '#6b4a20'; ctx.fillRect(sx + 4, sy - 28, 32, 28);
  ctx.fillStyle = '#3a200a'; ctx.fillRect(sx + 14, sy - 20, 12, 20);
  ctx.fillStyle = 'rgba(255,220,100,0.7)'; ctx.fillRect(sx + 7, sy - 24, 8, 8);
  ctx.fillStyle = 'rgba(255,220,100,0.7)'; ctx.fillRect(sx + 25, sy - 24, 8, 8);
  ctx.fillStyle = '#4a8020';
  ctx.beginPath(); ctx.moveTo(sx, sy - 28); ctx.lineTo(sx + 20, sy - 54); ctx.lineTo(sx + 40, sy - 28); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3a6018';
  ctx.beginPath(); ctx.moveTo(sx + 4, sy - 32); ctx.lineTo(sx + 20, sy - 50); ctx.lineTo(sx + 36, sy - 32); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(20,50,5,0.4)'; ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(sx + i * 8, sy - 28); ctx.lineTo(sx + 20, sy - 54); ctx.stroke(); }
  ctx.lineWidth = 1;
  const lanternGlow = Math.sin(Date.now() * 0.003 + hx) * 0.15 + 0.7;
  ctx.fillStyle = `rgba(255,180,40,${lanternGlow})`;
  ctx.shadowColor = 'rgba(255,160,30,0.8)'; ctx.shadowBlur = 12;
  ctx.fillRect(sx + 17, sy - 44, 6, 6);
  ctx.shadowBlur = 0;
}

function drawP2Stall(ctx, hx, hy) {
  const sx = hx - p2.cam.x, sy = hy - p2.cam.y;
  if (sx < -80 || sx > p2.canvas.width + 80) return;
  ctx.fillStyle = '#5a3a10'; ctx.fillRect(sx, sy - 12, 36, 12);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#e83030' : '#f0f0f0';
    ctx.fillRect(sx + i * 9, sy - 24, 9, 12);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(sx, sy - 24, 36, 2);
  ctx.fillStyle = '#4a2a08'; ctx.fillRect(sx - 2, sy - 24, 4, 24); ctx.fillRect(sx + 34, sy - 24, 4, 24);
}

function drawP2Sign(ctx, sx2, sy2, text1, text2) {
  const sx = sx2 - p2.cam.x, sy = sy2 - p2.cam.y;
  if (sx < -100 || sx > p2.canvas.width + 100) return;
  ctx.fillStyle = '#6b4a1a'; ctx.fillRect(sx - 24, sy - 22, 48, 20);
  ctx.strokeStyle = '#4a3010'; ctx.lineWidth = 1.5; ctx.strokeRect(sx - 24, sy - 22, 48, 20); ctx.lineWidth = 1;
  ctx.fillStyle = '#ffe080'; ctx.font = 'bold 8px Share Tech Mono,monospace'; ctx.textAlign = 'center';
  ctx.fillText(text1, sx, sy - 12);
  ctx.fillStyle = '#ffd'; ctx.font = '7px Share Tech Mono,monospace';
  ctx.fillText(text2, sx, sy - 4);
  ctx.fillStyle = '#6b4a1a'; ctx.fillRect(sx - 2, sy - 2, 4, 18);
}

function drawP2LanternPost(ctx, lx, ly) {
  const sx = lx - p2.cam.x, sy = ly - p2.cam.y;
  if (sx < -20 || sx > p2.canvas.width + 20 || sy < -20 || sy > p2.canvas.height + 20) return;
  ctx.fillStyle = '#5a3a10'; ctx.fillRect(sx - 2, sy - 28, 4, 28);
  const flicker = Math.sin(Date.now() * 0.007 + lx * 0.1) * 0.2 + 0.8;
  ctx.shadowColor = `rgba(255,180,40,${flicker})`; ctx.shadowBlur = 18;
  ctx.fillStyle = `rgba(255,200,60,${flicker * 0.9})`;
  ctx.fillRect(sx - 5, sy - 32, 10, 8);
  ctx.shadowBlur = 0;
  ctx.fillStyle = `rgba(255,160,30,${0.04 + flicker * 0.04})`;
  ctx.beginPath(); ctx.ellipse(sx, sy, 16, 8, 0, 0, Math.PI * 2); ctx.fill();
}

// ── Draw Entities ────────────────────────────────────────
function drawP2Parrots(ctx) {
  p2.parrots.forEach(p => {
    if (p.collected) return;
    const px2 = p.x - p2.cam.x, py2 = p.y - p2.cam.y;
    if (px2 < -30 || px2 > p2.canvas.width + 30 || py2 < -30 || py2 > p2.canvas.height + 30) return;
    const bob = Math.sin(Date.now() * 0.008 + p.timer) * 4;
    ctx.shadowColor = '#f90'; ctx.shadowBlur = 10;
    ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.fillText('🦜', px2, py2 + bob + 5);
    ctx.shadowBlur = 0;
    if (Math.hypot(p2.player.x - p.x, p2.player.y - p.y) < p2.TILE * 2.5) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(px2 - 22, py2 + bob - 22, 44, 14);
      ctx.fillStyle = '#ffa'; ctx.font = '8px Share Tech Mono,monospace'; ctx.textAlign = 'center';
      ctx.fillText('+3🍌 walk near', px2, py2 + bob - 11);
    }
  });
}

function drawP2Golems(ctx) {
  p2.golems.forEach(a => {
    const ax = a.x - p2.cam.x, ay = a.y - p2.cam.y;
    if (ax < -40 || ax > p2.canvas.width + 40 || ay < -40 || ay > p2.canvas.height + 40) return;
    if (a.aggro) { ctx.shadowColor = '#aaa'; ctx.shadowBlur = 14; }
    ctx.fillStyle = a.aggro ? '#8a8a8a' : '#5a5a5a';
    roundRect(ctx, ax - a.size, ay - a.size, a.size * 2, a.size * 2, 4); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(100,200,255,0.5)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(ax - a.size + 4, ay - a.size + 4, a.size * 2 - 8, a.size * 2 - 8);
    ctx.lineWidth = 1;
    ctx.fillStyle = '#00aaff'; ctx.shadowColor = '#0af'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(ax - 5, ay - 4, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ax + 5, ay - 4, 3, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(ax - 16, ay - a.size - 8, 32, 5);
    ctx.fillStyle = a.hp / a.maxhp > 0.5 ? '#4f4' : '#f44'; ctx.fillRect(ax - 16, ay - a.size - 8, 32 * (a.hp / a.maxhp), 5);
  });
}

function drawP2Lizards(ctx) {
  p2.lizards.forEach(a => {
    const ax = a.x - p2.cam.x, ay = a.y - p2.cam.y;
    if (ax < -30 || ax > p2.canvas.width + 30 || ay < -30 || ay > p2.canvas.height + 30) return;
    if (a.aggro) { ctx.shadowColor = '#f80'; ctx.shadowBlur = 12; }
    ctx.fillStyle = a.aggro ? '#ff4400' : '#cc2200';
    ctx.beginPath(); ctx.ellipse(ax, ay, a.size + 4, a.size - 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(80,0,0,0.6)'; ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(ax + i * 6, ay, 4, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.ellipse(ax - 5, ay - 3, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ax + 5, ay - 3, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(ax - 5, ay - 3, 0.8, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ax + 5, ay - 3, 0.8, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f00'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ax, ay + 5); ctx.lineTo(ax - 2, ay + 10); ctx.moveTo(ax, ay + 5); ctx.lineTo(ax + 2, ay + 10); ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(ax - 11, ay - a.size - 7, 22, 4);
    ctx.fillStyle = '#f44'; ctx.fillRect(ax - 11, ay - a.size - 7, 22 * (a.hp / a.maxhp), 4);
  });
}

function drawP2Panthers(ctx) {
  p2.panthers.forEach(a => {
    const ax = a.x - p2.cam.x, ay = a.y - p2.cam.y;
    if (ax < -30 || ax > p2.canvas.width + 30 || ay < -30 || ay > p2.canvas.height + 30) return;
    ctx.globalAlpha = a.alpha;
    if (a.aggro) { ctx.shadowColor = '#80f'; ctx.shadowBlur = 16; }
    ctx.fillStyle = '#180028'; ctx.beginPath(); ctx.ellipse(ax, ay, a.size + 3, a.size - 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(100,0,180,0.4)';
    [[ax - 5, ay - 3], [ax + 4, ay + 2], [ax - 2, ay + 5], [ax + 6, ay - 5]].forEach(([sx, sy]) => { ctx.beginPath(); ctx.arc(sx, sy, 2.5, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = '#cc00ff'; ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(ax - 4, ay - 4, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ax + 4, ay - 4, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    if (a.alpha > 0.5) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(ax - 11, ay - a.size - 7, 22, 4); ctx.fillStyle = '#80f'; ctx.fillRect(ax - 11, ay - a.size - 7, 22 * (a.hp / a.maxhp), 4); }
  });
}

function drawP2Bunnies(ctx) {
  p2.bunnies.forEach(b => {
    const bx = b.x - p2.cam.x, by = b.y - p2.cam.y;
    const pulse = Math.sin(Date.now() * 0.004 + b.x) * 0.4 + 0.6;
    ctx.shadowColor = 'rgba(255,180,255,0.6)'; ctx.shadowBlur = 16 * pulse;
    ctx.strokeStyle = `rgba(255,160,255,${0.2 * pulse})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bx, by, b.size + 6, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0; ctx.lineWidth = 1;
    const bg = ctx.createRadialGradient(bx - 3, by - 3, 1, bx, by, b.size);
    bg.addColorStop(0, '#fff0ff'); bg.addColorStop(1, '#e080e0');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(bx, by, b.size, b.size - 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fce';
    ctx.beginPath(); ctx.ellipse(bx - 5, by - b.size, 3, 7, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(bx + 5, by - b.size, 3, 7, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,180,200,0.6)';
    ctx.beginPath(); ctx.ellipse(bx - 5, by - b.size, 1.5, 4, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(bx + 5, by - b.size, 1.5, 4, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0f0'; ctx.shadowColor = '#0f0'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(bx - 4, by - 3, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + 4, by - 3, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f68'; ctx.beginPath(); ctx.arc(bx, by + 2, 2, 0, Math.PI * 2); ctx.fill();
  });
}

function drawP2Monkeys(ctx) {
  p2.monkeys.forEach(a => {
    const ax = a.x - p2.cam.x, ay = a.y - p2.cam.y;
    if (a.aggro) { ctx.shadowColor = 'rgba(255,40,40,0.7)'; ctx.shadowBlur = 16; }
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(ax, ay + a.size - 2, a.size - 2, 5, 0, 0, Math.PI * 2); ctx.fill();
    const mg = ctx.createRadialGradient(ax - 4, ay - 4, 2, ax, ay, a.size);
    mg.addColorStop(0, '#a06030'); mg.addColorStop(1, '#5a3010');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(ax, ay, a.size, 0, Math.PI * 2); ctx.fill();
    const fg = ctx.createRadialGradient(ax - 2, ay - a.size * 0.3 - 2, 1, ax, ay - a.size * 0.3, a.size * 0.75);
    fg.addColorStop(0, '#c07840'); fg.addColorStop(1, '#7a4018');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(ax, ay - a.size * 0.3, a.size * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = '#f00'; ctx.shadowBlur = 10; ctx.fillStyle = '#ff2020';
    ctx.beginPath(); ctx.arc(ax - 5, ay - a.size * 0.3 - 2, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ax + 5, ay - a.size * 0.3 - 2, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#200'; ctx.beginPath(); ctx.arc(ax - 5, ay - a.size * 0.3 - 2, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ax + 5, ay - a.size * 0.3 - 2, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(ax - 13, ay - a.size - 9, 26, 5);
    ctx.fillStyle = a.hp / a.maxhp > 0.5 ? '#4f4' : '#f44'; ctx.fillRect(ax - 13, ay - a.size - 9, 26 * (a.hp / a.maxhp), 5);
  });
}

function drawP2MiniBoss(ctx) {
  if (!p2.miniBoss.alive) return;
  const bx = p2.miniBoss.x - p2.cam.x, by = p2.miniBoss.y - p2.cam.y;
  const flash = p2.miniBoss.charging && Math.floor(Date.now() / 80) % 2 === 0;
  ctx.shadowColor = flash ? 'rgba(255,100,0,0.8)' : 'rgba(180,0,0,0.5)';
  ctx.shadowBlur = flash ? 35 : 20;
  ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(bx, by + p2.miniBoss.size - 2, p2.miniBoss.size + 4, 10, 0, 0, Math.PI * 2); ctx.fill();
  if (flash) { ctx.shadowColor = '#ff6000'; ctx.shadowBlur = 30; }
  const bossg = ctx.createRadialGradient(bx - 8, by - 8, 4, bx, by, p2.miniBoss.size);
  bossg.addColorStop(0, flash ? '#ff8020' : '#c06020');
  bossg.addColorStop(0.7, flash ? '#aa4010' : '#7a3810');
  bossg.addColorStop(1, '#4a1a05');
  ctx.fillStyle = bossg; ctx.beginPath(); ctx.arc(bx, by, p2.miniBoss.size, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.arc(bx + Math.cos(a) * p2.miniBoss.size * 0.75, by + Math.sin(a) * p2.miniBoss.size * 0.75, 5, 0, Math.PI * 2); ctx.fill(); }
  ctx.shadowBlur = 0;
  ctx.shadowColor = '#f00'; ctx.shadowBlur = 20; ctx.fillStyle = '#ff0000';
  ctx.beginPath(); ctx.arc(bx - 12, by - 10, 9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(bx + 12, by - 10, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#200'; ctx.beginPath(); ctx.arc(bx - 12, by - 10, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(bx + 12, by - 10, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(bx - 14, by - 12, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(bx + 10, by - 12, 2, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffe';
  ctx.fillRect(bx - 10, by + 5, 7, 10); ctx.fillRect(bx + 3, by + 5, 7, 10);
  ctx.fillStyle = '#ffd700'; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.moveTo(bx - 20, by - p2.miniBoss.size + 5);
  ctx.lineTo(bx - 20, by - p2.miniBoss.size - 8); ctx.lineTo(bx - 12, by - p2.miniBoss.size);
  ctx.lineTo(bx, by - p2.miniBoss.size - 14); ctx.lineTo(bx + 12, by - p2.miniBoss.size);
  ctx.lineTo(bx + 20, by - p2.miniBoss.size - 8); ctx.lineTo(bx + 20, by - p2.miniBoss.size + 5);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ff6060';
  ctx.beginPath(); ctx.arc(bx - 14, by - p2.miniBoss.size - 4, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(bx, by - p2.miniBoss.size - 10, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(bx + 14, by - p2.miniBoss.size - 4, 3, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(bx - 42, by - p2.miniBoss.size - 22, 84, 10);
  ctx.fillStyle = `hsl(${(p2.miniBoss.hp / p2.miniBoss.maxhp) * 120},100%,50%)`;
  ctx.fillRect(bx - 42, by - p2.miniBoss.size - 22, 84 * (p2.miniBoss.hp / p2.miniBoss.maxhp), 10);
  ctx.strokeStyle = 'rgba(255,100,0,0.5)'; ctx.strokeRect(bx - 42, by - p2.miniBoss.size - 22, 84, 10);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Share Tech Mono,monospace'; ctx.textAlign = 'center';
  ctx.fillText(`👑 JUNGLE KING  ${p2.miniBoss.hp}/${p2.miniBoss.maxhp}`, bx, by - p2.miniBoss.size - 26);
}

function drawP2Merchants(ctx) {
  p2.VILLAGE_MERCHANTS.forEach(m => {
    const mx2 = m.x - p2.cam.x, my2 = m.y - p2.cam.y;
    if (mx2 < -60 || mx2 > p2.canvas.width + 60 || my2 < -60 || my2 > p2.canvas.height + 60) return;
    const bob = Math.sin(Date.now() * 0.002 + m.bobOffset) * 3;
    const dist = Math.hypot(p2.player.x - m.x, p2.player.y - m.y);
    if (dist < p2.TILE * 2.5) {
      ctx.shadowColor = 'rgba(255,210,60,0.8)'; ctx.shadowBlur = 22;
      ctx.strokeStyle = 'rgba(255,200,50,0.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mx2, my2 + bob, 22, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0; ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(mx2 - 28, my2 + bob - 44, 56, 18);
      ctx.fillStyle = '#ffd'; ctx.font = 'bold 10px Share Tech Mono,monospace';
      ctx.textAlign = 'center'; ctx.fillText('CLICK to trade', mx2, my2 + bob - 30);
    }
    ctx.fillStyle = m.color; ctx.beginPath(); ctx.arc(mx2, my2 + bob, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.arc(mx2, my2 + bob + 4, 16, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#f5d090'; ctx.beginPath(); ctx.arc(mx2, my2 + bob - 14, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(mx2 - 3, my2 + bob - 15, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx2 + 3, my2 + bob - 15, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.font = '14px serif'; ctx.textAlign = 'center';
    ctx.fillText(m.emoji, mx2, my2 + bob - 26);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(mx2 - 28, my2 + bob + 22, 56, 14);
    ctx.fillStyle = '#ffd'; ctx.font = '8px Share Tech Mono,monospace';
    ctx.textAlign = 'center'; ctx.fillText(m.name.split(' ')[0], mx2, my2 + bob + 32);
  });
}

function drawP2Resources(ctx) {
  p2.resources.forEach(r => {
    if (r.hidden && !p2.p2state.mapRevealed) return;
    const sx = r.x * p2.TILE + p2.TILE / 2 - p2.cam.x, sy = r.y * p2.TILE + p2.TILE / 2 - p2.cam.y;
    ctx.shadowColor = 'rgba(200,255,100,0.5)'; ctx.shadowBlur = 10;
    ctx.font = '22px serif'; ctx.textAlign = 'center'; ctx.fillText(r.label, sx, sy + 7);
    ctx.shadowBlur = 0;
    if (r.hp < r.maxhp) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx - 11, sy + 10, 22, 5);
      ctx.fillStyle = '#4f4'; ctx.fillRect(sx - 11, sy + 10, 22 * (r.hp / r.maxhp), 5);
      ctx.strokeStyle = 'rgba(0,200,0,0.3)'; ctx.strokeRect(sx - 11, sy + 10, 22, 5);
    }
  });
}

function drawP2Particles(ctx) {
  p2.particles.forEach(p => {
    ctx.globalAlpha = p.life / 35;
    ctx.shadowColor = p.color; ctx.shadowBlur = 8;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x - p2.cam.x, p.y - p2.cam.y, 3.5, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
}

function drawP2Player(ctx) {
  const px = p2.player.x - p2.cam.x, py = p2.player.y - p2.cam.y;
  const pFlash = p2.player.invincible > 0 && Math.floor(Date.now() / 80) % 2 === 0;
  if (!pFlash) {
    drawPlayerSkin(ctx, px, py, p2.player.size);
    if (save.items.includes('banana_sword')) {
      ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10;
      ctx.font = '18px serif'; ctx.textAlign = 'left'; ctx.fillText('🍌', px + p2.player.size - 2, py - 2);
      ctx.shadowBlur = 0;
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(px - 21, py - p2.player.size - 11, 42, 6);
  const hpPct = save.hp / save.maxHp;
  ctx.fillStyle = hpPct > 0.5 ? 'rgba(50,220,80,0.9)' : hpPct > 0.25 ? 'rgba(255,170,0,0.9)' : 'rgba(255,60,60,0.9)';
  ctx.fillRect(px - 21, py - p2.player.size - 11, 42 * hpPct, 6);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.strokeRect(px - 21, py - p2.player.size - 11, 42, 6);
}

// ── Cutscene Functions ───────────────────────────────────
function playP2DrinkSound() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const gulps = [0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780, 840, 900, 960, 1020, 1080, 1140, 1200];
    gulps.forEach((t, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      const pitch = 280 + Math.sin(i * 1.3) * 80 + (i % 3) * 40;
      o.frequency.setValueAtTime(pitch, ac.currentTime + t / 1000);
      o.frequency.exponentialRampToValueAtTime(pitch * 0.6, ac.currentTime + t / 1000 + 0.07);
      g.gain.setValueAtTime(0.18, ac.currentTime + t / 1000);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t / 1000 + 0.09);
      o.type = 'sine';
      o.start(ac.currentTime + t / 1000);
      o.stop(ac.currentTime + t / 1000 + 0.1);
    });
  } catch (e) { }
}

function drawP2Cutscene(ctx) {
  if (!p2.cutscene.active) return;
  const c = p2.cutscene;
  c.timer++;

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, p2.canvas.width, 80);
  ctx.fillRect(0, p2.canvas.height - 80, p2.canvas.width, 80);

  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, p2.canvas.height - 80, p2.canvas.width, 80);

  if (c.phase === 'walkin') {
    c.gx += 1.5;
    c.facing = 1;
    ctx.fillStyle = '#ddd'; ctx.font = '13px Courier New'; ctx.textAlign = 'center';
    ctx.fillText('A tiny gerbil emerges from the jungle...', p2.canvas.width / 2, p2.canvas.height - 48);
    if (c.gx >= c.potionX - 30) { c.phase = 'drink'; c.timer = 0; }
  }
  else if (c.phase === 'drink') {
    if (!c.drinkStarted) { c.drinkStarted = true; playP2DrinkSound(); }
    c.gy = p2.canvas.height / 2 + 60 + Math.sin(c.timer * 0.4) * 3;
    const drinkProgress = Math.min(1, c.timer / 80);
    c.potionVisible = drinkProgress < 1;
    const caption = c.timer < 40 ? 'It found a mysterious potion!' : 'Glug glug glug...';
    ctx.fillStyle = '#ddd'; ctx.font = '13px Courier New'; ctx.textAlign = 'center';
    ctx.fillText(caption, p2.canvas.width / 2, p2.canvas.height - 48);
    if (c.potionVisible) {
      const ps = 1 - drinkProgress * 0.8;
      ctx.save();
      ctx.translate(c.potionX + 12, c.potionY - 10);
      ctx.scale(ps, ps);
      ctx.font = '28px serif'; ctx.textAlign = 'center';
      ctx.fillText('🧪', 0, 0);
      ctx.restore();
    }
    if (c.timer >= 90) { c.phase = 'grow'; c.timer = 0; }
  }
  else if (c.phase === 'grow') {
    c.targetSize = Math.min(52, 10 + c.timer * 0.7);
    c.gSize += (c.targetSize - c.gSize) * 0.15;
    const shake = c.timer < 40 ? (Math.random() - 0.5) * 4 : 0;
    c.gx += shake * 0.3;
    if (c.timer === 30) {
      ctx.fillStyle = 'rgba(180,0,255,0.3)';
      ctx.fillRect(0, 0, p2.canvas.width, p2.canvas.height);
    }
    const caption = c.timer < 20 ? '...' : c.timer < 45 ? 'Something is happening!!' : 'IT\'S GROWING!!!';
    ctx.fillStyle = c.timer > 44 ? '#f8f' : '#ddd';
    ctx.font = c.timer > 44 ? 'bold 14px Courier New' : '13px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(caption, p2.canvas.width / 2, p2.canvas.height - 48);
    if (c.timer >= 80) { c.phase = 'walkout'; c.timer = 0; c.facing = -1; }
  }
  else if (c.phase === 'walkout') {
    c.gx -= 2.5;
    c.facing = -1;
    ctx.fillStyle = '#f88'; ctx.font = 'bold 13px Courier New'; ctx.textAlign = 'center';
    ctx.fillText('The Nuclear Gerbil lumbers away into the darkness...', p2.canvas.width / 2, p2.canvas.height - 48);
    if (c.gx < -80) { c.phase = 'done'; c.active = false; gamePaused = false; }
  }

  // Draw gerbil
  const gx = c.gx, gy = c.gy;
  const s = c.gSize;
  ctx.save();
  ctx.translate(gx, gy);
  if (c.facing === -1) ctx.scale(-1, 1);
  ctx.fillStyle = c.phase === 'grow' && c.timer > 30 ? '#d4a' : '#c8954a';
  ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.75, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.phase === 'grow' && c.timer > 30 ? '#c9a' : '#c8954a';
  ctx.beginPath(); ctx.arc(s * 0.7, -s * 0.2, s * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8b06a';
  ctx.beginPath(); ctx.ellipse(s * 0.55, -s * 0.7, s * 0.18, s * 0.28, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(s * 0.9, -s * 0.65, s * 0.15, s * 0.25, 0.3, 0, Math.PI * 2); ctx.fill();
  const eyeColor = c.phase === 'grow' && c.gSize > 30 ? '#f00' : (c.phase === 'walkout' ? '#f00' : '#222');
  if (c.phase === 'grow' && c.gSize > 30 || c.phase === 'walkout') {
    ctx.shadowColor = '#f00'; ctx.shadowBlur = 8;
  }
  ctx.fillStyle = eyeColor;
  ctx.beginPath(); ctx.arc(s * 0.58, -s * 0.28, s * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#d06060';
  ctx.beginPath(); ctx.arc(s * 1.18, -s * 0.18, s * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#a07040'; ctx.lineWidth = Math.max(2, s * 0.12);
  ctx.beginPath(); ctx.moveTo(-s * 0.8, 0); ctx.quadraticCurveTo(-s * 1.3, -s * 0.6, -s * 1.0, -s * 0.9); ctx.stroke();
  const legSwing = Math.sin(c.timer * 0.25) * 0.4;
  ctx.strokeStyle = '#a07040'; ctx.lineWidth = Math.max(1.5, s * 0.1);
  ctx.beginPath(); ctx.moveTo(-s * 0.2, s * 0.5); ctx.lineTo(-s * 0.2 + Math.sin(legSwing) * s * 0.4, s * 0.5 + s * 0.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(s * 0.2, s * 0.5); ctx.lineTo(s * 0.2 + Math.sin(-legSwing) * s * 0.4, s * 0.5 + s * 0.5); ctx.stroke();
  ctx.restore();
}

// ── Main Draw Function ───────────────────────────────────
function drawP2(ctx) {
  // Background
  const bgG = ctx.createLinearGradient(0, 0, 0, p2.canvas.height);
  bgG.addColorStop(0, '#040c04'); bgG.addColorStop(1, '#060e06');
  ctx.fillStyle = bgG; ctx.fillRect(0, 0, p2.canvas.width, p2.canvas.height);

  // Tiles
  for (let ty = 0; ty < p2.ROWS; ty++) {
    for (let tx = 0; tx < p2.COLS; tx++) {
      drawP2Tile(ctx, tx, ty);
    }
  }

  // Parrots
  drawP2Parrots(ctx);

  // Golems
  drawP2Golems(ctx);

  // Lizards
  drawP2Lizards(ctx);

  // Panthers
  drawP2Panthers(ctx);

  // Village huts
  drawP2Hut(ctx, 25 * p2.TILE + 2, 2 * p2.TILE);
  drawP2Hut(ctx, 28 * p2.TILE + 2, 2 * p2.TILE);
  drawP2Hut(ctx, 25 * p2.TILE + 2, 7 * p2.TILE);
  drawP2Hut(ctx, 28 * p2.TILE + 2, 7 * p2.TILE);
  drawP2Hut(ctx, 25 * p2.TILE + 2, 12 * p2.TILE);
  drawP2Hut(ctx, 28 * p2.TILE + 2, 12 * p2.TILE);

  // Village stalls
  drawP2Stall(ctx, 26 * p2.TILE + 2, 6 * p2.TILE + 20);
  drawP2Stall(ctx, 26 * p2.TILE + 2, 11 * p2.TILE + 20);

  // Village signs
  drawP2Sign(ctx, 21 * p2.TILE + 20, 3 * p2.TILE, '🌿 TREETOP', 'VILLAGE →');
  drawP2Sign(ctx, 21 * p2.TILE + 20, 9 * p2.TILE, '🌿 TREETOP', 'VILLAGE →');
  drawP2Sign(ctx, 24 * p2.TILE + 20, 3 * p2.TILE, '🏡 WELCOME', 'SAFE ZONE');
  drawP2Sign(ctx, 24 * p2.TILE + 20, 9 * p2.TILE, '🏡 WELCOME', 'SAFE ZONE');

  // Lantern posts
  [[24, 4], [27, 4], [24, 8], [27, 8], [24, 12], [27, 12], [24, 16], [27, 16]].forEach(([tx, ty]) => {
    drawP2LanternPost(ctx, tx * p2.TILE + 20, ty * p2.TILE + 20);
  });

  // Resources
  drawP2Resources(ctx);

  // Bunnies
  drawP2Bunnies(ctx);

  // Merchants
  drawP2Merchants(ctx);

  // Monkeys
  drawP2Monkeys(ctx);

  // Boss
  drawP2MiniBoss(ctx);

  // Particles
  drawP2Particles(ctx);

  // Player
  drawP2Player(ctx);

  // Launch ready banner
  if (save.resources.fuel >= 15 && p2.p2state.bossDead && save.items.includes('rocket_upgrade')) {
    ctx.fillStyle = 'rgba(255,220,0,.9)'; ctx.font = 'bold 14px Courier New'; ctx.textAlign = 'center';
    ctx.fillText('🚀 ROCKET READY! 15 fuel + upgrade collected! Press M to see map.', p2.canvas.width / 2, 28);
  }

  // Paused overlay
  if (gamePaused && !p2.cutscene.active) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, p2.canvas.width, p2.canvas.height);
  }

  // Cutscene
  if (p2.cutscene.active) drawP2Cutscene(ctx);
}
