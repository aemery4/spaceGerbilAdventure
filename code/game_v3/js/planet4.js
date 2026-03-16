// ════════════════════════════════════════
// js/planet4.js  — launchP4()
// Aquatic Planet Neptuna — Defeat the Evil Octopus Boss
// ════════════════════════════════════════════════════════

function launchP4() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const TILE = 26, COLS = 48, ROWS = 28;

  // ── Build game data ───────────────────────────────────────
  // Underwater map with coral reefs, trenches, and caves
  const map = [];
  for(let r=0; r<ROWS; r++) {
    map[r] = [];
    for(let c=0; c<COLS; c++) {
      if(r===0 || r===ROWS-1 || c===0 || c===COLS-1) {
        map[r][c] = 1; // walls
      } else if((r>5 && r<10 && c>10 && c<20) || (r>15 && r<22 && c>25 && c<35)) {
        map[r][c] = 3; // coral reefs
      } else if(r>20 && c>5 && c<15) {
        map[r][c] = 2; // deep trench
      } else {
        map[r][c] = 0; // open water
      }
    }
  }

  // Resources scattered around the ocean floor
  const resources = [
    {type:'crystal', x:5*TILE+13, y:8*TILE+13, collected:false},
    {type:'plant', x:12*TILE+13, y:15*TILE+13, collected:false},
    {type:'rock', x:20*TILE+13, y:6*TILE+13, collected:false},
    {type:'fuel', x:35*TILE+13, y:18*TILE+13, collected:false},
    {type:'crystal', x:8*TILE+13, y:22*TILE+13, collected:false},
    {type:'plant', x:25*TILE+13, y:12*TILE+13, collected:false},
    {type:'rock', x:40*TILE+13, y:8*TILE+13, collected:false},
    {type:'fuel', x:15*TILE+13, y:25*TILE+13, collected:false},
  ];

  // Underwater enemies: squids, piranhas, and the evil octopus boss
  const enemies = [
    // Small squids
    {x:8*TILE+13, y:6*TILE+13, hp:2, maxHp:2, speed:2, type:'squid', aggro:false, dir:0},
    {x:15*TILE+13, y:10*TILE+13, hp:2, maxHp:2, speed:2, type:'squid', aggro:false, dir:0},
    {x:30*TILE+13, y:14*TILE+13, hp:2, maxHp:2, speed:2, type:'squid', aggro:false, dir:0},
    {x:22*TILE+13, y:20*TILE+13, hp:2, maxHp:2, speed:2, type:'squid', aggro:false, dir:0},
    
    // Piranhas - faster and more aggressive
    {x:18*TILE+13, y:8*TILE+13, hp:3, maxHp:3, speed:3, type:'piranha', aggro:false, dir:0},
    {x:28*TILE+13, y:16*TILE+13, hp:3, maxHp:3, speed:3, type:'piranha', aggro:false, dir:0},
    {x:12*TILE+13, y:22*TILE+13, hp:3, maxHp:3, speed:3, type:'piranha', aggro:false, dir:0},
    
    // Evil Octopus Boss - center of map
    {x:24*TILE+13, y:14*TILE+13, hp:15, maxHp:15, speed:1, type:'octopus', aggro:false, dir:0, lastAttack:0},
  ];

  // ── Player ───────────────────────────────────────────────
  const player = {
    x: 2*TILE+13, y: 2*TILE+13, size: 13,
    speed: save.items.includes('boots')?4:2.5, // Slower underwater movement
    keys: {}, invincible: 0,
  };
  const cam = { x:0, y:0 };

  // ── State variables ─────────────────────────────────────
  let particles = [];
  let activeWeapon = save.items.find(i=>i.startsWith('w:'))?.slice(2) || null;
  let weaponCooldown = 0;
  let bossDefeated = false;

  // ── Helpful seahorses (NPCs) ────────────────────────────
  const SEAHORSES = [
    {
      id:'seahorse1', name:'Coral the Seahorse', emoji:'🐴', color:'#FF6B9D',
      x:6*TILE+13, y:4*TILE+13,
      dialog:'Welcome to Neptuna! Beware the evil octopus in the center. The seahorses are here to help!',
      interacted: false
    },
    {
      id:'seahorse2', name:'Finn the Seahorse', emoji:'🐴', color:'#4ECDC4',
      x:38*TILE+13, y:22*TILE+13,
      dialog:'The octopus has many tentacles! Stay mobile and strike when you can!',
      interacted: false
    },
  ];

  // ── Input handlers ──────────────────────────────────────
  function handleKeyDown(e){ if(!gamePaused) player.keys[e.key.toLowerCase()]=true; }
  function handleKeyUp(e){ player.keys[e.key.toLowerCase()]=false; }
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  canvas.onclick = function(e) {
    if(gamePaused) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left + cam.x;
    const my = e.clientY - rect.top + cam.y;

    // Resource gathering
    for(let res of resources) {
      if(!res.collected && Math.abs(mx-res.x)<20 && Math.abs(my-res.y)<20) {
        if(Math.abs(player.x-res.x)<30 && Math.abs(player.y-res.y)<30) {
          res.collected = true;
          save.resources[res.type]++;
          updateHUD();
          // Bubble particles
          for(let i=0; i<5; i++) {
            particles.push({
              x:res.x, y:res.y, vx:(Math.random()-0.5)*4, vy:-Math.random()*3,
              life:30, color:'#87CEEB', size:3
            });
          }
        }
      }
    }

    // Combat
    if(activeWeapon && weaponCooldown<=0) {
      for(let enemy of enemies) {
        if(enemy.hp>0 && Math.abs(mx-enemy.x)<25 && Math.abs(my-enemy.y)<25) {
          if(Math.abs(player.x-enemy.x)<60 && Math.abs(player.y-enemy.y)<60) {
            let damage = activeWeapon==='laser'?3:activeWeapon==='sword'?2:1;
            enemy.hp -= damage;
            enemy.aggro = true;
            weaponCooldown = activeWeapon==='laser'?20:activeWeapon==='sword'?15:10;
            
            // Special octopus defeat
            if(enemy.type==='octopus' && enemy.hp<=0 && !bossDefeated) {
              bossDefeated = true;
              if(!save.planetsCleared.includes(4)) {
                save.planetsCleared.push(4);
                persist();
              }
              showMsg('🐙 Victory!', 'You defeated the evil octopus! Neptuna is safe!', ()=>{
                goMenu();
              });
              return;
            }
            
            // Damage particles
            for(let i=0; i<8; i++) {
              particles.push({
                x:enemy.x, y:enemy.y, vx:(Math.random()-0.5)*6, vy:(Math.random()-0.5)*6,
                life:20, color:'#FF4444', size:2
              });
            }
            break;
          }
        }
      }
    }

    // Seahorse interaction
    for(let seahorse of SEAHORSES) {
      if(Math.abs(mx-seahorse.x)<20 && Math.abs(my-seahorse.y)<20) {
        if(Math.abs(player.x-seahorse.x)<40 && Math.abs(player.y-seahorse.y)<40) {
          showMsg(`${seahorse.emoji} ${seahorse.name}`, seahorse.dialog, ()=>{
            gamePaused = false;
          });
          gamePaused = true;
          seahorse.interacted = true;
          break;
        }
      }
    }
  };

  // ── Main game loop ──────────────────────────────────────
  function loop() {
    if(gamePaused){ animFrameId = requestAnimationFrame(loop); return; }

    // Update player
    let newX = player.x, newY = player.y;
    if(player.keys['a'] || player.keys['arrowleft']) newX -= player.speed;
    if(player.keys['d'] || player.keys['arrowright']) newX += player.speed;
    if(player.keys['w'] || player.keys['arrowup']) newY -= player.speed;
    if(player.keys['s'] || player.keys['arrowdown']) newY += player.speed;

    // Collision detection
    const col = Math.floor(newX/TILE), row = Math.floor(newY/TILE);
    if(col>=0 && col<COLS && row>=0 && row<ROWS && map[row][col]!==1) {
      player.x = newX;
      player.y = newY;
    }

    // Update camera
    cam.x = Math.max(0, Math.min(player.x - 400, COLS*TILE - 800));
    cam.y = Math.max(0, Math.min(player.y - 260, ROWS*TILE - 520));

    // Update enemies
    for(let enemy of enemies) {
      if(enemy.hp <= 0) continue;
      
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if(dist < 100) enemy.aggro = true;
      
      if(enemy.aggro && dist > 5) {
        const moveX = (dx/dist) * enemy.speed;
        const moveY = (dy/dist) * enemy.speed;
        
        const newEnemyX = enemy.x + moveX;
        const newEnemyY = enemy.y + moveY;
        const eCol = Math.floor(newEnemyX/TILE), eRow = Math.floor(newEnemyY/TILE);
        
        if(eCol>=0 && eCol<COLS && eRow>=0 && eRow<ROWS && map[eRow][eCol]!==1) {
          enemy.x = newEnemyX;
          enemy.y = newEnemyY;
        }
      }
      
      // Enemy damage to player
      if(dist < 20 && player.invincible <= 0) {
        save.hp -= enemy.type==='octopus'?3:enemy.type==='piranha'?2:1;
        player.invincible = 60;
        updateHUD();
        if(save.hp <= 0) {
          loseLife(()=>{ cleanup(); launchP4(); });
          return;
        }
      }
      
      // Octopus special attack
      if(enemy.type==='octopus' && Date.now() - enemy.lastAttack > 3000) {
        enemy.lastAttack = Date.now();
        // Ink cloud particles
        for(let i=0; i<15; i++) {
          particles.push({
            x:enemy.x, y:enemy.y, vx:(Math.random()-0.5)*8, vy:(Math.random()-0.5)*8,
            life:60, color:'#2C1810', size:4
          });
        }
      }
    }

    if(player.invincible > 0) player.invincible--;
    if(weaponCooldown > 0) weaponCooldown--;

    // Update particles
    particles = particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // Gravity/buoyancy
      p.life--;
      return p.life > 0;
    });

    // ── Drawing ──────────────────────────────────────────────
    ctx.fillStyle = '#001133'; // Deep ocean blue
    ctx.fillRect(0, 0, 800, 520);

    // Draw map
    for(let r=0; r<ROWS; r++) {
      for(let c=0; c<COLS; c++) {
        const x = c*TILE - cam.x, y = r*TILE - cam.y;
        if(x<-TILE || x>800 || y<-TILE || y>520) continue;
        
        if(map[r][c] === 1) {
          ctx.fillStyle = '#4A4A4A'; // Rock walls
          ctx.fillRect(x, y, TILE, TILE);
        } else if(map[r][c] === 2) {
          ctx.fillStyle = '#000066'; // Deep trench
          ctx.fillRect(x, y, TILE, TILE);
        } else if(map[r][c] === 3) {
          ctx.fillStyle = '#FF6B9D'; // Coral reefs
          ctx.fillRect(x, y, TILE, TILE);
        }
      }
    }

    // Draw resources
    for(let res of resources) {
      if(res.collected) continue;
      const x = res.x - cam.x, y = res.y - cam.y;
      if(x<-20 || x>820 || y<-20 || y>540) continue;
      
      const colors = {fuel:'#FFD700', rock:'#8B4513', plant:'#32CD32', crystal:'#9370DB'};
      const emojis = {fuel:'⛽', rock:'🪨', plant:'🌿', crystal:'💎'};
      
      ctx.fillStyle = colors[res.type];
      ctx.fillRect(x-8, y-8, 16, 16);
      ctx.fillStyle = '#FFF';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(emojis[res.type], x, y+4);
    }

    // Draw seahorses
    for(let seahorse of SEAHORSES) {
      const x = seahorse.x - cam.x, y = seahorse.y - cam.y;
      if(x<-20 || x>820 || y<-20 || y>540) continue;
      
      ctx.fillStyle = seahorse.color;
      ctx.fillRect(x-10, y-10, 20, 20);
      ctx.fillStyle = '#FFF';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(seahorse.emoji, x, y+5);
      
      if(!seahorse.interacted) {
        ctx.fillStyle = '#FFFF00';
        ctx.font = '20px Arial';
        ctx.fillText('!', x, y-15);
      }
    }

    // Draw enemies
    for(let enemy of enemies) {
      if(enemy.hp <= 0) continue;
      const x = enemy.x - cam.x, y = enemy.y - cam.y;
      if(x<-30 || x>830 || y<-30 || y>550) continue;
      
      if(enemy.type === 'squid') {
        ctx.fillStyle = '#8A2BE2';
        ctx.fillRect(x-8, y-8, 16, 16);
        ctx.fillStyle = '#FFF';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🦑', x, y+4);
      } else if(enemy.type === 'piranha') {
        ctx.fillStyle = '#FF4500';
        ctx.fillRect(x-10, y-8, 20, 16);
        ctx.fillStyle = '#FFF';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🐟', x, y+4);
      } else if(enemy.type === 'octopus') {
        ctx.fillStyle = '#800080';
        ctx.fillRect(x-20, y-20, 40, 40);
        ctx.fillStyle = '#FFF';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🐙', x, y+8);
      }
      
      // Health bar
      if(enemy.hp < enemy.maxHp) {
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(x-15, y-25, 30, 4);
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(x-15, y-25, 30*(enemy.hp/enemy.maxHp), 4);
      }
    }

    // Draw particles
    for(let p of particles) {
      const x = p.x - cam.x, y = p.y - cam.y;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life/30;
      ctx.fillRect(x-p.size/2, y-p.size/2, p.size, p.size);
      ctx.globalAlpha = 1;
    }

    // Draw player (scuba diver skin)
    const px = player.x - cam.x, py = player.y - cam.y;
    if(player.invincible % 10 < 5) {
      ctx.fillStyle = '#00BFFF'; // Scuba suit blue
      ctx.fillRect(px-player.size, py-player.size, player.size*2, player.size*2);
      ctx.fillStyle = '#FFF';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🤿', px, py+5); // Scuba mask emoji
    }

    animFrameId = requestAnimationFrame(loop);
  }

  // ── Cleanup function ────────────────────────────────────
  function cleanup() {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    canvas.onclick = null;
  }

  // ── Show intro message and start ────────────────────────
  showMsg('🌊 Aquatic Planet Neptuna', 'Dive deep into the underwater world! Defeat the evil octopus boss with help from friendly seahorses. Watch out for squids and piranhas!', ()=>{ gamePaused=false; });
  gamePaused = true;
  loop();
}