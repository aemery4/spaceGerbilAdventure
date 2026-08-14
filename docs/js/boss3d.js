// ════════════════════════════════════════
// js/boss3d.js — Boss mechanics
// The three bosses (jungle gorilla, tundra yeti, aquatic octopus) get
// telegraphed attacks, projectiles, a slam AoE, and a health bar.
// Called from the engine's enemy update + main loop.
// ════════════════════════════════════════

const BOSS_NAME = { miniBoss: '🦍 Jungle King', yeti: '⛄ Frost Yeti', octopus: '🐙 Deep Octopus' };

function bossBlocked(x, z) { return isSolid(x, z); }

// Per-boss AI, replaces normal movement for boss enemies
function updateBoss(en, dt, d, p) {
  const m = en.mesh;
  en.atkTimer = (en.atkTimer == null ? 2 : en.atkTimer) - dt;
  if (en.mode !== 'jump') en.skipYBob = false;

  if (en.mode === 'jump') {
    en.skipYBob = true; // we control Y during the leap
    en.jumpT += dt;
    const t = Math.min(1, en.jumpT / en.jumpDur);
    m.position.x = en.jumpStart.x + (en.jumpTarget.x - en.jumpStart.x) * t;
    m.position.z = en.jumpStart.z + (en.jumpTarget.z - en.jumpStart.z) * t;
    m.position.y = en.size + Math.sin(t * Math.PI) * 3.2; // arc up and down
    en.dir.set(en.jumpTarget.x - en.jumpStart.x, 0, en.jumpTarget.z - en.jumpStart.z).normalize();
    if (t >= 1) {
      m.position.y = en.size; en.skipYBob = false;
      spawnParticles(m.position, new THREE.Color(0xffffff), 22);
      bossSlam(en, 3.0, 22); // landing shockwave
      en.mode = 'idle'; en.atkTimer = 1.6 + Math.random();
    }
    return;
  }

  if (en.mode === 'charge') {
    en.chargeTime -= dt;
    const cv = en.chargeVel; let hitWall = false;
    const nx = m.position.x + cv.x * dt, nz = m.position.z + cv.z * dt;
    if (!bossBlocked(nx, m.position.z)) m.position.x = nx; else hitWall = true;
    if (!bossBlocked(m.position.x, nz)) m.position.z = nz; else hitWall = true;
    en.dir.set(cv.x, 0, cv.z).normalize();
    if (en.chargeTime <= 0 || hitWall) {
      en.mode = 'idle'; en.atkTimer = 1.6 + Math.random() * 1.2;
      m.userData.body.material.emissiveIntensity = en.baseEmissive;
      if (hitWall) { spawnParticles(m.position, new THREE.Color(0xffffff), 14); if (typeof SFX !== 'undefined') SFX.slam(); }
    }
    return;
  }
  if (en.mode === 'telegraph') {
    en.tele -= dt;
    m.scale.setScalar(1 + Math.sin(E.time * 32) * 0.07);
    m.userData.body.material.emissiveIntensity = 1.6;
    if (en.tele <= 0) { m.scale.setScalar(1); m.userData.body.material.emissiveIntensity = en.baseEmissive; startBossAttack(en, p); }
    return;
  }
  // idle: drift slowly toward the player, then pick an attack
  en.dir.set(p.x - m.position.x, 0, p.z - m.position.z).normalize();
  const spd = en.speed * 0.5;
  const nx = m.position.x + en.dir.x * spd * dt, nz = m.position.z + en.dir.z * spd * dt;
  if (!bossBlocked(nx, m.position.z)) m.position.x = nx;
  if (!bossBlocked(m.position.x, nz)) m.position.z = nz;
  if (en.atkTimer <= 0) { en.mode = 'telegraph'; en.tele = 0.6; if (typeof SFX !== 'undefined') SFX.boss(); }
}

function startBossAttack(en, p) {
  const m = en.mesh, sp = en.species, roll = Math.random();
  if (sp === 'miniBoss') {
    // The Jungle King's signature move: leap onto the player
    if (roll < 0.62) { startBossJump(en, p); }
    else if (roll < 0.85) { const dir = new THREE.Vector3(p.x - m.position.x, 0, p.z - m.position.z).normalize(); en.chargeVel = dir.multiplyScalar(en.speed * 3.2); en.mode = 'charge'; en.chargeTime = 0.75; if (typeof SFX !== 'undefined') SFX.charge(); }
    else { bossSlam(en, 3.2, 20); en.mode = 'idle'; en.atkTimer = 1.8 + Math.random(); }
  } else if (sp === 'yeti') {
    // The Yeti mainly hurls snowballs
    if (roll < 0.78) { bossSnow(en, p, 4); en.mode = 'idle'; en.atkTimer = 1.5 + Math.random(); }
    else { const dir = new THREE.Vector3(p.x - m.position.x, 0, p.z - m.position.z).normalize(); en.chargeVel = dir.multiplyScalar(en.speed * 3); en.mode = 'charge'; en.chargeTime = 0.7; if (typeof SFX !== 'undefined') SFX.charge(); }
  } else { // octopus
    if (roll < 0.55) { bossRadial(en, 10, 0x8a3ab0); en.mode = 'idle'; en.atkTimer = 1.5 + Math.random(); }
    else { bossSlam(en, 3.6, 15); en.mode = 'idle'; en.atkTimer = 1.6 + Math.random(); }
  }
}

// Jungle King leap: hop into the air and crash down where the player was
function startBossJump(en, p) {
  const m = en.mesh;
  en.mode = 'jump'; en.jumpT = 0; en.jumpDur = 0.78;
  en.jumpStart = new THREE.Vector3(m.position.x, en.size, m.position.z);
  en.jumpTarget = new THREE.Vector3(p.x, en.size, p.z);
  if (typeof SFX !== 'undefined') SFX.charge();
}

// Yeti snowball volley
function bossSnow(en, p, n) {
  const m = en.mesh; if (typeof SFX !== 'undefined') SFX.shoot();
  spawnParticles(m.position.clone().add(new THREE.Vector3(0, 0.6, 0)), new THREE.Color(0xffffff), 10);
  const base = new THREE.Vector3(p.x - m.position.x, 0, p.z - m.position.z).normalize();
  for (let i = 0; i < n; i++) {
    const ang = (i - (n - 1) / 2) * 0.22;
    const dir = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
    spawnBossShot(m.position, dir.multiplyScalar(6), 0xffffff, 10, 0.35, 0.28);
  }
}

function bossSlam(en, radius, dmg) {
  const m = en.mesh;
  if (typeof SFX !== 'undefined') SFX.slam();
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; const pos = m.position.clone().add(new THREE.Vector3(Math.cos(a) * radius, 0.2, Math.sin(a) * radius)); spawnParticles(pos, new THREE.Color(0xffcc66), 3); }
  if (E.player.position.distanceTo(m.position) < radius) hurtPlayer(dmg);
}
function bossThrow(en, p, n, color) {
  const m = en.mesh; if (typeof SFX !== 'undefined') SFX.shoot();
  const base = new THREE.Vector3(p.x - m.position.x, 0, p.z - m.position.z).normalize();
  for (let i = 0; i < n; i++) { const ang = (i - (n - 1) / 2) * 0.26; const dir = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ang); spawnBossShot(m.position, dir.multiplyScalar(6), color, 12); }
}
function bossRadial(en, n, color) {
  const m = en.mesh; if (typeof SFX !== 'undefined') SFX.shoot();
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; spawnBossShot(m.position, new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(5), color, 10); }
}

function spawnBossShot(pos, vel, color, dmg, emis, radius) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius || 0.22, 10, 8),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: emis == null ? 1 : emis, roughness: 0.6 }));
  mesh.position.copy(pos); mesh.position.y = 0.8; mesh.castShadow = true;
  E.scene.add(mesh);
  E.bossShots.push({ mesh, vel, dmg, life: 3 });
}

function updateBossShots(dt) {
  if (!E.bossShots) return;
  for (let i = E.bossShots.length - 1; i >= 0; i--) {
    const s = E.bossShots[i];
    s.life -= dt;
    s.mesh.position.x += s.vel.x * dt; s.mesh.position.z += s.vel.z * dt;
    s.mesh.rotation.y += dt * 6;
    let dead = s.life <= 0 || isSolid(s.mesh.position.x, s.mesh.position.z);
    if (!dead && E.player.position.distanceTo(s.mesh.position) < 0.6) { hurtPlayer(s.dmg); dead = true; }
    if (dead) { spawnParticles(s.mesh.position, s.mesh.material.color, 6); E.scene.remove(s.mesh); E.bossShots.splice(i, 1); }
  }
}

function updateBossBar() {
  const bar = document.getElementById('bossBar'); if (!bar) return;
  let boss = null;
  if (E.enemies) for (const en of E.enemies) { if (en.boss && E.player && E.player.position.distanceTo(en.mesh.position) < 13) { boss = en; break; } }
  if (!boss) { bar.style.display = 'none'; return; }
  bar.style.display = 'block';
  document.getElementById('bossName').textContent = BOSS_NAME[boss.species] || 'Boss';
  document.getElementById('bossFill').style.width = (Math.max(0, boss.hp / boss.maxhp) * 100) + '%';
}
function hideBossBar() { const bar = document.getElementById('bossBar'); if (bar) bar.style.display = 'none'; }
