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

  const scene = opts.scene || 'warp';
  const cv = document.getElementById('csCanvas'), ctx = cv.getContext('2d');
  cv.width = cv.clientWidth || window.innerWidth;
  cv.height = cv.clientHeight || window.innerHeight;
  const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
  const stars = [];
  for (let i = 0; i < 180; i++) stars.push({ a: Math.random() * Math.PI * 2, r: Math.random() * W * 0.5, sp: 1 + Math.random() * 3 });
  const night = [];
  for (let i = 0; i < 90; i++) night.push({ x: Math.random() * W, y: Math.random() * H * 0.62, r: Math.random() * 1.5 + 0.3, t: Math.random() * 6 });
  ctx.fillStyle = '#04040e'; ctx.fillRect(0, 0, W, H);
  let f = 0;

  function loop() {
    f++;
    if (scene === 'area51') { drawArea51(ctx, W, H, f, night); }
    else {
      ctx.fillStyle = 'rgba(4,4,14,0.35)'; ctx.fillRect(0, 0, W, H);
      stars.forEach(s => {
        s.r += s.sp * 3;
        if (s.r > W * 0.72) { s.r = 0; s.a = Math.random() * Math.PI * 2; }
        const x = cx + Math.cos(s.a) * s.r, y = cy + Math.sin(s.a) * s.r;
        const x2 = cx + Math.cos(s.a) * (s.r + s.sp * 6), y2 = cy + Math.sin(s.a) * (s.r + s.sp * 6);
        ctx.strokeStyle = 'rgba(180,200,255,' + Math.min(1, s.r / W) + ')';
        ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
      });
    }
    _csRAF = requestAnimationFrame(loop);
  }
  loop();

  _csTimer = setTimeout(() => endCutscene(cb), opts.dur || 3600);
  document.getElementById('csSkip').onclick = () => endCutscene(cb);
}

// Night desert base backdrop: stars, ground, a fence, sweeping searchlights
function drawArea51(ctx, W, H, f, stars) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#04050f'); g.addColorStop(0.6, '#0a1122'); g.addColorStop(1, '#141c30');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // twinkling stars
  stars.forEach(s => { ctx.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(f * 0.03 + s.t)); ctx.fillStyle = '#cdd6ff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.3); ctx.fill(); });
  ctx.globalAlpha = 1;
  const gy = H * 0.72;
  // sweeping searchlights
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const bx = W * (0.22 + 0.28 * i), ang = -Math.PI / 2 + Math.sin(f * 0.012 + i * 2.1) * 0.55, len = H * 0.85, spread = 0.08;
    const grad = ctx.createRadialGradient(bx, gy, 0, bx, gy, len);
    grad.addColorStop(0, 'rgba(170,215,255,0.30)'); grad.addColorStop(1, 'rgba(170,215,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(bx, gy);
    ctx.lineTo(bx + Math.cos(ang - spread) * len, gy + Math.sin(ang - spread) * len);
    ctx.lineTo(bx + Math.cos(ang + spread) * len, gy + Math.sin(ang + spread) * len);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // ground
  ctx.fillStyle = '#0a0d12'; ctx.fillRect(0, gy, W, H - gy);
  // chain-link fence silhouette
  ctx.strokeStyle = 'rgba(90,100,120,0.5)'; ctx.lineWidth = 3;
  for (let x = 10; x < W; x += 26) { ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy - 46); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(0, gy - 46); ctx.lineTo(W, gy - 46); ctx.stroke();
  // little warning sign
  ctx.fillStyle = '#c33'; ctx.fillRect(W * 0.5 - 42, gy - 34, 84, 22);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Courier New'; ctx.textAlign = 'center';
  ctx.fillText('RESTRICTED', W * 0.5, gy - 19);
}

// ── The cutscenes ───────────────────────────────────────────────
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

function playEnterArea51Cutscene(cb) {
  showCutscene({
    title: '🛸 ENTERING AREA 51',
    icon: '🛸',
    lines: ['Nevada desert — 0300 hours.', 'A tiny gerbil slips under the fence into the secret base…',
      'Grab the ⚡ fuel and reach the saucer — don\'t get caught!'],
    scene: 'area51', dur: 5400
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
