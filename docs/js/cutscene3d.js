// ════════════════════════════════════════
// js/cutscene3d.js — Cinematic cutscenes
// A full-screen warp-starfield overlay used for the opening intro,
// planet-to-planet "blasting off" transitions, and the ending.
// ════════════════════════════════════════

let _csRAF = null, _csTimer = null;

const CS_PLANET = {
  1: ['🌍', 'Earth — Area 51'], 2: ['🌴', 'Jungle Zorbax'],
  3: ['❄️', 'Tundra Frigia'], 4: ['🌊', 'Aquatic Neptuna'], 5: ['🏠', 'Home Base']
};

function endCutscene(cb) {
  if (_csRAF) { cancelAnimationFrame(_csRAF); _csRAF = null; }
  if (_csTimer) { clearTimeout(_csTimer); _csTimer = null; }
  const o = document.getElementById('cutscene');
  if (o) o.style.display = 'none';
  if (cb) cb();
}

function showCutscene(opts, cb) {
  const o = document.getElementById('cutscene');
  if (!o) { if (cb) cb(); return; }
  if (typeof SFX !== 'undefined') { SFX.resume(); SFX.powerup(); }
  document.getElementById('csTitle').textContent = opts.title || '';
  document.getElementById('csLines').innerHTML = (opts.lines || []).map(l => `<div>${l}</div>`).join('');
  document.getElementById('csRocket').textContent = opts.icon || '🚀';
  o.style.display = 'flex';

  // Warp starfield
  const cv = document.getElementById('csCanvas'), ctx = cv.getContext('2d');
  cv.width = cv.clientWidth || window.innerWidth;
  cv.height = cv.clientHeight || window.innerHeight;
  const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
  const stars = [];
  for (let i = 0; i < 180; i++) stars.push({ a: Math.random() * Math.PI * 2, r: Math.random() * W * 0.5, sp: 1 + Math.random() * 3 });
  ctx.fillStyle = '#04040e'; ctx.fillRect(0, 0, W, H);

  function loop() {
    ctx.fillStyle = 'rgba(4,4,14,0.35)'; ctx.fillRect(0, 0, W, H);
    stars.forEach(s => {
      s.r += s.sp * 3;
      if (s.r > W * 0.72) { s.r = 0; s.a = Math.random() * Math.PI * 2; }
      const x = cx + Math.cos(s.a) * s.r, y = cy + Math.sin(s.a) * s.r;
      const x2 = cx + Math.cos(s.a) * (s.r + s.sp * 6), y2 = cy + Math.sin(s.a) * (s.r + s.sp * 6);
      ctx.strokeStyle = 'rgba(180,200,255,' + Math.min(1, s.r / W) + ')';
      ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
    });
    _csRAF = requestAnimationFrame(loop);
  }
  loop();

  _csTimer = setTimeout(() => endCutscene(cb), opts.dur || 3600);
  document.getElementById('csSkip').onclick = () => endCutscene(cb);
}

// ── The three cutscenes ─────────────────────────────────────────
function playIntroCutscene(cb) {
  showCutscene({
    title: '🐹 SPACE GERBIL ADVENTURE',
    icon: '🚀',
    lines: ['Our tiny hero blasts off from home...', 'Five strange worlds await across the galaxy.',
      'Gather fuel, brave the beasts, and become a legend!'],
    dur: 5200
  }, cb);
}

function playTransitionCutscene(fromN, toN, cb) {
  const a = CS_PLANET[fromN] || ['🚀', 'Space'], b = CS_PLANET[toN] || ['🪐', 'the next world'];
  showCutscene({
    title: '🚀 Blasting Off!',
    icon: '🚀',
    lines: [`${a[0]} ${a[1]}   →   ${b[0]} ${b[1]}`, 'Warp drive engaged…'],
    dur: 3800
  }, cb);
}

function playEndingCutscene(cb) {
  showCutscene({
    title: '🏆 A LEGEND IS BORN',
    icon: '🌟',
    lines: ['Every world explored. Every boss defeated.', 'The Space Gerbil soars home a hero of the galaxy!'],
    dur: 5600
  }, cb);
}
