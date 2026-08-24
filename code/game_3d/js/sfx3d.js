// ════════════════════════════════════════
// js/sfx3d.js — Web Audio sound effects (synthesized, no external files)
// SFX.gather(), SFX.hit(), SFX.hurt(), SFX.coin(), SFX.win(), etc.
// The AudioContext is created/resumed on the first user gesture.
// ════════════════════════════════════════

const SFX = (function () {
  let ctx = null, master = null, muted = false;

  function ensure() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
  }
  function resume() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); }

  // Single beep with optional pitch slide
  function tone(freq, dur, type, vol, slideTo) {
    if (muted) { return; } ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  // Filtered noise burst (impacts, explosions)
  function noise(dur, vol, hp) {
    if (muted) { return; } ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    const n = ctx.createBufferSource();
    const b = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * dur), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    n.buffer = b;
    const g = ctx.createGain(); g.gain.value = vol || 0.3;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 700;
    n.connect(f); f.connect(g); g.connect(master);
    n.start(t);
  }
  function seq(notes, type, vol) { notes.forEach(([f, at, dur]) => setTimeout(() => tone(f, dur || 0.14, type || 'square', vol || 0.3), at)); }

  return {
    resume,
    setMuted(m) { muted = m; }, isMuted() { return muted; },
    gather() { tone(520, 0.08, 'square', 0.22, 780); },
    fuel() { tone(720, 0.1, 'sine', 0.28, 1200); },
    hit() { tone(220, 0.08, 'square', 0.28, 120); noise(0.05, 0.12); },
    enemyDie() { tone(180, 0.26, 'sawtooth', 0.3, 50); noise(0.22, 0.2, 500); },
    hurt() { tone(320, 0.18, 'sawtooth', 0.34, 90); },
    coin() { tone(880, 0.06, 'square', 0.24, 1320); setTimeout(() => tone(1320, 0.1, 'square', 0.2), 55); },
    build() { tone(300, 0.1, 'square', 0.3, 520); setTimeout(() => tone(620, 0.12, 'square', 0.3), 90); },
    win() { seq([[523, 0, 0.18], [659, 120, 0.18], [784, 240, 0.18], [1047, 360, 0.26]]); },
    powerup() { seq([[400, 0, 0.1], [600, 70, 0.1], [800, 140, 0.1], [1000, 210, 0.14]]); },
    boss() { tone(90, 0.45, 'sawtooth', 0.42, 55); noise(0.32, 0.24, 300); },
    shoot() { tone(640, 0.12, 'square', 0.22, 160); },
    charge() { tone(120, 0.34, 'sawtooth', 0.32, 320); },
    slam() { tone(70, 0.3, 'sawtooth', 0.4, 40); noise(0.28, 0.3, 200); },
    click() { tone(460, 0.05, 'square', 0.18); }
  };
})();

// ── Jukebox: looping procedural background tunes (original) ──────
const MUSIC = (function () {
  let ctx = null, master = null, timer = null, step = 0, curr = -1;
  const TRACKS = [
    { name: 'Starlight',  tempo: 400, vol: 0.16, type: 'sine',     notes: [261.63, 329.63, 392, 523.25, 0, 392, 329.63, 392, 440, 523.25, 659.25, 523.25, 0, 392, 329.63, 293.66] },
    { name: 'Cosmic Jig', tempo: 220, vol: 0.13, type: 'triangle', notes: [523.25, 523.25, 392, 523.25, 659.25, 587.33, 523.25, 0, 440, 523.25, 587.33, 659.25, 784, 659.25, 523.25, 0] },
    { name: 'Nebula',     tempo: 520, vol: 0.15, type: 'sine',     notes: [440, 523.25, 659.25, 587.33, 523.25, 440, 392, 440, 0, 329.63, 392, 440, 523.25, 440, 392, 0] }
  ];
  function ensure() { if (ctx) return; try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); } catch (e) { ctx = null; } }
  function note(freq, dur, type, vol) {
    if (!ctx || freq <= 0) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function tick() {
    const tr = TRACKS[curr]; if (!tr) return;
    if (!(typeof SFX !== 'undefined' && SFX.isMuted && SFX.isMuted())) note(tr.notes[step % tr.notes.length], tr.tempo / 1000 * 0.9, tr.type, tr.vol);
    step++;
  }
  return {
    tracks() { return TRACKS.map(t => t.name); },
    playing() { return curr; },
    play(i) { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); this.stop(); if (i == null || i < 0 || i >= TRACKS.length) return; curr = i; step = 0; timer = setInterval(tick, TRACKS[i].tempo); tick(); },
    stop() { if (timer) { clearInterval(timer); timer = null; } curr = -1; }
  };
})();

function updateMuteBtn() {
  const b = document.getElementById('muteBtn');
  if (b) b.textContent = SFX.isMuted() ? '🔇 Sound' : '🔊 Sound';
}
function toggleMute() {
  const m = !SFX.isMuted();
  SFX.setMuted(m);
  if (typeof save !== 'undefined') { save.muted = m; if (typeof persist === 'function') persist(); }
  if (!m) { SFX.resume(); SFX.click(); }
  updateMuteBtn();
}
// Apply saved mute preference once the save has loaded
function applyMutePref() { if (typeof save !== 'undefined') SFX.setMuted(!!save.muted); updateMuteBtn(); }

// Start audio on the first gesture (browser autoplay policy)
window.addEventListener('pointerdown', () => SFX.resume());
window.addEventListener('keydown', () => SFX.resume());
