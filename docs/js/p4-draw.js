// ════════════════════════════════════════
// js/p4-draw.js — Planet 4 Draw Layer
// Aquatic Planet Neptuna — all rendering
// ════════════════════════════════════════

// Uses shared p4 state from p4-logic.js

// ── Draw Map Tiles ───────────────────────────────────────
function drawP4Map(ctx) {
  for (let r = 0; r < p4.ROWS; r++) {
    for (let c = 0; c < p4.COLS; c++) {
      const x = c * p4.TILE - p4.cam.x, y = r * p4.TILE - p4.cam.y;
      if (x < -p4.TILE || x > 800 || y < -p4.TILE || y > 520) continue;

      if (p4.map[r][c] === 1) {
        ctx.fillStyle = '#4A4A4A'; // Rock walls
        ctx.fillRect(x, y, p4.TILE, p4.TILE);
      } else if (p4.map[r][c] === 2) {
        ctx.fillStyle = '#000066'; // Deep trench
        ctx.fillRect(x, y, p4.TILE, p4.TILE);
      } else if (p4.map[r][c] === 3) {
        ctx.fillStyle = '#FF6B9D'; // Coral reefs
        ctx.fillRect(x, y, p4.TILE, p4.TILE);
      }
    }
  }
}

// ── Draw Resources ───────────────────────────────────────
function drawP4Resources(ctx) {
  const colors = { fuel: '#FFD700', rock: '#8B4513', plant: '#32CD32', crystal: '#9370DB' };
  const emojis = { fuel: '⛽', rock: '🪨', plant: '🌿', crystal: '💎' };

  for (let res of p4.resources) {
    if (res.collected) continue;
    const x = res.x - p4.cam.x, y = res.y - p4.cam.y;
    if (x < -20 || x > 820 || y < -20 || y > 540) continue;

    ctx.fillStyle = colors[res.type];
    ctx.fillRect(x - 8, y - 8, 16, 16);
    ctx.fillStyle = '#FFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(emojis[res.type], x, y + 4);
  }
}

// ── Draw Seahorses ───────────────────────────────────────
function drawP4Seahorses(ctx) {
  for (let seahorse of p4.SEAHORSES) {
    const x = seahorse.x - p4.cam.x, y = seahorse.y - p4.cam.y;
    if (x < -20 || x > 820 || y < -20 || y > 540) continue;

    ctx.fillStyle = seahorse.color;
    ctx.fillRect(x - 10, y - 10, 20, 20);
    ctx.fillStyle = '#FFF';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(seahorse.emoji, x, y + 5);

    if (!seahorse.interacted) {
      ctx.fillStyle = '#FFFF00';
      ctx.font = '20px Arial';
      ctx.fillText('!', x, y - 15);
    }
  }
}

// ── Draw Enemies ─────────────────────────────────────────
function drawP4Enemies(ctx) {
  for (let enemy of p4.enemies) {
    if (enemy.hp <= 0) continue;
    const x = enemy.x - p4.cam.x, y = enemy.y - p4.cam.y;
    if (x < -30 || x > 830 || y < -30 || y > 550) continue;

    if (enemy.type === 'squid') {
      ctx.fillStyle = '#8A2BE2';
      ctx.fillRect(x - 8, y - 8, 16, 16);
      ctx.fillStyle = '#FFF';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🦑', x, y + 4);
    } else if (enemy.type === 'piranha') {
      ctx.fillStyle = '#FF4500';
      ctx.fillRect(x - 10, y - 8, 20, 16);
      ctx.fillStyle = '#FFF';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🐟', x, y + 4);
    } else if (enemy.type === 'octopus') {
      ctx.fillStyle = '#800080';
      ctx.fillRect(x - 20, y - 20, 40, 40);
      ctx.fillStyle = '#FFF';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🐙', x, y + 8);
    }

    // Health bar
    if (enemy.hp < enemy.maxHp) {
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(x - 15, y - 25, 30, 4);
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(x - 15, y - 25, 30 * (enemy.hp / enemy.maxHp), 4);
    }
  }
}

// ── Draw Particles ───────────────────────────────────────
function drawP4Particles(ctx) {
  for (let p of p4.particles) {
    const x = p.x - p4.cam.x, y = p.y - p4.cam.y;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / 30;
    ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size);
    ctx.globalAlpha = 1;
  }
}

// ── Draw Player ──────────────────────────────────────────
function drawP4Player(ctx) {
  const px = p4.player.x - p4.cam.x, py = p4.player.y - p4.cam.y;
  if (p4.player.invincible % 10 < 5) {
    ctx.fillStyle = '#00BFFF'; // Scuba suit blue
    ctx.fillRect(px - p4.player.size, py - p4.player.size, p4.player.size * 2, p4.player.size * 2);
    ctx.fillStyle = '#FFF';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🤿', px, py + 5); // Scuba mask emoji
  }
}

// ── Main Draw Function ───────────────────────────────────
function drawP4(ctx) {
  // Background - deep ocean blue
  ctx.fillStyle = '#001133';
  ctx.fillRect(0, 0, 800, 520);

  // Map tiles
  drawP4Map(ctx);

  // Resources
  drawP4Resources(ctx);

  // Seahorses
  drawP4Seahorses(ctx);

  // Enemies
  drawP4Enemies(ctx);

  // Particles
  drawP4Particles(ctx);

  // Player
  drawP4Player(ctx);
}
