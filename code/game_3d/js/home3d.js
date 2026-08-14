// ════════════════════════════════════════
// js/home3d.js — Home Base building system (Planet 5)
// Restores the ability to spend Space Coins to place buildings on the
// home planet grid. Placement + catalog logic ported from p5-logic.js,
// rendered in 3D. Buildings persist in save.homePlanet.buildings.
// ════════════════════════════════════════

let homeBuildMode = false;

// ── Build all saved buildings into the scene (called from buildWorld) ──
function buildHomeStructures(scene) {
  homeBuildMode = false;
  E.homeMeshes = [];
  updateBuildButton();
  const list = (save.homePlanet && save.homePlanet.buildings) || [];
  list.forEach(b => {
    const info = P5_BUILDINGS.find(pb => pb.type === b.type);
    if (!info) return;
    for (let dr = 0; dr < info.h; dr++)
      for (let dc = 0; dc < info.w; dc++)
        if (E.map[b.gridY + dr] && E.map[b.gridY + dr][b.gridX + dc] !== undefined) E.map[b.gridY + dr][b.gridX + dc] = 5;
    placeBuildingMesh(scene, b.type, info.w, info.h, b.gridX, b.gridY);
  });
  applyHomeFarmsOnVisit();
}

function placeBuildingMesh(scene, type, w, h, gx, gy) {
  const mesh = makeBuildingMesh(type, w, h);
  mesh.position.set(gx + w / 2, 0.06, gy + h / 2);
  scene.add(mesh);
  E.homeMeshes.push({ mesh, type, x: gx + w / 2, z: gy + h / 2 });
  return mesh;
}

// Farms harvest resources each time you arrive home
function applyHomeFarmsOnVisit() {
  const farms = (save.homePlanet.buildings || []).filter(b => b.type === 'farm');
  if (!farms.length) return;
  const types = ['rock', 'plant', 'crystal'];
  farms.forEach(() => {
    const t = types[Math.floor(Math.random() * types.length)];
    save.resources[t] = (save.resources[t] || 0) + 2;
  });
  persist(); updateHUD();
  showToast('🌾 Star Farm', 'Your farms harvested ' + (farms.length * 2) + ' resources while you were away!');
}

// ── Build mode ──────────────────────────────────────────────────
function toggleBuildMode() {
  if (!E.cfg || !E.cfg.home) return;
  homeBuildMode = !homeBuildMode;
  updateBuildButton();
  showToast(homeBuildMode ? '🔨 Build Mode ON' : '🚶 Explore Mode',
    homeBuildMode ? 'Click a grass tile to build there. Toggle off when done.' : 'Walk around your base. Press Space by a building to use it.');
}

function updateBuildButton() {
  const btn = document.getElementById('buildBtn');
  if (!btn) return;
  const onHome = !!(E.cfg && E.cfg.home);
  btn.style.display = onHome ? '' : 'none';
  btn.textContent = homeBuildMode ? '🔨 Building… [B]' : '🔨 Build [B]';
  btn.style.background = homeBuildMode ? 'rgba(200,120,20,0.9)' : '#181830';
}

// Called from the engine when the player clicks the ground in build mode
function homeBuildClick(worldPoint) {
  const gx = Math.floor(worldPoint.x), gy = Math.floor(worldPoint.z);
  openHomeBuildMenu(gx, gy);
}

function openHomeBuildMenu(gx, gy) {
  gamePaused = true;
  document.getElementById('shopMerchantName').textContent = '🔨 Build Menu';
  document.getElementById('shopMerchantDialog').textContent = '"Choose a building to place here!"';
  const grid = document.getElementById('shopGrid');
  grid.innerHTML = '';
  P5_BUILDINGS.forEach(b => {
    let fits = true;
    for (let dr = 0; dr < b.h; dr++)
      for (let dc = 0; dc < b.w; dc++) {
        const mr = gy + dr, mc = gx + dc;
        if (mr < 1 || mc < 1 || mr >= E.rows - 1 || mc >= E.cols - 1 || E.map[mr][mc] !== 0) fits = false;
      }
    const canAfford = (save.spaceCoins || 0) >= b.cost;
    const el = document.createElement('div');
    el.className = 'shop-item' + (!canAfford || !fits ? ' shop-disabled' : '');
    el.innerHTML = `<div class="shop-item-name">${b.emoji} ${b.name}</div>
      <div class="shop-item-desc">${b.desc} (${b.w}x${b.h})</div>
      <div class="shop-cost"><span class="${canAfford ? 'has' : 'lacks'}">🪙×${b.cost}</span>${!fits ? '<span style="color:#f44;margin-left:4px">No room</span>' : ''}</div>`;
    if (canAfford && fits) {
      el.onclick = () => {
        save.spaceCoins -= b.cost;
        save.homePlanet.buildings.push({ type: b.type, gridX: gx, gridY: gy });
        for (let dr = 0; dr < b.h; dr++)
          for (let dc = 0; dc < b.w; dc++) E.map[gy + dr][gx + dc] = 5;
        placeBuildingMesh(E.scene, b.type, b.w, b.h, gx, gy);
        persist(); updateHUD();
        closeShop();
        showToast(b.emoji + ' Built!', b.name + ' placed on your home base.');
      };
    }
    grid.appendChild(el);
  });
  const cancel = document.createElement('div');
  cancel.className = 'shop-item';
  cancel.innerHTML = '<div class="shop-item-name">❌ Cancel</div><div class="shop-item-desc">Pick another tile</div>';
  cancel.onclick = () => closeShop();
  grid.appendChild(cancel);
  document.getElementById('villageShop').style.display = 'block';
}

// ── Walk-up interaction with a placed building ──────────────────
function homeBuildingNear(worldPoint) {
  if (!E.homeMeshes) return null;
  const p = E.player.position;
  for (const b of E.homeMeshes) {
    const here = new THREE.Vector3(b.x, 0.5, b.z);
    if (p.distanceTo(here) < 2.2 && (!worldPoint || worldPoint.distanceTo(here) < 1.6)) return b;
  }
  return null;
}

function useHomeBuilding(b) {
  switch (b.type) {
    case 'shop': openP5Shop(); break;
    case 'arcade': playHomeArcade(); break;
    case 'hut':
      save.hp = Math.min(save.maxHp, save.hp + 20); updateHUD(); persist();
      showToast('🏠 Space Hut', 'You rest at home. +20 HP!'); break;
    case 'farm': showToast('🌾 Star Farm', 'Harvested on arrival. Come back after your next mission!'); break;
    case 'landing': showToast('🛬 Landing Pad', 'More visitors will arrive thanks to the landing pad!'); break;
    case 'fountain': showToast('⛲ Fountain', 'The water sparkles peacefully.'); break;
  }
}

// Simple arcade: one round of rock-paper-scissors against the house
function playHomeArcade() {
  const opts = ['🪨 Rock', '📄 Paper', '✂️ Scissors'];
  const you = Math.floor(Math.random() * 3), them = Math.floor(Math.random() * 3);
  const win = (you + 1) % 3 === them;
  const tie = you === them;
  if (win) { save.spaceCoins = (save.spaceCoins || 0) + 25; persist(); updateHUD(); }
  showToast('🕹️ Arcade', `You: ${opts[you]}  •  House: ${opts[them]}\n` +
    (tie ? "It's a tie! Play again." : win ? 'You win! +25 🪙' : 'You lose! Better luck next time.'));
}

// ── Home Planet coin shop (Trading Post) ────────────────────────
function openP5Shop() {
  gamePaused = true;
  document.getElementById('shopMerchantName').textContent = '🏪 Home Planet Shop';
  document.getElementById('shopMerchantDialog').textContent = '"Spend your Space Coins on powerful upgrades!"';
  renderP5ShopItems();
  document.getElementById('villageShop').style.display = 'block';
}

function renderP5ShopItems() {
  const grid = document.getElementById('shopGrid');
  grid.innerHTML = '';
  P5_SHOP_ITEMS.forEach(item => {
    const getRes = r => r === 'coins' ? (save.spaceCoins || 0) : (save.resources[r] || 0);
    const canAfford = Object.entries(item.cost).every(([r, a]) => getRes(r) >= a);
    const el = document.createElement('div');
    el.className = 'shop-item' + (!canAfford ? ' shop-disabled' : '');
    const icons = { coins: '🪙', rock: '🪨', plant: '🌿', crystal: '💎' };
    const costStr = Object.entries(item.cost).map(([r, a]) =>
      `<span class="${getRes(r) >= a ? 'has' : 'lacks'}">${icons[r] || r}×${a}</span>`).join('');
    el.innerHTML = `<div class="shop-item-name">${item.emoji} ${item.name}</div>
      <div class="shop-item-desc">${item.desc}</div><div class="shop-cost">${costStr}</div>`;
    if (canAfford) {
      el.onclick = () => {
        Object.entries(item.cost).forEach(([r, a]) => { if (r === 'coins') save.spaceCoins -= a; else save.resources[r] -= a; });
        executeP5ShopEffect(item.effect);
        persist(); updateHUD(); renderP5ShopItems();
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

// ── Passive per-frame effects ───────────────────────────────────
function updateHome(dt) {
  if (!E.cfg || !E.cfg.home) return;
  if ((save.homePlanet.buildings || []).some(b => b.type === 'hut') && save.hp < save.maxHp) {
    save.hp = Math.min(save.maxHp, save.hp + dt * 2.5);
    updateHUD();
  }
  if (E.homeMeshes) E.homeMeshes.forEach(b => { if (b.mesh.userData.spin) b.mesh.userData.spin.rotation.y += dt; });
}

// ── Building meshes (footprint w × h tiles, centred at origin) ──
function makeBuildingMesh(type, w, h) {
  const g = new THREE.Group();
  const M = (c, r) => new THREE.MeshStandardMaterial({ color: c, roughness: r === undefined ? 0.85 : r });
  if (type === 'hut') {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 1.0, h * 0.8), M(0xcaa06a));
    wall.position.y = 0.5;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.65, 0.8, 4), M(0x8a3a2a));
    roof.position.y = 1.4; roof.rotation.y = Math.PI / 4;
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.05), M(0x3a2416));
    door.position.set(0, 0.28, h * 0.4 + 0.02);
    g.add(wall, roof, door);
  } else if (type === 'farm') {
    const plot = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.15, h * 0.9), M(0x5a3a1e));
    plot.position.y = 0.08;
    for (let i = 0; i < 12; i++) {
      const crop = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 5), M(0x4caf50));
      crop.position.set((Math.random() - 0.5) * w * 0.8, 0.3, (Math.random() - 0.5) * h * 0.8);
      g.add(crop);
    }
    const silo = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.1, 10), M(0xb8b0a0));
    silo.position.set(w * 0.28, 0.55, -h * 0.28);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.35, 10), M(0x8a5030));
    cap.position.set(w * 0.28, 1.25, -h * 0.28);
    g.add(plot, silo, cap);
  } else if (type === 'shop') {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.9, h * 0.8), M(0x6a4a2a));
    wall.position.y = 0.45;
    const awning = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.1, h * 0.5), M(0xd83b3b));
    awning.position.set(0, 0.95, h * 0.35); awning.rotation.x = -0.25;
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.06), M(0xffd54a, 0.4));
    sign.position.set(0, 1.2, 0);
    g.add(wall, awning, sign);
  } else if (type === 'arcade') {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 1.4, h * 0.7), M(0x2a2a40));
    cab.position.y = 0.7;
    const screen = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.5, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x22ffdd, emissive: 0x11aa99, emissiveIntensity: 1 }));
    screen.position.set(0, 0.95, h * 0.35 + 0.02);
    g.add(cab, screen);
  } else if (type === 'landing') {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.48, w * 0.5, 0.12, 20), M(0x40404a));
    pad.position.y = 0.06;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(w * 0.4, 0.05, 8, 28),
      new THREE.MeshStandardMaterial({ color: 0x40ff80, emissive: 0x22cc55, emissiveIntensity: 1.1 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.14;
    const saucer = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 0.2, 16), M(0xbfc7d2, 0.4));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x88ddff, emissive: 0x2266aa, emissiveIntensity: 0.5, transparent: true, opacity: 0.8 }));
    dome.position.y = 0.1; saucer.add(disc, dome); saucer.position.y = 0.7;
    g.add(pad, ring, saucer); g.userData.spin = saucer;
  } else { // fountain
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.45, w * 0.5, 0.3, 16), M(0xb0b8c0));
    basin.position.y = 0.15;
    const water = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.4, w * 0.4, 0.06, 16),
      new THREE.MeshStandardMaterial({ color: 0x2a8ad0, roughness: 0.2, metalness: 0.3 }));
    water.position.y = 0.3;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.5, 8), M(0xb0b8c0));
    stem.position.y = 0.55;
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x66c2ff, emissive: 0x2277bb, emissiveIntensity: 0.5 }));
    top.position.y = 0.9;
    g.add(basin, water, stem, top);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// Keyboard shortcut for build mode
window.addEventListener('keydown', e => {
  if ((e.key === 'b' || e.key === 'B') && E.cfg && E.cfg.home &&
      document.getElementById('villageShop').style.display !== 'block') toggleBuildMode();
});
