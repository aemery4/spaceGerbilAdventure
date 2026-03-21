// Crafting system
function toggleCraft(){
  const p=document.getElementById('craftPanel');
  if(p.style.display==='block'){p.style.display='none';gamePaused=false;return;}
  gamePaused=true; renderCraft(); p.style.display='block';
}
function renderCraft(){
  const g=document.getElementById('cg'); g.innerHTML='';
  const icons={rock:'🪨',plant:'🌿',crystal:'💎',banana:'🍌'};
  RECIPES.forEach(r=>{
    const owned=save.items.includes(r.id)&&r.id!=='medkit';
    const can=Object.entries(r.cost).every(([k,v])=>(save.resources[k]||0)>=v);
    const d=document.createElement('div');
    d.className='ci'+(owned?' co':(!can?' cd':''));
    const costH=Object.entries(r.cost).map(([k,v])=>`<span class="${(save.resources[k]||0)>=v?'h':'l'}">${icons[k]}${v}</span>`).join('');
    d.innerHTML=`<div class="cn">${r.name}</div><div class="cdesc">${r.desc}</div><div class="cc">${costH}${owned?'<span class="h">✓</span>':''}</div>`;
    if(!owned&&can) d.onclick=()=>{
      Object.entries(r.cost).forEach(([k,v])=>save.resources[k]-=v);
      if(r.id==='medkit'){save.hp=Math.min(save.maxHp,save.hp+50);}
      else{if(!save.items.includes(r.id))save.items.push(r.id);if(r.id==='armor'){save.maxHp=150;save.hp=Math.min(save.hp+25,150);}}
      persist();updateHUD();renderCraft();
    };
    g.appendChild(d);
  });
}
window.addEventListener('keydown',e=>{if(e.key==='c'||e.key==='C')if(document.getElementById('hud').style.display!=='none')toggleCraft();});

// ── GEAR PANEL ──────────────────────────────────────────
// All known weapons and armor with display info
const GEAR_DB = {
  // Weapons (stored as w:id in save.items)
  weapons: {
    banana_sword:  {name:'Banana Sword',   emoji:'🍌', desc:'Melee. Decent damage.'},
    vine_hook:     {name:'Vine Hook',      emoji:'🪝', desc:'Ranged grapple weapon.'},
    crystal_bow:   {name:'Crystal Bow',    emoji:'🏹', desc:'Auto-fires at enemies.'},
    jungle_bow:    {name:'Jungle Bow',     emoji:'🎯', desc:'Long-range auto-fire.'},
    rock_hammer:   {name:'Rock Hammer',    emoji:'🔨', desc:'Heavy melee. 3 damage.'},
    obsidian_axe:  {name:'Obsidian Axe',   emoji:'🪓', desc:'Massive 5 damage hits.'},
    lava_sword:    {name:'Lava Sword',     emoji:'🔥', desc:'Burns enemies over time.'},
    vine_whip:     {name:'Vine Whip',      emoji:'🌿', desc:'Extended melee range.'},
    poison_dart:   {name:'Poison Dart',    emoji:'☠️', desc:'Poisons for 5 ticks.'},
    thunder_orb:   {name:'Thunder Orb',    emoji:'⚡', desc:'AoE damage to nearby.'},
    frost_bow:     {name:'Frost Bow',      emoji:'🧊', desc:'Auto-fire ice arrows.'},
    blizzard_orb:  {name:'Blizzard Orb',   emoji:'❄️', desc:'AoE slow effect.'},
    bone_spear:    {name:'Bone Spear',     emoji:'🦴', desc:'Long-range melee. 4 dmg.'},
    war_club:      {name:'War Club',       emoji:'🏏', desc:'Heavy. Stuns bosses.'},
    ice_blade:     {name:'Ice Blade',      emoji:'🗡️', desc:'Slows enemies on hit.'},
    yeti_claw:     {name:'Yeti Claw',      emoji:'🐾', desc:'Massive 8 damage!'},
    mammoth_tusk:  {name:'Mammoth Tusk',   emoji:'🦷', desc:'6 dmg. Tames mammoths.'},
    laser:         {name:'Laser Gun',      emoji:'🔫', desc:'Ranged. 3 damage.'},
    sword:         {name:'Coral Sword',    emoji:'⚔️', desc:'Underwater melee. 2 dmg.'},
  },
  // Armor & tools (stored directly in save.items)
  armor: {
    shield:        {name:'Energy Shield',  emoji:'🛡️', desc:'Halves all damage.'},
    boots:         {name:'Rocket Boots',   emoji:'👟', desc:'Speed +2.'},
    scanner:       {name:'Scanner',        emoji:'📡', desc:'Double gather range.'},
    magnet:        {name:'Fuel Magnet',    emoji:'🧲', desc:'Auto-collect fuel.'},
    armor:         {name:'Space Armor',    emoji:'🦺', desc:'Max HP 150.'},
    ruin_shield:   {name:'Ruin Shield',    emoji:'🛡️', desc:'Blocks 80% melee dmg.'},
    rocket_upgrade:{name:'Rocket Upgrade', emoji:'🚀', desc:'Fuel efficiency.'},
  }
};

// Get current active weapon across all planet states
function getActiveWeapon() {
  if (typeof p2 !== 'undefined' && p2) return p2.activeWeapon;
  if (typeof p4 !== 'undefined' && p4) return p4.activeWeapon;
  // P3 stores it differently
  if (typeof p3 !== 'undefined' && p3) return p3.activeWeapon;
  return save.items.find(i => i.startsWith('w:'))?.slice(2) || null;
}

function setActiveWeapon(weaponId) {
  if (typeof p2 !== 'undefined' && p2) p2.activeWeapon = weaponId;
  if (typeof p3 !== 'undefined' && p3) p3.activeWeapon = weaponId;
  if (typeof p4 !== 'undefined' && p4) p4.activeWeapon = weaponId;
  // Move selected weapon to front of items list so it's picked up on planet load
  const wKey = 'w:' + weaponId;
  save.items = save.items.filter(i => !i.startsWith('w:'));
  save.items.unshift(wKey);
  // Re-add other weapons
  const allW = save.items.filter(i => i.startsWith('w:'));
  save.items = [...allW, ...save.items.filter(i => !i.startsWith('w:'))];
  persist();
  updateHUD();
}

function toggleGear() {
  const p = document.getElementById('gearPanel');
  if (p.style.display === 'block') { p.style.display = 'none'; gamePaused = false; return; }
  gamePaused = true; renderGear(); p.style.display = 'block';
}

function renderGear() {
  const wGrid = document.getElementById('gearWeaponGrid');
  const aGrid = document.getElementById('gearArmorGrid');
  wGrid.innerHTML = ''; aGrid.innerHTML = '';

  const currentWeapon = getActiveWeapon();
  const ownedWeapons = save.items.filter(i => i.startsWith('w:')).map(i => i.slice(2));
  const ownedArmor = save.items.filter(i => !i.startsWith('w:') && GEAR_DB.armor[i]);

  if (ownedWeapons.length === 0) {
    wGrid.innerHTML = '<div style="color:#666;font-size:11px;padding:8px;grid-column:1/-1;">No weapons yet. Find them in chests or shops!</div>';
  }

  // Unarmed option
  const unarmed = document.createElement('div');
  unarmed.className = 'ci' + (!currentWeapon ? ' co' : '');
  unarmed.innerHTML = '<div class="cn">✊ Unarmed</div><div class="cdesc">Basic attack. 1 damage.</div>' +
    (!currentWeapon ? '<div class="cc"><span class="h">EQUIPPED</span></div>' : '<div class="cc" style="color:#888;">Click to equip</div>');
  if (currentWeapon) unarmed.onclick = () => { setActiveWeapon(null); renderGear(); };
  // Override setActiveWeapon for null
  if (currentWeapon) unarmed.onclick = () => {
    if (typeof p2 !== 'undefined' && p2) p2.activeWeapon = null;
    if (typeof p3 !== 'undefined' && p3) p3.activeWeapon = null;
    if (typeof p4 !== 'undefined' && p4) p4.activeWeapon = null;
    persist(); updateHUD(); renderGear();
  };
  wGrid.appendChild(unarmed);

  ownedWeapons.forEach(wId => {
    const info = GEAR_DB.weapons[wId] || {name: wId, emoji: '⚔️', desc: 'Unknown weapon.'};
    const isActive = currentWeapon === wId;
    const d = document.createElement('div');
    d.className = 'ci' + (isActive ? ' co' : '');
    d.style.borderColor = isActive ? '#f80' : '';
    d.innerHTML = `<div class="cn">${info.emoji} ${info.name}</div><div class="cdesc">${info.desc}</div>` +
      (isActive ? '<div class="cc"><span class="h" style="color:#f80;">⚔️ EQUIPPED</span></div>' : '<div class="cc" style="color:#888;">Click to equip</div>');
    if (!isActive) d.onclick = () => { setActiveWeapon(wId); renderGear(); };
    wGrid.appendChild(d);
  });

  if (ownedArmor.length === 0) {
    aGrid.innerHTML = '<div style="color:#666;font-size:11px;padding:8px;grid-column:1/-1;">No armor or tools yet. Craft them with [C]!</div>';
  }
  ownedArmor.forEach(aId => {
    const info = GEAR_DB.armor[aId] || {name: aId, emoji: '❓', desc: 'Unknown item.'};
    const d = document.createElement('div');
    d.className = 'ci co';
    d.innerHTML = `<div class="cn">${info.emoji} ${info.name}</div><div class="cdesc">${info.desc}</div><div class="cc"><span class="h">✓ Active</span></div>`;
    aGrid.appendChild(d);
  });
}

window.addEventListener('keydown', e => {
  if (e.key === 'g' || e.key === 'G') if (document.getElementById('hud').style.display !== 'none') toggleGear();
});

// ── MENU (drawn on canvas) ────────────────────────────