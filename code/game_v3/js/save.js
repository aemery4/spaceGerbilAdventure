function persist(){try{localStorage.setItem('sga3',JSON.stringify(save));}catch(e){}}
function loadSave(){try{const s=localStorage.getItem('sga3');if(s)save=Object.assign(JSON.parse(JSON.stringify(DEF)),JSON.parse(s));}catch(e){}}

// ════════════════════════════════════════
// js/hud.js
// ════════════════════════════════════════
// ── HUD ───────────────────────────────────────────────