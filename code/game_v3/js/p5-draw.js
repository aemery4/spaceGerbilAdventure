// ════════════════════════════════════════
// js/p5-draw.js — Planet 5 Draw Layer
// Home Planet — peaceful base rendering
// ════════════════════════════════════════

// Uses shared p5 state from p5-logic.js

// ── Draw Map Tiles ───────────────────────────────────────
function drawP5Map(ctx) {
  const t0 = Date.now();
  for (let r = 0; r < p5.ROWS; r++) {
    for (let c = 0; c < p5.COLS; c++) {
      const x = c * p5.TILE, y = r * p5.TILE;
      const t = p5.map[r][c];

      // 0 = grass
      if (t === 0) {
        const gg = ctx.createLinearGradient(x, y, x, y + p5.TILE);
        gg.addColorStop(0, '#3a8a3a'); gg.addColorStop(1, '#2d7a2d');
        ctx.fillStyle = gg; ctx.fillRect(x, y, p5.TILE, p5.TILE);
        // grass tufts
        if ((c * 7 + r * 11) % 5 === 0) {
          ctx.fillStyle = 'rgba(50,140,50,0.4)';
          ctx.beginPath(); ctx.ellipse(x + p5.TILE * 0.3, y + p5.TILE * 0.6, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
        }
        if ((c * 3 + r * 7) % 8 === 0) {
          ctx.fillStyle = 'rgba(80,180,60,0.3)';
          ctx.beginPath(); ctx.ellipse(x + p5.TILE * 0.7, y + p5.TILE * 0.4, 3, 2, 0.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = 'rgba(30,80,30,0.15)'; ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, p5.TILE, p5.TILE); ctx.lineWidth = 1;
      }

      // 1 = fence
      if (t === 1) {
        ctx.fillStyle = '#5a4020'; ctx.fillRect(x, y, p5.TILE, p5.TILE);
        // fence posts
        ctx.fillStyle = '#7a5a30';
        ctx.fillRect(x + 2, y + 4, 6, p5.TILE - 8);
        ctx.fillRect(x + p5.TILE - 8, y + 4, 6, p5.TILE - 8);
        // horizontal rails
        ctx.fillStyle = '#8a6a40';
        ctx.fillRect(x, y + 10, p5.TILE, 4);
        ctx.fillRect(x, y + p5.TILE - 14, p5.TILE, 4);
        ctx.strokeStyle = 'rgba(40,20,0,0.3)'; ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, p5.TILE, p5.TILE); ctx.lineWidth = 1;
      }

      // 2 = path
      if (t === 2) {
        const pg = ctx.createLinearGradient(x, y, x + p5.TILE, y);
        pg.addColorStop(0, '#c8b080'); pg.addColorStop(0.5, '#d4c090'); pg.addColorStop(1, '#c8b080');
        ctx.fillStyle = pg; ctx.fillRect(x, y, p5.TILE, p5.TILE);
        // cobblestone texture
        if ((c + r) % 2 === 0) {
          ctx.strokeStyle = 'rgba(160,130,80,0.4)'; ctx.lineWidth = 0.8;
          ctx.strokeRect(x + 3, y + 3, p5.TILE / 2 - 4, p5.TILE / 2 - 4);
          ctx.strokeRect(x + p5.TILE / 2 + 1, y + p5.TILE / 2 + 1, p5.TILE / 2 - 4, p5.TILE / 2 - 4);
          ctx.lineWidth = 1;
        }
      }

      // 3 = pond
      if (t === 3) {
        ctx.fillStyle = '#1a5a8a'; ctx.fillRect(x, y, p5.TILE, p5.TILE);
        const wg = ctx.createRadialGradient(x + p5.TILE / 2, y + p5.TILE / 2, 2, x + p5.TILE / 2, y + p5.TILE / 2, p5.TILE / 2);
        wg.addColorStop(0, 'rgba(100,180,255,0.4)'); wg.addColorStop(1, 'rgba(20,80,140,0.2)');
        ctx.fillStyle = wg; ctx.fillRect(x, y, p5.TILE, p5.TILE);
        // ripple
        const ripple = Math.sin(t0 * 0.002 + c + r) * 0.2 + 0.3;
        ctx.strokeStyle = `rgba(150,220,255,${ripple})`; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.ellipse(x + p5.TILE / 2, y + p5.TILE / 2, p5.TILE / 3, p5.TILE / 5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1;
      }

      // 4 = garden
      if (t === 4) {
        ctx.fillStyle = '#4a3018'; ctx.fillRect(x, y, p5.TILE, p5.TILE);
        // soil rows
        ctx.fillStyle = '#5a3a20';
        for (let i = 0; i < 3; i++) ctx.fillRect(x + 2, y + 4 + i * 13, p5.TILE - 4, 8);
        // flowers
        const flowers = ['🌸', '🌻', '🌷'];
        ctx.font = '10px serif'; ctx.textAlign = 'center';
        ctx.fillText(flowers[(c + r) % 3], x + p5.TILE * 0.3, y + p5.TILE * 0.4);
        ctx.fillText(flowers[(c + r + 1) % 3], x + p5.TILE * 0.7, y + p5.TILE * 0.7);
      }

      // 5 = building (drawn separately by drawP5Buildings)
    }
  }
}

// ── Draw Buildings ───────────────────────────────────────
function drawP5Buildings(ctx) {
  const t0 = Date.now();
  if (!save.homePlanet || !save.homePlanet.buildings) return;

  save.homePlanet.buildings.forEach(b => {
    const info = P5_BUILDINGS.find(pb => pb.type === b.type);
    if (!info) return;
    const x = b.gridX * p5.TILE, y = b.gridY * p5.TILE;
    const w = info.w * p5.TILE, h = info.h * p5.TILE;

    if (b.type === 'hut') {
      // Purple/gray house with windows
      ctx.fillStyle = '#4a3a6a'; ctx.fillRect(x + 4, y + h * 0.3, w - 8, h * 0.7 - 4);
      // Roof
      ctx.fillStyle = '#6a4a8a';
      ctx.beginPath(); ctx.moveTo(x, y + h * 0.3); ctx.lineTo(x + w / 2, y + 4); ctx.lineTo(x + w, y + h * 0.3); ctx.closePath(); ctx.fill();
      // Windows
      ctx.fillStyle = '#ffe080';
      const winGlow = Math.sin(t0 * 0.002) * 0.2 + 0.8;
      ctx.shadowColor = `rgba(255,220,80,${winGlow})`; ctx.shadowBlur = 8;
      ctx.fillRect(x + 12, y + h * 0.45, 14, 12);
      ctx.fillRect(x + w - 26, y + h * 0.45, 14, 12);
      ctx.shadowBlur = 0;
      // Door
      ctx.fillStyle = '#3a2a18'; ctx.fillRect(x + w / 2 - 8, y + h - 24, 16, 20);
    }

    if (b.type === 'farm') {
      // Green field with crops
      ctx.fillStyle = '#5a8a30'; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
      ctx.strokeStyle = '#4a7020'; ctx.lineWidth = 1;
      for (let i = 1; i < info.w * 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * p5.TILE / 2, y + 4); ctx.lineTo(x + i * p5.TILE / 2, y + h - 4); ctx.stroke(); }
      // Crop emojis
      ctx.font = '16px serif'; ctx.textAlign = 'center';
      ctx.fillText('🌽', x + w * 0.25, y + h * 0.4);
      ctx.fillText('🥕', x + w * 0.5, y + h * 0.6);
      ctx.fillText('🌾', x + w * 0.75, y + h * 0.4);
    }

    if (b.type === 'shop') {
      // Storefront
      ctx.fillStyle = '#8a5020'; ctx.fillRect(x + 2, y + h * 0.2, w - 4, h * 0.8 - 2);
      // Awning
      ctx.fillStyle = '#e04040';
      ctx.fillRect(x, y + h * 0.15, w, h * 0.15);
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 4; i++) ctx.fillRect(x + i * w / 4 + 2, y + h * 0.15, w / 8, h * 0.15);
      // Sign
      ctx.fillStyle = '#ffe080'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('SHOP', x + w / 2, y + h * 0.12);
      // Door
      ctx.fillStyle = '#4a2a10'; ctx.fillRect(x + w / 2 - 10, y + h - 26, 20, 24);
    }

    if (b.type === 'arcade') {
      // Neon arcade box
      const neon = Math.sin(t0 * 0.005) * 0.3 + 0.7;
      ctx.fillStyle = '#1a1a3a'; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
      ctx.shadowColor = `rgba(255,0,255,${neon})`; ctx.shadowBlur = 14;
      ctx.strokeStyle = `rgba(255,100,255,${neon})`; ctx.lineWidth = 2;
      ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
      ctx.shadowBlur = 0; ctx.lineWidth = 1;
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('🕹️ ARCADE', x + w / 2, y + h / 2 + 4);
    }

    if (b.type === 'landing') {
      // Landing pad
      ctx.fillStyle = '#555'; ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
      ctx.strokeStyle = '#ff0'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
      ctx.setLineDash([]); ctx.lineWidth = 1;
      // H marker
      ctx.fillStyle = '#ff0'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('H', x + w / 2, y + h / 2 + 8);
    }

    if (b.type === 'fountain') {
      // Fountain base
      ctx.fillStyle = '#888'; ctx.beginPath();
      ctx.ellipse(x + p5.TILE / 2, y + p5.TILE * 0.7, p5.TILE / 2 - 4, p5.TILE / 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a8acc';
      ctx.beginPath(); ctx.ellipse(x + p5.TILE / 2, y + p5.TILE * 0.65, p5.TILE / 3, p5.TILE / 5, 0, 0, Math.PI * 2); ctx.fill();
      // Water jet
      const jh = Math.sin(t0 * 0.004) * 4 + 10;
      ctx.fillStyle = 'rgba(100,180,255,0.7)';
      ctx.fillRect(x + p5.TILE / 2 - 2, y + p5.TILE * 0.5 - jh, 4, jh);
      // Sparkle
      ctx.fillStyle = 'rgba(200,230,255,0.8)';
      ctx.beginPath(); ctx.arc(x + p5.TILE / 2, y + p5.TILE * 0.5 - jh, 3, 0, Math.PI * 2); ctx.fill();
    }
  });
}

// ── Draw Alien Visitors ──────────────────────────────────
function drawP5Aliens(ctx) {
  const t0 = Date.now();
  p5.aliens.forEach(a => {
    const x = a.x, y = a.y;
    const bob = Math.sin(t0 * 0.003 + a.x * 0.01) * 3;

    // Proximity glow
    const dist = Math.hypot(p5.player.x - a.x, p5.player.y - a.y);
    if (dist < p5.TILE * 2.5) {
      ctx.shadowColor = a.color; ctx.shadowBlur = 16;
      ctx.strokeStyle = a.color + '66'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y + bob, 20, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0; ctx.lineWidth = 1;
      // "Click to talk" label
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x - 30, y + bob - 38, 60, 14);
      ctx.fillStyle = '#cef'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('CLICK to talk', x, y + bob - 28);
    }

    // Body
    const ag = ctx.createRadialGradient(x - 3, y + bob - 3, 2, x, y + bob, 16);
    ag.addColorStop(0, a.color); ag.addColorStop(0.7, a.color + 'aa'); ag.addColorStop(1, a.color + '44');
    ctx.fillStyle = ag;
    ctx.beginPath(); ctx.arc(x, y + bob, 16, 0, Math.PI * 2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - 5, y + bob - 4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 5, y + bob - 4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(x - 4, y + bob - 4, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 6, y + bob - 4, 2, 0, Math.PI * 2); ctx.fill();
    // Emoji badge
    ctx.font = '14px serif'; ctx.textAlign = 'center';
    ctx.fillText(a.emoji, x, y + bob - 20);
    // Name
    ctx.fillStyle = a.color; ctx.font = 'bold 9px sans-serif';
    ctx.fillText(a.name, x, y + bob + 26);
  });
}

// ── Draw Build Mode Overlay ──────────────────────────────
function drawP5BuildOverlay(ctx) {
  if (p5.mode !== 'build') return;

  // Grid overlay
  for (let r = 1; r < p5.ROWS - 1; r++) {
    for (let c = 1; c < p5.COLS - 1; c++) {
      const x = c * p5.TILE, y = r * p5.TILE;
      const canPlace = p5.map[r][c] === 0; // only on grass
      ctx.fillStyle = canPlace ? 'rgba(0,255,0,0.1)' : 'rgba(255,0,0,0.1)';
      ctx.fillRect(x, y, p5.TILE, p5.TILE);
      ctx.strokeStyle = canPlace ? 'rgba(0,255,0,0.3)' : 'rgba(255,0,0,0.2)';
      ctx.lineWidth = 0.5; ctx.strokeRect(x, y, p5.TILE, p5.TILE); ctx.lineWidth = 1;
    }
  }

  // Build mode label
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(300, 4, 200, 24);
  ctx.fillStyle = '#fa0'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('🔨 BUILD MODE — Click grass to place', 400, 20);
}

// ── Draw Minigame (Rock Paper Scissors) ──────────────────
function drawP5Minigame(ctx) {
  if (p5.mode !== 'minigame') return;

  // Darken background
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, 800, 520);

  ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';

  if (p5.rpsPhase === 'choose') {
    ctx.fillText('Rock, Paper, Scissors!', 400, 80);
    ctx.fillStyle = '#aaa'; ctx.font = '14px sans-serif';
    ctx.fillText(`Score: You ${p5.rpsPlayerWins} — Alien ${p5.rpsAlienWins}  (Best of 3)`, 400, 110);

    // Draw choices as buttons
    const choices = [
      { emoji: '🪨', label: 'Rock', x: 200 },
      { emoji: '📄', label: 'Paper', x: 400 },
      { emoji: '✂️', label: 'Scissors', x: 600 },
    ];
    choices.forEach(ch => {
      const hover = p5.rpsHover === ch.label.toLowerCase();
      ctx.fillStyle = hover ? 'rgba(255,200,50,0.3)' : 'rgba(40,40,80,0.8)';
      ctx.fillRect(ch.x - 60, 160, 120, 140);
      ctx.strokeStyle = hover ? '#fa0' : '#55f'; ctx.lineWidth = 2;
      ctx.strokeRect(ch.x - 60, 160, 120, 140); ctx.lineWidth = 1;
      ctx.font = '48px serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.fillText(ch.emoji, ch.x, 240);
      ctx.font = 'bold 16px sans-serif'; ctx.fillText(ch.label, ch.x, 280);
    });
    ctx.fillStyle = '#888'; ctx.font = '12px sans-serif';
    ctx.fillText('Click your choice!', 400, 340);
  }

  if (p5.rpsPhase === 'result') {
    const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };
    ctx.fillText('You chose: ' + emojis[p5.rpsPlayerChoice], 400, 120);
    ctx.fillText('Alien chose: ' + emojis[p5.rpsAlienChoice], 400, 160);

    ctx.font = 'bold 28px sans-serif';
    if (p5.rpsRoundResult === 'win') { ctx.fillStyle = '#4f4'; ctx.fillText('You Win This Round!', 400, 230); }
    else if (p5.rpsRoundResult === 'lose') { ctx.fillStyle = '#f44'; ctx.fillText('Alien Wins This Round!', 400, 230); }
    else { ctx.fillStyle = '#ff0'; ctx.fillText('Draw!', 400, 230); }

    ctx.fillStyle = '#aaa'; ctx.font = '14px sans-serif';
    ctx.fillText(`Score: You ${p5.rpsPlayerWins} — Alien ${p5.rpsAlienWins}`, 400, 270);
    ctx.fillText('Click to continue...', 400, 310);
  }

  if (p5.rpsPhase === 'gameover') {
    const won = p5.rpsPlayerWins >= 2;
    ctx.font = 'bold 32px sans-serif';
    ctx.fillStyle = won ? '#FFD700' : '#f44';
    ctx.fillText(won ? '🎉 YOU WIN! +25 Space Coins!' : '😢 Alien Wins! Better luck next time!', 400, 200);
    ctx.fillStyle = '#aaa'; ctx.font = '16px sans-serif';
    ctx.fillText(`Final Score: You ${p5.rpsPlayerWins} — Alien ${p5.rpsAlienWins}`, 400, 260);
    ctx.fillText('Click to close', 400, 300);
  }
}

// ── Draw Player ──────────────────────────────────────────
function drawP5Player(ctx) {
  drawPlayerSkin(ctx, p5.player.x, p5.player.y, p5.player.size);
}

// ── Main Draw Function ───────────────────────────────────
function drawP5(ctx) {
  // Clear canvas
  ctx.fillStyle = '#2a6a2a'; ctx.fillRect(0, 0, 800, 520);

  drawP5Map(ctx);
  drawP5Buildings(ctx);
  drawP5Aliens(ctx);
  drawP5Player(ctx);
  drawP5BuildOverlay(ctx);
  drawP5Minigame(ctx);
}
