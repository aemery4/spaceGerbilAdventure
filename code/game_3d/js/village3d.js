// ════════════════════════════════════════
// js/village3d.js — Treetop Village (Planet 2)
// Restores the jungle village: 3D huts, merchant NPCs you can walk up
// to, the merchant shop, and the enemy-free safe zone.
// Shop data comes from buildP2Data()'s VILLAGE_MERCHANTS (unchanged).
// ════════════════════════════════════════

let activeShop = null;

// ── Build the village into the current scene (called from buildWorld) ──
function buildVillage(data, cfg, scene) {
  E.merchants = [];
  const T = cfg.tile;
  const merchants = data.VILLAGE_MERCHANTS || [];

  // Platform height (tile 7 is a raised wooden floor patch)
  const platY = 0.06;

  // Huts scattered across the village platform (tile value 7), skipping
  // tiles a merchant stands on so nobody is buried inside a wall.
  const merchantTiles = new Set(merchants.map(m => Math.floor(m.x / T) + ',' + Math.floor(m.y / T)));
  const hutSpots = [];
  for (let z = 1; z < E.rows - 1; z++) {
    for (let x = 1; x < E.cols - 1; x++) {
      if (E.map[z][x] !== 7) continue;
      // only interior platform tiles (surrounded by platform) get a hut, spaced out
      const key = x + ',' + z;
      if (merchantTiles.has(key)) continue;
      if ((x % 3 === 0) && (z % 4 === 1) && E.map[z][x - 1] === 7 && E.map[z][x + 1] === 7) hutSpots.push([x, z]);
    }
  }
  hutSpots.forEach(([x, z], i) => {
    const hut = makeHutMesh(0.9 + (i % 3) * 0.12);
    hut.position.set(x + 0.5, platY, z + 0.5);
    hut.rotation.y = (i * 1.3) % (Math.PI * 2);
    scene.add(hut);
  });

  // A couple of totem posts to mark the village entrance
  const anyTile = (val) => { for (let z = 0; z < E.rows; z++) for (let x = 0; x < E.cols; x++) if (E.map[z][x] === val) return [x, z]; return null; };

  // Merchant NPCs
  merchants.forEach(m => {
    const wx = m.x / T, wz = m.y / T;
    const npc = makeMerchantMesh(m.color || '#caa');
    npc.position.set(wx, platY, wz);
    scene.add(npc);
    E.merchants.push({ data: m, mesh: npc, x: wx, z: wz, marker: npc.userData.marker, bob: Math.random() * 6 });
  });
}

// ── Meshes ─────────────────────────────────────────────────────
function makeHutMesh(scale) {
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: 0x8a5a30, roughness: 0.9 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x4a7a2c, roughness: 0.9 });
  const door = new THREE.MeshStandardMaterial({ color: 0x2a1a0e, roughness: 1 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.9, 10), wall);
  base.position.y = 0.45;
  const r = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.8, 10), roof);
  r.position.y = 1.3;
  const d = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.5, 0.05), door);
  d.position.set(0, 0.25, 0.58);
  g.add(base, r, d);
  g.scale.setScalar(scale);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function makeMerchantMesh(colorHex) {
  const g = new THREE.Group();
  const robe = new THREE.MeshStandardMaterial({ color: new THREE.Color(colorHex), roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xe0bd93, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.75, 10), robe);
  body.position.y = 0.38;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), skin);
  head.position.y = 0.86;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 10), robe);
  hat.position.y = 1.12;
  const eyes = [-1, 1].map(sx => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
    e.position.set(sx * 0.06, 0.88, 0.15); return e;
  });
  // floating gold marker so the player knows it's interactive
  const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.12),
    new THREE.MeshStandardMaterial({ color: 0xffd54a, emissive: 0xffa020, emissiveIntensity: 1.1 }));
  marker.position.y = 1.55;
  g.add(body, head, hat, ...eyes, marker);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.marker = marker;
  return g;
}

// ── Per-frame village animation (called from the engine loop) ──
function updateVillage(dt) {
  if (!E.merchants) return;
  E.merchants.forEach(mn => {
    mn.bob += dt;
    if (mn.marker) {
      mn.marker.rotation.y += dt * 2;
      mn.marker.position.y = 1.55 + Math.sin(mn.bob * 2) * 0.12;
    }
    mn.mesh.rotation.y = Math.sin(mn.bob * 0.6) * 0.3; // gentle idle sway
  });
}

// Returns a merchant near the given point (or near the player if point is null)
function merchantNear(worldPoint) {
  if (!E.merchants) return null;
  const p = E.player.position;
  for (const mn of E.merchants) {
    const here = new THREE.Vector3(mn.x, 0.5, mn.z);
    const closeToPlayer = p.distanceTo(here) < 1.7;
    const clicked = worldPoint ? worldPoint.distanceTo(here) < 1.1 : false;
    if (closeToPlayer && (worldPoint ? clicked : true)) return mn;
    if (clicked && p.distanceTo(here) < 3.0) return mn;
  }
  return null;
}

// ── Shop (ported from p2-logic.js, adapted to the 3D engine) ──
function openP2Shop(merchant) {
  activeShop = merchant;
  gamePaused = true;
  document.getElementById('shopMerchantName').textContent = merchant.emoji + ' ' + merchant.name;
  document.getElementById('shopMerchantDialog').textContent = '"' + merchant.dialog + '"';
  renderP2ShopItems(merchant);
  document.getElementById('villageShop').style.display = 'block';
}

function renderP2ShopItems(merchant) {
  const grid = document.getElementById('shopGrid');
  grid.innerHTML = '';
  merchant.shop.forEach(item => {
    const getRes = r => r === 'coins' ? (save.spaceCoins || 0) : (save.resources[r] || 0);
    const canAfford = Object.entries(item.cost).every(([res, amt]) => getRes(res) >= amt);
    const permanent = ['magnet_pip', 'rocket_boost', 'elder_boots', 'rock_armor', 'wizard_skin_buy'];
    let owned = false;
    if (permanent.includes(item.id)) {
      const map = { magnet_pip: 'magnet', rocket_boost: 'rocket_upgrade', elder_boots: 'boots', rock_armor: 'shield' };
      if (item.id === 'wizard_skin_buy') owned = (save.unlockedSkins || []).includes('wizard');
      else owned = save.items.includes(map[item.id]);
    }
    const el = document.createElement('div');
    el.className = 'shop-item' + (!canAfford ? ' shop-disabled' : '') + (owned ? ' shop-owned' : '');
    const icons = { rock: '🪨', plant: '🌿', crystal: '💎', banana: '🍌', fuel: '⚡', coins: '🪙' };
    const costStr = Object.entries(item.cost).map(([r, a]) => {
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
      };
    }
    grid.appendChild(el);
  });
}

function executeP2ShopEffect(effectId) {
  switch (effectId) {
    case 'heal30': save.hp = Math.min(save.maxHp, save.hp + 30); updateHUD(); break;
    case 'heal60': save.hp = Math.min(save.maxHp, save.hp + 60); updateHUD(); break;
    case 'spore_bomb':
      for (let i = E.enemies.length - 1; i >= 0; i--) {
        const en = E.enemies[i];
        if (en.species === 'monkeys' && E.player.position.distanceTo(en.mesh.position) < 6) {
          spawnParticles(en.mesh.position, new THREE.Color(0x88ff44), 16);
          E.scene.remove(en.mesh); E.enemies.splice(i, 1);
        }
      }
      showToast('💥 Spore Bomb!', 'Nearby monkeys scattered.'); break;
    case 'mega_salve': save.maxHp += 30; save.hp = Math.min(save.hp + 30, save.maxHp); updateHUD(); persist(); break;
    case 'buy_rock': save.resources.rock = (save.resources.rock || 0) + 3; updateHUD(); break;
    case 'buy_crystal': save.resources.crystal = (save.resources.crystal || 0) + 1; updateHUD(); break;
    case 'fuel_chunk': save.resources.fuel += 2; updateHUD(); checkExitReady(); break;
    case 'rock_armor': if (!save.items.includes('shield')) { save.items.push('shield'); updateHUD(); persist(); } break;
    case 'fuel_x3': save.resources.fuel += 3; updateHUD(); checkExitReady(); break;
    case 'fuel_x6': save.resources.fuel += 6; updateHUD(); checkExitReady(); break;
    case 'magnet_pip': if (!save.items.includes('magnet')) { save.items.push('magnet'); updateHUD(); persist(); } break;
    case 'rocket_boost': if (!save.items.includes('rocket_upgrade')) { save.items.push('rocket_upgrade'); updateHUD(); persist(); } break;
    case 'map_reveal': showToast('🗺️ Map', 'The jungle layout is clear in your mind now.'); break;
    case 'elder_boots': if (!save.items.includes('boots')) { save.items.push('boots'); updateHUD(); persist(); } break;
    case 'lore_scroll': showMsg('📜 Ancient Lore', 'The Jungle King slumbers deep in the eastern ruins.\n\nDefeat the beasts and gather fuel to earn passage onward!'); break;
    case 'wizard_skin_buy':
      if (!save.unlockedSkins) save.unlockedSkins = [];
      if (!save.unlockedSkins.includes('wizard')) { save.unlockedSkins.push('wizard'); persist(); if (typeof showSkinUnlockToast === 'function') showSkinUnlockToast('wizard'); else showToast('🧙 Unlocked', 'Wizard skin available in the Skin menu.'); }
      break;
    case 'blessing': save.hp = save.maxHp; save.lives = Math.min(save.lives + 3, 9); updateHUD(); persist(); break;
    case 'coin_maxhp': save.maxHp += 50; save.hp = Math.min(save.hp + 50, save.maxHp); updateHUD(); persist(); break;
    case 'coin_lives': save.lives = Math.min(save.lives + 3, 9); updateHUD(); persist(); break;
  }
}

// Esc closes the shop (matches the button hint)
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('villageShop') &&
      document.getElementById('villageShop').style.display === 'block') closeShop();
});
