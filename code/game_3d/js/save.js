function persist(){
  try{localStorage.setItem('sga3',JSON.stringify(save));}catch(e){}
  // Show save indicator
  const si=document.getElementById('saveIndicator');
  if(si){si.style.opacity='1';si.textContent='💾 Saved!';clearTimeout(si._t);si._t=setTimeout(()=>{si.style.opacity='0';},1500);}
}
function loadSave(){try{const s=localStorage.getItem('sga3');if(s)save=Object.assign(JSON.parse(JSON.stringify(DEF)),JSON.parse(s));}catch(e){}}

// ════════════════════════════════════════
// js/hud.js
// ════════════════════════════════════════
// ── HUD ───────────────────────────────────────────────