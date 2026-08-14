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
  E.renderer = new THREE.WebGLRenderer({ antialias: true });
  E.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  E.renderer.setSize(W, H);
  E.renderer.shadowMap.enabled = true;
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
    2: 'Jungle Zorbax! Grab 15 ⚡ fuel and watch for beasts. Reach the rocket to escape.',
    3: 'Tundra Frigia! 20 ⚡ fuel needed. The cold is full of teeth — reach the rocket.',
    4: 'Aquatic Neptuna! Dive for 25 ⚡ fuel, dodge the deep things, reach the rocket.',
    5: 'Home Base. Wander your planet in 3D. Press Menu to head back out.'
  };
  showMsg(cfg.emoji + ' ' + cfg.name, intro[n] + '\n\nWASD / Arrows: move   •   Space or Click: gather / attack   •   C: craft   G: gear');
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
}

// ── World construction ─────────────────────────────────────────
function buildWorld(n, cfg) {
  const data = cfg.build(cfg.tile, cfg.cols, cfg.rows);
  const map = data.map;
  E.map = map; E.rows = map.length; E.cols = map[0].length;

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
  buildPlayer(cfg, scene);
  buildExit(cfg, scene);

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
  (data.resources || []).forEach(r => {
    const mesh = makeResourceMesh(r.type);
    mesh.position.set(r.x + 0.5, 0.45, r.y + 0.5);
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
    arr.forEach(e => {
      if (!e || typeof e.x !== 'number') return;
      const worldX = e.x / T, worldZ = e.y / T;
      const hp = e.hp || e.maxhp || 3;
      const boss = (key === 'miniBoss' || key === 'yeti');
      const size = boss ? 0.9 : Math.max(0.28, (e.size || 13) / 30);
      const color = e.color ? new THREE.Color(e.color) : new THREE.Color(0xdd4444);
      const mesh = makeEnemyMesh(cfg.enemyKind, size, color, boss);
      mesh.position.set(worldX, size, worldZ);
      scene.add(mesh);
      E.enemies.push({
        mesh, hp, maxhp: hp, size, boss,
        speed: (e.speed || 0.6) * 2.2,
        dir: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
        wander: Math.random() * 3, dmg: boss ? 18 : 8
      });
    });
  });
}

function makeEnemyMesh(kind, size, color, boss) {
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

// ── Player (the gerbil) ────────────────────────────────────────
function buildPlayer(cfg, scene) {
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0xb98a5e, roughness: 0.8 });
  const belly = new THREE.MeshStandardMaterial({ color: 0xe8d3b0, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 14), fur);
  body.scale.set(1, 0.9, 1.25); body.position.y = 0.34; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 14), fur);
  head.position.set(0, 0.5, 0.34); head.castShadow = true;
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), belly);
  snout.position.set(0, 0.45, 0.58);
  const earGeo = new THREE.SphereGeometry(0.11, 8, 8);
  const earL = new THREE.Mesh(earGeo, fur); earL.position.set(0.16, 0.68, 0.3); earL.scale.z = 0.5;
  const earR = earL.clone(); earR.position.x = -0.16;
  const eyeGeo = new THREE.SphereGeometry(0.045, 8, 8);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(0.1, 0.54, 0.55);
  const eyeR = eyeL.clone(); eyeR.position.x = -0.1;
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 0.5, 6), fur);
  tail.position.set(0, 0.34, -0.42); tail.rotation.x = Math.PI / 2.4;
  g.add(body, head, snout, earL, earR, eyeL, eyeR, tail);

  // Skin tint (reuses save.skin if the wardrobe set an accent colour)
  if (save.skin && SKIN_TINT[save.skin]) {
    fur.color = new THREE.Color(SKIN_TINT[save.skin]);
  }

  const spawn = cfg.spawn;
  g.position.set(spawn.tx + 0.5, 0, spawn.tz + 0.5);
  scene.add(g);
  E.player = g;
  E.faceAngle = 0;
  E.camera.position.set(g.position.x, 9, g.position.z + 9);
  E.camera.lookAt(g.position);
}
const SKIN_TINT = { default: 0xb98a5e, gold: 0xffcc33, ninja: 0x333340, robot: 0x99a3ad, ghost: 0xcfd8ff, lava: 0xff5a2a };

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
  if (hit) doAttack(hit);
}

function doAttack(worldPoint) {
  if (!E.player || gamePaused) return;
  const p = E.player.position;
  const reach = save.items.includes('scanner') ? 2.6 : 1.7;
  const near = (obj) => worldPoint
    ? worldPoint.distanceTo(obj.mesh.position) < 1.0 && p.distanceTo(obj.mesh.position) < reach + 0.6
    : p.distanceTo(obj.mesh.position) < reach;

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
  spawnParticles(r.mesh.position, r.mesh.material.color, 8);
  r.mesh.scale.multiplyScalar(0.8);
  if (r.hp <= 0) {
    save.resources[r.type] = (save.resources[r.type] || 0) + 1;
    E.scene.remove(r.mesh);
    E.resources.splice(i, 1);
    persist(); updateHUD();
    if (r.type === 'fuel') checkExitReady();
  }
}

function weaponDamage() {
  const w = (typeof getActiveWeapon === 'function' && getActiveWeapon()) || null;
  const table = { banana_sword: 2, rock_hammer: 3, obsidian_axe: 5, yeti_claw: 8, mammoth_tusk: 6, laser: 3, bone_spear: 4 };
  return table[w] || 1;
}

function hitEnemy(i) {
  const en = E.enemies[i];
  en.hp -= weaponDamage();
  spawnParticles(en.mesh.position, new THREE.Color(0xff5555), 10);
  en.mesh.userData.body.material.emissiveIntensity = 1.5;
  en.flash = 0.15;
  if (en.hp <= 0) {
    spawnParticles(en.mesh.position, en.mesh.userData.body.material.color, 18);
    if (en.boss) save.spaceCoins = (save.spaceCoins || 0) + 20;
    E.scene.remove(en.mesh);
    E.enemies.splice(i, 1);
    persist(); updateHUD();
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
    showToast('🚀 Rocket ready!', 'You have enough fuel. Reach the rocket to blast off.');
  }
}

function planetCleared() {
  E.running = false;
  const n = E.planetNo;
  if (!save.planetsCleared.includes(n)) save.planetsCleared.push(n);
  save.spaceCoins = (save.spaceCoins || 0) + 50;
  persist();
  const next = n + 1;
  const hasNext = next <= 4;
  showMsg('🎉 Planet Cleared!', E.cfg.name + ' complete! +50 🪙\n\n' +
    (hasNext ? 'Onward to the next world…' : 'You have cleared every planet. Legendary gerbil!'),
    () => { hasNext ? startPlanet(next) : goMenu(); },
    hasNext ? 'Next Planet' : 'Return to Menu');
}

function hurtPlayer(dmg) {
  if (E.hurtCd > 0) return;
  let d = dmg;
  if (save.items.includes('shield')) d *= 0.5;
  save.hp -= d;
  E.hurtCd = 0.8;
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
    updateExit(dt);
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
  let speed = save.items.includes('boots') ? 6.5 : 4.8;
  if (E.cfg.slow.includes(tileAt(E.player.position.x, E.player.position.z))) speed *= 0.5;
  const p = E.player.position;
  if (mx || mz) {
    const len = Math.hypot(mx, mz); mx /= len; mz /= len;
    const nx = p.x + mx * speed * dt;
    const nz = p.z + mz * speed * dt;
    const rad = 0.34;
    if (!isSolid(nx + Math.sign(mx) * rad, p.z)) p.x = nx;
    if (!isSolid(p.x, nz + Math.sign(mz) * rad)) p.z = nz;
    E.faceAngle = Math.atan2(mx, mz);
    // little hop bob
    E.player.position.y = Math.abs(Math.sin(E.time * 12)) * 0.08;
  } else {
    E.player.position.y *= 0.8;
  }
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
  E.enemies.forEach(en => {
    const m = en.mesh;
    en.wander -= dt;
    const d = p.distanceTo(m.position);
    if (d < 6) { // chase
      en.dir.set(p.x - m.position.x, 0, p.z - m.position.z).normalize();
    } else if (en.wander <= 0) {
      en.dir.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
      en.wander = 1 + Math.random() * 2;
    }
    const nx = m.position.x + en.dir.x * en.speed * dt;
    const nz = m.position.z + en.dir.z * en.speed * dt;
    if (!isSolid(nx, m.position.z)) m.position.x = nx; else en.dir.x *= -1;
    if (!isSolid(m.position.x, nz)) m.position.z = nz; else en.dir.z *= -1;
    m.rotation.y = Math.atan2(en.dir.x, en.dir.z);
    m.position.y = en.size + Math.abs(Math.sin(E.time * 6 + en.wander)) * 0.12;
    if (en.flash) { en.flash -= dt; if (en.flash <= 0) m.userData.body.material.emissiveIntensity = 0.5; }
    if (d < en.size + 0.5) hurtPlayer(en.dmg * dt * 3 + (E.hurtCd > 0 ? 0 : en.dmg * 0.2));
  });
}

function updateResources(dt) {
  E.resources.forEach(r => {
    r.mesh.rotation.y += dt * 1.4;
    if (r.type === 'fuel' || r.type === 'crystal')
      r.mesh.position.y = 0.45 + Math.sin(E.time * 3 + r.spin) * 0.12;
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
