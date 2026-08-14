// ════════════════════════════════════════
// js/seahorse3d.js — Friendly seahorse guides (Planet 4)
// Restores the Neptuna seahorse NPCs: they hover in place, and greet the
// player with a tip on walk-up + Space. Data comes from buildP4Data().
// ════════════════════════════════════════

function buildSeahorses(data, cfg, scene) {
  E.seahorses = [];
  const T = cfg.tile;
  (data.SEAHORSES || []).forEach(s => {
    const wx = s.x / T, wz = s.y / T;
    const mesh = makeSeahorseMesh(s.color);
    mesh.position.set(wx, 0.7, wz);
    scene.add(mesh);
    E.seahorses.push({ data: s, mesh, x: wx, z: wz, bob: Math.random() * 6, interacted: false, marker: mesh.userData.marker });
  });
}

function makeSeahorseMesh(colorHex) {
  const g = new THREE.Group();
  const col = new THREE.Color(colorHex);
  const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, emissive: col.clone().multiplyScalar(0.25), emissiveIntensity: 0.5 });
  const finMat = new THREE.MeshStandardMaterial({ color: col.clone().lerp(new THREE.Color(0xffffff), 0.35), transparent: true, opacity: 0.8, roughness: 0.4 });

  // S-curved body
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, -0.32, 0), new THREE.Vector3(0.12, -0.08, 0),
    new THREE.Vector3(-0.03, 0.16, 0), new THREE.Vector3(0.05, 0.4, 0)
  ]);
  const body = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.13, 8), mat);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), mat);
  head.position.set(0.06, 0.5, 0);
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.28, 7), mat);
  snout.position.set(0.24, 0.5, 0); snout.rotation.z = Math.PI / 2;
  const eyes = [1, -1].map(sz => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    e.position.set(0.09, 0.54, sz * 0.12); return e;
  });
  const coronet = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.13, 5), mat);
  coronet.position.set(-0.02, 0.67, 0);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.3, 4), finMat);
  fin.position.set(-0.13, 0.12, 0); fin.rotation.z = -1.0; fin.scale.set(0.4, 1, 1);
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.06, 8, 14, Math.PI * 1.45), mat);
  tail.position.set(0.0, -0.48, 0); tail.rotation.z = 0.5;

  const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x66ddff, emissiveIntensity: 1 }));
  marker.position.y = 1.0;

  g.add(body, head, snout, ...eyes, coronet, fin, tail, marker);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.marker = marker;
  return g;
}

function updateSeahorses(dt) {
  if (!E.seahorses) return;
  E.seahorses.forEach(s => {
    s.bob += dt;
    s.mesh.position.y = 0.7 + Math.sin(s.bob * 2) * 0.12;
    s.mesh.rotation.y = Math.sin(s.bob * 0.7) * 0.4;
    if (s.marker) { s.marker.rotation.y += dt * 2; s.marker.position.y = 1.0 + Math.sin(s.bob * 2) * 0.1; }
  });
}

function seahorseNear(worldPoint) {
  if (!E.seahorses) return null;
  const p = E.player.position;
  for (const s of E.seahorses) {
    const here = new THREE.Vector3(s.x, 0.5, s.z);
    if (p.distanceTo(here) < 2.0 && (!worldPoint || worldPoint.distanceTo(here) < 1.4)) return s;
  }
  return null;
}

function useSeahorse(s) {
  const d = s.data;
  if (!s.interacted) {
    s.interacted = true;
    save.spaceCoins = (save.spaceCoins || 0) + 10; persist(); updateHUD();
    showMsg(`${d.emoji} ${d.name} the Seahorse`, d.dialog + '\n\n(+10 🪙 for saying hello!)');
  } else {
    showMsg(`${d.emoji} ${d.name} the Seahorse`, d.dialog);
  }
}
