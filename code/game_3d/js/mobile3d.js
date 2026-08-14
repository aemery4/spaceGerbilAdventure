// ════════════════════════════════════════
// js/mobile3d.js — Touch controls + mobile layout/perf
// On touch devices: a virtual joystick drives movement, an action button
// gathers/attacks/interacts, the layout fills the screen, and rendering
// quality is dialled down. Desktop is completely unaffected.
// ════════════════════════════════════════

const IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

function initMobile() {
  if (!IS_TOUCH) return;
  document.body.classList.add('touch');
  buildTouchControls();
  const resize = () => { if (typeof onResize === 'function') onResize(); };
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 250));
  setTimeout(resize, 100);
}

function buildTouchControls() {
  const wrap = document.getElementById('view3d');
  if (!wrap) return;

  // ── Virtual joystick (bottom-left) ──
  const base = document.createElement('div'); base.id = 'joyBase';
  const knob = document.createElement('div'); knob.id = 'joyKnob';
  base.appendChild(knob); wrap.appendChild(base);

  const R = 46; // max knob travel (px)
  let active = false, cx = 0, cy = 0, touchId = null;

  function setKnob(dx, dy) { knob.style.transform = `translate(${dx}px, ${dy}px)`; }
  function begin(t) {
    const r = base.getBoundingClientRect();
    cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    active = true; touchId = t.identifier;
  }
  function update(t) {
    let dx = t.clientX - cx, dy = t.clientY - cy;
    const d = Math.hypot(dx, dy) || 0.0001;
    const clamped = Math.min(d, R);
    const ux = dx / d, uy = dy / d;
    setKnob(ux * clamped, uy * clamped);
    const mag = clamped / R;               // 0..1 push strength
    E.moveVec = { x: ux * mag, z: uy * mag }; // screen-right = +X, screen-up = -Z (matches W)
  }
  function end() { active = false; touchId = null; setKnob(0, 0); E.moveVec = { x: 0, z: 0 }; }

  base.addEventListener('touchstart', e => { begin(e.changedTouches[0]); update(e.changedTouches[0]); e.preventDefault(); }, { passive: false });
  base.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) if (t.identifier === touchId) { update(t); e.preventDefault(); break; }
  }, { passive: false });
  base.addEventListener('touchend', e => {
    for (const t of e.changedTouches) if (t.identifier === touchId) { end(); e.preventDefault(); break; }
  }, { passive: false });
  base.addEventListener('touchcancel', end);

  // ── Action button (bottom-right): gather / attack / interact ──
  const act = document.createElement('div'); act.id = 'touchAct'; act.textContent = '⚔️';
  wrap.appendChild(act);
  let holdTimer = null;
  const doAct = () => { if (typeof doAttack === 'function' && !gamePaused) doAttack(null); };
  act.addEventListener('touchstart', e => {
    doAct(); act.classList.add('pressed');
    clearInterval(holdTimer); holdTimer = setInterval(doAct, 260);
    e.preventDefault();
  }, { passive: false });
  const releaseAct = e => { clearInterval(holdTimer); holdTimer = null; act.classList.remove('pressed'); if (e) e.preventDefault(); };
  act.addEventListener('touchend', releaseAct, { passive: false });
  act.addEventListener('touchcancel', releaseAct);

  // ── Jump-to-menu safety: stop the joystick when a modal opens (pause) ──
}

window.addEventListener('DOMContentLoaded', initMobile);
