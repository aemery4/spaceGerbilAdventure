// ════════════════════════════════════════
// js/p4-draw.js — Planet 4 Draw Layer
// Aquatic Planet Neptuna — all rendering
// ════════════════════════════════════════

// Uses shared p4 state from p4-logic.js

// ── Ambient bubbles (screen-space decoration) ────────────
let p4Bubbles = [];
for (let i = 0; i < 30; i++) {
  p4Bubbles.push({
    x: Math.random() * 800, y: Math.random() * 520,
    r: Math.random() * 3 + 1, speed: Math.random() * 0.5 + 0.2,
    wobble: Math.random() * Math.PI * 2
  });
}

function updateP4Bubbles() {
  p4Bubbles.forEach(b => {
    b.y -= b.speed;
    b.x += Math.sin(b.wobble) * 0.3;
    b.wobble += 0.02;
    if (b.y < -5) { b.y = 525; b.x = Math.random() * 800; }
  });
}

// ── Draw Map Tiles ───────────────────────────────────────
function drawP4Map(ctx) {
  const t0 = Date.now();
  for (let r = 0; r < p4.ROWS; r++) {
    for (let c = 0; c < p4.COLS; c++) {
      const x = c * p4.TILE - p4.cam.x, y = r * p4.TILE - p4.cam.y;
      if (x < -p4.TILE || x > 800 || y < -p4.TILE || y > 520) continue;
      const t = p4.map[r][c];

      // 0 = open water (ocean floor)
      if (t === 0) {
        const wg = ctx.createLinearGradient(x, y, x, y + p4.TILE);
        wg.addColorStop(0, '#0a2244'); wg.addColorStop(1, '#081a38');
        ctx.fillStyle = wg; ctx.fillRect(x, y, p4.TILE, p4.TILE);
        // subtle sand ripple
        if ((c * 7 + r * 11) % 6 === 0) {
          ctx.fillStyle = 'rgba(60,80,120,0.15)';
          ctx.beginPath(); ctx.ellipse(x + p4.TILE / 2, y + p4.TILE * 0.7, p4.TILE / 3, 3, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = 'rgba(30,60,100,0.2)'; ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, p4.TILE, p4.TILE); ctx.lineWidth = 1;
      }

      // 1 = rock wall
      if (t === 1) {
        const rg = ctx.createLinearGradient(x, y, x + p4.TILE, y + p4.TILE);
        rg.addColorStop(0, '#3a4a5a'); rg.addColorStop(1, '#1a2a38');
        ctx.fillStyle = rg; ctx.fillRect(x, y, p4.TILE, p4.TILE);
        // barnacle texture
        ctx.strokeStyle = 'rgba(80,110,140,0.3)'; ctx.lineWidth = 0.8;
        if ((c * 3 + r * 5) % 4 === 0) {
          ctx.beginPath(); ctx.arc(x + 8, y + 10, 4, 0, Math.PI * 2); ctx.stroke();
        }
        if ((c * 7 + r * 3) % 5 === 0) {
          ctx.beginPath(); ctx.arc(x + p4.TILE - 8, y + p4.TILE - 8, 3, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(20,40,60,0.5)'; ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, p4.TILE, p4.TILE); ctx.lineWidth = 1;
      }

      // 2 = deep trench
      if (t === 2) {
        ctx.fillStyle = '#000818'; ctx.fillRect(x, y, p4.TILE, p4.TILE);
        const dg = ctx.createRadialGradient(x + p4.TILE / 2, y + p4.TILE / 2, 1, x + p4.TILE / 2, y + p4.TILE / 2, p4.TILE / 2);
        dg.addColorStop(0, 'rgba(0,10,40,0.8)'); dg.addColorStop(1, 'rgba(0,30,80,0.2)');
        ctx.fillStyle = dg; ctx.fillRect(x, y, p4.TILE, p4.TILE);
        // eerie glow from below
        const pulse = Math.sin(t0 * 0.002 + c * 0.5 + r * 0.3) * 0.08 + 0.1;
        ctx.fillStyle = `rgba(0,80,180,${pulse})`;
        ctx.beginPath(); ctx.ellipse(x + p4.TILE / 2, y + p4.TILE / 2, p4.TILE / 3, p4.TILE / 4, 0, 0, Math.PI * 2); ctx.fill();
      }

      // 3 = coral reef
      if (t === 3) {
        ctx.fillStyle = '#0a2244'; ctx.fillRect(x, y, p4.TILE, p4.TILE);
        // coral branches
        const coralHue = (c * 47 + r * 31) % 3;
        const coralColors = ['#FF6B9D', '#FF8C42', '#E85D75'];
        const coralColor = coralColors[coralHue];
        // main coral body
        const cg = ctx.createRadialGradient(x + p4.TILE / 2, y + p4.TILE * 0.6, 2, x + p4.TILE / 2, y + p4.TILE * 0.6, p4.TILE / 2);
        cg.addColorStop(0, coralColor); cg.addColorStop(0.7, coralColor + '88'); cg.addColorStop(1, 'transparent');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(x + p4.TILE / 2, y + p4.TILE * 0.6, p4.TILE / 2 - 2, 0, Math.PI * 2); ctx.fill();
        // branch shapes
        ctx.fillStyle = coralColor;
        ctx.beginPath(); ctx.moveTo(x + p4.TILE * 0.3, y + p4.TILE); ctx.lineTo(x + p4.TILE * 0.25, y + 4); ctx.lineTo(x + p4.TILE * 0.4, y + p4.TILE * 0.5); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + p4.TILE * 0.6, y + p4.TILE); ctx.lineTo(x + p4.TILE * 0.7, y + 6); ctx.lineTo(x + p4.TILE * 0.8, y + p4.TILE * 0.5); ctx.closePath(); ctx.fill();
        // polyp dots
        ctx.fillStyle = 'rgba(255,255,200,0.5)';
        ctx.beginPath(); ctx.arc(x + p4.TILE * 0.3, y + 8, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + p4.TILE * 0.7, y + 10, 2, 0, Math.PI * 2); ctx.fill();
      }

      // 4 = kelp forest (slows movement)
      if (t === 4) {
        const kg = ctx.createLinearGradient(x, y, x, y + p4.TILE);
        kg.addColorStop(0, '#0a2a18'); kg.addColorStop(1, '#0a2244');
        ctx.fillStyle = kg; ctx.fillRect(x, y, p4.TILE, p4.TILE);
        // swaying kelp fronds
        const sway = Math.sin(t0 * 0.002 + c * 0.8) * 4;
        ctx.strokeStyle = '#2a8a40'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(x + 8, y + p4.TILE); ctx.quadraticCurveTo(x + 8 + sway, y + p4.TILE / 2, x + 10 + sway * 1.5, y + 2); ctx.stroke();
        ctx.strokeStyle = '#1a6a30'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + p4.TILE - 8, y + p4.TILE); ctx.quadraticCurveTo(x + p4.TILE - 8 + sway, y + p4.TILE / 2, x + p4.TILE - 6 + sway * 1.2, y + 4); ctx.stroke();
        ctx.lineWidth = 1;
        // small leaves
        ctx.fillStyle = 'rgba(40,160,60,0.4)';
        ctx.beginPath(); ctx.ellipse(x + 10 + sway * 1.2, y + p4.TILE / 3, 6, 3, sway * 0.05, 0, Math.PI * 2); ctx.fill();
      }

      // 5 = sandy floor
      if (t === 5) {
        ctx.fillStyle = '#2a3828'; ctx.fillRect(x, y, p4.TILE, p4.TILE);
        const sg = ctx.createLinearGradient(x, y, x + p4.TILE, y);
        sg.addColorStop(0, 'rgba(180,160,100,0.15)'); sg.addColorStop(0.5, 'rgba(160,140,80,0.25)'); sg.addColorStop(1, 'rgba(180,160,100,0.15)');
        ctx.fillStyle = sg; ctx.fillRect(x, y, p4.TILE, p4.TILE);
        // sand ripples
        ctx.strokeStyle = 'rgba(180,160,100,0.2)'; ctx.lineWidth = 0.8;
        for (let i = 0; i < 2; i++) {
          const wy = y + 6 + i * 12;
          ctx.beginPath(); ctx.moveTo(x + 2, wy); ctx.quadraticCurveTo(x + p4.TILE / 2, wy - 2, x + p4.TILE - 2, wy); ctx.stroke();
        }
        ctx.lineWidth = 1;
      }

      // 6 = thermal vent
      if (t === 6) {
        ctx.fillStyle = '#0a1830'; ctx.fillRect(x, y, p4.TILE, p4.TILE);
        const lv = Math.sin(t0 * 0.004 + c * 0.5) * 0.5 + 0.5;
        ctx.shadowColor = 'rgba(255,100,0,0.6)'; ctx.shadowBlur = 12;
        ctx.fillStyle = `rgba(180,${40 + lv * 40 | 0},0,0.9)`;
        ctx.beginPath(); ctx.ellipse(x + p4.TILE / 2, y + p4.TILE / 2, p4.TILE / 2 - 4, p4.TILE / 2 - 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(255,180,0,${0.3 + lv * 0.3})`;
        ctx.beginPath(); ctx.ellipse(x + p4.TILE / 2, y + p4.TILE / 2, p4.TILE / 4, p4.TILE / 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 7 = shipwreck floor
      if (t === 7) {
        const wg2 = ctx.createLinearGradient(x, y, x, y + p4.TILE);
        wg2.addColorStop(0, '#3a3020'); wg2.addColorStop(1, '#2a2010');
        ctx.fillStyle = wg2; ctx.fillRect(x, y, p4.TILE, p4.TILE);
        // plank lines
        ctx.strokeStyle = 'rgba(60,50,20,0.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, y + p4.TILE / 3); ctx.lineTo(x + p4.TILE, y + p4.TILE / 3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y + p4.TILE * 2 / 3); ctx.lineTo(x + p4.TILE, y + p4.TILE * 2 / 3); ctx.stroke();
        ctx.lineWidth = 1;
      }
    }
  }
}

// ── Draw Resources ───────────────────────────────────────
function drawP4Resources(ctx) {
  p4.resources.forEach(res => {
    if (res.collected) return;
    const x = res.x - p4.cam.x, y = res.y - p4.cam.y;
    if (x < -20 || x > 820 || y < -20 || y > 540) return;

    // Glow effect
    const glow = res.type === 'fuel' ? 'rgba(255,215,0,0.5)' : res.type === 'crystal' ? 'rgba(147,112,219,0.5)' : 'rgba(100,200,255,0.4)';
    ctx.shadowColor = glow; ctx.shadowBlur = 10;
    ctx.font = '18px serif'; ctx.textAlign = 'center';
    const labels = { fuel: '⛽', rock: '🪨', plant: '🌿', crystal: '💎' };
    ctx.fillText(labels[res.type], x, y + 5);
    ctx.shadowBlur = 0;

    // Resource hp bar (if damaged)
    if (res.hp !== undefined && res.hp < res.maxhp) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 10, y + 9, 20, 3);
      ctx.fillStyle = '#4af'; ctx.fillRect(x - 10, y + 9, 20 * (res.hp / res.maxhp), 3);
    }
  });
}

// ── Draw Seahorses ───────────────────────────────────────
function drawP4Seahorses(ctx) {
  const t0 = Date.now();
  p4.SEAHORSES.forEach(seahorse => {
    const x = seahorse.x - p4.cam.x, y = seahorse.y - p4.cam.y;
    if (x < -30 || x > 830 || y < -30 || y > 550) return;
    const bob = Math.sin(t0 * 0.003 + seahorse.x * 0.01) * 4;

    // Proximity glow
    const dist = Math.hypot(p4.player.x - seahorse.x, p4.player.y - seahorse.y);
    if (dist < p4.TILE * 3) {
      ctx.shadowColor = seahorse.color; ctx.shadowBlur = 18;
      ctx.strokeStyle = seahorse.color + '66'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y + bob, 18, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0; ctx.lineWidth = 1;
    }

    // Body — curved seahorse shape
    const sg = ctx.createRadialGradient(x - 3, y + bob - 3, 2, x, y + bob, 14);
    sg.addColorStop(0, seahorse.color); sg.addColorStop(0.7, seahorse.color + 'aa'); sg.addColorStop(1, seahorse.color + '44');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.ellipse(x, y + bob, 10, 14, 0, 0, Math.PI * 2); ctx.fill();
    // Snout
    ctx.fillStyle = seahorse.color;
    ctx.beginPath(); ctx.ellipse(x + 8, y + bob - 6, 8, 3, 0.3, 0, Math.PI * 2); ctx.fill();
    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x + 2, y + bob - 6, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(x + 3, y + bob - 6, 1.5, 0, Math.PI * 2); ctx.fill();
    // Curled tail
    ctx.strokeStyle = seahorse.color; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - 2, y + bob + 12);
    ctx.quadraticCurveTo(x - 10, y + bob + 20, x - 4, y + bob + 24);
    ctx.quadraticCurveTo(x + 2, y + bob + 26, x, y + bob + 20);
    ctx.stroke(); ctx.lineWidth = 1;
    // Dorsal fin
    ctx.fillStyle = seahorse.color + 'aa';
    ctx.beginPath(); ctx.moveTo(x - 8, y + bob - 4); ctx.lineTo(x - 14, y + bob); ctx.lineTo(x - 8, y + bob + 4); ctx.closePath(); ctx.fill();

    // Interaction indicator
    if (!seahorse.interacted) {
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 16px serif'; ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(255,215,0,0.6)'; ctx.shadowBlur = 8;
      ctx.fillText('!', x, y + bob - 20);
      ctx.shadowBlur = 0;
    }

    // Name label when close
    if (dist < p4.TILE * 2) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x - 30, y + bob + 28, 60, 14);
      ctx.fillStyle = '#cef'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(seahorse.name.split(' ')[0], x, y + bob + 38);
    }
  });
}

// ── Draw Enemies ─────────────────────────────────────────
function drawP4Enemies(ctx) {
  const t0 = Date.now();
  p4.enemies.forEach(enemy => {
    if (enemy.hp <= 0) return;
    const x = enemy.x - p4.cam.x, y = enemy.y - p4.cam.y;
    if (x < -40 || x > 840 || y < -40 || y > 560) return;

    if (enemy.type === 'squid') {
      // Body — gradient teardrop shape
      if (enemy.aggro) { ctx.shadowColor = 'rgba(138,43,226,0.6)'; ctx.shadowBlur = 12; }
      const sg = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, 12);
      sg.addColorStop(0, '#c070ff'); sg.addColorStop(0.6, '#8A2BE2'); sg.addColorStop(1, '#4a0a8a');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.ellipse(x, y - 2, 10, 14, 0, 0, Math.PI * 2); ctx.fill();
      // Tentacles
      ctx.strokeStyle = '#7a1aD2'; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const sway = Math.sin(t0 * 0.004 + i * 1.5) * 5;
        ctx.beginPath();
        ctx.moveTo(x - 6 + i * 4, y + 10);
        ctx.quadraticCurveTo(x - 8 + i * 4 + sway, y + 20, x - 6 + i * 4 + sway * 0.5, y + 26);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(x - 4, y - 4, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 4, y - 4, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(x - 3, y - 3, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 5, y - 3, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (enemy.type === 'piranha') {
      // Body — sleek fish shape
      if (enemy.aggro) { ctx.shadowColor = 'rgba(255,69,0,0.6)'; ctx.shadowBlur = 12; }
      const pg = ctx.createRadialGradient(x - 4, y - 2, 2, x, y, 14);
      pg.addColorStop(0, '#FF6B2B'); pg.addColorStop(0.5, '#FF4500'); pg.addColorStop(1, '#B22000');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.ellipse(x, y, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
      // Tail fin
      ctx.fillStyle = '#E03000';
      ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x - 22, y - 8); ctx.lineTo(x - 22, y + 8); ctx.closePath(); ctx.fill();
      // Dorsal fin
      ctx.fillStyle = '#FF5500';
      ctx.beginPath(); ctx.moveTo(x - 2, y - 7); ctx.lineTo(x + 4, y - 14); ctx.lineTo(x + 8, y - 7); ctx.closePath(); ctx.fill();
      // Eye
      ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.arc(x + 8, y - 2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(x + 8, y - 2, 1.5, 0, Math.PI * 2); ctx.fill();
      // Teeth
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(x + 10 + i * 3, y + 2); ctx.lineTo(x + 11 + i * 3, y + 6); ctx.lineTo(x + 12 + i * 3, y + 2); ctx.closePath(); ctx.fill();
      }
      ctx.shadowBlur = 0;

    } else if (enemy.type === 'octopus') {
      // ── BOSS: Evil Octopus ──
      const flash = Math.floor(t0 / 100) % 2 === 0 && enemy.aggro;
      // Aura
      if (enemy.aggro) { ctx.shadowColor = 'rgba(128,0,128,0.7)'; ctx.shadowBlur = 30; }
      else { ctx.shadowColor = 'rgba(80,0,120,0.4)'; ctx.shadowBlur = 16; }
      // Ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(x, y + 24, 28, 8, 0, 0, Math.PI * 2); ctx.fill();
      // Tentacles — 8 writhing appendages
      ctx.lineWidth = 3.5;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const sway = Math.sin(t0 * 0.003 + i * 0.8) * 8;
        const sway2 = Math.cos(t0 * 0.002 + i * 1.2) * 5;
        const startX = x + Math.cos(angle) * 16;
        const startY = y + Math.sin(angle) * 12 + 8;
        const midX = startX + Math.cos(angle) * 14 + sway;
        const midY = startY + Math.sin(angle) * 10 + sway2;
        const endX = midX + Math.cos(angle) * 10 + sway * 0.5;
        const endY = midY + Math.sin(angle) * 8;
        const tg = ctx.createLinearGradient(startX, startY, endX, endY);
        tg.addColorStop(0, flash ? '#c040c0' : '#6a0a8a');
        tg.addColorStop(1, flash ? '#e060e0' : '#9a2abf');
        ctx.strokeStyle = tg;
        ctx.beginPath(); ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(midX, midY, endX, endY); ctx.stroke();
        // Sucker dots
        ctx.fillStyle = 'rgba(200,150,220,0.5)';
        ctx.beginPath(); ctx.arc(midX, midY, 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.lineWidth = 1;
      // Main body — bulbous head
      const og = ctx.createRadialGradient(x - 6, y - 8, 4, x, y, 22);
      og.addColorStop(0, flash ? '#d060d0' : '#a030a0');
      og.addColorStop(0.5, flash ? '#b040b0' : '#800080');
      og.addColorStop(1, '#400060');
      ctx.fillStyle = og;
      ctx.beginPath(); ctx.ellipse(x, y - 4, 22, 20, 0, 0, Math.PI * 2); ctx.fill();
      // Mantle texture spots
      ctx.fillStyle = 'rgba(180,100,200,0.3)';
      ctx.beginPath(); ctx.arc(x - 8, y - 10, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 10, y - 6, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x - 4, y + 4, 3, 0, Math.PI * 2); ctx.fill();
      // Eyes — large, menacing
      ctx.fillStyle = '#FFDD00'; ctx.shadowColor = '#FFDD00'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.ellipse(x - 8, y - 8, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 8, y - 8, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
      // Slit pupils
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(x - 8, y - 8, 2, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 8, y - 8, 2, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      // Beak
      ctx.fillStyle = '#2a0040';
      ctx.beginPath(); ctx.moveTo(x - 4, y + 4); ctx.lineTo(x, y + 10); ctx.lineTo(x + 4, y + 4); ctx.closePath(); ctx.fill();

      // Boss HP bar — large, labeled
      ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(x - 40, y - 34, 80, 10);
      const hpPct = enemy.hp / enemy.maxHp;
      ctx.fillStyle = `hsl(${hpPct * 120},80%,50%)`;
      ctx.fillRect(x - 40, y - 34, 80 * hpPct, 10);
      ctx.strokeStyle = 'rgba(200,100,255,0.5)'; ctx.strokeRect(x - 40, y - 34, 80, 10);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`🐙 OCTOPUS  ${enemy.hp}/${enemy.maxHp}`, x, y - 38);
      return;
    }

    // Standard HP bar for non-boss enemies
    if (enemy.hp < enemy.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 15, y - 22, 30, 4);
      ctx.fillStyle = enemy.hp / enemy.maxHp > 0.5 ? '#4f4' : '#f44';
      ctx.fillRect(x - 15, y - 22, 30 * (enemy.hp / enemy.maxHp), 4);
    }
  });
}

// ── Draw Particles ───────────────────────────────────────
function drawP4Particles(ctx) {
  p4.particles.forEach(p => {
    const x = p.x - p4.cam.x, y = p.y - p4.cam.y;
    ctx.globalAlpha = p.life / 30;
    ctx.shadowColor = p.color; ctx.shadowBlur = 6;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(x, y, p.size, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
}

// ── Draw Player ──────────────────────────────────────────
function drawP4Player(ctx) {
  const px = p4.player.x - p4.cam.x, py = p4.player.y - p4.cam.y;
  if (p4.player.invincible % 10 < 5) {
    drawPlayerSkin(ctx, px, py, p4.player.size);
  }
}

// ── Main Draw Function ───────────────────────────────────
function drawP4(ctx) {
  // Background — deep ocean gradient
  const bg = ctx.createLinearGradient(0, 0, 0, 520);
  bg.addColorStop(0, '#001428'); bg.addColorStop(0.5, '#001133'); bg.addColorStop(1, '#000a1a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 800, 520);

  // Underwater light rays
  ctx.globalAlpha = 0.04;
  const t0 = Date.now();
  for (let i = 0; i < 5; i++) {
    const rx = 100 + i * 160 + Math.sin(t0 * 0.0005 + i) * 30;
    const rg = ctx.createLinearGradient(rx, 0, rx + 40, 520);
    rg.addColorStop(0, '#4488cc'); rg.addColorStop(1, 'transparent');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(rx, 0); ctx.lineTo(rx + 60, 520); ctx.lineTo(rx + 20, 520); ctx.lineTo(rx - 20, 0);
    ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;

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

  // Ambient bubbles (screen-space)
  updateP4Bubbles();
  ctx.fillStyle = 'rgba(150,200,255,0.25)';
  p4Bubbles.forEach(b => {
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    // tiny highlight
    ctx.fillStyle = 'rgba(200,230,255,0.35)';
    ctx.beginPath(); ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(150,200,255,0.25)';
  });
}
