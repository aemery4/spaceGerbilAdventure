// ════════════════════════════════════════════════════════════════
// js/pets3d.js — Companion pets
//
// Adopt a pet that follows you across every planet and helps fight by
// pouncing on nearby enemies. Kosmo (border collie) and Star (cat) are
// the rare companions; the rest are common critters. Selected via the
// Pets menu; the active pet spawns each time a world is built.
// ════════════════════════════════════════════════════════════════

const PETS = [
  { id: 'kosmo',  name: 'Kosmo',  kind: 'dog',     emoji: '🐕', rare: true,  cost: 400, desc: 'A loyal border collie. Herds enemies with heart.' },
  { id: 'star',   name: 'Star',   kind: 'cat',     emoji: '🐈', rare: true,  cost: 400, desc: 'A domestic shorthair. Pounces with feline flair.' },
  { id: 'blobby', name: 'Blobby', kind: 'blob',    emoji: '🟢', color: 0x66dd88, cost: 60,  desc: 'A bouncy little space blob.' },
  { id: 'hopper', name: 'Hopper', kind: 'bunny',   emoji: '🐰', color: 0xeef0f4, cost: 80,  desc: 'A hoppy moon bunny.' },
  { id: 'spark',  name: 'Spark',  kind: 'orb',     emoji: '🔆', color: 0x66ccff, cost: 100, desc: 'A floating orb of pure energy.' },
  { id: 'coco',   name: 'Coco',   kind: 'critter', emoji: '🐹', color: 0xc8954a, cost: 70,  desc: 'A fuzzy space gremlin.' },
  { id: 'zippy',  name: 'Zippy',  kind: 'drone',   emoji: '🛸', color: 0xaab4c2, cost: 120, desc: 'A helpful little hover-drone.' },
  { id: 'mossy',  name: 'Mossy',  kind: 'critter', emoji: '🌱', color: 0x6ab04a, cost: 70,  desc: 'A mossy woodland sprite.' }
];
function getPet(id) { return PETS.find(p => p.id === id) || null; }

// ── Models ──────────────────────────────────────────────────────
function petMat(c, o) { return new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7 }, o || {})); }
function petEyes(g, x, y, z, r) {
  const w = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8), petMat(0xffffff));
  const p = new THREE.Mesh(new THREE.SphereGeometry(r * 0.55, 6, 6), petMat(0x111111));
  [-1, 1].forEach(s => {
    const wc = w.clone(); wc.position.set(x * s, y, z); g.add(wc);
    const pc = p.clone(); pc.position.set(x * s, y, z + r * 0.6); g.add(pc);
  });
}

function makePetMesh(pet) {
  const g = new THREE.Group();
  const legs = [];
  const kind = pet.kind;

  if (kind === 'dog' || kind === 'cat') {
    const isDog = kind === 'dog';
    const main = petMat(isDog ? 0x2b2b2b : 0x8f8f96);      // collie black / cat grey
    const light = petMat(0xf2f2f2);                          // white markings
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 12), main);
    torso.rotation.z = Math.PI / 2; torso.position.y = 0.34; torso.castShadow = true;
    const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.46, 12), light);
    belly.rotation.z = Math.PI / 2; belly.position.set(0, 0.28, 0.03);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12), main); head.position.set(0.28, 0.44, 0);
    const blaze = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), light); blaze.position.set(0.34, 0.46, 0);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, 0.13), isDog ? light : main); snout.position.set(0.42, 0.4, 0);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), petMat(0x111111)); nose.position.set(0.5, 0.42, 0);
    g.add(torso, belly, head, blaze, snout, nose);
    petEyes(g, 0.06, 0.5, 0.36, 0.035);
    // ears — floppy for dog, pointy for cat
    [-1, 1].forEach(s => {
      const ear = isDog
        ? new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), main)
        : new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.13, 6), main);
      ear.scale.set(1, isDog ? 1.5 : 1, 0.6);
      ear.position.set(0.24, isDog ? 0.55 : 0.6, s * 0.1);
      g.add(ear);
    });
    // 4 legs
    const legGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.28, 7); legGeo.translate(0, -0.14, 0);
    [[0.2, 0.12], [0.2, -0.12], [-0.16, 0.12], [-0.16, -0.12]].forEach(([x, z]) => {
      const l = new THREE.Mesh(legGeo, main); l.position.set(x, 0.28, z); l.castShadow = true; g.add(l); legs.push(l);
    });
    // tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, isDog ? 0.34 : 0.4, 6), main);
    tail.position.set(-0.32, 0.42, 0); tail.rotation.z = isDog ? -0.7 : -1.1;
    const pivot = new THREE.Group(); pivot.position.set(-0.28, 0.4, 0); pivot.add(tail); tail.position.set(-0.04, 0.02, 0);
    g.add(pivot); g.userData.tail = pivot;
    g.userData.baseY = 0;
  } else if (kind === 'bunny') {
    const fur = petMat(pet.color || 0xeeeeee);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), fur); body.scale.set(1, 1.1, 1); body.position.y = 0.24; body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), fur); head.position.set(0.02, 0.5, 0);
    g.add(body, head); petEyes(g, 0.07, 0.52, 0.13, 0.03);
    [-1, 1].forEach(s => { const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.34, 6), fur); ear.position.set(0, 0.74, s * 0.07); ear.rotation.z = s * 0.15; g.add(ear); });
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), petMat(0xffffff)); tail.position.set(-0.2, 0.24, 0); g.add(tail);
    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.16, 6); legGeo.translate(0, -0.08, 0);
    [[0.1, 0.1], [0.1, -0.1], [-0.08, 0.1], [-0.08, -0.1]].forEach(([x, z]) => { const l = new THREE.Mesh(legGeo, fur); l.position.set(x, 0.12, z); g.add(l); legs.push(l); });
    g.userData.baseY = 0;
  } else if (kind === 'orb') {
    const c = pet.color || 0x66ccff;
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 14), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.9 })); core.position.y = 0.55;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 8, 24), petMat(0xffffff, { emissive: c, emissiveIntensity: 0.5 })); ring.position.y = 0.55; ring.rotation.x = Math.PI / 2.4;
    const light = new THREE.PointLight(c, 0.5, 4, 2); light.position.y = 0.55;
    g.add(core, ring, light); petEyes(g, 0.07, 0.58, 0.18, 0.035);
    g.userData.hover = true; g.userData.baseY = 0; g.userData.spin = ring;
  } else if (kind === 'drone') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), petMat(pet.color || 0xaab4c2, { metalness: 0.3 })); body.position.y = 0.55;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), new THREE.MeshStandardMaterial({ color: 0x9fe0ff, emissive: 0x2a7fb0, emissiveIntensity: 0.8 })); eye.position.set(0.14, 0.55, 0);
    g.add(body, eye);
    [[0.18, 0.18], [0.18, -0.18], [-0.18, 0.18], [-0.18, -0.18]].forEach(([x, z]) => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 5), petMat(0x555b66)); arm.rotation.z = Math.PI / 2; arm.position.set(x, 0.55, z);
      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.01, 10), petMat(0xcfd6e0, { transparent: true, opacity: 0.5 })); rotor.position.set(x, 0.6, z);
      g.add(arm, rotor);
    });
    g.userData.hover = true; g.userData.baseY = 0;
  } else { // 'blob' or 'critter'
    const fur = petMat(pet.color || 0x66dd88);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), fur); body.scale.set(1.05, 0.95, 1); body.position.y = 0.26; body.castShadow = true;
    g.add(body); petEyes(g, 0.08, 0.34, 0.2, 0.045);
    if (kind === 'critter') {
      [-1, 1].forEach(s => { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), fur); ear.position.set(0.05, 0.46, s * 0.12); g.add(ear); });
      const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.16, 6); legGeo.translate(0, -0.08, 0);
      [[0.1, 0.1], [0.1, -0.1], [-0.08, 0.1], [-0.08, -0.1]].forEach(([x, z]) => { const l = new THREE.Mesh(legGeo, fur); l.position.set(x, 0.14, z); g.add(l); legs.push(l); });
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.01, 0.24, 5), fur); const pv = new THREE.Group(); pv.position.set(-0.2, 0.3, 0); tail.position.set(-0.1, 0.02, 0); tail.rotation.z = -0.9; pv.add(tail); g.add(pv); g.userData.tail = pv;
      g.userData.baseY = 0;
    } else {
      g.userData.hover = true; g.userData.baseY = 0; // blob bounces
    }
  }

  g.userData.legs = legs;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ── Spawn / update the active companion ─────────────────────────
function spawnPet(scene) {
  E.pet = null;
  const id = save.pet;
  if (!id || !(save.unlockedPets || []).includes(id)) return;
  const pet = getPet(id); if (!pet || !E.player) return;
  const mesh = makePetMesh(pet);
  const sx = E.player.position.x - 1, sz = E.player.position.z + 1;
  mesh.position.set(sx, mesh.userData.baseY || 0, sz);
  scene.add(mesh);
  E.pet = { mesh, x: sx, z: sz, t: 0, cooldown: 1.5, baseY: mesh.userData.baseY || 0, power: pet.rare ? 4 : 2, face: 0, target: null };
}

function updatePet(dt) {
  const p = E.pet; if (!p || !p.mesh || !E.player) return;
  const px = E.player.position.x, pz = E.player.position.z;
  p.t += dt;
  let moving = false;

  if (p.target) {                                   // pouncing an enemy
    if (!E.enemies || !E.enemies.includes(p.target)) { p.target = null; p.cooldown = 1.5; }
    else {
      const ex = p.target.mesh.position.x, ez = p.target.mesh.position.z;
      const ax = ex - p.x, az = ez - p.z, ad = Math.hypot(ax, az) || 1;
      if (ad > 0.7) { p.x += ax / ad * 6.5 * dt; p.z += az / ad * 6.5 * dt; moving = true; p.face = Math.atan2(ax, az); }
      else {
        p.target.hp = Math.max(1, p.target.hp - p.power); // soften, never finish (player lands the kill)
        if (typeof spawnParticles === 'function') spawnParticles(p.target.mesh.position, new THREE.Color(0xffee66), 6);
        if (typeof SFX !== 'undefined' && SFX.hit) SFX.hit();
        p.target = null; p.cooldown = 1.8;
      }
    }
  } else {                                           // follow the player
    const dx = px - p.x, dz = pz - p.z, dist = Math.hypot(dx, dz);
    if (dist > 1.5) { const sp = Math.min(6, dist * 3); p.x += dx / dist * sp * dt; p.z += dz / dist * sp * dt; moving = true; p.face = Math.atan2(dx, dz); }
    p.cooldown -= dt;
    if (p.cooldown <= 0 && E.enemies && E.enemies.length && !(E.cfg && E.cfg.home)) {
      let best = null, bd = 6;
      E.enemies.forEach(en => { if (en.boss) return; const d = Math.hypot(px - en.mesh.position.x, pz - en.mesh.position.z); if (d < bd) { bd = d; best = en; } });
      if (best) p.target = best; else p.cooldown = 0.5;
    }
  }

  p.mesh.position.x = p.x; p.mesh.position.z = p.z;
  if (p.face != null) p.mesh.rotation.y = p.face;
  const ud = p.mesh.userData;
  if (ud.legs && ud.legs.length) { const sw = moving ? Math.sin(p.t * 16) * 0.6 : Math.sin(p.t * 3) * 0.06; ud.legs.forEach((l, i) => l.rotation.x = ((i % 2) ? -1 : 1) * sw); }
  if (ud.hover) p.mesh.position.y = p.baseY + 0.15 + Math.sin(p.t * 3) * 0.1 + (moving ? 0.05 : 0);
  else p.mesh.position.y = p.baseY + (moving ? Math.abs(Math.sin(p.t * 16)) * 0.05 : 0);
  if (ud.tail) ud.tail.rotation.y = Math.sin(p.t * (moving ? 12 : 5)) * 0.5;
  if (ud.spin) ud.spin.rotation.z += dt * 2;
}

// ── Pets menu ───────────────────────────────────────────────────
function openPetMenu() {
  gamePaused = true;
  if (!save.unlockedPets) save.unlockedPets = [];
  const unlocked = save.unlockedPets;
  const grid = document.getElementById('petGrid');
  grid.innerHTML = '';
  document.getElementById('petMenuCoins').textContent = '🪙 ' + (save.spaceCoins || 0) + ' Space Coins';

  const none = document.createElement('div');
  none.className = 'pet-card' + (!save.pet ? ' pet-active' : '');
  none.innerHTML = `${!save.pet ? '<span class="pet-badge b-active">ACTIVE</span>' : ''}<div class="pet-emoji">🚫</div><div class="pet-name">No Pet</div><div class="pet-how">Adventure solo</div>`;
  none.onclick = () => { save.pet = null; persist(); openPetMenu(); };
  grid.appendChild(none);

  PETS.forEach(pet => {
    const owned = unlocked.includes(pet.id), active = save.pet === pet.id;
    const canBuy = !owned && (save.spaceCoins || 0) >= pet.cost;
    const card = document.createElement('div');
    card.className = 'pet-card' + (active ? ' pet-active' : (!owned && !canBuy ? ' pet-locked' : ''));
    const badge = active ? '<span class="pet-badge b-active">ACTIVE</span>'
      : owned ? '<span class="pet-badge b-owned">OWNED</span>'
        : pet.rare ? '<span class="pet-badge b-rare">★ RARE</span>'
          : '<span class="pet-badge b-buy">BUY</span>';
    const cost = owned ? '' : `<div class="pet-cost"><span class="${canBuy ? 'has' : 'lacks'}">🪙×${pet.cost}</span></div>`;
    card.innerHTML = `${badge}<div class="pet-emoji">${pet.emoji}</div><div class="pet-name">${pet.name}</div><div class="pet-how">${pet.desc}</div>${cost}`;
    if (active) { /* already active */ }
    else if (owned) card.onclick = () => { save.pet = pet.id; persist(); openPetMenu(); };
    else if (canBuy) card.onclick = () => {
      save.spaceCoins -= pet.cost;
      save.unlockedPets = [...unlocked, pet.id];
      save.pet = pet.id;
      persist(); updateHUD(); openPetMenu();
      showToast('🐾 New Companion!', pet.name + ' joined you! They\'ll tag along on every world.');
    };
    grid.appendChild(card);
  });
  document.getElementById('petMenu').style.display = 'block';
}
function closePetMenu() { gamePaused = false; document.getElementById('petMenu').style.display = 'none'; }
