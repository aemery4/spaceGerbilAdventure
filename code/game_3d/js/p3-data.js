// ════════════════════════════════════════
// js/p3-data.js  — Planet 3: Tundra Frigia
// Map data, enemy definitions, resource list, constants
// ════════════════════════════════════════

// Called once by launchP3() to build all mutable state
function buildP3Data(TILE, COLS, ROWS) {

  // ── Tile key ──────────────────────────────────────────
  // 0 = tundra floor   1 = ice wall       2 = deep snow (slows)
  // 3 = frozen tree    4 = blizzard patch  5 = hidden cave floor
  // 6 = frozen lake    7 = camp floor      8 = lava vent (rare)
  // 9 = ruins/rock     10 = chest

  const map = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,7,7,7,7,1,9,9,1,9,9,9,1,9,1,0,0,0,0,0,0,0,1],
    [1,0,2,2,0,0,0,2,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,7,7,7,7,1,9,9,1,9,9,1,1,9,1,0,0,0,3,0,0,0,1],
    [1,0,0,0,0,0,0,2,0,0,0,0,0,0,3,0,0,0,0,0,4,4,4,4,7,7,7,7,7,4,4,1,1,1,9,9,1,1,9,1,0,3,0,0,0,0,0,1],
    [1,0,0,0,0,3,0,0,0,6,6,0,0,0,0,0,0,0,0,0,0,3,4,0,7,7,7,7,7,7,1,1,9,9,9,9,1,1,9,1,0,0,0,3,0,10,0,1],
    [1,0,0,3,0,3,0,0,0,6,6,6,0,0,0,0,0,0,0,0,0,3,0,0,7,7,7,7,7,7,1,1,9,1,1,9,1,1,9,1,1,1,1,0,1,1,1,1],
    [1,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,7,7,7,7,9,10,9,9,9,9,9,1,1,1,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,2,0,0,0,0,0,1,1,4,1,1,2,0,0,0,0,0,7,7,7,7,7,7,1,1,9,1,1,9,1,1,9,1,3,0,0,0,0,0,0,1],
    [1,1,0,0,0,0,0,0,0,0,0,0,0,1,5,5,5,1,2,0,0,0,4,0,7,7,7,7,7,7,1,1,9,9,9,9,1,1,9,1,0,3,0,0,0,0,0,1],
    [1,0,0,0,3,0,0,0,0,0,0,0,0,1,5,5,5,1,0,0,0,4,4,4,7,7,7,7,7,4,4,1,1,9,9,1,1,1,9,1,1,1,1,1,0,1,1,1],
    [1,0,0,0,3,0,0,0,0,0,6,6,0,0,0,0,0,0,0,0,0,3,0,0,7,7,7,7,7,7,1,9,9,9,1,9,10,1,9,1,0,0,0,0,0,0,0,1],
    [1,0,2,2,0,0,0,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,7,7,7,7,1,9,9,9,1,9,9,1,9,1,0,3,0,0,0,10,0,1],
    [1,0,0,0,0,0,3,0,0,4,0,0,0,0,0,0,0,0,0,3,0,0,0,0,7,7,7,7,7,7,1,1,1,1,1,1,1,1,1,1,0,0,3,0,0,0,0,1],
    [1,0,0,0,0,0,3,0,0,4,0,0,0,0,0,0,0,0,0,3,0,0,0,0,7,7,7,7,7,7,0,0,0,0,0,0,0,0,0,1,3,0,0,10,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,7,7,7,7,7,7,1,1,1,0,1,1,1,1,0,1,1,1,1,1,1,1,1,1],
    [1,0,3,0,0,0,0,0,0,0,0,0,2,0,0,0,2,0,0,0,0,0,0,0,7,7,7,7,7,7,4,0,3,3,0,0,2,0,0,0,3,0,0,0,0,0,0,1],
    [1,0,3,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,7,7,7,7,7,7,4,0,0,10,3,2,0,6,6,0,0,3,0,0,0,0,0,1],
    [1,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,7,7,7,7,0,3,0,0,0,0,0,6,6,0,3,0,0,2,0,0,0,1],
    [1,0,0,0,4,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0,4,4,4,4,7,7,7,7,4,4,4,0,3,0,0,0,0,0,0,0,0,0,2,0,0,4,0,1],
    [1,0,0,0,0,0,0,0,6,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,7,7,7,7,7,7,0,0,0,3,0,0,10,0,2,0,0,2,0,3,0,4,0,1],
    [1,0,0,2,2,0,0,0,0,0,0,0,2,0,0,0,0,0,0,3,0,0,0,0,7,7,7,7,7,7,0,0,0,0,3,0,0,2,4,10,0,3,0,0,6,6,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,2,0,0,4,0,0,0,0,0,0,0,0,7,7,7,7,7,7,0,0,3,0,0,0,0,0,4,0,3,0,0,0,6,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,2,4,0,0,0,0,0,0,0,0,7,7,7,7,7,7,0,0,0,4,0,0,0,0,0,0,0,3,0,3,0,6,0,1],
    [1,0,0,0,0,4,0,0,0,0,0,0,0,0,2,0,0,0,6,0,0,0,0,0,7,7,7,7,7,7,0,0,6,4,0,3,0,0,0,2,0,0,3,0,0,0,0,1],
    [1,0,0,0,0,4,0,0,0,0,3,0,0,0,0,0,0,0,6,6,0,0,0,0,7,7,7,7,7,7,0,0,6,0,0,0,3,0,2,0,0,0,0,0,3,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,7,7,7,7,0,0,0,0,0,3,0,0,0,0,2,0,0,3,0,10,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,7,7,7,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  ];

  // ── Resources scattered across tundra ─────────────────
  const resources = [
    // West tundra — ice shards, frost plants, fuel cells
    {x:3,y:2,type:'rock',label:'🪨',color:'#88f',hp:2,maxhp:2},
    {x:7,y:4,type:'rock',label:'🪨',color:'#88f',hp:2,maxhp:2},
    {x:11,y:3,type:'plant',label:'❄️',color:'#aef',hp:2,maxhp:2},
    {x:15,y:6,type:'plant',label:'❄️',color:'#aef',hp:2,maxhp:2},
    {x:2,y:10,type:'crystal',label:'💎',color:'#8ff',hp:2,maxhp:2},
    {x:18,y:5,type:'crystal',label:'💎',color:'#8ff',hp:2,maxhp:2},
    {x:6,y:14,type:'rock',label:'🪨',color:'#88f',hp:2,maxhp:2},
    {x:14,y:12,type:'plant',label:'❄️',color:'#aef',hp:2,maxhp:2},
    {x:20,y:10,type:'crystal',label:'💎',color:'#8ff',hp:2,maxhp:2},
    {x:8,y:19,type:'plant',label:'❄️',color:'#aef',hp:2,maxhp:2},
    {x:3,y:22,type:'rock',label:'🪨',color:'#88f',hp:2,maxhp:2},
    {x:17,y:20,type:'crystal',label:'💎',color:'#8ff',hp:2,maxhp:2},
    // Fuel cells — main goal: collect 20
    {x:5,y:2,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    {x:9,y:5,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    {x:13,y:2,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    {x:19,y:8,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    {x:1,y:13,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    {x:7,y:17,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    {x:21,y:3,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    {x:4,y:25,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    {x:16,y:22,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    {x:10,y:24,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    // East zone
    {x:32,y:3,type:'rock',label:'🪨',color:'#88f',hp:2,maxhp:2},
    {x:36,y:6,type:'crystal',label:'💎',color:'#8ff',hp:2,maxhp:2},
    {x:39,y:9,type:'plant',label:'❄️',color:'#aef',hp:2,maxhp:2},
    {x:43,y:4,type:'rock',label:'🪨',color:'#88f',hp:2,maxhp:2},
    {x:31,y:14,type:'crystal',label:'💎',color:'#8ff',hp:2,maxhp:2},
    {x:45,y:11,type:'plant',label:'❄️',color:'#aef',hp:2,maxhp:2},
    {x:38,y:18,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    {x:33,y:21,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    {x:41,y:16,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    {x:44,y:22,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    {x:35,y:25,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    {x:46,y:19,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    {x:30,y:23,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    {x:42,y:25,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    // Hidden cave fuel (inside tile-5 hidden zone)
    {x:14,y:8,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1,hidden:true},
    {x:15,y:8,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1,hidden:true},
    {x:14,y:9,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1,hidden:true},
    {x:15,y:9,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1,hidden:true},
  ];

  // ── Weapon chests ────────────────────────────────────────
  const chests = [
    {x:2*TILE+13, y:1*TILE+13, weapon:'ice_blade',   label:'🗡️', name:'Ice Blade',    desc:'Swift ice attacks. Deals 3 dmg, may slow enemies.'},
    {x:6*TILE+13, y:1*TILE+13, weapon:'frost_bow',   label:'🏹', name:'Frost Bow',    desc:'Ranged ice arrows. Auto-fires at nearby enemies.'},
    {x:10*TILE+13,y:6*TILE+13, weapon:'war_club',    label:'🪓', name:'War Club',     desc:'Heavy blunt weapon. Deals 5 dmg, staggers foes.'},
    {x:4*TILE+13, y:15*TILE+13,weapon:'bone_spear',  label:'🎯', name:'Bone Spear',   desc:'Piercing throw. Long reach, deals 4 dmg.'},
    {x:11*TILE+13,y:15*TILE+13,weapon:'mammoth_tusk',label:'🦷', name:'Mammoth Tusk', desc:'Tusk relic. Deals 6 dmg, mammoths won\'t retaliate.'},
    {x:16*TILE+13,y:3*TILE+13, weapon:'blizzard_orb',label:'🌀', name:'Blizzard Orb', desc:'Area freeze. Slows all nearby enemies for 2s.'},
    {x:19*TILE+13,y:9*TILE+13, weapon:'fire_torch',  label:'🔥', name:'Fire Torch',   desc:'+2 warmth. Enemies take burn damage over time.'},
    {x:31*TILE+13,y:6*TILE+13, weapon:'yeti_claw',   label:'🐾', name:'Yeti Claw',    desc:'Stolen from yeti. Deals 8 dmg — best weapon!'},
  ];

  // ── Saber-tooth tigers — fast, deadly ────────────────────
  const tigers = [
    {x:8*TILE+13,  y:4*TILE+13,  hp:8, maxhp:8, size:14, speed:1.6, dx:0.7, dy:0.3, aggro:false, attackTimer:0, slowTimer:0},
    {x:18*TILE+13, y:2*TILE+13,  hp:8, maxhp:8, size:14, speed:1.7, dx:-0.5,dy:0.4, aggro:false, attackTimer:0, slowTimer:0},
    {x:15*TILE+13, y:14*TILE+13, hp:7, maxhp:7, size:13, speed:1.8, dx:0.4, dy:-0.4,aggro:false, attackTimer:0, slowTimer:0},
    {x:3*TILE+13,  y:19*TILE+13, hp:7, maxhp:7, size:13, speed:1.9, dx:0.6, dy:0.2, aggro:false, attackTimer:0, slowTimer:0},
    {x:21*TILE+13, y:10*TILE+13, hp:8, maxhp:8, size:14, speed:1.6, dx:-0.3,dy:0.7, aggro:false, attackTimer:0, slowTimer:0},
    // East zone tigers
    {x:35*TILE+13, y:5*TILE+13,  hp:9, maxhp:9, size:15, speed:1.8, dx:0.5, dy:0.3, aggro:false, attackTimer:0, slowTimer:0},
    {x:42*TILE+13, y:8*TILE+13,  hp:9, maxhp:9, size:15, speed:1.9, dx:-0.4,dy:0.5, aggro:false, attackTimer:0, slowTimer:0},
    {x:38*TILE+13, y:15*TILE+13, hp:8, maxhp:8, size:14, speed:2.0, dx:0.3, dy:-0.4,aggro:false, attackTimer:0, slowTimer:0},
    {x:45*TILE+13, y:20*TILE+13, hp:8, maxhp:8, size:14, speed:1.8, dx:-0.5,dy:0.3, aggro:false, attackTimer:0, slowTimer:0},
  ];

  // ── Mammoths — neutral, retaliate if hit ─────────────────
  // neutral: true means they wander and don't attack first
  const mammoths = [
    {x:6*TILE+13,  y:8*TILE+13,  hp:18, maxhp:18, size:22, speed:0.6, dx:0.4, dy:0.2, neutral:true, angered:false, attackTimer:0, slowTimer:0},
    {x:12*TILE+13, y:5*TILE+13,  hp:18, maxhp:18, size:22, speed:0.5, dx:-0.3,dy:0.4, neutral:true, angered:false, attackTimer:0, slowTimer:0},
    {x:4*TILE+13,  y:16*TILE+13, hp:16, maxhp:16, size:20, speed:0.6, dx:0.5, dy:-0.3,neutral:true, angered:false, attackTimer:0, slowTimer:0},
    {x:19*TILE+13, y:18*TILE+13, hp:16, maxhp:16, size:20, speed:0.7, dx:-0.4,dy:0.3, neutral:true, angered:false, attackTimer:0, slowTimer:0},
    {x:16*TILE+13, y:22*TILE+13, hp:14, maxhp:14, size:18, speed:0.6, dx:0.3, dy:0.5, neutral:true, angered:false, attackTimer:0, slowTimer:0},
    // East tundra mammoths — larger herd
    {x:33*TILE+13, y:10*TILE+13, hp:18, maxhp:18, size:22, speed:0.5, dx:0.4, dy:0.3, neutral:true, angered:false, attackTimer:0, slowTimer:0},
    {x:40*TILE+13, y:14*TILE+13, hp:18, maxhp:18, size:22, speed:0.6, dx:-0.3,dy:0.4, neutral:true, angered:false, attackTimer:0, slowTimer:0},
    {x:37*TILE+13, y:22*TILE+13, hp:16, maxhp:16, size:20, speed:0.5, dx:0.5, dy:-0.2,neutral:true, angered:false, attackTimer:0, slowTimer:0},
  ];

  // ── Yeti boss — lives in the cave (hidden room col 13-16, row 7-10)
  const yeti = {
    x: 15*TILE+13, y: 8*TILE+13,
    hp: 60, maxhp: 60,
    size: 36, speed: 1.0,
    alive: true,
    phase: 'throw',     // 'throw' | 'charge' | 'stomp'
    phaseTimer: 0,
    rocks: [],          // thrown rocks [{x,y,vx,vy,r}]
    chargeDir: {x:0,y:0},
    chargeTimer: 0,
    charging: false,
    stunTimer: 0,       // staggered after taking heavy hit
    roarTimer: 0,       // visual roar flash
    attackTimer: 0,
    slowTimer: 0,
  };

  // ── Snowflake ambient particles ──────────────────────────
  const snowflakes = Array.from({length:60}, () => ({
    x: Math.random()*800,
    y: Math.random()*520,
    r: Math.random()*2+0.5,
    vy: Math.random()*0.6+0.3,
    vx: Math.random()*0.4-0.2,
    alpha: Math.random()*0.5+0.3,
  }));

  return { map, resources, chests, tigers, mammoths, yeti, snowflakes };
}
