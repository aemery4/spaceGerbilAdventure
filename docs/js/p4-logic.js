// ════════════════════════════════════════
// js/p4-logic.js — Planet 4 Logic Layer
// Aquatic Planet Neptuna — update logic, AI, combat
// ════════════════════════════════════════

// ── Shared state for P4 (initialized by planet4.js) ─────
let p4 = null;

// Initialize shared P4 state — called from planet4.js
function p4InitData(state) {
  p4 = state;
}

// ── Particle Helper ──────────────────────────────────────
function addP4(x, y, color, count = 5, size = 3) {
  for (let i = 0; i < count; i++) {
    p4.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 3,
      life: 30,
      color,
      size
    });
  }
}

// ── Resource Gathering ───────────────────────────────────
function tryGatherP4Resource(mx, my) {
  for (let res of p4.resources) {
    if (!res.collected && Math.abs(mx - res.x) < 20 && Math.abs(my - res.y) < 20) {
      if (Math.abs(p4.player.x - res.x) < 30 && Math.abs(p4.player.y - res.y) < 30) {
        res.collected = true;
        save.resources[res.type]++;
        updateHUD();
        addP4(res.x, res.y, '#87CEEB', 5, 3);
        return true;
      }
    }
  }
  return false;
}

// ── Combat ───────────────────────────────────────────────
function tryAttackP4Enemy(mx, my) {
  if (!p4.activeWeapon || p4.weaponCooldown > 0) return false;

  for (let enemy of p4.enemies) {
    if (enemy.hp > 0 && Math.abs(mx - enemy.x) < 25 && Math.abs(my - enemy.y) < 25) {
      if (Math.abs(p4.player.x - enemy.x) < 60 && Math.abs(p4.player.y - enemy.y) < 60) {
        const damage = p4.activeWeapon === 'laser' ? 3 : p4.activeWeapon === 'sword' ? 2 : 1;
        enemy.hp -= damage;
        enemy.aggro = true;
        p4.weaponCooldown = p4.activeWeapon === 'laser' ? 20 : p4.activeWeapon === 'sword' ? 15 : 10;

        // Special octopus defeat
        if (enemy.type === 'octopus' && enemy.hp <= 0 && !p4.bossDefeated) {
          p4.bossDefeated = true;
          if (!save.planetsCleared.includes(4)) {
            save.planetsCleared.push(4);
            persist();
          }
          showMsg('🐙 Victory!', 'You defeated the evil octopus! Neptuna is safe!', () => {
            goMenu();
          });
          return true;
        }

        // Damage particles
        for (let i = 0; i < 8; i++) {
          p4.particles.push({
            x: enemy.x, y: enemy.y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 20,
            color: '#FF4444',
            size: 2
          });
        }
        return true;
      }
    }
  }
  return false;
}

// ── Seahorse Interaction ─────────────────────────────────
function tryInteractP4Seahorse(mx, my) {
  for (let seahorse of p4.SEAHORSES) {
    if (Math.abs(mx - seahorse.x) < 20 && Math.abs(my - seahorse.y) < 20) {
      if (Math.abs(p4.player.x - seahorse.x) < 40 && Math.abs(p4.player.y - seahorse.y) < 40) {
        showMsg(`${seahorse.emoji} ${seahorse.name}`, seahorse.dialog, () => {
          gamePaused = false;
        });
        gamePaused = true;
        seahorse.interacted = true;
        return true;
      }
    }
  }
  return false;
}

// ── Main Action Handler ──────────────────────────────────
function doP4Action(mx, my) {
  if (gamePaused) return;
  if (tryGatherP4Resource(mx, my)) return;
  if (tryAttackP4Enemy(mx, my)) return;
  tryInteractP4Seahorse(mx, my);
}

// ── Main Update Function ─────────────────────────────────
function updateP4() {
  if (gamePaused) return;

  // Update player
  let newX = p4.player.x, newY = p4.player.y;
  if (p4.player.keys['a'] || p4.player.keys['arrowleft']) newX -= p4.player.speed;
  if (p4.player.keys['d'] || p4.player.keys['arrowright']) newX += p4.player.speed;
  if (p4.player.keys['w'] || p4.player.keys['arrowup']) newY -= p4.player.speed;
  if (p4.player.keys['s'] || p4.player.keys['arrowdown']) newY += p4.player.speed;

  // Collision detection
  const col = Math.floor(newX / p4.TILE), row = Math.floor(newY / p4.TILE);
  if (col >= 0 && col < p4.COLS && row >= 0 && row < p4.ROWS && p4.map[row][col] !== 1) {
    p4.player.x = newX;
    p4.player.y = newY;
  }

  // Update camera
  p4.cam.x = Math.max(0, Math.min(p4.player.x - 400, p4.COLS * p4.TILE - 800));
  p4.cam.y = Math.max(0, Math.min(p4.player.y - 260, p4.ROWS * p4.TILE - 520));

  // Update enemies
  for (let enemy of p4.enemies) {
    if (enemy.hp <= 0) continue;

    const dx = p4.player.x - enemy.x;
    const dy = p4.player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 100) enemy.aggro = true;

    if (enemy.aggro && dist > 5) {
      const moveX = (dx / dist) * enemy.speed;
      const moveY = (dy / dist) * enemy.speed;

      const newEnemyX = enemy.x + moveX;
      const newEnemyY = enemy.y + moveY;
      const eCol = Math.floor(newEnemyX / p4.TILE), eRow = Math.floor(newEnemyY / p4.TILE);

      if (eCol >= 0 && eCol < p4.COLS && eRow >= 0 && eRow < p4.ROWS && p4.map[eRow][eCol] !== 1) {
        enemy.x = newEnemyX;
        enemy.y = newEnemyY;
      }
    }

    // Enemy damage to player
    if (dist < 20 && p4.player.invincible <= 0) {
      save.hp -= enemy.type === 'octopus' ? 3 : enemy.type === 'piranha' ? 2 : 1;
      p4.player.invincible = 60;
      updateHUD();
      if (save.hp <= 0) {
        loseLife(() => { p4.cleanup(); launchP4(); });
        return;
      }
    }

    // Octopus special attack
    if (enemy.type === 'octopus' && Date.now() - enemy.lastAttack > 3000) {
      enemy.lastAttack = Date.now();
      // Ink cloud particles
      for (let i = 0; i < 15; i++) {
        p4.particles.push({
          x: enemy.x, y: enemy.y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          life: 60,
          color: '#2C1810',
          size: 4
        });
      }
    }
  }

  if (p4.player.invincible > 0) p4.player.invincible--;
  if (p4.weaponCooldown > 0) p4.weaponCooldown--;

  // Update particles
  p4.particles = p4.particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1; // Gravity/buoyancy
    p.life--;
    return p.life > 0;
  });
}
