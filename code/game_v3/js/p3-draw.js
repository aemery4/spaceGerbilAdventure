// ════════════════════════════════════════
// js/p3-draw.js  — Planet 3 drawing functions
// drawP3Tile, drawP3Entities, drawP3HUD
// All functions receive (ctx, state) where state = the p3 local state bundle
// ════════════════════════════════════════

function drawP3Tile(ctx, tx, ty, state) {
  const {TILE, map, cam, p3state, snowAnim, chests} = state;
  const t = map[ty][tx];
  const sx = tx*TILE - cam.x, sy = ty*TILE - cam.y;

  // 0 = tundra floor
  if (t === 0) {
    const tg = ctx.createLinearGradient(sx, sy, sx, sy+TILE);
    tg.addColorStop(0, '#c8d8e8'); tg.addColorStop(1, '#a8bcd0');
    ctx.fillStyle = tg; ctx.fillRect(sx, sy, TILE, TILE);
    // snow sparkle
    if ((tx*7+ty*11)%8 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.arc(sx+TILE*.4, sy+TILE*.3, 2, 0, Math.PI*2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(150,170,200,0.3)'; ctx.lineWidth = 0.5;
    ctx.strokeRect(sx, sy, TILE, TILE); ctx.lineWidth = 1;
  }

  // 1 = ice wall
  if (t === 1) {
    const wg = ctx.createLinearGradient(sx, sy, sx+TILE, sy+TILE);
    wg.addColorStop(0, '#3a5a7a'); wg.addColorStop(1, '#1a3a5a');
    ctx.fillStyle = wg; ctx.fillRect(sx, sy, TILE, TILE);
    // ice crack texture
    ctx.strokeStyle = 'rgba(140,200,255,0.25)'; ctx.lineWidth = 0.8;
    if ((tx*3+ty*5)%4 === 0) {
      ctx.beginPath(); ctx.moveTo(sx+4, sy+2); ctx.lineTo(sx+TILE-6, sy+TILE-4); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(80,140,200,0.5)'; ctx.lineWidth = 0.5;
    ctx.strokeRect(sx, sy, TILE, TILE); ctx.lineWidth = 1;
  }

  // 2 = deep snow (slows)
  if (t === 2) {
    ctx.fillStyle = '#ddeeff'; ctx.fillRect(sx, sy, TILE, TILE);
    const sg = ctx.createRadialGradient(sx+TILE/2, sy+TILE/2, 1, sx+TILE/2, sy+TILE/2, TILE/2);
    sg.addColorStop(0, 'rgba(220,240,255,0.6)'); sg.addColorStop(1, 'rgba(180,210,240,0.2)');
    ctx.fillStyle = sg; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.fillText('❄️', sx+TILE/2, sy+TILE/2+5);
  }

  // 3 = frozen tree
  if (t === 3) {
    ctx.fillStyle = '#a8bcd0'; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = '#4a3a28'; ctx.fillRect(sx+TILE/2-3, sy+TILE-10, 6, 10);
    const cg = ctx.createRadialGradient(sx+TILE/2, sy+10, 2, sx+TILE/2, sy+12, TILE/2-2);
    cg.addColorStop(0, '#ddeeff'); cg.addColorStop(0.6, '#b0cce0'); cg.addColorStop(1, 'rgba(160,200,230,0.3)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(sx+TILE/2, sy+12, TILE/2-2, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(sx+TILE/2-4, sy+8, 5, 0, Math.PI*2); ctx.fill();
  }

  // 4 = blizzard patch (animated, hurts slightly)
  if (t === 4) {
    ctx.fillStyle = '#8aaccc'; ctx.fillRect(sx, sy, TILE, TILE);
    const bsway = Math.sin(snowAnim*2 + tx*0.7) * 3;
    ctx.strokeStyle = 'rgba(200,230,255,0.7)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(sx+i*9+bsway, sy);
      ctx.lineTo(sx+i*9+bsway+4, sy+TILE); ctx.stroke();
    }
    ctx.lineWidth = 1;
  }

  // 5 = hidden cave floor
  if (t === 5) {
    if (p3state.caveRevealed) {
      const pulse = Math.sin(Date.now()*0.004)*0.06+0.12;
      ctx.fillStyle = `rgba(100,200,255,${pulse})`; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = '#2a3a4a'; ctx.fillRect(sx+2, sy+2, TILE-4, TILE-4);
      ctx.strokeStyle = 'rgba(100,200,255,0.4)'; ctx.lineWidth = 0.5;
      ctx.strokeRect(sx, sy, TILE, TILE); ctx.lineWidth = 1;
    } else {
      // looks like normal tundra until revealed
      ctx.fillStyle = '#b0c8dc'; ctx.fillRect(sx, sy, TILE, TILE);
    }
  }

  // 6 = frozen lake (slippery floor)
  if (t === 6) {
    const lg = ctx.createLinearGradient(sx, sy, sx+TILE, sy+TILE);
    lg.addColorStop(0, '#b8d8f0'); lg.addColorStop(1, '#88b8d8');
    ctx.fillStyle = lg; ctx.fillRect(sx, sy, TILE, TILE);
    // ice sheen
    const shine = Math.sin(Date.now()*0.002 + tx*0.4 + ty*0.3)*0.3+0.4;
    ctx.fillStyle = `rgba(255,255,255,${shine*0.25})`;
    ctx.beginPath(); ctx.ellipse(sx+TILE/2, sy+TILE/3, TILE/3, TILE/6, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(100,160,210,0.4)'; ctx.lineWidth = 0.5;
    ctx.strokeRect(sx, sy, TILE, TILE); ctx.lineWidth = 1;
  }

  // 7 = camp floor (survivor camp)
  if (t === 7) {
    const pg = ctx.createLinearGradient(sx, sy, sx, sy+TILE);
    pg.addColorStop(0, '#7a6040'); pg.addColorStop(1, '#5a4828');
    ctx.fillStyle = pg; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.strokeStyle = 'rgba(60,40,10,0.4)'; ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(sx, sy+i*9); ctx.lineTo(sx+TILE, sy+i*9); ctx.stroke();
    }
    const glow2 = Math.sin(Date.now()*0.001 + tx*0.4 + ty*0.6)*0.03+0.06;
    ctx.fillStyle = `rgba(255,180,60,${glow2})`; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.lineWidth = 1;
  }

  // 8 = lava vent (rare heat source)
  if (t === 8) {
    const lv = Math.sin(Date.now()*0.004 + tx*0.5)*0.5+0.5;
    ctx.fillStyle = `rgba(180,${40+lv*30|0},0,0.95)`; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.shadowColor = 'rgba(255,100,0,0.8)'; ctx.shadowBlur = 14;
    ctx.fillStyle = `rgba(255,180,0,${0.2+lv*0.2})`;
    ctx.beginPath(); ctx.ellipse(sx+TILE/2, sy+TILE/2, TILE/2-3, TILE/2-4, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // 9 = rocky ruins
  if (t === 9) {
    const rg = ctx.createLinearGradient(sx, sy, sx+TILE, sy+TILE);
    rg.addColorStop(0, '#4a4a5a'); rg.addColorStop(1, '#383848');
    ctx.fillStyle = rg; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.strokeStyle = 'rgba(100,100,140,0.5)'; ctx.lineWidth = 0.8;
    ctx.strokeRect(sx+2, sy+2, TILE/2-3, TILE/2-3);
    ctx.strokeRect(sx+TILE/2+1, sy+TILE/2+1, TILE/2-3, TILE/2-3);
    ctx.lineWidth = 1;
    if ((tx+ty*3)%5 === 0) {
      ctx.fillStyle = 'rgba(180,200,240,0.2)'; ctx.fillRect(sx+18, sy+16, 8, 5);
    }
  }

  // 10 = chest
  if (t === 10) {
    ctx.fillStyle = '#9ab4c8'; ctx.fillRect(sx, sy, TILE, TILE);
    const cx2 = tx*TILE+TILE/2, cy2 = ty*TILE+TILE/2;
    const ch = chests.find(c => Math.abs(c.x-cx2)<TILE && Math.abs(c.y-cy2)<TILE);
    if (ch && ch.opened) {
      ctx.fillStyle = 'rgba(80,60,30,0.5)'; ctx.fillRect(sx+5, sy+9, TILE-10, TILE-14);
    } else {
      const glow3 = Math.sin(Date.now()*0.004+tx+ty)*0.3+0.7;
      ctx.shadowColor = 'rgba(180,220,255,0.9)'; ctx.shadowBlur = 12*glow3;
      ctx.fillStyle = '#4a6888'; ctx.fillRect(sx+4, sy+9, TILE-8, TILE-13);
      ctx.fillStyle = '#6a90b0'; ctx.fillRect(sx+4, sy+9, TILE-8, 5);
      ctx.fillStyle = 'rgba(180,230,255,0.8)'; ctx.fillRect(sx+TILE/2-3, sy+12, 7, 4);
      ctx.shadowBlur = 0;
      ctx.font = '11px serif'; ctx.textAlign = 'center'; ctx.fillText('📦', sx+TILE/2, sy+TILE-3);
    }
  }
}

// ── Draw all entities ─────────────────────────────────────
function drawP3Entities(ctx, state) {
  const {TILE, cam, canvas, player, tigers, mammoths, yeti, resources, chests,
         p3state, particles, snowflakes, COLS, ROWS} = state;

  // Snowflakes (ambient, screen-space)
  snowflakes.forEach(sf => {
    ctx.globalAlpha = sf.alpha;
    ctx.fillStyle = '#ddeeff';
    ctx.beginPath(); ctx.arc(sf.x, sf.y, sf.r, 0, Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Resources
  resources.forEach(r => {
    if (r.hidden && !p3state.caveRevealed) return;
    const rx = r.x*TILE+TILE/2-cam.x, ry = r.y*TILE+TILE/2-cam.y;
    ctx.shadowColor = r.type==='fuel'?'rgba(255,255,80,0.6)':'rgba(180,220,255,0.5)';
    ctx.shadowBlur = 8;
    ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.fillText(r.label, rx, ry+6);
    ctx.shadowBlur = 0;
    if (r.hp < r.maxhp) {
      ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(rx-10, ry+9, 20, 4);
      ctx.fillStyle='#4af'; ctx.fillRect(rx-10, ry+9, 20*(r.hp/r.maxhp), 4);
    }
  });

  // Mammoths — big, woolly, tusked
  mammoths.forEach(m => {
    const mx2 = m.x-cam.x, my2 = m.y-cam.y;
    if (mx2<-50||mx2>canvas.width+50||my2<-50||my2>canvas.height+50) return;
    if (m.angered) { ctx.shadowColor='rgba(255,80,0,0.8)'; ctx.shadowBlur=18; }
    // body shadow
    ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.beginPath();
    ctx.ellipse(mx2, my2+m.size-4, m.size-2, 7, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    // woolly body
    const wg = ctx.createRadialGradient(mx2-6, my2-6, 3, mx2, my2, m.size);
    wg.addColorStop(0, m.angered?'#d08050':'#b09070');
    wg.addColorStop(0.7, m.angered?'#906030':'#7a6048');
    wg.addColorStop(1, '#4a3828');
    ctx.fillStyle = wg;
    ctx.beginPath(); ctx.ellipse(mx2, my2, m.size+4, m.size-4, 0, 0, Math.PI*2); ctx.fill();
    // head
    ctx.fillStyle = m.angered?'#c07840':'#a08060';
    ctx.beginPath(); ctx.ellipse(mx2+m.size-6, my2-m.size*.3, m.size*.7, m.size*.55, 0.3, 0, Math.PI*2); ctx.fill();
    // tusks
    ctx.strokeStyle = '#f5e8c0'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(mx2+m.size+8, my2-m.size*.1);
    ctx.quadraticCurveTo(mx2+m.size+18, my2+2, mx2+m.size+14, my2+m.size*.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx2+m.size+6, my2+m.size*.1);
    ctx.quadraticCurveTo(mx2+m.size+16, my2+m.size*.4, mx2+m.size+10, my2+m.size*.6); ctx.stroke();
    ctx.lineWidth = 1;
    // small eyes
    ctx.fillStyle = m.angered?'#ff2020':'#2a1a08';
    ctx.beginPath(); ctx.arc(mx2+m.size+2, my2-m.size*.4, 3, 0, Math.PI*2); ctx.fill();
    // fur shaggy bits
    ctx.strokeStyle='rgba(180,150,110,0.4)'; ctx.lineWidth=2;
    for (let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(mx2-m.size+i*8,my2-m.size+2);ctx.lineTo(mx2-m.size+i*7,my2-m.size-7);ctx.stroke();}
    ctx.lineWidth=1;
    // angry label
    if (m.angered) {
      ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(mx2-18, my2-m.size-20, 36, 14);
      ctx.fillStyle='#f88'; ctx.font='9px Share Tech Mono,monospace'; ctx.textAlign='center';
      ctx.fillText('ANGRY!', mx2, my2-m.size-9);
    }
    // hp bar
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(mx2-18, my2-m.size-10, 36, 5);
    ctx.fillStyle=m.hp/m.maxhp>0.5?'#4f4':'#f44';
    ctx.fillRect(mx2-18, my2-m.size-10, 36*(m.hp/m.maxhp), 5);
    ctx.shadowBlur=0;
  });

  // Saber-tooth tigers — sleek, fast, striped
  tigers.forEach(t2 => {
    const tx2=t2.x-cam.x, ty2=t2.y-cam.y;
    if (tx2<-40||tx2>canvas.width+40||ty2<-40||ty2>canvas.height+40) return;
    if (t2.aggro){ctx.shadowColor='rgba(255,120,0,0.7)';ctx.shadowBlur=14;}
    // body shadow
    ctx.fillStyle='rgba(0,0,0,0.2)';
    ctx.beginPath();ctx.ellipse(tx2,ty2+t2.size-2,t2.size-2,5,0,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    // body — tawny orange with grey-white underside
    const tg2 = ctx.createRadialGradient(tx2-4, ty2-4, 2, tx2, ty2, t2.size);
    tg2.addColorStop(0, '#e89050'); tg2.addColorStop(0.6, '#c06820'); tg2.addColorStop(1, '#7a3a08');
    ctx.fillStyle=tg2;
    ctx.beginPath();ctx.ellipse(tx2, ty2, t2.size+2, t2.size-3, 0, 0, Math.PI*2);ctx.fill();
    // stripes
    ctx.strokeStyle='rgba(40,15,0,0.55)'; ctx.lineWidth=2.5;
    for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(tx2+i*7,ty2-t2.size+2);ctx.lineTo(tx2+i*6,ty2+t2.size-2);ctx.stroke();}
    ctx.lineWidth=1;
    // long saber teeth
    ctx.fillStyle='#fff8e0';
    ctx.beginPath();ctx.moveTo(tx2-4,ty2+2);ctx.lineTo(tx2-2,ty2+t2.size+6);ctx.lineTo(tx2,ty2+2);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(tx2+1,ty2+2);ctx.lineTo(tx2+3,ty2+t2.size+6);ctx.lineTo(tx2+5,ty2+2);ctx.closePath();ctx.fill();
    // glowing amber eyes
    ctx.fillStyle='#ffaa00';ctx.shadowColor='#fa0';ctx.shadowBlur=8;
    ctx.beginPath();ctx.ellipse(tx2-5,ty2-4,3,4,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(tx2+5,ty2-4,3,4,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(tx2-5,ty2-4,1,3,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(tx2+5,ty2-4,1,3,0,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    // hp bar
    ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(tx2-13,ty2-t2.size-8,26,4);
    ctx.fillStyle=t2.hp/t2.maxhp>0.5?'#4f4':'#f44';ctx.fillRect(tx2-13,ty2-t2.size-8,26*(t2.hp/t2.maxhp),4);
  });

  // Yeti boss — in the cave
  if (yeti.alive) {
    const bx = yeti.x-cam.x, by = yeti.y-cam.y;
    const flash = yeti.charging && Math.floor(Date.now()/80)%2===0;
    const stunFlash = yeti.stunTimer>0 && Math.floor(Date.now()/60)%2===0;
    if (bx<-80||bx>canvas.width+80||by<-80||by>canvas.height+80) {
      // draw indicator arrow pointing toward yeti
      const ang = Math.atan2(yeti.y-player.y, yeti.x-player.x);
      const ix = canvas.width/2 + Math.cos(ang)*220;
      const iy = canvas.height/2 + Math.sin(ang)*160;
      ctx.fillStyle='rgba(180,230,255,0.8)'; ctx.font='18px serif'; ctx.textAlign='center';
      ctx.fillText('❄️', ix, iy);
    }
    // ground shadow
    ctx.fillStyle='rgba(0,0,0,0.3)';
    ctx.beginPath();ctx.ellipse(bx,by+yeti.size-4,yeti.size+6,12,0,0,Math.PI*2);ctx.fill();
    // aura
    if (yeti.roarTimer>0){ctx.shadowColor='rgba(180,230,255,0.9)';ctx.shadowBlur=40;}
    else if (flash){ctx.shadowColor='rgba(100,180,255,0.7)';ctx.shadowBlur=28;}
    else{ctx.shadowColor='rgba(100,160,220,0.4)';ctx.shadowBlur=16;}
    // body — massive white/blue
    const yg = ctx.createRadialGradient(bx-10, by-10, 6, bx, by, yeti.size);
    yg.addColorStop(0, stunFlash?'#ffcc88':flash?'#c0d8ff':'#e0eeff');
    yg.addColorStop(0.6, stunFlash?'#cc8840':flash?'#7aaae0':'#a0c0e0');
    yg.addColorStop(1, '#3a6090');
    ctx.fillStyle=yg;ctx.beginPath();ctx.arc(bx,by,yeti.size,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    // fur texture spikes
    ctx.strokeStyle='rgba(200,230,255,0.4)';ctx.lineWidth=2;
    for(let i=0;i<8;i++){
      const fa=i/8*Math.PI*2;
      ctx.beginPath();ctx.moveTo(bx+Math.cos(fa)*yeti.size,by+Math.sin(fa)*yeti.size);
      ctx.lineTo(bx+Math.cos(fa)*(yeti.size+8),by+Math.sin(fa)*(yeti.size+8));ctx.stroke();
    }
    ctx.lineWidth=1;
    // face — two giant icy blue eyes
    ctx.fillStyle='#80c8ff';ctx.shadowColor='#80c8ff';ctx.shadowBlur=16;
    ctx.beginPath();ctx.arc(bx-14,by-12,10,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(bx+14,by-12,10,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#001428';ctx.beginPath();ctx.arc(bx-14,by-12,5,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(bx+14,by-12,5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.7)';ctx.beginPath();ctx.arc(bx-17,by-15,3,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(bx+11,by-15,3,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    // nostrils
    ctx.fillStyle='#4a6080';
    ctx.beginPath();ctx.ellipse(bx-5,by+2,4,3,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(bx+5,by+2,4,3,0,0,Math.PI*2);ctx.fill();
    // arms raised when charging
    if (yeti.charging) {
      ctx.fillStyle='#a0bcd8';
      ctx.beginPath();ctx.ellipse(bx-yeti.size-6,by-10,10,22,-.5,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(bx+yeti.size+6,by-10,10,22,.5,0,Math.PI*2);ctx.fill();
    }
    // crown of icicles
    ctx.fillStyle='rgba(200,240,255,0.85)';ctx.strokeStyle='rgba(140,200,255,0.6)';ctx.lineWidth=1;
    for(let i=0;i<5;i++){
      const ia=(-0.5+i*0.25)*Math.PI;
      const ir=yeti.size+4, tip=yeti.size+14+i%2*6;
      ctx.beginPath();
      ctx.moveTo(bx+Math.cos(ia-0.1)*(ir),by+Math.sin(ia-0.1)*(ir));
      ctx.lineTo(bx+Math.cos(ia)*(tip),by+Math.sin(ia)*(tip));
      ctx.lineTo(bx+Math.cos(ia+0.1)*(ir),by+Math.sin(ia+0.1)*(ir));
      ctx.closePath();ctx.fill();ctx.stroke();
    }
    ctx.lineWidth=1;
    // STUN label
    if (yeti.stunTimer>0){
      ctx.fillStyle='rgba(0,0,0,0.8)';ctx.fillRect(bx-22,by-yeti.size-24,44,15);
      ctx.fillStyle='#ffe080';ctx.font='bold 10px Share Tech Mono,monospace';ctx.textAlign='center';
      ctx.fillText('💫 STUNNED',bx,by-yeti.size-13);
    }
    // hp bar
    ctx.fillStyle='rgba(0,0,0,0.8)';ctx.fillRect(bx-46,by-yeti.size-22,92,10);
    ctx.fillStyle=`hsl(${(yeti.hp/yeti.maxhp)*200+180},80%,55%)`;
    ctx.fillRect(bx-46,by-yeti.size-22,92*(yeti.hp/yeti.maxhp),10);
    ctx.strokeStyle='rgba(180,230,255,0.5)';ctx.strokeRect(bx-46,by-yeti.size-22,92,10);
    ctx.fillStyle='#fff';ctx.font='bold 10px Share Tech Mono,monospace';ctx.textAlign='center';
    ctx.fillText(`❄️ YETI  ${yeti.hp}/${yeti.maxhp}`,bx,by-yeti.size-26);

    // Thrown rocks
    yeti.rocks.forEach(rock => {
      const rx2=rock.x-cam.x, ry2=rock.y-cam.y;
      ctx.shadowColor='rgba(150,150,200,0.6)';ctx.shadowBlur=8;
      ctx.fillStyle='#7a7a9a';
      ctx.beginPath();ctx.arc(rx2,ry2,rock.r,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(200,200,230,0.4)';
      ctx.beginPath();ctx.arc(rx2-2,ry2-2,rock.r*.4,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
    });
  }

  // Particles
  particles.forEach(p => {
    ctx.globalAlpha = p.life/35;
    ctx.shadowColor = p.color; ctx.shadowBlur = 8;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x-cam.x, p.y-cam.y, 3, 0, Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha=1; ctx.shadowBlur=0;
}

// ── Draw camp structures ──────────────────────────────────
function drawP3Camp(ctx, state) {
  const {TILE, cam, canvas, CAMP_MERCHANTS} = state;
  // Tents and fire pits in the survivor camp (tile 7 zone)
  function drawTent(hx, hy) {
    const sx=hx-cam.x, sy=hy-cam.y;
    if(sx<-80||sx>canvas.width+80||sy<-80||sy>canvas.height+80) return;
    ctx.fillStyle='#5a4828';ctx.fillRect(sx+2,sy-24,32,24);
    // tent triangle
    ctx.fillStyle='#4a7a9a';
    ctx.beginPath();ctx.moveTo(sx-2,sy-24);ctx.lineTo(sx+18,sy-48);ctx.lineTo(sx+38,sy-24);ctx.closePath();ctx.fill();
    ctx.fillStyle='#3a6080';
    ctx.beginPath();ctx.moveTo(sx+4,sy-28);ctx.lineTo(sx+18,sy-44);ctx.lineTo(sx+32,sy-28);ctx.closePath();ctx.fill();
    // door flap
    ctx.fillStyle='#382010';ctx.fillRect(sx+12,sy-16,10,16);
    // snow on top
    ctx.fillStyle='rgba(220,240,255,0.7)';
    ctx.beginPath();ctx.ellipse(sx+18,sy-48,10,5,0,0,Math.PI*2);ctx.fill();
    // torch
    const flicker=Math.sin(Date.now()*0.008+hx*0.1)*0.2+0.7;
    ctx.shadowColor=`rgba(255,160,40,${flicker})`;ctx.shadowBlur=16;
    ctx.fillStyle=`rgba(255,180,50,${flicker*0.9})`;ctx.fillRect(sx+30,sy-36,5,5);ctx.shadowBlur=0;
  }
  function drawFirePit(hx, hy) {
    const sx=hx-cam.x, sy=hy-cam.y;
    if(sx<-40||sx>canvas.width+40||sy<-40||sy>canvas.height+40) return;
    ctx.fillStyle='#3a2a18';ctx.beginPath();ctx.ellipse(sx,sy,14,8,0,0,Math.PI*2);ctx.fill();
    const flicker2=Math.sin(Date.now()*0.01+hx)*0.3+0.7;
    ctx.shadowColor=`rgba(255,140,0,${flicker2})`;ctx.shadowBlur=20;
    ctx.fillStyle=`rgba(255,120,0,${flicker2})`;ctx.beginPath();ctx.arc(sx,sy-4,7,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=`rgba(255,220,0,${flicker2*.8})`;ctx.beginPath();ctx.arc(sx,sy-6,4,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
  }
  // Tents spread across camp zone (cols 24-29, rows 1-14)
  [[25,2],[28,2],[25,7],[28,7],[25,12],[28,12]].forEach(([tx2,ty2])=>drawTent(tx2*TILE+2,ty2*TILE));
  // Fire pits
  [[26,5],[27,10]].forEach(([tx2,ty2])=>drawFirePit(tx2*TILE+13,ty2*TILE+13));

  // Merchants
  CAMP_MERCHANTS.forEach(m => {
    const mx2=m.x-cam.x, my2=m.y-cam.y;
    if(mx2<-60||mx2>canvas.width+60||my2<-60||my2>canvas.height+60) return;
    const bob=Math.sin(Date.now()*0.002+m.bobOffset)*3;
    const {player} = state;
    const dist=Math.hypot(player.x-m.x,player.y-m.y);
    if(dist<TILE*2.5){
      ctx.shadowColor='rgba(180,230,255,0.8)';ctx.shadowBlur=22;
      ctx.strokeStyle='rgba(160,210,255,0.5)';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(mx2,my2+bob,22,0,Math.PI*2);ctx.stroke();
      ctx.shadowBlur=0;ctx.lineWidth=1;
      ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(mx2-28,my2+bob-44,56,18);
      ctx.fillStyle='#cef';ctx.font='bold 10px Share Tech Mono,monospace';ctx.textAlign='center';
      ctx.fillText('CLICK to trade',mx2,my2+bob-30);
    }
    ctx.fillStyle=m.color;ctx.beginPath();ctx.arc(mx2,my2+bob,18,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(0,0,0,0.2)';ctx.beginPath();ctx.arc(mx2,my2+bob+4,16,0,Math.PI);ctx.fill();
    ctx.fillStyle='#f5d090';ctx.beginPath();ctx.arc(mx2,my2+bob-14,9,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#333';ctx.beginPath();ctx.arc(mx2-3,my2+bob-15,1.5,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(mx2+3,my2+bob-15,1.5,0,Math.PI*2);ctx.fill();
    ctx.font='14px serif';ctx.textAlign='center';ctx.fillText(m.emoji,mx2,my2+bob-26);
    ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(mx2-28,my2+bob+22,56,14);
    ctx.fillStyle='#cef';ctx.font='8px Share Tech Mono,monospace';ctx.textAlign='center';
    ctx.fillText(m.name.split(' ')[0],mx2,my2+bob+32);
  });
}
