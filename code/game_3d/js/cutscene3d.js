// ════════════════════════════════════════════════════════════════
// js/cutscene3d.js — Fully 3D cinematic cutscenes (Three.js r128)
//
// Every cutscene is a real Three.js scene rendered by a dedicated
// WebGL renderer that lives on the #csCanvas overlay. Each cutscene
// is a "director" object with build(scene,camera,opts) and
// update(t,scene,camera,opts). Title/lines/caption are DOM overlays.
// ════════════════════════════════════════════════════════════════

const CS = { renderer: null, scene: null, camera: null, raf: null, timer: null,
             dir: null, cb: null, t0: 0, last: 0 };

const CS_PLANET = {
  1: ['🌍', 'Earth — Area 51'], 2: ['🌴', 'Jungle Zorbax'],
  3: ['❄️', 'Tundra Frigia'], 4: ['🌊', 'Aquatic Neptuna'], 5: ['🏠', 'Home Base']
};
const CS_PLANET_COLOR = { 1: 0x3a7bd0, 2: 0x2f9e44, 3: 0xcfe8ff, 4: 0x1f6fb0, 5: 0x9a7038 };

// ── Renderer / lifecycle ────────────────────────────────────────
function ensureCsRenderer() {
  if (CS.renderer) return;
  const cv = document.getElementById('csCanvas');
  CS.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
  CS.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  CS.camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 500);
}

function setCaption(html, color) {
  const el = document.getElementById('csCaption');
  if (!el) return;
  el.innerHTML = html || '';
  el.style.color = color || '#eaf2ff';
}

function endCutscene(cb) {
  if (CS.raf) { cancelAnimationFrame(CS.raf); CS.raf = null; }
  if (CS.timer) { clearTimeout(CS.timer); CS.timer = null; }
  const o = document.getElementById('cutscene');
  if (o) o.style.display = 'none';
  if (CS.scene) { disposeScene(CS.scene); CS.scene = null; }
  CS.dir = null;
  const usedCb = cb || CS.cb; CS.cb = null;
  if (usedCb) usedCb();
}

function disposeScene(scene) {
  scene.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
  });
}

// Generic runner: hand it a director + options.
function runDirector(dir, opts) {
  ensureCsRenderer();
  const o = document.getElementById('cutscene');
  o.style.display = 'block';
  document.getElementById('csTitle').textContent = opts.title || '';
  document.getElementById('csLines').innerHTML = (opts.lines || []).map(l => `<div>${l}</div>`).join('');
  setCaption('');
  const W = o.clientWidth || window.innerWidth, H = o.clientHeight || window.innerHeight;
  CS.renderer.setSize(W, H, false);
  CS.camera.aspect = W / H; CS.camera.updateProjectionMatrix();

  CS.scene = new THREE.Scene();
  CS.dir = dir; CS.cb = opts.cb || null; CS.t0 = 0; CS.last = 0;
  dir.build(CS.scene, CS.camera, opts);
  if (typeof SFX !== 'undefined') { SFX.resume && SFX.resume(); SFX.powerup && SFX.powerup(); }

  function frame(now) {
    if (!CS.t0) { CS.t0 = now; CS.last = now; }
    const t = (now - CS.t0) / 1000;
    const dt = Math.min(0.05, (now - CS.last) / 1000); CS.last = now;
    try { dir.update(t, CS.scene, CS.camera, opts, dt); } catch (e) { /* keep rendering */ }
    CS.renderer.render(CS.scene, CS.camera);
    CS.raf = requestAnimationFrame(frame);
  }
  CS.raf = requestAnimationFrame(frame);
  CS.timer = setTimeout(() => endCutscene(), opts.dur || 5000);
  document.getElementById('csSkip').onclick = () => endCutscene();
}

// ── Shared lighting ─────────────────────────────────────────────
function addCsLights(scene, opts) {
  opts = opts || {};
  scene.add(new THREE.AmbientLight(0xffffff, opts.ambient != null ? opts.ambient : 0.55));
  const key = new THREE.DirectionalLight(0xffffff, opts.key != null ? opts.key : 0.9);
  key.position.set(4, 8, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(opts.rimColor || 0x88aaff, opts.rim != null ? opts.rim : 0.4);
  rim.position.set(-6, 3, -4); scene.add(rim);
}

// ── Prop builders ───────────────────────────────────────────────
function mat(color, o) { return new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.7 }, o || {})); }

// Starfield as points; returns { pts, geo } — call csWarp to stream toward camera
function makeStarfield(count, spread, depth, color, size) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * spread;
    pos[i * 3 + 1] = (Math.random() - 0.5) * spread;
    pos[i * 3 + 2] = -Math.random() * depth;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: color || 0xbfd0ff, size: size || 0.14, sizeAttenuation: true, transparent: true, opacity: 0.9 });
  const pts = new THREE.Points(geo, m);
  pts.userData.depth = depth;
  return pts;
}
function csWarp(pts, speed, dt) {
  const p = pts.geometry.attributes.position, d = pts.userData.depth;
  for (let i = 2; i < p.array.length; i += 3) {
    p.array[i] += speed * dt;
    if (p.array[i] > 3) { p.array[i] = -d; }
  }
  p.needsUpdate = true;
}

// A cartoon gerbil (the stowaway). Forward = +Z. userData.eyes for glow.
function makeCsGerbil(color) {
  const g = new THREE.Group();
  const fur = mat(color || 0xc8954a, { roughness: 0.85 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 14), fur);
  body.scale.set(1.05, 0.8, 1.35); body.position.y = 0.5; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 18, 14), fur);
  head.position.set(0, 0.62, 0.62); head.castShadow = true;
  const earGeo = new THREE.SphereGeometry(0.13, 10, 8);
  const earMat = mat(0xe8b06a, { roughness: 0.85 });
  [-1, 1].forEach(s => { const e = new THREE.Mesh(earGeo, earMat); e.scale.set(1, 1.25, 0.5); e.position.set(s * 0.2, 0.92, 0.6); g.add(e); });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x201510, roughness: 0.3 });
  const eyes = [-1, 1].map(s => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), eyeMat.clone()); e.position.set(s * 0.15, 0.66, 0.9); g.add(e); return e; });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat(0xd06a6a));
  nose.position.set(0, 0.56, 0.97); g.add(nose);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, 0.7, 6), fur);
  tail.position.set(0, 0.5, -0.7); tail.rotation.x = -0.8; g.add(tail);
  const legGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.28, 6); legGeo.translate(0, -0.14, 0);
  const legs = [[-0.25, 0.42], [0.25, 0.42], [-0.25, -0.35], [0.25, -0.35]].map(([x, z]) => {
    const l = new THREE.Mesh(legGeo, fur); l.position.set(x, 0.28, z); g.add(l); return l;
  });
  g.add(body, head);
  g.userData = { eyes: eyes, eyeMat: eyeMat, legs: legs, head: head, fur: fur };
  return g;
}
// Turn a gerbil menacing: glowing red eyes + a purple tint
function gerbilGoNuclear(g, amt) {
  g.userData.eyes.forEach(e => { e.material.color.setHex(0xff2020); e.material.emissive = new THREE.Color(0xff0000); e.material.emissiveIntensity = 1.2; e.scale.setScalar(1.3); });
  g.userData.fur.color.lerpColors(new THREE.Color(0xc8954a), new THREE.Color(0xcc3aa0), Math.min(1, amt) * 0.5);
}

// A little rocket. Nose up (+Y). userData.flame toggles thrust.
function makeCsRocket() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 1.5, 20), mat(0xeef2f7, { metalness: 0.2, roughness: 0.5 }));
  body.position.y = 0.9; body.castShadow = true;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.7, 20), mat(0xe0503a, { roughness: 0.5 }));
  nose.position.y = 2.0;
  const win = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), new THREE.MeshStandardMaterial({ color: 0x9fe0ff, emissive: 0x2a7fb0, emissiveIntensity: 0.5, metalness: 0.4, roughness: 0.2 }));
  win.position.set(0, 1.25, 0.32);
  const finMat = mat(0xe0503a, { roughness: 0.5 });
  [0, 1, 2].forEach(i => {
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.6, 4), finMat);
    const a = i * Math.PI * 2 / 3;
    fin.position.set(Math.cos(a) * 0.42, 0.3, Math.sin(a) * 0.42);
    fin.rotation.set(Math.PI, a + Math.PI / 4, 0.35);
    g.add(fin);
  });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.9, 14), new THREE.MeshStandardMaterial({ color: 0xffc23a, emissive: 0xff7a1a, emissiveIntensity: 1.4, transparent: true, opacity: 0.9 }));
  flame.rotation.x = Math.PI; flame.position.y = -0.2;
  g.add(body, nose, win, flame);
  g.userData = { flame: flame };
  return g;
}

function makeCsPlanet(color, r) {
  const g = new THREE.Group();
  const p = new THREE.Mesh(new THREE.SphereGeometry(r || 1.2, 28, 22),
    new THREE.MeshStandardMaterial({ color: color, roughness: 0.9, emissive: new THREE.Color(color).multiplyScalar(0.12) }));
  g.add(p);
  return g;
}

function makeTreeCone(h) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.6, 7), mat(0x6b4a2a));
  trunk.position.y = 0.3;
  const foliage = new THREE.Mesh(new THREE.ConeGeometry(0.7, h || 2.4, 9), mat(0x1f6b34, { roughness: 0.95 }));
  foliage.position.y = (h || 2.4) / 2 + 0.5; foliage.castShadow = true;
  g.add(trunk, foliage);
  return g;
}

// Compact standalone astronaut (the player) for the intro.
function makeCsAstronaut() {
  const g = new THREE.Group();
  const suit = mat(0xeef2f7, { roughness: 0.7 });
  const grey = mat(0x9aa4b2, { roughness: 0.6, metalness: 0.2 });
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.66, 14), suit); torso.position.y = 0.7; torso.castShadow = true;
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.29, 16, 14), suit); helmet.position.y = 1.2; helmet.castShadow = true;
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 12, Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.32, Math.PI * 0.36), new THREE.MeshStandardMaterial({ color: 0x9fe0ff, emissive: 0x2a6fa0, emissiveIntensity: 0.5, metalness: 0.4, roughness: 0.2 }));
  visor.position.set(0, 1.2, 0.08);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.44, 0.22), grey); pack.position.set(0, 0.74, -0.3);
  const armGeo = new THREE.CylinderGeometry(0.085, 0.08, 0.5, 8); armGeo.translate(0, -0.25, 0);
  const arms = [-1, 1].map(s => { const a = new THREE.Mesh(armGeo, suit); a.position.set(s * 0.33, 0.94, 0); a.rotation.z = s * 0.12; g.add(a); return a; });
  const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.46, 8); legGeo.translate(0, -0.23, 0);
  const legs = [-1, 1].map(s => { const l = new THREE.Mesh(legGeo, suit); l.position.set(s * 0.14, 0.48, 0); g.add(l); return l; });
  g.add(torso, helmet, visor, pack);
  g.userData = { arms: arms, legs: legs };
  return g;
}

// ── Directors ───────────────────────────────────────────────────

// INTRO: astronaut by a rocket in deep space; the gerbil sneaks aboard.
const dirIntro = {
  build(scene, cam) {
    scene.background = new THREE.Color(0x05060f);
    scene.fog = new THREE.Fog(0x05060f, 12, 34);
    addCsLights(scene, { ambient: 0.5, key: 1.0, rim: 0.5, rimColor: 0x6a7bff });
    const stars = makeStarfield(320, 40, 40); scene.add(stars); scene.userData.stars = stars;
    const rocket = makeCsRocket(); rocket.position.set(1.4, -0.4, 0); rocket.rotation.z = -0.06; scene.add(rocket); scene.userData.rocket = rocket;
    const astro = makeCsAstronaut(); astro.position.set(-1.7, -0.4, 0.6); astro.rotation.y = 0.5; scene.add(astro); scene.userData.astro = astro;
    const gerbil = makeCsGerbil(); gerbil.scale.setScalar(0.6); gerbil.position.set(-3.6, -0.4, 1.4); gerbil.rotation.y = Math.PI / 2; scene.add(gerbil); scene.userData.gerbil = gerbil;
    cam.position.set(0, 0.6, 7.2); cam.lookAt(0, 0.4, 0);
  },
  update(t, scene, cam, opts, dt) {
    csWarp(scene.userData.stars, 6, dt);
    const r = scene.userData.rocket;
    r.position.y = -0.4 + Math.sin(t * 1.4) * 0.12; r.rotation.z = -0.06 + Math.sin(t * 0.7) * 0.04;
    r.userData.flame.scale.y = 0.7 + Math.abs(Math.sin(t * 22)) * 0.6;
    const ger = scene.userData.gerbil;
    // gerbil scurries to the rocket then hops in (vanishes) around t=2.6
    if (t < 2.6) { ger.position.x = -3.6 + (t / 2.6) * 4.6; ger.position.y = -0.4 + Math.abs(Math.sin(t * 10)) * 0.18; }
    else { const p = Math.min(1, (t - 2.6) / 0.7); ger.position.set(1.0 + p * 0.4, -0.2 + p * 0.9, 1.4 - p * 1.4); ger.scale.setScalar(0.6 * (1 - p)); }
    const astro = scene.userData.astro;
    astro.userData.arms[1].rotation.x = Math.sin(t * 3) * 0.2 - 0.2;
    cam.position.x = Math.sin(t * 0.25) * 0.6;
  }
};

// TRANSITION: rocket streaks from one planet to the next through warp.
const dirTransition = {
  build(scene, cam, opts) {
    scene.background = new THREE.Color(0x04040e);
    addCsLights(scene, { ambient: 0.6, key: 1.0, rim: 0.5 });
    const stars = makeStarfield(360, 46, 46); scene.add(stars); scene.userData.stars = stars;
    const from = makeCsPlanet(CS_PLANET_COLOR[opts.fromN] || 0x557, 1.5); from.position.set(-4.5, 1.6, -6); scene.add(from); scene.userData.from = from;
    const to = makeCsPlanet(CS_PLANET_COLOR[opts.toN] || 0x577, 1.9); to.position.set(6.5, -1.2, -9); scene.add(to); scene.userData.to = to;
    const rocket = makeCsRocket(); rocket.rotation.z = -Math.PI / 2 + 0.15; rocket.position.set(-6, 0.2, 0); scene.add(rocket); scene.userData.rocket = rocket;
    cam.position.set(0, 0.4, 8); cam.lookAt(0, 0, 0);
  },
  update(t, scene, cam, opts, dt) {
    csWarp(scene.userData.stars, 22, dt);
    scene.userData.from.rotation.y += 0.3 * dt;
    scene.userData.to.rotation.y += 0.2 * dt;
    const r = scene.userData.rocket, p = Math.min(1, t / (opts.dur / 1000 * 0.85));
    r.position.x = -6 + p * 12; r.position.y = 0.2 + Math.sin(t * 3) * 0.15;
    r.userData.flame.scale.y = 1.2 + Math.abs(Math.sin(t * 26)) * 0.8;
  }
};

// PLANET 2: the gerbil drinks a potion and mutates into the Nuclear Gerbil.
const dirNuclear = {
  build(scene, cam) {
    scene.background = new THREE.Color(0x061c0e);
    scene.fog = new THREE.Fog(0x061c0e, 10, 26);
    addCsLights(scene, { ambient: 0.5, key: 0.85, rim: 0.35, rimColor: 0x2f6 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat(0x14401e, { roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    for (let i = 0; i < 9; i++) { const tr = makeTreeCone(2 + Math.random() * 1.6); tr.position.set(-7 + i * 1.8 + Math.random(), 0, -4 - Math.random() * 2.5); scene.add(tr); }
    const gerbil = makeCsGerbil(); gerbil.position.set(-3.4, 0, 0); gerbil.rotation.y = Math.PI / 2; scene.add(gerbil); scene.userData.gerbil = gerbil;
    // potion bottle
    const potion = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.4, 12), new THREE.MeshStandardMaterial({ color: 0xbfffd0, transparent: true, opacity: 0.5, roughness: 0.2 }));
    glass.position.y = 0.3;
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.26, 12), new THREE.MeshStandardMaterial({ color: 0x66ff88, emissive: 0x33cc55, emissiveIntensity: 0.7 }));
    liquid.position.y = 0.24;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.16, 10), new THREE.MeshStandardMaterial({ color: 0xbfffd0, transparent: true, opacity: 0.5 })); neck.position.y = 0.56;
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 8), mat(0x8a5a2a)); cork.position.y = 0.66;
    potion.add(glass, liquid, neck, cork); potion.position.set(0.5, 0, 0.2); scene.add(potion); scene.userData.potion = potion;
    const flash = new THREE.PointLight(0xb400ff, 0, 20); flash.position.set(0, 2, 2); scene.add(flash); scene.userData.flash = flash;
    cam.position.set(0, 1.7, 6.4); cam.lookAt(0, 0.9, 0);
  },
  update(t, scene, cam) {
    const ger = scene.userData.gerbil, pot = scene.userData.potion, flash = scene.userData.flash;
    const legWalk = (spd) => ger.userData.legs.forEach((l, i) => l.rotation.x = Math.sin(t * spd + i * 1.6) * 0.5);
    if (t < 2.2) {                 // walk in
      ger.position.x = -3.4 + (t / 2.2) * 3.0; legWalk(9);
      setCaption('A tiny gerbil emerges from the jungle...', '#dfe');
    } else if (t < 3.9) {          // drink
      ger.position.x = -0.4; ger.rotation.z = Math.sin(t * 8) * 0.06;
      ger.userData.head.rotation.x = -0.4;         // tip head back
      const p = Math.min(1, (t - 2.2) / 1.7); pot.scale.y = Math.max(0.02, 1 - p); pot.visible = p < 1;
      setCaption(t < 3.0 ? 'It found a mysterious potion!' : 'Glug glug glug...', '#dfe');
    } else if (t < 5.8) {          // grow
      ger.userData.head.rotation.x = 0; ger.rotation.z = 0; pot.visible = false;
      const p = (t - 3.9) / 1.9; const s = 1 + p * 1.7; ger.scale.setScalar(s);
      ger.position.x = -0.4 + Math.sin(t * 40) * (p < 0.6 ? 0.05 : 0); // shake
      gerbilGoNuclear(ger, p);
      flash.intensity = Math.max(0, Math.sin((t - 3.9) * 3.2)) * 6 * (1 - p * 0.5);
      setCaption(p < 0.35 ? '...' : p < 0.7 ? 'Something is happening!!' : "IT'S GROWING!!!", p < 0.7 ? '#dfe' : '#f7a6ff');
    } else {                        // lumber away
      flash.intensity = 0; ger.scale.setScalar(2.7); ger.rotation.y = -Math.PI / 2;
      ger.position.x = -0.4 - (t - 5.8) * 2.2; legWalk(5);
      setCaption('The Nuclear Gerbil lumbers away into the darkness...', '#ff8a8a');
    }
    cam.position.x = Math.sin(t * 0.3) * 0.4;
  }
};

// AREA 51: night desert base — fence, sweeping searchlights, a saucer.
const dirArea51 = {
  build(scene, cam) {
    scene.background = new THREE.Color(0x060814);
    scene.fog = new THREE.Fog(0x060814, 14, 40);
    scene.add(new THREE.AmbientLight(0x5566aa, 0.4));
    const moon = new THREE.DirectionalLight(0x9fb4ff, 0.5); moon.position.set(-6, 8, 2); scene.add(moon);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat(0x241d14, { roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    // chain-link fence: posts + rails
    const postMat = mat(0x5a606c, { metalness: 0.3 });
    for (let i = -10; i <= 10; i++) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6), postMat); post.position.set(i * 1.1, 0.7, -2.5); scene.add(post); }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(22, 0.06, 0.06), postMat); rail.position.set(0, 1.35, -2.5); scene.add(rail);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(22, 1.3), new THREE.MeshStandardMaterial({ color: 0x8892a0, wireframe: true, transparent: true, opacity: 0.35 }));
    mesh.position.set(0, 0.7, -2.5); scene.add(mesh);
    // warning sign
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.05), mat(0xcc3333, { emissive: 0x551111, emissiveIntensity: 0.5 })); sign.position.set(-2, 0.9, -2.4); scene.add(sign);
    // flying saucer
    const saucer = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.SphereGeometry(1.3, 24, 16), mat(0xb8c0cc, { metalness: 0.5, roughness: 0.3 })); disc.scale.set(1, 0.32, 1);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9fe0ff, emissive: 0x2a7fb0, emissiveIntensity: 0.6, transparent: true, opacity: 0.8 })); dome.position.y = 0.2;
    const rimLights = [];
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffe066, emissive: 0xffaa00, emissiveIntensity: 1 })); b.position.set(Math.cos(a) * 1.2, -0.05, Math.sin(a) * 1.2); saucer.add(b); rimLights.push(b); }
    saucer.add(disc, dome); saucer.position.set(3.2, 3, -4); scene.add(saucer);
    scene.userData.saucer = saucer; scene.userData.rimLights = rimLights;
    // searchlight beams (additive cones)
    const beams = [];
    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 7, 18, 1, true), new THREE.MeshBasicMaterial({ color: 0xaad7ff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
      cone.position.set(-4 + i * 4, 0.2, -1.5); scene.add(cone); beams.push(cone);
    }
    scene.userData.beams = beams;
    // the player (astronaut) sneaking toward the base
    const hero = makeCsAstronaut(); hero.position.set(-0.8, 0, 2.2); hero.rotation.y = Math.PI; scene.add(hero); scene.userData.hero = hero;
    cam.position.set(0, 2.4, 8); cam.lookAt(0, 1.2, -2);
  },
  update(t, scene, cam, opts, dt) {
    scene.userData.beams.forEach((c, i) => { c.rotation.z = Math.sin(t * 0.9 + i * 2.1) * 0.5; });
    const s = scene.userData.saucer; s.position.y = 3 + Math.sin(t * 1.2) * 0.2; s.rotation.y += 0.6 * dt;
    scene.userData.rimLights.forEach((b, i) => { b.material.emissiveIntensity = 0.5 + 0.6 * Math.abs(Math.sin(t * 4 + i)); });
    const h = scene.userData.hero;
    // stride forward toward the fence and slip past it
    h.position.z = 2.2 - Math.min(4.2, t * 0.85);
    h.rotation.z = Math.sin(t * 6) * 0.03; // slight sway
    h.userData.legs.forEach((l, i) => l.rotation.x = Math.sin(t * 7 + i * Math.PI) * 0.5);
    h.userData.arms.forEach((a, i) => a.rotation.x = Math.sin(t * 7 + i * Math.PI) * 0.35);
    setCaption(t < 2.5 ? 'Nevada desert — 0300 hours.' : t < 4.2 ? 'A lone astronaut slips past the fence…' : 'Grab the ⚡ fuel and reach the saucer — don\'t get caught!', '#bfe0ff');
    cam.position.x = Math.sin(t * 0.2) * 0.7;
  }
};

// ENDING: the hero rocket rises past Earth as fireworks bloom.
const dirEnding = {
  build(scene, cam) {
    scene.background = new THREE.Color(0x05060f);
    addCsLights(scene, { ambient: 0.55, key: 1.0, rim: 0.5, rimColor: 0x88aaff });
    const stars = makeStarfield(300, 44, 44, 0xffffff, 0.16); scene.add(stars); scene.userData.stars = stars;
    const earth = makeCsPlanet(0x2f7ad0, 3.2); earth.position.set(0, -4.4, -6); scene.add(earth);
    const cont = new THREE.Mesh(new THREE.SphereGeometry(3.22, 24, 18), new THREE.MeshStandardMaterial({ color: 0x2f9e44, transparent: true, opacity: 0.55, roughness: 1 })); cont.scale.set(1, 1, 1); earth.add(cont);
    scene.userData.earth = earth;
    const rocket = makeCsRocket(); rocket.position.set(0, -1.5, 0); scene.add(rocket); scene.userData.rocket = rocket;
    // firework bursts
    const bursts = [];
    for (let b = 0; b < 4; b++) {
      const n = 60, geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), vel = [];
      for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI, sp = 1.5 + Math.random(); vel.push([Math.sin(e) * Math.cos(a) * sp, Math.cos(e) * sp, Math.sin(e) * Math.sin(a) * sp]); pos[i * 3] = pos[i * 3 + 1] = pos[i * 3 + 2] = 0; }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const col = [0xff5a5a, 0x5aff8a, 0x5a9aff, 0xffe066][b];
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: col, size: 0.16, transparent: true, opacity: 1 }));
      pts.position.set((b - 1.5) * 2.4, 2.2 + (b % 2) * 1.2, -2 - b); pts.userData = { vel: vel, born: -b * 0.8 - 0.5 }; scene.add(pts); bursts.push(pts);
    }
    scene.userData.bursts = bursts;
    cam.position.set(0, 1.2, 8); cam.lookAt(0, 1, 0);
  },
  update(t, scene, cam, opts, dt) {
    csWarp(scene.userData.stars, 2, dt);
    scene.userData.earth.rotation.y += 0.15 * dt;
    const r = scene.userData.rocket; r.position.y = -1.5 + t * 1.1; r.position.z = -t * 0.5; r.rotation.z = Math.sin(t * 2) * 0.05;
    r.userData.flame.scale.y = 1 + Math.abs(Math.sin(t * 24)) * 0.7;
    scene.userData.bursts.forEach(pts => {
      let age = t - (pts.userData.born + 0); const cycle = 2.4; age = ((age % cycle) + cycle) % cycle;
      const p = pts.geometry.attributes.position, v = pts.userData.vel;
      for (let i = 0; i < v.length; i++) { p.array[i * 3] = v[i][0] * age; p.array[i * 3 + 1] = v[i][1] * age - 0.5 * age * age; p.array[i * 3 + 2] = v[i][2] * age; }
      p.needsUpdate = true; pts.material.opacity = Math.max(0, 1 - age / cycle);
    });
    cam.position.x = Math.sin(t * 0.3) * 0.5;
  }
};

// ── Public entry points (unchanged signatures) ──────────────────
function playIntroCutscene(cb) {
  runDirector(dirIntro, {
    title: '🚀 SPACE GERBIL ADVENTURE',
    lines: ['A lone explorer blasts off across the galaxy…', 'and a curious little gerbil sneaks aboard! 🐹'],
    dur: 5400, cb: cb
  });
}
function playTransitionCutscene(fromN, toN, cb) {
  const a = CS_PLANET[fromN] || ['🚀', 'Space'], b = CS_PLANET[toN] || ['🪐', 'the next world'];
  runDirector(dirTransition, {
    title: '🚀 Blasting Off!',
    lines: [`${a[0]} ${a[1]}   →   ${b[0]} ${b[1]}`, 'Warp drive engaged…'],
    fromN: fromN, toN: toN, dur: 3900, cb: cb
  });
}
function playEnterPlanet2Cutscene(cb) {
  runDirector(dirNuclear, { title: '', lines: [], dur: 8200, cb: cb });
}
function playEnterArea51Cutscene(cb) {
  runDirector(dirArea51, { title: '🛸 ENTERING AREA 51', lines: [], dur: 5600, cb: cb });
}
function playEndingCutscene(cb) {
  runDirector(dirEnding, {
    title: '🏆 A LEGEND IS BORN',
    lines: ['Every world explored. Every boss defeated.', 'The Space Gerbil soars home a hero of the galaxy!'],
    dur: 6000, cb: cb
  });
}
