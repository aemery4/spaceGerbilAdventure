// ════════════════════════════════════════
// js/planet3.js  — launchP3()
// Tundra Frigia — defeat the Yeti, collect 20 fuel
// ════════════════════════════════════════

function launchP3() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const TILE = 26, COLS = 48, ROWS = 28;

  // ── Build game data ───────────────────────────────────────
  const {map, resources, chests, tigers, mammoths, yeti, snowflakes} = buildP3Data(TILE, COLS, ROWS);

  // ── Player ───────────────────────────────────────────────
  const player = {
    x: 2*TILE+13, y: 2*TILE+13, size: 13,
    speed: save.items.includes('boots')?5:3,
    keys: {}, invincible: 0, speedTimer: 0,
  };
  const cam = { x:0, y:0 };

  // ── State ─────────────────────────────────────────────────
  const p3state = { caveRevealed: false, yetiBossDefeated: false };
  let particles = [];
  let activeWeapon = save.items.find(i=>i.startsWith('w:'))?.slice(2) || null;
  let weaponCooldown = 0;
  let snowAnim = 0;
  let p3ActiveShop = null;

  // ── Camp Merchants (survivor camp, cols 24-29) ────────────
  const CAMP_MERCHANTS = [
    {
      id:'helga', name:'Helga the Hunter', emoji:'🗡️', color:'#8a6a4a', bobOffset:0,
      x:25*TILE+13, y:3*TILE+13,
      dialog:'Survived three winters here. Got weapons, if you\'ve got resources.',
      shop:[
        {id:'frostpot',   name:'Frost Salve',    emoji:'🩹', desc:'Restores 40 HP',          cost:{rock:3,plant:2},  effect:()=>{save.hp=Math.min(save.maxHp,save.hp+40);updateHUD();}},
        {id:'megasalve3', name:'Mega Salve',      emoji:'💚', desc:'+30 max HP permanently',  cost:{crystal:4,plant:3},effect:()=>{if(!save.items.includes('megasalve3')){save.items.push('megasalve3');save.maxHp+=30;save.hp=Math.min(save.maxHp,save.hp+30);updateHUD();}}},
        {id:'iceshard',   name:'Ice Shard x5',   emoji:'💠', desc:'Get 5 crystal shards',    cost:{rock:4,banana:2}, effect:()=>{save.resources.crystal=(save.resources.crystal||0)+5;updateHUD();}},
        {id:'tundra_boots',name:'Tundra Boots',   emoji:'👢', desc:'Move faster in snow (permanent)',cost:{crystal:3,rock:3},effect:()=>{if(!save.items.includes('tundra_boots')){save.items.push('tundra_boots');player.speed=4.5;persist();}}},
      ]
    },
    {
      id:'boris', name:'Boris the Trapper', emoji:'🐾', color:'#6a8060', bobOffset:1.8,
      x:28*TILE+13, y:5*TILE+13,
      dialog:'I trap things. Tigers mostly. Sometimes yetis. Here, buy something.',
      shop:[
        {id:'trapkit',    name:'Trap Kit',        emoji:'🪤', desc:'Place a trap — stuns nearby enemies for 4s',cost:{rock:5},effect:()=>{save.items.push('trapkit');updateHUD();}},
        {id:'buy_fur',    name:'Mammoth Fur',     emoji:'🟫', desc:'Trade for 4 crystal',    cost:{plant:4,rock:2},  effect:()=>{save.resources.crystal=(save.resources.crystal||0)+4;updateHUD();}},
        {id:'fuel_boris', name:'Fuel Cell',       emoji:'⚡', desc:'Get 2 fuel cells',       cost:{rock:4,crystal:2},effect:()=>{save.resources.fuel=(save.resources.fuel||0)+2;updateHUD();}},
        {id:'shield_fur', name:'Fur Shield',      emoji:'🛡️', desc:'Gives Fur Shield — halves melee damage',cost:{crystal:5,plant:4},effect:()=>{if(!save.items.includes('ruin_shield')){save.items.push('ruin_shield');persist();}}},
      ]
    },
    {
      id:'elder3', name:'Ice Elder', emoji:'🧊', color:'#8aaccc', bobOffset:3.0,
      x:26*TILE+13, y:10*TILE+13,
      dialog:'The Yeti has slept for a thousand years. You have... awoken it. Tread carefully.',
      shop:[
        {id:'map3_reveal', name:'Reveal Cave',   emoji:'🗺️', desc:'Reveals the hidden cave on the map',cost:{crystal:3,plant:2},effect:()=>{p3state.caveRevealed=true;showMsg('🏔️ Cave Location','The Ice Elder marks the cave on your map.\n\n⚠️ The Yeti awaits inside!');persist();}},
        {id:'yeti_lore',   name:'Yeti Lore',     emoji:'📜', desc:'Learn Yeti weaknesses (+1 dmg on yeti)',cost:{crystal:4},effect:()=>{if(!save.items.includes('yeti_lore')){save.items.push('yeti_lore');showMsg('📜 Yeti Lore','The Yeti is weakest when stunned!\n\nHeavy weapons (War Club, Yeti Claw) can stun it.\nAttack fast during stun windows!');persist();}}},
        {id:'ice_armor',   name:'Ice Armor',     emoji:'🧊', desc:'Grants extra shield — more protection',cost:{crystal:6,rock:4},effect:()=>{if(!save.items.includes('ice_armor')){save.items.push('ice_armor');save.maxHp+=20;save.hp=Math.min(save.maxHp,save.hp+20);updateHUD();persist();}}},
        {id:'wizard3',     name:'Blizzard Skin', emoji:'🌨️', desc:'Unlocks Blizzard Gerbil skin',       cost:{crystal:8,plant:6},effect:()=>{if(!save.unlockedSkins)save.unlockedSkins=[];if(!save.unlockedSkins.includes('blizzard')){save.unlockedSkins.push('blizzard');checkSkinUnlocks();persist();showMsg('🌨️ Skin Unlocked!','Blizzard Gerbil skin added to your wardrobe!');}}},
      ]
    },
  ];

  // ── State bundle (passed to helpers) ─────────────────────
  const state = {
    TILE, COLS, ROWS, map, canvas, ctx, player, cam,
    resources, chests, tigers, mammoths, yeti, snowflakes,
    particles, p3state, snowAnim, weaponCooldown, activeWeapon,
    CAMP_MERCHANTS,
  };
  // Keep state.particles in sync with local ref
  Object.defineProperty(state, 'particles', {
    get: () => particles, set: v => { particles = v; }
  });
  Object.defineProperty(state, 'snowAnim', {
    get: () => snowAnim, set: v => { snowAnim = v; }
  });
  Object.defineProperty(state, 'weaponCooldown', {
    get: () => weaponCooldown, set: v => { weaponCooldown = v; }
  });
  Object.defineProperty(state, 'activeWeapon', {
    get: () => activeWeapon, set: v => { activeWeapon = v; }
  });

  // ── Click handler ─────────────────────────────────────────
  function doP3Action(mx, my){
    if(gamePaused) return;

    // Chest click
    for(const ch of chests){
      if(!ch.opened&&Math.hypot(mx-ch.x,my-ch.y)<TILE*1.5&&Math.hypot(player.x-ch.x,player.y-ch.y)<TILE*2.5){
        ch.opened=true; activeWeapon=ch.weapon;
        const wKey='w:'+ch.weapon;
        if(!save.items.includes(wKey)) save.items.push(wKey);
        persist(); updateHUD();
        showMsg('📦 Weapon Found!',`${ch.label} ${ch.name}\n\n${ch.desc}\n\nEquipped!`);
        return;
      }
    }

    // Merchant click
    for(const m of CAMP_MERCHANTS){
      if(Math.hypot(mx-m.x,my-m.y)<30&&Math.hypot(player.x-m.x,player.y-m.y)<TILE*2.5){
        openP3Shop(m); return;
      }
    }

    // Attack tigers
    for(let i=tigers.length-1;i>=0;i--){
      const a=tigers[i];
      const reach=activeWeapon==='bone_spear'?TILE*5:activeWeapon==='frost_bow'?TILE*5:TILE*3;
      if(Math.hypot(mx-a.x,my-a.y)<a.size+10&&Math.hypot(player.x-a.x,player.y-a.y)<reach){
        const dmg=activeWeapon==='war_club'?5:activeWeapon==='yeti_claw'?8:activeWeapon==='ice_blade'?3:activeWeapon==='bone_spear'?4:2;
        a.hp-=dmg; if(a.slowTimer===0&&activeWeapon==='ice_blade') a.slowTimer=90;
        addP3(a.x,a.y,'#fa8',6,state);
        if(a.hp<=0){addP3(a.x,a.y,'#f80',14,state);save.resources.crystal=(save.resources.crystal||0)+1;tigers.splice(i,1);updateHUD();}
        return;
      }
    }

    // Attack mammoths (they retaliate unless you have mammoth_tusk weapon)
    for(let i=mammoths.length-1;i>=0;i--){
      const m=mammoths[i];
      if(Math.hypot(mx-m.x,my-m.y)<m.size+10&&Math.hypot(player.x-m.x,player.y-m.y)<TILE*3.5){
        const dmg=activeWeapon==='war_club'?5:activeWeapon==='yeti_claw'?8:activeWeapon==='mammoth_tusk'?6:2;
        m.hp-=dmg; addP3(m.x,m.y,'#c84',6,state);
        if(activeWeapon==='blizzard_orb') m.slowTimer=120;
        // Mammoth retaliates unless player has mammoth_tusk
        const hasTusk=save.items.some(it=>it.startsWith('w:mammoth_tusk'));
        if(!hasTusk&&!m.angered){
          m.angered=true;
          showMsg('🦣 Mammoth Angered!','The mammoth charges! You shouldn\'t have done that.\n\nTip: The Mammoth Tusk weapon lets you fight them peacefully.');
        }
        if(m.hp<=0){
          addP3(m.x,m.y,'#b08040',20,state);
          save.resources.rock=(save.resources.rock||0)+3;
          save.resources.plant=(save.resources.plant||0)+2;
          mammoths.splice(i,1); updateHUD();
        }
        return;
      }
    }

    // Attack yeti
    if(yeti.alive){
      const bd=Math.hypot(mx-yeti.x,my-yeti.y);
      const pd=Math.hypot(player.x-yeti.x,player.y-yeti.y);
      if(bd<yeti.size+12&&pd<TILE*3.5){
        const base=activeWeapon==='yeti_claw'?8:activeWeapon==='war_club'?5:activeWeapon==='ice_blade'?3:activeWeapon==='bone_spear'?4:1;
        const bonus=save.items.includes('yeti_lore')?1:0;
        const dmg=base+bonus;
        yeti.hp-=dmg; addP3(yeti.x,yeti.y,'#aef',10,state);
        // Heavy weapons stun yeti
        if((activeWeapon==='war_club'||activeWeapon==='yeti_claw')&&dmg>=5){
          yeti.stunTimer=Math.max(yeti.stunTimer,60);
          addP3(yeti.x,yeti.y,'#fff',8,state);
        }
        if(yeti.hp<=0){
          yeti.alive=false; yetiDie(state);
        }
        return;
      }
    }

    // Collect resources
    for(let i=resources.length-1;i>=0;i--){
      const r2=resources[i];
      if(r2.hidden&&!p3state.caveRevealed) continue;
      const rx=r2.x*TILE+TILE/2, ry=r2.y*TILE+TILE/2;
      const reach=save.items.includes('magnet')?TILE*3:TILE*1.2;
      if(Math.hypot(mx-rx,my-ry)<TILE*.9&&Math.hypot(player.x-rx,player.y-ry)<reach){
        r2.hp--; addP3(rx,ry,r2.color,4,state);
        if(r2.hp<=0){
          save.resources[r2.type]=(save.resources[r2.type]||0)+1;
          resources.splice(i,1); updateHUD();
          if(r2.type==='fuel'&&save.resources.fuel>=20&&p3state.yetiBossDefeated){
            showMsg('🚀 Launch Ready!','20 fuel collected + Yeti defeated!\n\nPlanet 4 unlocked!');
          }
        }
        return;
      }
    }
  }

  // ── Keyboard handlers ─────────────────────────────────────
  const onClick = e => {
    const rect=canvas.getBoundingClientRect();
    doP3Action(e.clientX-rect.left+cam.x, e.clientY-rect.top+cam.y);
  };
  const onKey = e => {
    player.keys[e.key]=true;
    if(e.key===' ') doP3Action(player.x, player.y);
    e.preventDefault();
  };
  const offKey = e => player.keys[e.key]=false;

  window.addEventListener('keydown',onKey);
  window.addEventListener('keyup',offKey);
  canvas.addEventListener('click',onClick);

  // ── Shop functions ────────────────────────────────────────
  function openP3Shop(merchant) {
    p3ActiveShop=merchant; gamePaused=true;
    const panel=document.getElementById('villageShop');
    document.getElementById('shopMerchantName').textContent=merchant.emoji+' '+merchant.name;
    document.getElementById('shopMerchantDialog').textContent='"'+merchant.dialog+'"';
    renderP3ShopItems(merchant);
    panel.style.display='block';
  }
  function renderP3ShopItems(merchant) {
    const grid=document.getElementById('shopGrid');
    grid.innerHTML='';
    merchant.shop.forEach(item=>{
      const canAfford=Object.entries(item.cost).every(([res,amt])=>(save.resources[res]||0)>=amt);
      const owned=!item.id.startsWith('buy_')&&!item.id.startsWith('fuel_')&&
                   item.id!=='frostpot'&&item.id!=='iceshard'&&item.id!=='trapkit'&&
                   item.id!=='buy_fur'&&save.items.includes(item.id);
      const el=document.createElement('div');
      el.className='shop-item'+((!canAfford)?' shop-disabled':'')+(owned?' shop-owned':'');
      const costStr=Object.entries(item.cost).map(([r3,a])=>{
        const icons={rock:'🪨',plant:'❄️',crystal:'💎',banana:'🍌',fuel:'⚡'};
        const has=(save.resources[r3]||0)>=a;
        return `<span class="${has?'has':'lacks'}">${icons[r3]||r3}×${a}</span>`;
      }).join('');
      el.innerHTML=`<div class="shop-item-name">${item.emoji} ${item.name}</div>
        <div class="shop-item-desc">${item.desc}</div>
        <div class="shop-cost">${costStr}${owned?'<span style="color:#5d9;margin-left:4px">✓ Owned</span>':''}</div>`;
      if(canAfford&&!owned){
        el.onclick=()=>{
          Object.entries(item.cost).forEach(([res,amt])=>save.resources[res]-=amt);
          item.effect(); persist(); renderP3ShopItems(merchant);
          el.style.background='rgba(80,180,200,0.3)';
        };
      }
      grid.appendChild(el);
    });
  }

  // Yeti defeat callback
  function yetiDie(st) {
    p3state.yetiBossDefeated=true;
    addP3(yeti.x,yeti.y,'#aef',40,st); addP3(yeti.x,yeti.y,'#fff',40,st);
    if(!save.items.includes('yeti_claw')) save.items.push('yeti_claw');
    save.planetsCleared=save.planetsCleared||[];
    if(!save.planetsCleared.includes(3)) save.planetsCleared.push(3);
    updateHUD(); persist();
    setTimeout(()=>showMsg('❄️ YETI DEFEATED!',
      'The Yeti lets out a thunderous roar and collapses!\n\n'+
      '🐾 Got: YETI CLAW (best weapon!)\n'+
      '🏆 Planet 3 Cleared!\n\n'+
      'Collect 20 ⚡ fuel to reach Planet 4!'),500);
  }

  // ── Game loop ─────────────────────────────────────────────
  function loop() {
    updateP3(state);

    // ── DRAW ─────────────────────────────────────────────────
    // Sky gradient — cold blue-grey
    const bg=ctx.createLinearGradient(0,0,0,canvas.height);
    bg.addColorStop(0,'#1a2a3a'); bg.addColorStop(1,'#2a3a4a');
    ctx.fillStyle=bg; ctx.fillRect(0,0,canvas.width,canvas.height);

    // Draw tiles
    for(let ty=0;ty<ROWS;ty++) for(let tx=0;tx<COLS;tx++) drawP3Tile(ctx,tx,ty,state);

    // Draw camp structures + merchants
    drawP3Camp(ctx, state);

    // Draw entities + particles + snowflakes
    drawP3Entities(ctx, state);

    // Draw player
    const px=player.x-cam.x, py=player.y-cam.y;
    const pFlash=player.invincible>0&&Math.floor(Date.now()/80)%2===0;
    if(!pFlash) drawPlayerSkin(ctx, px, py, player.size);
    // Player hp bar
    ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(px-21,py-player.size-11,42,6);
    const hpPct=save.hp/save.maxHp;
    ctx.fillStyle=hpPct>0.5?'rgba(50,220,80,0.9)':hpPct>0.25?'rgba(255,170,0,0.9)':'rgba(255,60,60,0.9)';
    ctx.fillRect(px-21,py-player.size-11,42*hpPct,6);
    ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.strokeRect(px-21,py-player.size-11,42,6);

    // Launch ready banner
    if(save.resources.fuel>=20&&p3state.yetiBossDefeated){
      ctx.fillStyle='rgba(180,230,255,.9)';ctx.font='bold 14px Courier New';ctx.textAlign='center';
      ctx.fillText('🚀 ROCKET READY! Yeti defeated + 20 fuel collected!',canvas.width/2,canvas.height-18);
    }

    // Paused overlay
    if(gamePaused&&!p3ActiveShop){
      ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle='#cef';ctx.font='bold 22px Courier New';ctx.textAlign='center';
      ctx.fillText('⏸ PAUSED',canvas.width/2,canvas.height/2);
    }

    animFrameId=requestAnimationFrame(loop);
  }

  // Listeners registered above

  // Welcome message then start
  showMsg('❄️ Tundra Frigia',
    'Planet 3 — The frozen wastes of Frigia!\n\n'+
    '🐯 Saber-tooth tigers hunt you on sight\n'+
    '🦣 Mammoths are neutral — don\'t provoke them!\n'+
    '❄️ A Yeti lurks in a hidden cave\n'+
    '⚡ Collect 20 fuel to launch to Planet 4',
    ()=>{ animFrameId=requestAnimationFrame(loop); });
}
