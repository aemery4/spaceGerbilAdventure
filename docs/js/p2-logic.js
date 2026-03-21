// ════════════════════════════════════════
// js/p2-logic.js — Planet 2 Logic Layer
// Jungle Planet Zorbax — update logic, AI, collision
// ════════════════════════════════════════

// ── Shared state for P2 (initialized by planet2.js) ─────
let p2 = null;  // Will be set by p2InitData()

// Initialize shared P2 state — called from planet2.js
function p2InitData(state) {
  p2 = state;
}

// ── Collision Helpers ────────────────────────────────────
function isSolidP2(px, py) {
  const tx = Math.floor(px / p2.TILE), ty = Math.floor(py / p2.TILE);
  if (tx < 0 || ty < 0 || tx >= p2.COLS || ty >= p2.ROWS) return true;
  const t = p2.map[ty][tx];
  return t === 1 || t === 3;
}

function isSwampP2(px, py) {
  const tx = Math.floor(px / p2.TILE), ty = Math.floor(py / p2.TILE);
  if (tx < 0 || ty < 0 || tx >= p2.COLS || ty >= p2.ROWS) return false;
  return p2.map[ty][tx] === 6;
}

function isBushP2(px, py) {
  const tx = Math.floor(px / p2.TILE), ty = Math.floor(py / p2.TILE);
  if (tx < 0 || ty < 0 || tx >= p2.COLS || ty >= p2.ROWS) return false;
  return p2.map[ty][tx] === 2;
}

// ── Particle Helper ──────────────────────────────────────
function addP2(x, y, color, n = 8) {
  for (let i = 0; i < n; i++) {
    p2.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      life: 35,
      color
    });
  }
}

// ── Climb Action ─────────────────────────────────────────
function climbActionP2(tx, ty) {
  p2.p2state.climbCount++;
  addP2(tx * p2.TILE + 20, ty * p2.TILE + 20, '#0f0', 15);
  if (!p2.p2state.mapRevealed) {
    p2.p2state.mapRevealed = true;
    if (!save.hiddenRoomFound) { save.hiddenRoomFound = true; persist(); checkSkinUnlocks(); }
    showMsg('🌴 Canopy Reached!', 'You can see the whole jungle!\n\nMap revealed! A HIDDEN AREA glows below...');
    drawP2Minimap();
  } else {
    showToast('🌿 Climbing!', 'Vine swing! +Speed boost for 5 seconds!');
    p2.player.speed = 7;
    setTimeout(() => p2.player.speed = save.items.includes('boots') ? 6 : 4, 5000);
  }
}

// ── Boss Death ───────────────────────────────────────────
function bossDieP2() {
  p2.p2state.bossDead = true;
  checkSkinUnlocks();
  if (!save.items.includes('banana_sword')) save.items.push('banana_sword', 'vine_hook', 'rocket_upgrade');
  if (!save.planetsCleared.includes(2)) { save.planetsCleared.push(2); save.spaceCoins = (save.spaceCoins || 0) + 250; }
  addP2(p2.miniBoss.x, p2.miniBoss.y, '#ff0', 40);
  addP2(p2.miniBoss.x, p2.miniBoss.y, '#f80', 40);
  updateHUD(); persist();
  setTimeout(() => showMsg('👑 JUNGLE KING DEFEATED!', 'The Giant Monkey howls and falls!\n\n🍌 Got: BANANA SWORD\n🪝 Got: VINE GRAPPLING HOOK\n🚀 Got: ROCKET UPGRADE\n🪙 +250 Space Coins!\n\nCollect 15 ⚡ fuel to reach Planet 3!'), 500);
}

// ── Shop Effects ─────────────────────────────────────────
function executeP2ShopEffect(effectId) {
  switch (effectId) {
    case 'heal30': save.hp = Math.min(save.maxHp, save.hp + 30); updateHUD(); break;
    case 'heal60': save.hp = Math.min(save.maxHp, save.hp + 60); updateHUD(); break;
    case 'spore_bomb':
      p2.monkeys = p2.monkeys.filter(m => {
        if (Math.hypot(p2.player.x - m.x, p2.player.y - m.y) < p2.TILE * 6) {
          addP2(m.x, m.y, '#8f4', 20); return false;
        } return true;
      });
      save.items = save.items.filter(i => i !== 'spore_bomb'); updateHUD(); break;
    case 'mega_salve': save.maxHp += 30; save.hp = Math.min(save.hp + 30, save.maxHp); updateHUD(); persist(); break;
    case 'buy_rock': save.resources.rock = (save.resources.rock || 0) + 3; updateHUD(); break;
    case 'buy_crystal': save.resources.crystal = (save.resources.crystal || 0) + 1; updateHUD(); break;
    case 'fuel_chunk': save.resources.fuel += 2; updateHUD(); break;
    case 'rock_armor': if (!save.items.includes('shield')) { save.items.push('shield'); updateHUD(); persist(); } break;
    case 'fuel_x3': save.resources.fuel += 3; updateHUD(); break;
    case 'fuel_x6': save.resources.fuel += 6; updateHUD(); break;
    case 'magnet_pip': if (!save.items.includes('magnet')) { save.items.push('magnet'); updateHUD(); persist(); } break;
    case 'rocket_boost': if (!save.items.includes('rocket_upgrade')) { save.items.push('rocket_upgrade'); updateHUD(); persist(); } break;
    case 'map_reveal': if (!p2.p2state.mapRevealed) { p2.p2state.mapRevealed = true; drawP2Minimap(); } break;
    case 'elder_boots': if (!save.items.includes('boots')) { save.items.push('boots'); p2.player.speed = 6; updateHUD(); persist(); } break;
    case 'lore_scroll': showMsg('📜 Ancient Lore', 'The Jungle King slumbers at coordinates 12,12.\n\nDefeat him to earn passage to Planet 3!'); break;
    case 'wizard_skin_buy': if (!save.unlockedSkins.includes('wizard')) { save.unlockedSkins.push('wizard'); persist(); showSkinUnlockToast('wizard'); } break;
    case 'blessing': save.hp = save.maxHp; save.lives = Math.min(save.lives + 3, 9); updateHUD(); persist(); break;
    case 'coin_maxhp': save.maxHp += 50; save.hp = Math.min(save.hp + 50, save.maxHp); updateHUD(); persist(); break;
    case 'coin_lives': save.lives = Math.min(save.lives + 3, 9); updateHUD(); persist(); break;
  }
}

// ── Shop Functions ───────────────────────────────────────
function openP2Shop(merchant) {
  activeShop = merchant;
  gamePaused = true;
  const panel = document.getElementById('villageShop');
  document.getElementById('shopMerchantName').textContent = merchant.emoji + ' ' + merchant.name;
  document.getElementById('shopMerchantDialog').textContent = '"' + merchant.dialog + '"';
  renderP2ShopItems(merchant);
  panel.style.display = 'block';
}

function renderP2ShopItems(merchant) {
  const grid = document.getElementById('shopGrid');
  grid.innerHTML = '';
  merchant.shop.forEach(item => {
    const getRes = r => r === 'coins' ? (save.spaceCoins || 0) : (save.resources[r] || 0);
    const canAfford = Object.entries(item.cost).every(([res, amt]) => getRes(res) >= amt);
    const owned = item.id.startsWith('buy_') || item.id.startsWith('fuel_') || item.id === 'herb_tonic' || item.id === 'jungle_salve' || item.id === 'mega_salve' || item.id === 'lore_scroll' || item.id === 'blessing' ? false : save.items.includes(item.id.replace('_pip', '').replace('_boost', '').replace('_armor', '').replace('_pip', ''));
    const el = document.createElement('div');
    el.className = 'shop-item' + (!canAfford ? ' shop-disabled' : '') + (owned ? ' shop-owned' : '');
    const costStr = Object.entries(item.cost).map(([r, a]) => {
      const icons = { rock: '🪨', plant: '🌿', crystal: '💎', banana: '🍌', fuel: '⚡', coins: '🪙' };
      const has = getRes(r) >= a;
      return `<span class="${has ? 'has' : 'lacks'}">${icons[r] || r}×${a}</span>`;
    }).join('');
    el.innerHTML = `<div class="shop-item-name">${item.emoji} ${item.name}</div>
      <div class="shop-item-desc">${item.desc}</div>
      <div class="shop-cost">${costStr}${owned ? '<span style="color:#5d9;margin-left:4px">✓ Owned</span>' : ''}</div>`;
    if (canAfford && !owned) {
      el.onclick = () => {
        Object.entries(item.cost).forEach(([res, amt]) => { if (res === 'coins') save.spaceCoins -= amt; else save.resources[res] -= amt; });
        executeP2ShopEffect(item.effect);
        persist();
        renderP2ShopItems(merchant);
        el.style.background = 'rgba(80,200,80,0.3)';
      };
    }
    grid.appendChild(el);
  });
}

// ── Action Handler (F key / click) ───────────────────────
function doP2Action(mx, my) {
  const tx = Math.floor(mx / p2.TILE), ty = Math.floor(my / p2.TILE);
  // Vine/tree climb
  if (tx >= 0 && ty >= 0 && tx < p2.COLS && ty < p2.ROWS && (p2.map[ty][tx] === 4 || p2.map[ty][tx] === 3) && Math.hypot(p2.player.x - mx, p2.player.y - my) < p2.TILE * 3.5) {
    climbActionP2(tx, ty); return;
  }
  // Chest click
  for (const ch of p2.chests) {
    if (!ch.opened && Math.hypot(mx - ch.x, my - ch.y) < p2.TILE * 1.5 && Math.hypot(p2.player.x - ch.x, p2.player.y - ch.y) < p2.TILE * 3) {
      ch.opened = true;
      p2.activeWeapon = ch.weapon;
      const wKey = 'w:' + ch.weapon;
      if (!save.items.includes(wKey)) save.items.push(wKey);
      persist(); updateHUD();
      showMsg('📦 Weapon Found!', `${ch.label} ${ch.name}\n\n${ch.desc}\n\nEquipped as active weapon!`);
      return;
    }
  }
  // Attack golems
  for (let i = p2.golems.length - 1; i >= 0; i--) {
    const a = p2.golems[i]; const d = Math.hypot(mx - a.x, my - a.y), pd = Math.hypot(p2.player.x - a.x, p2.player.y - a.y);
    if (d < a.size + 10 && pd < p2.TILE * 3.5) {
      const dmg = p2.activeWeapon === 'rock_hammer' ? 3 : p2.activeWeapon === 'obsidian_axe' ? 5 : p2.activeWeapon === 'lava_sword' ? 2 : 1;
      a.hp -= dmg; addP2(a.x, a.y, '#888');
      if (p2.activeWeapon === 'lava_sword') { setTimeout(() => { a.hp -= 3; addP2(a.x, a.y, '#f80'); }, 1000); }
      if (a.hp <= 0) { addP2(a.x, a.y, '#aaa', 20); save.resources.rock = (save.resources.rock || 0) + 2; p2.golems.splice(i, 1); updateHUD(); }
      return;
    }
  }
  // Attack lizards
  for (let i = p2.lizards.length - 1; i >= 0; i--) {
    const a = p2.lizards[i]; const d = Math.hypot(mx - a.x, my - a.y), pd = Math.hypot(p2.player.x - a.x, p2.player.y - a.y);
    const reach = p2.activeWeapon === 'vine_whip' ? p2.TILE * 5 : p2.activeWeapon === 'jungle_bow' ? p2.TILE * 6 : p2.TILE * 3.5;
    if (d < a.size + 10 && pd < reach) {
      const dmg = p2.activeWeapon === 'rock_hammer' ? 3 : p2.activeWeapon === 'obsidian_axe' ? 5 : p2.activeWeapon === 'lava_sword' ? 2 : 1;
      a.hp -= dmg; addP2(a.x, a.y, '#f80');
      if (a.hp <= 0) { addP2(a.x, a.y, '#f60', 16); save.resources.crystal = (save.resources.crystal || 0) + 1; p2.lizards.splice(i, 1); updateHUD(); }
      return;
    }
  }
  // Attack panthers
  for (let i = p2.panthers.length - 1; i >= 0; i--) {
    const a = p2.panthers[i]; const d = Math.hypot(mx - a.x, my - a.y), pd = Math.hypot(p2.player.x - a.x, p2.player.y - a.y);
    const reach = p2.activeWeapon === 'vine_whip' ? p2.TILE * 5 : p2.activeWeapon === 'jungle_bow' ? p2.TILE * 6 : p2.TILE * 3.5;
    if (d < a.size + 10 && pd < reach) {
      const dmg = p2.activeWeapon === 'poison_dart' ? 1 : p2.activeWeapon === 'obsidian_axe' ? 5 : 2;
      a.hp -= dmg; addP2(a.x, a.y, '#80f');
      if (p2.activeWeapon === 'poison_dart') { let t = 0; const tok = setInterval(() => { a.hp -= 1; addP2(a.x, a.y, '#4a0'); if (++t >= 5 || a.hp <= 0) clearInterval(tok); }, 800); }
      if (a.hp <= 0) { addP2(a.x, a.y, '#808', 16); save.resources.plant = (save.resources.plant || 0) + 2; p2.panthers.splice(i, 1); updateHUD(); }
      return;
    }
  }
  // Merchant click
  for (const m of p2.VILLAGE_MERCHANTS) {
    if (Math.hypot(mx - m.x, my - m.y) < 30 && Math.hypot(p2.player.x - m.x, p2.player.y - m.y) < p2.TILE * 2.5) {
      openP2Shop(m); return;
    }
  }
  // Boss attack
  if (p2.miniBoss.alive) {
    const bd = Math.hypot(mx - p2.miniBoss.x, my - p2.miniBoss.y), pd = Math.hypot(p2.player.x - p2.miniBoss.x, p2.player.y - p2.miniBoss.y);
    if (bd < p2.miniBoss.size + 10 && pd < p2.TILE * 3) {
      const dmg = save.items.includes('banana_sword') ? 4 : 1;
      p2.miniBoss.hp -= dmg; addP2(p2.miniBoss.x, p2.miniBoss.y, '#f44', 12);
      if (p2.miniBoss.hp <= 0) { p2.miniBoss.alive = false; bossDieP2(); }
      return;
    }
  }
  // Attack monkeys
  for (let i = p2.monkeys.length - 1; i >= 0; i--) {
    const a = p2.monkeys[i];
    if (Math.hypot(mx - a.x, my - a.y) < a.size + 10 && Math.hypot(p2.player.x - a.x, p2.player.y - a.y) < p2.TILE * 3.5) {
      const dmg = save.items.includes('banana_sword') ? 3 : 1;
      a.hp -= dmg; addP2(a.x, a.y, '#f44');
      if (a.hp <= 0) { addP2(a.x, a.y, '#fa0', 12); p2.monkeys.splice(i, 1); }
      return;
    }
  }
  // Harvest resources
  for (let i = p2.resources.length - 1; i >= 0; i--) {
    const r = p2.resources[i];
    if (r.hidden && !p2.p2state.mapRevealed) continue;
    const rx = r.x * p2.TILE + p2.TILE / 2, ry = r.y * p2.TILE + p2.TILE / 2;
    if (Math.hypot(mx - rx, my - ry) < p2.TILE * 0.8 && Math.hypot(p2.player.x - rx, p2.player.y - ry) < (save.items.includes('scanner') ? p2.TILE * 5.4 : p2.TILE * 3.2)) {
      r.hp--; addP2(rx, ry, r.color);
      if (r.hp <= 0) { save.resources[r.type] = (save.resources[r.type] || 0) + 1; p2.resources.splice(i, 1); updateHUD(); }
      return;
    }
  }
  // Nothing in range fallback
  showToast('Nothing Here', 'Walk closer to resources, enemies, or NPCs.');
}

// ── Main Update Function ─────────────────────────────────
function updateP2() {
  if (gamePaused) return;

  p2.vineAnim += 0.03;

  // Move player
  let dx = 0, dy = 0;
  if (p2.player.keys['ArrowLeft'] || p2.player.keys['a'] || p2.player.keys['A']) dx -= 1;
  if (p2.player.keys['ArrowRight'] || p2.player.keys['d'] || p2.player.keys['D']) dx += 1;
  if (p2.player.keys['ArrowUp'] || p2.player.keys['w'] || p2.player.keys['W']) dy -= 1;
  if (p2.player.keys['ArrowDown'] || p2.player.keys['s'] || p2.player.keys['S']) dy += 1;

  let spd = p2.player.speed;
  if (isSwampP2(p2.player.x, p2.player.y)) spd *= 0.4;
  else if (isBushP2(p2.player.x, p2.player.y)) spd *= 0.6;

  const r = p2.player.size;
  const nx = p2.player.x + dx * spd, ny = p2.player.y + dy * spd;
  if (!isSolidP2(nx - r, p2.player.y - r) && !isSolidP2(nx + r, p2.player.y - r) && !isSolidP2(nx - r, p2.player.y + r) && !isSolidP2(nx + r, p2.player.y + r)) p2.player.x = nx;
  if (!isSolidP2(p2.player.x - r, ny - r) && !isSolidP2(p2.player.x + r, ny - r) && !isSolidP2(p2.player.x - r, ny + r) && !isSolidP2(p2.player.x + r, ny + r)) p2.player.y = ny;

  if (p2.player.invincible > 0) p2.player.invincible--;

  // Village safe zone — enemies cannot enter or aggro here (cols 23-30, rows 0-27)
  function isInP2Village(x, y) {
    const tx = x / p2.TILE, ty = y / p2.TILE;
    return tx >= 23 && tx <= 30 && ty >= 0 && ty <= 27;
  }
  const playerInVillage = isInP2Village(p2.player.x, p2.player.y);

  // Monkey AI
  p2.monkeys.forEach(a => {
    const pd = Math.hypot(p2.player.x - a.x, p2.player.y - a.y);
    if (pd < p2.TILE * 6 && !playerInVillage) {
      const ang = Math.atan2(p2.player.y - a.y, p2.player.x - a.x);
      const nx = a.x + Math.cos(ang) * a.speed, ny = a.y + Math.sin(ang) * a.speed;
      if (!isInP2Village(nx, ny)) { a.x = nx; a.y = ny; }
      a.aggro = true; a.attackTimer++;
      if (pd < a.size + p2.player.size && a.attackTimer > 30 && p2.player.invincible === 0) {
        const dmg = save.items.includes('shield') ? 2.5 : 5;
        save.hp = Math.max(0, save.hp - dmg);
        p2.player.invincible = 60; a.attackTimer = 0; updateHUD();
        if (save.hp <= 0) { loseLife(() => { closeMsg(); startPlanet(2); }); }
      }
    } else {
      a.aggro = false;
      const nx = a.x + a.dx, ny = a.y + a.dy;
      if (nx < p2.TILE || nx > (p2.COLS - 1) * p2.TILE || isInP2Village(nx, ny)) a.dx *= -1;
      else a.x = nx;
      if (ny < p2.TILE || ny > (p2.ROWS - 1) * p2.TILE || isInP2Village(a.x, ny)) a.dy *= -1;
      else a.y = ny;
    }
    a.x = Math.max(p2.TILE, Math.min(22 * p2.TILE, a.x));
    a.y = Math.max(p2.TILE, Math.min((p2.ROWS - 1) * p2.TILE, a.y));
  });

  // Boss discovery
  if (p2.miniBoss.alive && !p2.miniBoss.discovered) {
    const pd = Math.hypot(p2.player.x - p2.miniBoss.x, p2.player.y - p2.miniBoss.y);
    if (pd < p2.TILE * 6) {
      p2.miniBoss.discovered = true;
      showMsg('👑 JUNGLE KING AWAKENS!', 'A massive ape rises from the undergrowth!\n\nDefeat it to unlock Planet 3!');
    }
  }

  // Boss AI
  if (p2.miniBoss.alive && p2.miniBoss.discovered && !playerInVillage) {
    const pd = Math.hypot(p2.player.x - p2.miniBoss.x, p2.player.y - p2.miniBoss.y);
    p2.miniBoss.attackTimer++;
    if (p2.miniBoss.charging) {
      const bnx = p2.miniBoss.x + p2.miniBoss.chargeDir.x * 8, bny = p2.miniBoss.y + p2.miniBoss.chargeDir.y * 8;
      if (!isInP2Village(bnx, bny)) { p2.miniBoss.x = bnx; p2.miniBoss.y = bny; }
      else p2.miniBoss.charging = false;
      p2.miniBoss.chargeTimer--;
      if (p2.miniBoss.chargeTimer <= 0) p2.miniBoss.charging = false;
      if (pd < p2.miniBoss.size + p2.player.size && p2.player.invincible === 0) {
        const dmg = save.items.includes('shield') ? 7.5 : 15;
        save.hp = Math.max(0, save.hp - dmg);
        p2.player.invincible = 90; addP2(p2.player.x, p2.player.y, '#f00', 10); updateHUD();
        if (save.hp <= 0) { loseLife(() => { closeMsg(); startPlanet(2); }); }
      }
    } else {
      const ang = Math.atan2(p2.player.y - p2.miniBoss.y, p2.player.x - p2.miniBoss.x);
      const bnx2 = p2.miniBoss.x + Math.cos(ang) * p2.miniBoss.speed, bny2 = p2.miniBoss.y + Math.sin(ang) * p2.miniBoss.speed;
      if (!isInP2Village(bnx2, bny2)) { p2.miniBoss.x = bnx2; p2.miniBoss.y = bny2; }
      if (p2.miniBoss.attackTimer > 240) {
        p2.miniBoss.charging = true; p2.miniBoss.chargeTimer = 20;
        p2.miniBoss.chargeDir = { x: Math.cos(ang), y: Math.sin(ang) };
        p2.miniBoss.attackTimer = 0; addP2(p2.miniBoss.x, p2.miniBoss.y, '#f80', 20);
      }
      if (pd < p2.miniBoss.size + p2.player.size && p2.player.invincible === 0) {
        const dmg = save.items.includes('shield') ? 4 : 8;
        save.hp = Math.max(0, save.hp - dmg);
        p2.player.invincible = 60; updateHUD();
        if (save.hp <= 0) { loseLife(() => { closeMsg(); startPlanet(2); }); }
      }
    }
    p2.miniBoss.x = Math.max(p2.TILE + p2.miniBoss.size, Math.min(22 * p2.TILE - p2.miniBoss.size, p2.miniBoss.x));
    p2.miniBoss.y = Math.max(p2.TILE + p2.miniBoss.size, Math.min((p2.ROWS - 1) * p2.TILE - p2.miniBoss.size, p2.miniBoss.y));
  }

  // Bunny AI (healers)
  p2.bunnies.forEach(b => {
    b.x += b.dx; b.y += b.dy;
    if (b.x < p2.TILE || b.x > (p2.COLS - 1) * p2.TILE) b.dx *= -1;
    if (b.y < p2.TILE || b.y > (p2.ROWS - 1) * p2.TILE) b.dy *= -1;
    b.healTimer++;
    const pd = Math.hypot(p2.player.x - b.x, p2.player.y - b.y);
    if (pd < b.size + p2.player.size + 5 && b.healTimer > 120) {
      save.hp = Math.min(save.maxHp, save.hp + 5);
      b.healTimer = 0; addP2(b.x, b.y, '#f9f', 8); updateHUD();
    }
  });

  // Particle update
  p2.particles = p2.particles.filter(p => p.life > 0);
  p2.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; p.vx *= 0.92; p.vy *= 0.92; });

  // Fuel magnet
  if (save.items.includes('magnet')) {
    for (let i = p2.resources.length - 1; i >= 0; i--) {
      const r = p2.resources[i];
      if (r.type !== 'fuel') continue;
      if (r.hidden && !p2.p2state.mapRevealed) continue;
      const rx = r.x * p2.TILE + p2.TILE / 2, ry = r.y * p2.TILE + p2.TILE / 2;
      if (Math.hypot(p2.player.x - rx, p2.player.y - ry) < p2.TILE * 3) {
        save.resources.fuel++; p2.resources.splice(i, 1); updateHUD();
      }
    }
  }

  // Lava damage
  if (!p2.player.invincible) {
    const ltx = Math.floor(p2.player.x / p2.TILE), lty = Math.floor(p2.player.y / p2.TILE);
    if (ltx >= 0 && lty >= 0 && ltx < p2.COLS && lty < p2.ROWS && p2.map[lty][ltx] === 8) {
      save.hp = Math.max(0, save.hp - 0.15); updateHUD(); addP2(p2.player.x, p2.player.y, '#f80', 2);
      if (save.hp <= 0) { loseLife(() => { closeMsg(); startPlanet(2); }); }
    }
  }

  // Parrot collection
  p2.parrots.forEach(p => {
    if (p.collected) return;
    p.timer++;
    p.x += Math.cos(p.timer * 0.03) * p.dx * 0.8;
    p.y += Math.sin(p.timer * 0.025) * p.dy * 0.8;
    p.x = Math.max(p2.TILE, Math.min((p2.COLS - 1) * p2.TILE, p.x));
    p.y = Math.max(p2.TILE, Math.min((p2.ROWS - 1) * p2.TILE, p.y));
    if (Math.hypot(p2.player.x - p.x, p2.player.y - p.y) < p2.TILE * 1.5) {
      p.collected = true; save.resources.banana = (save.resources.banana || 0) + 3;
      addP2(p.x, p.y, '#f90', 12); updateHUD();
      showToast('🦜 Parrot Befriended!', '+3 Bananas! The parrot drops jungle treasure and flies off!');
    }
  });

  // Weapon cooldowns
  if (p2.weaponCooldown > 0) p2.weaponCooldown--;
  if ((p2.activeWeapon === 'crystal_bow' || p2.activeWeapon === 'jungle_bow') && p2.weaponCooldown <= 0) {
    const range = p2.activeWeapon === 'jungle_bow' ? p2.TILE * 6 : p2.TILE * 4;
    let closest = null, cd = range;
    [...p2.monkeys, ...p2.golems, ...p2.lizards, ...p2.panthers].forEach(e => {
      const d = Math.hypot(p2.player.x - e.x, p2.player.y - e.y);
      if (d < cd) { cd = d; closest = e; }
    });
    if (closest) { closest.hp -= 2; addP2(closest.x, closest.y, '#8af', 6); p2.weaponCooldown = 120; }
  }
  if (p2.activeWeapon === 'thunder_orb' && p2.weaponCooldown <= 0) {
    [...p2.monkeys, ...p2.golems, ...p2.lizards, ...p2.panthers].forEach(e => {
      if (Math.hypot(p2.player.x - e.x, p2.player.y - e.y) < p2.TILE * 3) {
        e.hp -= 1; addP2(e.x, e.y, '#ff0', 4);
      }
    });
    p2.weaponCooldown = 90;
  }

  // Golem AI
  for (let i = p2.golems.length - 1; i >= 0; i--) {
    const a = p2.golems[i];
    if (a.hp <= 0) { addP2(a.x, a.y, '#888', 20); save.resources.rock = (save.resources.rock || 0) + 2; p2.golems.splice(i, 1); continue; }
    const pd = Math.hypot(p2.player.x - a.x, p2.player.y - a.y);
    if (pd < p2.TILE * 4 && !playerInVillage) {
      const ang = Math.atan2(p2.player.y - a.y, p2.player.x - a.x);
      const gnx = a.x + Math.cos(ang) * a.speed, gny = a.y + Math.sin(ang) * a.speed;
      if (!isInP2Village(gnx, gny)) { a.x = gnx; a.y = gny; }
      a.aggro = true;
      if (a.attackTimer > 0) a.attackTimer--;
      if (pd < a.size + p2.player.size && a.attackTimer <= 0) {
        const dmg = save.items.includes('ruin_shield') ? 1 : save.items.includes('shield') ? 2.5 : 5;
        save.hp = Math.max(0, save.hp - dmg); updateHUD(); a.attackTimer = 80;
        if (save.hp <= 0) loseLife(() => { closeMsg(); startPlanet(2); });
      }
    } else {
      a.aggro = false;
      const gnx = a.x + a.dx, gny = a.y + a.dy;
      if (gnx < 30 * p2.TILE || gnx > 46 * p2.TILE || isInP2Village(gnx, gny)) a.dx *= -1;
      else a.x = gnx;
      if (gny < p2.TILE || gny > (p2.ROWS - 1) * p2.TILE || isInP2Village(a.x, gny)) a.dy *= -1;
      else a.y = gny;
    }
    a.x = Math.max(30 * p2.TILE, Math.min(46 * p2.TILE, a.x));
    a.y = Math.max(p2.TILE, Math.min((p2.ROWS - 1) * p2.TILE, a.y));
  }

  // Lizard AI
  for (let i = p2.lizards.length - 1; i >= 0; i--) {
    const a = p2.lizards[i];
    if (a.hp <= 0) { addP2(a.x, a.y, '#f80', 16); save.resources.crystal = (save.resources.crystal || 0) + 1; p2.lizards.splice(i, 1); continue; }
    const pd = Math.hypot(p2.player.x - a.x, p2.player.y - a.y);
    if (pd < p2.TILE * 5 && !playerInVillage) {
      const ang = Math.atan2(p2.player.y - a.y, p2.player.x - a.x);
      const lnx = a.x + Math.cos(ang) * a.speed, lny = a.y + Math.sin(ang) * a.speed;
      if (!isInP2Village(lnx, lny)) { a.x = lnx; a.y = lny; }
      a.aggro = true;
      if (a.attackTimer > 0) a.attackTimer--;
      if (pd < a.size + p2.player.size && a.attackTimer <= 0) {
        const dmg = save.items.includes('ruin_shield') ? 0.8 : save.items.includes('shield') ? 1.5 : 3;
        save.hp = Math.max(0, save.hp - dmg); addP2(a.x, a.y, '#f80', 4); updateHUD(); a.attackTimer = 45;
        if (save.hp <= 0) loseLife(() => { closeMsg(); startPlanet(2); });
      }
    } else {
      a.aggro = false;
      const lnx = a.x + a.dx, lny = a.y + a.dy;
      if (lnx < 30 * p2.TILE || lnx > 46 * p2.TILE || isInP2Village(lnx, lny)) a.dx *= -1;
      else a.x = lnx;
      if (lny < p2.TILE || lny > 14 * p2.TILE || isInP2Village(a.x, lny)) a.dy *= -1;
      else a.y = lny;
    }
    a.x = Math.max(30 * p2.TILE, Math.min(46 * p2.TILE, a.x));
    a.y = Math.max(p2.TILE, Math.min(14 * p2.TILE, a.y));
  }

  // Panther AI
  for (let i = p2.panthers.length - 1; i >= 0; i--) {
    const a = p2.panthers[i];
    if (a.hp <= 0) { addP2(a.x, a.y, '#808', 16); save.resources.plant = (save.resources.plant || 0) + 2; p2.panthers.splice(i, 1); continue; }
    const pd = Math.hypot(p2.player.x - a.x, p2.player.y - a.y);
    a.alpha = pd < p2.TILE * 3 ? 0.95 : pd < p2.TILE * 6 ? 0.6 : 0.2;
    if (pd < p2.TILE * 5 && !playerInVillage) {
      const ang = Math.atan2(p2.player.y - a.y, p2.player.x - a.x);
      const pnx = a.x + Math.cos(ang) * a.speed, pny = a.y + Math.sin(ang) * a.speed;
      if (!isInP2Village(pnx, pny)) { a.x = pnx; a.y = pny; }
      a.aggro = true;
      if (a.attackTimer > 0) a.attackTimer--;
      if (pd < a.size + p2.player.size && a.attackTimer <= 0) {
        const dmg = save.items.includes('ruin_shield') ? 1.2 : save.items.includes('shield') ? 2 : 4;
        save.hp = Math.max(0, save.hp - dmg); updateHUD(); a.attackTimer = 55;
        if (save.hp <= 0) loseLife(() => { closeMsg(); startPlanet(2); });
      }
    } else {
      a.aggro = false;
      const pnx = a.x + a.dx, pny = a.y + a.dy;
      if (pnx < 30 * p2.TILE || pnx > 46 * p2.TILE || isInP2Village(pnx, pny)) a.dx *= -1;
      else a.x = pnx;
      if (pny < 14 * p2.TILE || pny > 26 * p2.TILE || isInP2Village(a.x, pny)) a.dy *= -1;
      else a.y = pny;
    }
    a.x = Math.max(30 * p2.TILE, Math.min(46 * p2.TILE, a.x));
    a.y = Math.max(14 * p2.TILE, Math.min(26 * p2.TILE, a.y));
  }

  // Camera
  p2.cam.x = Math.max(0, Math.min(p2.player.x - p2.canvas.width / 2, p2.COLS * p2.TILE - p2.canvas.width));
  p2.cam.y = Math.max(0, Math.min(p2.player.y - p2.canvas.height / 2, p2.ROWS * p2.TILE - p2.canvas.height));
}
