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
  spawnHomeAliens(scene);
}

// ── Alien visitors ──────────────────────────────────────────────
// Find an open (walkable) tile near a target, spiralling outward.
function openTileNear(cx, cz) {
  const walkable = (x, z) => x > 0 && z > 0 && x < E.cols - 1 && z < E.rows - 1 && (E.map[z][x] === 0 || E.map[z][x] === 2);
  for (let r = 1; r < 8; r++)
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const x = Math.floor(cx) + dx, z = Math.floor(cz) + dz;
      if (walkable(x, z)) return { x: x + 0.5, z: z + 0.5 };
    }
  return { x: cx, z: cz };
}
function randomOpenTile() {
  let gx, gy, t = 0;
  do { gx = 2 + Math.floor(Math.random() * (E.cols - 4)); gy = 2 + Math.floor(Math.random() * (E.rows - 4)); t++; }
  while (E.map[gy][gx] !== 0 && E.map[gy][gx] !== 2 && t < 60);
  return { x: gx + 0.5, z: gy + 0.5 };
}

function spawnHomeAliens(scene) {
  E.homeAliens = [];
  if (typeof P5_ALIEN_POOL === 'undefined') return;
  const huts = (E.homeMeshes || []).filter(b => b.type === 'hut');
  const hasLanding = (save.homePlanet.buildings || []).some(b => b.type === 'landing');
  // Each Space Hut houses one alien resident; a Landing Pad brings a couple
  // of extra wandering visitors. (At least one curious visitor even with no huts.)
  let count = huts.length + (hasLanding ? 2 : 0);
  if (count === 0) count = 1;
  count = Math.min(count, P5_ALIEN_POOL.length);
  const pool = [...P5_ALIEN_POOL];
  for (let i = 0; i < count && pool.length; i++) {
    const tpl = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const spot = (i < huts.length) ? openTileNear(huts[i].x, huts[i].z) : randomOpenTile();
    const mesh = makeAlienMesh(tpl.color);
    mesh.position.set(spot.x, 0.05, spot.z);
    scene.add(mesh);
    E.homeAliens.push({
      data: tpl, mesh, x: spot.x, z: spot.z, homeX: spot.x, homeZ: spot.z, resident: i < huts.length,
      dir: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
      wander: Math.random() * 3, bob: Math.random() * 6, marker: mesh.userData.marker
    });
  }
}

// Move a new alien into a freshly-built hut (called when a hut is placed)
function addResidentAlien(cx, cz) {
  if (typeof P5_ALIEN_POOL === 'undefined' || !E.homeAliens) return;
  const tpl = P5_ALIEN_POOL[Math.floor(Math.random() * P5_ALIEN_POOL.length)];
  const spot = openTileNear(cx, cz);
  const mesh = makeAlienMesh(tpl.color);
  mesh.position.set(spot.x, 0.05, spot.z); E.scene.add(mesh);
  E.homeAliens.push({
    data: tpl, mesh, x: spot.x, z: spot.z, homeX: spot.x, homeZ: spot.z, resident: true,
    dir: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
    wander: Math.random() * 3, bob: Math.random() * 6, marker: mesh.userData.marker
  });
  showToast('👽 New Resident!', 'An alien moved into your Space Hut!');
}

function makeAlienMesh(colorHex) {
  const g = new THREE.Group();
  const col = new THREE.Color(colorHex);
  const skin = new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, emissive: col.clone().multiplyScalar(0.25), emissiveIntensity: 0.5 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), skin);
  body.scale.set(1, 1.25, 1); body.position.y = 0.42;
  const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  eyeW.position.set(0, 0.58, 0.22);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshStandardMaterial({ color: 0x111111 }));
  pupil.position.set(0, 0.58, 0.36);
  const antennae = [-1, 1].map(sx => {
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5), skin);
    a.position.set(sx * 0.13, 0.86, 0); a.rotation.z = sx * 0.32;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1 }));
    tip.position.set(sx * 0.18, 1.0, 0); g.add(tip); return a;
  });
  const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x88ccff, emissiveIntensity: 1 }));
  marker.position.y = 1.3;
  g.add(body, eyeW, pupil, ...antennae, marker);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.marker = marker;
  return g;
}

function updateHomeAliens(dt) {
  if (!E.homeAliens) return;
  const solid = (x, z) => {
    const tx = Math.floor(x), tz = Math.floor(z);
    if (tx < 1 || tz < 1 || tx >= E.cols - 1 || tz >= E.rows - 1) return true;
    return E.cfg.solid.includes(E.map[tz][tx]);
  };
  const step = (a, spd) => {
    const nx = a.x + a.dir.x * spd * dt, nz = a.z + a.dir.z * spd * dt;
    if (!solid(nx, a.z)) a.x = nx; else a.dir.x *= -1;
    if (!solid(a.x, nz)) a.z = nz; else a.dir.z *= -1;
    a.mesh.position.x = a.x; a.mesh.position.z = a.z;
    a.mesh.position.y = 0.05 + Math.abs(Math.sin(a.bob * 3)) * 0.06;
    a.mesh.rotation.y = Math.atan2(a.dir.x, a.dir.z);
  };
  E.homeAliens.forEach(a => {
    a.bob += dt;
    if (a.marker && a.mesh.visible) { a.marker.rotation.y += dt * 2; a.marker.position.y = 1.3 + Math.sin(a.bob * 2) * 0.1; }

    if (a.resident) {
      a.stateTimer = (a.stateTimer == null ? 5 + Math.random() * 6 : a.stateTimer) - dt;
      if (a.state === 'in') {                         // tucked inside the hut
        if (a.stateTimer <= 0) {                       // come back out
          a.state = 'out'; a.x = a.homeX; a.z = a.homeZ;
          a.mesh.position.set(a.x, 0.05, a.z); a.mesh.visible = true;
          a.dir.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
          a.stateTimer = 6 + Math.random() * 7;
        }
        return;
      }
      if (a.state === 'toHome') {                       // walking home to duck inside
        a.dir.set(a.homeX - a.x, 0, a.homeZ - a.z);
        const d = a.dir.length(); a.dir.normalize();
        step(a, 1.1);
        if (d < 0.5) { a.state = 'in'; a.mesh.visible = false; a.stateTimer = 3 + Math.random() * 4; }
        return;
      }
      // state 'out': occasionally head home; otherwise wander nearby
      if (a.stateTimer <= 0) { a.state = 'toHome'; return; }
      a.wander = (a.wander == null ? 0 : a.wander) - dt;
      if (a.wander <= 0) {
        if (Math.hypot(a.homeX - a.x, a.homeZ - a.z) > 3.2) a.dir.set(a.homeX - a.x, 0, a.homeZ - a.z).normalize();
        else a.dir.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
        a.wander = 1.5 + Math.random() * 2;
      }
      step(a, 0.7);
      return;
    }

    // non-resident wanderers
    a.wander -= dt;
    if (a.wander <= 0) { a.dir.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(); a.wander = 1.5 + Math.random() * 2.5; }
    step(a, 0.7);
  });
}

function homeAlienNear(worldPoint) {
  if (!E.homeAliens) return null;
  const p = E.player.position;
  for (const a of E.homeAliens) {
    if (a.state === 'in' || !a.mesh.visible) continue; // hidden inside its hut
    const here = new THREE.Vector3(a.x, 0.5, a.z);
    if (p.distanceTo(here) < 2.0 && (!worldPoint || worldPoint.distanceTo(here) < 1.4)) return a;
  }
  return null;
}

function useHomeAlien(a) {
  const d = a.data;
  const icons = { rock: '🪨', plant: '🌿', crystal: '💎', banana: '🍌', coins: '🪙' };
  if (d.minigame) {
    showMsg(`${d.emoji} ${d.name}`, d.dialog + '\n\nCome play at the arcade?',
      () => { if (typeof openArcade === 'function') { openArcade(); openArcadeGame('rps'); } }, 'Play RPS', 'No thanks');
    return;
  }
  if (d.trade) {
    const t = d.trade;
    const has = (save.resources[t.give] || 0) >= t.giveAmt;
    showMsg(`${d.emoji} ${d.name}`, d.dialog + `\n\nTrade: ${t.giveAmt} ${icons[t.give]} → ${t.rewardAmt} ${icons[t.reward]}`,
      has ? () => {
        save.resources[t.give] -= t.giveAmt;
        if (t.reward === 'coins') save.spaceCoins = (save.spaceCoins || 0) + t.rewardAmt;
        else save.resources[t.reward] = (save.resources[t.reward] || 0) + t.rewardAmt;
        persist(); updateHUD();
        showToast('✅ Trade Complete!', `You received ${t.rewardAmt} ${icons[t.reward]}!`);
      } : null,
      has ? 'Trade!' : 'Close',
      has ? 'No thanks' : undefined);
    return;
  }
  showMsg(`${d.emoji} ${d.name}`, d.dialog);
}

function placeBuildingMesh(scene, type, w, h, gx, gy) {
  const mesh = makeBuildingMesh(type, w, h);
  mesh.position.set(gx + w / 2, 0.06, gy + h / 2);
  scene.add(mesh);
  E.homeMeshes.push({ mesh, type, x: gx + w / 2, z: gy + h / 2 });
  if (type === 'trophy') addTrophyStatues(scene, gx + w / 2, gy + h / 2);
  return mesh;
}

// How many times the player has beaten this planet's boss (Trophy tier).
function trophyTier(planet) {
  const wins = (save.bossWins && save.bossWins[planet]) || ((save.planetsCleared || []).includes(planet) ? 1 : 0);
  return Math.min(3, wins);
}
// Bronze / silver / gold metal for a tier (1/2/3).
function trophyTierMetal(tier) {
  if (tier >= 3) return new THREE.MeshStandardMaterial({ color: 0xffd54a, metalness: 0.85, roughness: 0.22, emissive: 0x3a2c00, emissiveIntensity: 0.25 });
  if (tier === 2) return new THREE.MeshStandardMaterial({ color: 0xd6d9e2, metalness: 0.8, roughness: 0.28, emissive: 0x22242a, emissiveIntensity: 0.2 });
  return new THREE.MeshStandardMaterial({ color: 0xcd7f32, metalness: 0.75, roughness: 0.35, emissive: 0x2a1400, emissiveIntensity: 0.2 });
}

// A statue of a defeated boss cast in its trophy metal (bronze/silver/gold).
function makeTrophyStatue(planet) {
  const g = new THREE.Group();
  const tier = trophyTier(planet);
  const metal = trophyTierMetal(tier);
  const stone = new THREE.MeshStandardMaterial({ color: 0x3a352c, roughness: 0.9, metalness: 0.1 });
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.5, 12), stone); ped.position.y = 0.25; ped.castShadow = true;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.04), metal); plate.position.set(0, 0.34, 0.32);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 18), metal); ring.rotation.x = Math.PI / 2; ring.position.y = 0.5;
  g.add(ped, plate, ring);
  let fig = null;
  try {
    if (planet === 2 && typeof makeApeBossMesh === 'function') fig = makeApeBossMesh(1, 0x888888);
    else if (planet === 3 && typeof makeYetiMesh === 'function') fig = makeYetiMesh(1, 0x888888);
    else if (planet === 4 && typeof makeOctopusMesh === 'function') fig = makeOctopusMesh(1, 0x888888);
    else fig = makeAlienMesh(0x888888); // Area 51 (planet 1)
  } catch (e) { fig = null; }
  if (fig) {
    fig.traverse(o => { if (o.isMesh) { o.material = metal; o.castShadow = true; } });
    fig.scale.setScalar(0.42); fig.position.y = 0.5; g.add(fig);
  }
  return g;
}

// Line up a statue for each boss the player has beaten, in front of the hall.
function addTrophyStatues(scene, cx, cz) {
  const cleared = (save.planetsCleared || []).filter(n => n >= 1 && n <= 4).sort();
  if (!cleared.length) return;
  const spread = 1.15, startX = cx - (cleared.length - 1) * spread / 2;
  cleared.forEach((p, i) => {
    const st = makeTrophyStatue(p);
    st.position.set(startX + i * spread, 0, cz + 1.9);
    scene.add(st);
  });
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
        if (typeof SFX !== 'undefined') SFX.build();
        persist(); updateHUD();
        closeShop();
        if (b.type === 'hut') { addResidentAlien(gx + b.w / 2, gy + b.h / 2); }
        else showToast(b.emoji + ' Built!', b.name + ' placed on your home base.');
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
    case 'arcade':
      if (typeof enterInterior === 'function') enterInterior('arcade');
      else if (typeof openArcade === 'function') openArcade();
      else playHomeArcade();
      break;
    case 'hut':
      showToast('🏠 Space Hut', 'Home to a friendly alien visitor. Knock and say hi!'); break;
    case 'farm': showToast('🌾 Star Farm', 'Harvested on arrival. Come back after your next mission!'); break;
    case 'landing': showToast('🛬 Landing Pad', 'More visitors will arrive thanks to the landing pad!'); break;
    case 'fountain': showToast('⛲ Fountain', 'The water sparkles peacefully.'); break;
    case 'trophy':
      if (typeof enterInterior === 'function') enterInterior('trophy');
      else openTrophyHall();
      break;
    case 'observatory': openObservatory(); break;
  }
}

// ── Trophy Hall interior — a walk-in museum of your defeated bosses ─
function openTrophyHall() {
  gamePaused = true;
  const list = (typeof P5_TROPHIES !== 'undefined') ? P5_TROPHIES : [];
  const cleared = save.planetsCleared || [];
  const earned = list.filter(t => cleared.includes(t.planet)).length;
  document.getElementById('trophySub').textContent =
    earned === 0 ? 'The plinths stand empty. Go defeat a boss to fill them!'
    : earned === list.length ? `Every foe vanquished — all ${list.length} trophies on display. Legendary!`
    : `${earned} of ${list.length} trophies claimed. Empty cases await your next victory.`;
  const body = document.getElementById('trophyBody');
  body.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'trophy-grid';
  list.forEach(t => {
    const has = cleared.includes(t.planet);
    const c = document.createElement('div');
    c.className = 'trophy-case' + (has ? '' : ' locked');
    c.innerHTML =
      `<div class="tc-emoji">${has ? t.emoji : '❔'}</div>` +
      `<div class="tc-plinth"></div>` +
      `<div class="tc-name">${has ? t.name : '???'}</div>` +
      `<div class="tc-desc">${has ? t.desc : "Defeat this planet's boss to earn this trophy."}</div>` +
      `<div class="tc-badge ${has ? 'earned' : 'locked'}">${has ? '🏆 Vanquished' : '🔒 Locked'}</div>`;
    grid.appendChild(c);
  });
  body.appendChild(grid);
  document.getElementById('trophyCloseBtn').onclick = closeTrophyHall;
  document.getElementById('trophyPanel').style.display = 'block';
}
function closeTrophyHall() {
  document.getElementById('trophyPanel').style.display = 'none';
  gamePaused = false;
}

// ── Observatory — fast-travel to any unlocked planet from home ────
function openObservatory() {
  gamePaused = true;
  document.getElementById('shopMerchantName').textContent = '🔭 Observatory';
  document.getElementById('shopMerchantDialog').textContent = '"Chart a course, explorer — where shall we launch?"';
  const grid = document.getElementById('shopGrid');
  grid.innerHTML = '';
  const worlds = [
    { n: 1, emoji: '🌍', name: 'Earth — Area 51' }, { n: 2, emoji: '🌴', name: 'Jungle Zorbax' },
    { n: 3, emoji: '❄️', name: 'Tundra Frigia' }, { n: 4, emoji: '🌊', name: 'Aquatic Neptuna' }
  ];
  worlds.forEach(p => {
    const locked = (typeof isLocked === 'function') ? isLocked(p.n) : false;
    const cleared = (save.planetsCleared || []).includes(p.n);
    const el = document.createElement('div');
    el.className = 'shop-item' + (locked ? ' shop-disabled' : '');
    el.innerHTML = `<div class="shop-item-name">${p.emoji} ${p.name}</div>
      <div class="shop-item-desc">${locked ? '🔒 Clear the previous world first' : cleared ? '✓ Cleared — revisit anytime' : '▶ Launch mission'}</div>
      <div class="shop-cost">${locked ? '<span class="lacks">Locked</span>' : '<span class="has">🚀 Launch</span>'}</div>`;
    if (!locked) el.onclick = () => {
      closeShop();
      if (typeof playTransitionCutscene === 'function') playTransitionCutscene(5, p.n, () => startPlanet(p.n));
      else startPlanet(p.n);
    };
    grid.appendChild(el);
  });
  const close = document.createElement('div');
  close.className = 'shop-item';
  close.innerHTML = '<div class="shop-item-name">❌ Cancel</div><div class="shop-item-desc">Stay at home base</div>';
  close.onclick = () => closeShop();
  grid.appendChild(close);
  document.getElementById('villageShop').style.display = 'block';
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
  updateHomeAliens(dt);
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
  } else if (type === 'trophy') {
    // A marble museum: stepped base, columns, pediment, gold trophy on top
    const marble = M(0xe8e6de, 0.6), gold = new THREE.MeshStandardMaterial({ color: 0xffd54a, roughness: 0.35, metalness: 0.6, emissive: 0x5a4300, emissiveIntensity: 0.3 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.24, h * 0.92), marble); base.position.y = 0.12;
    const step = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.16, h * 0.78), marble); step.position.y = 0.3;
    g.add(base, step);
    const colGeo = new THREE.CylinderGeometry(0.1, 0.11, 1.0, 12);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
      const c = new THREE.Mesh(colGeo, marble); c.position.set(sx * w * 0.3, 0.9, sz * h * 0.3); g.add(c);
    });
    const arch = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.16, h * 0.82), marble); arch.position.y = 1.46;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.62, 0.5, 4), marble); roof.position.y = 1.78; roof.rotation.y = Math.PI / 4;
    g.add(arch, roof);
    // gold trophy cup on the peak
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.06, 0.22, 12), gold); cup.position.y = 2.14;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.12, 8), gold); stem.position.y = 1.98;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 10), gold); foot.position.y = 1.9;
    g.add(cup, stem, foot); g.userData.spin = cup;
  } else if (type === 'observatory') {
    // A silver domed observatory with a telescope poking out of the slit
    const wallMat = M(0xd8dce4, 0.6), domeMat = new THREE.MeshStandardMaterial({ color: 0xb8c0cc, roughness: 0.35, metalness: 0.5 });
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.42, w * 0.46, 0.9, 20), wallMat); drum.position.y = 0.45;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(w * 0.44, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), domeMat); dome.position.y = 0.9;
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.9, 12), M(0x2a2a3a, 0.4)); scope.position.set(0, 1.2, w * 0.18); scope.rotation.x = -0.9;
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 12), new THREE.MeshStandardMaterial({ color: 0x88ddff, emissive: 0x2277bb, emissiveIntensity: 0.7 })); lens.position.set(0, 1.5, w * 0.42); lens.rotation.x = -0.9;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(w * 0.4, 0.04, 8, 24), new THREE.MeshStandardMaterial({ color: 0x66c2ff, emissive: 0x2277bb, emissiveIntensity: 0.9 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.9;
    g.add(drum, dome, scope, lens, ring); g.userData.spin = dome;
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
