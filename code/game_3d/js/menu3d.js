// ════════════════════════════════════════
// js/menu3d.js — HTML overlay menu + game flow for the 3D build
// Provides startPlanet / goMenu / showMenu and boots the game.
// ════════════════════════════════════════

// skins.js calls persistSave(); the 2D build never defined it. Alias to persist().
if (typeof persistSave === 'undefined') { window.persistSave = function () { persist(); }; }

const PLANET_META = [
  { n: 1, emoji: '🌍', name: 'Earth — Area 51' },
  { n: 2, emoji: '🌴', name: 'Jungle Zorbax' },
  { n: 3, emoji: '❄️', name: 'Tundra Frigia' },
  { n: 4, emoji: '🌊', name: 'Aquatic Neptuna' }
];

function isLocked(n) {
  if (save.freePlay) return false;
  if (n === 2) return !save.planetsCleared.includes(1);
  if (n === 3) return !save.planetsCleared.includes(2);
  if (n === 4) return !save.planetsCleared.includes(3);
  return false;
}

function renderMenuCards() {
  const grid = document.getElementById('planetGrid');
  grid.innerHTML = '';
  PLANET_META.forEach(p => {
    const cleared = save.planetsCleared.includes(p.n);
    const locked = isLocked(p.n);
    const card = document.createElement('div');
    card.className = 'pcard' + (cleared ? ' cleared' : locked ? ' locked' : '');
    card.innerHTML = `<div class="pemoji">${p.emoji}</div>
      <div class="pname">${p.name}</div>
      <div class="pstatus">${cleared ? '✓ Cleared' : locked ? '🔒 Locked' : save.freePlay ? '🎮 Free Play' : '▶ Play'}</div>`;
    if (!locked) card.onclick = () => startPlanet(p.n);
    grid.appendChild(card);
  });
  const coins = document.getElementById('menuCoins');
  coins.textContent = save.spaceCoins > 0 ? '🪙 ' + save.spaceCoins + ' Space Coins' : '';
}

function showMenu() {
  document.getElementById('hud').style.display = 'none';
  document.getElementById('invBar').style.display = 'none';
  document.getElementById('ctrl').style.display = 'none';
  document.getElementById('view3d').style.display = 'none';
  document.getElementById('menu3d').style.display = 'flex';
  renderMenuCards();
}

function goMenu() { stopEngine(); gamePaused = false; showMenu(); }

function startNewGame() {
  save = JSON.parse(JSON.stringify(DEF));
  persist();
  startPlanet(1);
}
function startFreePlay() {
  save.freePlay = true;
  save.planetsCleared = [1, 2, 3, 4];
  persist();
  renderMenuCards();
  showToast('🎮 Free Play', 'All planets unlocked. Pick any world.');
}

function startPlanet(n) {
  document.getElementById('menu3d').style.display = 'none';
  document.getElementById('view3d').style.display = 'block';
  document.getElementById('hud').style.display = 'flex';
  document.getElementById('invBar').style.display = 'block';
  document.getElementById('ctrl').style.display = 'block';
  document.getElementById('bh').style.display = n === 2 ? '' : 'none';
  const fuelMax = { 1: 10, 2: 15, 3: 20, 4: 25, 5: 0 }[n];
  document.getElementById('fuelMax').textContent = fuelMax;
  const labels = { 1: 'Earth — Area 51', 2: 'Jungle — Zorbax', 3: 'Tundra Frigia', 4: 'Aquatic Neptuna', 5: 'Home Planet' };
  document.getElementById('planet').textContent = labels[n] || 'Unknown';
  save.currentPlanet = n;
  if (n !== 5) save.resources.fuel = 0;
  updateHUD();
  onResize();
  launchPlanet3D(n);
}

// Home base + skins buttons on the menu
function openHomeBase() { startPlanet(5); }

// ── Boot ───────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadSave();
  updateHUD();
  showMenu();
  document.getElementById('mNew').onclick = startNewGame;
  document.getElementById('mFree').onclick = startFreePlay;
  document.getElementById('mHome').onclick = openHomeBase;
  document.getElementById('mSkins').onclick = () => { if (typeof openSkinMenu === 'function') openSkinMenu(); };
});
