// ════════════════════════════════════════
// js/arcade3d.js — Space Arcade
// Entering the Arcade building opens a lobby with several minigames.
// Each game is a self-contained DOM overlay that awards Space Coins.
// ════════════════════════════════════════

let arcadeTimers = [];
let arcadeRAF = null;
let arcadeKeyHandler = null;
function arcadeClearTimers() {
  arcadeTimers.forEach(t => { clearInterval(t); clearTimeout(t); });
  arcadeTimers = [];
  if (arcadeRAF) { cancelAnimationFrame(arcadeRAF); arcadeRAF = null; }
  if (arcadeKeyHandler) { window.removeEventListener('keydown', arcadeKeyHandler); arcadeKeyHandler = null; }
}

const ARCADE_GAMES = [
  { id: 'rps', name: 'Cosmic RPS', emoji: '✊', desc: 'Beat the house — win 25 🪙' },
  { id: 'reflex', name: 'Warp Reflex', emoji: '🎯', desc: 'Stop the meter in the zone — up to 50 🪙' },
  { id: 'memory', name: 'Star Memory', emoji: '🧠', desc: 'Repeat the sequence — 10 🪙 a round' },
  { id: 'slots', name: 'Galaxy Slots', emoji: '🎰', desc: '10 🪙 a spin — match to win big' },
  { id: 'highlow', name: 'Higher / Lower', emoji: '🔢', desc: 'Guess the next number — 15 🪙 a streak' },
  { id: 'whack', name: 'Star Whack', emoji: '🔨', desc: 'Bonk the aliens — 2 🪙 each' },
  { id: 'maze', name: 'Maze Runner', emoji: '🌀', desc: 'Reach the exit — 40 🪙' },
  { id: 'flappy', name: 'Rocket Dash', emoji: '🚀', desc: 'Dodge the gates — 5 🪙 a gate' }
];

function openArcade() {
  gamePaused = true;
  updateArcadeCoins();
  document.getElementById('arcadeBackBtn').onclick = renderArcadeLobby;
  document.getElementById('arcadeCloseBtn').onclick = closeArcade;
  renderArcadeLobby();
  document.getElementById('arcadePanel').style.display = 'block';
}
function closeArcade() {
  arcadeClearTimers();
  document.getElementById('arcadePanel').style.display = 'none';
  gamePaused = false;
}
function updateArcadeCoins() {
  const el = document.getElementById('arcadeCoins');
  if (el) el.textContent = '🪙 ' + (save.spaceCoins || 0);
}
function arcadeAward(n) {
  save.spaceCoins = Math.max(0, (save.spaceCoins || 0) + n);
  if (n > 0 && typeof SFX !== 'undefined') SFX.coin();
  persist(); updateHUD(); updateArcadeCoins();
}

function renderArcadeLobby() {
  arcadeClearTimers();
  document.getElementById('arcadeBackBtn').style.visibility = 'hidden';
  const body = document.getElementById('arcadeBody');
  body.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'arcade-grid';
  ARCADE_GAMES.forEach(g => {
    const c = document.createElement('div');
    c.className = 'arcade-card';
    c.innerHTML = `<div class="ac-emoji">${g.emoji}</div><div class="ac-name">${g.name}</div><div class="ac-desc">${g.desc}</div>`;
    c.onclick = () => openArcadeGame(g.id);
    grid.appendChild(c);
  });
  body.appendChild(grid);
}

function openArcadeGame(id) {
  arcadeClearTimers();
  document.getElementById('arcadeBackBtn').style.visibility = 'visible';
  const body = document.getElementById('arcadeBody');
  body.innerHTML = '';
  ({ rps: gameRPS, reflex: gameReflex, memory: gameMemory, slots: gameSlots, highlow: gameHighLow,
     whack: gameWhack, maze: gameMaze, flappy: gameFlappy, claw: gameClaw }[id])(body);
}

function agAgain(el, fn) {
  const again = document.createElement('button');
  again.className = 'ag-btn'; again.textContent = '↻ Play Again';
  again.onclick = () => fn(el); el.appendChild(again);
}

// ── 1. Rock Paper Scissors ──────────────────────────────────────
function gameRPS(el) {
  el.innerHTML = '<div class="ag-title">✊ Cosmic Rock-Paper-Scissors</div><div class="ag-msg" id="rpsMsg">Choose your move!</div><div class="ag-row" id="rpsBtns"></div>';
  const opts = [['Rock', '🪨'], ['Paper', '📄'], ['Scissors', '✂️']];
  const row = el.querySelector('#rpsBtns');
  opts.forEach(([k, e], you) => {
    const b = document.createElement('button');
    b.className = 'ag-btn'; b.textContent = e + ' ' + k;
    b.onclick = () => {
      const them = Math.floor(Math.random() * 3);
      const win = them === (you + 2) % 3, tie = you === them;
      let msg = `You ${e} vs House ${opts[them][1]} — `;
      if (tie) msg += "Tie!";
      else if (win) { msg += 'You win! +25 🪙'; arcadeAward(25); }
      else msg += 'You lose!';
      el.querySelector('#rpsMsg').textContent = msg;
    };
    row.appendChild(b);
  });
}

// ── 2. Warp Reflex (stop the meter) ─────────────────────────────
function gameReflex(el) {
  el.innerHTML = `<div class="ag-title">🎯 Warp Reflex</div>
    <div class="ag-msg" id="rxMsg">Stop the marker in the green zone!</div>
    <div class="rx-bar"><div class="rx-zone"></div><div class="rx-bull"></div><div class="rx-marker" id="rxMarker"></div></div>
    <button class="ag-btn" id="rxBtn">■ STOP</button>`;
  const marker = el.querySelector('#rxMarker');
  let pos = 0, dir = 1, stopped = false;
  const t = setInterval(() => {
    pos += dir * 1.7; if (pos >= 100) { pos = 100; dir = -1; } if (pos <= 0) { pos = 0; dir = 1; }
    marker.style.left = pos + '%';
  }, 16);
  arcadeTimers.push(t);
  el.querySelector('#rxBtn').onclick = () => {
    if (stopped) return; stopped = true; clearInterval(t);
    let msg, reward = 0;
    if (pos >= 47 && pos <= 53) { reward = 50; msg = '🎯 BULLSEYE! +50 🪙'; }
    else if (pos >= 40 && pos <= 60) { reward = 30; msg = 'Nice! +30 🪙'; }
    else if (pos >= 32 && pos <= 68) { reward = 10; msg = 'Close! +10 🪙'; }
    else msg = 'Missed! Try again.';
    if (reward) arcadeAward(reward);
    el.querySelector('#rxMsg').textContent = msg;
    agAgain(el, gameReflex);
  };
}

// ── 3. Star Memory (Simon) ──────────────────────────────────────
function gameMemory(el) {
  el.innerHTML = `<div class="ag-title">🧠 Star Memory</div><div class="ag-msg" id="memMsg">Watch the sequence…</div>
    <div class="mem-grid" id="memGrid"></div><div class="ag-sub" id="memRound"></div>`;
  const colors = ['#f44', '#4f4', '#48f', '#fd4'];
  const grid = el.querySelector('#memGrid'); const pads = [];
  colors.forEach((c, i) => { const p = document.createElement('div'); p.className = 'mem-pad'; p.style.background = c; p.dataset.i = i; grid.appendChild(p); pads.push(p); });
  let seq = [], input = [], round = 0, playing = false;
  const flash = (i, dur = 340) => { pads[i].classList.add('mem-on'); const t = setTimeout(() => pads[i].classList.remove('mem-on'), dur); arcadeTimers.push(t); };
  function nextRound() {
    round++; el.querySelector('#memRound').textContent = 'Round ' + round;
    seq.push(Math.floor(Math.random() * 4)); input = []; playing = false;
    el.querySelector('#memMsg').textContent = 'Watch…';
    const d = 620;
    seq.forEach((i, k) => { const t = setTimeout(() => flash(i), d * (k + 1)); arcadeTimers.push(t); });
    const t2 = setTimeout(() => { playing = true; el.querySelector('#memMsg').textContent = 'Your turn!'; }, d * (seq.length + 1)); arcadeTimers.push(t2);
  }
  pads.forEach(p => p.onclick = () => {
    if (!playing) return;
    const i = +p.dataset.i; flash(i, 200); input.push(i);
    const k = input.length - 1;
    if (input[k] !== seq[k]) { playing = false; el.querySelector('#memMsg').textContent = 'Wrong! You reached round ' + round + '.'; agAgain(el, gameMemory); return; }
    if (input.length === seq.length) { playing = false; arcadeAward(10); el.querySelector('#memMsg').textContent = 'Correct! +10 🪙'; const t = setTimeout(nextRound, 850); arcadeTimers.push(t); }
  });
  const t = setTimeout(nextRound, 650); arcadeTimers.push(t);
}

// ── 4. Galaxy Slots ─────────────────────────────────────────────
function gameSlots(el) {
  el.innerHTML = `<div class="ag-title">🎰 Galaxy Slots</div><div class="ag-msg" id="slMsg">10 🪙 per spin. Match symbols to win!</div>
    <div class="sl-reels"><span id="r0">❔</span><span id="r1">❔</span><span id="r2">❔</span></div>
    <button class="ag-btn" id="slBtn">Spin (10 🪙)</button>`;
  const syms = ['🍒', '⭐', '🚀', '🪐', '💎', '🍌'];
  el.querySelector('#slBtn').onclick = () => {
    if ((save.spaceCoins || 0) < 10) { el.querySelector('#slMsg').textContent = 'Not enough coins!'; return; }
    arcadeAward(-10);
    const reels = [el.querySelector('#r0'), el.querySelector('#r1'), el.querySelector('#r2')];
    const final = [0, 0, 0].map(() => Math.floor(Math.random() * syms.length));
    let spins = 0;
    const t = setInterval(() => {
      reels.forEach(r => r.textContent = syms[Math.floor(Math.random() * syms.length)]);
      if (++spins > 14) {
        clearInterval(t);
        reels.forEach((r, i) => r.textContent = syms[final[i]]);
        let msg, reward = 0;
        if (final[0] === final[1] && final[1] === final[2]) { reward = 100; msg = '🎉 JACKPOT! +100 🪙'; }
        else if (final[0] === final[1] || final[1] === final[2] || final[0] === final[2]) { reward = 20; msg = 'Pair! +20 🪙'; }
        else msg = 'No match. Spin again!';
        if (reward) arcadeAward(reward);
        el.querySelector('#slMsg').textContent = msg;
      }
    }, 80);
    arcadeTimers.push(t);
  };
}

// ── 5. Higher / Lower ───────────────────────────────────────────
function gameHighLow(el) {
  el.innerHTML = `<div class="ag-title">🔢 Higher or Lower</div><div class="ag-msg" id="hlMsg">Will the next number (1-100) be higher or lower?</div>
    <div class="hl-num" id="hlNum">?</div><div class="ag-row"><button class="ag-btn" id="hlHi">⬆ Higher</button><button class="ag-btn" id="hlLo">⬇ Lower</button></div><div class="ag-sub" id="hlStreak"></div>`;
  let cur = Math.floor(Math.random() * 100) + 1, streak = 0;
  el.querySelector('#hlNum').textContent = cur;
  function guess(hi) {
    const next = Math.floor(Math.random() * 100) + 1;
    const correct = hi ? next >= cur : next <= cur;
    el.querySelector('#hlNum').textContent = next;
    if (correct) {
      streak++; arcadeAward(15);
      el.querySelector('#hlMsg').textContent = `Correct! +15 🪙`;
      el.querySelector('#hlStreak').textContent = 'Streak: ' + streak;
      cur = next;
    } else {
      el.querySelector('#hlMsg').textContent = `Wrong! Streak ended at ${streak}.`;
      el.querySelector('#hlStreak').textContent = '';
      el.querySelector('#hlHi').disabled = true; el.querySelector('#hlLo').disabled = true;
      agAgain(el, gameHighLow);
    }
  }
  el.querySelector('#hlHi').onclick = () => guess(true);
  el.querySelector('#hlLo').onclick = () => guess(false);
}

// ── 6. Star Whack (whack-a-mole) ────────────────────────────────
function gameWhack(el) {
  el.innerHTML = `<div class="ag-title">🔨 Star Whack</div><div class="ag-msg" id="wkMsg">Bonk the aliens before they duck!</div>
    <div class="wk-grid" id="wkGrid"></div><div class="ag-sub" id="wkScore">Score: 0</div>`;
  let score = 0, time = 20;
  const grid = el.querySelector('#wkGrid'); const holes = [];
  for (let i = 0; i < 9; i++) {
    const h = document.createElement('div'); h.className = 'wk-hole';
    const m = document.createElement('div'); m.className = 'wk-mole'; m.textContent = '👾';
    h.appendChild(m); grid.appendChild(h);
    const H = { m, up: false }; holes.push(H);
    m.onclick = () => { if (H.up) { H.up = false; m.classList.remove('wk-up'); score++; el.querySelector('#wkScore').textContent = 'Score: ' + score; } };
  }
  const pop = setInterval(() => {
    const H = holes[Math.floor(Math.random() * 9)];
    if (H.up) return;
    H.up = true; H.m.classList.add('wk-up');
    const t = setTimeout(() => { H.up = false; H.m.classList.remove('wk-up'); }, 700 + Math.random() * 500);
    arcadeTimers.push(t);
  }, 620); arcadeTimers.push(pop);
  const tick = setInterval(() => {
    time--;
    if (time <= 0) {
      clearInterval(pop); clearInterval(tick);
      const reward = score * 2; if (reward) arcadeAward(reward);
      el.querySelector('#wkMsg').textContent = `Time! You bonked ${score} — +${reward} 🪙`;
      agAgain(el, gameWhack);
    } else el.querySelector('#wkMsg').textContent = 'Bonk the aliens! ' + time + 's';
  }, 1000); arcadeTimers.push(tick);
}

// ── 7. Maze Runner ──────────────────────────────────────────────
function genMaze(W, H) {
  const g = []; for (let y = 0; y < H; y++) { g[y] = []; for (let x = 0; x < W; x++) g[y][x] = 1; }
  (function carve(x, y) {
    g[y][x] = 0;
    const dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]].sort(() => Math.random() - 0.5);
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx > 0 && ny > 0 && nx < W - 1 && ny < H - 1 && g[ny][nx] === 1) { g[y + dy / 2][x + dx / 2] = 0; carve(nx, ny); }
    }
  })(1, 1);
  return g;
}
function gameMaze(el) {
  const W = 11, H = 9, g = genMaze(W, H);
  el.innerHTML = `<div class="ag-title">🌀 Maze Runner</div><div class="ag-msg" id="mzMsg">Reach the ⭐ exit! WASD / arrows or the pad.</div>
    <div class="mz-grid" id="mzGrid"></div>
    <div class="mz-dpad"><span></span><button class="ag-btn dp" data-d="u">▲</button><span></span>
      <button class="ag-btn dp" data-d="l">◀</button><button class="ag-btn dp" data-d="dn">▼</button><button class="ag-btn dp" data-d="r">▶</button></div>`;
  const grid = el.querySelector('#mzGrid'); grid.style.gridTemplateColumns = `repeat(${W},1fr)`;
  const cells = [];
  for (let y = 0; y < H; y++) { cells[y] = []; for (let x = 0; x < W; x++) { const c = document.createElement('div'); c.className = 'mz-cell' + (g[y][x] ? ' mz-wall' : ''); grid.appendChild(c); cells[y][x] = c; } }
  let pr = 1, pc = 1; const er = H - 2, ec = W - 2;
  cells[er][ec].classList.add('mz-exit');
  const draw = () => { cells.forEach(row => row.forEach(c => c.classList.remove('mz-player'))); cells[pr][pc].classList.add('mz-player'); };
  draw();
  function move(dr, dc) {
    const nr = pr + dr, nc = pc + dc;
    if (nr < 0 || nc < 0 || nr >= H || nc >= W || g[nr][nc]) return;
    pr = nr; pc = nc; draw();
    if (pr === er && pc === ec) {
      if (arcadeKeyHandler) { window.removeEventListener('keydown', arcadeKeyHandler); arcadeKeyHandler = null; }
      arcadeAward(40);
      el.querySelector('#mzMsg').textContent = 'You escaped! +40 🪙';
      agAgain(el, gameMaze);
    }
  }
  el.querySelectorAll('.dp').forEach(b => b.onclick = () => {
    const d = b.dataset.d; move(d === 'u' ? -1 : d === 'dn' ? 1 : 0, d === 'l' ? -1 : d === 'r' ? 1 : 0);
  });
  arcadeKeyHandler = (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') move(-1, 0);
    else if (k === 's' || k === 'arrowdown') move(1, 0);
    else if (k === 'a' || k === 'arrowleft') move(0, -1);
    else if (k === 'd' || k === 'arrowright') move(0, 1);
    else return;
    e.preventDefault();
  };
  window.addEventListener('keydown', arcadeKeyHandler);
}

// ── 8. Rocket Dash (side-scroller) ──────────────────────────────
function gameFlappy(el) {
  el.innerHTML = `<div class="ag-title">🚀 Rocket Dash</div><div class="ag-msg" id="fdMsg">Click or press Space to boost. Dodge the gates!</div>
    <canvas id="fdCanvas" width="440" height="300" style="background:#08081c;border:1px solid #55f;border-radius:8px;max-width:100%;cursor:pointer;"></canvas>
    <div class="ag-sub" id="fdScore">Score: 0</div>`;
  const cv = el.querySelector('#fdCanvas'), ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height, PX = 62, R = 13;
  let y = H / 2, vy = 0, score = 0, dead = false, t = 0, gates = [];
  const flap = () => { if (dead) { gameFlappy(el); return; } vy = -4.4; };
  cv.onclick = flap;
  arcadeKeyHandler = (e) => { if (e.key === ' ') { e.preventDefault(); flap(); } };
  window.addEventListener('keydown', arcadeKeyHandler);
  function loop() {
    t++; vy += 0.3; y += vy;
    if (t % 92 === 0) { const gap = 92, gy = 34 + Math.random() * (H - 68 - gap); gates.push({ x: W, gy, gap, passed: false }); }
    gates.forEach(g => g.x -= 2.5);
    gates = gates.filter(g => g.x > -40);
    gates.forEach(g => {
      if (!g.passed && g.x + 30 < PX) { g.passed = true; score++; el.querySelector('#fdScore').textContent = 'Score: ' + score; }
      if (PX + R > g.x && PX - R < g.x + 30 && (y - R < g.gy || y + R > g.gy + g.gap)) dead = true;
    });
    if (y > H - R || y < R) dead = true;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#2a8a4a';
    gates.forEach(g => { ctx.fillRect(g.x, 0, 30, g.gy); ctx.fillRect(g.x, g.gy + g.gap, 30, H - g.gy - g.gap); });
    ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.fillText('🚀', PX, y + 9);
    if (dead) {
      if (arcadeKeyHandler) { window.removeEventListener('keydown', arcadeKeyHandler); arcadeKeyHandler = null; }
      const reward = score * 5; if (reward) arcadeAward(reward);
      el.querySelector('#fdMsg').textContent = `Crashed! Score ${score} — +${reward} 🪙. Click to retry.`;
      return;
    }
    arcadeRAF = requestAnimationFrame(loop);
  }
  arcadeRAF = requestAnimationFrame(loop);
}

// ── 9. Prize Claw ───────────────────────────────────────────────
function gameClaw(el) {
  el.innerHTML = `<div class="ag-title">🕹️ Prize Claw</div>
    <div class="ag-msg" id="clMsg">Click or press Space to drop the claw on a prize!</div>
    <canvas id="clCanvas" width="440" height="300" style="background:#0a0a1e;border:1px solid #55f;border-radius:8px;max-width:100%;cursor:pointer;"></canvas>
    <div class="ag-sub" id="clScore">Prizes won: 0</div>`;
  const cv = el.querySelector('#clCanvas'), ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height, prizeY = H - 46;
  const POOL = (typeof collectiblesBySrc === 'function') ? collectiblesBySrc('claw') : [{ emoji: '🧸', id: 'teddy', name: 'Teddy Bear' }];
  function makeRow() {
    const n = 5, gap = (W - 90) / (n - 1), arr = [];
    for (let i = 0; i < n; i++) { const p = POOL[Math.floor(Math.random() * POOL.length)]; arr.push({ x: 45 + i * gap, emoji: p.emoji, id: p.id, name: p.name, gone: false }); }
    return arr;
  }
  let prizes = makeRow(), clawX = W / 2, dir = 1, clawY = 34, state = 'aim', total = 0, held = null;
  const grabRange = 30, dropSpeed = 6, aimSpeed = 2.7;
  const drop = () => { if (state === 'aim') state = 'drop'; };
  cv.onclick = drop;
  arcadeKeyHandler = (e) => { if (e.key === ' ') { e.preventDefault(); drop(); } };
  window.addEventListener('keydown', arcadeKeyHandler);
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = '#2a2a48'; ctx.lineWidth = 2; ctx.strokeRect(4, 4, W - 8, H - 8);
    ctx.fillStyle = '#141430'; ctx.fillRect(4, prizeY + 12, W - 8, H - prizeY - 16); // prize bin
    ctx.fillStyle = '#3a3a66'; ctx.fillRect(4, 20, W - 8, 5);                        // top rail
    ctx.font = '28px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    prizes.forEach(p => { if (!p.gone) ctx.fillText(p.emoji, p.x, prizeY); });
    ctx.strokeStyle = '#99a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(clawX, 22); ctx.lineTo(clawX, clawY); ctx.stroke();
    ctx.fillStyle = '#cdd'; ctx.beginPath();
    ctx.moveTo(clawX - 13, clawY); ctx.lineTo(clawX, clawY + 15); ctx.lineTo(clawX + 13, clawY);
    ctx.lineTo(clawX + 6, clawY - 3); ctx.lineTo(clawX - 6, clawY - 3); ctx.closePath(); ctx.fill();
    if (held) { ctx.font = '24px serif'; ctx.fillText(held.emoji, clawX, clawY + 20); }
  }
  function loop() {
    if (state === 'aim') { clawX += dir * aimSpeed; if (clawX > W - 34) { clawX = W - 34; dir = -1; } if (clawX < 34) { clawX = 34; dir = 1; } }
    else if (state === 'drop') {
      clawY += dropSpeed;
      if (clawY >= prizeY - 6) {
        let best = null, bd = grabRange;
        prizes.forEach(p => { if (p.gone) return; const d = Math.abs(p.x - clawX); if (d < bd) { bd = d; best = p; } });
        if (best && Math.random() < 0.72) { held = { emoji: best.emoji, id: best.id, name: best.name }; best.gone = true; }
        else held = null;
        state = 'rise';
      }
    } else if (state === 'rise') {
      clawY -= dropSpeed;
      if (clawY <= 34) {
        clawY = 34;
        if (held) {
          total += 1; if (typeof addCollectible === 'function') addCollectible(held.id, 1);
          el.querySelector('#clScore').textContent = 'Prizes won: ' + total;
          el.querySelector('#clMsg').textContent = 'Won a ' + held.emoji + ' ' + held.name + '! Added to your collection. Drop again!';
        } else {
          el.querySelector('#clMsg').textContent = 'So close — the claw slipped! Try again.';
        }
        held = null;
        if (prizes.every(p => p.gone)) prizes = makeRow();
        state = 'aim';
      }
    }
    draw();
    arcadeRAF = requestAnimationFrame(loop);
  }
  arcadeRAF = requestAnimationFrame(loop);
}

// Esc leaves the arcade
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('arcadePanel') &&
      document.getElementById('arcadePanel').style.display === 'block') closeArcade();
});
