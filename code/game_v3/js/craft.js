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

// ── MENU (drawn on canvas) ────────────────────────────