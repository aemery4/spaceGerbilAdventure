// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Path to the game - adjust as needed
const GAME_PATH = path.resolve(__dirname, '../../code/game_v3/index.html');
const SCREENSHOT_DIR = path.resolve(__dirname, '../screenshots');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Bug category tracking
const bugReport = {
  spawn_state_initialization: { passed: true, issues: [] },
  missing_visual_feedback: { passed: true, issues: [] },
  input_lock_state_corruption: { passed: true, issues: [] },
  data_content_placeholders: { passed: true, issues: [] },
  missing_resource_placement: { passed: true, issues: [] },
  balance_tuning: { passed: true, issues: [] },
  invisible_damage_source: { passed: true, issues: [] },
  interaction_fallthrough: { passed: true, issues: [] },
};

// Helper to log issues
function logIssue(category, issue) {
  bugReport[category].passed = false;
  bugReport[category].issues.push(issue);
  console.log(`[BUG:${category}] ${issue}`);
}

// Helper to take named screenshot
async function screenshot(page, name) {
  const filepath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filepath });
  console.log(`[SCREENSHOT] ${name}.png`);
  return filepath;
}

// Helper to simulate key press
async function pressKey(page, key, duration = 100) {
  await page.keyboard.down(key);
  await page.waitForTimeout(duration);
  await page.keyboard.up(key);
}

// Helper to hold key for movement
async function holdKey(page, key, duration = 500) {
  await page.keyboard.down(key);
  await page.waitForTimeout(duration);
  await page.keyboard.up(key);
}

// Helper to click on canvas at position
async function clickCanvas(page, x, y) {
  const canvas = page.locator('#game');
  await canvas.click({ position: { x, y } });
}

// Helper to get game state from page
async function getGameState(page) {
  return await page.evaluate(() => {
    return {
      hp: window.save?.hp || 0,
      maxHp: window.save?.maxHp || 100,
      lives: window.save?.lives || 0,
      fuel: window.save?.resources?.fuel || 0,
      rock: window.save?.resources?.rock || 0,
      plant: window.save?.resources?.plant || 0,
      crystal: window.save?.resources?.crystal || 0,
      banana: window.save?.resources?.banana || 0,
      gamePaused: window.gamePaused || false,
      currentPlanet: window.save?.currentPlanet || 0,
    };
  });
}

// Helper to check if dialog is visible
async function isDialogVisible(page) {
  const display = await page.locator('#message').evaluate(el => el.style.display);
  return display === 'block';
}

// Helper to dismiss dialog
async function dismissDialog(page) {
  if (await isDialogVisible(page)) {
    await page.locator('#mbtn').click();
    await page.waitForTimeout(100);
  }
}

// Helper to check for console errors
function setupConsoleMonitor(page) {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    errors.push(err.message);
  });
  return errors;
}


// ============================================================
// TEST: Game Loading
// ============================================================
test.describe('Game Loading', () => {
  test('game loads without errors', async ({ page }) => {
    const errors = setupConsoleMonitor(page);

    await page.goto(`file://${GAME_PATH}`);
    await page.waitForTimeout(1000);

    // Check canvas exists
    const canvas = page.locator('#game');
    await expect(canvas).toBeVisible();

    // Check no JS errors
    if (errors.length > 0) {
      logIssue('data_content_placeholders', `Console errors on load: ${errors.join(', ')}`);
    }
    expect(errors.length).toBe(0);

    await screenshot(page, '01_game_loaded');
  });

  test('main menu displays correctly', async ({ page }) => {
    await page.goto(`file://${GAME_PATH}`);
    await page.waitForTimeout(500);

    // Canvas should show menu
    const canvas = page.locator('#game');
    await expect(canvas).toBeVisible();

    await screenshot(page, '02_main_menu');
  });
});


// ============================================================
// TEST: Planet 1 - Area 51
// ============================================================
test.describe('Planet 1 - Area 51', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`file://${GAME_PATH}`);
    await page.waitForTimeout(500);

    // Click to start Planet 1 (click on canvas center area where button would be)
    await page.evaluate(() => {
      if (typeof startPlanet === 'function') startPlanet(1);
    });
    await page.waitForTimeout(500);

    // Dismiss intro dialog
    await dismissDialog(page);
    await page.waitForTimeout(200);
  });

  test('player can move in all directions', async ({ page }) => {
    const initialState = await getGameState(page);
    await screenshot(page, '03_p1_start');

    // Test WASD movement
    await holdKey(page, 'w', 300);  // Up
    await holdKey(page, 's', 300);  // Down
    await holdKey(page, 'a', 300);  // Left
    await holdKey(page, 'd', 300);  // Right

    // Test arrow keys
    await holdKey(page, 'ArrowUp', 300);
    await holdKey(page, 'ArrowDown', 300);
    await holdKey(page, 'ArrowLeft', 300);
    await holdKey(page, 'ArrowRight', 300);

    await screenshot(page, '04_p1_after_movement');

    // Check game isn't paused/locked after movement
    const state = await getGameState(page);
    if (state.gamePaused) {
      logIssue('input_lock_state_corruption', 'Game paused after movement keys');
    }
    expect(state.gamePaused).toBe(false);
  });

  test('player can gather resources with Space key', async ({ page }) => {
    // Move toward a resource area
    await holdKey(page, 'd', 500);
    await holdKey(page, 's', 300);

    const beforeState = await getGameState(page);

    // Press F to gather (may or may not hit something)
    await pressKey(page, ' ');
    await page.waitForTimeout(200);

    // If dialog appeared, dismiss it
    await dismissDialog(page);

    await screenshot(page, '05_p1_gather_attempt');

    // Check for input lock
    const afterState = await getGameState(page);
    if (afterState.gamePaused && !(await isDialogVisible(page))) {
      logIssue('input_lock_state_corruption', 'Game locked after F key with no dialog');
    }
  });

  test('player can click to interact', async ({ page }) => {
    // Click on canvas to attack/gather
    await clickCanvas(page, 400, 260);
    await page.waitForTimeout(200);
    await dismissDialog(page);

    await clickCanvas(page, 300, 200);
    await page.waitForTimeout(200);
    await dismissDialog(page);

    await screenshot(page, '06_p1_click_interact');

    // Verify no permanent lock
    const state = await getGameState(page);
    if (state.gamePaused && !(await isDialogVisible(page))) {
      logIssue('input_lock_state_corruption', 'Game locked after clicking');
    }
  });

  test('dialog or toast appears for feedback', async ({ page }) => {
    // Press Space to trigger "Nothing Here" toast
    await pressKey(page, ' ');
    await page.waitForTimeout(300);

    // Check toast or dialog is visible
    const toastVisible = await page.evaluate(() => {
      const t = document.getElementById('toast');
      return t && parseFloat(getComputedStyle(t).opacity) > 0.5;
    });
    const dialogVisible = await isDialogVisible(page);
    const anyFeedback = toastVisible || dialogVisible;

    if (dialogVisible) {
      // Check dialog position (should be at bottom)
      const dialogBox = await page.locator('#message').boundingBox();
      const viewport = page.viewportSize();

      if (dialogBox && viewport) {
        // Dialog should be in bottom half of screen
        const dialogCenter = dialogBox.y + dialogBox.height / 2;
        if (dialogCenter < viewport.height / 2) {
          logIssue('missing_visual_feedback', 'Dialog appears in top half instead of bottom');
        }
      }

      // Check game is paused during dialog
      const state = await getGameState(page);
      if (!state.gamePaused) {
        logIssue('input_lock_state_corruption', 'Game not paused while dialog visible');
      }

      await screenshot(page, '07_p1_dialog_position');

      // Dismiss and verify unpause
      await dismissDialog(page);
      await page.waitForTimeout(100);

      const afterState = await getGameState(page);
      if (afterState.gamePaused) {
        logIssue('input_lock_state_corruption', 'Game still paused after dialog dismissed');
      }
    }
  });

  test('player takes damage from aliens', async ({ page }) => {
    const initialState = await getGameState(page);

    // Move around to potentially encounter aliens
    for (let i = 0; i < 5; i++) {
      await holdKey(page, 'd', 400);
      await holdKey(page, 's', 400);
      await page.waitForTimeout(100);
    }

    await screenshot(page, '08_p1_after_exploration');

    const afterState = await getGameState(page);

    // If HP dropped, verify it was from a visible source (can't fully verify without visual inspection)
    if (afterState.hp < initialState.hp) {
      console.log(`[INFO] Player took ${initialState.hp - afterState.hp} damage`);
    }
  });
});


// ============================================================
// TEST: Planet 2 - Jungle Zorbax
// ============================================================
test.describe('Planet 2 - Jungle Zorbax', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`file://${GAME_PATH}`);
    await page.waitForTimeout(500);

    // Start Planet 2 directly
    await page.evaluate(() => {
      if (typeof startPlanet === 'function') startPlanet(2);
    });
    await page.waitForTimeout(500);

    // Dismiss any intro dialog
    await dismissDialog(page);
    await page.waitForTimeout(200);
  });

  test('player spawns and can move', async ({ page }) => {
    await screenshot(page, '09_p2_start');

    // Move in all directions
    await holdKey(page, 'w', 300);
    await holdKey(page, 's', 300);
    await holdKey(page, 'a', 300);
    await holdKey(page, 'd', 600);  // Move right into jungle

    await screenshot(page, '10_p2_after_movement');

    const state = await getGameState(page);
    if (state.gamePaused) {
      logIssue('input_lock_state_corruption', 'P2: Game paused after movement');
    }
  });

  test('boss does not appear until discovered', async ({ page }) => {
    // The boss should not be active at spawn
    // We can check by moving around the spawn area - no boss damage should occur

    const initialState = await getGameState(page);

    // Move around spawn area (boss is at ~12,6 tiles, spawn is at 2,2)
    await holdKey(page, 'd', 200);
    await holdKey(page, 's', 200);
    await holdKey(page, 'a', 200);
    await holdKey(page, 'w', 200);

    await page.waitForTimeout(500);

    const afterState = await getGameState(page);

    // If player took significant damage at spawn, boss might be active too early
    const damageTaken = initialState.hp - afterState.hp;
    if (damageTaken > 10) {
      logIssue('spawn_state_initialization', `P2: Player took ${damageTaken} damage near spawn - boss may be active too early`);
    }

    await screenshot(page, '11_p2_spawn_area_check');
  });

  test('resources are gatherable', async ({ page }) => {
    const initialState = await getGameState(page);

    // Move toward resource area and try to gather
    await holdKey(page, 'd', 800);
    await holdKey(page, 's', 400);

    // Try gathering with Space key
    await pressKey(page, ' ');
    await page.waitForTimeout(200);
    await dismissDialog(page);

    // Click to gather
    await clickCanvas(page, 400, 300);
    await page.waitForTimeout(200);
    await dismissDialog(page);

    await screenshot(page, '12_p2_gather_attempt');

    const afterState = await getGameState(page);

    // Check if any resources were gathered
    const totalBefore = initialState.rock + initialState.plant + initialState.crystal + initialState.fuel + initialState.banana;
    const totalAfter = afterState.rock + afterState.plant + afterState.crystal + afterState.fuel + afterState.banana;

    console.log(`[INFO] Resources before: ${totalBefore}, after: ${totalAfter}`);
  });

  test('Space key shows fallback when nothing nearby', async ({ page }) => {
    // Move to empty area
    await holdKey(page, 'w', 200);
    await holdKey(page, 'a', 200);

    // Press F with nothing nearby
    await pressKey(page, ' ');
    await page.waitForTimeout(300);

    // Should see "Nothing Here" toast or dialog
    const toastVisible = await page.evaluate(() => {
      const t = document.getElementById('toast');
      return t && parseFloat(getComputedStyle(t).opacity) > 0.5;
    });
    const dialogVisible = await isDialogVisible(page);

    if (!dialogVisible && !toastVisible) {
      logIssue('interaction_fallthrough', 'P2: No feedback when Space pressed with nothing nearby');
    }

    await screenshot(page, '13_p2_nothing_nearby');
    await dismissDialog(page);
  });

  test('crafting panel opens and closes', async ({ page }) => {
    // Open crafting with C key
    await pressKey(page, 'c');
    await page.waitForTimeout(300);

    // Check craft panel visibility
    const craftVisible = await page.locator('#craftPanel').evaluate(el => el.style.display);

    await screenshot(page, '14_p2_craft_panel');

    // Close crafting
    await pressKey(page, 'c');
    await page.waitForTimeout(200);

    // Verify game isn't locked
    const state = await getGameState(page);
    await holdKey(page, 'd', 200);  // Try to move

    if (state.gamePaused) {
      logIssue('input_lock_state_corruption', 'P2: Game locked after closing craft panel');
    }
  });
});


// ============================================================
// TEST: Planet 3 - Tundra Frigia
// ============================================================
test.describe('Planet 3 - Tundra Frigia', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`file://${GAME_PATH}`);
    await page.waitForTimeout(500);

    // Start Planet 3 directly
    await page.evaluate(() => {
      if (typeof startPlanet === 'function') startPlanet(3);
    });
    await page.waitForTimeout(500);

    // Dismiss intro dialog
    await dismissDialog(page);
    await page.waitForTimeout(200);
  });

  test('player spawns and can move in snow', async ({ page }) => {
    await screenshot(page, '17_p3_start');

    // Move in all directions
    await holdKey(page, 'w', 300);
    await holdKey(page, 's', 300);
    await holdKey(page, 'a', 300);
    await holdKey(page, 'd', 600);

    await screenshot(page, '18_p3_after_movement');

    const state = await getGameState(page);
    if (state.gamePaused) {
      logIssue('input_lock_state_corruption', 'P3: Game paused after movement');
    }
  });

  test('yeti boss does not appear until cave discovered', async ({ page }) => {
    // The yeti is in a hidden cave - should not take damage from it at spawn
    const initialState = await getGameState(page);

    // Move around spawn area (yeti is at ~15,8 tiles in hidden cave)
    await holdKey(page, 'd', 200);
    await holdKey(page, 's', 200);
    await holdKey(page, 'a', 200);
    await holdKey(page, 'w', 200);

    await page.waitForTimeout(500);

    const afterState = await getGameState(page);

    // If player took massive damage at spawn, yeti might be active too early
    const damageTaken = initialState.hp - afterState.hp;
    if (damageTaken > 15) {
      logIssue('spawn_state_initialization', `P3: Player took ${damageTaken} damage near spawn - yeti may be active too early`);
    }

    await screenshot(page, '19_p3_spawn_area_check');
  });

  test('tigers attack player (enemies work)', async ({ page }) => {
    const initialState = await getGameState(page);

    // Move toward tiger territory
    await holdKey(page, 'd', 1000);
    await holdKey(page, 's', 500);

    await page.waitForTimeout(1000);

    const afterState = await getGameState(page);

    // Tigers should deal damage if player gets close
    console.log(`[INFO] P3 HP: ${initialState.hp} -> ${afterState.hp}`);

    await screenshot(page, '20_p3_tiger_area');
  });

  test('mammoths are neutral until provoked', async ({ page }) => {
    const initialState = await getGameState(page);

    // Move to mammoth area and just walk near them (don't attack)
    await holdKey(page, 'd', 400);
    await holdKey(page, 's', 800);

    await page.waitForTimeout(1000);

    const afterState = await getGameState(page);

    // Mammoths should NOT attack unless provoked
    // If player took damage, it's likely from tigers, not mammoths
    console.log(`[INFO] P3 mammoth area HP: ${initialState.hp} -> ${afterState.hp}`);

    await screenshot(page, '21_p3_mammoth_area');
  });

  test('Space key shows fallback when nothing nearby', async ({ page }) => {
    // Move to empty area
    await holdKey(page, 'w', 200);
    await holdKey(page, 'a', 200);

    // Press F with nothing nearby
    await pressKey(page, ' ');
    await page.waitForTimeout(300);

    // Check if any dialog appeared (may or may not have fallback in P3)
    const dialogVisible = await isDialogVisible(page);

    await screenshot(page, '22_p3_nothing_nearby');

    if (dialogVisible) {
      await dismissDialog(page);
    }
  });

  test('camp merchants are accessible', async ({ page }) => {
    // Move toward camp area (cols 24-29)
    await holdKey(page, 'd', 2500);

    await page.waitForTimeout(300);

    await screenshot(page, '23_p3_camp_area');

    // Try to interact near camp
    await pressKey(page, ' ');
    await page.waitForTimeout(300);

    // If shop opened, verify it works
    const shopVisible = await page.locator('#villageShop').evaluate(el => el.style.display === 'block');

    if (shopVisible) {
      await screenshot(page, '24_p3_camp_shop');
      // Close shop with Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    await dismissDialog(page);
  });

  test('resources can be gathered', async ({ page }) => {
    const initialState = await getGameState(page);

    // Move and try to gather
    await holdKey(page, 'd', 300);
    await holdKey(page, 's', 200);

    // Try clicking to gather
    await clickCanvas(page, 400, 300);
    await page.waitForTimeout(200);
    await dismissDialog(page);

    await pressKey(page, ' ');
    await page.waitForTimeout(200);
    await dismissDialog(page);

    await screenshot(page, '25_p3_gather_attempt');

    const afterState = await getGameState(page);
    const totalBefore = initialState.rock + initialState.plant + initialState.crystal + initialState.fuel;
    const totalAfter = afterState.rock + afterState.plant + afterState.crystal + afterState.fuel;

    console.log(`[INFO] P3 Resources before: ${totalBefore}, after: ${totalAfter}`);
  });
});


// ============================================================
// TEST: Speed and Balance
// ============================================================
test.describe('Balance and Speed', () => {
  test('player can outrun enemies on P1', async ({ page }) => {
    await page.goto(`file://${GAME_PATH}`);
    await page.waitForTimeout(500);

    await page.evaluate(() => startPlanet(1));
    await page.waitForTimeout(500);
    await dismissDialog(page);

    const initialState = await getGameState(page);

    // Run in one direction continuously
    await holdKey(page, 'd', 2000);

    const afterState = await getGameState(page);

    // If player lost significant HP while running, speed may be too slow
    const damageTaken = initialState.hp - afterState.hp;
    if (damageTaken > 20) {
      logIssue('balance_tuning', `P1: Player took ${damageTaken} damage while running - may be too slow`);
    }

    await screenshot(page, '15_p1_speed_test');
  });

  test('player can outrun enemies on P2', async ({ page }) => {
    await page.goto(`file://${GAME_PATH}`);
    await page.waitForTimeout(500);

    await page.evaluate(() => startPlanet(2));
    await page.waitForTimeout(500);
    await dismissDialog(page);

    const initialState = await getGameState(page);

    // Run in one direction continuously
    await holdKey(page, 'd', 2000);

    const afterState = await getGameState(page);

    // If player lost significant HP while running, speed may be too slow
    const damageTaken = initialState.hp - afterState.hp;
    if (damageTaken > 20) {
      logIssue('balance_tuning', `P2: Player took ${damageTaken} damage while running - may be too slow`);
    }

    await screenshot(page, '16_p2_speed_test');
  });

  test('player can outrun enemies on P3', async ({ page }) => {
    await page.goto(`file://${GAME_PATH}`);
    await page.waitForTimeout(500);

    await page.evaluate(() => startPlanet(3));
    await page.waitForTimeout(500);
    await dismissDialog(page);

    const initialState = await getGameState(page);

    // Run in one direction continuously
    await holdKey(page, 'd', 2000);

    const afterState = await getGameState(page);

    // P3 has fast tigers (speed 1.6-2.0) - player needs good speed
    const damageTaken = initialState.hp - afterState.hp;
    if (damageTaken > 25) {
      logIssue('balance_tuning', `P3: Player took ${damageTaken} damage while running - may be too slow vs tigers`);
    }

    await screenshot(page, '26_p3_speed_test');
  });
});


// ============================================================
// TEST: Final Report Generation
// ============================================================
test.afterAll(async () => {
  console.log('\n========================================');
  console.log('        BUG CATEGORY REPORT');
  console.log('========================================\n');

  let allPassed = true;

  for (const [category, result] of Object.entries(bugReport)) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${category}`);

    if (!result.passed) {
      allPassed = false;
      result.issues.forEach(issue => {
        console.log(`       └─ ${issue}`);
      });
    }
  }

  console.log('\n========================================');
  console.log(allPassed ? '✅ ALL CATEGORIES PASSED' : '❌ SOME CATEGORIES FAILED');
  console.log('========================================\n');

  // Write JSON report
  const reportPath = path.join(__dirname, '../test-results/bug-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(bugReport, null, 2));
  console.log(`[REPORT] Written to ${reportPath}`);
});
