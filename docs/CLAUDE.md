# Space Gerbil Adventure — Claude Context File
# Paste this at the start of every Claude conversation!

## About the game
Space Gerbil Adventure is a 2D canvas game built in plain JavaScript.
A space gerbil travels between planets collecting fuel and defeating enemies.

## Modular Architecture

ALL planets use the modular pattern:
- `pX-data.js` — `buildPXData(TILE, COLS, ROWS)` returns {map, resources, enemies, ...}
- `pX-logic.js` — `pXInitData(state)`, `updatePX()`, action handlers
- `pX-draw.js` — `drawPX(ctx)`, helper draw functions
- `planetX.js` — `launchPX()` orchestrator ties modules together

## File structure — ONLY edit the file that needs changing!

### Core (rarely edit)
| File | What's inside |
|------|--------------|
| `js/globals.js` | Save data shape, gamePaused flag |
| `js/save.js` | persist() and loadSave() |
| `js/hud.js` | updateHUD(), showMsg(), RECIPES |
| `js/craft.js` | Crafting panel |

### Planet 1 - Earth/Area 51
| File | What's inside |
|------|--------------|
| `js/p1-data.js` | buildP1Data() → {map, rocket, resources, aliens} |
| `js/p1-logic.js` | p1InitData(), updateP1(), doP1Action() |
| `js/p1-draw.js` | drawP1(), map/entity rendering |
| `js/planet1.js` | launchP1() orchestrator |

### Planet 2 - Jungle Zorbax
| File | What's inside |
|------|--------------|
| `js/p2-data.js` | buildP2Data() → {map, resources, enemies, merchants, chests} |
| `js/p2-logic.js` | p2InitData(), updateP2(), all AI functions |
| `js/p2-draw.js` | drawP2(), village elements |
| `js/planet2.js` | launchP2() orchestrator + shop functions |

### Planet 3 - Tundra Frigia
| File | What's inside |
|------|--------------|
| `js/p3-data.js` | buildP3Data() → {map, resources, enemies, merchants} |
| `js/p3-logic.js` | p3InitData(), updateP3(), tiger/mammoth AI |
| `js/p3-draw.js` | drawP3(), ice effects |
| `js/planet3.js` | launchP3() orchestrator |

### Planet 4 - Aquatic Neptuna
| File | What's inside |
|------|--------------|
| `js/p4-data.js` | buildP4Data() → {map, resources, enemies, SEAHORSES} |
| `js/p4-logic.js` | p4InitData(), updateP4(), octopus boss AI |
| `js/p4-draw.js` | drawP4(), underwater rendering |
| `js/planet4.js` | launchP4() orchestrator |

### Menu & Skins
| File | What's inside |
|------|--------------|
| `js/menu.js` | Main menu, planet select |
| `js/skins.js` | ALL_SKINS, wardrobe |

## Where to Add/Edit Code

| Task | File to edit |
|------|-------------|
| Add new resource/enemy/NPC | `pX-data.js` → buildPXData() |
| Change enemy AI or movement | `pX-logic.js` → updatePX() |
| Add new click interaction | `pX-logic.js` → doPXAction() |
| Change how something looks | `pX-draw.js` → drawPXXXX() |

## Key global variables (shared across all files)
- `save` — `{hp, maxHp, lives, resources:{rock,plant,crystal,banana,fuel}, items:[], planetsCleared:[], skin}`
- `gamePaused` — pauses the game loop
- `animFrameId` — requestAnimationFrame ID
- `menuMode` — true when on main menu

## Key global functions (usable from any file)
- `updateHUD()` — refreshes HUD elements
- `showMsg(title, body, callback)` — shows modal message
- `loseLife(restartFn)` — removes a life
- `persist()` — saves to localStorage
- `goMenu()` — returns to main menu
- `stopGame()` — cancels animation loop
- `drawPlayerSkin(ctx, x, y, size)` — draws player sprite

## Shared State Pattern

Each planet uses a global `pX` object for cross-module state:
```javascript
// In pX-logic.js:
let pX = null;
function pXInitData(state) { pX = state; }

// Access anywhere in pX-*.js files:
pX.player.x, pX.cam.x, pX.map[r][c], pX.enemies, etc.
```

---

## MANDATORY: Run validate.js after every change

```bash
node validate.js
```

This catches:
- Syntax errors in individual files
- Duplicate variable declarations across files
- Missing HTML element IDs

If validate.js reports errors → fix them first!
