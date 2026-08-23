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
    const tileVal = info.walkable ? 2 : 5; // paths stay walkable
    for (let dr = 0; dr < info.h; dr++)
      for (let dc = 0; dc < info.w; dc++)
        if (E.map[b.gridY + dr] && E.map[b.gridY + dr][b.gridX + dc] !== undefined) E.map[b.gridY + dr][b.gridX + dc] = tileVal;
    placeBuildingMesh(scene, b.type, info.w, info.h, b.gridX, b.gridY);
  });
  applyHomeFarmsOnVisit();
  spawnHomeAliens(scene);
  addHomeSky(scene);
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
  // Each Space Hut houses one alien resident; each Landing Pad brings a few
  // extra wandering visitors. A couple of curious visitors always drop by.
  const landings = (save.homePlanet.buildings || []).filter(b => b.type === 'landing').length;
  let count = huts.length + landings * 3 + 2;
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

// ── Home base day / night cycle ─────────────────────────────────
const HOME_DAY_LEN = 120; // seconds for a full day→night→day loop
// keyframes: p (0..1), sky/fog colour, [ambient colour, intensity], [sun colour, intensity]
const HOME_SKY = [
  { p: 0.00, sky: 0x0b1030, amb: [0x35406a, 0.5], sun: [0x2a3a66, 0.15] }, // deep night
  { p: 0.14, sky: 0x2b3b6e, amb: [0x6a5a72, 0.7], sun: [0xffb066, 0.55] }, // dawn
  { p: 0.28, sky: 0x8fc7ff, amb: [0xafc4e6, 1.0], sun: [0xfff2c8, 1.2] },  // morning
  { p: 0.50, sky: 0x9fd0ff, amb: [0xbcd2ee, 1.1], sun: [0xfff6e0, 1.3] },  // midday
  { p: 0.70, sky: 0x6f88c8, amb: [0x9a8a92, 0.9], sun: [0xffd090, 1.0] },  // afternoon
  { p: 0.82, sky: 0xd9713a, amb: [0x8a6a72, 0.72], sun: [0xff8a4a, 0.7] }, // sunset
  { p: 0.92, sky: 0x241a44, amb: [0x4a4a72, 0.55], sun: [0x6a5a80, 0.32] },// dusk
  { p: 1.00, sky: 0x0b1030, amb: [0x35406a, 0.5], sun: [0x2a3a66, 0.15] }  // back to night
];
function homeSkySample(p) {
  const K = HOME_SKY;
  for (let i = 0; i < K.length - 1; i++) {
    if (p >= K[i].p && p <= K[i + 1].p) {
      const f = (p - K[i].p) / (K[i + 1].p - K[i].p || 1);
      const lerpC = (a, b) => new THREE.Color(a).lerp(new THREE.Color(b), f);
      return {
        sky: lerpC(K[i].sky, K[i + 1].sky),
        ambC: lerpC(K[i].amb[0], K[i + 1].amb[0]),
        ambI: K[i].amb[1] + (K[i + 1].amb[1] - K[i].amb[1]) * f,
        sunC: lerpC(K[i].sun[0], K[i + 1].sun[0]),
        sunI: K[i].sun[1] + (K[i + 1].sun[1] - K[i].sun[1]) * f
      };
    }
  }
  const L = HOME_SKY[HOME_SKY.length - 1];
  return { sky: new THREE.Color(L.sky), ambC: new THREE.Color(L.amb[0]), ambI: L.amb[1], sunC: new THREE.Color(L.sun[0]), sunI: L.sun[1] };
}
// Starfield + sun/moon disc, rebuilt whenever the home base loads
function addHomeSky(scene) {
  const n = 220, geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 45 + Math.random() * 35, a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI * 0.5;
    pos[i * 3] = E.cols / 2 + Math.cos(a) * Math.sin(e) * r;
    pos[i * 3 + 1] = Math.cos(e) * r + 12;
    pos[i * 3 + 2] = E.rows / 2 + Math.sin(a) * Math.sin(e) * r;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  scene.add(stars); E.homeStars = stars;
  const disc = new THREE.Mesh(new THREE.SphereGeometry(2.4, 18, 14), new THREE.MeshBasicMaterial({ color: 0xfff2b0, fog: false }));
  scene.add(disc); E.homeSun = disc;
}
function updateHomeDayNight(dt) {
  if (!E.scene) return;
  const p = (E.time % HOME_DAY_LEN) / HOME_DAY_LEN;
  const s = homeSkySample(p);
  if (E.scene.background && E.scene.background.copy) E.scene.background.copy(s.sky);
  if (E.scene.fog) E.scene.fog.color.copy(s.sky);
  if (E.ambientLight) { E.ambientLight.color.copy(s.ambC); E.ambientLight.intensity = s.ambI; }
  if (E.sunLight) {
    E.sunLight.color.copy(s.sunC); E.sunLight.intensity = s.sunI;
    const ang = p * Math.PI * 2 - Math.PI / 2; // rise → overhead → set
    E.sunLight.position.set(E.cols / 2 + Math.cos(ang) * 16, Math.max(3, Math.sin(ang) * 18 + 5), E.rows / 2 + 8);
  }
  const night = Math.max(0, Math.min(1, (0.55 - s.sunI) / 0.45)); // 0 by day, 1 deep night
  if (E.homeStars) { E.homeStars.material.opacity = night * 0.9; E.homeStars.visible = night > 0.03; E.homeStars.rotation.y += dt * 0.008; }
  if (E.homeSun) {
    const ang = p * Math.PI * 2 - Math.PI / 2;
    E.homeSun.position.set(E.cols / 2 + Math.cos(ang) * 26, Math.sin(ang) * 22 + 3, E.rows / 2 - 22);
    E.homeSun.visible = E.homeSun.position.y > -1;
    E.homeSun.material.color.set(s.sunI > 0.6 ? 0xfff2b0 : 0xd6e4ff); // sun by day, pale moon by night
  }
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
  const fire = (E.homeMeshes || []).find(b => b.type === 'campfire');
  const nightFire = (fire && isHomeNight()) ? fire : null;
  E.homeAliens.forEach(a => {
    a.bob += dt;
    if (a.marker && a.mesh.visible) { a.marker.rotation.y += dt * 2; a.marker.position.y = 1.3 + Math.sin(a.bob * 2) * 0.1; }

    if (nightFire) {                                   // gather around the campfire at night
      if (!a.mesh.visible) { a.mesh.visible = true; a.state = 'out'; }
      if (a._fireAng == null) a._fireAng = Math.random() * Math.PI * 2;
      const tx = nightFire.x + Math.cos(a._fireAng) * 1.15, tz = nightFire.z + Math.sin(a._fireAng) * 1.15;
      const dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
      if (d > 0.18) { a.dir.set(dx, 0, dz).normalize(); step(a, 0.9); }
      else { a.mesh.position.set(a.x, 0.05, a.z); a.mesh.rotation.y = Math.atan2(nightFire.x - a.x, nightFire.z - a.z); }
      return;
    }

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
    else if (planet === 6 && typeof makeMagmaBossMesh === 'function') fig = makeMagmaBossMesh(1, 0x888888);
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
  const cleared = (save.planetsCleared || []).filter(n => n >= 1 && n <= 6).sort();
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
  homeMoveTarget = null; clearMoveGhost(); // cancel any in-progress relocation
  updateBuildButton();
  showToast(homeBuildMode ? '🔨 Build Mode ON' : '🚶 Explore Mode',
    homeBuildMode ? 'Click grass to build. Click a building to move or remove it.' : 'Walk around your base. Press Space by a building to use it.');
}

function updateBuildButton() {
  const btn = document.getElementById('buildBtn');
  if (!btn) return;
  const onHome = !!(E.cfg && E.cfg.home);
  btn.style.display = onHome ? '' : 'none';
  btn.textContent = homeBuildMode ? '🔨 Building… [B]' : '🔨 Build [B]';
  btn.style.background = homeBuildMode ? 'rgba(200,120,20,0.9)' : '#181830';
}

let homeMoveTarget = null; // a building currently being relocated

// ── Ghost preview that follows the cursor while relocating ──────
function startMoveGhost(b) {
  clearMoveGhost();
  const info = P5_BUILDINGS.find(pb => pb.type === b.type);
  if (!info || !E.scene) return;
  const g = new THREE.Group();
  const bldg = makeBuildingMesh(b.type, info.w, info.h);
  bldg.position.y = 0.06;
  bldg.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.45; o.castShadow = false; } });
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(info.w, info.h),
    new THREE.MeshBasicMaterial({ color: 0x44ff66, transparent: true, opacity: 0.4, depthWrite: false }));
  pad.rotation.x = -Math.PI / 2; pad.position.y = 0.04;
  g.add(pad, bldg);
  E.scene.add(g);
  E.moveGhost = { group: g, pad, w: info.w, h: info.h, target: b };
  updateMoveGhost(b.gridX, b.gridY);
}
function moveGhostFits(gx, gy) {
  const mg = E.moveGhost; if (!mg) return false;
  const b = mg.target;
  for (let dr = 0; dr < mg.h; dr++)
    for (let dc = 0; dc < mg.w; dc++) {
      const x = gx + dc, z = gy + dr;
      const own = (x >= b.gridX && x < b.gridX + mg.w && z >= b.gridY && z < b.gridY + mg.h);
      if (x < 1 || z < 1 || x >= E.cols - 1 || z >= E.rows - 1 || (!own && E.map[z][x] !== 0)) return false;
    }
  return true;
}
function updateMoveGhost(gx, gy) {
  const mg = E.moveGhost; if (!mg) return;
  mg.group.position.set(gx + mg.w / 2, 0, gy + mg.h / 2);
  mg.group.visible = true;
  mg.pad.material.color.setHex(moveGhostFits(gx, gy) ? 0x44ff66 : 0xff4444);
}
function clearMoveGhost() {
  const mg = E.moveGhost; if (!mg) return;
  if (E.scene && mg.group) {
    E.scene.remove(mg.group);
    mg.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
  }
  E.moveGhost = null;
}
// The ghost tracks the cursor over the yard
window.addEventListener('pointermove', e => {
  if (!E.moveGhost || !E.renderer || !E.camera || gamePaused) return;
  const rect = E.renderer.domElement.getBoundingClientRect();
  const px = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const py = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  E.raycaster.setFromCamera({ x: px, y: py }, E.camera);
  const hit = new THREE.Vector3();
  if (E.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit))
    updateMoveGhost(Math.floor(hit.x), Math.floor(hit.z));
});

// Which saved building (if any) covers a given tile
function buildingAtTile(gx, gy) {
  const list = (save.homePlanet && save.homePlanet.buildings) || [];
  return list.find(b => {
    const info = P5_BUILDINGS.find(pb => pb.type === b.type);
    return info && gx >= b.gridX && gx < b.gridX + info.w && gy >= b.gridY && gy < b.gridY + info.h;
  }) || null;
}

// Called from the engine when the player clicks the ground in build mode
function homeBuildClick(worldPoint) {
  const gx = Math.floor(worldPoint.x), gy = Math.floor(worldPoint.z);
  if (homeMoveTarget) { tryMoveBuilding(gx, gy); return; }   // dropping a relocated building
  const hit = buildingAtTile(gx, gy);
  if (hit) { openManageBuilding(hit); return; }              // clicked an existing building
  openHomeBuildMenu(gx, gy);                                 // empty tile → place new
}

// Move / Remove menu for an existing building
function openManageBuilding(b) {
  gamePaused = true;
  const info = P5_BUILDINGS.find(pb => pb.type === b.type) || {};
  const refund = Math.floor((info.cost || 0) * 0.5);
  document.getElementById('shopMerchantName').textContent = (info.emoji || '🏠') + ' ' + (info.name || 'Building');
  document.getElementById('shopMerchantDialog').textContent = '"Move it, or tear it down for a partial refund."';
  const grid = document.getElementById('shopGrid');
  grid.innerHTML = '';
  const item = (name, desc, cb) => {
    const el = document.createElement('div');
    el.className = 'shop-item';
    el.innerHTML = `<div class="shop-item-name">${name}</div><div class="shop-item-desc">${desc}</div>`;
    el.onclick = cb; grid.appendChild(el);
  };
  item('↔️ Move', 'Then click a grass tile to place it', () => {
    homeMoveTarget = b; closeShop();
    startMoveGhost(b);
    showToast('↔️ Moving ' + (info.name || 'building'), 'Move the ghost and click to set it down. Green = OK, red = blocked. (B to cancel.)');
  });
  item('🗑️ Remove', `Tear it down — refund ${refund} 🪙`, () => {
    closeShop();
    showMsg('🗑️ Remove ' + (info.name || 'building') + '?',
      'This tears it down for good. You\'ll get ' + refund + ' 🪙 back.',
      () => removeBuilding(b, refund),
      'Tear it down', 'Keep it');
  });
  item('❌ Cancel', 'Leave it where it is', () => closeShop());
  document.getElementById('villageShop').style.display = 'block';
}

// ── Quest Board — aliens post fetch tasks that pay Space Coins ───
function generateHomeQuest() {
  const gives = (typeof P5_QUEST_GIVES !== 'undefined') ? P5_QUEST_GIVES : [{ res: 'rock', label: '🪨', base: 5 }];
  const g = gives[Math.floor(Math.random() * gives.length)];
  const amt = 2 + Math.floor(Math.random() * 7); // 2..8
  let coins = Math.round((amt * g.base) * (0.9 + Math.random() * 0.5) / 5) * 5;
  coins = Math.max(15, coins);
  const pool = (typeof P5_ALIEN_POOL !== 'undefined') ? P5_ALIEN_POOL : [{ emoji: '👽', name: 'Visitor' }];
  const giver = pool[Math.floor(Math.random() * pool.length)];
  return { give: g.res, label: g.label, amt, rewardAmt: coins, giver: giver.emoji + ' ' + giver.name };
}
function ensureHomeQuests() {
  if (!save.homePlanet.quests) save.homePlanet.quests = [];
  while (save.homePlanet.quests.length < 3) save.homePlanet.quests.push(generateHomeQuest());
}
function openQuestBoard() {
  gamePaused = true;
  ensureHomeQuests();
  document.getElementById('shopMerchantName').textContent = '📋 Quest Board';
  document.getElementById('shopMerchantDialog').textContent = '"The visitors need supplies — help them out for Space Coins!"';
  renderQuestBoard();
  document.getElementById('villageShop').style.display = 'block';
}
function renderQuestBoard() {
  const grid = document.getElementById('shopGrid');
  grid.innerHTML = '';
  const icons = { rock: '🪨', plant: '🌿', crystal: '💎', banana: '🍌', fuel: '⚡' };
  (save.homePlanet.quests || []).forEach((q, i) => {
    const have = save.resources[q.give] || 0, can = have >= q.amt;
    const el = document.createElement('div');
    el.className = 'shop-item' + (can ? '' : ' shop-disabled');
    el.innerHTML = `<div class="shop-item-name">${q.giver} wants…</div>
      <div class="shop-item-desc">Bring ${q.amt} ${icons[q.give] || ''} → ${q.rewardAmt} 🪙<br>
        <span style="color:${can ? '#5d9' : '#f77'}">You have ${have}/${q.amt}</span></div>
      <div class="shop-cost">${can ? '<span class="has">✓ Turn in</span>' : '<span class="lacks">Gather more</span>'}</div>`;
    if (can) el.onclick = () => completeHomeQuest(i);
    grid.appendChild(el);
  });
  const close = document.createElement('div');
  close.className = 'shop-item';
  close.innerHTML = '<div class="shop-item-name">❌ Close</div><div class="shop-item-desc">Come back with supplies</div>';
  close.onclick = () => closeShop();
  grid.appendChild(close);
}
function completeHomeQuest(i) {
  const q = save.homePlanet.quests[i];
  if (!q || (save.resources[q.give] || 0) < q.amt) return;
  save.resources[q.give] -= q.amt;
  save.spaceCoins = (save.spaceCoins || 0) + q.rewardAmt;
  if (typeof SFX !== 'undefined' && SFX.coin) SFX.coin();
  save.homePlanet.quests[i] = generateHomeQuest(); // a fresh task takes its place
  persist(); updateHUD(); renderQuestBoard();
  showToast('✅ Quest Complete!', 'You earned ' + q.rewardAmt + ' 🪙 from ' + q.giver + '!');
}

// ── Collectibles — claw-machine prizes + greenhouse crops ───────
const COLLECTIBLES = [
  // Claw-machine prizes
  { id: 'teddy',      name: 'Teddy Bear',  emoji: '🧸', src: 'claw' },
  { id: 'dino',       name: 'Dino Toy',    emoji: '🦖', src: 'claw' },
  { id: 'robot_toy',  name: 'Toy Robot',   emoji: '🤖', src: 'claw' },
  { id: 'balloon',    name: 'Balloon',     emoji: '🎈', src: 'claw' },
  { id: 'yoyo',       name: 'Yo-Yo',       emoji: '🪀', src: 'claw' },
  { id: 'alien_toy',  name: 'Alien Plush', emoji: '👾', src: 'claw' },
  { id: 'star_plush', name: 'Star Plush',  emoji: '⭐', src: 'claw' },
  { id: 'gem_toy',    name: 'Shiny Gem',   emoji: '💎', src: 'claw' },
  { id: 'rocket_toy', name: 'Toy Rocket',  emoji: '🚀', src: 'claw' },
  { id: 'crown_toy',  name: 'Tiny Crown',  emoji: '👑', src: 'claw' },
  // Greenhouse crops
  { id: 'star_berry',  name: 'Star Berry',   emoji: '🍓', src: 'crop' },
  { id: 'moon_melon',  name: 'Moon Melon',   emoji: '🍈', src: 'crop' },
  { id: 'sun_bloom',   name: 'Sun Bloom',    emoji: '🌻', src: 'crop' },
  { id: 'void_grape',  name: 'Void Grapes',  emoji: '🍇', src: 'crop' },
  { id: 'ember_pepper',name: 'Ember Pepper', emoji: '🌶️', src: 'crop' },
  { id: 'glow_shroom', name: 'Glow Shroom',  emoji: '🍄', src: 'crop' }
];
function collectiblesBySrc(src) { return COLLECTIBLES.filter(c => c.src === src); }
function getCollectible(id) { return COLLECTIBLES.find(c => c.id === id); }
function randomCollectible(src) { const a = collectiblesBySrc(src); return a[Math.floor(Math.random() * a.length)]; }
function addCollectible(id, n) { if (!save.collectibles) save.collectibles = {}; save.collectibles[id] = (save.collectibles[id] || 0) + (n || 1); persist(); }

function openCollection() {
  gamePaused = true;
  if (!save.collectibles) save.collectibles = {};
  const owned = COLLECTIBLES.filter(c => save.collectibles[c.id]).length;
  document.getElementById('shopMerchantName').textContent = '🏆 My Collection';
  document.getElementById('shopMerchantDialog').textContent = `"${owned}/${COLLECTIBLES.length} unique treasures gathered."`;
  const grid = document.getElementById('shopGrid');
  grid.innerHTML = '';
  COLLECTIBLES.forEach(c => {
    const cnt = save.collectibles[c.id] || 0;
    const el = document.createElement('div');
    el.className = 'shop-item' + (cnt ? '' : ' shop-disabled');
    el.innerHTML = `<div class="shop-item-name">${cnt ? c.emoji : '❔'} ${cnt ? c.name : '???'}</div>
      <div class="shop-item-desc">${c.src === 'claw' ? '🕹️ Claw prize' : '🌱 Greenhouse crop'}</div>
      <div class="shop-cost">${cnt ? '<span class="has">×' + cnt + '</span>' : '<span class="lacks">not found</span>'}</div>`;
    grid.appendChild(el);
  });
  const close = document.createElement('div');
  close.className = 'shop-item';
  close.innerHTML = '<div class="shop-item-name">❌ Close</div><div class="shop-item-desc">Keep collecting!</div>';
  close.onclick = () => closeShop();
  grid.appendChild(close);
  document.getElementById('villageShop').style.display = 'block';
}

// ── Greenhouse — plant seeds, wait, harvest crops ───────────────
const GREENHOUSE_GROW_MS = 45000; // 45s to ripen (grows even while away)
const GREENHOUSE_PLOTS = 4;
function ensureGreenhouse() {
  if (!save.homePlanet.greenhouse) save.homePlanet.greenhouse = { plots: [] };
  const g = save.homePlanet.greenhouse;
  while (g.plots.length < GREENHOUSE_PLOTS) g.plots.push(null);
}
function openGreenhouse() {
  gamePaused = true;
  ensureGreenhouse();
  document.getElementById('shopMerchantName').textContent = '🌱 Greenhouse';
  document.getElementById('shopMerchantDialog').textContent = '"Plant a seed, come back later, and reap the harvest!"';
  renderGreenhouse();
  document.getElementById('villageShop').style.display = 'block';
}
// plots hold either null, a legacy number (seed time), or { seed, crop }
function plotSeed(p) { return (p && typeof p === 'object') ? p.seed : p; }
function plotCrop(p) { return (p && typeof p === 'object' && p.crop) ? getCollectible(p.crop) : null; }
function renderGreenhouse() {
  const grid = document.getElementById('shopGrid');
  grid.innerHTML = '';
  const now = Date.now();
  save.homePlanet.greenhouse.plots.forEach((plot, i) => {
    const el = document.createElement('div');
    let cls = 'shop-item', name, desc, cost, onclick = null;
    if (plot == null) {
      name = '🟫 Empty Plot'; desc = 'Plant a seed here (free)';
      cost = '<span class="has">🌱 Plant</span>'; onclick = () => plantSeed(i);
    } else {
      const crop = plotCrop(plot), ce = crop ? crop.emoji : '🌱', cn = crop ? crop.name : 'crop';
      const age = now - plotSeed(plot);
      if (age >= GREENHOUSE_GROW_MS) { name = ce + ' Ripe ' + cn + '!'; desc = 'Harvest it for your collection (+resources)'; cost = '<span class="has">✓ Harvest</span>'; onclick = () => harvestPlot(i); }
      else { cls += ' shop-disabled'; const s = Math.ceil((GREENHOUSE_GROW_MS - age) / 1000); name = '🌱 Growing ' + cn + '…'; desc = 'Ready in ' + s + 's'; cost = '<span class="lacks">' + s + 's</span>'; }
    }
    el.className = cls;
    el.innerHTML = `<div class="shop-item-name">${name}</div><div class="shop-item-desc">${desc}</div><div class="shop-cost">${cost}</div>`;
    if (onclick) el.onclick = onclick;
    grid.appendChild(el);
  });
  const coll = document.createElement('div');
  coll.className = 'shop-item';
  coll.innerHTML = '<div class="shop-item-name">🏆 My Collection</div><div class="shop-item-desc">See everything you\'ve grown & won</div>';
  coll.onclick = () => openCollection();
  grid.appendChild(coll);
  const close = document.createElement('div');
  close.className = 'shop-item';
  close.innerHTML = '<div class="shop-item-name">❌ Close</div><div class="shop-item-desc">Let them grow</div>';
  close.onclick = () => closeShop();
  grid.appendChild(close);
}
function plantSeed(i) {
  ensureGreenhouse();
  const crop = randomCollectible('crop');
  save.homePlanet.greenhouse.plots[i] = { seed: Date.now(), crop: crop.id };
  if (typeof SFX !== 'undefined' && SFX.build) SFX.build();
  persist(); renderGreenhouse();
  showToast('🌱 Planted!', 'A ' + crop.emoji + ' ' + crop.name + ' seed is growing.');
}
function harvestPlot(i) {
  const g = save.homePlanet.greenhouse, plot = g.plots[i];
  if (plot == null || Date.now() - plotSeed(plot) < GREENHOUSE_GROW_MS) return;
  const crop = plotCrop(plot) || randomCollectible('crop');
  g.plots[i] = null;
  addCollectible(crop.id, 1); // the crop goes into your collection
  // plus a couple of raw resources
  const types = ['plant', 'rock', 'crystal'];
  const t = types[Math.floor(Math.random() * types.length)];
  save.resources[t] = (save.resources[t] || 0) + 2;
  const icons = { plant: '🌿', rock: '🪨', crystal: '💎' };
  if (typeof SFX !== 'undefined' && SFX.coin) SFX.coin();
  persist(); updateHUD(); renderGreenhouse();
  showToast('🌾 Harvested ' + crop.emoji + ' ' + crop.name + '!', 'Added to your collection, plus 2 ' + icons[t] + '.');
}

// Is the home base currently in its night phase? (day/night cycle)
function isHomeNight() {
  const p = (E.time % HOME_DAY_LEN) / HOME_DAY_LEN;
  return homeSkySample(p).sunI < 0.5;
}

// Rebuild the home base from the (updated) save, keeping the player put
function refreshHome() {
  const p = E.player ? { x: E.player.position.x, z: E.player.position.z } : null;
  const wasBuild = homeBuildMode;
  E.suppressIntro = true; startPlanet(5); E.suppressIntro = false;
  if (p && E.player) {
    E.player.position.set(p.x, 0, p.z);
    E.camera.position.set(p.x, 9, p.z + 9); E.camera.lookAt(E.player.position);
  }
  homeBuildMode = wasBuild; updateBuildButton();
}

function removeBuilding(b, refund) {
  const list = save.homePlanet.buildings || [];
  const idx = list.indexOf(b);
  if (idx < 0) return;
  list.splice(idx, 1);
  save.spaceCoins = (save.spaceCoins || 0) + refund;
  if (typeof SFX !== 'undefined' && SFX.build) SFX.build();
  persist();
  refreshHome();
  showToast('🗑️ Removed', 'Building torn down. +' + refund + ' 🪙 refunded.');
}

function tryMoveBuilding(gx, gy) {
  const b = homeMoveTarget;
  const info = P5_BUILDINGS.find(pb => pb.type === b.type);
  if (!info) { homeMoveTarget = null; clearMoveGhost(); return; }
  // fits if every target tile is open grass — treating the building's own
  // current footprint as free (so you can nudge it a little)
  let fits = true;
  for (let dr = 0; dr < info.h; dr++)
    for (let dc = 0; dc < info.w; dc++) {
      const x = gx + dc, z = gy + dr;
      const ownTile = (x >= b.gridX && x < b.gridX + info.w && z >= b.gridY && z < b.gridY + info.h);
      if (x < 1 || z < 1 || x >= E.cols - 1 || z >= E.rows - 1 || (!ownTile && E.map[z][x] !== 0)) fits = false;
    }
  if (!fits) { showToast('🚫 No room', 'That spot is blocked — pick open grass.'); return; } // keep moving
  homeMoveTarget = null; clearMoveGhost();
  b.gridX = gx; b.gridY = gy;
  if (typeof SFX !== 'undefined' && SFX.build) SFX.build();
  persist();
  refreshHome();
  showToast('✅ Moved', (info.name || 'Building') + ' relocated.');
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
        const tileVal = b.walkable ? 2 : 5; // paths stay walkable
        for (let dr = 0; dr < b.h; dr++)
          for (let dc = 0; dc < b.w; dc++) E.map[gy + dr][gx + dc] = tileVal;
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
    case 'observatory':
      if (typeof enterInterior === 'function') enterInterior('observatory');
      else openObservatory();
      break;
    case 'quest': openQuestBoard(); break;
    case 'greenhouse': openGreenhouse(); break;
    case 'campfire': showToast('🔥 Campfire', 'When night falls, your visitors gather around the fire.'); break;
    default: {
      const info = P5_BUILDINGS.find(pb => pb.type === b.type);
      if (info && info.deco) showToast(info.emoji + ' ' + info.name, 'A lovely touch for your home base.');
      break;
    }
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
  updateHomeDayNight(dt);
  if ((save.homePlanet.buildings || []).some(b => b.type === 'hut') && save.hp < save.maxHp) {
    save.hp = Math.min(save.maxHp, save.hp + dt * 2.5);
    updateHUD();
  }
  if (E.homeMeshes) E.homeMeshes.forEach(b => {
    if (b.mesh.userData.spin) b.mesh.userData.spin.rotation.y += dt;
    const ud = b.mesh.userData;
    if (ud.flame) { // campfire flicker
      const f = 0.85 + Math.sin(E.time * 18 + b.x) * 0.12 + Math.sin(E.time * 31) * 0.05;
      ud.flame.scale.set(1, f, 1); if (ud.flame2) ud.flame2.scale.set(1, f * 1.05, 1);
      if (ud.fireLight) ud.fireLight.intensity = 0.7 + Math.abs(Math.sin(E.time * 12 + b.z)) * 0.4;
    }
  });
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
    // A proper observatory: white tower with a door + windows, and a
    // rotating silver dome with a telescope poking out of the slit.
    const wallMat = M(0xe8ecf4, 0.6), trimMat = M(0x9aa4b8, 0.5);
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xc2c9d6, roughness: 0.3, metalness: 0.55 });
    const winMat = new THREE.MeshStandardMaterial({ color: 0x9fe0ff, emissive: 0x2a7fb0, emissiveIntensity: 0.7 });
    const glow = new THREE.MeshStandardMaterial({ color: 0x66c2ff, emissive: 0x2277bb, emissiveIntensity: 1.0 });
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.54, w * 0.58, 0.2, 22), trimMat); plinth.position.y = 0.1;
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.46, w * 0.5, 1.0, 22), wallMat); drum.position.y = 0.6;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.47, w * 0.47, 0.12, 22), trimMat); band.position.y = 1.06;
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.6, 0.08), M(0x2a3448, 0.5)); door.position.set(0, 0.4, w * 0.5);
    const doorTop = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.05), glow); doorTop.position.set(0, 0.72, w * 0.5 + 0.01);
    g.add(plinth, drum, band, door, doorTop);
    [0.7, 2.44, 3.84, 5.58].forEach(a => { const win = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.16), winMat); win.position.set(Math.cos(a) * w * 0.5, 0.78, Math.sin(a) * w * 0.5); win.rotation.y = -a; g.add(win); });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(w * 0.45, 0.045, 8, 26), glow); ring.rotation.x = Math.PI / 2; ring.position.y = 1.12; g.add(ring);
    // rotating dome assembly (dome + dark slit + telescope + lens)
    const domeGrp = new THREE.Group(); domeGrp.position.y = 1.12;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(w * 0.46, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.24, w * 0.5, 0.42), M(0x0a1420, 0.4)); slit.position.set(0, w * 0.24, w * 0.18); slit.rotation.x = -0.5;
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 1.0, 12), M(0x2a2a3a, 0.4)); scope.position.set(0, w * 0.3, w * 0.28); scope.rotation.x = -0.8;
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 12), winMat); lens.position.set(0, w * 0.52, w * 0.52); lens.rotation.x = -0.8;
    domeGrp.add(dome, slit, scope, lens); g.add(domeGrp);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), new THREE.MeshStandardMaterial({ color: 0xffe066, emissive: 0xffaa00, emissiveIntensity: 1 })); star.position.y = 1.12 + w * 0.5; g.add(star);
    g.userData.spin = domeGrp;
  } else if (type === 'quest') {
    const post = (x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 7), M(0x6b4a2a)); p.position.set(x, 0.55, 0); return p; };
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.68, 0.06), M(0x5a3a1a, 0.7)); frame.position.set(0, 0.95, -0.02);
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.58, 0.06), M(0x9a6a38, 0.8)); board.position.set(0, 0.95, 0.02);
    g.add(post(-0.36), post(0.36), frame, board);
    const noteCols = [0xfff2a0, 0xbfe0ff, 0xffc0d0];
    for (let i = 0; i < 3; i++) {
      const n = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.02), M(noteCols[i], 0.6));
      n.position.set(-0.28 + i * 0.28, 0.96, 0.06); n.rotation.z = (i - 1) * 0.12; g.add(n);
    }
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), new THREE.MeshStandardMaterial({ color: 0xd83b3b, emissive: 0x882020, emissiveIntensity: 0.5 }));
    pin.position.set(0, 1.28, 0.06); g.add(pin);
  } else if (type === 'greenhouse') {
    const glass = new THREE.MeshStandardMaterial({ color: 0xbfeadf, transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0.2 });
    const frameMat = M(0x8a9490, 0.5);
    const base = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 0.18, h * 0.86), M(0x5a3a1e)); base.position.y = 0.09;
    const walls = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.9, h * 0.78), glass); walls.position.y = 0.6;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.62, 0.5, 4), glass); roof.rotation.y = Math.PI / 4; roof.position.y = 1.25;
    g.add(base, walls, roof);
    // corner frame posts
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.05, 0.06), frameMat); p.position.set(sx * w * 0.38, 0.6, sz * h * 0.38); g.add(p); });
    // rows of little plants inside
    for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.42, 6), M(0x3fae50)); c.position.set((i % 3 - 1) * w * 0.28, 0.35, (i < 3 ? -1 : 1) * h * 0.2); g.add(c); }
  } else if (type === 'campfire') {
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1), M(0x8a8f96, 0.9)); s.position.set(Math.cos(a) * 0.3, 0.07, Math.sin(a) * 0.3); g.add(s); }
    [0, 1, 2].forEach(i => { const log = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), M(0x6b4a2a)); log.rotation.set(0, i * Math.PI / 3, Math.PI / 2); log.position.y = 0.12; g.add(log); });
    const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 7), new THREE.MeshStandardMaterial({ color: 0xff7a1e, emissive: 0xff5a08, emissiveIntensity: 1.2, transparent: true, opacity: 0.92 })); f1.position.y = 0.36;
    const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 7), new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0xffaa00, emissiveIntensity: 1.4 })); f2.position.y = 0.44;
    const light = new THREE.PointLight(0xff8a3a, 0.8, 6, 2); light.position.y = 0.6;
    g.add(f1, f2, light);
    g.userData.flame = f1; g.userData.flame2 = f2; g.userData.fireLight = light;
  } else if (type === 'path') {
    const pave = new THREE.Mesh(new THREE.BoxGeometry(w * 0.99, 0.06, h * 0.99), M(0xcbb184, 0.95));
    pave.position.y = -0.03; pave.receiveShadow = true; g.add(pave); // sits ~flush with the ground
  } else if (type === 'tree') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.6, 8), M(0x6b4a2a)); trunk.position.y = 0.3;
    const f1 = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), M(0x2f8a3a)); f1.position.y = 0.95;
    const f2 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), M(0x37a047)); f2.position.set(0.18, 1.2, 0.05);
    const f3 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), M(0x2f8a3a)); f3.position.set(-0.16, 1.12, -0.05);
    g.add(trunk, f1, f2, f3);
  } else if (type === 'pine') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.4, 7), M(0x6b4a2a)); trunk.position.y = 0.2;
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.6, 9), M(0x1f6b34)); c1.position.y = 0.6;
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.55, 9), M(0x257a3c)); c2.position.y = 0.95;
    const c3 = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.5, 9), M(0x2f8a3a)); c3.position.y = 1.3;
    g.add(trunk, c1, c2, c3);
  } else if (type === 'flowers') {
    const bed = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.44, 0.14, 12), M(0x5a3a1e)); bed.position.y = 0.07;
    const cols = [0xff5a8a, 0xffe066, 0xff8a4a, 0x9a6aff, 0xffffff];
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2, r = 0.22;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 4), M(0x3fae50)); stem.position.set(Math.cos(a) * r, 0.24, Math.sin(a) * r);
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), M(cols[i % cols.length], 0.6)); petal.position.set(Math.cos(a) * r, 0.37, Math.sin(a) * r);
      g.add(stem, petal);
    }
    g.add(bed);
  } else if (type === 'bush') {
    const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), M(0x2f7a34)); b1.position.set(-0.12, 0.28, 0); b1.scale.y = 0.8;
    const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), M(0x379040)); b2.position.set(0.16, 0.24, 0.08); b2.scale.y = 0.8;
    const b3 = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), M(0x2f7a34)); b3.position.set(0.02, 0.34, -0.14); b3.scale.y = 0.8;
    g.add(b1, b2, b3);
  } else if (type === 'rock') {
    const r1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34), M(0x8a8f96, 0.9)); r1.position.y = 0.26; r1.scale.set(1.2, 0.9, 1); r1.rotation.set(0.3, 0.5, 0.1);
    const r2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2), M(0x9aa0a6, 0.9)); r2.position.set(0.28, 0.16, 0.16); r2.rotation.set(0.6, 0.2, 0.4);
    g.add(r1, r2);
  } else if (type === 'lamp') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.16, 10), M(0x2a2a30, 0.6)); base.position.y = 0.08;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 1.2, 8), M(0x33333c, 0.6)); pole.position.y = 0.7;
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.16, 8), M(0x2a2a30, 0.6)); head.position.y = 1.32;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), new THREE.MeshStandardMaterial({ color: 0xfff2a0, emissive: 0xffd060, emissiveIntensity: 1.2 })); bulb.position.y = 1.28;
    const light = new THREE.PointLight(0xffd070, 0.6, 5, 2); light.position.y = 1.28;
    g.add(base, pole, head, bulb, light);
  } else if (type === 'banner') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8), M(0x8a6a3a, 0.6)); pole.position.y = 0.7;
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.03), M(0xd83b5b, 0.7)); flag.position.set(0.28, 1.1, 0);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.035), M(0xffd54a, 0.5)); trim.position.set(0.28, 0.92, 0);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), M(0xffd54a, 0.4)); knob.position.y = 1.42;
    g.add(pole, flag, trim, knob);
  } else if (type === 'statue') {
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.24, 12), M(0xbfb9a8, 0.9)); ped.position.y = 0.12;
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.5, 12), M(0xdad3c2, 0.9)); body.position.y = 0.5;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), M(0xe8dcc8, 0.9)); head.position.y = 0.82;
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 12), M(0xc0563b, 0.8)); hat.position.y = 1.05;
    g.add(ped, body, head, hat);
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
