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
  document.getElementById('csRocket').textContent = (opts.icon !== undefined) ? opts.icon : '🚀';
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
    else if (scene === 'flyaway') { drawFlyaway(ctx, W, H, f); }
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

// The stowaway gerbil drinks a strange potion and GROWS into the Nuclear
// Gerbil, then lumbers away — a faithful port of the 2D Planet 2 cutscene.
let _fly = null;
function drawFlyaway(ctx, W, H, f) {
  if (f <= 1 || !_fly) _fly = { phase: 'walkin', gx: W / 2 - 340, gy: H * 0.6, gSize: 10, facing: 1, t: 0 };
  const c = _fly; c.t++;
  const cx = W / 2, potionX = cx, potionY = H * 0.6;

  // jungle-night backdrop
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#04140a'); g.addColorStop(0.7, '#06210e'); g.addColorStop(1, '#0a3016');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { const x = (i * 97) % W, y = (i * 53) % (H * 0.4); ctx.globalAlpha = 0.25 + 0.3 * Math.abs(Math.sin(f * 0.04 + i)); ctx.fillStyle = '#bfffd0'; ctx.fillRect(x, y, 2, 2); }
  ctx.globalAlpha = 1;
  const groundY = H * 0.74;
  ctx.fillStyle = '#04160a';
  for (let i = 0; i < 6; i++) { const tx = W * (0.05 + i * 0.18); ctx.beginPath(); ctx.moveTo(tx - 42, groundY); ctx.lineTo(tx, groundY - 170); ctx.lineTo(tx + 42, groundY); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = '#08260f'; ctx.fillRect(0, groundY, W, H - groundY);

  // letterbox bars (2D look)
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, 80);
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, H - 80, W, 80);

  let caption = '', capColor = '#ddd', capBold = false;
  if (c.phase === 'walkin') {
    c.gx += 2.4; c.facing = 1; c.gy = H * 0.6;
    caption = 'A tiny gerbil emerges from the jungle...';
    if (c.gx >= potionX - 30) { c.phase = 'drink'; c.t = 0; }
  }
  else if (c.phase === 'drink') {
    if (!c._drink) { c._drink = true; if (typeof SFX !== 'undefined') SFX.powerup(); }
    c.gy = H * 0.6 + Math.sin(c.t * 0.4) * 3;
    const p = Math.min(1, c.t / 80);
    caption = c.t < 40 ? 'It found a mysterious potion!' : 'Glug glug glug...';
    if (p < 1) { ctx.save(); ctx.translate(potionX + 12, potionY - 34); ctx.scale(1 - p * 0.8, 1 - p * 0.8); ctx.font = '30px serif'; ctx.textAlign = 'center'; ctx.fillText('🧪', 0, 0); ctx.restore(); }
    if (c.t >= 90) { c.phase = 'grow'; c.t = 0; }
  }
  else if (c.phase === 'grow') {
    const target = Math.min(52, 10 + c.t * 0.7);
    c.gSize += (target - c.gSize) * 0.15;
    if (c.t < 40) c.gx += (Math.random() - 0.5) * 4 * 0.3;
    if (c.t >= 26 && c.t <= 34) { ctx.fillStyle = 'rgba(180,0,255,0.30)'; ctx.fillRect(0, 0, W, H); }
    caption = c.t < 20 ? '...' : c.t < 45 ? 'Something is happening!!' : "IT'S GROWING!!!";
    capColor = c.t > 44 ? '#f8f' : '#ddd'; capBold = c.t > 44;
    if (c.t >= 80) { c.phase = 'walkout'; c.t = 0; c.facing = -1; }
  }
  else if (c.phase === 'walkout') {
    c.gx -= 3; c.facing = -1;
    caption = 'The Nuclear Gerbil lumbers away into the darkness...';
    capColor = '#f88'; capBold = true;
  }

  drawCutsceneGerbil(ctx, c);

  ctx.fillStyle = capColor; ctx.font = (capBold ? 'bold ' : '') + '15px Courier New'; ctx.textAlign = 'center';
  ctx.fillText(caption, W / 2, H - 44);
}

// Canvas gerbil, ported from the 2D drawP2Cutscene
function drawCutsceneGerbil(ctx, c) {
  const s = c.gSize, glow = (c.phase === 'grow' && c.t > 30);
  ctx.save();
  ctx.translate(c.gx, c.gy);
  if (c.facing === -1) ctx.scale(-1, 1);
  // body
  ctx.fillStyle = glow ? '#d4a' : '#c8954a';
  ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.75, 0, 0, Math.PI * 2); ctx.fill();
  // head
  ctx.fillStyle = glow ? '#c9a' : '#c8954a';
  ctx.beginPath(); ctx.arc(s * 0.7, -s * 0.2, s * 0.55, 0, Math.PI * 2); ctx.fill();
  // ears
  ctx.fillStyle = '#e8b06a';
  ctx.beginPath(); ctx.ellipse(s * 0.55, -s * 0.7, s * 0.18, s * 0.28, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(s * 0.9, -s * 0.65, s * 0.15, s * 0.25, 0.3, 0, Math.PI * 2); ctx.fill();
  // eye (red + glowing once transformed)
  const evil = (c.phase === 'grow' && c.gSize > 30) || c.phase === 'walkout';
  if (evil) { ctx.shadowColor = '#f00'; ctx.shadowBlur = 8; }
  ctx.fillStyle = evil ? '#f00' : '#222';
  ctx.beginPath(); ctx.arc(s * 0.58, -s * 0.28, s * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  // nose
  ctx.fillStyle = '#d06060';
  ctx.beginPath(); ctx.arc(s * 1.18, -s * 0.18, s * 0.1, 0, Math.PI * 2); ctx.fill();
  // tail
  ctx.strokeStyle = '#a07040'; ctx.lineWidth = Math.max(2, s * 0.12);
  ctx.beginPath(); ctx.moveTo(-s * 0.8, 0); ctx.quadraticCurveTo(-s * 1.3, -s * 0.6, -s * 1.0, -s * 0.9); ctx.stroke();
  // legs
  const swing = Math.sin(c.t * 0.25) * 0.4;
  ctx.lineWidth = Math.max(1.5, s * 0.1);
  ctx.beginPath(); ctx.moveTo(-s * 0.2, s * 0.5); ctx.lineTo(-s * 0.2 + Math.sin(swing) * s * 0.4, s * 0.5 + s * 0.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(s * 0.2, s * 0.5); ctx.lineTo(s * 0.2 + Math.sin(-swing) * s * 0.4, s * 0.5 + s * 0.5); ctx.stroke();
  ctx.restore();
}

// ── The cutscenes ───────────────────────────────────────────────
function playIntroCutscene(cb) {
  showCutscene({
    title: '🚀 SPACE GERBIL ADVENTURE',
    icon: '🧑‍🚀',
    lines: ['You are a lone space explorer, blasting off across the galaxy…',
      'But a curious little gerbil has just snuck aboard your ship! 🐹',
      'Five strange worlds await. Gather fuel and become a legend!'],
    dur: 5400
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

function playEnterPlanet2Cutscene(cb) {
  showCutscene({ title: '', lines: [], icon: '', scene: 'flyaway', dur: 10500 }, cb);
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
