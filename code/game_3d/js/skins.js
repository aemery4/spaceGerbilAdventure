const ALL_SKINS = [
  // FREE starters
  { id:'astronaut', name:'Astronaut',   emoji:'🧑‍🚀', how:'Free starter skin',
    badge:'free', unlock:'free',
    draw:(ctx,px,py,sz)=>{
      // blue spacesuit
      ctx.shadowColor='#4af'; ctx.shadowBlur=16;
      const g=ctx.createRadialGradient(px,py,2,px,py,sz);
      g.addColorStop(0,'#5bd'); g.addColorStop(1,'#1a5a80');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,sz,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      ctx.fillStyle='rgba(200,240,255,0.4)'; ctx.beginPath(); ctx.arc(px-3,py-4,7,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(120,220,255,0.85)'; ctx.beginPath(); ctx.ellipse(px,py-3,6,5,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(px-2,py-5,1.5,0,Math.PI*2); ctx.fill();
    }
  },
  { id:'penguin', name:'Penguin',       emoji:'🐧', how:'Free starter skin',
    badge:'free', unlock:'free',
    draw:(ctx,px,py,sz)=>{
      // black body
      ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(px,py,sz,0,Math.PI*2); ctx.fill();
      // white belly
      ctx.fillStyle='#f0f0f0'; ctx.beginPath(); ctx.ellipse(px,py+2,sz*0.55,sz*0.7,0,0,Math.PI*2); ctx.fill();
      // orange beak
      ctx.fillStyle='#f80'; ctx.beginPath(); ctx.moveTo(px,py-4); ctx.lineTo(px+5,py-1); ctx.lineTo(px,py+1); ctx.closePath(); ctx.fill();
      // eyes
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(px-4,py-5,3,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+4,py-5,3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(px-3,py-5,1.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+5,py-5,1.5,0,Math.PI*2); ctx.fill();
    }
  },
  // BOUGHT with resources
  { id:'lion', name:'Lion',             emoji:'🦁', how:'Buy: 5🪨 4💎',
    badge:'buy', unlock:'buy', cost:{rock:5,crystal:4},
    draw:(ctx,px,py,sz)=>{
      ctx.shadowColor='#f90'; ctx.shadowBlur=14;
      // mane
      ctx.fillStyle='#8b4513'; ctx.beginPath(); ctx.arc(px,py,sz+4,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      // face
      const g=ctx.createRadialGradient(px,py,1,px,py,sz);
      g.addColorStop(0,'#f5c518'); g.addColorStop(1,'#d4900a');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,sz-2,0,Math.PI*2); ctx.fill();
      // snout
      ctx.fillStyle='#f0b030'; ctx.beginPath(); ctx.ellipse(px,py+3,6,5,0,0,Math.PI*2); ctx.fill();
      // nose
      ctx.fillStyle='#8b4513'; ctx.beginPath(); ctx.arc(px,py+1,2,0,Math.PI*2); ctx.fill();
      // eyes
      ctx.fillStyle='#228b22'; ctx.beginPath(); ctx.arc(px-5,py-4,3,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+5,py-4,3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(px-4,py-4,1.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+6,py-4,1.5,0,Math.PI*2); ctx.fill();
      // ears
      ctx.fillStyle='#d4900a'; ctx.beginPath(); ctx.arc(px-sz+2,py-sz+4,5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+sz-2,py-sz+4,5,0,Math.PI*2); ctx.fill();
    }
  },
  { id:'tiger', name:'Tiger',           emoji:'🐯', how:'Buy: 4🍌 5💎',
    badge:'buy', unlock:'buy', cost:{banana:4,crystal:5},
    draw:(ctx,px,py,sz)=>{
      ctx.shadowColor='#f60'; ctx.shadowBlur=12;
      const g=ctx.createRadialGradient(px,py,1,px,py,sz);
      g.addColorStop(0,'#ff8c00'); g.addColorStop(1,'#cc5500');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,sz,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      // stripes
      ctx.strokeStyle='#1a0a00'; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.moveTo(px-4,py-sz); ctx.lineTo(px-6,py-3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px+4,py-sz); ctx.lineTo(px+6,py-3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px-sz,py-4); ctx.lineTo(px-4,py-2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px+sz,py-4); ctx.lineTo(px+4,py-2); ctx.stroke();
      ctx.lineWidth=1;
      // white muzzle
      ctx.fillStyle='#ffe0c0'; ctx.beginPath(); ctx.ellipse(px,py+3,7,5,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#b04000'; ctx.beginPath(); ctx.arc(px,py+1,2,0,Math.PI*2); ctx.fill();
      // eyes
      ctx.fillStyle='#ffd700'; ctx.beginPath(); ctx.arc(px-5,py-4,3,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+5,py-4,3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(px-4,py-4,1.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+6,py-4,1.5,0,Math.PI*2); ctx.fill();
      // ears
      ctx.fillStyle='#cc5500'; ctx.beginPath(); ctx.arc(px-sz+3,py-sz+4,5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+sz-3,py-sz+4,5,0,Math.PI*2); ctx.fill();
    }
  },
  { id:'robot', name:'Robot',           emoji:'🤖', how:'Buy: 6💎 3🪨',
    badge:'buy', unlock:'buy', cost:{crystal:6,rock:3},
    draw:(ctx,px,py,sz)=>{
      const t=Date.now();
      ctx.shadowColor='#0ff'; ctx.shadowBlur=16;
      // metal body
      const g=ctx.createRadialGradient(px-3,py-3,1,px,py,sz);
      g.addColorStop(0,'#aaa'); g.addColorStop(1,'#444');
      ctx.fillStyle=g; roundRect(ctx,px-sz,py-sz,sz*2,sz*2,4);ctx.fill();
      ctx.shadowBlur=0;
      // visor screen — animated
      const vColor=`hsl(${(t*0.1)%360},100%,55%)`;
      ctx.fillStyle=vColor; ctx.fillRect(px-7,py-5,14,8);
      // scanline
      ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(px-7,py-5+((Math.floor(t*0.01)%8)),14,2);
      // antenna
      ctx.fillStyle='#888'; ctx.fillRect(px-1,py-sz-6,2,6);
      ctx.fillStyle='#f00'; ctx.beginPath(); ctx.arc(px,py-sz-7,2.5,0,Math.PI*2); ctx.fill();
      // bolts
      ctx.fillStyle='#666'; ctx.beginPath(); ctx.arc(px-sz+3,py-sz+3,2,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+sz-3,py-sz+3,2,0,Math.PI*2); ctx.fill();
    }
  },
  { id:'fox', name:'Fox',               emoji:'🦊', how:'Buy: 4🌿 3🍌',
    badge:'buy', unlock:'buy', cost:{plant:4,banana:3},
    draw:(ctx,px,py,sz)=>{
      ctx.shadowColor='#f84'; ctx.shadowBlur=12;
      const g=ctx.createRadialGradient(px,py,1,px,py,sz);
      g.addColorStop(0,'#ff6820'); g.addColorStop(1,'#c03000');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,sz,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      // white chest
      ctx.fillStyle='#f8e8d0'; ctx.beginPath(); ctx.ellipse(px,py+3,6,7,0,0,Math.PI*2); ctx.fill();
      // pointed ears
      ctx.fillStyle='#c03000';
      ctx.beginPath(); ctx.moveTo(px-sz+2,py-sz+6); ctx.lineTo(px-sz-3,py-sz-8); ctx.lineTo(px-sz+8,py-sz+2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(px+sz-2,py-sz+6); ctx.lineTo(px+sz+3,py-sz-8); ctx.lineTo(px+sz-8,py-sz+2); ctx.closePath(); ctx.fill();
      // inner ear
      ctx.fillStyle='#f8a080';
      ctx.beginPath(); ctx.moveTo(px-sz+2,py-sz+4); ctx.lineTo(px-sz-1,py-sz-4); ctx.lineTo(px-sz+6,py-sz+2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(px+sz-2,py-sz+4); ctx.lineTo(px+sz+1,py-sz-4); ctx.lineTo(px+sz-6,py-sz+2); ctx.closePath(); ctx.fill();
      // eyes
      ctx.fillStyle='#ffd700'; ctx.beginPath(); ctx.arc(px-5,py-4,3,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+5,py-4,3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(px-4,py-4,1.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+6,py-4,1.5,0,Math.PI*2); ctx.fill();
      // nose
      ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(px,py+1,2,0,Math.PI*2); ctx.fill();
    }
  },
  { id:'dragon', name:'Dragon',         emoji:'🐲', how:'Buy: 8🪨 8🌿 6💎 5🍌',
    badge:'buy', unlock:'buy', cost:{rock:8,plant:8,crystal:6,banana:5},
    draw:(ctx,px,py,sz)=>{
      const t=Date.now();
      ctx.shadowColor='#0f8'; ctx.shadowBlur=20;
      // scales
      const g=ctx.createRadialGradient(px,py,1,px,py,sz);
      g.addColorStop(0,'#40d060'); g.addColorStop(1,'#006020');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,sz,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      // scale texture
      ctx.strokeStyle='rgba(0,80,20,0.5)'; ctx.lineWidth=0.8;
      for(let i=0;i<6;i++){ctx.beginPath();ctx.arc(px+Math.cos(i)*5,py+Math.sin(i)*5,4,0,Math.PI*2);ctx.stroke();}
      // horns
      ctx.fillStyle='#ffd700';
      ctx.beginPath(); ctx.moveTo(px-6,py-sz); ctx.lineTo(px-9,py-sz-10); ctx.lineTo(px-3,py-sz); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(px+6,py-sz); ctx.lineTo(px+9,py-sz-10); ctx.lineTo(px+3,py-sz); ctx.closePath(); ctx.fill();
      // eyes — glowing
      ctx.shadowColor='#ff0'; ctx.shadowBlur=10;
      ctx.fillStyle=`hsl(${(t*0.05)%60+20},100%,55%)`;
      ctx.beginPath(); ctx.arc(px-5,py-4,4,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+5,py-4,4,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(px-4,py-4,2,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+6,py-4,2,0,Math.PI*2); ctx.fill();
      // nostrils
      ctx.fillStyle='#004010'; ctx.beginPath(); ctx.arc(px-2,py+4,1.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+2,py+4,1.5,0,Math.PI*2); ctx.fill();
    }
  },
  // EARNED by gameplay
  { id:'monkey_skin', name:'Monkey',    emoji:'🐒', how:'Defeat the Jungle King',
    badge:'earn', unlock:'boss_jungle',
    draw:(ctx,px,py,sz)=>{
      ctx.shadowColor='#a64'; ctx.shadowBlur=10;
      const g=ctx.createRadialGradient(px-2,py-2,1,px,py,sz);
      g.addColorStop(0,'#c08040'); g.addColorStop(1,'#6a3a10');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,sz,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      // face patch
      ctx.fillStyle='#d4a060'; ctx.beginPath(); ctx.ellipse(px,py+2,sz*0.65,sz*0.72,0,0,Math.PI*2); ctx.fill();
      // ears
      ctx.fillStyle='#8b5020'; ctx.beginPath(); ctx.arc(px-sz,py,sz*0.45,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+sz,py,sz*0.45,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#d4a060'; ctx.beginPath(); ctx.arc(px-sz,py,sz*0.28,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+sz,py,sz*0.28,0,Math.PI*2); ctx.fill();
      // eyes
      ctx.fillStyle='#3a1a00'; ctx.beginPath(); ctx.arc(px-4,py-4,3,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+4,py-4,3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(px-3,py-5,1.2,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+5,py-5,1.2,0,Math.PI*2); ctx.fill();
      // nose
      ctx.fillStyle='#4a2000'; ctx.beginPath(); ctx.arc(px,py+2,2.5,0,Math.PI*2); ctx.fill();
    }
  },
  { id:'alien_skin', name:'Alien',      emoji:'👽', how:'Defeat 7 aliens on Planet 1',
    badge:'earn', unlock:'aliens_p1',
    draw:(ctx,px,py,sz)=>{
      ctx.shadowColor='#0f0'; ctx.shadowBlur=18;
      const g=ctx.createRadialGradient(px,py,2,px,py,sz);
      g.addColorStop(0,'#80ff80'); g.addColorStop(1,'#006010');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,sz,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      // big alien eyes
      ctx.fillStyle='#000'; ctx.beginPath(); ctx.ellipse(px-6,py-3,6,8,-.4,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(px+6,py-3,6,8,.4,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(0,255,180,0.4)'; ctx.beginPath(); ctx.ellipse(px-6,py-4,3,5,-.4,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(px+6,py-4,3,5,.4,0,Math.PI*2); ctx.fill();
      // slit mouth
      ctx.strokeStyle='#004000'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(px-5,py+5); ctx.bezierCurveTo(px-3,py+7,px+3,py+7,px+5,py+5); ctx.stroke(); ctx.lineWidth=1;
      // head nubs
      ctx.fillStyle='#40c040'; ctx.beginPath(); ctx.arc(px-3,py-sz,3,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+3,py-sz,3,0,Math.PI*2); ctx.fill();
    }
  },
  { id:'frog', name:'Frog',             emoji:'🐸', how:'Find the hidden room on Zorbax',
    badge:'earn', unlock:'hidden_room',
    draw:(ctx,px,py,sz)=>{
      ctx.shadowColor='#4f4'; ctx.shadowBlur=12;
      ctx.fillStyle='#3a9a30'; ctx.beginPath(); ctx.arc(px,py,sz,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      // belly
      ctx.fillStyle='#8cd88a'; ctx.beginPath(); ctx.ellipse(px,py+4,sz*0.6,sz*0.65,0,0,Math.PI*2); ctx.fill();
      // bulging eyes on top
      ctx.fillStyle='#5aba40'; ctx.beginPath(); ctx.arc(px-sz*.5,py-sz+2,sz*0.4,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+sz*.5,py-sz+2,sz*0.4,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#ffd700'; ctx.beginPath(); ctx.arc(px-sz*.5,py-sz+2,sz*0.28,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+sz*.5,py-sz+2,sz*0.28,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(px-sz*.5,py-sz+2,sz*0.14,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+sz*.5,py-sz+2,sz*0.14,0,Math.PI*2); ctx.fill();
      // wide grin
      ctx.strokeStyle='#1a6010'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(px,py+5,7,.2,Math.PI-.2); ctx.stroke(); ctx.lineWidth=1;
    }
  },
  { id:'star_child', name:'Star Child',  emoji:'🌟', how:'Clear both planets',
    badge:'earn', unlock:'two_planets',
    draw:(ctx,px,py,sz)=>{
      const t=Date.now();
      const hue=(t*0.05)%360;
      ctx.shadowColor=`hsl(${hue},100%,70%)`; ctx.shadowBlur=24;
      const g=ctx.createRadialGradient(px,py,1,px,py,sz);
      g.addColorStop(0,`hsl(${hue},100%,80%)`); g.addColorStop(1,`hsl(${(hue+60)%360},100%,40%)`);
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,sz,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      // star points orbiting
      for(let i=0;i<5;i++){
        const a=t*0.003+i*Math.PI*2/5;
        const sx=px+Math.cos(a)*(sz+5), sy=py+Math.sin(a)*(sz+5);
        ctx.fillStyle=`hsl(${(hue+i*36)%360},100%,70%)`;
        ctx.font='8px serif'; ctx.textAlign='center'; ctx.fillText('✦',sx,sy+3);
      }
      // face
      ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(px-4,py-3,3,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+4,py-3,3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff'; ctx.font='10px serif'; ctx.textAlign='center'; ctx.fillText('✨',px,py+8);
    }
  },
  { id:'skeleton', name:'Skeleton',     emoji:'💀', how:'SECRET: Lose all your lives once',
    badge:'earn', unlock:'died_once',
    draw:(ctx,px,py,sz)=>{
      ctx.shadowColor='rgba(200,200,255,0.6)'; ctx.shadowBlur=14;
      ctx.fillStyle='#ddd'; ctx.beginPath(); ctx.arc(px,py,sz,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      // dark eye sockets
      ctx.fillStyle='#222'; ctx.beginPath(); ctx.ellipse(px-5,py-4,4,5,0,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(px+5,py-4,4,5,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(100,100,200,0.4)'; ctx.beginPath(); ctx.arc(px-5,py-4,2,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+5,py-4,2,0,Math.PI*2); ctx.fill();
      // nose cavity
      ctx.fillStyle='#333'; ctx.beginPath(); ctx.arc(px,py+2,2,0,Math.PI*2); ctx.fill();
      // teeth grin
      ctx.fillStyle='#bbb'; ctx.strokeStyle='#555'; ctx.lineWidth=0.5;
      for(let i=0;i<5;i++){ ctx.fillRect(px-7+i*3.2,py+6,2.5,4); ctx.strokeRect(px-7+i*3.2,py+6,2.5,4); }
      ctx.lineWidth=1;
      // crack on forehead
      ctx.strokeStyle='rgba(100,100,150,0.5)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(px,py-sz); ctx.lineTo(px+2,py-5); ctx.stroke(); ctx.lineWidth=1;
    }
  },
  { id:'wizard', name:'Wizard',         emoji:'🧙', how:'Buy from Village Elder: 5🍌 4💎 3🌿',
    badge:'buy', unlock:'buy', cost:{banana:5,crystal:4,plant:3},
    draw:(ctx,px,py,sz)=>{
      const t=Date.now();
      ctx.shadowColor='#a0f'; ctx.shadowBlur=16;
      // robe
      const g=ctx.createRadialGradient(px,py,2,px,py,sz);
      g.addColorStop(0,'#6010a0'); g.addColorStop(1,'#2a0050');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,sz,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      // stars on robe
      ctx.fillStyle='rgba(255,220,60,0.7)';
      [[px-4,py-2],[px+5,py+3],[px-6,py+4]].forEach(([sx,sy])=>{
        ctx.font='7px serif'; ctx.textAlign='center'; ctx.fillText('★',sx,sy);
      });
      // face
      ctx.fillStyle='#f5d090'; ctx.beginPath(); ctx.arc(px,py-4,sz*0.5,0,Math.PI*2); ctx.fill();
      // pointy hat
      ctx.fillStyle='#4a0080';
      ctx.beginPath(); ctx.moveTo(px,py-sz-14); ctx.lineTo(px-sz*.8,py-sz+2); ctx.lineTo(px+sz*.8,py-sz+2); ctx.closePath(); ctx.fill();
      // hat brim
      ctx.fillStyle='#5a1090'; ctx.fillRect(px-sz,py-sz+1,sz*2,4);
      // hat star
      ctx.fillStyle='#ffd700'; ctx.font='8px serif'; ctx.textAlign='center'; ctx.fillText('⭐',px,py-sz-4);
      // eyes
      ctx.fillStyle='#c060ff'; ctx.beginPath(); ctx.arc(px-4,py-5,2.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+4,py-5,2.5,0,Math.PI*2); ctx.fill();
      // flowing beard
      ctx.fillStyle='rgba(220,220,240,0.8)'; ctx.beginPath(); ctx.ellipse(px,py+2,5,7,0,0,Math.PI); ctx.fill();
    }
  },
];

function getSkin(id) { return ALL_SKINS.find(s=>s.id===id) || ALL_SKINS[0]; }

function checkSkinUnlocks() {
  // aliens_p1: no aliens remain on planet 1 (tracked via flag)
  // hidden_room: p2state.mapRevealed (using it as proxy — set when hidden room found)
  // boss_jungle: save.items.includes('banana_sword') (set when jungle king dies)
  // two_planets: both planets cleared
  // died_once: tracked in save

  const u = save.unlockedSkins || [];
  function tryUnlock(id) { if(!u.includes(id)) { u.push(id); save.unlockedSkins=u; persistSave(); showSkinUnlockToast(id); } }

  if(save.planetsCleared.includes(1)&&save.planetsCleared.includes(2)) tryUnlock('star_child');
  if(save.items&&save.items.includes('banana_sword')) tryUnlock('monkey_skin');
  if(save.aliensBeat) tryUnlock('alien_skin');
  if(save.hiddenRoomFound) tryUnlock('frog');
  if(save.diedOnce) tryUnlock('skeleton');
}

function showSkinUnlockToast(skinId) {
  const skin = getSkin(skinId);
  if(!skin) return;
  const t = document.createElement('div');
  t.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(80,0,140,0.95);border:1px solid rgba(200,100,255,0.7);color:#d8a0ff;padding:12px 24px;border-radius:10px;font-family:Orbitron,monospace;font-size:13px;z-index:999;text-align:center;box-shadow:0 0 30px rgba(160,60,255,0.4);animation:fadeInUp 0.4s ease;';
  t.innerHTML = `🎭 NEW SKIN UNLOCKED!<br><span style="font-size:22px">${skin.emoji}</span> <b>${skin.name}</b>`;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),3500);
}

function openSkinMenu() {
  checkSkinUnlocks();
  gamePaused = true;
  const grid = document.getElementById('skinGrid');
  grid.innerHTML = '';
  const unlocked = save.unlockedSkins || [];

  ALL_SKINS.forEach(skin => {
    const owned = unlocked.includes(skin.id);
    const isActive = save.skin === skin.id;
    const canBuy = skin.unlock === 'buy' && !owned && skin.cost &&
      Object.entries(skin.cost).every(([r,a])=>(save.resources[r]||0)>=a);

    const card = document.createElement('div');
    let cls = 'skin-card';
    if(isActive) cls += ' skin-active';
    else if(!owned && !canBuy) cls += ' skin-locked';
    else if(!owned && canBuy) cls += ' skin-buyable';
    card.className = cls;

    // badge
    let badge = '';
    if(isActive) badge = '<span class="skin-badge badge-active">ACTIVE</span>';
    else if(owned) badge = '<span class="skin-badge badge-owned">OWNED</span>';
    else if(skin.badge==='free') badge = '<span class="skin-badge badge-free">FREE</span>';
    else if(skin.badge==='buy') badge = '<span class="skin-badge badge-buy">BUY</span>';
    else if(skin.badge==='earn') badge = '<span class="skin-badge badge-earn">EARN</span>';

    // cost display
    let costHtml = '';
    if(!owned && skin.cost) {
      const icons={rock:'🪨',plant:'🌿',crystal:'💎',banana:'🍌',fuel:'⚡'};
      costHtml = '<div class="skin-cost">' + Object.entries(skin.cost).map(([r,a])=>{
        const has=(save.resources[r]||0)>=a;
        return `<span class="${has?'has':'lacks'}">${icons[r]||r}×${a}</span>`;
      }).join(' ') + '</div>';
    }

    // preview canvas
    const previewId = 'skin-prev-'+skin.id;
    card.innerHTML = `${badge}
      <canvas id="${previewId}" width="60" height="60" style="display:block;margin:0 auto 6px;"></canvas>
      <div class="skin-name">${skin.name}</div>
      <div class="skin-how">${skin.how}</div>
      ${costHtml}`;

    if(isActive) {
      card.title = 'Currently active';
    } else if(owned) {
      card.onclick = () => { save.skin = skin.id; persistSave(); openSkinMenu(); };
    } else if(canBuy) {
      card.onclick = () => {
        Object.entries(skin.cost).forEach(([r,a])=>save.resources[r]-=a);
        save.unlockedSkins = [...(save.unlockedSkins||[]), skin.id];
        save.skin = skin.id;
        persistSave(); updateHUD(); openSkinMenu();
      };
    }

    grid.appendChild(card);

    // Draw preview after DOM insert
    requestAnimationFrame(()=>{
      const c = document.getElementById(previewId);
      if(!c) return;
      const cx = c.getContext('2d');
      cx.clearRect(0,0,60,60);
      if(!owned && skin.unlock!=='free' && skin.unlock!=='buy') {
        // locked preview — silhouette
        cx.fillStyle='rgba(255,255,255,0.08)';
        cx.beginPath(); cx.arc(30,30,18,0,Math.PI*2); cx.fill();
        cx.font='22px serif'; cx.textAlign='center'; cx.fillText('🔒',30,37);
      } else {
        try { skin.draw(cx,30,30,18); } catch(e){}
      }
    });
  });

  document.getElementById('skinMenu').style.display='block';
}

function closeSkinMenu() {
  gamePaused = false;
  document.getElementById('skinMenu').style.display='none';
}

// Draw player using active skin
function drawPlayerSkin(ctx, px, py, size) {
  const skin = getSkin(save.skin || 'astronaut');
  try { skin.draw(ctx, px, py, size); } catch(e) {
    // fallback
    ctx.fillStyle='#5bd'; ctx.beginPath(); ctx.arc(px,py,size,0,Math.PI*2); ctx.fill();
  }
}


console.log("[SGA] skins.js init running");
loadSave();
if(!save.unlockedSkins){save.unlockedSkins=["astronaut","penguin"];}
console.log("[SGA] calling showMenu()");
showMenu();
