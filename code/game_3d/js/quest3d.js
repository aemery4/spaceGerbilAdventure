// ════════════════════════════════════════════════════════════════
// js/quest3d.js — Zorbax temple quest (two-stage boss gate)
//
// Stage 1  Elder fetch quest: bring the Village Elder offerings. Completing
//          it drops the thorn barrier sealing off the temple corner and
//          reveals the temple's location with a beam of light.
// Stage 2  Totems: light all the ancient totems around the temple to open
//          the gate and reach the Jungle King.
//
// State lives on save.zorbax so it persists. Tiles: 20 = temple stone (see
// engine3d), 21 = gate bars, 22 = thorn barrier. All solid; the tile
// renderer ignores them and this module draws the real meshes.
// ════════════════════════════════════════════════════════════════

const TEMPLE_OFFERINGS = { crystal: 4, plant: 6, banana: 4 };
const TOTEM_COUNT = 4;

function zq() {
  if (!save.zorbax) save.zorbax = { elder: false, totems: [false, false, false, false], gate: false };
  if (!save.zorbax.totems) save.zorbax.totems = [false, false, false, false];
  return save.zorbax;
}
function totemsLit() { return zq().totems.filter(Boolean).length; }

// ── Tile stamping (called at the end of stampTemple, before buildTiles) ──
function stampTempleGates(cfg) {
  const t = E.temple; if (!t) return;
  const s = zq();
  if (!cfg.solid.includes(21)) cfg.solid.push(21);
  if (!cfg.solid.includes(22)) cfg.solid.push(22);
  const inB = (x, z) => x > 0 && z > 0 && x < E.cols - 1 && z < E.rows - 1;

  // Gate gap tiles (the 3-tile opening in the plaza wall on the gate side)
  const gateTiles = [];
  if (t.gate === 'S') for (let x = t.cx - 1; x <= t.cx + 1; x++) gateTiles.push([x, t.z1]);
  else if (t.gate === 'N') for (let x = t.cx - 1; x <= t.cx + 1; x++) gateTiles.push([x, t.z0]);
  else if (t.gate === 'E') for (let z = t.cz - 1; z <= t.cz + 1; z++) gateTiles.push([t.x1, z]);
  else for (let z = t.cz - 1; z <= t.cz + 1; z++) gateTiles.push([t.x0, z]);
  if (!s.gate) gateTiles.forEach(([x, z]) => { if (inB(x, z)) E.map[z][x] = 21; });
  t.gateTiles = gateTiles;

  // Outer thorn barrier: an L across the two interior-facing sides so the
  // temple corner is fully enclosed (map border walls close the other two).
  const R = 12;
  const sx = t.cx < E.cols / 2 ? 1 : -1, sz = t.cz < E.rows / 2 ? 1 : -1;
  const bx = t.cx + sx * R, bz = t.cz + sz * R;
  const barrier = [];
  for (let z = t.cz - R; z <= t.cz + R; z++) if (inB(bx, z) && E.map[z][bx] !== 1) barrier.push([bx, z]);
  for (let x = t.cx - R; x <= t.cx + R; x++) if (inB(x, bz) && E.map[bz][x] !== 1) barrier.push([x, bz]);
  if (!s.elder) barrier.forEach(([x, z]) => { E.map[z][x] = 22; });
  t.barrierTiles = barrier;

  // Totem spots: four diagonal corners just outside the plaza walls, each in
  // a small cleared patch so it isn't buried in the thicket.
  const spots = [[t.x0 - 2, t.z0 - 2], [t.x1 + 2, t.z0 - 2], [t.x0 - 2, t.z1 + 2], [t.x1 + 2, t.z1 + 2]];
  t.totemSpots = spots.map(([x, z]) => [Math.max(2, Math.min(E.cols - 3, x)), Math.max(2, Math.min(E.rows - 3, z))]);
  t.totemSpots.forEach(([x, z]) => {
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, nz = z + dz;
      if (inB(nx, nz) && E.map[nz][nx] !== 20 && E.map[nz][nx] !== 22 && E.map[nz][nx] !== 21) E.map[nz][nx] = 0;
    }
  });
}

// ── Meshes ──────────────────────────────────────────────────────
function makeTotemMesh(lit) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x6b6357, roughness: 1 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.6), stone); base.position.y = 0.2;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 1.7, 6), stone); post.position.y = 1.15;
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.3),
    new THREE.MeshStandardMaterial({ color: lit ? 0x9ff7ff : 0x244a4e, emissive: lit ? 0x38e0ff : 0x081416, emissiveIntensity: lit ? 1.4 : 0.2 }));
  crystal.position.y = 2.2;
  g.add(base, post, crystal);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  let light = null;
  if (lit) { light = new THREE.PointLight(0x38e0ff, 1.1, 9, 2); light.position.y = 2.3; g.add(light); }
  g.userData = { crystal, light };
  return g;
}

function makeGateBarsMesh(t) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a4a24, roughness: 0.9 });
  const vine = new THREE.MeshStandardMaterial({ color: 0x2f7a34, roughness: 0.9 });
  (t.gateTiles || []).forEach(([x, z]) => {
    for (let i = -1; i <= 1; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.3, 6), i === 0 ? vine : wood);
      const ox = (t.gate === 'E' || t.gate === 'W') ? 0 : i * 0.28;
      const oz = (t.gate === 'E' || t.gate === 'W') ? i * 0.28 : 0;
      bar.position.set(x + 0.5 + ox, 1.15, z + 0.5 + oz); bar.castShadow = true; g.add(bar);
    }
  });
  return g;
}

function makeTempleBeam(t) {
  const geo = new THREE.CylinderGeometry(1.1, 1.6, 46, 10, 1, true);
  const mat = new THREE.MeshBasicMaterial({ color: 0x8ff0ff, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const beam = new THREE.Mesh(geo, mat);
  const pcx = (t.px0 + t.px1) / 2 + 0.5, pcz = (t.pz0 + t.pz1) / 2 + 0.5;
  beam.position.set(pcx, 23, pcz);
  return beam;
}

// ── Build the quest props into the scene (called from buildWorld) ──
function buildTempleQuest(scene) {
  const t = E.temple; if (!t) return;
  const s = zq();
  const q = { gateMesh: null, barrierGroup: null, totems: [], beam: null };

  // Thorn barrier (instanced) while the Elder quest isn't done
  if (!s.elder && t.barrierTiles && t.barrierTiles.length) {
    const grp = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x243a1c, roughness: 1 });
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0x3c5a26, roughness: 1 });
    const box = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 2.1, 1), trunkMat, t.barrierTiles.length);
    const spike = new THREE.InstancedMesh(new THREE.ConeGeometry(0.5, 1.2, 5), spikeMat, t.barrierTiles.length);
    box.castShadow = spike.castShadow = true;
    const m = new THREE.Matrix4(), v = new THREE.Vector3(), qq = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), e = new THREE.Euler();
    t.barrierTiles.forEach(([x, z], i) => {
      v.set(x + 0.5, 1.05, z + 0.5); m.compose(v, qq, sc); box.setMatrixAt(i, m);
      e.set(0, (x * 12.9 + z * 7.3) % 6.283, 0); qq.setFromEuler(e); v.set(x + 0.5, 2.2, z + 0.5); m.compose(v, qq, sc); spike.setMatrixAt(i, m); qq.identity();
    });
    box.instanceMatrix.needsUpdate = spike.instanceMatrix.needsUpdate = true;
    grp.add(box, spike); scene.add(grp); q.barrierGroup = grp;
  }

  // Gate bars while the gate isn't open
  if (!s.gate) { q.gateMesh = makeGateBarsMesh(t); scene.add(q.gateMesh); }

  // Totems (only meaningful/visible once you can reach them, but always built)
  (t.totemSpots || []).forEach(([x, z], i) => {
    const lit = !!s.totems[i];
    const mesh = makeTotemMesh(lit);
    mesh.position.set(x + 0.5, 0, z + 0.5);
    scene.add(mesh);
    q.totems.push({ x: x + 0.5, z: z + 0.5, mesh, crystal: mesh.userData.crystal, light: mesh.userData.light, lit });
  });

  // Location beam once the Elder has revealed the temple
  if (s.elder && !s.gate) { q.beam = makeTempleBeam(t); scene.add(q.beam); }

  E.templeQuest = q;
}

// ── Elder interaction ───────────────────────────────────────────
// Returns true if it handled the interaction (shows quest UI), false to let
// the normal shop open.
function elderQuestInteract() {
  if (E.planetNo !== 2 || !E.temple) return false;
  const s = zq();
  if (s.elder) return false; // quest done → normal shop
  const icons = { rock: '🪨', plant: '🌿', crystal: '💎', banana: '🍌' };
  const list = Object.entries(TEMPLE_OFFERINGS).map(([r, a]) => {
    const have = save.resources[r] || 0;
    return `${icons[r]} ${have}/${a}`;
  }).join('   ');
  const hasAll = Object.entries(TEMPLE_OFFERINGS).every(([r, a]) => (save.resources[r] || 0) >= a);
  const body = 'The old jungle temple is sealed by thorns. Bring me offerings and I will reveal its path:\n\n' + list +
    (hasAll ? '\n\nYou have everything. Shall we make the offering?' : '\n\nGather these from the jungle and return to me.');
  if (hasAll) showMsg('👴 Village Elder', body, completeElderQuest, 'Give Offerings', 'Not now');
  else showMsg('👴 Village Elder', body, null, 'OK');
  return true;
}

function completeElderQuest() {
  const s = zq();
  Object.entries(TEMPLE_OFFERINGS).forEach(([r, a]) => { save.resources[r] = (save.resources[r] || 0) - a; });
  s.elder = true; persist(); if (typeof updateHUD === 'function') updateHUD();
  dropThornBarrier();
  const t = E.temple;
  if (E.templeQuest && !E.templeQuest.beam) { E.templeQuest.beam = makeTempleBeam(t); E.scene.add(E.templeQuest.beam); }
  const west = t.cx < E.cols / 2, north = t.cz < E.rows / 2;
  const dir = (north ? 'north' : 'south') + (west ? 'west' : 'east');
  if (typeof SFX !== 'undefined' && SFX.powerup) SFX.powerup();
  showMsg('🌿 The Path Opens', 'The thorns wither away!\n\nThe sacred temple stands far to the ' + dir + ' — follow the beam of light.\n\nLight the ' + TOTEM_COUNT + ' ancient totems around it to open its gate.', null, 'Onward!');
}

function dropThornBarrier() {
  const t = E.temple; if (!t) return;
  (t.barrierTiles || []).forEach(([x, z]) => { if (E.map[z][x] === 22) E.map[z][x] = 0; });
  if (E.templeQuest && E.templeQuest.barrierGroup) {
    const g = E.templeQuest.barrierGroup;
    if (typeof spawnParticles === 'function') spawnParticles(g.position.clone().setY(1), new THREE.Color(0x3c8a2c), 20);
    E.scene.remove(g); E.templeQuest.barrierGroup = null;
  }
}

// ── Totems ──────────────────────────────────────────────────────
function templeTotemNear(worldPoint) {
  if (E.planetNo !== 2 || !E.templeQuest) return -1;
  const s = zq();
  if (!s.elder || s.gate) return -1; // only interactive between the two stages
  const p = E.player.position;
  for (let i = 0; i < E.templeQuest.totems.length; i++) {
    const tt = E.templeQuest.totems[i]; if (tt.lit) continue;
    const here = new THREE.Vector3(tt.x, 0.6, tt.z);
    const closeToPlayer = p.distanceTo(here) < 2.0;
    const clicked = worldPoint ? worldPoint.distanceTo(here) < 1.3 : false;
    if (closeToPlayer && (worldPoint ? clicked : true)) return i;
    if (clicked && p.distanceTo(here) < 3.2) return i;
  }
  return -1;
}

function lightTotem(i) {
  const q = E.templeQuest, s = zq();
  const tt = q.totems[i]; if (!tt || tt.lit) return;
  tt.lit = true; s.totems[i] = true; persist();
  tt.crystal.material.color.set(0x9ff7ff);
  tt.crystal.material.emissive.set(0x38e0ff);
  tt.crystal.material.emissiveIntensity = 1.4;
  if (!tt.light) { tt.light = new THREE.PointLight(0x38e0ff, 1.1, 9, 2); tt.light.position.y = 2.3; tt.mesh.add(tt.light); }
  if (typeof spawnParticles === 'function') spawnParticles(new THREE.Vector3(tt.x, 2.2, tt.z), new THREE.Color(0x38e0ff), 18);
  if (typeof SFX !== 'undefined' && SFX.powerup) SFX.powerup();
  const lit = totemsLit();
  if (lit >= TOTEM_COUNT) openTempleGate();
  else showToast('🔥 Totem Lit', lit + ' / ' + TOTEM_COUNT + ' ancient totems glowing…');
}

function openTempleGate() {
  const t = E.temple, q = E.templeQuest, s = zq();
  s.gate = true; persist();
  (t.gateTiles || []).forEach(([x, z]) => { if (E.map[z][x] === 21) E.map[z][x] = 9; });
  if (q && q.gateMesh) {
    if (typeof spawnParticles === 'function') { const c = t.gateTiles[1] || t.gateTiles[0]; spawnParticles(new THREE.Vector3(c[0] + 0.5, 1.2, c[1] + 0.5), new THREE.Color(0xffd24a), 28); }
    E.scene.remove(q.gateMesh); q.gateMesh = null;
  }
  if (q && q.beam) { E.scene.remove(q.beam); q.beam = null; }
  if (typeof SFX !== 'undefined' && SFX.win) SFX.win();
  showToast('🏛️ The Temple Gate Opens!', 'The way to the Jungle King lies open. Enter, brave one!');
}

// ── Per-frame animation ─────────────────────────────────────────
function updateTempleQuest(dt) {
  const q = E.templeQuest; if (!q) return;
  const s = zq();
  q.totems.forEach(tt => {
    tt.crystal.rotation.y += dt * 1.5;
    if (tt.lit) { tt.crystal.position.y = 2.2 + Math.sin(E.time * 3) * 0.08; tt.crystal.material.emissiveIntensity = 1.2 + Math.sin(E.time * 5) * 0.4; }
  });
  if (q.beam) { q.beam.material.opacity = 0.16 + Math.abs(Math.sin(E.time * 1.5)) * 0.14; q.beam.rotation.y += dt * 0.3; }
}
