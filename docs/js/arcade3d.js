// ════════════════════════════════════════
// js/arcade3d.js — Space Arcade
// Entering the Arcade building opens a lobby with several minigames.
// Each game is a self-contained DOM overlay that awards Space Coins.
// ════════════════════════════════════════

let arcadeTimers = [];
function arcadeClearTimers() { arcadeTimers.forEach(t => { clearInterval(t); clearTimeout(t); }); arcadeTimers = []; }

const ARCADE_GAMES = [
  { id: 'rps', name: 'Cosmic RPS', emoji: '✊', desc: 'Beat the house — win 25 🪙' },
  { id: 'reflex', name: 'Warp Reflex', emoji: '🎯', desc: 'Stop the meter in the zone — up to 50 🪙' },
  { id: 'memory', name: 'Star Memory', emoji: '🧠', desc: 'Repeat the sequence — 10 🪙 a round' },
  { id: 'slots', name: 'Galaxy Slots', emoji: '🎰', desc: '10 🪙 a spin — match to win big' },
  { id: 'highlow', name: 'Higher / Lower', emoji: '🔢', desc: 'Guess the next number — 15 🪙 a streak' }
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
  ({ rps: gameRPS, reflex: gameReflex, memory: gameMemory, slots: gameSlots, highlow: gameHighLow }[id])(body);
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

// Esc leaves the arcade
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('arcadePanel') &&
      document.getElementById('arcadePanel').style.display === 'block') closeArcade();
});
