"""
Pre-loaded codebase knowledge for Space Gerbil Adventure.

This eliminates the need for agents to read files repeatedly.
Include this in agent system prompts to reduce API calls.
"""

PLANET_FILE_TEMPLATE = '''
// ════════════════════════════════════════
// js/planet{N}.js  — launchP{N}()
// {PLANET_NAME} — {GOAL_DESCRIPTION}
// ════════════════════════════════════════

function launchP{N}() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const TILE = 26, COLS = 48, ROWS = 28;

  // ── Build game data ───────────────────────────────────────
  // Define map tiles, resources, enemies, NPCs here
  const map = [];  // 2D array of tile types
  const resources = [];  // {type:'fuel'|'rock'|'plant'|'crystal', x, y, collected:false}
  const enemies = [];  // {x, y, hp, maxHp, speed, type, ...}

  // ── Player ───────────────────────────────────────────────
  const player = {
    x: 2*TILE+13, y: 2*TILE+13, size: 13,
    speed: save.items.includes('boots')?5:3,
    keys: {}, invincible: 0,
  };
  const cam = { x:0, y:0 };

  // ── State variables ─────────────────────────────────────
  let particles = [];
  let activeWeapon = save.items.find(i=>i.startsWith('w:'))?.slice(2) || null;
  let weaponCooldown = 0;

  // ── Merchants (optional) ────────────────────────────────
  const MERCHANTS = [
    {
      id:'merchant1', name:'Merchant Name', emoji:'🛒', color:'#888',
      x:10*TILE+13, y:10*TILE+13,
      dialog:'Welcome, traveler!',
      shop:[
        {id:'item1', name:'Item', emoji:'🎁', desc:'Description',
         cost:{rock:3}, effect:()=>{/* effect code */}},
      ]
    },
  ];

  // ── Input handlers ──────────────────────────────────────
  function handleKeyDown(e){ if(!gamePaused) player.keys[e.key.toLowerCase()]=true; }
  function handleKeyUp(e){ player.keys[e.key.toLowerCase()]=false; }
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  canvas.onclick = function(e) {
    if(gamePaused) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left + cam.x;
    const my = e.clientY - rect.top + cam.y;
    // Handle clicks: resource gathering, combat, NPC interaction
  };

  // ── Main game loop ──────────────────────────────────────
  function loop() {
    if(gamePaused){ animFrameId = requestAnimationFrame(loop); return; }

    // 1. Update player position
    // 2. Update camera
    // 3. Update enemies
    // 4. Check collisions
    // 5. Draw everything

    animFrameId = requestAnimationFrame(loop);
  }

  // ── Cleanup function ────────────────────────────────────
  function cleanup() {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    canvas.onclick = null;
  }

  // ── Show intro message and start ────────────────────────
  showMsg('🌍 {PLANET_NAME}', '{INTRO_MESSAGE}', ()=>{ gamePaused=false; });
  gamePaused = true;
  loop();
}
'''

MENU_INTEGRATION = '''
To add a new planet to menu.js:

1. Find the planet buttons section (look for "drawPlanetBtn")
2. Add a new button:
   drawPlanetBtn(ctx, col, row, '{N}', '{EMOJI}', '{NAME}', save.planetsCleared.includes({N-1}));

3. Add click handler in the canvas.onclick section:
   if(/* button N clicked */) { stopGame(); launchP{N}(); }
'''

INDEX_HTML_INTEGRATION = '''
To add planet{N}.js to index.html:

Add this line BEFORE </body>:
<script src="js/planet{N}.js"></script>

Must be AFTER globals.js, save.js, hud.js but BEFORE the closing </body> tag.
'''

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

TILE_TYPES = """
Common tile types:
0 = walkable ground
1 = wall/obstacle
2 = water (may slow/damage)
3 = special (ice, lava, etc.)

Resources: {type:'fuel'|'rock'|'plant'|'crystal', x, y, collected:false}
Enemies: {x, y, hp, maxHp, speed, type, aggro:false, ...}
"""

FILE_STRUCTURE = """
Game files (in code/game_v3/js/):
- globals.js: Save data, global flags (rarely edit)
- save.js: persist(), loadSave() (rarely edit)
- hud.js: updateHUD(), showMsg(), RECIPES (edit for HUD/recipes)
- craft.js: Crafting panel (edit for crafting)
- menu.js: Main menu, planet select (edit to add planets)
- skins.js: ALL_SKINS, wardrobe (edit for skins)
- planet1.js: Earth/Area 51 level
- planet2.js: Jungle Planet Zorbax
- planet3.js: Tundra Frigia

Canvas: 800x520px, ID='game'
"""

# Compile into a single knowledge block for the system prompt
FULL_KNOWLEDGE = f"""
## CODEBASE KNOWLEDGE (pre-loaded - no need to read files)

{FILE_STRUCTURE}

{GLOBAL_VARIABLES}

{TILE_TYPES}

### PLANET FILE TEMPLATE
When creating a new planet, follow this structure:
{PLANET_FILE_TEMPLATE}

### MENU INTEGRATION
{MENU_INTEGRATION}

### INDEX.HTML INTEGRATION
{INDEX_HTML_INTEGRATION}

## IMPORTANT EFFICIENCY RULES
- You already know the codebase patterns above
- Only read a file if you need specific details not in this knowledge
- When creating a new planet, use the template directly - don't read planet3.js
- Write the file IMMEDIATELY after understanding the task
"""
