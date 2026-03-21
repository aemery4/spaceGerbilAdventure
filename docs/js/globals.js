

// ════════════════════════════════════════
// js/globals.js
// ════════════════════════════════════════
// ── GLOBALS ───────────────────────────────────────────
// ── SAVE ──────────────────────────────────────────────
const DEF={hp:100,maxHp:100,lives:3,resources:{rock:0,plant:0,crystal:0,banana:0,fuel:0},items:[],planetsCleared:[],currentPlanet:0,freePlay:false,skin:'default',spaceCoins:0};
let save=JSON.parse(JSON.stringify(DEF));
let gamePaused=false, animFrameId=null;

// ════════════════════════════════════════
// js/save.js
// ════════════════════════════════════════
// ── SAVE ──────────────────────────────────────────────