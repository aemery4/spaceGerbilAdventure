// HUD display functions
function updateHUD(){
  document.getElementById('hp').textContent=Math.ceil(save.hp);
  document.getElementById('lives').textContent='❤️'.repeat(Math.max(0,save.lives))+'🖤'.repeat(Math.max(0,3-save.lives));
  document.getElementById('rock').textContent=save.resources.rock||0;
  document.getElementById('plant').textContent=save.resources.plant||0;
  document.getElementById('crystal').textContent=save.resources.crystal||0;
  document.getElementById('banana').textContent=save.resources.banana||0;
  document.getElementById('fuel').textContent=save.resources.fuel||0;
  document.getElementById('coins').textContent=save.spaceCoins||0;
  const M={shield:'🛡',boots:'👟',medkit:'💊',scanner:'📡',magnet:'🧲',armor:'🦺',banana_sword:'🍌Sword',vine_hook:'🪝Hook',rocket_upgrade:'🚀Upg'};
  document.getElementById('items').textContent=save.items.map(i=>M[i]||i).join(' ')||'none';
}
function showMsg(t,b,cb,btn){
  gamePaused=true;
  document.getElementById('mt').textContent=t;
  document.getElementById('mb').textContent=b;
  document.getElementById('message').style.display='block';
  const el=document.getElementById('mbtn');
  el.textContent=btn||'OK';
  el.onclick=()=>{closeMsg();gamePaused=false;if(cb)cb();};
}
function closeMsg(){document.getElementById('message').style.display='none';}
let _toastTimer=null;
function showToast(title,body,duration){
  duration=duration||4000;
  const el=document.getElementById('toast');
  if(!el)return;
  document.getElementById('toastTitle').textContent=title||'';
  document.getElementById('toastBody').textContent=body||'';
  el.style.opacity='1';
  clearTimeout(_toastTimer);
  _toastTimer=setTimeout(()=>{el.style.opacity='0';},duration);
}
function closeShop(){document.getElementById('villageShop').style.display='none';gamePaused=false;}
function loseLife(restartFn){save.lives--;save.hp=save.maxHp;if(save.lives<=0)save.lives=3;persist();updateHUD();restartFn();}
function togglePause(){
  // Don't pause when on a modal/menu
  if(document.getElementById('message').style.display==='block') return;
  if(document.getElementById('craftPanel').style.display==='block') return;
  gamePaused=!gamePaused;
  const btn=document.getElementById('pauseBtn');
  if(btn) btn.textContent=gamePaused?'▶ Resume [P]':'⏸ Pause [P]';
}
// Global P-key listener (works on all planets)
window.addEventListener('keydown',function(e){
  if((e.key==='p'||e.key==='P')&&save.currentPlanet>0) togglePause();
});

// ── CRAFTING ──────────────────────────────────────────
const RECIPES=[
  {id:'shield',name:'🛡 Energy Shield',desc:'Halves all damage.',cost:{rock:3,crystal:2}},
  {id:'boots',name:'👟 Rocket Boots',desc:'Speed +2 forever.',cost:{rock:2,plant:2}},
  {id:'medkit',name:'💊 Medkit',desc:'+50 HP (one-use).',cost:{plant:3,crystal:1}},
  {id:'scanner',name:'📡 Scanner',desc:'Double gather range.',cost:{crystal:3,rock:1}},
  {id:'magnet',name:'🧲 Fuel Magnet',desc:'Auto-collect fuel.',cost:{rock:2,crystal:2}},
  {id:'armor',name:'🦺 Space Armor',desc:'Max HP→150, +25 HP.',cost:{rock:4,plant:2}},
];

// ════════════════════════════════════════
// js/craft.js
// ════════════════════════════════════════
// ── CRAFT ─────────────────────────────────────────────