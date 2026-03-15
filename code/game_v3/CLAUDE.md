# Space Gerbil Adventure — Claude Context File
# Paste this at the start of every Claude conversation!

## About the game
Space Gerbil Adventure is a 2D canvas game built in plain JavaScript.
A space gerbil travels between planets collecting fuel and defeating enemies.

## File structure — ONLY edit the file that needs changing!

| File | What's inside | When to edit |
|------|--------------|--------------|
| `js/globals.js` | Save data shape, lives, gamePaused flag | Almost never |
| `js/save.js` | persist() and loadSave() | Almost never |
| `js/hud.js` | updateHUD(), showMsg(), loseLife(), RECIPES list | Adding HUD elements or recipes |
| `js/craft.js` | toggleCraft(), renderCraft(), crafting panel | Adding/changing crafting items |
| `js/menu.js` | Main menu, planet select, transitions | Changing menus or adding a planet slot |
| `js/planet1.js` | launchP1() — Earth/Area 51 level | Changing Planet 1 |
| `js/planet2.js` | launchP2() — Jungle Planet Zorbax | Changing Planet 2 |
| `js/skins.js` | ALL_SKINS array, wardrobe screen | Adding new player skins |
| `js/planet3.js` | launchP3() — (not created yet!) | When adding Planet 3 |

## Key global variables (shared across all files)
- `save` — the save object: `{ hp, maxHp, lives, resources:{rock,plant,crystal,banana,fuel}, items:[], planetsCleared:[], skin }`
- `gamePaused` — boolean, pauses the game loop
- `animFrameId` — the requestAnimationFrame id
- `menuMode` — true when on the main menu canvas

## Key global functions (usable from any file)
- `updateHUD()` — refreshes all HUD display elements
- `showMsg(title, body, callback)` — shows a modal message
- `loseLife(restartFn)` — removes a life and restarts
- `persist()` — saves game to localStorage
- `goMenu()` — returns to main menu
- `stopGame()` — cancels the animation loop
- `drawPlayerSkin(ctx, x, y, size)` — draws the player at any position

## Important rules when editing
1. Each planet's logic lives entirely inside its `launchPX()` function — variables inside are local
2. Never use `var` — use `const` or `let`
3. Declare variables BEFORE the `function loop()` call inside a planet function
4. The canvas is always `document.getElementById('game')`, 800×520px
5. When adding Planet 3: create `js/planet3.js`, add `<script src="js/planet3.js"></script>` to `index.html` BEFORE `</body>`, and add a button in `js/menu.js`

## Current planet status
- Planet 1 ✅ Earth / Area 51 — collect 10 fuel, defeat aliens, launch rocket
- Planet 2 ✅ Jungle Planet Zorbax — 48×28 map, village merchants, Jungle King boss, collect 15 fuel
- Planet 3 ❌ Not built yet

---

## MANDATORY: Run validate.js after every change

After making ANY code change, always instruct the user to run:
```
node validate.js
```
from the game_modules folder before opening the browser.

This catches:
- Syntax errors in individual files
- Duplicate variable declarations across files (the most common black-screen cause)
- Missing HTML element IDs

If validate.js reports errors → fix them first. Never ask the user to test in the browser until validate.js passes.

For Claude sessions: run the validator mentally by checking:
1. No `let`/`const` at the top of any p2-*.js file that duplicates a name already in p2-data.js globals
2. No variable declared with `let`/`const` inside p2InitData() — use bare assignment only
3. Any new variable shared across p2-* files must be added to the globals block at the top of p2-data.js
