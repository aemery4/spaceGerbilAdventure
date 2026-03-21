// ════════════════════════════════════════
// js/p5-logic.js — Planet 5 Logic Layer
// Home Planet — movement, building, shop, minigame
// ════════════════════════════════════════

// ── Shared state ─────────────────────────────────────────
let p5 = null;
function p5InitData(state) { p5 = state; }

// ── Collision ────────────────────────────────────────────
function isSolidP5(px, py) {
  const tx = Math.floor(px / p5.TILE), ty = Math.floor(py / p5.TILE);
  if (tx < 0 || ty < 0 || tx >= p5.COLS || ty >= p5.ROWS) return true;
  const t = p5.map[ty][tx];
  return t === 1 || t === 3 || t === 5;
}

// ── Spawn Alien Visitors ─────────────────────────────────
function spawnP5Aliens() {
  const hasLanding = save.homePlanet.buildings.some(b => b.type === 'landing');
  const count = hasLanding ? 3 : Math.min(1 + Math.floor(save.homePlanet.buildings.length / 2), 3);
  const aliens = [];
  const pool = [...P5_ALIEN_POOL];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const template = pool.splice(idx, 1)[0];
    // Find random walkable tile
    let gx, gy, tries = 0;
    do {
      gx = 2 + Math.floor(Math.random() * (p5.COLS - 4));
      gy = 2 + Math.floor(Math.random() * (p5.ROWS - 4));
      tries++;
    } while (p5.map[gy][gx] !== 0 && p5.map[gy][gx] !== 2 && tries < 50);
    aliens.push({
      ...template,
      x: gx * p5.TILE + p5.TILE / 2,
      y: gy * p5.TILE + p5.TILE / 2,
      dx: (Math.random() - 0.5) * 0.6,
      dy: (Math.random() - 0.5) * 0.6,
    });
  }
  return aliens;
}

// ── Farm Resource Generation ─────────────────────────────
function collectFarmResources() {
  const farms = save.homePlanet.buildings.filter(b => b.type === 'farm');
  if (farms.length === 0) return;
  const types = ['rock', 'plant', 'crystal'];
  let msg = '';
  farms.forEach(() => {
    const t = types[Math.floor(Math.random() * types.length)];
    save.resources[t] = (save.resources[t] || 0) + 1;
    msg += (msg ? ', ' : '') + '+1 ' + t;
  });
  if (msg) {
    updateHUD(); persist();
    showMsg('🌾 Farm Harvest', 'Your farms produced: ' + msg + '!');
  }
}

// ── Shop ─────────────────────────────────────────────────
function openP5Shop() {
  gamePaused = true;
  const panel = document.getElementById('villageShop');
  document.getElementById('shopMerchantName').textContent = '🏪 Home Planet Shop';
  document.getElementById('shopMerchantDialog').textContent = '"Spend your Space Coins on powerful upgrades!"';
  renderP5ShopItems();
  panel.style.display = 'block';
}

function renderP5ShopItems() {
  const grid = document.getElementById('shopGrid');
  grid.innerHTML = '';
  P5_SHOP_ITEMS.forEach(item => {
    const getRes = r => r === 'coins' ? (save.spaceCoins || 0) : (save.resources[r] || 0);
    const canAfford = Object.entries(item.cost).every(([r, a]) => getRes(r) >= a);
    const el = document.createElement('div');
    el.className = 'shop-item' + (!canAfford ? ' shop-disabled' : '');
    const costStr = Object.entries(item.cost).map(([r, a]) => {
      const icons = { coins: '🪙', rock: '🪨', plant: '🌿', crystal: '💎' };
      return `<span class="${getRes(r) >= a ? 'has' : 'lacks'}">${icons[r] || r}×${a}</span>`;
    }).join('');
    el.innerHTML = `<div class="shop-item-name">${item.emoji} ${item.name}</div>
      <div class="shop-item-desc">${item.desc}</div>
      <div class="shop-cost">${costStr}</div>`;
    if (canAfford) {
      el.onclick = () => {
        Object.entries(item.cost).forEach(([r, a]) => { if (r === 'coins') save.spaceCoins -= a; else save.resources[r] -= a; });
        executeP5ShopEffect(item.effect);
        persist(); updateHUD(); renderP5ShopItems();
        el.style.background = 'rgba(80,200,80,0.3)';
      };
    }
    grid.appendChild(el);
  });
}

function executeP5ShopEffect(eff) {
  switch (eff) {
    case 'heal30': save.hp = Math.min(save.maxHp, save.hp + 30); updateHUD(); break;
    case 'life': save.lives = Math.min(save.lives + 1, 9); updateHUD(); break;
    case 'boots': if (!save.items.includes('boots')) save.items.push('boots'); updateHUD(); break;
    case 'charm': save.resources.rock += 3; save.resources.plant += 3; save.resources.crystal += 3; updateHUD(); break;
    case 'mega': save.maxHp += 30; save.hp = Math.min(save.hp + 30, save.maxHp); updateHUD(); break;
    case 'shield': if (!save.items.includes('shield')) save.items.push('shield'); updateHUD(); break;
  }
}

// ── Build Mode ───────────────────────────────────────────
function openBuildMenu(gridX, gridY) {
  gamePaused = true;
  const panel = document.getElementById('villageShop');
  document.getElementById('shopMerchantName').textContent = '🔨 Build Menu';
  document.getElementById('shopMerchantDialog').textContent = '"Choose a building to place here!"';
  const grid = document.getElementById('shopGrid');
  grid.innerHTML = '';

  P5_BUILDINGS.forEach(b => {
    // Check if it fits
    let fits = true;
    for (let dr = 0; dr < b.h; dr++) {
      for (let dc = 0; dc < b.w; dc++) {
        const mr = gridY + dr, mc = gridX + dc;
        if (mr >= p5.ROWS - 1 || mc >= p5.COLS - 1 || p5.map[mr][mc] !== 0) fits = false;
      }
    }
    const canAfford = (save.spaceCoins || 0) >= b.cost;
    const el = document.createElement('div');
    el.className = 'shop-item' + (!canAfford || !fits ? ' shop-disabled' : '');
    const costColor = canAfford ? 'has' : 'lacks';
    el.innerHTML = `<div class="shop-item-name">${b.emoji} ${b.name}</div>
      <div class="shop-item-desc">${b.desc} (${b.w}x${b.h})</div>
      <div class="shop-cost"><span class="${costColor}">🪙×${b.cost}</span>${!fits ? '<span style="color:#f44;margin-left:4px">No room</span>' : ''}</div>`;
    if (canAfford && fits) {
      el.onclick = () => {
        save.spaceCoins -= b.cost;
        save.homePlanet.buildings.push({ type: b.type, gridX: gridX, gridY: gridY });
        // Mark tiles as occupied
        for (let dr = 0; dr < b.h; dr++) {
          for (let dc = 0; dc < b.w; dc++) {
            p5.map[gridY + dr][gridX + dc] = 5;
          }
        }
        persist(); updateHUD();
        document.getElementById('villageShop').style.display = 'none';
        gamePaused = false;
        p5.mode = 'explore';
      };
    }
    grid.appendChild(el);
  });

  // Cancel button
  const cancel = document.createElement('div');
  cancel.className = 'shop-item';
  cancel.innerHTML = '<div class="shop-item-name">❌ Cancel</div><div class="shop-item-desc">Go back to exploring</div>';
  cancel.onclick = () => {
    document.getElementById('villageShop').style.display = 'none';
    gamePaused = false;
    p5.mode = 'explore';
  };
  grid.appendChild(cancel);

  panel.style.display = 'block';
}

// ── Minigame: Rock Paper Scissors ────────────────────────
function startRPSGame() {
  p5.mode = 'minigame';
  p5.rpsPhase = 'choose';
  p5.rpsPlayerWins = 0;
  p5.rpsAlienWins = 0;
  p5.rpsHover = null;
  gamePaused = false; // we handle our own rendering
}

function rpsClick(mx, my) {
  if (p5.rpsPhase === 'choose') {
    let choice = null;
    if (mx > 140 && mx < 260 && my > 160 && my < 300) choice = 'rock';
    if (mx > 340 && mx < 460 && my > 160 && my < 300) choice = 'paper';
    if (mx > 540 && mx < 660 && my > 160 && my < 300) choice = 'scissors';
    if (!choice) return;

    p5.rpsPlayerChoice = choice;
    const opts = ['rock', 'paper', 'scissors'];
    p5.rpsAlienChoice = opts[Math.floor(Math.random() * 3)];

    // Determine winner
    if (p5.rpsPlayerChoice === p5.rpsAlienChoice) p5.rpsRoundResult = 'draw';
    else if ((p5.rpsPlayerChoice === 'rock' && p5.rpsAlienChoice === 'scissors') ||
             (p5.rpsPlayerChoice === 'paper' && p5.rpsAlienChoice === 'rock') ||
             (p5.rpsPlayerChoice === 'scissors' && p5.rpsAlienChoice === 'paper')) {
      p5.rpsRoundResult = 'win'; p5.rpsPlayerWins++;
    } else {
      p5.rpsRoundResult = 'lose'; p5.rpsAlienWins++;
    }
    p5.rpsPhase = 'result';
  } else if (p5.rpsPhase === 'result') {
    if (p5.rpsPlayerWins >= 2 || p5.rpsAlienWins >= 2) {
      p5.rpsPhase = 'gameover';
      if (p5.rpsPlayerWins >= 2) {
        save.spaceCoins = (save.spaceCoins || 0) + 25;
        persist(); updateHUD();
      }
    } else {
      p5.rpsPhase = 'choose';
    }
  } else if (p5.rpsPhase === 'gameover') {
    p5.mode = 'explore';
    gamePaused = false;
  }
}

function rpsMouseMove(mx, my) {
  if (p5.mode !== 'minigame' || p5.rpsPhase !== 'choose') { p5.rpsHover = null; return; }
  if (mx > 140 && mx < 260 && my > 160 && my < 300) p5.rpsHover = 'rock';
  else if (mx > 340 && mx < 460 && my > 160 && my < 300) p5.rpsHover = 'paper';
  else if (mx > 540 && mx < 660 && my > 160 && my < 300) p5.rpsHover = 'scissors';
  else p5.rpsHover = null;
}

// ── Action Handler ───────────────────────────────────────
function doP5Action(mx, my) {
  if (gamePaused) return;

  if (p5.mode === 'minigame') { rpsClick(mx, my); return; }

  if (p5.mode === 'build') {
    const gx = Math.floor(mx / p5.TILE), gy = Math.floor(my / p5.TILE);
    if (gx > 0 && gx < p5.COLS - 1 && gy > 0 && gy < p5.ROWS - 1 && p5.map[gy][gx] === 0) {
      openBuildMenu(gx, gy);
    }
    return;
  }

  // Check alien interaction
  for (let a of p5.aliens) {
    if (Math.hypot(mx - a.x, my - a.y) < 25 && Math.hypot(p5.player.x - a.x, p5.player.y - a.y) < p5.TILE * 2.5) {
      if (a.minigame) {
        showMsg(`${a.emoji} ${a.name}`, a.dialog + '\n\nBest of 3 — win 25 🪙!', () => { gamePaused = false; startRPSGame(); });
        return;
      }
      if (a.trade) {
        const t = a.trade;
        const has = (save.resources[t.give] || 0) >= t.giveAmt;
        const icons = { rock: '🪨', plant: '🌿', crystal: '💎', banana: '🍌', coins: '🪙' };
        showMsg(`${a.emoji} ${a.name}`, a.dialog + `\n\nTrade: ${t.giveAmt} ${icons[t.give]} → ${t.rewardAmt} ${icons[t.reward]}`,
          has ? () => {
            save.resources[t.give] -= t.giveAmt;
            if (t.reward === 'coins') save.spaceCoins = (save.spaceCoins || 0) + t.rewardAmt;
            else save.resources[t.reward] = (save.resources[t.reward] || 0) + t.rewardAmt;
            persist(); updateHUD(); gamePaused = false;
            showMsg('✅ Trade Complete!', `You received ${t.rewardAmt} ${icons[t.reward]}!`);
          } : () => { gamePaused = false; },
          has ? 'Trade!' : 'Not enough...');
        return;
      }
      showMsg(`${a.emoji} ${a.name}`, a.dialog);
      return;
    }
  }

  // Check building interaction
  for (let b of save.homePlanet.buildings) {
    const info = P5_BUILDINGS.find(pb => pb.type === b.type);
    if (!info) continue;
    const bx = b.gridX * p5.TILE + info.w * p5.TILE / 2;
    const by = b.gridY * p5.TILE + info.h * p5.TILE / 2;
    if (Math.hypot(mx - bx, my - by) < p5.TILE * 1.5 && Math.hypot(p5.player.x - bx, p5.player.y - by) < p5.TILE * 3) {
      if (b.type === 'shop') { openP5Shop(); return; }
      if (b.type === 'arcade') { startRPSGame(); return; }
      if (b.type === 'hut') {
        save.hp = Math.min(save.maxHp, save.hp + 20);
        updateHUD(); persist();
        showMsg('🏠 Space Hut', 'You rest at home. +20 HP!');
        return;
      }
      if (b.type === 'farm') {
        showMsg('🌾 Star Farm', 'Your farm is growing nicely! Resources are harvested when you arrive.');
        return;
      }
      if (b.type === 'landing') {
        showMsg('🛬 Landing Pad', 'More alien visitors will arrive thanks to the landing pad!');
        return;
      }
      if (b.type === 'fountain') {
        showMsg('⛲ Fountain', 'The water sparkles peacefully. A nice decoration!');
        return;
      }
    }
  }
}

// ── Main Update ──────────────────────────────────────────
function updateP5() {
  if (gamePaused) return;
  if (p5.mode === 'minigame') return; // minigame handles its own state

  // Player movement
  const spd = save.items.includes('boots') ? 4 : 2.5;
  let nx = p5.player.x, ny = p5.player.y;
  const r = p5.player.size;
  if (p5.player.keys['a'] || p5.player.keys['arrowleft']) nx -= spd;
  if (p5.player.keys['d'] || p5.player.keys['arrowright']) nx += spd;
  if (p5.player.keys['w'] || p5.player.keys['arrowup']) ny -= spd;
  if (p5.player.keys['s'] || p5.player.keys['arrowdown']) ny += spd;

  if (!isSolidP5(nx - r, p5.player.y - r) && !isSolidP5(nx + r, p5.player.y - r) &&
      !isSolidP5(nx - r, p5.player.y + r) && !isSolidP5(nx + r, p5.player.y + r)) p5.player.x = nx;
  if (!isSolidP5(p5.player.x - r, ny - r) && !isSolidP5(p5.player.x + r, ny - r) &&
      !isSolidP5(p5.player.x - r, ny + r) && !isSolidP5(p5.player.x + r, ny + r)) p5.player.y = ny;

  // Alien wandering
  p5.aliens.forEach(a => {
    const anx = a.x + a.dx, any = a.y + a.dy;
    const atx = Math.floor(anx / p5.TILE), aty = Math.floor(any / p5.TILE);
    if (atx > 0 && atx < p5.COLS - 1 && aty > 0 && aty < p5.ROWS - 1 &&
        p5.map[aty][atx] !== 1 && p5.map[aty][atx] !== 3) {
      a.x = anx; a.y = any;
    } else {
      a.dx *= -1; a.dy *= -1;
    }
    // Occasional direction change
    if (Math.random() < 0.005) { a.dx = (Math.random() - 0.5) * 0.6; a.dy = (Math.random() - 0.5) * 0.6; }
  });

  // Hut passive healing
  if (save.homePlanet.buildings.some(b => b.type === 'hut') && save.hp < save.maxHp) {
    save.hp = Math.min(save.maxHp, save.hp + 0.02);
    updateHUD();
  }
}
