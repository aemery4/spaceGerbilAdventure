// ════════════════════════════════════════
// js/engine3d.js — Space Gerbil Adventure: 3D engine
// One data-driven Three.js engine that plays all five planets.
// Reads world data from buildPNData() (pN-data.js) and per-planet
// look/feel from PLANETS_3D (planets3d.js). Reuses the DOM HUD,
// crafting, gear and skins systems unchanged.
// ════════════════════════════════════════

const E = {
  renderer: null, scene: null, camera: null, clock: null,
  raycaster: null, pointer: new THREE.Vector2(),
  groundPlane: null,
  cfg: null, cols: 0, rows: 0, map: null,
  player: null, playerVel: new THREE.Vector3(),
  resources: [], enemies: [], particles: [], projectiles: [],
  exit: null, exitActive: false,
  keys: {}, running: false, planetNo: 0,
  hurtCd: 0, attackCd: 0, faceAngle: 0,
  clickTarget: null, time: 0
};

// ── One-time renderer/scene setup ───────────────────────────────
function ensureRenderer() {
  if (E.renderer) return;
  const wrap = document.getElementById('view3d');
  const W = wrap.clientWidth, H = wrap.clientHeight;
  const touch = (typeof IS_TOUCH !== 'undefined' && IS_TOUCH);
  E.renderer = new THREE.WebGLRenderer({ antialias: !touch });
  E.renderer.setPixelRatio(Math.min(window.devicePixelRatio, touch ? 1.4 : 2));
  E.renderer.setSize(W, H);
  E.renderer.shadowMap.enabled = !touch; // shadows are the biggest mobile GPU cost
  E.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  wrap.appendChild(E.renderer.domElement);
  E.camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 200);
  E.raycaster = new THREE.Raycaster();
  E.clock = new THREE.Clock();

  window.addEventListener('resize', onResize);
  window.addEventListener('keydown', e => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    E.keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') doAttack(null);
  });
  window.addEventListener('keyup', e => { E.keys[e.key.toLowerCase()] = false; });
  E.renderer.domElement.addEventListener('pointerdown', onPointerDown);
}

function onResize() {
  if (!E.renderer) return;
  const wrap = document.getElementById('view3d');
  const W = wrap.clientWidth, H = wrap.clientHeight;
  E.renderer.setSize(W, H);
  E.camera.aspect = W / H; E.camera.updateProjectionMatrix();
}

// ── Public entry points (called by the menu) ────────────────────
function launchPlanet3D(n) {
  ensureRenderer();
  stopEngine();
  E.planetNo = n;
  const cfg = PLANETS_3D[n];
  E.cfg = cfg;
  buildWorld(n, cfg);
  E.running = true;
  E.clock.start();
  animate();
  const intro = {
    1: 'Area 51! Gather 10 ⚡ fuel, then reach the glowing saucer to leave.',
    2: 'Jungle Zorbax! Grab 15 ⚡ fuel and watch for beasts. Visit the Treetop Village (the wooden platform — a safe zone) and press Space by a merchant 🔶 to trade. Reach the rocket to escape.',
    3: 'Tundra Frigia! 20 ⚡ fuel needed. The cold is full of teeth. Warm up at the camp (the platform — a safe zone) and press Space by a trader 🔶. Reach the rocket to escape.',
    4: 'Aquatic Neptuna! Dive for 25 ⚡ fuel and dodge the deep things. Friendly seahorses 🐴 (with a 🔶 marker) will share tips — swim up and press Space. Reach the rocket to escape.',
    5: 'Home Base! Spend 🪙 Space Coins to build your planet. Press 🔨 Build [B], then click a grass tile to place a hut, farm, shop, arcade, landing pad or fountain. Each 🏠 hut becomes a home for an alien visitor 👽 — build more to attract more! Walk up to a building or alien and press Space.'
  };
  const showIntro = () => showMsg(cfg.emoji + ' ' + cfg.name, intro[n] + '\n\nWASD / Arrows: move   •   Space or Click: gather / attack   •   C: craft   G: gear');
  // Entering Area 51 gets its own cutscene; Planet 2 gets the gerbil fly-away
  if (E.suppressIntro) { /* re-entering (e.g. leaving a building interior) — no intro */ }
  else if (n === 1 && typeof playEnterArea51Cutscene === 'function') { gamePaused = true; playEnterArea51Cutscene(showIntro); }
  else if (n === 2 && typeof playEnterPlanet2Cutscene === 'function') { gamePaused = true; playEnterPlanet2Cutscene(showIntro); }
  else showIntro();
}
// Named shims so existing flow (startPlanet) keeps working
function launchP1(){ launchPlanet3D(1); }
function launchP2(){ launchPlanet3D(2); }
function launchP3(){ launchPlanet3D(3); }
function launchP4(){ launchPlanet3D(4); }
function launchP5(){ launchPlanet3D(5); }

function stopEngine() {
  E.running = false;
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  if (E.scene) {
    E.scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); }
    });
  }
  E.scene = null;
  E.resources = []; E.enemies = []; E.particles = []; E.projectiles = [];
  E.exit = null; E.exitActive = false; E.player = null;
  E.interior = null; E.doorTiles = null; E.interiorProps = null; E.interiorExitMat = null;
}

// Pad a tile map with M tiles of open floor on every side (plus a new outer
// wall), dropping the original border. Returns { map, off } where off is the
// tile offset to add to feature coordinates.
function growMap(map, M) {
  if (!M || M <= 0) return { map, off: 0 };
  const rows = map.length, cols = map[0].length;
  const IW = cols - 2, IH = rows - 2;
  const nCols = cols + 2 * M, nRows = rows + 2 * M;
  const nm = [];
  for (let y = 0; y < nRows; y++) { nm[y] = []; for (let x = 0; x < nCols; x++) nm[y][x] = 0; }
  for (let x = 0; x < nCols; x++) { nm[0][x] = 1; nm[nRows - 1][x] = 1; }
  for (let y = 0; y < nRows; y++) { nm[y][0] = 1; nm[y][nCols - 1] = 1; }
  for (let iy = 0; iy < IH; iy++) for (let ix = 0; ix < IW; ix++) nm[1 + M + iy][1 + M + ix] = map[1 + iy][1 + ix];
  return { map: nm, off: M };
}

// ── World construction ─────────────────────────────────────────
function buildWorld(n, cfg) {
  const data = cfg.build(cfg.tile, cfg.cols, cfg.rows);
  // Enlarge the playable area by padding with open floor + a new outer wall.
  // Home base is left unpadded so its saved building coordinates stay valid.
  const grow = cfg.home ? 0 : (cfg.grow != null ? cfg.grow : ((typeof IS_TOUCH !== 'undefined' && IS_TOUCH) ? 4 : 8));
  const grown = growMap(data.map, grow);
  E.map = grown.map; E.worldOff = grown.off;
  E.rows = E.map.length; E.cols = E.map[0].length;
  const map = E.map;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(cfg.sky);
  scene.fog = new THREE.Fog(cfg.fog[0], cfg.fog[1], cfg.fog[2]);
  E.scene = scene;

  // Lighting
  scene.add(new THREE.AmbientLight(cfg.ambient, 1.1));
  const sun = new THREE.DirectionalLight(cfg.sun, 1.15);
  sun.position.set(cfg.sunPos[0], cfg.sunPos[1], cfg.sunPos[2]);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const S = Math.max(E.cols, E.rows);
  Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 80 });
  scene.add(sun);

  // Ground
  const groundGeo = new THREE.PlaneGeometry(E.cols, E.rows);
  const groundMat = new THREE.MeshStandardMaterial({ color: cfg.ground, roughness: 1 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(E.cols / 2, 0, E.rows / 2);
  ground.receiveShadow = true;
  scene.add(ground);
  E.groundPlane = ground;

  // Subtle grid overlay for readability
  const grid = new THREE.GridHelper(Math.max(E.cols, E.rows), Math.max(E.cols, E.rows), cfg.grid, cfg.grid);
  grid.material.opacity = 0.18; grid.material.transparent = true;
  grid.position.set(E.cols / 2, 0.02, E.rows / 2);
  scene.add(grid);

  buildTiles(map, cfg, scene);
  buildResources(data, cfg, scene);
  buildEnemies(data, cfg, scene);
  sprinkleExtras(cfg, scene);
  ensureFuel(cfg, scene);
  buildPlayer(cfg, scene);
  buildExit(cfg, scene);
  E.merchants = []; E.campfire = null; E.homeMeshes = []; E.seahorses = []; E.bossShots = []; E.dying = [];
  if (typeof hideBossBar === 'function') hideBossBar();
  const _ink = document.getElementById('inkOverlay'); if (_ink) { _ink.style.transition = 'none'; _ink.style.opacity = '0'; }
  if (cfg.village && typeof buildVillage === 'function') buildVillage(data, cfg, scene);
  if (cfg.home && typeof buildHomeStructures === 'function') buildHomeStructures(scene);
  if (data.SEAHORSES && typeof buildSeahorses === 'function') buildSeahorses(data, cfg, scene);
  if (typeof updateBuildButton === 'function') updateBuildButton();

  updateHUD();
}

// Instanced-ish tile meshes (merged by reusing shared geometry/materials)
function buildTiles(map, cfg, scene) {
  const wallGeo = new THREE.BoxGeometry(1, cfg.wall.h, 1);
  const wallMat = new THREE.MeshStandardMaterial({ color: cfg.wall.color, roughness: 0.9 });
  const decoMats = {};
  for (let z = 0; z < E.rows; z++) {
    for (let x = 0; x < E.cols; x++) {
      const v = map[z][x];
      if (v === 1) {
        const m = new THREE.Mesh(wallGeo, wallMat);
        m.position.set(x + 0.5, cfg.wall.h / 2, z + 0.5);
        m.castShadow = true; m.receiveShadow = true;
        scene.add(m);
      } else if (cfg.deco[v]) {
        const spec = cfg.deco[v];
        if (!decoMats[v]) decoMats[v] = new THREE.MeshStandardMaterial({
          color: spec.color, roughness: 0.85,
          emissive: (spec.kind === 'lava' || spec.kind === 'vent') ? new THREE.Color(spec.color) : 0x000000,
          emissiveIntensity: (spec.kind === 'lava' || spec.kind === 'vent') ? 0.6 : 0
        });
        scene.add(makeDeco(spec, decoMats[v], x, z, wallGeo));
      }
    }
  }
}

function makeDeco(spec, mat, x, z, wallGeo) {
  let mesh;
  const h = spec.h;
  switch (spec.kind) {
    case 'tree': {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, h, 6), new THREE.MeshStandardMaterial({ color: 0x5a3a1e }));
      trunk.position.y = h / 2;
      const crownColor = mat.color;
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.55, h * 0.8, 7), new THREE.MeshStandardMaterial({ color: crownColor }));
      crown.position.y = h * 0.9;
      g.add(trunk); g.add(crown); mesh = g; break;
    }
    case 'kelp': {
      const g = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, h, 5), mat);
        b.position.set((Math.random() - 0.5) * 0.4, h / 2, (Math.random() - 0.5) * 0.4);
        g.add(b);
      }
      mesh = g; break;
    }
    case 'vine': {
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, h, 5), mat);
      mesh.position.y = h / 2; break;
    }
    case 'rock': case 'coral': case 'building': case 'wreck': {
      const geo = spec.kind === 'coral'
        ? new THREE.DodecahedronGeometry(0.5)
        : spec.kind === 'building'
          ? new THREE.BoxGeometry(0.9, h, 0.9)
          : new THREE.IcosahedronGeometry(0.5, 0);
      mesh = new THREE.Mesh(geo, mat);
      mesh.scale.y = spec.kind === 'building' ? 1 : Math.max(0.5, h);
      mesh.position.y = h / 2; break;
    }
    case 'bush': case 'snow': case 'garden': case 'vent': {
      mesh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), mat);
      mesh.scale.y = h; mesh.position.y = h * 0.4; break;
    }
    default: { // flat floor patches (swamp/lava/ice/sand/path/pond/floor/trench)
      mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 1), mat);
      mesh.position.y = 0.03; break;
    }
  }
  mesh.position.x = x + 0.5; mesh.position.z = z + 0.5;
  if (mesh.castShadow !== undefined) mesh.castShadow = true;
  mesh.traverse && mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return mesh;
}

// ── Resources ──────────────────────────────────────────────────
function buildResources(data, cfg, scene) {
  E.resources = [];
  const off = E.worldOff || 0;
  const px = !!cfg.underwater; // Planet 4 stores resource coords in pixels, not tiles
  (data.resources || []).forEach(r => {
    const rx = (px ? r.x / cfg.tile : r.x) + off;
    const rz = (px ? r.y / cfg.tile : r.y) + off;
    const mesh = makeResourceMesh(r.type);
    mesh.position.set(rx + 0.5, 0.45, rz + 0.5);
    scene.add(mesh);
    E.resources.push({ type: r.type, hp: r.hp, maxhp: r.maxhp || r.hp, mesh, spin: Math.random() * 6 });
  });
}

function makeResourceMesh(type) {
  let geo, mat, emissive = 0;
  switch (type) {
    case 'rock': geo = new THREE.IcosahedronGeometry(0.32, 0); mat = 0x9a9aa6; break;
    case 'plant': geo = new THREE.ConeGeometry(0.28, 0.6, 6); mat = 0x35c74a; break;
    case 'crystal': geo = new THREE.OctahedronGeometry(0.34); mat = 0x66aaff; emissive = 0.5; break;
    case 'banana': geo = new THREE.TorusGeometry(0.22, 0.09, 8, 12, Math.PI * 1.2); mat = 0xffe23a; break;
    case 'fuel': default: geo = new THREE.SphereGeometry(0.26, 12, 10); mat = 0xffe23a; emissive = 0.9; break;
  }
  const material = new THREE.MeshStandardMaterial({
    color: mat, roughness: 0.4, metalness: type === 'crystal' ? 0.4 : 0.1,
    emissive: emissive ? new THREE.Color(mat) : 0x000000, emissiveIntensity: emissive
  });
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  m.userData.isFuel = (type === 'fuel');
  return m;
}

// ── Enemies ────────────────────────────────────────────────────
function buildEnemies(data, cfg, scene) {
  E.enemies = [];
  const T = cfg.tile;
  cfg.enemyKeys.forEach(key => {
    let arr = data[key];
    if (!arr) return;
    if (!Array.isArray(arr)) arr = [arr]; // miniBoss is a single object
    const off = E.worldOff || 0;
    arr.forEach(e => {
      if (!e || typeof e.x !== 'number') return;
      const variant = e.type || key;              // aquatic enemies carry their own type
      createEnemy(cfg, variant, e.x / T + off, e.y / T + off, e, key);
    });
  });
}

const ENEMY_COLORS = {
  monkeys: 0x7a4a24, golems: 0x6f7d6a, lizards: 0x4aa02c, panthers: 0x1c1a24, parrots: 0xe0392f,
  miniBoss: 0x8a5a2a, tigers: 0xceb888, mammoths: 0x6b4a2f, yeti: 0xeaf2ff,
  squid: 0xb257c8, piranha: 0x9aa2a8, octopus: 0xd0405a
};

function createEnemy(cfg, variant, worldX, worldZ, e, key) {
  e = e || {}; key = key || variant;
  const hp = e.hp || e.maxhp || e.maxHp || 3;
  const boss = (key === 'miniBoss' || key === 'yeti' || variant === 'octopus');
  const size = boss ? (key === 'yeti' ? 1.05 : variant === 'octopus' ? 0.85 : 0.95)
                    : Math.max(0.28, (e.size || 13) / 30);
  const color = e.color ? new THREE.Color(e.color) : new THREE.Color(ENEMY_COLORS[variant] || 0xdd4444);
  const mesh = makeEnemyMesh(cfg.enemyKind, size, color, boss, variant);
  mesh.position.set(worldX, size, worldZ);
  E.scene.add(mesh);
  const rec = {
    mesh, hp, maxhp: hp, size, boss, species: variant,
    neutral: variant === 'mammoths', angered: false,
    speed: (e.speed || 0.6) * 2.2,
    dir: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
    wander: Math.random() * 3, dmg: boss ? 18 : (variant === 'parrots' ? 0 : variant === 'mammoths' ? 6 : 8)
  };
  if (boss) { rec.mode = 'idle'; rec.atkTimer = 2.5 + Math.random() * 1.5; rec.baseEmissive = mesh.userData.body.material.emissiveIntensity; }
  E.enemies.push(rec);
  return rec;
}

// Scatter extra resources + wandering enemies across the enlarged map so the
// bigger arenas don't feel empty.
// Guarantee a planet always has enough fuel to actually finish it
function ensureFuel(cfg, scene) {
  const target = cfg.fuelTarget || 0;
  if (!target) return;
  const need = target + 5; // comfortable margin
  let have = E.resources.filter(r => r.type === 'fuel').length;
  if (have >= need) return;
  const open = [];
  for (let z = 2; z < E.rows - 2; z++) for (let x = 2; x < E.cols - 2; x++) {
    const v = E.map[z][x];
    if (cfg.solid.includes(v) || cfg.damage.includes(v) || v === 7) continue;
    open.push([x, z]);
  }
  let guard = 0;
  while (have < need && open.length && guard++ < 500) {
    const [x, z] = open[Math.floor(Math.random() * open.length)];
    const mesh = makeResourceMesh('fuel'); mesh.position.set(x + 0.5, 0.45, z + 0.5); scene.add(mesh);
    E.resources.push({ type: 'fuel', hp: 1, maxhp: 1, mesh, spin: Math.random() * 6 });
    have++;
  }
}

function sprinkleExtras(cfg, scene) {
  const off = E.worldOff || 0;
  if (off <= 0) return; // home base isn't enlarged
  const open = [];
  for (let z = 2; z < E.rows - 2; z++) for (let x = 2; x < E.cols - 2; x++) {
    const v = E.map[z][x];
    if (cfg.solid.includes(v) || cfg.damage.includes(v) || v === 7) continue;
    // keep a little breathing room around the player spawn
    if (Math.abs(x - (cfg.spawn.tx + off)) < 3 && Math.abs(z - (cfg.spawn.tz + off)) < 3) continue;
    open.push([x, z]);
  }
  if (!open.length) return;
  const pick = () => open[Math.floor(Math.random() * open.length)];

  // Resources
  const rTypes = cfg.underwater ? ['crystal', 'plant', 'rock', 'fuel', 'fuel']
    : cfg.village && cfg.name.indexOf('Jungle') >= 0 ? ['plant', 'rock', 'crystal', 'banana', 'fuel', 'fuel']
      : ['rock', 'plant', 'crystal', 'fuel', 'fuel'];
  const nRes = Math.round((E.cols * E.rows) / 95);
  for (let i = 0; i < nRes; i++) {
    const [x, z] = pick();
    const type = rTypes[Math.floor(Math.random() * rTypes.length)];
    const hp = type === 'rock' ? 3 : (type === 'fuel' || type === 'banana') ? 1 : 2;
    const mesh = makeResourceMesh(type); mesh.position.set(x + 0.5, 0.45, z + 0.5); scene.add(mesh);
    E.resources.push({ type, hp, maxhp: hp, mesh, spin: Math.random() * 6 });
  }

  // Enemies (non-boss). Aquatic uses squid/piranha; jungle/tundra use their beasts.
  let pool = (cfg.enemyKeys || []).filter(k => k !== 'miniBoss' && k !== 'yeti');
  if (cfg.underwater) pool = ['squid', 'piranha'];
  pool = pool.filter(k => k !== 'parrots'); // parrots are harmless collectibles
  if (pool.length) {
    const nEn = Math.round((E.cols * E.rows) / 260);
    for (let i = 0; i < nEn; i++) {
      const [x, z] = pick();
      const variant = pool[Math.floor(Math.random() * pool.length)];
      createEnemy(cfg, variant, x + 0.5, z + 0.5, { speed: 0.6 + Math.random() * 0.5, size: 12 + Math.random() * 4 }, variant);
    }
  }
}

function makeEnemyMesh(kind, size, color, boss, species) {
  if (species === 'monkeys') return makeMonkeyMesh(size, color);
  if (species === 'golems') return makeGolemMesh(size, color);
  if (species === 'lizards') return makeLizardMesh(size, color);
  if (species === 'panthers') return makeCatMesh(size, color, { eye: 0x9dff5a });
  if (species === 'tigers') return makeCatMesh(size, color, { eye: 0xffe000, fangs: true, belly: 0xf2e8d6 });
  if (species === 'parrots') return makeParrotMesh(size, color);
  if (species === 'miniBoss') return makeApeBossMesh(size, color);
  if (species === 'mammoths') return makeMammothMesh(size, color);
  if (species === 'yeti') return makeYetiMesh(size, color);
  if (species === 'squid') return makeSquidMesh(size, color);
  if (species === 'piranha') return makePiranhaMesh(size, color);
  if (species === 'octopus') return makeOctopusMesh(size, color);
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6,
    emissive: color.clone().multiplyScalar(0.25), emissiveIntensity: 0.5 });
  let body;
  if (kind === 'fish') {
    body = new THREE.Mesh(new THREE.SphereGeometry(size, 12, 10), bodyMat);
    body.scale.z = 1.6;
    const tail = new THREE.Mesh(new THREE.ConeGeometry(size * 0.7, size, 6), bodyMat);
    tail.rotation.x = -Math.PI / 2; tail.position.z = -size * 1.4; g.add(tail);
  } else if (kind === 'alien') {
    body = new THREE.Mesh(new THREE.SphereGeometry(size, 12, 10), bodyMat);
    body.scale.y = 1.3;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(size * 0.35, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x220022 }));
    eye.position.set(0, size * 0.4, size * 0.7); g.add(eye);
  } else {
    body = new THREE.Mesh(new THREE.DodecahedronGeometry(size), bodyMat);
    const e1 = new THREE.Mesh(new THREE.SphereGeometry(size * 0.16, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0x552200 }));
    e1.position.set(size * 0.35, size * 0.3, size * 0.75);
    const e2 = e1.clone(); e2.position.x = -size * 0.35; g.add(e1); g.add(e2);
  }
  body.castShadow = true;
  g.add(body);
  g.userData.body = body;
  return g;
}

// A proper low-poly monkey (jungle enemy). Built centred so its feet
// land on the ground when the engine sets position.y = size.
function makeMonkeyMesh(size, color) {
  const s = size;
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color, roughness: 0.85,
    emissive: color.clone().multiplyScalar(0.18), emissiveIntensity: 0.4 });
  const face = new THREE.MeshStandardMaterial({ color: 0xe0bd93, roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x140d05 });

  // Body + belly
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.72 * s, 14, 12), fur);
  body.scale.set(1, 1.08, 0.95);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.5 * s, 12, 10), face);
  belly.scale.set(1, 1.1, 0.6); belly.position.set(0, -0.05 * s, 0.42 * s);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55 * s, 16, 14), fur);
  head.position.set(0, 1.0 * s, 0.06 * s);
  const faceP = new THREE.Mesh(new THREE.SphereGeometry(0.42 * s, 14, 12), face);
  faceP.scale.set(1, 0.95, 0.5); faceP.position.set(0, 0.94 * s, 0.44 * s);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.2 * s, 10, 9), face);
  muzzle.scale.set(1.1, 0.8, 1); muzzle.position.set(0, 0.8 * s, 0.6 * s);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055 * s, 6, 6), dark);
  nose.position.set(0, 0.84 * s, 0.72 * s);

  // Ears (outer fur + inner face)
  const ears = [];
  [-1, 1].forEach(sx => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.26 * s, 10, 10), fur);
    ear.scale.set(1, 1, 0.35); ear.position.set(sx * 0.55 * s, 1.05 * s, 0.02 * s);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.14 * s, 8, 8), face);
    inner.scale.set(1, 1, 0.3); inner.position.set(sx * 0.55 * s, 1.05 * s, 0.1 * s);
    ears.push(ear, inner);
  });

  // Eyes
  const eyes = [-1, 1].map(sx => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.085 * s, 8, 8), dark);
    eye.position.set(sx * 0.17 * s, 1.04 * s, 0.48 * s);
    return eye;
  });

  // Arms — pivot at the shoulder so they can swing
  const armGeo = new THREE.CylinderGeometry(0.12 * s, 0.1 * s, 0.8 * s, 7);
  armGeo.translate(0, -0.4 * s, 0);
  const handGeo = new THREE.SphereGeometry(0.15 * s, 8, 8);
  const arms = [-1, 1].map(sx => {
    const arm = new THREE.Mesh(armGeo, fur);
    arm.position.set(sx * 0.66 * s, 0.4 * s, 0.05 * s);
    arm.rotation.z = sx * 0.32;
    const hand = new THREE.Mesh(handGeo, face);
    hand.position.set(0, -0.82 * s, 0.05 * s);
    arm.add(hand);
    return arm;
  });

  // Legs + feet
  const legGeo = new THREE.CylinderGeometry(0.15 * s, 0.13 * s, 0.66 * s, 7);
  legGeo.translate(0, -0.33 * s, 0);
  [-1, 1].forEach(sx => {
    const leg = new THREE.Mesh(legGeo, fur);
    leg.position.set(sx * 0.28 * s, -0.34 * s, 0.02 * s);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 8, 8), face);
    foot.scale.set(1, 0.6, 1.35); foot.position.set(0, -0.68 * s, 0.14 * s);
    leg.add(foot); g.add(leg);
  });

  // Curled tail
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.15 * s, -0.6 * s),
    new THREE.Vector3(-0.12 * s, 0.05 * s, -1.0 * s),
    new THREE.Vector3(0.1 * s, 0.45 * s, -1.05 * s),
    new THREE.Vector3(0.28 * s, 0.72 * s, -0.78 * s)
  ]);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 20, 0.075 * s, 6), fur);

  g.add(body, belly, head, faceP, muzzle, nose, ...ears, ...eyes, ...arms, tail);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.body = body;
  g.userData.arms = arms;
  return g;
}

// Stone golem — big, slow, rocky and mossy.
function makeGolemMesh(size, color) {
  const s = size;
  const g = new THREE.Group();
  const rock = new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true,
    emissive: new THREE.Color(color).multiplyScalar(0.12), emissiveIntensity: 0.3 });
  const moss = new THREE.MeshStandardMaterial({ color: 0x3f6a2e, roughness: 1, flatShading: true });
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85 * s, 0), rock);
  body.scale.set(1, 1.05, 0.9); body.position.y = -0.1 * s;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42 * s, 0), rock);
  head.position.set(0, 0.78 * s, 0.06 * s);
  const eyes = [-1, 1].map(sx => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.09 * s, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffb020, emissive: 0xff7000, emissiveIntensity: 1.3 }));
    e.position.set(sx * 0.18 * s, 0.82 * s, 0.34 * s); return e;
  });
  const arms = [-1, 1].map(sx => {
    const a = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42 * s, 0), rock);
    a.position.set(sx * 0.98 * s, -0.15 * s, 0); return a;
  });
  [-1, 1].forEach(sx => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.42 * s, 0.55 * s, 0.55 * s), rock);
    l.position.set(sx * 0.4 * s, -0.72 * s, 0); g.add(l);
  });
  const m1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32 * s, 0), moss);
  m1.scale.y = 0.4; m1.position.set(-0.2 * s, 0.55 * s, -0.15 * s);
  const m2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24 * s, 0), moss);
  m2.scale.y = 0.4; m2.position.set(0.5 * s, 0.22 * s, 0.3 * s);
  g.add(body, head, ...eyes, ...arms, m1, m2);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.body = body;
  return g;
}

// Lizard — low, sprawling, long-tailed reptile.
function makeLizardMesh(size, color) {
  const s = size;
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color, roughness: 0.5,
    emissive: new THREE.Color(color).multiplyScalar(0.15), emissiveIntensity: 0.4 });
  const belly = new THREE.MeshStandardMaterial({ color: 0xcfe08a, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55 * s, 14, 12), skin);
  body.scale.set(1, 0.7, 1.9); body.position.set(0, -0.6 * s, 0);
  const bel = new THREE.Mesh(new THREE.SphereGeometry(0.4 * s, 12, 8), belly);
  bel.scale.set(0.85, 0.4, 1.75); bel.position.set(0, -0.82 * s, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42 * s, 12, 10), skin);
  head.scale.set(1, 0.8, 1.15); head.position.set(0, -0.5 * s, 1.2 * s);
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.26 * s, 0.5 * s, 8), skin);
  snout.rotation.x = Math.PI / 2; snout.position.set(0, -0.55 * s, 1.7 * s);
  const eyes = [-1, 1].map(sx => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.1 * s, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffdd33, emissive: 0x553300, emissiveIntensity: 0.8 }));
    e.position.set(sx * 0.27 * s, -0.3 * s, 1.25 * s); return e;
  });
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.42 * s, 2.3 * s, 8), skin);
  tail.rotation.x = -Math.PI / 2; tail.position.set(0, -0.62 * s, -2.0 * s);
  for (let i = 0; i < 4; i++) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.1 * s, 0.24 * s, 5), belly);
    sp.position.set(0, -0.28 * s, (0.7 - i * 0.55) * s); g.add(sp);
  }
  const legGeo = new THREE.CylinderGeometry(0.1 * s, 0.08 * s, 0.5 * s, 6);
  legGeo.translate(0, -0.25 * s, 0);
  const legs = [[0.58, 0.7], [-0.58, 0.7], [0.62, -0.55], [-0.62, -0.55]].map(([lx, lz]) => {
    const l = new THREE.Mesh(legGeo, skin);
    l.position.set(lx * s, -0.6 * s, lz * s); l.rotation.z = lx > 0 ? 0.8 : -0.8; g.add(l);
    l.userData.ph = ((lx > 0) === (lz > 0)) ? 0 : Math.PI; return l;
  });
  g.userData.legs = legs;
  g.add(body, bel, head, snout, ...eyes, tail);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.body = body;
  return g;
}

// Big cat — sleek four-legged body with glowing eyes and a curled tail.
// Shared by panthers (dark) and tigers (orange + stripes + belly).
function makeCatMesh(size, color, opts) {
  opts = opts || {};
  const s = size;
  const g = new THREE.Group();
  const furM = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.05,
    emissive: new THREE.Color(color).multiplyScalar(0.15), emissiveIntensity: 0.35 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5 * s, 14, 12), furM);
  body.scale.set(1, 0.95, 1.9); body.position.set(0, -0.35 * s, 0);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.45 * s, 12, 10), furM);
  chest.position.set(0, -0.3 * s, 0.72 * s);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38 * s, 14, 12), furM);
  head.position.set(0, -0.02 * s, 1.18 * s);
  const ears = [-1, 1].map(sx => {
    const e = new THREE.Mesh(new THREE.ConeGeometry(0.14 * s, 0.24 * s, 5), furM);
    e.position.set(sx * 0.2 * s, 0.32 * s, 1.12 * s); return e;
  });
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.2 * s, 10, 8),
    opts.belly ? new THREE.MeshStandardMaterial({ color: opts.belly, roughness: 0.6 }) : furM);
  muzzle.scale.set(1, 0.8, 1.1); muzzle.position.set(0, -0.14 * s, 1.48 * s);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06 * s, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0xff88aa })); nose.position.set(0, -0.1 * s, 1.66 * s);
  const eyeColor = opts.eye || 0x9dff5a;
  const eyes = [-1, 1].map(sx => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.075 * s, 8, 8),
      new THREE.MeshStandardMaterial({ color: eyeColor, emissive: new THREE.Color(eyeColor).multiplyScalar(0.5), emissiveIntensity: 1.4 }));
    e.position.set(sx * 0.15 * s, 0.05 * s, 1.42 * s); return e;
  });
  const legGeo = new THREE.CylinderGeometry(0.11 * s, 0.09 * s, 0.7 * s, 7);
  legGeo.translate(0, -0.35 * s, 0);
  const legs = [[0.28, 0.8], [-0.28, 0.8], [0.3, -0.72], [-0.3, -0.72]].map(([lx, lz]) => {
    const l = new THREE.Mesh(legGeo, furM); l.position.set(lx * s, -0.35 * s, lz * s); g.add(l);
    l.userData.ph = ((lx > 0) === (lz > 0)) ? 0 : Math.PI; return l;
  });
  g.userData.legs = legs;
  const tc = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.35 * s, -1.0 * s), new THREE.Vector3(0.12 * s, -0.1 * s, -1.5 * s),
    new THREE.Vector3(-0.15 * s, 0.32 * s, -1.6 * s), new THREE.Vector3(0.12 * s, 0.62 * s, -1.3 * s)]);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(tc, 18, 0.08 * s, 6), furM);
  g.add(body, chest, head, ...ears, muzzle, nose, ...eyes, tail);
  if (opts.belly) { // pale underside
    const bel = new THREE.Mesh(new THREE.SphereGeometry(0.42 * s, 12, 8),
      new THREE.MeshStandardMaterial({ color: opts.belly, roughness: 0.6 }));
    bel.scale.set(0.8, 0.6, 1.7); bel.position.set(0, -0.55 * s, 0.1 * s); g.add(bel);
  }
  if (opts.stripes) { // dark bands across the back
    const stripeM = new THREE.MeshStandardMaterial({ color: 0x2a1608, roughness: 0.7 });
    for (let i = 0; i < 5; i++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.9 * s, 0.09 * s, 0.13 * s), stripeM);
      st.position.set(0, 0.08 * s, (0.7 - i * 0.42) * s); g.add(st);
    }
  }
  if (opts.fangs) { // saber teeth jutting down from the muzzle
    const fangM = new THREE.MeshStandardMaterial({ color: 0xfbf7ea, roughness: 0.4 });
    [-1, 1].forEach(sx => {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.05 * s, 0.4 * s, 6), fangM);
      f.position.set(sx * 0.1 * s, -0.34 * s, 1.56 * s); f.rotation.x = Math.PI;
      g.add(f);
    });
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.body = body;
  return g;
}

// Parrot — colourful bird that flaps and hovers (harmless).
function makeParrotMesh(size, color) {
  const s = size;
  const g = new THREE.Group();
  const bodyM = new THREE.MeshStandardMaterial({ color, roughness: 0.5,
    emissive: new THREE.Color(color).multiplyScalar(0.15), emissiveIntensity: 0.5 });
  const wingM = new THREE.MeshStandardMaterial({ color: 0x2a6cff, roughness: 0.5 });
  const tailM = new THREE.MeshStandardMaterial({ color: 0xffd21f, roughness: 0.5 });
  const beakM = new THREE.MeshStandardMaterial({ color: 0xffa020, roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5 * s, 14, 12), bodyM);
  body.scale.set(1, 1.2, 1.2);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36 * s, 12, 10), bodyM);
  head.position.set(0, 0.62 * s, 0.16 * s);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.16 * s, 0.34 * s, 8), beakM);
  beak.rotation.x = Math.PI * 0.62; beak.position.set(0, 0.55 * s, 0.52 * s);
  const eyes = [-1, 1].map(sx => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.06 * s, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x111111 }));
    e.position.set(sx * 0.16 * s, 0.68 * s, 0.36 * s); return e;
  });
  // wings pivot at the shoulder so they can flap
  const wingGeo = new THREE.SphereGeometry(0.4 * s, 8, 6);
  wingGeo.scale(0.25, 0.6, 1.0); wingGeo.translate(0, 0, -0.2 * s);
  const wings = [-1, 1].map(sx => {
    const w = new THREE.Mesh(wingGeo, wingM);
    w.position.set(sx * 0.42 * s, 0.05 * s, 0); return w;
  });
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.28 * s, 0.9 * s, 6), tailM);
  tail.rotation.x = -Math.PI * 0.42; tail.position.set(0, -0.35 * s, -0.55 * s);
  g.add(body, head, beak, ...eyes, ...wings, tail);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.body = body;
  g.userData.wings = wings;
  return g;
}

// Jungle mini-boss — a hulking gorilla with big arms and an angry face.
function makeApeBossMesh(size, color) {
  const s = size;
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color, roughness: 0.85,
    emissive: new THREE.Color(color).multiplyScalar(0.15), emissiveIntensity: 0.4 });
  const face = new THREE.MeshStandardMaterial({ color: 0x3a2416, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.85 * s, 16, 14), fur);
  body.scale.set(1.1, 1.0, 0.9); body.position.y = -0.05 * s;
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.55 * s, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.8 }));
  chest.scale.set(1, 1.1, 0.6); chest.position.set(0, 0.05 * s, 0.55 * s);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5 * s, 16, 14), fur);
  head.position.set(0, 0.85 * s, 0.15 * s);
  const faceP = new THREE.Mesh(new THREE.SphereGeometry(0.34 * s, 12, 10), face);
  faceP.scale.set(1, 1.05, 0.5); faceP.position.set(0, 0.78 * s, 0.52 * s);
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.6 * s, 0.12 * s, 0.2 * s), fur);
  brow.position.set(0, 0.98 * s, 0.5 * s);
  const eyes = [-1, 1].map(sx => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.08 * s, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xff3020, emissive: 0xcc1000, emissiveIntensity: 1.3 }));
    e.position.set(sx * 0.16 * s, 0.86 * s, 0.62 * s); return e;
  });
  // huge arms that reach the ground (knuckles)
  const armGeo = new THREE.CylinderGeometry(0.24 * s, 0.28 * s, 1.3 * s, 8);
  armGeo.translate(0, -0.65 * s, 0);
  const arms = [-1, 1].map(sx => {
    const a = new THREE.Mesh(armGeo, fur);
    a.position.set(sx * 0.95 * s, 0.35 * s, 0.1 * s); a.rotation.z = sx * 0.18;
    const fist = new THREE.Mesh(new THREE.SphereGeometry(0.3 * s, 10, 10), fur);
    fist.position.set(0, -1.3 * s, 0.1 * s); a.add(fist);
    return a;
  });
  [-1, 1].forEach(sx => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * s, 0.24 * s, 0.6 * s, 8), fur);
    leg.position.set(sx * 0.4 * s, -0.85 * s, 0.05 * s); g.add(leg);
  });
  g.add(body, chest, head, faceP, brow, ...eyes, ...arms);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.body = body;
  g.userData.arms = arms;
  return g;
}

// Woolly mammoth — big furry body, trunk, curved tusks (tundra).
function makeMammothMesh(size, color) {
  const s = size;
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color, roughness: 0.95,
    emissive: new THREE.Color(color).multiplyScalar(0.12), emissiveIntensity: 0.3 });
  const ivory = new THREE.MeshStandardMaterial({ color: 0xf3ead0, roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.75 * s, 16, 14), fur);
  body.scale.set(1, 1.0, 1.4); body.position.set(0, -0.15 * s, -0.1 * s);
  const hump = new THREE.Mesh(new THREE.SphereGeometry(0.4 * s, 12, 10), fur);
  hump.position.set(0, 0.45 * s, -0.35 * s);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5 * s, 14, 12), fur);
  head.position.set(0, 0.05 * s, 0.85 * s);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.1 * s, 0.9 * s, 8), fur);
  trunk.position.set(0, -0.35 * s, 1.15 * s); trunk.rotation.x = 0.5;
  const ears = [-1, 1].map(sx => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.24 * s, 10, 8), fur);
    e.scale.set(1, 1, 0.3); e.position.set(sx * 0.5 * s, 0.15 * s, 0.75 * s); return e;
  });
  const eyes = [-1, 1].map(sx => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.06 * s, 8, 8), new THREE.MeshStandardMaterial({ color: 0x1a1008 }));
    e.position.set(sx * 0.22 * s, 0.12 * s, 1.2 * s); return e;
  });
  const tusks = [-1, 1].map(sx => {
    const tc = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx * 0.2 * s, -0.35 * s, 1.2 * s), new THREE.Vector3(sx * 0.35 * s, -0.6 * s, 1.5 * s),
      new THREE.Vector3(sx * 0.3 * s, -0.5 * s, 1.9 * s), new THREE.Vector3(sx * 0.15 * s, -0.15 * s, 2.05 * s)]);
    return new THREE.Mesh(new THREE.TubeGeometry(tc, 12, 0.07 * s, 6), ivory);
  });
  const legGeo = new THREE.CylinderGeometry(0.22 * s, 0.2 * s, 0.65 * s, 8);
  legGeo.translate(0, -0.32 * s, 0);
  const legs = [[0.42, 0.55], [-0.42, 0.55], [0.42, -0.55], [-0.42, -0.55]].map(([lx, lz]) => {
    const l = new THREE.Mesh(legGeo, fur); l.position.set(lx * s, -0.5 * s, lz * s); g.add(l);
    l.userData.ph = ((lx > 0) === (lz > 0)) ? 0 : Math.PI; return l;
  });
  g.userData.legs = legs;
  g.add(body, hump, head, trunk, ...ears, ...eyes, ...tusks);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.body = body;
  return g;
}

// Yeti — tundra boss: huge white shaggy beast with horns and fangs.
function makeYetiMesh(size, color) {
  const s = size;
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true,
    emissive: 0x223344, emissiveIntensity: 0.3 });
  const face = new THREE.MeshStandardMaterial({ color: 0xbfc9d6, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 * s, 1), fur);
  body.scale.set(1.1, 1.15, 0.95); body.position.y = 0;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 * s, 1), fur);
  head.position.set(0, 1.0 * s, 0.12 * s);
  const faceP = new THREE.Mesh(new THREE.SphereGeometry(0.34 * s, 12, 10), face);
  faceP.scale.set(1, 0.9, 0.5); faceP.position.set(0, 0.95 * s, 0.5 * s);
  const eyes = [-1, 1].map(sx => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.08 * s, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x40b0ff, emissive: 0x1060cc, emissiveIntensity: 1.4 }));
    e.position.set(sx * 0.16 * s, 1.02 * s, 0.6 * s); return e;
  });
  const horns = [-1, 1].map(sx => {
    const h = new THREE.Mesh(new THREE.ConeGeometry(0.1 * s, 0.4 * s, 6), new THREE.MeshStandardMaterial({ color: 0xe8e0d0 }));
    h.position.set(sx * 0.3 * s, 1.4 * s, 0.05 * s); h.rotation.z = sx * -0.3; return h;
  });
  const fangs = [-1, 1].map(sx => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.05 * s, 0.16 * s, 5), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    f.rotation.x = Math.PI; f.position.set(sx * 0.1 * s, 0.78 * s, 0.62 * s); return f;
  });
  const armGeo = new THREE.CylinderGeometry(0.22 * s, 0.24 * s, 1.2 * s, 7);
  armGeo.translate(0, -0.6 * s, 0);
  const arms = [-1, 1].map(sx => {
    const a = new THREE.Mesh(armGeo, fur);
    a.position.set(sx * 1.0 * s, 0.4 * s, 0.05 * s); a.rotation.z = sx * 0.22;
    const fist = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26 * s, 0), fur);
    fist.position.set(0, -1.2 * s, 0); a.add(fist); return a;
  });
  [-1, 1].forEach(sx => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * s, 0.28 * s, 0.7 * s, 7), fur);
    leg.position.set(sx * 0.42 * s, -0.85 * s, 0.05 * s); g.add(leg);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.24 * s, 8, 8), face);
    foot.scale.set(1, 0.5, 1.4); foot.position.set(sx * 0.42 * s, -1.15 * s, 0.2 * s); g.add(foot);
  });
  g.add(body, head, faceP, ...eyes, ...horns, ...fangs, ...arms);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.body = body;
  g.userData.arms = arms;
  return g;
}

// Squid — soft mantle with dangling tentacles (aquatic).
function makeSquidMesh(size, color) {
  const s = size;
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color, roughness: 0.4,
    emissive: new THREE.Color(color).multiplyScalar(0.3), emissiveIntensity: 0.6, transparent: true, opacity: 0.92 });
  const mantle = new THREE.Mesh(new THREE.ConeGeometry(0.55 * s, 1.2 * s, 12), skin);
  mantle.position.y = 0.35 * s;
  const headB = new THREE.Mesh(new THREE.SphereGeometry(0.5 * s, 14, 12), skin);
  headB.scale.set(1, 0.8, 1); headB.position.y = -0.1 * s;
  const eyes = [-1, 1].map(sx => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x0a0a12, emissive: 0x111122 }));
    e.position.set(sx * 0.3 * s, -0.05 * s, 0.34 * s); return e;
  });
  const tentacles = [];
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    const tc = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(a) * 0.3 * s, -0.4 * s, Math.sin(a) * 0.3 * s),
      new THREE.Vector3(Math.cos(a) * 0.4 * s, -0.8 * s, Math.sin(a) * 0.4 * s),
      new THREE.Vector3(Math.cos(a) * 0.3 * s, -1.2 * s, Math.sin(a) * 0.3 * s)]);
    const t = new THREE.Mesh(new THREE.TubeGeometry(tc, 10, 0.07 * s, 5), skin);
    tentacles.push(t); g.add(t);
  }
  g.add(mantle, headB, ...eyes);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.body = headB;
  g.userData.tentacles = tentacles;
  return g;
}

// Piranha — small angry fish with a toothy grin (aquatic).
function makePiranhaMesh(size, color) {
  const s = size;
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3,
    emissive: new THREE.Color(color).multiplyScalar(0.2), emissiveIntensity: 0.4 });
  const belly = new THREE.MeshStandardMaterial({ color: 0xd83b3b, roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55 * s, 14, 12), skin);
  body.scale.set(0.7, 1.0, 1.5);
  const bel = new THREE.Mesh(new THREE.SphereGeometry(0.4 * s, 12, 8), belly);
  bel.scale.set(0.55, 0.7, 1.3); bel.position.set(0, -0.28 * s, 0.15 * s);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.4 * s, 0.6 * s, 4), skin);
  tail.rotation.x = Math.PI / 2; tail.position.z = -1.0 * s; tail.scale.set(1, 0.4, 1);
  const topFin = new THREE.Mesh(new THREE.ConeGeometry(0.18 * s, 0.4 * s, 4), skin);
  topFin.position.set(0, 0.5 * s, -0.1 * s); topFin.scale.set(0.4, 1, 1);
  const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.3 * s, 0.4 * s, 8),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a })); jaw.rotation.x = -Math.PI / 2;
  jaw.position.set(0, -0.1 * s, 0.75 * s); jaw.scale.set(1, 0.6, 1);
  const teeth = [];
  for (let i = 0; i < 6; i++) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.04 * s, 0.12 * s, 4), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    const a = (i / 6) * Math.PI - Math.PI / 2;
    t.position.set(Math.sin(a) * 0.22 * s, -0.02 * s, 0.82 * s); t.rotation.x = Math.PI; teeth.push(t);
  }
  const eyes = [-1, 1].map(sx => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.08 * s, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffdd00, emissive: 0x553300, emissiveIntensity: 0.8 }));
    e.position.set(sx * 0.28 * s, 0.12 * s, 0.45 * s); return e;
  });
  g.add(body, bel, tail, topFin, jaw, ...teeth, ...eyes);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.body = body;
  return g;
}

// Octopus — aquatic boss: bulbous head + eight writhing tentacles.
function makeOctopusMesh(size, color) {
  const s = size;
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color, roughness: 0.5,
    emissive: new THREE.Color(color).multiplyScalar(0.25), emissiveIntensity: 0.5 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.8 * s, 16, 14), skin);
  head.scale.set(1, 1.2, 1); head.position.y = 0.4 * s;
  const brow = new THREE.Mesh(new THREE.TorusGeometry(0.5 * s, 0.08 * s, 8, 16, Math.PI), skin);
  brow.position.set(0, 0.75 * s, 0.35 * s); brow.rotation.x = 0.6;
  const eyes = [-1, 1].map(sx => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.2 * s, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffe020, emissive: 0xcc7000, emissiveIntensity: 1.2 }));
    e.position.set(sx * 0.34 * s, 0.5 * s, 0.55 * s);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.09 * s, 8, 8), new THREE.MeshStandardMaterial({ color: 0x000000 }));
    p.position.set(sx * 0.34 * s, 0.5 * s, 0.72 * s); g.add(p); return e;
  });
  const tentacles = [];
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const tc = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(a) * 0.5 * s, -0.1 * s, Math.sin(a) * 0.5 * s),
      new THREE.Vector3(Math.cos(a) * 0.95 * s, -0.5 * s, Math.sin(a) * 0.95 * s),
      new THREE.Vector3(Math.cos(a) * 1.2 * s, -0.9 * s, Math.sin(a) * 1.2 * s),
      new THREE.Vector3(Math.cos(a) * 1.0 * s, -1.15 * s, Math.sin(a) * 1.0 * s)]);
    const t = new THREE.Mesh(new THREE.TubeGeometry(tc, 14, 0.12 * s, 6), skin);
    tentacles.push(t); g.add(t);
  }
  g.add(head, brow, ...eyes);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.body = head;
  g.userData.tentacles = tentacles;
  return g;
}

// ── Player (the astronaut) ─────────────────────────────────────
function buildPlayer(cfg, scene) {
  const g = new THREE.Group();
  const sc = (typeof SKIN_SUITS !== 'undefined' && SKIN_SUITS[save.skin]) || { suit: '#eef2f7', accent: '#2f7ad8', visor: '#12202f' };
  const suit = new THREE.MeshStandardMaterial({ color: new THREE.Color(sc.suit), roughness: 0.7 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x9aa4b2, roughness: 0.6, metalness: 0.2 });
  const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(sc.visor), roughness: 0.3, metalness: 0.4 });
  const accentColor = new THREE.Color(sc.accent);
  const accent = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.5, emissive: accentColor.clone().multiplyScalar(0.15), emissiveIntensity: 0.4 });

  // Torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.62, 14), suit);
  torso.position.y = 0.66; torso.castShadow = true;
  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), suit);
  shoulders.scale.set(1, 0.5, 0.9); shoulders.position.y = 0.9;
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.06), accent); // control panel
  chest.position.set(0, 0.72, 0.26);
  // Backpack
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.22), grey);
  pack.position.set(0, 0.7, -0.28); pack.castShadow = true;
  // Helmet
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 14), suit);
  helmet.position.set(0, 1.12, 0); helmet.castShadow = true;
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12, Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.32, Math.PI * 0.36), dark);
  visor.position.set(0, 1.12, 0.06);
  const visorGlow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshStandardMaterial({ color: 0x7fd0ff, emissive: 0x3aa0e0, emissiveIntensity: 0.6, transparent: true, opacity: 0.5 }));
  visorGlow.position.set(0.07, 1.16, 0.2);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 8, 20), accent);
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.92; // neck ring
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 5), grey);
  antenna.position.set(0.18, 1.3, -0.05);
  const antTip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), new THREE.MeshStandardMaterial({ color: 0xff5050, emissive: 0xcc2020, emissiveIntensity: 1 }));
  antTip.position.set(0.18, 1.4, -0.05);

  // Arms (pivot at shoulder for a walking swing)
  const armGeo = new THREE.CylinderGeometry(0.082, 0.075, 0.44, 8);
  armGeo.translate(0, -0.22, 0);
  const arms = [-1, 1].map(sx => {
    const a = new THREE.Mesh(armGeo, suit);
    a.position.set(sx * 0.3, 0.86, 0); a.rotation.z = sx * 0.08; a.castShadow = true;
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), grey);
    glove.position.set(0, -0.44, 0); a.add(glove);
    return a;
  });
  // Legs + boots (pivot at the hip so they can swing when walking)
  const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.42, 8);
  legGeo.translate(0, -0.21, 0);
  const legs = [-1, 1].map(sx => {
    const leg = new THREE.Mesh(legGeo, suit);
    leg.position.set(sx * 0.13, 0.46, 0); leg.castShadow = true;
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.24), grey);
    boot.position.set(0, -0.42, 0.06); leg.add(boot);
    g.add(leg); return leg;
  });

  g.add(torso, shoulders, chest, pack, helmet, visor, visorGlow, ring, antenna, antTip, ...arms);
  g.userData.arms = arms;
  g.userData.legs = legs;
  g.userData.antTip = antTip;

  const spawn = cfg.spawn, off = E.worldOff || 0;
  g.position.set(spawn.tx + off + 0.5, 0, spawn.tz + off + 0.5);
  scene.add(g);
  E.player = g;
  E.faceAngle = 0;
  E.camera.position.set(g.position.x, 9, g.position.z + 9);
  E.camera.lookAt(g.position);
}
// Each wardrobe skin (unchanged in skins.js) maps to a spacesuit palette
// for the 3D astronaut: { suit, accent, visor }.
const SKIN_SUITS = {
  astronaut:   { suit: '#eef2f7', accent: '#2f7ad8', visor: '#12202f' },
  penguin:     { suit: '#20242e', accent: '#f2f4f8', visor: '#0a0e14' },
  lion:        { suit: '#f0c85a', accent: '#ffe066', visor: '#3a2a08' },
  tiger:       { suit: '#e8892a', accent: '#ffc266', visor: '#331a00' },
  robot:       { suit: '#aab4c2', accent: '#7fd0ff', visor: '#0a1622' },
  fox:         { suit: '#c96a35', accent: '#ffb060', visor: '#2a1408' },
  dragon:      { suit: '#7a1030', accent: '#ff5522', visor: '#1a0008' },
  monkey_skin: { suit: '#4a6a2a', accent: '#a8d860', visor: '#10200a' },
  alien_skin:  { suit: '#2aa050', accent: '#7dff5a', visor: '#001a08' },
  frog:        { suit: '#3fbf50', accent: '#d6ff40', visor: '#082010' },
  star_child:  { suit: '#3a2a66', accent: '#b388ff', visor: '#0a0620' },
  skeleton:    { suit: '#e8e4d8', accent: '#3a3a3a', visor: '#111111' },
  wizard:      { suit: '#5a2a9a', accent: '#c060ff', visor: '#1a0630' }
};

// ── Exit rocket / portal ───────────────────────────────────────
function buildExit(cfg, scene) {
  if (cfg.home) { E.exit = null; return; } // home base has no exit gate
  const spot = findOpenTile(cfg, Math.floor(E.cols * 0.5), Math.floor(E.rows * 0.55));
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcfd6e0, metalness: 0.5, roughness: 0.3 });
  const bodyM = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 2.2, 16), bodyMat);
  bodyM.position.y = 1.3;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 16), new THREE.MeshStandardMaterial({ color: 0xff5555 }));
  nose.position.y = 2.9;
  const finMat = new THREE.MeshStandardMaterial({ color: 0xff5555 });
  for (let i = 0; i < 3; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.5), finMat);
    const a = i / 3 * Math.PI * 2;
    fin.position.set(Math.cos(a) * 0.5, 0.6, Math.sin(a) * 0.5);
    fin.lookAt(0, 0.6, 0); g.add(fin);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.08, 8, 32),
    new THREE.MeshStandardMaterial({ color: 0x44ff88, emissive: 0x22aa55, emissiveIntensity: 1 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.1;
  g.add(bodyM, nose, ring);
  g.position.set(spot.x + 0.5, 0, spot.z + 0.5);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(g);
  E.exit = { mesh: g, ring, x: spot.x + 0.5, z: spot.z + 0.5};
}

function findOpenTile(cfg, cx, cz) {
  const isBlocked = (x, z) => x < 0 || z < 0 || x >= E.cols || z >= E.rows ||
    cfg.solid.includes(E.map[z][x]);
  for (let r = 0; r < Math.max(E.cols, E.rows); r++) {
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx, z = cz + dz;
      if (!isBlocked(x, z)) return { x, z };
    }
  }
  return { x: cfg.spawn.tx, z: cfg.spawn.tz };
}

// ── Input → actions ────────────────────────────────────────────
function onPointerDown(ev) {
  if (!E.running || gamePaused) return;
  const rect = E.renderer.domElement.getBoundingClientRect();
  E.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  E.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  E.raycaster.setFromCamera(E.pointer, E.camera);
  const hit = new THREE.Vector3();
  E.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit);
  if (!hit) return;
  // In home build mode, a ground click opens the build menu for that tile
  if (E.cfg && E.cfg.home && typeof homeBuildMode !== 'undefined' && homeBuildMode) {
    homeBuildClick(hit); return;
  }
  doAttack(hit);
}

function doAttack(worldPoint) {
  if (!E.player || gamePaused) return;
  // Inside a building interior, Space/tap uses the nearest exhibit/cabinet
  if (E.interior) { if (typeof interiorInteract === 'function') interiorInteract(worldPoint); return; }
  const p = E.player.position;
  const reach = save.items.includes('scanner') ? 2.6 : 1.7;
  const near = (obj) => worldPoint
    ? worldPoint.distanceTo(obj.mesh.position) < 1.0 && p.distanceTo(obj.mesh.position) < reach + 0.6
    : p.distanceTo(obj.mesh.position) < reach;

  // Talk to a village merchant if we're standing by one
  if (typeof merchantNear === 'function') {
    const mn = merchantNear(worldPoint);
    if (mn) { openP2Shop(mn.data); return; }
  }
  // Greet a home-base alien visitor first (they live by their huts)
  if (E.cfg.home && typeof homeAlienNear === 'function') {
    const al = homeAlienNear(worldPoint);
    if (al) { useHomeAlien(al); return; }
  }
  // Otherwise use a home-base building if we're standing by one
  if (E.cfg.home && typeof homeBuildingNear === 'function') {
    const hb = homeBuildingNear(worldPoint);
    if (hb) { useHomeBuilding(hb); return; }
  }
  // Talk to a seahorse guide (Planet 4)
  if (typeof seahorseNear === 'function') {
    const sh = seahorseNear(worldPoint);
    if (sh) { useSeahorse(sh); return; }
  }

  // Resources first
  for (let i = E.resources.length - 1; i >= 0; i--) {
    const r = E.resources[i];
    if (near(r)) { hitResource(i); return; }
  }
  // Then enemies
  let best = -1, bestD = 1e9;
  for (let i = 0; i < E.enemies.length; i++) {
    const en = E.enemies[i];
    const d = p.distanceTo(en.mesh.position);
    const inReach = worldPoint ? (worldPoint.distanceTo(en.mesh.position) < 1.1 && d < reach + 1) : d < reach + 0.4;
    if (inReach && d < bestD) { bestD = d; best = i; }
  }
  if (best >= 0) hitEnemy(best);
}

function hitResource(i) {
  const r = E.resources[i];
  r.hp--;
  E.punch = 0.18;
  r.hitAnim = 0.16;
  if (typeof SFX !== 'undefined') SFX.gather();
  spawnParticles(r.mesh.position, r.mesh.material.color, 8);
  if (r.hp <= 0) {
    save.resources[r.type] = (save.resources[r.type] || 0) + 1;
    spawnCollect(r.mesh.position, r.mesh.material.color);
    if (typeof SFX !== 'undefined' && r.type === 'fuel') SFX.fuel();
    E.scene.remove(r.mesh);
    E.resources.splice(i, 1);
    persist(); updateHUD();
    if (r.type === 'fuel') checkExitReady();
  }
}

// Upward sparkle burst when a resource is collected
function spawnCollect(pos, color) {
  const geo = new THREE.SphereGeometry(0.06, 5, 4);
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
    m.position.copy(pos); E.scene.add(m);
    E.particles.push({ mesh: m, life: 0.5 + Math.random() * 0.3, vel: new THREE.Vector3((Math.random() - 0.5) * 2.5, 3 + Math.random() * 2.5, (Math.random() - 0.5) * 2.5) });
  }
}

function weaponDamage() {
  const w = (typeof getActiveWeapon === 'function' && getActiveWeapon()) || null;
  const table = { banana_sword: 2, rock_hammer: 3, obsidian_axe: 5, yeti_claw: 8, mammoth_tusk: 6, laser: 3, bone_spear: 4 };
  return table[w] || 1;
}

function hitEnemy(i) {
  const en = E.enemies[i];
  if (en.neutral && !en.angered) { en.angered = true; showToast('🦣 Enraged!', 'The mammoth turns on you!'); }
  en.hp -= weaponDamage();
  E.punch = 0.2;
  if (typeof SFX !== 'undefined') SFX.hit();
  spawnParticles(en.mesh.position, new THREE.Color(0xff5555), 10);
  en.mesh.userData.body.material.emissiveIntensity = 1.5;
  en.flash = 0.15;
  if (en.hp <= 0) {
    spawnParticles(en.mesh.position, en.mesh.userData.body.material.color, 18);
    if (typeof SFX !== 'undefined') { en.boss ? SFX.win() : SFX.enemyDie(); }
    if (en.boss) {
      save.spaceCoins = (save.spaceCoins || 0) + 100;
      showToast('🏆 Boss Defeated!', (BOSS_NAME[en.species] || 'The boss') + ' is vanquished! +100 🪙');
      if (typeof hideBossBar === 'function') hideBossBar();
    }
    startEnemyDeath(en);
    E.enemies.splice(i, 1);
    persist(); updateHUD();
  }
}

// Enemies topple over and fade out instead of vanishing
function startEnemyDeath(en) {
  const m = en.mesh;
  m.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; } });
  E.dying.push({ mesh: m, t: 0, dur: 0.7, fall: Math.random() < 0.5 ? 1 : -1, boss: en.boss });
}
function updateDying(dt) {
  if (!E.dying) return;
  for (let i = E.dying.length - 1; i >= 0; i--) {
    const d = E.dying[i]; d.t += dt;
    const p = Math.min(1, d.t / d.dur);
    d.mesh.rotation.z = d.fall * p * (Math.PI / 2);   // topple
    d.mesh.scale.setScalar(1 - p * 0.35);
    d.mesh.traverse(o => { if (o.isMesh) o.material.opacity = 1 - p; });
    if (p >= 1) { E.scene.remove(d.mesh); E.dying.splice(i, 1); }
  }
}

// ── Particles ──────────────────────────────────────────────────
function spawnParticles(pos, color, n) {
  const geo = new THREE.SphereGeometry(0.06, 5, 4);
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
    m.position.copy(pos);
    E.scene.add(m);
    E.particles.push({
      mesh: m, life: 0.5 + Math.random() * 0.3,
      vel: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 4 + 1, (Math.random() - 0.5) * 4)
    });
  }
}

// ── Win / lose ─────────────────────────────────────────────────
function checkExitReady() {
  if (!E.cfg.fuelTarget) return;
  if ((save.resources.fuel || 0) >= E.cfg.fuelTarget && !E.exitActive) {
    E.exitActive = true;
    if (typeof SFX !== 'undefined') SFX.powerup();
    showToast('🚀 Rocket ready!', 'You have enough fuel. Reach the rocket to blast off.');
  }
}

function planetCleared() {
  E.running = false;
  const n = E.planetNo;
  if (!save.planetsCleared.includes(n)) save.planetsCleared.push(n);
  save.spaceCoins = (save.spaceCoins || 0) + 50;
  if (typeof SFX !== 'undefined') SFX.win();
  persist();
  const next = n + 1;
  const hasNext = next <= 4;
  showMsg('🎉 Planet Cleared!', E.cfg.name + ' complete! +50 🪙\n\n' +
    (hasNext ? 'Onward to the next world…' : 'You have cleared every planet. Legendary gerbil!'),
    () => {
      if (hasNext) {
        if (typeof playTransitionCutscene === 'function') playTransitionCutscene(n, next, () => startPlanet(next));
        else startPlanet(next);
      } else {
        if (typeof playEndingCutscene === 'function') playEndingCutscene(() => goMenu());
        else goMenu();
      }
    },
    hasNext ? 'Next Planet' : 'Return to Menu');
}

function hurtPlayer(dmg) {
  if (E.hurtCd > 0) return;
  // Village / camp platform (tile 7) is a total safe zone — no damage there
  if (E.cfg && E.cfg.village && tileAt(E.player.position.x, E.player.position.z) === 7) return;
  let d = dmg;
  if (save.items.includes('shield')) d *= 0.5;
  save.hp -= d;
  E.hurtCd = 0.8;
  if (typeof SFX !== 'undefined') SFX.hurt();
  flashDamage();
  updateHUD();
  if (save.hp <= 0) {
    E.running = false;
    save.hp = 0; updateHUD();
    loseLife(() => { launchPlanet3D(E.planetNo); });
  }
}

function flashDamage() {
  const el = document.getElementById('view3d');
  el.style.boxShadow = 'inset 0 0 80px 20px rgba(255,0,0,0.6)';
  setTimeout(() => { el.style.boxShadow = ''; }, 140);
}

// ── Main loop ──────────────────────────────────────────────────
function animate() {
  if (!E.running) return;
  animFrameId = requestAnimationFrame(animate);
  const dt = Math.min(E.clock.getDelta(), 0.05);
  E.time += dt;
  if (!gamePaused) {
    updatePlayer(dt);
    updateEnemies(dt);
    updateResources(dt);
    updateParticles(dt);
    updateDying(dt);
    updateExit(dt);
    if (typeof updateVillage === 'function') updateVillage(dt);
    if (typeof updateHome === 'function') updateHome(dt);
    if (typeof updateInterior === 'function') updateInterior(dt);
    if (typeof updateSeahorses === 'function') updateSeahorses(dt);
    if (typeof updateBossShots === 'function') updateBossShots(dt);
    if (typeof updateBossBar === 'function') updateBossBar();
    if (E.hurtCd > 0) E.hurtCd -= dt;
  }
  updateCamera(dt);
  E.renderer.render(E.scene, E.camera);
}

function tileAt(x, z) {
  const tx = Math.floor(x), tz = Math.floor(z);
  if (tx < 0 || tz < 0 || tx >= E.cols || tz >= E.rows) return 1;
  return E.map[tz][tx];
}
function isSolid(x, z) { return E.cfg.solid.includes(tileAt(x, z)); }

function updatePlayer(dt) {
  const k = E.keys;
  let mx = 0, mz = 0;
  if (k['w'] || k['arrowup']) mz -= 1;
  if (k['s'] || k['arrowdown']) mz += 1;
  if (k['a'] || k['arrowleft']) mx -= 1;
  if (k['d'] || k['arrowright']) mx += 1;
  let mag = 1;
  if (E.moveVec && (E.moveVec.x || E.moveVec.z)) { mx = E.moveVec.x; mz = E.moveVec.z; mag = Math.min(1, Math.hypot(mx, mz)); } // touch joystick
  let speed = save.items.includes('boots') ? 6.5 : 4.8;
  if (E.cfg.slow.includes(tileAt(E.player.position.x, E.player.position.z))) speed *= 0.5;
  const p = E.player.position;
  if (mx || mz) {
    const len = Math.hypot(mx, mz) || 1; mx /= len; mz /= len;
    const nx = p.x + mx * speed * mag * dt;
    const nz = p.z + mz * speed * mag * dt;
    const rad = 0.34;
    if (!isSolid(nx + Math.sign(mx) * rad, p.z)) p.x = nx;
    if (!isSolid(p.x, nz + Math.sign(mz) * rad)) p.z = nz;
    E.faceAngle = Math.atan2(mx, mz);
  }
  // ── Astronaut animation: walk cycle when moving, idle bob otherwise ──
  const ud = E.player.userData;
  const moving = !!(mx || mz);
  if (moving) {
    E.walkPhase = (E.walkPhase || 0) + dt * speed * 2.4;
    const sw = Math.sin(E.walkPhase) * 0.55;
    if (ud.arms) { ud.arms[0].rotation.x = sw; ud.arms[1].rotation.x = -sw; }
    if (ud.legs) { ud.legs[0].rotation.x = -sw * 0.85; ud.legs[1].rotation.x = sw * 0.85; }
    E.player.position.y = Math.abs(Math.sin(E.walkPhase)) * 0.07;
    E.player.rotation.z = Math.sin(E.walkPhase) * 0.03; // subtle body sway
  } else {
    if (ud.arms) { ud.arms[0].rotation.x *= 0.8; ud.arms[1].rotation.x *= 0.8; }
    if (ud.legs) { ud.legs[0].rotation.x *= 0.8; ud.legs[1].rotation.x *= 0.8; }
    E.player.position.y = Math.sin(E.time * 2) * 0.02; // gentle idle breathing
    E.player.rotation.z *= 0.8;
  }
  // Punch when attacking/gathering (overrides the walk pose briefly)
  if (E.punch > 0) {
    E.punch -= dt;
    if (ud.arms) { ud.arms[1].rotation.x = -1.5; ud.arms[0].rotation.x = 0.3; }
  }
  // Antenna blink
  if (ud.antTip) ud.antTip.material.emissiveIntensity = 0.6 + Math.abs(Math.sin(E.time * 4)) * 0.9;
  E.player.rotation.y = E.faceAngle;

  // damage floor tiles
  if (E.cfg.damage.includes(tileAt(p.x, p.z))) hurtPlayer(0.4);

  // fuel magnet
  if (save.items.includes('magnet')) {
    E.resources.forEach((r, i) => {
      if (r.type === 'fuel' && p.distanceTo(r.mesh.position) < 3) {
        r.mesh.position.lerp(new THREE.Vector3(p.x, 0.45, p.z), 0.15);
        if (p.distanceTo(r.mesh.position) < 0.6) hitResource(i);
      }
    });
  }
}

function updateEnemies(dt) {
  const p = E.player.position;
  const playerSafe = E.cfg.village && tileAt(p.x, p.z) === 7; // player is on the safe platform
  E.enemies.forEach(en => {
    const m = en.mesh;
    en.wander -= dt;
    const d = p.distanceTo(m.position);
    const hostile = (!en.neutral || en.angered) && !playerSafe; // give up the chase if the player is safe
    if (en.boss && typeof updateBoss === 'function') {
      updateBoss(en, dt, d, p, playerSafe);
    } else {
      // Village (tile 7) is a safe zone — enemies can't step onto it.
      const blocked = (x, z) => isSolid(x, z) || (E.cfg.village && tileAt(x, z) === 7);
      if (playerSafe && d < 9) { // flee — steer around obstacles so nobody wedges at the border
        let ax = m.position.x - p.x, az = m.position.z - p.z; const L = Math.hypot(ax, az) || 1; ax /= L; az /= L;
        if (blocked(m.position.x + ax * 0.7, m.position.z + az * 0.7)) {
          const rx = -az, rz = ax; // try sliding perpendicular to the obstacle
          if (!blocked(m.position.x + rx * 0.7, m.position.z + rz * 0.7)) { ax = rx; az = rz; }
          else if (!blocked(m.position.x - rx * 0.7, m.position.z - rz * 0.7)) { ax = -rx; az = -rz; }
        }
        en.dir.set(ax, 0, az);
      } else if (hostile && d < 6) { // chase
        en.dir.set(p.x - m.position.x, 0, p.z - m.position.z).normalize();
      } else if (en.wander <= 0) {
        en.dir.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
        en.wander = 1 + Math.random() * 2;
      }
      const nx = m.position.x + en.dir.x * en.speed * dt;
      const nz = m.position.z + en.dir.z * en.speed * dt;
      if (!blocked(nx, m.position.z)) m.position.x = nx; else en.dir.x *= -1;
      if (!blocked(m.position.x, nz)) m.position.z = nz; else en.dir.z *= -1;
    }
    m.rotation.y = Math.atan2(en.dir.x, en.dir.z);
    if (!en.boss) m.rotation.z = Math.sin(E.time * 9 + en.wander) * 0.07; // waddle
    if (m.userData.legs) { // 4-legged gait
      en.gait = (en.gait || 0) + dt * en.speed * 2.6;
      m.userData.legs.forEach(l => { l.rotation.x = Math.sin(en.gait + l.userData.ph) * 0.5; });
    }
    if (!en.skipYBob) m.position.y = en.size + Math.abs(Math.sin(E.time * 6 + en.wander)) * 0.12;
    if (m.userData.arms) { // monkeys swing their arms as they move
      const sw = Math.sin(E.time * 7 + en.wander) * (d < 6 ? 0.7 : 0.35);
      m.userData.arms[0].rotation.x = sw;
      m.userData.arms[1].rotation.x = -sw;
    }
    if (m.userData.wings) { // parrots flap
      const f = Math.sin(E.time * 16 + en.wander) * 0.7 + 0.35;
      m.userData.wings[0].rotation.z = f;
      m.userData.wings[1].rotation.z = -f;
    }
    if (m.userData.tentacles) { // squid/octopus tentacle sway
      m.userData.tentacles.forEach((t, ti) => {
        t.rotation.x = Math.sin(E.time * 3 + ti + en.wander) * 0.12;
        t.rotation.z = Math.cos(E.time * 2.4 + ti) * 0.12;
      });
    }
    const FLOAT = { parrots: 1.3, squid: 0.75, piranha: 0.6, octopus: 0.25 };
    if (FLOAT[en.species] !== undefined) m.position.y += FLOAT[en.species] + Math.sin(E.time * 3 + en.wander) * 0.2;
    if (en.flash) { en.flash -= dt; if (en.flash <= 0) m.userData.body.material.emissiveIntensity = 0.5; }
    if (hostile && d < en.size + 0.5) hurtPlayer(en.dmg * dt * 3 + (E.hurtCd > 0 ? 0 : en.dmg * 0.2));
  });
}

function updateResources(dt) {
  E.resources.forEach(r => {
    r.mesh.rotation.y += dt * 1.4;
    if (r.type === 'fuel' || r.type === 'crystal')
      r.mesh.position.y = 0.45 + Math.sin(E.time * 3 + r.spin) * 0.12;
    // scale shrinks a little as it's mined, with a pop on each hit
    const dmg = 0.7 + 0.3 * (r.hp / r.maxhp);
    const pop = r.hitAnim > 0 ? 1 + r.hitAnim * 2.2 : 1;
    r.mesh.scale.setScalar(dmg * pop);
    if (r.hitAnim > 0) r.hitAnim -= dt;
  });
}

function updateParticles(dt) {
  for (let i = E.particles.length - 1; i >= 0; i--) {
    const pt = E.particles[i];
    pt.life -= dt;
    pt.vel.y -= 9 * dt;
    pt.mesh.position.addScaledVector(pt.vel, dt);
    if (pt.life <= 0) { E.scene.remove(pt.mesh); E.particles.splice(i, 1); }
  }
}

function updateExit(dt) {
  if (!E.exit) return;
  const ready = E.exitActive;
  E.exit.ring.material.emissiveIntensity = ready ? 1.2 + Math.sin(E.time * 6) * 0.6 : 0.15;
  E.exit.ring.rotation.z += dt * (ready ? 2 : 0.4);
  E.exit.mesh.position.y = ready ? Math.sin(E.time * 2) * 0.1 : 0;
  if (ready && E.player.position.distanceTo(new THREE.Vector3(E.exit.x, 0, E.exit.z)) < 1.1) {
    planetCleared();
  }
}

function updateCamera(dt) {
  if (!E.player) return;
  const p = E.player.position;
  const target = new THREE.Vector3(p.x, 6.5, p.z + 7.5);
  E.camera.position.lerp(target, 1 - Math.pow(0.001, dt));
  E.camera.lookAt(p.x, 0.6, p.z - 1.5);
}
