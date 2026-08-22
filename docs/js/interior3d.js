// ════════════════════════════════════════════════════════════════
// js/interior3d.js — Walk-in building interiors (Trophy Hall, Arcade)
//
// Instead of a popup, walking up to the Trophy Hall or Arcade and
// pressing Space drops you INSIDE a real 3D room you can walk around.
// Reuses the engine's player/movement/camera loop. Step out the
// doorway (bottom of the room) to return to your home base.
// ════════════════════════════════════════════════════════════════

let interiorReturn = null; // {x,z} where to drop the player back home

const INTERIOR_DEFS = {
  trophy: { title: '🏛️ Trophy Hall', sky: 0x14110a, floor: 0xcdc4a8, wall: 0xb0a074, accent: 0xffd54a, populate: populateTrophyInterior },
  arcade: { title: '🕹️ Space Arcade', sky: 0x0a0818, floor: 0x2a2440, wall: 0x38305c, accent: 0x22ffdd, populate: populateArcadeInterior }
};

function enterInterior(kind) {
  const def = INTERIOR_DEFS[kind];
  if (!def || !E.player) return;
  interiorReturn = { x: E.player.position.x, z: E.player.position.z };
  stopEngine();
  buildInterior(kind, def);
  E.running = true; E.clock.start(); animate();
  if (typeof SFX !== 'undefined' && SFX.build) SFX.build();
  showToast(def.title, 'Look around inside! Walk out the doorway (bottom) to leave.');
}

function exitInterior() {
  const ret = interiorReturn; interiorReturn = null;
  E.interior = null; E.doorTiles = null; E.interiorProps = null;
  E.suppressIntro = true;
  startPlanet(5);               // rebuild the home base
  E.suppressIntro = false;
  if (ret && E.player) {         // drop the player just in front of the building
    E.player.position.set(ret.x, 0, ret.z);
    E.camera.position.set(ret.x, 9, ret.z + 9);
    E.camera.lookAt(E.player.position);
  }
}

// ── Canvas texture helpers ──────────────────────────────────────
function makeCheckerTexture(cA, cB, n) {
  const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d'), t = s / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = ((x + y) % 2) ? cA : cB; g.fillRect(x * t, y * t, t + 1, t + 1); }
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; return tex;
}
function makeGridTexture(bg, line, n) {
  const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, s, s);
  g.strokeStyle = line; g.lineWidth = 3; const t = s / n;
  for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * t, 0); g.lineTo(i * t, s); g.moveTo(0, i * t); g.lineTo(s, i * t); g.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; return tex;
}

function buildInterior(kind, def) {
  const COLS = 15, ROWS = 12;
  const map = [];
  for (let z = 0; z < ROWS; z++) {
    const row = [];
    for (let x = 0; x < COLS; x++) row.push((x === 0 || x === COLS - 1 || z === 0 || z === ROWS - 1) ? 1 : 0);
    map.push(row);
  }
  const dc = Math.floor(COLS / 2);
  map[ROWS - 1][dc] = 0; map[ROWS - 1][dc - 1] = 0;     // doorway gap in the bottom wall
  E.doorTiles = [[dc, ROWS - 1], [dc - 1, ROWS - 1]];   // stepping onto these leaves
  E.map = map; E.cols = COLS; E.rows = ROWS; E.worldOff = 0;
  E.cfg = { solid: [1], slow: [], damage: [], home: false, village: false, interior: true, spawn: { tx: dc - 1, tz: ROWS - 3 } };
  E.interior = kind;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(def.sky);
  scene.fog = new THREE.Fog(def.sky, 16, 40);
  E.scene = scene;

  scene.add(new THREE.AmbientLight(0xffffff, 0.72));
  const key = new THREE.DirectionalLight(0xffffff, 0.85); key.position.set(4, 12, 7); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -COLS, right: COLS, top: ROWS, bottom: -ROWS, near: 1, far: 60 });
  scene.add(key);
  const fill = new THREE.DirectionalLight(def.accent, 0.25); fill.position.set(-5, 4, -3); scene.add(fill);

  // themed floor
  const floorMat = new THREE.MeshStandardMaterial({ roughness: 0.8 });
  if (kind === 'arcade') {
    const t = makeGridTexture('#120d26', '#00e6d0', 15); t.repeat.set(1, 1);
    floorMat.map = t; floorMat.emissiveMap = t; floorMat.emissive = new THREE.Color(0x0a5c55); floorMat.emissiveIntensity = 0.6;
  } else {
    const t = makeCheckerTexture('#ece5cb', '#c7ba92', COLS); t.repeat.set(COLS / 2, ROWS / 2);
    floorMat.map = t; floorMat.color = new THREE.Color(0xffffff);
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(COLS, ROWS), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(COLS / 2, 0, ROWS / 2); floor.receiveShadow = true; scene.add(floor);
  // trophy hall gets a red carpet runner with gold edging
  if (kind === 'trophy') {
    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(2.4, ROWS - 3.2), new THREE.MeshStandardMaterial({ color: 0x8a1524, roughness: 0.95 }));
    carpet.rotation.x = -Math.PI / 2; carpet.position.set(COLS / 2, 0.02, ROWS / 2 + 0.4); scene.add(carpet);
    [-1.28, 1.28].forEach(dx => {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.14, ROWS - 3.2), new THREE.MeshStandardMaterial({ color: 0xffd54a, emissive: 0xffd54a, emissiveIntensity: 0.4 }));
      l.rotation.x = -Math.PI / 2; l.position.set(COLS / 2 + dx, 0.025, ROWS / 2 + 0.4); scene.add(l);
    });
  }

  buildInteriorWalls(map, def, scene);
  addDoorway(scene, dc, ROWS, def);

  buildPlayer(E.cfg, scene);
  E.resources = []; E.enemies = []; E.particles = []; E.dying = []; E.bossShots = [];
  E.exit = null; E.merchants = []; E.homeMeshes = []; E.seahorses = []; E.campfire = null;
  if (typeof hideBossBar === 'function') hideBossBar();

  E.interiorProps = [];
  def.populate(scene, COLS, ROWS, def);
  updateHUD();
}

function buildInteriorWalls(map, def, scene) {
  const H = 2.2;
  const wallMat = new THREE.MeshStandardMaterial({ color: def.wall, roughness: 0.95 });
  const geo = new THREE.BoxGeometry(1, H, 1);
  for (let z = 0; z < map.length; z++)
    for (let x = 0; x < map[0].length; x++)
      if (map[z][x] === 1) {
        const w = new THREE.Mesh(geo, wallMat);
        w.position.set(x + 0.5, H / 2, z + 0.5); w.castShadow = true; w.receiveShadow = true;
        scene.add(w);
      }
  // accent trim strip along the top of the walls
  const trimMat = new THREE.MeshStandardMaterial({ color: def.accent, emissive: def.accent, emissiveIntensity: 0.35, roughness: 0.5 });
  [[map[0].length / 2, 0.5], [map[0].length / 2, map.length - 0.5]].forEach(([x, z]) => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(map[0].length - 2, 0.12, 0.12), trimMat);
    t.position.set(x, H - 0.2, z); scene.add(t);
  });
}

function addDoorway(scene, dc, ROWS, def) {
  const frameMat = new THREE.MeshStandardMaterial({ color: def.accent, emissive: def.accent, emissiveIntensity: 0.5, roughness: 0.4 });
  const postGeo = new THREE.BoxGeometry(0.18, 2.0, 0.35);
  [-1, 1].forEach(s => { const p = new THREE.Mesh(postGeo, frameMat); p.position.set(dc - 0.5 + s * 1.1, 1.0, ROWS - 1); scene.add(p); });
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 0.35), frameMat); lintel.position.set(dc - 0.5, 2.0, ROWS - 1); scene.add(lintel);
  // glowing EXIT mat on the floor of the doorway
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1), new THREE.MeshStandardMaterial({ color: 0x66ff88, emissive: 0x33cc55, emissiveIntensity: 0.8, transparent: true, opacity: 0.55 }));
  mat.rotation.x = -Math.PI / 2; mat.position.set(dc - 0.5, 0.02, ROWS - 1.4); scene.add(mat);
  E.interiorExitMat = mat;
}

// ── Trophy Hall interior: statues of every boss along the back wall ─
function populateTrophyInterior(scene, COLS, ROWS, def) {
  const list = (typeof P5_TROPHIES !== 'undefined') ? P5_TROPHIES : [];
  const cleared = save.planetsCleared || [];
  const n = list.length || 4;
  const spacing = (COLS - 3) / n;
  const warm = new THREE.MeshStandardMaterial({ color: 0xffe9b8 });
  list.forEach((t, i) => {
    const has = cleared.includes(t.planet);
    const x = 1.5 + spacing * (i + 0.5);
    const z = 2.6;
    const st = makeInteriorExhibit(t, has);
    st.position.set(x, 0, z);
    scene.add(st);
    // a warm display spotlight above each exhibit
    const lamp = new THREE.PointLight(has ? 0xfff0d0 : 0x5a5240, has ? 1.4 : 0.5, 6, 2);
    lamp.position.set(x, 3.0, z + 0.3); scene.add(lamp);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), warm);
    bulb.position.set(x, 2.9, z + 0.3); scene.add(bulb);
    // soft light pool on the floor
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20),
      new THREE.MeshBasicMaterial({ color: has ? 0xffe9b8 : 0x555044, transparent: true, opacity: has ? 0.22 : 0.08 }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(x, 0.03, z); scene.add(pool);
    E.interiorProps.push({
      mesh: st, x, z, spin: st.userData.spin,
      action: () => showToast(has ? t.emoji + ' ' + t.name : '🔒 Sealed Case',
        has ? t.desc : "Defeat this planet's boss to earn this trophy.")
    });
  });
  // grand marble columns along the two side walls
  const colMat = new THREE.MeshStandardMaterial({ color: 0xece5cd, roughness: 0.7 });
  [2, ROWS - 3].forEach(z => [1.2, COLS - 1.2].forEach(x => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 2.2, 14), colMat);
    col.position.set(x, 1.1, z); col.castShadow = true; scene.add(col);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.6), colMat); cap.position.set(x, 2.2, z); scene.add(cap);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.6), colMat); base.position.set(x, 0.09, z); scene.add(base);
  }));
  // gold laurel emblem on the back wall
  const gold = new THREE.MeshStandardMaterial({ color: 0xffd54a, metalness: 0.6, roughness: 0.3, emissive: 0x5a4300, emissiveIntensity: 0.4 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.08, 10, 28), gold);
  ring.position.set(COLS / 2, 3.1, 0.35); scene.add(ring);
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.34), gold);
  star.position.set(COLS / 2, 3.1, 0.4); scene.add(star);
  // velvet rope line in front of the exhibits
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x8a1a2a, roughness: 0.6 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xffd54a, metalness: 0.7, roughness: 0.3 });
  let prev = null;
  for (let x = 2; x < COLS - 1; x += 2) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.62, 8), brass);
    post.position.set(x + 0.5, 0.31, 4.4); scene.add(post);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), brass); knob.position.set(x + 0.5, 0.68, 4.4); scene.add(knob);
    if (prev !== null) {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, x + 0.5 - prev, 6), ropeMat);
      rope.rotation.z = Math.PI / 2; rope.position.set((x + 0.5 + prev) / 2, 0.5, 4.4); scene.add(rope);
    }
    prev = x + 0.5;
  }
}

// One museum exhibit: pedestal + (boss statue | shrouded case) + glass
function makeInteriorExhibit(trophy, earned) {
  const g = new THREE.Group();
  const marble = new THREE.MeshStandardMaterial({ color: 0xe6e0cf, roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffd54a, roughness: 0.4, metalness: 0.6, emissive: 0x4a3600, emissiveIntensity: 0.35 });
  // two-tier pedestal with a dark base and gold trim ring
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.22, 16), dark); base.position.y = 0.11; base.receiveShadow = true;
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.6, 16), marble); ped.position.y = 0.5; ped.castShadow = true;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 8, 20), gold); ring.rotation.x = Math.PI / 2; ring.position.y = 0.8;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.16, 0.05), gold); plate.position.set(0, 0.52, 0.5);
  g.add(base, ped, ring, plate);
  if (earned) {
    let fig = null;
    try {
      if (trophy.planet === 2 && typeof makeApeBossMesh === 'function') fig = makeApeBossMesh(1, 0x888888);
      else if (trophy.planet === 3 && typeof makeYetiMesh === 'function') fig = makeYetiMesh(1, 0x888888);
      else if (trophy.planet === 4 && typeof makeOctopusMesh === 'function') fig = makeOctopusMesh(1, 0x888888);
      else fig = makeAlienMesh(0x999999);
    } catch (e) { fig = null; }
    if (fig) {
      const stone = new THREE.MeshStandardMaterial({ color: 0xdcd6c6, roughness: 0.9, metalness: 0.05 });
      fig.traverse(o => { if (o.isMesh) { o.material = stone; o.castShadow = true; } });
      fig.scale.setScalar(0.62); fig.position.y = 0.82; g.add(fig);
      g.userData.spin = fig;
    }
  } else {
    // shrouded velvet cover with a floating question mark gem
    const shroud = new THREE.Mesh(new THREE.ConeGeometry(0.46, 1.1, 6), new THREE.MeshStandardMaterial({ color: 0x4a2030, roughness: 1 }));
    shroud.position.y = 1.4; g.add(shroud);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), new THREE.MeshStandardMaterial({ color: 0xb060ff, emissive: 0x7020c0, emissiveIntensity: 0.8 }));
    gem.position.y = 2.15; g.add(gem); g.userData.spin = gem;
  }
  return g;
}

// ── Arcade interior: a room full of playable cabinets ───────────────
function populateArcadeInterior(scene, COLS, ROWS, def) {
  const games = (typeof ARCADE_GAMES !== 'undefined') ? ARCADE_GAMES : [];
  // arrange cabinets along the back wall and the two side walls
  const spots = [];
  const backN = Math.min(5, games.length);
  const backSpacing = (COLS - 3) / backN;
  for (let i = 0; i < backN; i++) spots.push({ x: 1.5 + backSpacing * (i + 0.5), z: 1.7, rot: 0 });
  let side = games.length - backN, li = 0;
  for (let i = 0; i < side; i++) {
    const leftSide = i % 2 === 0;
    const row = Math.floor(i / 2);
    if (leftSide) spots.push({ x: 1.7, z: 3.5 + row * 2.2, rot: Math.PI / 2 });
    else spots.push({ x: COLS - 1.7, z: 3.5 + row * 2.2, rot: -Math.PI / 2 });
  }
  const neonCols = [0x22ffdd, 0xff4fa3, 0xffe066, 0x7c5cff, 0x5affa0];
  games.forEach((game, i) => {
    const s = spots[i] || { x: 2 + i, z: 2, rot: 0 };
    const col = neonCols[i % neonCols.length];
    const cab = makeArcadeCabinet(game.emoji, col);
    cab.position.set(s.x, 0, s.z); cab.rotation.y = s.rot; scene.add(cab);
    E.interiorProps.push({
      mesh: cab, x: s.x, z: s.z, spin: cab.userData.screen,
      glow: cab.userData.screen,
      action: () => playArcadeCabinet(game.id)
    });
  });
  // a few colored accent lights for neon ambience (kept low for perf)
  [[2.2, 2.2, 0x22ffdd], [COLS - 2.2, 2.2, 0xff4fa3], [2.2, ROWS - 3, 0x7c5cff], [COLS - 2.2, ROWS - 3, 0x5affa0]]
    .forEach(([x, z, c]) => { const l = new THREE.PointLight(c, 0.5, 6, 2); l.position.set(x, 2.2, z); scene.add(l); });
  // glowing neon strips running along the tops of the side walls
  [1.05, COLS - 1.05].forEach((x, si) => {
    const c = si ? 0xff4fa3 : 0x22ffdd;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, ROWS - 2),
      new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.1 }));
    strip.position.set(x, 1.7, ROWS / 2); scene.add(strip);
  });
  // centrepiece: a glowing prize podium with a spinning star
  const podium = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.5, 18),
    new THREE.MeshStandardMaterial({ color: 0x241f3a, roughness: 0.6 }));
  podium.position.set(COLS / 2, 0.25, ROWS / 2 + 0.5); podium.castShadow = true; scene.add(podium);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.06, 18),
    new THREE.MeshStandardMaterial({ color: 0x22ffdd, emissive: 0x11bbaa, emissiveIntensity: 0.9 }));
  disc.position.set(COLS / 2, 0.53, ROWS / 2 + 0.5); scene.add(disc);
  const prize = new THREE.Mesh(new THREE.OctahedronGeometry(0.34),
    new THREE.MeshStandardMaterial({ color: 0xffe066, emissive: 0xffaa00, emissiveIntensity: 0.9, metalness: 0.5, roughness: 0.3 }));
  prize.position.set(COLS / 2, 1.05, ROWS / 2 + 0.5); scene.add(prize);
  const podLight = new THREE.PointLight(0xffcf66, 0.7, 5, 2); podLight.position.set(COLS / 2, 1.6, ROWS / 2 + 0.5); scene.add(podLight);
  E.interiorProps.push({ mesh: prize, x: COLS / 2, z: ROWS / 2 + 0.5, spin: prize, action: () => showToast('🏆 Prize Podium', 'Rack up Space Coins at the cabinets — big spenders get bragging rights!') });
}

function makeArcadeCabinet(emoji, neon) {
  neon = neon || 0x22ffdd;
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0x201b36, roughness: 0.55, metalness: 0.2 });
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.5, 0.7), body); cab.position.y = 0.75; cab.castShadow = true;
  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.22, 0.5), body); hood.position.set(0, 1.52, 0.12);
  // glowing marquee across the top
  const marquee = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.06), new THREE.MeshStandardMaterial({ color: neon, emissive: neon, emissiveIntensity: 1.0 }));
  marquee.position.set(0, 1.34, 0.37);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.5), new THREE.MeshStandardMaterial({ color: neon, emissive: neon, emissiveIntensity: 1.2 }));
  screen.position.set(0, 1.0, 0.36);
  // side neon trim lines
  [-0.44, 0.44].forEach(sx => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.4, 0.04), new THREE.MeshStandardMaterial({ color: neon, emissive: neon, emissiveIntensity: 0.9 }));
    t.position.set(sx, 0.78, 0.36); g.add(t);
  });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.3), new THREE.MeshStandardMaterial({ color: 0x322a52, roughness: 0.6 }));
  panel.position.set(0, 0.66, 0.4); panel.rotation.x = -0.5;
  const stick = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshStandardMaterial({ color: 0xff3060, emissive: 0xaa1030, emissiveIntensity: 0.5 })); stick.position.set(-0.2, 0.74, 0.45);
  [0x5aff8a, 0xffe066, 0x5ab0ff].forEach((c, i) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 8), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.5 })); b.position.set(0.02 + i * 0.15, 0.72, 0.46); b.rotation.x = Math.PI / 2; g.add(b); });
  g.add(cab, hood, marquee, screen, panel, stick);
  g.userData.screen = screen;
  return g;
}

// Open a specific arcade game overlay, then drop back into the room
function playArcadeCabinet(id) {
  gamePaused = true;
  if (typeof updateArcadeCoins === 'function') updateArcadeCoins();
  document.getElementById('arcadeBackBtn').style.visibility = 'hidden';
  document.getElementById('arcadeCloseBtn').textContent = '✕ Back to Arcade';
  document.getElementById('arcadeCloseBtn').onclick = () => { if (typeof closeArcade === 'function') closeArcade(); };
  if (typeof openArcadeGame === 'function') openArcadeGame(id);
  document.getElementById('arcadePanel').style.display = 'block';
}

// Per-frame: spin exhibits, pulse cabinet screens, auto-exit at the doorway
function updateInterior(dt) {
  if (!E.interior || !E.player) return;
  if (E.interiorProps) E.interiorProps.forEach(pr => {
    if (pr.spin) pr.spin.rotation.y += dt * 0.6;
    if (pr.glow) pr.glow.material.emissiveIntensity = 1.0 + 0.5 * Math.sin(E.time * 4 + pr.x);
    if (pr.light) pr.light.intensity = pr.baseInt + 0.25 * Math.sin(E.time * 4 + pr.x);
  });
  if (E.interiorExitMat) E.interiorExitMat.material.emissiveIntensity = 0.6 + 0.3 * Math.sin(E.time * 3);
  const tx = Math.floor(E.player.position.x), tz = Math.floor(E.player.position.z);
  if (E.doorTiles && E.doorTiles.some(([x, z]) => x === tx && z === tz)) exitInterior();
}

// Space/tap inside an interior: use the nearest exhibit/cabinet
function interiorInteract(worldPoint) {
  if (!E.interiorProps || !E.player) return;
  const p = E.player.position;
  let best = null, bd = 1.7;
  E.interiorProps.forEach(pr => {
    if (!pr.action) return;
    const d = Math.hypot(p.x - pr.x, p.z - pr.z);
    if (d < bd) { bd = d; best = pr; }
  });
  if (best) best.action();
}
