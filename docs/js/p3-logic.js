// ════════════════════════════════════════
// js/p3-logic.js  — Planet 3 update logic
// updateP3, updateYeti, updateTigers, updateMammoths
// ════════════════════════════════════════

function updateP3(state) {
  const {TILE, COLS, ROWS, map, player, cam, canvas,
         tigers, mammoths, yeti, resources, particles,
         snowflakes, p3state} = state;

  state.snowAnim += 0.025;

  // ── Move snowflakes ───────────────────────────────────────
  snowflakes.forEach(sf => {
    sf.y += sf.vy; sf.x += sf.vx + Math.sin(state.snowAnim + sf.y*0.02)*0.2;
    if (sf.y > canvas.height) { sf.y = -4; sf.x = Math.random()*canvas.width; }
    if (sf.x < 0) sf.x = canvas.width; if (sf.x > canvas.width) sf.x = 0;
  });

  if (gamePaused) return;

  // ── Player movement ───────────────────────────────────────
  let dx=0, dy=0;
  if(player.keys['ArrowLeft']||player.keys['a']||player.keys['A']) dx-=1;
  if(player.keys['ArrowRight']||player.keys['d']||player.keys['D']) dx+=1;
  if(player.keys['ArrowUp']||player.keys['w']||player.keys['W']) dy-=1;
  if(player.keys['ArrowDown']||player.keys['s']||player.keys['S']) dy+=1;

  let spd = player.speed;
  const ptx=Math.floor(player.x/TILE), pty=Math.floor(player.y/TILE);
  if(ptx>=0&&pty>=0&&ptx<COLS&&pty<ROWS) {
    const tt = map[pty][ptx];
    if(tt===2) spd*=0.45;       // deep snow slows
    else if(tt===6) spd*=0.7;   // frozen lake
    else if(tt===4) spd*=0.6;   // blizzard slows
  }

  const r2=player.size;
  const nx=player.x+dx*spd, ny=player.y+dy*spd;
  if(!isSolidP3(nx-r2,player.y-r2,state)&&!isSolidP3(nx+r2,player.y-r2,state)&&
     !isSolidP3(nx-r2,player.y+r2,state)&&!isSolidP3(nx+r2,player.y+r2,state)) player.x=nx;
  if(!isSolidP3(player.x-r2,ny-r2,state)&&!isSolidP3(player.x+r2,ny-r2,state)&&
     !isSolidP3(player.x-r2,ny+r2,state)&&!isSolidP3(player.x+r2,ny+r2,state)) player.y=ny;

  if(player.invincible>0) player.invincible--;
  if(player.speedTimer>0){ player.speedTimer--; if(player.speedTimer===0) player.speed=3; }

  // Blizzard patch chip damage
  if(ptx>=0&&pty>=0&&ptx<COLS&&pty<ROWS&&map[pty][ptx]===4&&!player.invincible){
    save.hp=Math.max(0,save.hp-0.08); updateHUD();
    if(save.hp<=0){loseLife(()=>{closeMsg();startPlanet(3);});}
  }

  // ── Camera ───────────────────────────────────────────────
  cam.x=Math.max(0,Math.min(player.x-canvas.width/2, COLS*TILE-canvas.width));
  cam.y=Math.max(0,Math.min(player.y-canvas.height/2, ROWS*TILE-canvas.height));

  // ── Particles ────────────────────────────────────────────
  state.particles = particles.filter(p=>p.life>0);
  state.particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life--;p.vx*=0.92;p.vy*=0.92;});

  // ── Weapon cooldown ──────────────────────────────────────
  if(state.weaponCooldown>0) state.weaponCooldown--;

  // Auto-attack: frost_bow / bone_spear
  if((state.activeWeapon==='frost_bow')&&state.weaponCooldown<=0){
    const range=TILE*5; let closest=null, cd=range;
    [...tigers,...mammoths.filter(m=>m.angered)].forEach(e=>{
      const d=Math.hypot(player.x-e.x,player.y-e.y);
      if(d<cd){cd=d;closest=e;}
    });
    if(closest){closest.hp-=2;addP3(closest.x,closest.y,'#8af',6,state);state.weaponCooldown=100;}
  }
  // Blizzard orb — AoE slow
  if(state.activeWeapon==='blizzard_orb'&&state.weaponCooldown<=0){
    [...tigers,...mammoths].forEach(e=>{
      if(Math.hypot(player.x-e.x,player.y-e.y)<TILE*4){
        e.slowTimer=120; addP3(e.x,e.y,'#aef',4,state);
      }
    });
    state.weaponCooldown=180;
  }

  // ── Update tigers ─────────────────────────────────────────
  updateP3Tigers(state);
  // ── Update mammoths ───────────────────────────────────────
  updateP3Mammoths(state);
  // ── Update yeti ───────────────────────────────────────────
  updateP3Yeti(state);

  // ── Cave reveal ──────────────────────────────────────────
  // When player enters the hidden cave zone (around tile 5s)
  if(!p3state.caveRevealed){
    const cx=Math.floor(player.x/TILE), cy=Math.floor(player.y/TILE);
    if(cx>=13&&cx<=16&&cy>=7&&cy<=10){
      p3state.caveRevealed=true;
      showMsg('🏔️ Cave Discovered!','A dark cave... you sense something massive inside.\n\n❄️ The Yeti stirs!');
    }
  }
}

// ── Solid tile check for planet 3 ────────────────────────
function isSolidP3(px, py, state) {
  const {TILE, COLS, ROWS, map} = state;
  const tx=Math.floor(px/TILE), ty=Math.floor(py/TILE);
  if(tx<0||ty<0||tx>=COLS||ty>=ROWS) return true;
  const t=map[ty][tx];
  return t===1||t===3; // ice wall and frozen tree are solid
}

// ── Particle helper ───────────────────────────────────────
function addP3(x, y, color, n, state) {
  for(let i=0;i<(n||8);i++){
    state.particles.push({
      x, y,
      vx:(Math.random()-.5)*5, vy:(Math.random()-.5)*5,
      life:28+Math.random()*14|0, color
    });
  }
}

// ── Tiger AI ──────────────────────────────────────────────
function updateP3Tigers(state) {
  const {TILE, COLS, ROWS, player, tigers} = state;
  tigers.forEach((a,i)=>{
    if(a.slowTimer>0) a.slowTimer--;
    const spd2 = a.slowTimer>0 ? a.speed*0.3 : a.speed;
    const pd=Math.hypot(player.x-a.x,player.y-a.y);
    if(pd<TILE*5){
      a.aggro=true;
      const ang=Math.atan2(player.y-a.y,player.x-a.x);
      a.x+=Math.cos(ang)*spd2; a.y+=Math.sin(ang)*spd2;
      if(a.attackTimer>0) a.attackTimer--;
      if(pd<a.size+player.size&&a.attackTimer<=0&&player.invincible===0){
        const dmg=save.items.includes('ruin_shield')?1:2;
        save.hp=Math.max(0,save.hp-dmg); updateHUD(); player.invincible=45;
        addP3(player.x,player.y,'#f44',6,state); a.attackTimer=60;
        if(save.hp<=0){loseLife(()=>{closeMsg();startPlanet(3);});}
      }
    } else {
      a.aggro=false;
      a.x+=a.dx*(a.slowTimer>0?0.3:1); a.y+=a.dy*(a.slowTimer>0?0.3:1);
      if(a.x<TILE||a.x>(COLS-2)*TILE) a.dx*=-1;
      if(a.y<TILE||a.y>(ROWS-2)*TILE) a.dy*=-1;
    }
  });
}

// ── Mammoth AI ────────────────────────────────────────────
function updateP3Mammoths(state) {
  const {TILE, COLS, ROWS, player, mammoths} = state;
  mammoths.forEach(m=>{
    if(m.slowTimer>0) m.slowTimer--;
    const spd2 = m.slowTimer>0 ? m.speed*0.2 : m.speed;
    if(m.angered){
      // angered mammoth charges player
      const pd=Math.hypot(player.x-m.x,player.y-m.y);
      const ang=Math.atan2(player.y-m.y,player.x-m.x);
      m.x+=Math.cos(ang)*spd2*1.4; m.y+=Math.sin(ang)*spd2*1.4;
      if(m.attackTimer>0) m.attackTimer--;
      if(pd<m.size+player.size&&m.attackTimer<=0&&player.invincible===0){
        // tusk slam — heavy damage
        const hasTusk=save.items.some(i=>i.startsWith('w:mammoth_tusk'));
        const dmg=hasTusk?0:save.items.includes('ruin_shield')?2:4;
        if(!hasTusk){ save.hp=Math.max(0,save.hp-dmg); updateHUD(); player.invincible=60; }
        addP3(player.x,player.y,'#f84',8,state); m.attackTimer=80;
        if(save.hp<=0){loseLife(()=>{closeMsg();startPlanet(3);});}
      }
    } else {
      // neutral wander
      m.x+=m.dx*(m.slowTimer>0?0.2:1); m.y+=m.dy*(m.slowTimer>0?0.2:1);
      if(m.x<TILE||m.x>(COLS-2)*TILE) m.dx*=-1;
      if(m.y<TILE||m.y>(ROWS-2)*TILE) m.dy*=-1;
    }
  });
}

// ── Yeti AI ───────────────────────────────────────────────
function updateP3Yeti(state) {
  const {TILE, player, yeti, p3state} = state;
  if(!yeti.alive) return;

  if(yeti.roarTimer>0) yeti.roarTimer--;
  if(yeti.stunTimer>0){ yeti.stunTimer--; return; } // stunned — skip AI
  if(yeti.attackTimer>0) yeti.attackTimer--;
  if(yeti.slowTimer>0) yeti.slowTimer--;

  const pd=Math.hypot(player.x-yeti.x,player.y-yeti.y);
  const spd2=yeti.slowTimer>0?yeti.speed*0.25:yeti.speed;

  yeti.phaseTimer++;

  // Switch phases
  if(yeti.phaseTimer>360){
    yeti.phaseTimer=0;
    const hp_pct=yeti.hp/yeti.maxhp;
    if(hp_pct>0.6) yeti.phase='throw';
    else if(hp_pct>0.3) yeti.phase=Math.random()<0.5?'throw':'charge';
    else yeti.phase=Math.random()<0.4?'stomp':'charge'; // enraged at low hp
  }

  if(yeti.charging){
    yeti.x+=yeti.chargeDir.x*9; yeti.y+=yeti.chargeDir.y*9;
    yeti.chargeTimer--;
    // Check charge hit
    if(pd<yeti.size+player.size&&player.invincible===0){
      const dmg=save.items.includes('ruin_shield')?3:6;
      save.hp=Math.max(0,save.hp-dmg); updateHUD(); player.invincible=70;
      addP3(player.x,player.y,'#aef',12,state);
      if(save.hp<=0){loseLife(()=>{closeMsg();startPlanet(3);});}
    }
    if(yeti.chargeTimer<=0) yeti.charging=false;
    return;
  }

  if(yeti.phase==='throw'){
    // Walk slowly toward player, throw rocks periodically
    const ang=Math.atan2(player.y-yeti.y,player.x-yeti.x);
    if(pd>TILE*4){ yeti.x+=Math.cos(ang)*spd2; yeti.y+=Math.sin(ang)*spd2; }
    if(yeti.phaseTimer%80===40&&pd<TILE*12){
      // Throw a rock
      const speed=3.5+Math.random()*1.5;
      yeti.rocks.push({x:yeti.x,y:yeti.y,vx:Math.cos(ang)*speed,vy:Math.sin(ang)*speed,r:7});
    }
  } else if(yeti.phase==='charge'){
    const ang=Math.atan2(player.y-yeti.y,player.x-yeti.x);
    yeti.x+=Math.cos(ang)*spd2*0.8; yeti.y+=Math.sin(ang)*spd2*0.8;
    // Wind up charge
    if(yeti.phaseTimer%180===90&&pd<TILE*8){
      yeti.charging=true; yeti.chargeTimer=22;
      yeti.chargeDir={x:Math.cos(ang),y:Math.sin(ang)};
      yeti.roarTimer=30;
    }
    // Punch at close range
    if(pd<yeti.size+player.size&&yeti.attackTimer<=0&&player.invincible===0){
      const dmg=save.items.includes('ruin_shield')?2:4;
      save.hp=Math.max(0,save.hp-dmg); updateHUD(); player.invincible=55;
      addP3(player.x,player.y,'#fff',10,state); yeti.attackTimer=50;
      if(save.hp<=0){loseLife(()=>{closeMsg();startPlanet(3);});}
    }
  } else if(yeti.phase==='stomp'){
    // Enraged — move fast, stomp shockwave at intervals
    const ang=Math.atan2(player.y-yeti.y,player.x-yeti.x);
    yeti.x+=Math.cos(ang)*spd2*1.6; yeti.y+=Math.sin(ang)*spd2*1.6;
    if(yeti.phaseTimer%90===0&&pd<TILE*5){
      yeti.roarTimer=20;
      addP3(yeti.x,yeti.y,'#aef',20,state);
      if(pd<TILE*2.5&&player.invincible===0){
        const dmg=save.items.includes('ruin_shield')?1:3;
        save.hp=Math.max(0,save.hp-dmg); updateHUD(); player.invincible=40;
        if(save.hp<=0){loseLife(()=>{closeMsg();startPlanet(3);});}
      }
    }
  }

  // Move thrown rocks
  yeti.rocks=yeti.rocks.filter(rock=>{
    rock.x+=rock.vx; rock.y+=rock.vy;
    // Hit player?
    if(Math.hypot(player.x-rock.x,player.y-rock.y)<rock.r+player.size&&player.invincible===0){
      const dmg=save.items.includes('ruin_shield')?1:2;
      save.hp=Math.max(0,save.hp-dmg); updateHUD(); player.invincible=30;
      addP3(player.x,player.y,'#888',5,state);
      if(save.hp<=0){loseLife(()=>{closeMsg();startPlanet(3);});}
      return false;
    }
    // Remove if off-map
    const {COLS,ROWS,TILE:T} = state;
    return rock.x>0&&rock.y>0&&rock.x<COLS*T&&rock.y<ROWS*T;
  });

  // Keep yeti in bounds
  const {COLS,ROWS} = state;
  yeti.x=Math.max(TILE,Math.min((COLS-2)*TILE,yeti.x));
  yeti.y=Math.max(TILE,Math.min((ROWS-2)*TILE,yeti.y));
}
