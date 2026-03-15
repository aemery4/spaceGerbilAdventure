function launchP2() {
  console.log("[SGA] launchP2 started");
  stopGame();
  document.getElementById('planet').textContent='Jungle Planet — Zorbax';
  document.getElementById('fuelMax').textContent='15';
  document.getElementById('bh').style.display='';
  save.resources.fuel = 0;
  updateHUD();

  const canvas = document.getElementById('game');
  canvas.width=800; canvas.height=520;
  const ctx = canvas.getContext('2d');
  console.log("[SGA] canvas id=game, width="+canvas.width+", height="+canvas.height+", ctx ok="+(!!ctx));
  const TILE=26;

  const p2state = { mapRevealed:false, climbCount:0, bossDead:false };

  const player = { x:2*TILE+14, y:2*TILE+14, size:14, speed:save.items.includes('boots')?5:3, keys:{}, invincible:0 };
  const cam = { x:0, y:0 };

  // Tile key: 0=jungle, 1=wall, 2=bush(slow), 3=tree(solid), 4=vine, 5=hidden, 6=swamp, 7=village platform, 8=lava(dmg), 9=ruins floor, 10=chest
  const COLS=48, ROWS=28;
  const map = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,7,7,7,7,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,2,2,4,0,0,2,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,7,7,7,7,1,10,9,1,9,9,9,1,9,1,8,8,8,0,0,0,0,1],
    [1,0,0,0,4,0,0,2,0,0,0,0,0,0,3,0,0,0,0,0,4,4,4,4,7,7,7,7,7,4,4,1,1,1,9,9,1,1,9,1,8,8,8,3,0,0,0,1],
    [1,0,0,0,0,3,0,0,0,6,6,0,0,0,0,0,0,0,0,0,0,3,4,0,7,7,7,7,7,7,1,1,9,9,9,9,1,1,9,1,8,8,8,0,3,10,0,1],
    [1,0,0,3,0,3,0,0,0,6,6,6,0,0,0,0,0,0,0,0,0,3,0,0,7,7,7,7,7,7,1,1,9,1,1,9,1,1,9,1,1,1,1,0,1,1,1,1],
    [1,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,7,7,7,7,9,10,9,9,9,9,9,1,1,1,0,0,0,8,8,8,8,1],
    [1,0,0,0,0,0,0,2,0,0,0,0,0,1,1,4,1,1,2,0,0,0,0,0,7,7,7,7,7,7,1,1,9,1,1,9,1,1,9,1,3,0,0,8,8,8,8,1],
    [1,1,0,0,0,0,0,0,0,0,0,0,0,1,5,5,5,1,2,0,0,0,4,0,7,7,7,7,7,7,1,1,9,9,9,9,1,1,9,1,0,3,0,8,8,8,8,1],
    [1,0,0,0,3,0,0,0,0,0,0,0,0,1,5,5,5,1,0,0,0,4,4,4,7,7,7,7,7,4,4,1,1,9,9,1,1,1,9,1,1,1,1,1,0,1,1,1],
    [1,0,0,0,3,0,0,0,0,0,6,6,0,0,0,0,0,0,0,0,0,3,0,0,7,7,7,7,7,7,1,9,9,9,1,9,10,1,9,1,8,8,0,0,0,0,0,1],
    [1,0,2,2,0,0,0,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,7,7,7,7,1,9,9,9,1,9,9,1,9,1,8,8,0,3,0,10,0,1],
    [1,0,0,0,0,0,3,0,0,4,0,0,0,0,0,0,0,0,0,3,0,0,0,0,7,7,7,7,7,7,1,1,1,1,1,1,1,1,1,1,0,0,3,0,8,8,8,1],
    [1,0,0,0,0,0,3,0,0,4,0,0,0,0,0,0,0,0,0,3,0,0,0,0,7,7,7,7,7,7,0,0,0,0,0,0,0,0,0,1,3,0,0,10,8,8,8,1],
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
  console.log("[SGA] P2-A: map defined");

  let resources = [
    {x:6,y:3,type:'plant',label:'🌿',color:'#2a2',hp:2,maxhp:2},{x:11,y:6,type:'plant',label:'🌿',color:'#2a2',hp:2,maxhp:2},
    {x:19,y:3,type:'plant',label:'🌿',color:'#2a2',hp:2,maxhp:2},{x:3,y:12,type:'plant',label:'🌿',color:'#2a2',hp:2,maxhp:2},
    {x:20,y:13,type:'plant',label:'🌿',color:'#2a2',hp:2,maxhp:2},{x:8,y:15,type:'rock',label:'🪨',color:'#888',hp:3,maxhp:3},
    {x:16,y:11,type:'rock',label:'🪨',color:'#888',hp:3,maxhp:3},{x:22,y:8,type:'rock',label:'🪨',color:'#888',hp:3,maxhp:3},
    {x:1,y:15,type:'rock',label:'🪨',color:'#888',hp:3,maxhp:3},{x:7,y:1,type:'banana',label:'🍌',color:'#ff0',hp:1,maxhp:1},
    {x:18,y:7,type:'banana',label:'🍌',color:'#ff0',hp:1,maxhp:1},{x:11,y:14,type:'banana',label:'🍌',color:'#ff0',hp:1,maxhp:1},
    {x:21,y:15,type:'banana',label:'🍌',color:'#ff0',hp:1,maxhp:1},{x:3,y:8,type:'banana',label:'🍌',color:'#ff0',hp:1,maxhp:1},
    {x:13,y:8,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1,hidden:true},{x:14,y:8,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1,hidden:true},
    {x:13,y:9,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1,hidden:true},{x:14,y:9,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1,hidden:true},
    {x:15,y:8,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1,hidden:true},{x:15,y:9,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1,hidden:true},
    {x:5,y:10,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},{x:20,y:5,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    {x:10,y:16,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},{x:22,y:12,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    {x:1,y:7,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},{x:17,y:16,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    {x:8,y:11,type:'crystal',label:'💎',color:'#88f',hp:2,maxhp:2},{x:19,y:10,type:'crystal',label:'💎',color:'#88f',hp:2,maxhp:2},
    // East ruins zone resources
    {x:31,y:2,type:'rock',label:'🪨',color:'#888',hp:3,maxhp:3},{x:35,y:5,type:'rock',label:'🪨',color:'#888',hp:3,maxhp:3},
    {x:38,y:8,type:'rock',label:'🪨',color:'#888',hp:3,maxhp:3},{x:33,y:11,type:'crystal',label:'💎',color:'#88f',hp:2,maxhp:2},
    {x:37,y:3,type:'crystal',label:'💎',color:'#88f',hp:2,maxhp:2},{x:36,y:10,type:'plant',label:'🌿',color:'#2a2',hp:2,maxhp:2},
    // Lava zone — crystals from heat
    {x:42,y:3,type:'crystal',label:'💎',color:'#88f',hp:2,maxhp:2},{x:45,y:6,type:'crystal',label:'💎',color:'#88f',hp:2,maxhp:2},
    {x:40,y:9,type:'crystal',label:'💎',color:'#88f',hp:2,maxhp:2},{x:43,y:12,type:'rock',label:'🪨',color:'#888',hp:3,maxhp:3},
    // Deep jungle south
    {x:32,y:16,type:'plant',label:'🌿',color:'#2a2',hp:2,maxhp:2},{x:36,y:18,type:'plant',label:'🌿',color:'#2a2',hp:2,maxhp:2},
    {x:40,y:17,type:'banana',label:'🍌',color:'#ff0',hp:1,maxhp:1},{x:44,y:20,type:'banana',label:'🍌',color:'#ff0',hp:1,maxhp:1},
    {x:34,y:22,type:'banana',label:'🍌',color:'#ff0',hp:1,maxhp:1},{x:38,y:25,type:'plant',label:'🌿',color:'#2a2',hp:2,maxhp:2},
    {x:42,y:23,type:'crystal',label:'💎',color:'#88f',hp:2,maxhp:2},{x:46,y:24,type:'rock',label:'🪨',color:'#888',hp:3,maxhp:3},
    // Extra fuel spread across map
    {x:30,y:4,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},{x:34,y:7,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    {x:39,y:5,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},{x:41,y:11,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    {x:35,y:16,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},{x:43,y:18,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    {x:31,y:21,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},{x:45,y:25,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    {x:11,y:20,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},{x:5,y:24,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
    {x:18,y:23,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},{x:13,y:25,type:'fuel',label:'⚡',color:'#ff0',hp:1,maxhp:1},
  ];
  console.log("[SGA] P2-B: resources defined");

  const miniBoss = {x:12*TILE+18,y:6*TILE+18,hp:30,maxhp:30,size:32,speed:1.2,alive:true,attackTimer:0,chargeDir:{x:0,y:0},charging:false,chargeTimer:0};

  // Regular monkeys — west jungle
  let monkeys = [
    {x:8*TILE+18,y:4*TILE+18,hp:4,maxhp:4,size:15,speed:0.8,dx:0.6,dy:0,aggro:false,attackTimer:0},
    {x:18*TILE+18,y:2*TILE+18,hp:4,maxhp:4,size:15,speed:0.9,dx:-0.5,dy:0.3,aggro:false,attackTimer:0},
    {x:15*TILE+18,y:14*TILE+18,hp:4,maxhp:4,size:15,speed:0.8,dx:0.4,dy:-0.4,aggro:false,attackTimer:0},
    {x:3*TILE+18,y:14*TILE+18,hp:4,maxhp:4,size:15,speed:1.0,dx:0.7,dy:0,aggro:false,attackTimer:0},
    {x:21*TILE+18,y:10*TILE+18,hp:4,maxhp:4,size:15,speed:0.9,dx:-0.3,dy:0.6,aggro:false,attackTimer:0},
    {x:10*TILE+18,y:11*TILE+18,hp:3,maxhp:3,size:13,speed:1.1,dx:0.5,dy:0.5,aggro:false,attackTimer:0},
  ];

  // Ruin Golems — slow but tanky, patrol the ruins (east zone)
  let golems = [
    {x:32*TILE+18,y:5*TILE+18,hp:12,maxhp:12,size:20,speed:0.5,dx:0.3,dy:0.2,aggro:false,attackTimer:0},
    {x:36*TILE+18,y:7*TILE+18,hp:12,maxhp:12,size:20,speed:0.5,dx:-0.2,dy:0.3,aggro:false,attackTimer:0},
    {x:33*TILE+18,y:10*TILE+18,hp:10,maxhp:10,size:18,speed:0.6,dx:0.4,dy:-0.1,aggro:false,attackTimer:0},
  ];

  // Lava Lizards — fast, live near lava (east zone)
  let lizards = [
    {x:41*TILE+18,y:3*TILE+18,hp:6,maxhp:6,size:13,speed:1.4,dx:0.8,dy:0.4,aggro:false,attackTimer:0},
    {x:44*TILE+18,y:7*TILE+18,hp:6,maxhp:6,size:13,speed:1.5,dx:-0.6,dy:0.5,aggro:false,attackTimer:0},
    {x:40*TILE+18,y:11*TILE+18,hp:5,maxhp:5,size:12,speed:1.6,dx:0.5,dy:-0.7,aggro:false,attackTimer:0},
    {x:45*TILE+18,y:12*TILE+18,hp:5,maxhp:5,size:12,speed:1.5,dx:-0.4,dy:0.6,aggro:false,attackTimer:0},
  ];

  // Deep Jungle Panthers — stealthy, semi-transparent until close (south east)
  let panthers = [
    {x:35*TILE+18,y:18*TILE+18,hp:8,maxhp:8,size:16,speed:1.2,dx:0.5,dy:0.3,aggro:false,attackTimer:0,alpha:0.3},
    {x:42*TILE+18,y:20*TILE+18,hp:8,maxhp:8,size:16,speed:1.3,dx:-0.4,dy:0.4,aggro:false,attackTimer:0,alpha:0.3},
    {x:38*TILE+18,y:24*TILE+18,hp:7,maxhp:7,size:14,speed:1.4,dx:0.6,dy:-0.3,aggro:false,attackTimer:0,alpha:0.3},
  ];

  // Friendly wildlife
  let bunnies = [
    {x:5*TILE+18,y:6*TILE+18,dx:0.4,dy:0.3,healTimer:0,size:12},
    {x:19*TILE+18,y:14*TILE+18,dx:-0.3,dy:0.5,healTimer:0,size:12},
    {x:1*TILE+18,y:11*TILE+18,dx:0.5,dy:-0.4,healTimer:0,size:12},
    {x:17*TILE+18,y:20*TILE+18,dx:0.4,dy:0.2,healTimer:0,size:12},
  ];

  // Parrots — fly around, collect one for +5 bonus bananas
  let parrots = [
    {x:9*TILE+18,y:2*TILE+18,dx:0.6,dy:0.3,timer:0,size:11,collected:false},
    {x:20*TILE+18,y:7*TILE+18,dx:-0.5,dy:0.4,timer:0,size:11,collected:false},
    {x:14*TILE+18,y:15*TILE+18,dx:0.4,dy:-0.3,timer:0,size:11,collected:false},
    {x:6*TILE+18,y:22*TILE+18,dx:0.5,dy:0.4,timer:0,size:11,collected:false},
    {x:35*TILE+18,y:16*TILE+18,dx:-0.4,dy:0.5,timer:0,size:11,collected:false},
  ];

  // Weapon chests — click to collect, gives a weapon item
  let chests = [
    {x:2*TILE+18,y:1*TILE+18,  weapon:'vine_whip',   label:'🌿',name:'Vine Whip',     desc:'Extended melee range +2 tiles', opened:false},
    {x:6*TILE+18,y:1*TILE+18,  weapon:'rock_hammer', label:'🔨',name:'Rock Hammer',   desc:'Deals 3 damage per hit to enemies', opened:false},
    {x:10*TILE+18,y:6*TILE+18, weapon:'crystal_bow', label:'🏹',name:'Crystal Bow',   desc:'Auto-attacks nearest enemy every 2s', opened:false},
    {x:4*TILE+18,y:15*TILE+18, weapon:'lava_sword',  label:'⚔️',name:'Lava Sword',    desc:'Burns enemies for 3 fire dmg/s', opened:false},
    {x:11*TILE+18,y:15*TILE+18,weapon:'ruin_shield', label:'🛡',name:'Ruin Shield',   desc:'Blocks 80% damage (replaces shield)', opened:false},
    {x:16*TILE+18,y:3*TILE+18, weapon:'poison_dart', label:'🎯',name:'Poison Dart',   desc:'Poisons enemies for 5 damage over time', opened:false},
    {x:19*TILE+18,y:9*TILE+18, weapon:'thunder_orb', label:'⚡',name:'Thunder Orb',   desc:'Area zap — damages all nearby enemies', opened:false},
    {x:20*TILE+18,y:19*TILE+18,weapon:'obsidian_axe',label:'🪓',name:'Obsidian Axe',  desc:'Powerful 5-damage cleave attack', opened:false},
    {x:13*TILE+18,y:23*TILE+18,weapon:'jungle_bow',  label:'🏹',name:'Jungle Bow',    desc:'Long range attacks from distance', opened:false},
    {x:25*TILE+18,y:25*TILE+18,weapon:'dragon_scale',label:'🐉',name:'Dragon Scale',  desc:'Halves ALL damage permanently', opened:false},
  ];
  console.log("[SGA] P2-C: chests defined");

  // Active weapon
  let activeWeapon = save.items.find(i=>i.startsWith('w:'))?.slice(2) || null;
  let weaponCooldown = 0; // thunder orb / bow auto-fire


  // ── TREETOP VILLAGE MERCHANTS ─────────────────────────────────
  // Village sits on treetop platforms at cols 25-28, rows 1-4 & 7-10
  // Two vine-bridges connect at row 3 (cols 22-24) and row 9 (cols 22-24)
  const VILLAGE_MERCHANTS = [
    {
      id:'zara', name:'Zara the Herbalist', emoji:'🧙‍♀️', color:'#c8a', bobOffset:0,
      x:25*TILE+20, y:3*TILE+20,
      dialog:'Welcome to Treetop Village, little spaceling! I trade in jungle remedies.',
      shop:[
        {id:'herb_tonic',   name:'Herb Tonic',     emoji:'🍵', desc:'Restores 30 HP',        cost:{plant:3},        effect:()=>{save.hp=Math.min(save.maxHp,save.hp+30);updateHUD();}},
        {id:'jungle_salve', name:'Jungle Salve',   emoji:'🌱', desc:'Restores 60 HP',        cost:{plant:5,rock:1}, effect:()=>{save.hp=Math.min(save.maxHp,save.hp+60);updateHUD();}},
        {id:'spore_bomb',   name:'Spore Bomb',     emoji:'💥', desc:'Destroys all monkeys nearby (one use)',cost:{plant:4,crystal:2},  effect:()=>{monkeys=monkeys.filter(m=>{if(Math.hypot(player.x-m.x,player.y-m.y)<TILE*6){addP(m.x,m.y,'#8f4',20);return false;}return true;});save.items=save.items.filter(i=>i!=='spore_bomb');updateHUD();}},
        {id:'mega_salve',   name:'Mega Salve',     emoji:'💚', desc:'+30 max HP permanently', cost:{plant:8,crystal:3}, effect:()=>{save.maxHp+=30;save.hp=Math.min(save.hp+30,save.maxHp);updateHUD();persist();}},
      ]
    },
    {
      id:'grax', name:'Grax the Rock Trader', emoji:'⛏️', color:'#a98', bobOffset:1.5,
      x:28*TILE+20, y:5*TILE+20,
      dialog:'Oi! Rocks for sale, rocks wanted! Best prices in the canopy, guaranteed!',
      shop:[
        {id:'buy_rock',    name:'Buy Rocks x3',   emoji:'🪨', desc:'Get 3 rocks',            cost:{banana:1},        effect:()=>{save.resources.rock=(save.resources.rock||0)+3;updateHUD();}},
        {id:'buy_crystal', name:'Buy Crystal',    emoji:'💎', desc:'Get 1 crystal',           cost:{rock:4},          effect:()=>{save.resources.crystal=(save.resources.crystal||0)+1;updateHUD();}},
        {id:'fuel_chunk',  name:'Fuel Cell',      emoji:'⚡', desc:'Get 2 fuel cells',        cost:{rock:3,plant:2},  effect:()=>{save.resources.fuel+=2;updateHUD();}},
        {id:'rock_armor',  name:'Stone Coating',  emoji:'🛡️', desc:'Gives Energy Shield item if not owned',cost:{rock:6,crystal:2}, effect:()=>{if(!save.items.includes('shield')){save.items.push('shield');updateHUD();persist();}}},
      ]
    },
    {
      id:'pip', name:'Pip the Fuel Runner', emoji:'🐿️', color:'#fa8', bobOffset:3.1,
      x:26*TILE+20, y:10*TILE+20,
      dialog:'Psst! I smuggle fuel from the ruins. Dangerous work but the pay is good!',
      shop:[
        {id:'fuel_x3',     name:'Fuel Cells x3',  emoji:'⚡', desc:'Get 3 fuel',              cost:{banana:2},        effect:()=>{save.resources.fuel+=3;updateHUD();}},
        {id:'fuel_x6',     name:'Fuel Cells x6',  emoji:'⚡⚡',desc:'Get 6 fuel',              cost:{banana:4,plant:2},effect:()=>{save.resources.fuel+=6;updateHUD();}},
        {id:'magnet_pip',  name:'Fuel Magnet',    emoji:'🧲', desc:'Auto-collects nearby fuel (permanent)',cost:{banana:3,crystal:2},effect:()=>{if(!save.items.includes('magnet')){save.items.push('magnet');updateHUD();persist();}}},
        {id:'rocket_boost',name:'Rocket Booster', emoji:'🚀', desc:'Grants Rocket Upgrade item',cost:{banana:5,rock:2},effect:()=>{if(!save.items.includes('rocket_upgrade')){save.items.push('rocket_upgrade');updateHUD();persist();}}},
      ]
    },
    {
      id:'elder', name:'Village Elder', emoji:'👴', color:'#cca', bobOffset:2.0,
      x:28*TILE+20, y:13*TILE+20,
      dialog:'Child of the stars... I have watched this jungle for many cycles. Take my wisdom.',
      shop:[
        {id:'map_reveal',  name:'Reveal Map',     emoji:'🗺️', desc:'Reveals the hidden jungle map',cost:{crystal:2},  effect:()=>{if(!p2state.mapRevealed){p2state.mapRevealed=true;drawMinimap();}}},
        {id:'elder_boots', name:'Speed Blessing',  emoji:'👟', desc:'Grants Rocket Boots (permanent speed)',cost:{banana:3,plant:3},effect:()=>{if(!save.items.includes('boots')){save.items.push('boots');player.speed=5;updateHUD();persist();}}},
        {id:'lore_scroll', name:'Lore Scroll',    emoji:'📜', desc:'Reveals the Jungle King location',cost:{banana:1}, effect:()=>{showMsg('📜 Ancient Lore','The Jungle King slumbers at coordinates 12,12.\n\nDefeat him to earn passage to Planet 3!');}},
        {id:'wizard_skin_buy', name:"Wizard Skin", emoji:'🧙', desc:'Unlocks the Wizard skin (check Skin menu)',cost:{banana:5,crystal:4,plant:3}, effect:()=>{if(!save.unlockedSkins.includes('wizard')){save.unlockedSkins.push('wizard');persist();showSkinUnlockToast('wizard');}}},
        {id:'blessing',    name:"Elder's Blessing",emoji:'✨',desc:'Full heal + 3 extra lives',    cost:{banana:6,crystal:4,plant:4},effect:()=>{save.hp=save.maxHp;save.lives=Math.min(save.lives+3,9);updateHUD();persist();}},
      ]
    },
  ];
  console.log("[SGA] P2-D: merchants defined");

  // Village shop state (activeShop and closeShop are global)

  function openShop(merchant) {
    activeShop = merchant;
    gamePaused = true;
    const panel = document.getElementById('villageShop');
    document.getElementById('shopMerchantName').textContent = merchant.emoji + ' ' + merchant.name;
    document.getElementById('shopMerchantDialog').textContent = '"' + merchant.dialog + '"';
    renderShopItems(merchant);
    panel.style.display = 'block';
  }

  function renderShopItems(merchant) {
    const grid = document.getElementById('shopGrid');
    grid.innerHTML = '';
    merchant.shop.forEach(item => {
      const canAfford = Object.entries(item.cost).every(([res,amt]) => (save.resources[res]||0) >= amt);
      const owned = item.id.startsWith('buy_')||item.id.startsWith('fuel_')||item.id==='herb_tonic'||item.id==='jungle_salve'||item.id==='mega_salve'||item.id==='lore_scroll'||item.id==='blessing' ? false : save.items.includes(item.id.replace('_pip','').replace('_boost','').replace('_armor','').replace('_pip',''));
      const el = document.createElement('div');
      el.className = 'shop-item' + (!canAfford ? ' shop-disabled' : '') + (owned ? ' shop-owned' : '');
      const costStr = Object.entries(item.cost).map(([r,a])=>{
        const icons={rock:'🪨',plant:'🌿',crystal:'💎',banana:'🍌',fuel:'⚡'};
        const has=(save.resources[r]||0)>=a;
        return `<span class="${has?'has':'lacks'}">${icons[r]||r}×${a}</span>`;
      }).join('');
      el.innerHTML = `<div class="shop-item-name">${item.emoji} ${item.name}</div>
        <div class="shop-item-desc">${item.desc}</div>
        <div class="shop-cost">${costStr}${owned?'<span style="color:#5d9;margin-left:4px">✓ Owned</span>':''}</div>`;
      if(canAfford && !owned) {
        el.onclick = () => {
          Object.entries(item.cost).forEach(([res,amt]) => save.resources[res] -= amt);
          item.effect();
          persist();
          renderShopItems(merchant);
          // flash the item
          el.style.background = 'rgba(80,200,80,0.3)';
        };
      }
      grid.appendChild(el);
    });
  }

  console.log("[SGA] P2-E: helpers defined");
  let particles = [];
  function addP(x,y,color,n=8){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,life:35,color});}

  function isSolid(px,py){const tx=Math.floor(px/TILE),ty=Math.floor(py/TILE);if(tx<0||ty<0||tx>=COLS||ty>=ROWS)return true;const t=map[ty][tx];return t===1||t===3;}
  function isSwamp(px,py){const tx=Math.floor(px/TILE),ty=Math.floor(py/TILE);if(tx<0||ty<0||tx>=COLS||ty>=ROWS)return false;return map[ty][tx]===6;}
  function isBush(px,py){const tx=Math.floor(px/TILE),ty=Math.floor(py/TILE);if(tx<0||ty<0||tx>=COLS||ty>=ROWS)return false;return map[ty][tx]===2;}

  function climbAction(tx,ty){
    p2state.climbCount++;
    addP(tx*TILE+20,ty*TILE+20,'#0f0',15);
    if(!p2state.mapRevealed){
      p2state.mapRevealed=true;
      if(!save.hiddenRoomFound){save.hiddenRoomFound=true;persist();checkSkinUnlocks();}
      showMsg('🌴 Canopy Reached!','You can see the whole jungle!\n\nMap revealed! A HIDDEN AREA glows below...');
      drawMinimap();
    } else {
      showMsg('🌿 Climbing!','Vine swing! +Speed boost for 5 seconds!');
      player.speed=6; setTimeout(()=>player.speed=3,5000);
    }
  }

  function bossDie(){
    p2state.bossDead=true;
    checkSkinUnlocks();
    if(!save.items.includes('banana_sword')) save.items.push('banana_sword','vine_hook','rocket_upgrade');
    addP(miniBoss.x,miniBoss.y,'#ff0',40);addP(miniBoss.x,miniBoss.y,'#f80',40);
    updateHUD(); persist();
    setTimeout(()=>showMsg('👑 JUNGLE KING DEFEATED!','The Giant Monkey howls and falls!\n\n🍌 Got: BANANA SWORD\n🪝 Got: VINE GRAPPLING HOOK\n🚀 Got: ROCKET UPGRADE\n\nCollect 15 ⚡ fuel to reach Planet 3!'),500);
  }

  function drawMinimap(){
    const mc=document.getElementById('minimap');
    const mx=mc.getContext('2d');
    const tw=400/COLS,th=280/ROWS;
    const tileC=['#1e3a1e','#4a4a4a','#1a2a10','#3a2010','#0a4a0a','#2a4a3a','#1a3060'];
    for(let ty=0;ty<ROWS;ty++)for(let tx=0;tx<COLS;tx++){mx.fillStyle=tileC[map[ty][tx]]||'#1e3a1e';mx.fillRect(tx*tw,ty*th,tw,th);}
    resources.forEach(r=>{mx.fillStyle=r.type==='fuel'?'#ff0':r.type==='banana'?'#fa0':'#4f4';mx.fillRect(r.x*tw+2,r.y*th+2,tw-4,th-4);});
    mx.fillStyle='#4af';mx.beginPath();mx.arc(player.x/TILE*tw+tw/2,player.y/TILE*th+th/2,4,0,Math.PI*2);mx.fill();
    if(miniBoss.alive){mx.fillStyle='#f00';mx.beginPath();mx.arc(miniBoss.x/TILE*tw+tw/2,miniBoss.y/TILE*th+th/2,6,0,Math.PI*2);mx.fill();}
  }

  const onKey = e=>{
    player.keys[e.key]=true;
    if(e.key==='m'||e.key==='M'){
      if(!p2state.mapRevealed){showMsg('No Map Yet','Climb a vine or tree first!');return;}
      const ov=document.getElementById('mapOv');
      ov.style.display=ov.style.display==='none'||ov.style.display===''?'block':'none';
      if(ov.style.display==='block') drawMinimap();
    }
    if(e.key==='f'||e.key==='F') doP2Action(player.x, player.y);
    e.preventDefault();
  };
  const offKey = e=>player.keys[e.key]=false;
  function doP2Action(mx,my){
    const tx=Math.floor(mx/TILE),ty=Math.floor(my/TILE);
    if(tx>=0&&ty>=0&&tx<COLS&&ty<ROWS&&(map[ty][tx]===4||map[ty][tx]===3)&&Math.hypot(player.x-mx,player.y-my)<TILE*3.5){climbAction(tx,ty);return;}
    // chest click
    for(const ch of chests){
      if(!ch.opened&&Math.hypot(mx-ch.x,my-ch.y)<TILE*1.5&&Math.hypot(player.x-ch.x,player.y-ch.y)<TILE*3){
        ch.opened=true;
        activeWeapon=ch.weapon;
        const wKey='w:'+ch.weapon;
        if(!save.items.includes(wKey)) save.items.push(wKey);
        persist(); updateHUD();
        showMsg('📦 Weapon Found!',`${ch.label} ${ch.name}

${ch.desc}

Equipped as active weapon!`);
        return;
      }
    }
    // attack golems
    for(let i=golems.length-1;i>=0;i--){
      const a=golems[i]; const d=Math.hypot(mx-a.x,my-a.y),pd=Math.hypot(player.x-a.x,player.y-a.y);
      if(d<a.size+10&&pd<TILE*3.5){
        const dmg=activeWeapon==='rock_hammer'?3:activeWeapon==='obsidian_axe'?5:activeWeapon==='lava_sword'?2:1;
        a.hp-=dmg; addP(a.x,a.y,'#888');
        if(activeWeapon==='lava_sword'){setTimeout(()=>{a.hp-=3;addP(a.x,a.y,'#f80');},1000);}
        if(a.hp<=0){addP(a.x,a.y,'#aaa',20);save.resources.rock=(save.resources.rock||0)+2;golems.splice(i,1);updateHUD();}
        return;
      }
    }
    // attack lizards
    for(let i=lizards.length-1;i>=0;i--){
      const a=lizards[i]; const d=Math.hypot(mx-a.x,my-a.y),pd=Math.hypot(player.x-a.x,player.y-a.y);
      const reach=activeWeapon==='vine_whip'?TILE*5:activeWeapon==='jungle_bow'?TILE*6:TILE*3.5;
      if(d<a.size+10&&pd<reach){
        const dmg=activeWeapon==='rock_hammer'?3:activeWeapon==='obsidian_axe'?5:activeWeapon==='lava_sword'?2:1;
        a.hp-=dmg; addP(a.x,a.y,'#f80');
        if(a.hp<=0){addP(a.x,a.y,'#f60',16);save.resources.crystal=(save.resources.crystal||0)+1;lizards.splice(i,1);updateHUD();}
        return;
      }
    }
    // attack panthers
    for(let i=panthers.length-1;i>=0;i--){
      const a=panthers[i]; const d=Math.hypot(mx-a.x,my-a.y),pd=Math.hypot(player.x-a.x,player.y-a.y);
      const reach=activeWeapon==='vine_whip'?TILE*5:activeWeapon==='jungle_bow'?TILE*6:TILE*3.5;
      if(d<a.size+10&&pd<reach){
        const dmg=activeWeapon==='poison_dart'?1:activeWeapon==='obsidian_axe'?5:2;
        a.hp-=dmg; addP(a.x,a.y,'#80f');
        if(activeWeapon==='poison_dart'){let t=0;const tok=setInterval(()=>{a.hp-=1;addP(a.x,a.y,'#4a0');if(++t>=5||a.hp<=0)clearInterval(tok);},800);}
        if(a.hp<=0){addP(a.x,a.y,'#808',16);save.resources.plant=(save.resources.plant||0)+2;panthers.splice(i,1);updateHUD();}
        return;
      }
    }
    // merchant click
    for(const m of VILLAGE_MERCHANTS){
      if(Math.hypot(mx-m.x,my-m.y)<30&&Math.hypot(player.x-m.x,player.y-m.y)<TILE*2.5){
        openShop(m); return;
      }
    }
    if(miniBoss.alive){
      const bd=Math.hypot(mx-miniBoss.x,my-miniBoss.y),pd=Math.hypot(player.x-miniBoss.x,player.y-miniBoss.y);
      if(bd<miniBoss.size+10&&pd<TILE*3){
        const dmg=save.items.includes('banana_sword')?4:1;
        miniBoss.hp-=dmg;addP(miniBoss.x,miniBoss.y,'#f44',12);
        if(miniBoss.hp<=0){miniBoss.alive=false;bossDie();}
        return;
      }
    }
    for(let i=monkeys.length-1;i>=0;i--){
      const a=monkeys[i];
      if(Math.hypot(mx-a.x,my-a.y)<a.size+10&&Math.hypot(player.x-a.x,player.y-a.y)<TILE*3.5){
        const dmg=save.items.includes('banana_sword')?3:1;
        a.hp-=dmg;addP(a.x,a.y,'#f44');
        if(a.hp<=0){addP(a.x,a.y,'#fa0',12);monkeys.splice(i,1);}
        return;
      }
    }
    for(let i=resources.length-1;i>=0;i--){
      const r=resources[i];
      if(r.hidden&&!p2state.mapRevealed) continue;
      const rx=r.x*TILE+TILE/2,ry=r.y*TILE+TILE/2;
      if(Math.hypot(mx-rx,my-ry)<TILE*.8&&Math.hypot(player.x-rx,player.y-ry)<(save.items.includes('scanner')?TILE*5.4:TILE*3.2)){
        r.hp--;addP(rx,ry,r.color);
        if(r.hp<=0){save.resources[r.type]=(save.resources[r.type]||0)+1;resources.splice(i,1);updateHUD();}
        return;
      }
    }
  }
  const onClick = e=>{
    const rect=canvas.getBoundingClientRect();
    doP2Action(e.clientX-rect.left+cam.x, e.clientY-rect.top+cam.y);
  };
  window.addEventListener('keydown',onKey);window.addEventListener('keyup',offKey);canvas.addEventListener('click',onClick);
  console.log("[SGA] P2-F: event listeners added");

  let vineAnim=0;
  function drawTile(tx,ty){
    const t=map[ty][tx];
    const sx=tx*TILE-cam.x, sy=ty*TILE-cam.y;
    // 0 = jungle floor
    if(t===0){
      ctx.fillStyle='#0f2208'; ctx.fillRect(sx,sy,TILE,TILE);
      // subtle dappled light
      if((tx*11+ty*7)%6===0){ctx.fillStyle='rgba(60,120,20,0.18)';ctx.beginPath();ctx.ellipse(sx+TILE/2,sy+TILE/2,TILE/2-4,TILE/2-6,0,0,Math.PI*2);ctx.fill();}
      ctx.strokeStyle='rgba(20,50,10,0.5)'; ctx.lineWidth=0.5; ctx.strokeRect(sx,sy,TILE,TILE); ctx.lineWidth=1;
    }
    // 1 = wall
    if(t===1){
      ctx.fillStyle='#1e1e1e'; ctx.fillRect(sx,sy,TILE,TILE);
      // mossy stone texture
      const row=ty%2===0;
      ctx.fillStyle='#262a20';
      for(let i=0;i<2;i++){
        const bx=row?(i*20):(i*20+10);
        ctx.fillRect(sx+bx+1,sy+2,18,TILE/2-3);
        ctx.fillRect(sx+bx+1,sy+TILE/2+1,18,TILE/2-3);
      }
      // moss accent
      if((tx*5+ty*9)%7<2){ctx.fillStyle='rgba(40,90,20,0.35)';ctx.fillRect(sx+2,sy+TILE-5,TILE-4,4);}
      ctx.strokeStyle='rgba(0,0,0,0.6)'; ctx.lineWidth=0.5; ctx.strokeRect(sx,sy,TILE,TILE); ctx.lineWidth=1;
    }
    // 2 = bush (slows)
    if(t===2){
      ctx.fillStyle='#0a2200'; ctx.fillRect(sx,sy,TILE,TILE);
      const g=ctx.createRadialGradient(sx+TILE/2,sy+TILE/2,2,sx+TILE/2,sy+TILE/2,TILE/2);
      g.addColorStop(0,'rgba(30,90,10,0.7)'); g.addColorStop(1,'rgba(5,30,0,0.3)');
      ctx.fillStyle=g; ctx.fillRect(sx,sy,TILE,TILE);
      ctx.font='17px serif';ctx.textAlign='center';ctx.fillText('🌿',sx+TILE/2,sy+TILE/2+6);
    }
    // 3 = tree (solid)
    if(t===3){
      ctx.fillStyle='#0a1a06'; ctx.fillRect(sx,sy,TILE,TILE);
      // trunk
      ctx.fillStyle='#5a3010';ctx.fillRect(sx+TILE/2-4,sy+TILE-12,8,12);
      // canopy gradient
      const cg=ctx.createRadialGradient(sx+TILE/2,sy+10,2,sx+TILE/2,sy+14,TILE/2-2);
      cg.addColorStop(0,'#2a8a10'); cg.addColorStop(0.7,'#1a5a08'); cg.addColorStop(1,'rgba(10,40,5,0)');
      ctx.fillStyle=cg; ctx.beginPath();ctx.arc(sx+TILE/2,sy+14,TILE/2-2,0,Math.PI*2);ctx.fill();
      // highlight
      ctx.fillStyle='rgba(80,200,40,0.2)';ctx.beginPath();ctx.arc(sx+TILE/2-4,sy+10,6,0,Math.PI*2);ctx.fill();
    }
    // 4 = vine
    if(t===4){
      ctx.fillStyle='#0f2208'; ctx.fillRect(sx,sy,TILE,TILE);
      const sway=Math.sin(vineAnim+tx*.5)*3;
      // glow behind vine
      ctx.shadowColor='rgba(60,200,20,0.4)'; ctx.shadowBlur=6;
      ctx.strokeStyle='#3ab010';ctx.lineWidth=5;
      ctx.beginPath();ctx.moveTo(sx+TILE/2+sway,sy);
      ctx.quadraticCurveTo(sx+TILE/2+sway*2.5,sy+TILE/2,sx+TILE/2+sway,sy+TILE);ctx.stroke();
      ctx.shadowBlur=0; ctx.lineWidth=1;
      ctx.font='14px serif';ctx.textAlign='center';
      ctx.fillText('🍃',sx+TILE/2+sway,sy+TILE/2+6);
    }
    // 5 = hidden room
    if(t===5){
      if(p2state.mapRevealed){
        const pulse=Math.sin(Date.now()*0.003)*0.08+0.12;
        ctx.fillStyle=`rgba(80,255,80,${pulse})`; ctx.fillRect(sx,sy,TILE,TILE);
        ctx.strokeStyle='rgba(60,255,60,0.4)'; ctx.lineWidth=0.5; ctx.strokeRect(sx,sy,TILE,TILE); ctx.lineWidth=1;
      } else {
        ctx.fillStyle='#0f2208'; ctx.fillRect(sx,sy,TILE,TILE);
        ctx.strokeStyle='rgba(20,50,10,0.5)'; ctx.lineWidth=0.5; ctx.strokeRect(sx,sy,TILE,TILE); ctx.lineWidth=1;
      }
    }
    // 6 = swamp
    if(t===6){
      const bg=ctx.createLinearGradient(sx,sy,sx,sy+TILE);
      bg.addColorStop(0,'#0f2215'); bg.addColorStop(1,'#081510');
      ctx.fillStyle=bg; ctx.fillRect(sx,sy,TILE,TILE);
      const sw=Math.sin(Date.now()*0.0015+tx*0.7)*0.5+0.5;
      ctx.fillStyle=`rgba(10,80,30,${0.3+sw*0.2})`;
      ctx.beginPath();ctx.ellipse(sx+TILE/2,sy+TILE/2,TILE/2-3,TILE/2-5,0,0,Math.PI*2);ctx.fill();
      if((tx*3+ty)%5===0&&Math.floor(Date.now()/800+tx)%3===0){ctx.fillStyle='rgba(40,180,80,0.4)';ctx.beginPath();ctx.arc(sx+8,sy+TILE-8,2,0,Math.PI*2);ctx.fill();}
      ctx.strokeStyle='rgba(0,0,0,0.4)'; ctx.lineWidth=0.5; ctx.strokeRect(sx,sy,TILE,TILE); ctx.lineWidth=1;
    }
    // 8 = lava — glowing deadly orange
    if(t===8){
      const lv=Math.sin(Date.now()*0.003+tx*0.5+ty*0.7)*0.5+0.5;
      const lg=ctx.createLinearGradient(sx,sy,sx,sy+TILE);
      lg.addColorStop(0,`rgba(255,${80+lv*40|0},0,0.95)`);
      lg.addColorStop(1,`rgba(180,${20+lv*20|0},0,0.98)`);
      ctx.fillStyle=lg; ctx.fillRect(sx,sy,TILE,TILE);
      ctx.shadowColor='rgba(255,120,0,0.9)'; ctx.shadowBlur=16;
      ctx.fillStyle=`rgba(255,200,0,${0.15+lv*0.2})`;
      ctx.beginPath();ctx.ellipse(sx+TILE/2,sy+TILE/2,TILE/2-4,TILE/2-5,0,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
      // bubble pops
      if((tx*3+ty*7+Math.floor(Date.now()/400))%5===0){
        ctx.fillStyle='rgba(255,200,50,0.6)'; ctx.beginPath(); ctx.arc(sx+8+((tx*5)%24),sy+6,2,0,Math.PI*2); ctx.fill();
      }
    }
    // 9 = ancient ruins floor
    if(t===9){
      const rg=ctx.createLinearGradient(sx,sy,sx+TILE,sy+TILE);
      rg.addColorStop(0,'#3a3228'); rg.addColorStop(1,'#2a241c');
      ctx.fillStyle=rg; ctx.fillRect(sx,sy,TILE,TILE);
      // stone tile pattern
      ctx.strokeStyle='rgba(80,70,50,0.6)'; ctx.lineWidth=0.8;
      ctx.strokeRect(sx+2,sy+2,TILE/2-3,TILE/2-3);
      ctx.strokeRect(sx+TILE/2+1,sy+2,TILE/2-3,TILE/2-3);
      ctx.strokeRect(sx+2,sy+TILE/2+1,TILE/2-3,TILE/2-3);
      ctx.strokeRect(sx+TILE/2+1,sy+TILE/2+1,TILE/2-3,TILE/2-3);
      ctx.lineWidth=1;
      // crack detail
      if((tx*11+ty*7)%6===0){ ctx.strokeStyle='rgba(60,50,30,0.4)'; ctx.lineWidth=0.5; ctx.beginPath(); ctx.moveTo(sx+5,sy+5); ctx.lineTo(sx+15,sy+18); ctx.stroke(); ctx.lineWidth=1; }
      // moss patches
      if((tx+ty*3)%7===0){ ctx.fillStyle='rgba(40,80,20,0.3)'; ctx.fillRect(sx+22,sy+20,8,6); }
    }
    // 10 = chest
    if(t===10){
      // floor under chest
      ctx.fillStyle='#162614'; ctx.fillRect(sx,sy,TILE,TILE);
      // find chest data
      const cx2=tx*TILE+TILE/2, cy2=ty*TILE+TILE/2;
      const ch=chests.find(c=>Math.abs(c.x-cx2)<TILE&&Math.abs(c.y-cy2)<TILE);
      if(ch&&ch.opened){ // opened chest
        ctx.fillStyle='rgba(100,70,20,0.5)'; ctx.fillRect(sx+6,sy+10,TILE-12,TILE-16);
        ctx.strokeStyle='rgba(140,100,40,0.4)'; ctx.lineWidth=1; ctx.strokeRect(sx+6,sy+10,TILE-12,TILE-16);
      } else { // closed — glowing
        const glow=Math.sin(Date.now()*0.004+tx+ty)*0.3+0.7;
        ctx.shadowColor='rgba(255,200,50,0.8)'; ctx.shadowBlur=12*glow;
        ctx.fillStyle='#6b4a14'; ctx.fillRect(sx+4,sy+10,TILE-8,TILE-14);
        ctx.fillStyle='#8b6a28'; ctx.fillRect(sx+4,sy+10,TILE-8,6);
        ctx.fillStyle='rgba(255,200,80,0.8)'; ctx.fillRect(sx+TILE/2-4,sy+14,8,4);
        ctx.shadowBlur=0;
        ctx.font='11px serif'; ctx.textAlign='center'; ctx.fillText('📦',sx+TILE/2,sy+TILE-4);
      }
    }
    // 7 = treetop platform (village floor — warm wood planks)
    if(t===7){
      // Wooden plank base
      const plankG=ctx.createLinearGradient(sx,sy,sx,sy+TILE);
      plankG.addColorStop(0,'#8b5e2a'); plankG.addColorStop(0.5,'#7a5025'); plankG.addColorStop(1,'#6b4020');
      ctx.fillStyle=plankG; ctx.fillRect(sx,sy,TILE,TILE);
      // plank lines (horizontal wood grain)
      ctx.strokeStyle='rgba(50,25,5,0.4)'; ctx.lineWidth=1;
      for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(sx,sy+i*10);ctx.lineTo(sx+TILE,sy+i*10);ctx.stroke();}
      // wood grain noise
      ctx.strokeStyle='rgba(100,60,20,0.2)'; ctx.lineWidth=0.5;
      ctx.beginPath();ctx.moveTo(sx+5,sy);ctx.lineTo(sx+8,sy+TILE);ctx.stroke();
      ctx.beginPath();ctx.moveTo(sx+20,sy);ctx.lineTo(sx+18,sy+TILE);ctx.stroke();
      ctx.beginPath();ctx.moveTo(sx+32,sy);ctx.lineTo(sx+35,sy+TILE);ctx.stroke();
      // edge highlight (top rim of platform)
      ctx.fillStyle='rgba(200,150,80,0.25)'; ctx.fillRect(sx,sy,TILE,2);
      // edge shadow (bottom rim)
      ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(sx,sy+TILE-3,TILE,3);
      ctx.lineWidth=1;
      // gentle golden ambient glow at village
      const glow=Math.sin(Date.now()*0.0008+tx*0.3+ty*0.5)*0.04+0.06;
      ctx.fillStyle=`rgba(255,200,80,${glow})`; ctx.fillRect(sx,sy,TILE,TILE);
    }
  } // end drawTile

  console.log("[SGA] P2-G: cutscene defined");
  const cutscene = {
    active: false,
    phase: 'walkin',   // walkin | drink | grow | walkout | done
    gx: -40,           // gerbil x (world coords, canvas-relative for cutscene)
    gy: canvas.height/2 + 60,
    gSize: 10,         // starts small
    targetSize: 10,
    potionX: canvas.width/2 - 20,
    potionY: canvas.height/2 + 55,
    potionVisible: true,
    timer: 0,
    drinkStarted: false,
    facing: 1,         // 1=right, -1=left
  };

  console.log("[SGA] P2-H: loop defined");
  function loop(){
    if(!window._sgaLogged){window._sgaLogged=true;console.log("[SGA] loop() first frame, gamePaused="+gamePaused+", canvas.width="+canvas.width);}
    if(!gamePaused) {
    vineAnim+=.03;
    // move player
    let dx=0,dy=0;
    if(player.keys['ArrowLeft']||player.keys['a']||player.keys['A']) dx-=1;
    if(player.keys['ArrowRight']||player.keys['d']||player.keys['D']) dx+=1;
    if(player.keys['ArrowUp']||player.keys['w']||player.keys['W']) dy-=1;
    if(player.keys['ArrowDown']||player.keys['s']||player.keys['S']) dy+=1;
    let spd=player.speed;
    if(isSwamp(player.x,player.y)) spd*=.4;
    else if(isBush(player.x,player.y)) spd*=.6;
    const r=player.size;
    const nx=player.x+dx*spd,ny=player.y+dy*spd;
    if(!isSolid(nx-r,player.y-r)&&!isSolid(nx+r,player.y-r)&&!isSolid(nx-r,player.y+r)&&!isSolid(nx+r,player.y+r)) player.x=nx;
    if(!isSolid(player.x-r,ny-r)&&!isSolid(player.x+r,ny-r)&&!isSolid(player.x-r,ny+r)&&!isSolid(player.x+r,ny+r)) player.y=ny;
    if(player.invincible>0) player.invincible--;
    // monkeys
    monkeys.forEach(a=>{
      const pd=Math.hypot(player.x-a.x,player.y-a.y);
      if(pd<TILE*6){const ang=Math.atan2(player.y-a.y,player.x-a.x);a.x+=Math.cos(ang)*a.speed;a.y+=Math.sin(ang)*a.speed;a.aggro=true;a.attackTimer++;if(pd<a.size+player.size&&a.attackTimer>30&&player.invincible===0){const dmg=save.items.includes('shield')?2.5:5;save.hp=Math.max(0,save.hp-dmg);player.invincible=60;a.attackTimer=0;updateHUD();if(save.hp<=0){loseLife(()=>{closeMsg();startPlanet(2);});}}}
      else{a.aggro=false;a.x+=a.dx;a.y+=a.dy;if(a.x<TILE||a.x>(COLS-1)*TILE)a.dx*=-1;if(a.y<TILE||a.y>(ROWS-1)*TILE)a.dy*=-1;}
      a.x=Math.max(TILE,Math.min(22*TILE,a.x));a.y=Math.max(TILE,Math.min((ROWS-1)*TILE,a.y));
    });
    // boss
    if(miniBoss.alive){
      let pd=Math.hypot(player.x-miniBoss.x,player.y-miniBoss.y);
      miniBoss.attackTimer++;
      if(miniBoss.charging){
        miniBoss.x+=miniBoss.chargeDir.x*8;miniBoss.y+=miniBoss.chargeDir.y*8;
        miniBoss.chargeTimer--;if(miniBoss.chargeTimer<=0)miniBoss.charging=false;
        if(pd<miniBoss.size+player.size&&player.invincible===0){let dmg=save.items.includes('shield')?7.5:15;save.hp=Math.max(0,save.hp-dmg);player.invincible=90;addP(player.x,player.y,'#f00',10);updateHUD();if(save.hp<=0){loseLife(()=>{closeMsg();startPlanet(2);});}}
      } else {
        let ang=Math.atan2(player.y-miniBoss.y,player.x-miniBoss.x);
        miniBoss.x+=Math.cos(ang)*miniBoss.speed;miniBoss.y+=Math.sin(ang)*miniBoss.speed;
        if(miniBoss.attackTimer>240){miniBoss.charging=true;miniBoss.chargeTimer=20;miniBoss.chargeDir={x:Math.cos(ang),y:Math.sin(ang)};miniBoss.attackTimer=0;addP(miniBoss.x,miniBoss.y,'#f80',20);}
        if(pd<miniBoss.size+player.size&&player.invincible===0){let dmg=save.items.includes('shield')?4:8;save.hp=Math.max(0,save.hp-dmg);player.invincible=60;updateHUD();if(save.hp<=0){loseLife(()=>{closeMsg();startPlanet(2);});}}
      }
      miniBoss.x=Math.max(TILE+miniBoss.size,Math.min(22*TILE-miniBoss.size,miniBoss.x));
      miniBoss.y=Math.max(TILE+miniBoss.size,Math.min((ROWS-1)*TILE-miniBoss.size,miniBoss.y));
    }
    // bunnies
    bunnies.forEach(b=>{
      b.x+=b.dx;b.y+=b.dy;
      if(b.x<TILE||b.x>(COLS-1)*TILE)b.dx*=-1;if(b.y<TILE||b.y>(ROWS-1)*TILE)b.dy*=-1;
      b.healTimer++;let pd=Math.hypot(player.x-b.x,player.y-b.y);
      if(pd<b.size+player.size+5&&b.healTimer>120){save.hp=Math.min(save.maxHp,save.hp+5);b.healTimer=0;addP(b.x,b.y,'#f9f',8);updateHUD();}
    });
    particles=particles.filter(p=>p.life>0);particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life--;p.vx*=.92;p.vy*=.92;});
    // Fuel magnet auto-collect
    if(save.items.includes('magnet')) {
      for(let i=resources.length-1;i>=0;i--) {
        let r=resources[i]; if(r.type!=='fuel') continue;
        if(r.hidden&&!p2state.mapRevealed) continue;
        const rx=r.x*TILE+TILE/2, ry=r.y*TILE+TILE/2;
        if(Math.hypot(player.x-rx,player.y-ry)<TILE*3) {
          save.resources.fuel++; resources.splice(i,1); updateHUD();
        }
      }
    }
    // Lava damage
    if(!player.invincible){
      const ltx=Math.floor(player.x/TILE),lty=Math.floor(player.y/TILE);
      if(ltx>=0&&lty>=0&&ltx<COLS&&lty<ROWS&&map[lty][ltx]===8){
        save.hp=Math.max(0,save.hp-0.15);updateHUD();addP(player.x,player.y,'#f80',2);
        if(save.hp<=0){loseLife(()=>{closeMsg();startPlanet(2);});}
      }
    }
    // Parrot auto-collect
    parrots.forEach(p=>{
      if(p.collected)return;
      p.timer++;
      p.x+=Math.cos(p.timer*0.03)*p.dx*0.8; p.y+=Math.sin(p.timer*0.025)*p.dy*0.8;
      p.x=Math.max(TILE,Math.min((COLS-1)*TILE,p.x)); p.y=Math.max(TILE,Math.min((ROWS-1)*TILE,p.y));
      if(Math.hypot(player.x-p.x,player.y-p.y)<TILE*1.5){
        p.collected=true; save.resources.banana=(save.resources.banana||0)+3;
        addP(p.x,p.y,'#f90',12); updateHUD();
        showMsg('🦜 Parrot Befriended!','+3 Bananas! The parrot drops jungle treasure and flies off!');
      }
    });
    // Weapon cooldown
    if(weaponCooldown>0) weaponCooldown--;
    if((activeWeapon==='crystal_bow'||activeWeapon==='jungle_bow')&&weaponCooldown<=0){
      const range=activeWeapon==='jungle_bow'?TILE*6:TILE*4; let closest=null,cd=range;
      [...monkeys,...golems,...lizards,...panthers].forEach(e=>{const d=Math.hypot(player.x-e.x,player.y-e.y);if(d<cd){cd=d;closest=e;}});
      if(closest){closest.hp-=2;addP(closest.x,closest.y,'#8af',6);weaponCooldown=120;}
    }
    if(activeWeapon==='thunder_orb'&&weaponCooldown<=0){
      [...monkeys,...golems,...lizards,...panthers].forEach(e=>{if(Math.hypot(player.x-e.x,player.y-e.y)<TILE*3){e.hp-=1;addP(e.x,e.y,'#ff0',4);}});
      weaponCooldown=90;
    }
    // Golem AI
    golems.forEach((a,i)=>{
      if(a.hp<=0){addP(a.x,a.y,'#888',20);save.resources.rock=(save.resources.rock||0)+2;golems.splice(i,1);return;}
      let pd=Math.hypot(player.x-a.x,player.y-a.y);
      if(pd<TILE*4){let ang=Math.atan2(player.y-a.y,player.x-a.x);a.x+=Math.cos(ang)*a.speed;a.y+=Math.sin(ang)*a.speed;a.aggro=true;
        if(a.attackTimer>0)a.attackTimer--;
        if(pd<a.size+player.size&&a.attackTimer<=0){let dmg=save.items.includes('ruin_shield')?1:save.items.includes('shield')?2.5:5;save.hp=Math.max(0,save.hp-dmg);updateHUD();a.attackTimer=80;if(save.hp<=0)loseLife(()=>{closeMsg();startPlanet(2);});}
      } else {a.aggro=false;a.x+=a.dx;a.y+=a.dy;if(a.x<30*TILE||a.x>46*TILE)a.dx*=-1;if(a.y<TILE||a.y>(ROWS-1)*TILE)a.dy*=-1;}
      a.x=Math.max(30*TILE,Math.min(46*TILE,a.x));a.y=Math.max(TILE,Math.min((ROWS-1)*TILE,a.y));
    });
    // Lizard AI
    lizards.forEach((a,i)=>{
      if(a.hp<=0){addP(a.x,a.y,'#f80',16);save.resources.crystal=(save.resources.crystal||0)+1;lizards.splice(i,1);return;}
      let pd=Math.hypot(player.x-a.x,player.y-a.y);
      if(pd<TILE*5){let ang=Math.atan2(player.y-a.y,player.x-a.x);a.x+=Math.cos(ang)*a.speed;a.y+=Math.sin(ang)*a.speed;a.aggro=true;
        if(a.attackTimer>0)a.attackTimer--;
        if(pd<a.size+player.size&&a.attackTimer<=0){let dmg=save.items.includes('ruin_shield')?0.8:save.items.includes('shield')?1.5:3;save.hp=Math.max(0,save.hp-dmg);addP(a.x,a.y,'#f80',4);updateHUD();a.attackTimer=45;if(save.hp<=0)loseLife(()=>{closeMsg();startPlanet(2);});}
      } else {a.aggro=false;a.x+=a.dx;a.y+=a.dy;if(a.x<30*TILE||a.x>46*TILE)a.dx*=-1;if(a.y<TILE||a.y>14*TILE)a.dy*=-1;}
      a.x=Math.max(30*TILE,Math.min(46*TILE,a.x));a.y=Math.max(TILE,Math.min(14*TILE,a.y));
    });
    // Panther AI
    panthers.forEach((a,i)=>{
      if(a.hp<=0){addP(a.x,a.y,'#808',16);save.resources.plant=(save.resources.plant||0)+2;panthers.splice(i,1);return;}
      let pd=Math.hypot(player.x-a.x,player.y-a.y);
      a.alpha=pd<TILE*3?0.95:pd<TILE*6?0.6:0.2;
      if(pd<TILE*5){let ang=Math.atan2(player.y-a.y,player.x-a.x);a.x+=Math.cos(ang)*a.speed;a.y+=Math.sin(ang)*a.speed;a.aggro=true;
        if(a.attackTimer>0)a.attackTimer--;
        if(pd<a.size+player.size&&a.attackTimer<=0){let dmg=save.items.includes('ruin_shield')?1.2:save.items.includes('shield')?2:4;save.hp=Math.max(0,save.hp-dmg);updateHUD();a.attackTimer=55;if(save.hp<=0)loseLife(()=>{closeMsg();startPlanet(2);});}
      } else {a.aggro=false;a.x+=a.dx;a.y+=a.dy;if(a.x<30*TILE||a.x>46*TILE)a.dx*=-1;if(a.y<14*TILE||a.y>26*TILE)a.dy*=-1;}
      a.x=Math.max(30*TILE,Math.min(46*TILE,a.x));a.y=Math.max(14*TILE,Math.min(26*TILE,a.y));
    });
        cam.x=Math.max(0,Math.min(player.x-canvas.width/2,COLS*TILE-canvas.width));
    cam.y=Math.max(0,Math.min(player.y-canvas.height/2,ROWS*TILE-canvas.height));
    } // end !gamePaused

    // DRAW
    // Deep jungle atmosphere
    const bgG=ctx.createLinearGradient(0,0,0,canvas.height);
    bgG.addColorStop(0,'#040c04'); bgG.addColorStop(1,'#060e06');
    console.log("[SGA] drawing bg, canvas="+canvas.width+"x"+canvas.height);
    ctx.fillStyle=bgG; ctx.fillRect(0,0,canvas.width,canvas.height);
    for(let ty=0;ty<ROWS;ty++)for(let tx=0;tx<COLS;tx++)drawTile(tx,ty);

    // ── Parrots ──────────────────────────────────────────────
    parrots.forEach(p=>{
      if(p.collected)return;
      const px2=p.x-cam.x,py2=p.y-cam.y;
      if(px2<-30||px2>canvas.width+30||py2<-30||py2>canvas.height+30)return;
      const bob=Math.sin(Date.now()*0.008+p.timer)*4;
      ctx.shadowColor='#f90';ctx.shadowBlur=10;
      ctx.font='18px serif';ctx.textAlign='center';ctx.fillText('🦜',px2,py2+bob+5);
      ctx.shadowBlur=0;
      if(Math.hypot(player.x-p.x,player.y-p.y)<TILE*2.5){
        ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fillRect(px2-22,py2+bob-22,44,14);
        ctx.fillStyle='#ffa';ctx.font='8px Share Tech Mono,monospace';ctx.textAlign='center';
        ctx.fillText('+3🍌 walk near',px2,py2+bob-11);
      }
    });

    // ── Golems (ruin zone) ───────────────────────────────────
    golems.forEach(a=>{
      const ax=a.x-cam.x,ay=a.y-cam.y;
      if(ax<-40||ax>canvas.width+40||ay<-40||ay>canvas.height+40)return;
      if(a.aggro){ctx.shadowColor='#aaa';ctx.shadowBlur=14;}
      // stone body
      ctx.fillStyle=a.aggro?'#8a8a8a':'#5a5a5a';
      roundRect(ctx,ax-a.size,ay-a.size,a.size*2,a.size*2,4);ctx.fill();
      ctx.shadowBlur=0;
      // rune markings
      ctx.strokeStyle='rgba(100,200,255,0.5)';ctx.lineWidth=1.5;
      ctx.strokeRect(ax-a.size+4,ay-a.size+4,a.size*2-8,a.size*2-8);
      ctx.lineWidth=1;
      // glowing eyes
      ctx.fillStyle='#00aaff';ctx.shadowColor='#0af';ctx.shadowBlur=8;
      ctx.beginPath();ctx.arc(ax-5,ay-4,3,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(ax+5,ay-4,3,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
      // hp bar
      ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(ax-16,ay-a.size-8,32,5);
      ctx.fillStyle=a.hp/a.maxhp>0.5?'#4f4':'#f44';ctx.fillRect(ax-16,ay-a.size-8,32*(a.hp/a.maxhp),5);
    });

    // ── Lizards (lava zone) ─────────────────────────────────
    lizards.forEach(a=>{
      let ax=a.x-cam.x,ay=a.y-cam.y;
      if(ax<-30||ax>canvas.width+30||ay<-30||ay>canvas.height+30)return;
      if(a.aggro){ctx.shadowColor='#f80';ctx.shadowBlur=12;}
      ctx.fillStyle=a.aggro?'#ff4400':'#cc2200';
      ctx.beginPath();ctx.ellipse(ax,ay,a.size+4,a.size-3,0,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
      // scales
      ctx.strokeStyle='rgba(80,0,0,0.6)';ctx.lineWidth=1;
      for(let i=-1;i<=1;i++){ctx.beginPath();ctx.arc(ax+i*6,ay,4,0,Math.PI*2);ctx.stroke();}
      // slit eyes
      ctx.fillStyle='#ffd700';ctx.beginPath();ctx.ellipse(ax-5,ay-3,3,4,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(ax+5,ay-3,3,4,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(ax-5,ay-3,0.8,3,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(ax+5,ay-3,0.8,3,0,0,Math.PI*2);ctx.fill();
      // forked tongue
      ctx.strokeStyle='#f00';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(ax,ay+5);ctx.lineTo(ax-2,ay+10);ctx.moveTo(ax,ay+5);ctx.lineTo(ax+2,ay+10);ctx.stroke();ctx.lineWidth=1;
      // hp bar
      ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(ax-11,ay-a.size-7,22,4);
      ctx.fillStyle='#f44';ctx.fillRect(ax-11,ay-a.size-7,22*(a.hp/a.maxhp),4);
    });

    // ── Panthers (deep jungle, semi-transparent) ────────────
    panthers.forEach(a=>{
      let ax=a.x-cam.x,ay=a.y-cam.y;
      if(ax<-30||ax>canvas.width+30||ay<-30||ay>canvas.height+30)return;
      ctx.globalAlpha=a.alpha;
      if(a.aggro){ctx.shadowColor='#80f';ctx.shadowBlur=16;}
      ctx.fillStyle='#180028';ctx.beginPath();ctx.ellipse(ax,ay,a.size+3,a.size-2,0,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
      // spots
      ctx.fillStyle='rgba(100,0,180,0.4)';
      [[ax-5,ay-3],[ax+4,ay+2],[ax-2,ay+5],[ax+6,ay-5]].forEach(([sx,sy])=>{ctx.beginPath();ctx.arc(sx,sy,2.5,0,Math.PI*2);ctx.fill();});
      // glowing purple eyes
      ctx.fillStyle='#cc00ff';ctx.shadowColor='#cc00ff';ctx.shadowBlur=10;
      ctx.beginPath();ctx.arc(ax-4,ay-4,2.5,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(ax+4,ay-4,2.5,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
      ctx.globalAlpha=1;
      // hp bar only when visible
      if(a.alpha>0.5){ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(ax-11,ay-a.size-7,22,4);ctx.fillStyle='#80f';ctx.fillRect(ax-11,ay-a.size-7,22*(a.hp/a.maxhp),4);}
    });

    // ── village huts & decorations ──────────────────────────────
    // Only draw when village columns are visible
    function drawHut(hx, hy, label) {
      const sx=hx-cam.x, sy=hy-cam.y;
      if(sx<-80||sx>canvas.width+80||sy<-80||sy>canvas.height+80) return;
      // platform already drawn as tile 7; draw hut on top
      // walls
      ctx.fillStyle='#6b4a20'; ctx.fillRect(sx+4,sy-28,32,28);
      // door
      ctx.fillStyle='#3a200a'; ctx.fillRect(sx+14,sy-20,12,20);
      // window
      ctx.fillStyle='rgba(255,220,100,0.7)'; ctx.fillRect(sx+7,sy-24,8,8);
      ctx.fillStyle='rgba(255,220,100,0.7)'; ctx.fillRect(sx+25,sy-24,8,8);
      // thatched roof
      ctx.fillStyle='#4a8020';
      ctx.beginPath();ctx.moveTo(sx,sy-28);ctx.lineTo(sx+20,sy-54);ctx.lineTo(sx+40,sy-28);ctx.closePath();ctx.fill();
      ctx.fillStyle='#3a6018';
      ctx.beginPath();ctx.moveTo(sx+4,sy-32);ctx.lineTo(sx+20,sy-50);ctx.lineTo(sx+36,sy-32);ctx.closePath();ctx.fill();
      // thatch lines
      ctx.strokeStyle='rgba(20,50,5,0.4)'; ctx.lineWidth=1;
      for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(sx+i*8,sy-28);ctx.lineTo(sx+20,sy-54);ctx.stroke();}
      ctx.lineWidth=1;
      // lantern
      const lanternGlow=Math.sin(Date.now()*0.003+hx)*0.15+0.7;
      ctx.fillStyle=`rgba(255,180,40,${lanternGlow})`;
      ctx.shadowColor='rgba(255,160,30,0.8)'; ctx.shadowBlur=12;
      ctx.fillRect(sx+17,sy-44,6,6);
      ctx.shadowBlur=0;
    }
    // Village huts spread across the large platform
    drawHut(25*TILE+2, 2*TILE, 'hut1');   // top-left
    drawHut(28*TILE+2, 2*TILE, 'hut2');   // top-right
    drawHut(25*TILE+2, 7*TILE, 'hut3');   // mid-left
    drawHut(28*TILE+2, 7*TILE, 'hut4');   // mid-right
    drawHut(25*TILE+2, 12*TILE, 'hut5');  // bottom-left
    drawHut(28*TILE+2, 12*TILE, 'hut6');  // bottom-right
    // Central market stall in the middle of village
    function drawStall(hx,hy) {
      let sx=hx-cam.x, sy=hy-cam.y;
      if(sx<-80||sx>canvas.width+80) return;
      ctx.fillStyle='#5a3a10'; ctx.fillRect(sx,sy-12,36,12);
      // striped awning
      for(let i=0;i<4;i++){
        ctx.fillStyle=i%2===0?'#e83030':'#f0f0f0';
        ctx.fillRect(sx+i*9,sy-24,9,12);
      }
      ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(sx,sy-24,36,2);
      ctx.fillStyle='#4a2a08'; ctx.fillRect(sx-2,sy-24,4,24); ctx.fillRect(sx+34,sy-24,4,24);
    }
    drawStall(26*TILE+2, 6*TILE+20);   // centre stall 1
    drawStall(26*TILE+2, 11*TILE+20);  // centre stall 2
    // Village sign at vine bridge entry
    function drawSign(sx2, sy2, text1, text2) {
      let sx=sx2-cam.x, sy=sy2-cam.y;
      if(sx<-100||sx>canvas.width+100) return;
      ctx.fillStyle='#6b4a1a'; ctx.fillRect(sx-24,sy-22,48,20);
      ctx.strokeStyle='#4a3010'; ctx.lineWidth=1.5; ctx.strokeRect(sx-24,sy-22,48,20); ctx.lineWidth=1;
      ctx.fillStyle='#ffe080'; ctx.font='bold 8px Share Tech Mono,monospace'; ctx.textAlign='center';
      ctx.fillText(text1, sx, sy-12);
      ctx.fillStyle='#ffd'; ctx.font='7px Share Tech Mono,monospace';
      ctx.fillText(text2, sx, sy-4);
      // post
      ctx.fillStyle='#6b4a1a'; ctx.fillRect(sx-2,sy-2,4,18);
    }
    drawSign(21*TILE+20, 3*TILE, '🌿 TREETOP', 'VILLAGE →');
    drawSign(21*TILE+20, 9*TILE, '🌿 TREETOP', 'VILLAGE →');
    // Village gate sign on the village side
    drawSign(24*TILE+20, 3*TILE, '🏡 WELCOME', 'SAFE ZONE');
    drawSign(24*TILE+20, 9*TILE, '🏡 WELCOME', 'SAFE ZONE');

    // Village ambient decorations — lantern posts, banners
    function drawLanternPost(lx, ly) {
      let sx=lx-cam.x, sy=ly-cam.y;
      if(sx<-20||sx>canvas.width+20||sy<-20||sy>canvas.height+20) return;
      // post
      ctx.fillStyle='#5a3a10'; ctx.fillRect(sx-2,sy-28,4,28);
      // lantern flicker
      const flicker=Math.sin(Date.now()*0.007+lx*0.1)*0.2+0.8;
      ctx.shadowColor=`rgba(255,180,40,${flicker})`; ctx.shadowBlur=18;
      ctx.fillStyle=`rgba(255,200,60,${flicker*0.9})`;
      ctx.fillRect(sx-5,sy-32,10,8);
      ctx.shadowBlur=0;
      // lantern glow on floor
      ctx.fillStyle=`rgba(255,160,30,${0.04+flicker*0.04})`;
      ctx.beginPath(); ctx.ellipse(sx,sy,16,8,0,0,Math.PI*2); ctx.fill();
    }
    // Place lantern posts along village paths
    [[24,4],[27,4],[24,8],[27,8],[24,12],[27,12],[24,16],[27,16]].forEach(([tx,ty])=>{
      drawLanternPost(tx*TILE+20, ty*TILE+20);
    });

    // resources — glowing
    resources.forEach(r=>{
      if(r.hidden&&!p2state.mapRevealed) return;
      let sx=r.x*TILE+TILE/2-cam.x,sy=r.y*TILE+TILE/2-cam.y;
      ctx.shadowColor='rgba(200,255,100,0.5)'; ctx.shadowBlur=10;
      ctx.font='22px serif';ctx.textAlign='center';ctx.fillText(r.label,sx,sy+7);
      ctx.shadowBlur=0;
      if(r.hp<r.maxhp){
        ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(sx-11,sy+10,22,5);
        ctx.fillStyle='#4f4';ctx.fillRect(sx-11,sy+10,22*(r.hp/r.maxhp),5);
        ctx.strokeStyle='rgba(0,200,0,0.3)';ctx.strokeRect(sx-11,sy+10,22,5);
      }
    });

    // bunnies — softer, glowing aura
    bunnies.forEach(b=>{
      const bx=b.x-cam.x,by=b.y-cam.y;
      const pulse=Math.sin(Date.now()*0.004+b.x)*0.4+0.6;
      // heal aura
      ctx.shadowColor='rgba(255,180,255,0.6)'; ctx.shadowBlur=16*pulse;
      ctx.strokeStyle=`rgba(255,160,255,${0.2*pulse})`;ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(bx,by,b.size+6,0,Math.PI*2);ctx.stroke();
      ctx.shadowBlur=0; ctx.lineWidth=1;
      // body gradient
      const bg=ctx.createRadialGradient(bx-3,by-3,1,bx,by,b.size);
      bg.addColorStop(0,'#fff0ff'); bg.addColorStop(1,'#e080e0');
      ctx.fillStyle=bg;ctx.beginPath();ctx.ellipse(bx,by,b.size,b.size-3,0,0,Math.PI*2);ctx.fill();
      // ears
      ctx.fillStyle='#fce';
      ctx.beginPath();ctx.ellipse(bx-5,by-b.size,3,7,.2,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(bx+5,by-b.size,3,7,-.2,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(255,180,200,0.6)';
      ctx.beginPath();ctx.ellipse(bx-5,by-b.size,1.5,4,.2,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(bx+5,by-b.size,1.5,4,-.2,0,Math.PI*2);ctx.fill();
      // eyes — bright green
      ctx.fillStyle='#0f0';ctx.shadowColor='#0f0';ctx.shadowBlur=6;
      ctx.beginPath();ctx.arc(bx-4,by-3,2.5,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(bx+4,by-3,2.5,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
      ctx.fillStyle='#f68';ctx.beginPath();ctx.arc(bx,by+2,2,0,Math.PI*2);ctx.fill();
    });

    // ── village merchants ───────────────────────────────────────
    VILLAGE_MERCHANTS.forEach(m=>{
      const mx2=m.x-cam.x, my2=m.y-cam.y;
      // only draw if on screen
      if(mx2<-60||mx2>canvas.width+60||my2<-60||my2>canvas.height+60) return;
      let bob=Math.sin(Date.now()*0.002+m.bobOffset)*3;
      // golden interaction glow when player is close
      const dist=Math.hypot(player.x-m.x,player.y-m.y);
      if(dist<TILE*2.5){
        ctx.shadowColor='rgba(255,210,60,0.8)'; ctx.shadowBlur=22;
        ctx.strokeStyle='rgba(255,200,50,0.5)'; ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(mx2,my2+bob,22,0,Math.PI*2);ctx.stroke();
        ctx.shadowBlur=0; ctx.lineWidth=1;
        // talk prompt
        ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(mx2-28,my2+bob-44,56,18);
        ctx.fillStyle='#ffd'; ctx.font='bold 10px Share Tech Mono,monospace';
        ctx.textAlign='center'; ctx.fillText('CLICK to trade',mx2,my2+bob-30);
      }
      // body — simple solid fill to avoid gradient crashes
      ctx.fillStyle=m.color; ctx.beginPath();ctx.arc(mx2,my2+bob,18,0,Math.PI*2);ctx.fill();
      // robe/cloak texture
      ctx.fillStyle='rgba(0,0,0,0.2)';
      ctx.beginPath();ctx.arc(mx2,my2+bob+4,16,0,Math.PI);ctx.fill();
      // head
      ctx.fillStyle='#f5d090'; ctx.beginPath();ctx.arc(mx2,my2+bob-14,9,0,Math.PI*2);ctx.fill();
      // face dot eyes
      ctx.fillStyle='#333'; ctx.beginPath();ctx.arc(mx2-3,my2+bob-15,1.5,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(mx2+3,my2+bob-15,1.5,0,Math.PI*2);ctx.fill();
      // emoji tag
      ctx.font='14px serif'; ctx.textAlign='center';
      ctx.fillText(m.emoji, mx2, my2+bob-26);
      // name label
      ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(mx2-28,my2+bob+22,56,14);
      ctx.fillStyle='#ffd'; ctx.font='8px Share Tech Mono,monospace';
      ctx.textAlign='center'; ctx.fillText(m.name.split(' ')[0], mx2, my2+bob+32);
    });

    // monkeys — detailed with fur texture
    monkeys.forEach(a=>{
      let ax=a.x-cam.x,ay=a.y-cam.y;
      if(a.aggro){ctx.shadowColor='rgba(255,40,40,0.7)';ctx.shadowBlur=16;}
      // shadow
      ctx.fillStyle='rgba(0,0,0,0.25)';ctx.beginPath();ctx.ellipse(ax,ay+a.size-2,a.size-2,5,0,0,Math.PI*2);ctx.fill();
      // body
      const mg=ctx.createRadialGradient(ax-4,ay-4,2,ax,ay,a.size);
      mg.addColorStop(0,'#a06030'); mg.addColorStop(1,'#5a3010');
      ctx.fillStyle=mg;ctx.beginPath();ctx.arc(ax,ay,a.size,0,Math.PI*2);ctx.fill();
      // face
      const fg=ctx.createRadialGradient(ax-2,ay-a.size*.3-2,1,ax,ay-a.size*.3,a.size*.75);
      fg.addColorStop(0,'#c07840'); fg.addColorStop(1,'#7a4018');
      ctx.fillStyle=fg;ctx.beginPath();ctx.arc(ax,ay-a.size*.3,a.size*.7,0,Math.PI*2);ctx.fill();
      // glowing red eyes
      ctx.shadowColor='#f00';ctx.shadowBlur=10;ctx.fillStyle='#ff2020';
      ctx.beginPath();ctx.arc(ax-5,ay-a.size*.3-2,3.5,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(ax+5,ay-a.size*.3-2,3.5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#200';ctx.beginPath();ctx.arc(ax-5,ay-a.size*.3-2,1.5,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(ax+5,ay-a.size*.3-2,1.5,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
      // hp bar
      ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(ax-13,ay-a.size-9,26,5);
      ctx.fillStyle=a.hp/a.maxhp>0.5?'#4f4':'#f44';ctx.fillRect(ax-13,ay-a.size-9,26*(a.hp/a.maxhp),5);
    });

    // boss — dramatic with charging effects
    if(miniBoss.alive){
      let bx=miniBoss.x-cam.x,by=miniBoss.y-cam.y;
      const flash=miniBoss.charging&&Math.floor(Date.now()/80)%2===0;
      const t=Date.now()*0.002;
      // intimidation aura
      ctx.shadowColor=flash?'rgba(255,100,0,0.8)':'rgba(180,0,0,0.5)';
      ctx.shadowBlur=flash?35:20;
      // ground shadow
      ctx.shadowBlur=0;ctx.fillStyle='rgba(0,0,0,0.4)';
      ctx.beginPath();ctx.ellipse(bx,by+miniBoss.size-2,miniBoss.size+4,10,0,0,Math.PI*2);ctx.fill();
      // body
      if(flash){ctx.shadowColor='#ff6000';ctx.shadowBlur=30;}
      const bossg=ctx.createRadialGradient(bx-8,by-8,4,bx,by,miniBoss.size);
      bossg.addColorStop(0,flash?'#ff8020':'#c06020');
      bossg.addColorStop(0.7,flash?'#aa4010':'#7a3810');
      bossg.addColorStop(1,'#4a1a05');
      ctx.fillStyle=bossg;ctx.beginPath();ctx.arc(bx,by,miniBoss.size,0,Math.PI*2);ctx.fill();
      // fur markings
      ctx.fillStyle='rgba(0,0,0,0.15)';
      for(let i=0;i<6;i++){const a=i/6*Math.PI*2;ctx.beginPath();ctx.arc(bx+Math.cos(a)*miniBoss.size*.75,by+Math.sin(a)*miniBoss.size*.75,5,0,Math.PI*2);ctx.fill();}
      ctx.shadowBlur=0;
      // glowing red eyes — large and menacing
      ctx.shadowColor='#f00';ctx.shadowBlur=20;ctx.fillStyle='#ff0000';
      ctx.beginPath();ctx.arc(bx-12,by-10,9,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(bx+12,by-10,9,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#200';ctx.beginPath();ctx.arc(bx-12,by-10,4,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(bx+12,by-10,4,0,Math.PI*2);ctx.fill();
      // pupils glint
      ctx.fillStyle='rgba(255,255,255,0.6)';ctx.beginPath();ctx.arc(bx-14,by-12,2,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(bx+10,by-12,2,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
      // teeth
      ctx.fillStyle='#ffe';
      ctx.fillRect(bx-10,by+5,7,10);ctx.fillRect(bx+3,by+5,7,10);
      // crown
      ctx.fillStyle='#ffd700';ctx.shadowColor='#ffd700';ctx.shadowBlur=12;
      ctx.beginPath();ctx.moveTo(bx-20,by-miniBoss.size+5);
      ctx.lineTo(bx-20,by-miniBoss.size-8);ctx.lineTo(bx-12,by-miniBoss.size);
      ctx.lineTo(bx,by-miniBoss.size-14);ctx.lineTo(bx+12,by-miniBoss.size);
      ctx.lineTo(bx+20,by-miniBoss.size-8);ctx.lineTo(bx+20,by-miniBoss.size+5);
      ctx.closePath();ctx.fill();
      ctx.fillStyle='#ff6060';
      ctx.beginPath();ctx.arc(bx-14,by-miniBoss.size-4,3,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(bx,by-miniBoss.size-10,3,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(bx+14,by-miniBoss.size-4,3,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
      // boss hp bar
      ctx.fillStyle='rgba(0,0,0,0.8)';ctx.fillRect(bx-42,by-miniBoss.size-22,84,10);
      ctx.fillStyle=`hsl(${(miniBoss.hp/miniBoss.maxhp)*120},100%,50%)`;
      ctx.fillRect(bx-42,by-miniBoss.size-22,84*(miniBoss.hp/miniBoss.maxhp),10);
      ctx.strokeStyle='rgba(255,100,0,0.5)';ctx.strokeRect(bx-42,by-miniBoss.size-22,84,10);
      ctx.fillStyle='#fff';ctx.font='bold 10px Share Tech Mono,monospace';ctx.textAlign='center';
      ctx.fillText(`👑 JUNGLE KING  ${miniBoss.hp}/${miniBoss.maxhp}`,bx,by-miniBoss.size-26);
    }

    // particles — glowing
    particles.forEach(p=>{ctx.globalAlpha=p.life/35;ctx.shadowColor=p.color;ctx.shadowBlur=8;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x-cam.x,p.y-cam.y,3.5,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;ctx.shadowBlur=0;

    // player — jungle explorer
    const px=player.x-cam.x,py=player.y-cam.y;
    const pFlash=player.invincible>0&&Math.floor(Date.now()/80)%2===0;
    if(!pFlash){
      drawPlayerSkin(ctx, px, py, player.size);
      if(save.items.includes('banana_sword')){
        ctx.shadowColor='#ffd700';ctx.shadowBlur=10;
        ctx.font='18px serif';ctx.textAlign='left';ctx.fillText('🍌',px+player.size-2,py-2);
        ctx.shadowBlur=0;
      }
    }
    // hp bar
    ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(px-21,py-player.size-11,42,6);
    const hpPct2=save.hp/save.maxHp;
    ctx.fillStyle=hpPct2>0.5?'rgba(50,220,80,0.9)':hpPct2>0.25?'rgba(255,170,0,0.9)':'rgba(255,60,60,0.9)';
    ctx.fillRect(px-21,py-player.size-11,42*hpPct2,6);
    ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.strokeRect(px-21,py-player.size-11,42,6);

    // launch ready banner
    if(save.resources.fuel>=15&&p2state.bossDead&&save.items.includes('rocket_upgrade')){
      ctx.fillStyle='rgba(255,220,0,.9)';ctx.font='bold 14px Courier New';ctx.textAlign='center';
      ctx.fillText('🚀 ROCKET READY! 15 fuel + upgrade collected! Press M to see map.',canvas.width/2,28);
      // TODO: add launch trigger for planet 3
    }

    // paused overlay (only when not in cutscene)
    if(gamePaused&&!cutscene.active){ctx.fillStyle='rgba(0,0,0,0.45)';ctx.fillRect(0,0,canvas.width,canvas.height);}

    // gerbil cutscene draws on top
    if(cutscene.active) drawCutscene();

    animFrameId = requestAnimationFrame(loop);
  }

  console.log("[SGA] P2-I: about to call RAF");
  console.log("[SGA] starting RAF loop");
  animFrameId = requestAnimationFrame(loop);

  // ── GERBIL CUTSCENE ──────────────────────────────────────
  // Plays after the welcome message is dismissed
  function playMinecraftDrink() {
    try {
      const ac = new (window.AudioContext||window.webkitAudioContext)();
      // Minecraft drinking: rapid sequence of pitched gulps
      const gulps = [0,60,120,180,240,300,360,420,480,540,600,660,720,780,840,900,960,1020,1080,1140,1200];
      gulps.forEach((t,i) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        const pitch = 280 + Math.sin(i*1.3)*80 + (i%3)*40;
        o.frequency.setValueAtTime(pitch, ac.currentTime + t/1000);
        o.frequency.exponentialRampToValueAtTime(pitch*0.6, ac.currentTime + t/1000 + 0.07);
        g.gain.setValueAtTime(0.18, ac.currentTime + t/1000);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t/1000 + 0.09);
        o.type = 'sine';
        o.start(ac.currentTime + t/1000);
        o.stop(ac.currentTime + t/1000 + 0.1);
      });
    } catch(e){}
  }


  function startCutscene() {
    cutscene.active = true;
    gamePaused = true;
  }

  function drawCutscene() {
    if(!cutscene.active) return;
    const c = cutscene;
    c.timer++;

    // Semi-transparent black bars (letterbox)
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, canvas.width, 80);
    ctx.fillRect(0, canvas.height-80, canvas.width, 80);

    // Caption bar
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, canvas.height-80, canvas.width, 80);

    if(c.phase === 'walkin') {
      c.gx += 1.5;
      c.facing = 1;
      const caption = 'A tiny gerbil emerges from the jungle...';
      ctx.fillStyle='#ddd'; ctx.font='13px Courier New'; ctx.textAlign='center';
      ctx.fillText(caption, canvas.width/2, canvas.height-48);
      if(c.gx >= c.potionX - 30) { c.phase = 'drink'; c.timer = 0; }
    }
    else if(c.phase === 'drink') {
      if(!c.drinkStarted) { c.drinkStarted=true; playMinecraftDrink(); }
      // Bob up and down while drinking
      c.gy = canvas.height/2 + 60 + Math.sin(c.timer*0.4)*3;
      // Potion shrinks as it's drunk
      const drinkProgress = Math.min(1, c.timer/80);
      c.potionVisible = drinkProgress < 1;
      const caption = c.timer < 40 ? 'It found a mysterious potion!' : 'Glug glug glug...';
      ctx.fillStyle='#ddd'; ctx.font='13px Courier New'; ctx.textAlign='center';
      ctx.fillText(caption, canvas.width/2, canvas.height-48);
      // Draw shrinking potion
      if(c.potionVisible) {
        const ps = 1 - drinkProgress * 0.8;
        ctx.save();
        ctx.translate(c.potionX+12, c.potionY-10);
        ctx.scale(ps, ps);
        ctx.font='28px serif'; ctx.textAlign='center';
        ctx.fillText('🧪', 0, 0);
        ctx.restore();
      }
      if(c.timer >= 90) { c.phase='grow'; c.timer=0; }
    }
    else if(c.phase === 'grow') {
      // Grow rapidly then shake
      c.targetSize = Math.min(52, 10 + c.timer * 0.7);
      c.gSize += (c.targetSize - c.gSize) * 0.15;
      const shake = c.timer < 40 ? (Math.random()-0.5)*4 : 0;
      c.gx += shake*0.3;
      // Flash the screen purple at peak
      if(c.timer === 30) {
        ctx.fillStyle='rgba(180,0,255,0.3)';
        ctx.fillRect(0,0,canvas.width,canvas.height);
      }
      const caption = c.timer < 20 ? '...' : c.timer < 45 ? 'Something is happening!!' : 'IT\'S GROWING!!!';
      ctx.fillStyle = c.timer>44?'#f8f':'#ddd';
      ctx.font = c.timer>44?'bold 14px Courier New':'13px Courier New';
      ctx.textAlign='center';
      ctx.fillText(caption, canvas.width/2, canvas.height-48);
      if(c.timer >= 80) { c.phase='walkout'; c.timer=0; c.facing=-1; }
    }
    else if(c.phase === 'walkout') {
      c.gx -= 2.5;
      c.facing = -1;
      const caption = 'The Nuclear Gerbil lumbers away into the darkness...';
      ctx.fillStyle='#f88'; ctx.font='bold 13px Courier New'; ctx.textAlign='center';
      ctx.fillText(caption, canvas.width/2, canvas.height-48);
      if(c.gx < -80) { c.phase='done'; c.active=false; gamePaused=false; }
    }

    // Draw the gerbil
    const gx = c.gx, gy = c.gy;
    const s = c.gSize;
    ctx.save();
    ctx.translate(gx, gy);
    if(c.facing === -1) ctx.scale(-1,1);

    // Body
    ctx.fillStyle = c.phase==='grow'&&c.timer>30 ? '#d4a' : '#c8954a';
    ctx.beginPath(); ctx.ellipse(0, 0, s, s*0.75, 0, 0, Math.PI*2); ctx.fill();
    // Head
    ctx.fillStyle = c.phase==='grow'&&c.timer>30 ? '#c9a' : '#c8954a';
    ctx.beginPath(); ctx.arc(s*0.7, -s*0.2, s*0.55, 0, Math.PI*2); ctx.fill();
    // Ears
    ctx.fillStyle='#e8b06a';
    ctx.beginPath(); ctx.ellipse(s*0.55, -s*0.7, s*0.18, s*0.28, -0.3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s*0.9, -s*0.65, s*0.15, s*0.25, 0.3, 0, Math.PI*2); ctx.fill();
    // Eyes — red & glowing after growing
    const eyeColor = c.phase==='grow'&&c.gSize>30 ? '#f00' : (c.phase==='walkout'?'#f00':'#222');
    if(c.phase==='grow'&&c.gSize>30||c.phase==='walkout') {
      ctx.shadowColor='#f00'; ctx.shadowBlur=8;
    }
    ctx.fillStyle=eyeColor;
    ctx.beginPath(); ctx.arc(s*0.58, -s*0.28, s*0.12, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    // Nose
    ctx.fillStyle='#d06060';
    ctx.beginPath(); ctx.arc(s*1.18, -s*0.18, s*0.1, 0, Math.PI*2); ctx.fill();
    // Tail
    ctx.strokeStyle='#a07040'; ctx.lineWidth=Math.max(2,s*0.12);
    ctx.beginPath(); ctx.moveTo(-s*0.8,0); ctx.quadraticCurveTo(-s*1.3,-s*0.6,-s*1.0,-s*0.9); ctx.stroke();
    // Legs (walking animation)
    const legSwing = Math.sin(c.timer*0.25)*0.4;
    ctx.strokeStyle='#a07040'; ctx.lineWidth=Math.max(1.5,s*0.1);
    ctx.beginPath(); ctx.moveTo(-s*0.2,s*0.5); ctx.lineTo(-s*0.2+Math.sin(legSwing)*s*0.4, s*0.5+s*0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s*0.2,s*0.5); ctx.lineTo(s*0.2+Math.sin(-legSwing)*s*0.4, s*0.5+s*0.5); ctx.stroke();

    ctx.restore();
  }

  // Trigger cutscene after welcome msg closes
  showMsg('🌴 Welcome to Zorbax!',
    'You have landed on the Jungle Planet!\n\n🐒 Red-eyed monkeys lurk in the shadows\n🐰 Fluffy bunnies will heal you — stay close!\n🌿 Click vines/trees to CLIMB and reveal the map\n👑 Find and defeat the JUNGLE KING mini-boss\n⚡ Collect 15 fuel to reach Planet 3',
    () => { setTimeout(startCutscene, 300); });
} // end launchP2



// ════════════════════════════════════════
// js/skins.js
// ════════════════════════════════════════
// ── SKINS ─────────────────────────────────────────────