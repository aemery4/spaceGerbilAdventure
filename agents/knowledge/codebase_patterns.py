"""
Pre-loaded codebase knowledge for Space Gerbil Adventure.

This eliminates the need for agents to read files repeatedly.
Include this in agent system prompts to reduce API calls.

ALL PLANETS USE MODULAR PATTERN (P1, P2, P3, P4):
- pX-data.js:  buildPXData(TILE, COLS, ROWS) -> {map, resources, enemies, ...}
- pX-logic.js: pXInitData(state), updatePX(), doAction handlers
- pX-draw.js:  drawPX(ctx), helper draw functions
- planetX.js:  launchPX() orchestrator - ties modules together
"""

# ═══════════════════════════════════════════════════════════════════════════════
# FILE STRUCTURE - MODULAR ARCHITECTURE
# ═══════════════════════════════════════════════════════════════════════════════

FILE_STRUCTURE = """
Game files (in code/game_v3/js/):

CORE (shared, rarely edit):
- globals.js: Save data shape, gamePaused flag
- save.js: persist(), loadSave()
- hud.js: updateHUD(), showMsg(), RECIPES
- craft.js: Crafting panel

PLANET 1 - Earth/Area 51:
- p1-data.js:  buildP1Data() -> {map, rocket, resources, aliens}
- p1-logic.js: p1InitData(), updateP1(), doP1Action(), isSolidP1()
- p1-draw.js:  drawP1(), drawP1Map(), drawP1Resources(), drawP1Player()
- planet1.js:  launchP1() orchestrator

PLANET 2 - Jungle Zorbax (~72KB split into 4 files):
- p2-data.js:  buildP2Data() -> {map, resources, enemies, merchants, chests}
- p2-logic.js: p2InitData(), updateP2(), doP2Action(), all AI functions
- p2-draw.js:  drawP2(), all drawing functions, village elements
- planet2.js:  launchP2() orchestrator + shop functions

PLANET 3 - Tundra Frigia:
- p3-data.js:  buildP3Data() -> {map, resources, enemies, merchants}
- p3-logic.js: p3InitData(), updateP3(), doP3Action(), tiger/mammoth AI
- p3-draw.js:  drawP3(), ice effects, camp drawing
- planet3.js:  launchP3() orchestrator

PLANET 4 - Aquatic Neptuna:
- p4-data.js:  buildP4Data() -> {map, resources, enemies, SEAHORSES}
- p4-logic.js: p4InitData(), updateP4(), doP4Action(), octopus boss AI
- p4-draw.js:  drawP4(), underwater rendering
- planet4.js:  launchP4() orchestrator

MENU & SKINS:
- menu.js: Main menu, planet select
- skins.js: ALL_SKINS, wardrobe

Canvas: 800x520px, ID='game'
"""

# ═══════════════════════════════════════════════════════════════════════════════
# MODULE FUNCTION MAPS - WHERE TO FIND/ADD CODE
# ═══════════════════════════════════════════════════════════════════════════════

MODULE_FUNCTION_MAPS = """
## FUNCTION LOCATION GUIDE

### To ADD a new resource/enemy/NPC:
Edit pX-data.js -> buildPXData() function, add to the appropriate array

### To CHANGE enemy AI or player movement:
Edit pX-logic.js -> updatePX() function

### To ADD a new interaction (click handler):
Edit pX-logic.js -> look for doPXAction() or tryXXX functions

### To CHANGE how something LOOKS:
Edit pX-draw.js -> find the appropriate drawPXXXX() function

### To ADD a new tile type:
1. pX-data.js: Add in map generation
2. pX-logic.js: Add collision handling in isSolidPX()
3. pX-draw.js: Add rendering in drawPXMap()

### Common function patterns per file:

pX-data.js:
- buildPXData(TILE, COLS, ROWS) - returns all static data

pX-logic.js:
- let pX = null;  // shared state
- pXInitData(state)  // initialize shared state
- addPX(x, y, color, count, size)  // particle helper
- doPXAction(mx, my)  // main click handler
- tryGatherPXResource(mx, my)  // resource gathering
- tryAttackPXEnemy(mx, my)  // combat
- tryInteractPXNPC(mx, my)  // NPC dialog
- updatePX()  // main update loop
- isSolidPX(px, py)  // collision check

pX-draw.js:
- drawPXMap(ctx)  // tile rendering
- drawPXResources(ctx)  // resource items
- drawPXEnemies(ctx)  // enemy sprites + health bars
- drawPXNPCs(ctx)  // NPC sprites
- drawPXParticles(ctx)  // particle effects
- drawPXPlayer(ctx)  // player sprite
- drawPX(ctx)  // main draw orchestrator

planetX.js:
- launchPX()  // orchestrator: calls buildPXData, pXInitData, sets up handlers
"""

# ═══════════════════════════════════════════════════════════════════════════════
# SHARED STATE PATTERN
# ═══════════════════════════════════════════════════════════════════════════════

SHARED_STATE_PATTERN = """
## SHARED STATE PATTERN

Each planet uses a global `pX` object for cross-module state:

```javascript
// In pX-logic.js:
let pX = null;  // Global shared state

function pXInitData(state) {
  pX = state;  // Receives all state from orchestrator
}

// Accessing state in any pX-*.js file:
pX.player.x      // player position
pX.cam.x         // camera offset
pX.map[r][c]     // tile at row, col
pX.enemies       // enemy array
pX.resources     // resource array
pX.particles     // particle array
pX.TILE          // tile size (26)
pX.COLS, pX.ROWS // map dimensions
```

The orchestrator (planetX.js) creates the state bundle:
```javascript
function launchPX() {
  const data = buildPXData(TILE, COLS, ROWS);

  pXInitData({
    canvas, ctx, TILE, COLS, ROWS,
    map: data.map,
    resources: data.resources,
    enemies: data.enemies,
    player, cam,
    particles: [],
    // ... other state
  });
}
```
"""

# ═══════════════════════════════════════════════════════════════════════════════
# ORCHESTRATOR TEMPLATE
# ═══════════════════════════════════════════════════════════════════════════════

ORCHESTRATOR_TEMPLATE = '''
// ════════════════════════════════════════
// js/planet{N}.js — Planet {N} Orchestrator
// {PLANET_NAME} — {GOAL_DESCRIPTION}
// Uses: p{N}-data.js, p{N}-logic.js, p{N}-draw.js
// ════════════════════════════════════════

function launchP{N}() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const TILE = 26, COLS = 48, ROWS = 28;

  // Build game data from data layer
  const data = buildP{N}Data(TILE, COLS, ROWS);

  // Player state
  const player = {
    x: 2 * TILE + 13, y: 2 * TILE + 13, size: 13,
    speed: save.items.includes('boots') ? 5 : 3,
    keys: {}, invincible: 0,
  };
  const cam = { x: 0, y: 0 };

  // Initialize shared state for logic and draw layers
  p{N}InitData({
    canvas, ctx, TILE, COLS, ROWS,
    map: data.map,
    resources: data.resources,
    enemies: data.enemies,
    // ... other data arrays
    player, cam,
    particles: [],
    activeWeapon: save.items.find(i => i.startsWith('w:'))?.slice(2) || null,
    weaponCooldown: 0,
    cleanup  // Pass cleanup function for loseLife callback
  });

  // ── Input handlers ──────────────────────────────────────
  function handleKeyDown(e) { if (!gamePaused) player.keys[e.key.toLowerCase()] = true; }
  function handleKeyUp(e) { player.keys[e.key.toLowerCase()] = false; }
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  canvas.onclick = function(e) {
    if (gamePaused) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left + cam.x;
    const my = e.clientY - rect.top + cam.y;
    doP{N}Action(mx, my);
  };

  // ── Main game loop ──────────────────────────────────────
  function loop() {
    if (gamePaused) { animFrameId = requestAnimationFrame(loop); return; }
    updateP{N}();
    drawP{N}(ctx);
    animFrameId = requestAnimationFrame(loop);
  }

  // ── Cleanup function ────────────────────────────────────
  function cleanup() {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    canvas.onclick = null;
  }

  // Make cleanup accessible to p{N} state
  p{N}.cleanup = cleanup;

  // ── Show intro message and start ────────────────────────
  showMsg('{EMOJI} {PLANET_NAME}', '{INTRO_MESSAGE}', () => { gamePaused = false; });
  gamePaused = true;
  loop();
}
'''

# ═══════════════════════════════════════════════════════════════════════════════
# DATA MODULE TEMPLATE
# ═══════════════════════════════════════════════════════════════════════════════

DATA_MODULE_TEMPLATE = '''
// ════════════════════════════════════════
// js/p{N}-data.js — Planet {N} Data Layer
// {PLANET_NAME} — map, resources, enemies
// ════════════════════════════════════════

function buildP{N}Data(TILE, COLS, ROWS) {
  // Map generation
  const map = [];
  for (let r = 0; r < ROWS; r++) {
    map[r] = [];
    for (let c = 0; c < COLS; c++) {
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
        map[r][c] = 1; // walls
      } else {
        map[r][c] = 0; // walkable
      }
    }
  }

  // Resources
  const resources = [
    { type: 'fuel', x: 5 * TILE + 13, y: 5 * TILE + 13, collected: false },
    // ... more resources
  ];

  // Enemies
  const enemies = [
    { x: 10 * TILE + 13, y: 10 * TILE + 13, hp: 3, maxHp: 3, speed: 2, type: 'basic', aggro: false },
    // ... more enemies
  ];

  return { map, resources, enemies };
}
'''

# ═══════════════════════════════════════════════════════════════════════════════
# LOGIC MODULE TEMPLATE
# ═══════════════════════════════════════════════════════════════════════════════

LOGIC_MODULE_TEMPLATE = '''
// ════════════════════════════════════════
// js/p{N}-logic.js — Planet {N} Logic Layer
// {PLANET_NAME} — update logic, AI, combat
// ════════════════════════════════════════

// ── Shared state (initialized by planet{N}.js) ─────
let p{N} = null;

function p{N}InitData(state) {
  p{N} = state;
}

// ── Collision check ────────────────────────────────
function isSolidP{N}(px, py) {
  const c = Math.floor(px / p{N}.TILE);
  const r = Math.floor(py / p{N}.TILE);
  if (c < 0 || c >= p{N}.COLS || r < 0 || r >= p{N}.ROWS) return true;
  return p{N}.map[r][c] === 1;
}

// ── Particle helper ────────────────────────────────
function addP{N}(x, y, color, count = 5, size = 3) {
  for (let i = 0; i < count; i++) {
    p{N}.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 3,
      life: 30, color, size
    });
  }
}

// ── Main action handler ────────────────────────────
function doP{N}Action(mx, my) {
  if (gamePaused) return;
  // Try gather resource, attack enemy, interact NPC
}

// ── Main update function ───────────────────────────
function updateP{N}() {
  if (gamePaused) return;

  // Update player movement
  let newX = p{N}.player.x, newY = p{N}.player.y;
  if (p{N}.player.keys['a'] || p{N}.player.keys['arrowleft']) newX -= p{N}.player.speed;
  if (p{N}.player.keys['d'] || p{N}.player.keys['arrowright']) newX += p{N}.player.speed;
  if (p{N}.player.keys['w'] || p{N}.player.keys['arrowup']) newY -= p{N}.player.speed;
  if (p{N}.player.keys['s'] || p{N}.player.keys['arrowdown']) newY += p{N}.player.speed;

  if (!isSolidP{N}(newX, newY)) {
    p{N}.player.x = newX;
    p{N}.player.y = newY;
  }

  // Update camera
  p{N}.cam.x = Math.max(0, Math.min(p{N}.player.x - 400, p{N}.COLS * p{N}.TILE - 800));
  p{N}.cam.y = Math.max(0, Math.min(p{N}.player.y - 260, p{N}.ROWS * p{N}.TILE - 520));

  // Update enemies, particles, etc.
}
'''

# ═══════════════════════════════════════════════════════════════════════════════
# DRAW MODULE TEMPLATE
# ═══════════════════════════════════════════════════════════════════════════════

DRAW_MODULE_TEMPLATE = '''
// ════════════════════════════════════════
// js/p{N}-draw.js — Planet {N} Draw Layer
// {PLANET_NAME} — all rendering
// ════════════════════════════════════════

// Uses shared p{N} state from p{N}-logic.js

function drawP{N}Map(ctx) {
  for (let r = 0; r < p{N}.ROWS; r++) {
    for (let c = 0; c < p{N}.COLS; c++) {
      const x = c * p{N}.TILE - p{N}.cam.x;
      const y = r * p{N}.TILE - p{N}.cam.y;
      if (x < -p{N}.TILE || x > 800 || y < -p{N}.TILE || y > 520) continue;

      if (p{N}.map[r][c] === 1) {
        ctx.fillStyle = '#555';
        ctx.fillRect(x, y, p{N}.TILE, p{N}.TILE);
      }
    }
  }
}

function drawP{N}Player(ctx) {
  const px = p{N}.player.x - p{N}.cam.x;
  const py = p{N}.player.y - p{N}.cam.y;
  if (p{N}.player.invincible % 10 < 5) {
    drawPlayerSkin(ctx, px, py, p{N}.player.size);
  }
}

function drawP{N}(ctx) {
  // Clear/background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 800, 520);

  drawP{N}Map(ctx);
  // drawP{N}Resources(ctx);
  // drawP{N}Enemies(ctx);
  // drawP{N}Particles(ctx);
  drawP{N}Player(ctx);
}
'''

# ═══════════════════════════════════════════════════════════════════════════════
# GLOBAL VARIABLES AND FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

GLOBAL_VARIABLES = """
Key globals (from globals.js):
- save: {hp, maxHp, lives, resources:{rock,plant,crystal,banana,fuel}, items:[], planetsCleared:[], skin}
- gamePaused: boolean - pauses game loop
- animFrameId: requestAnimationFrame ID
- menuMode: true when on main menu

Key functions (always available):
- updateHUD(): refresh all HUD elements
- showMsg(title, body, callback): show modal dialog
- loseLife(restartFn): remove a life, restart
- persist(): save to localStorage
- goMenu(): return to main menu
- stopGame(): cancel animation loop
- drawPlayerSkin(ctx, x, y, size): draw player sprite
"""

# ═══════════════════════════════════════════════════════════════════════════════
# INTEGRATION GUIDES
# ═══════════════════════════════════════════════════════════════════════════════

INDEX_HTML_INTEGRATION = '''
To add a new planet to index.html (MUST add all 4 module files):

Add these lines BEFORE </body>, in this exact order:

<!-- Planet {N} (modular) -->
<script src="js/p{N}-data.js?v=3"></script>
<script src="js/p{N}-logic.js?v=3"></script>
<script src="js/p{N}-draw.js?v=3"></script>
<script src="js/planet{N}.js?v=3"></script>

Order matters: data -> logic -> draw -> orchestrator
'''

MENU_INTEGRATION = '''
To add a new planet to menu.js:

1. Find the planet buttons section (look for "drawPlanetBtn")
2. Add a new button:
   drawPlanetBtn(ctx, col, row, '{N}', '{EMOJI}', '{NAME}', save.planetsCleared.includes({N-1}));

3. Add click handler in the canvas.onclick section:
   if(/* button N clicked */) { stopGame(); launchP{N}(); }
'''

VALIDATOR_INTEGRATION = '''
To add new files to validate.js:

Find the FILES array and add the new module files:
const FILES=[..., 'js/p{N}-data.js', 'js/p{N}-logic.js', 'js/p{N}-draw.js', 'js/planet{N}.js', ...];
'''

# ═══════════════════════════════════════════════════════════════════════════════
# TILE TYPES
# ═══════════════════════════════════════════════════════════════════════════════

TILE_TYPES = """
Common tile types:
0 = walkable ground
1 = wall/obstacle
2 = special terrain (water, deep trench, ice)
3 = special terrain (coral, ice, etc.)

Resources: {type:'fuel'|'rock'|'plant'|'crystal', x, y, collected:false}
Enemies: {x, y, hp, maxHp, speed, type, aggro:false, ...}
"""

# ═══════════════════════════════════════════════════════════════════════════════
# COMPILE INTO FULL KNOWLEDGE BLOCK
# ═══════════════════════════════════════════════════════════════════════════════

FULL_KNOWLEDGE = f"""
## CODEBASE KNOWLEDGE (pre-loaded - no need to read files)

{FILE_STRUCTURE}

{MODULE_FUNCTION_MAPS}

{SHARED_STATE_PATTERN}

{GLOBAL_VARIABLES}

{TILE_TYPES}

### ORCHESTRATOR TEMPLATE (planetX.js)
{ORCHESTRATOR_TEMPLATE}

### DATA MODULE TEMPLATE (pX-data.js)
{DATA_MODULE_TEMPLATE}

### LOGIC MODULE TEMPLATE (pX-logic.js)
{LOGIC_MODULE_TEMPLATE}

### DRAW MODULE TEMPLATE (pX-draw.js)
{DRAW_MODULE_TEMPLATE}

### INDEX.HTML INTEGRATION
{INDEX_HTML_INTEGRATION}

### MENU INTEGRATION
{MENU_INTEGRATION}

### VALIDATOR INTEGRATION
{VALIDATOR_INTEGRATION}

## IMPORTANT EFFICIENCY RULES
- You already know the codebase patterns above
- Only read a file if you need specific details not in this knowledge
- When creating/editing planets, use the templates directly
- Write the file IMMEDIATELY after understanding the task
- For surgical edits: identify the correct module file first (data/logic/draw)
"""
