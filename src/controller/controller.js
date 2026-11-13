// Controller side: join screen + a gamepad whose layout the host chooses.
import { h, btn, avatar, svgEl, ICONS, SHAPES, toast, confirmBox } from '../ui/dom.js';
import { go, onScreenBack } from '../app.js';
import { ClientNet } from '../net/net.js';
import { audio } from '../lib/audio.js';
import { haptics } from '../lib/haptics.js';
import { prefs } from '../state.js';

export function joinScreen(root, presetCode = '', error = '') {
  audio.playMusic('music_lobby');
  root.style.padding = '0';
  root.append(h('div', { class: 'party-bg' }, h('div', { class: 'confetti-dots' })));
  const wrap = h('div', { class: 'screen', style: { animation: 'none' } });
  root.append(wrap);
  const name = h('input', { class: 'field', maxlength: 12, placeholder: 'Nama kamu', value: prefs.name, autocomplete: 'off', enterkeyhint: 'next' });
  const boxes = [0, 1, 2, 3].map(i => h('input', { maxlength: 1, inputmode: 'text', autocapitalize: 'characters', autocomplete: 'off', value: (presetCode || '')[i] || '' }));
  boxes.forEach((b, i) => {
    b.addEventListener('input', () => {
      b.value = b.value.replace(/[^a-z]/gi, '').toUpperCase().slice(-1);
      if (b.value) { audio.play('tick'); if (i < 3) boxes[i + 1].focus(); else { b.blur(); } }
    });
    b.addEventListener('keydown', e => { if (e.key === 'Backspace' && !b.value && i > 0) boxes[i - 1].focus(); if (e.key === 'Enter') join(); });
    b.addEventListener('focus', () => b.select());
  });
  const err = h('div', { style: { color: 'var(--red)', minHeight: '22px', fontSize: '16px', textAlign: 'center' } }, error);
  const joinBtn = btn('GABUNG', 'green', () => join(), { icon: 'play', sound: 'confirm' });
  const join = () => {
    const code = boxes.map(b => b.value).join('').toUpperCase();
    if (code.length < 4) { err.textContent = 'Kode room harus 4 huruf.'; audio.play('wrong'); haptics.error(); boxes.find(b => !b.value)?.focus(); return; }
    prefs.name = name.value.trim();
    prefs.lastCode = code;
    document.activeElement?.blur();
    go(padScreen, code);
  };
  wrap.append(
    h('div', { class: 'topbar' }, btn(null, 'dark round', () => backHome(), { icon: 'back', sound: 'back' }), h('h2', { class: 'title-m' }, 'Jadi Controller')),
    h('div', { class: 'grow center' },
      h('div', { class: 'card col', style: { padding: '18px 24px', width: 'min(560px, 92vw)', alignItems: 'stretch' } },
        h('div', { class: 'dim' }, 'Nama'), name,
        h('div', { class: 'dim', style: { marginTop: '4px' } }, 'Kode room (lihat di HP layar)'),
        h('div', { class: 'code-boxes' }, boxes), err,
        h('div', { class: 'center' }, joinBtn))));
  onScreenBack(() => { backHome(); return true; });
  if (!presetCode) setTimeout(() => (name.value ? boxes[0] : name).focus(), 350);
}

function backHome() { import('../screens/home.js').then(m => go(m.homeScreen)); }

// ---------------------------------------------------------------------------- pad
function padScreen(root, code) {
  root.style.padding = '0';
  root.style.background = 'radial-gradient(120% 100% at 50% 0%, #2b1c66, #0d0824)';
  const net = new ClientNet();
  const st = { slot: -1, color: '#8a5cff', name: prefs.name || 'Pemain', layout: null, input: { x: 0, y: 0, gas: false, brake: false, l: false, r: false, a: false, b: false, steer: 0 } };
  let alive = true, leaving = false;
  const ctrl = h('div', { class: 'ctrl' });
  const who = h('div', { class: 'who' }, 'Menyambung…');
  const ping = h('div', { class: 'ping' });
  const avWrap = h('div', {});
  const top = h('div', { class: 'ctrl-top' }, avWrap, h('div', { class: 'grow' }, who, ping),
    btn(null, 'dark round small', () => leave(), { icon: 'close', sound: 'back' }));
  const body = h('div', { class: 'ctrl-body' });
  ctrl.append(top, body);
  root.append(ctrl);
  message(body, 'spin', 'Menyambung ke room ' + code + '…', 'Pastikan HP layar sudah membuka lobby.');

  const send = m => net.send(m);
  let lastSent = '';
  const sendInput = force => {
    const s = JSON.stringify(st.input);
    if (force || s !== lastSent) { lastSent = s; send({ t: 'in', s: st.input }); }
  };
  const keepalive = setInterval(() => { if (st.slot >= 0) sendInput(true); }, 90);
  const pinger = setInterval(() => send({ t: 'ping', ts: performance.now() }), 2000);

  net.on('open', () => { send({ t: 'hello', name: st.name, id: prefs.clientId }); audio.play('join'); haptics.success(); });
  net.on('error', msg => { if (!alive) return; alive = false; cleanup(); go(joinScreen, code, msg); });
  net.on('close', () => {
    if (!alive || leaving) return;
    alive = false; cleanup();
    toast('Koneksi ke layar terputus');
    go(joinScreen, code, 'Terputus dari room. Tekan GABUNG untuk masuk lagi.');
  });
  net.on('msg', m => {
    switch (m.t) {
      case 'welcome':
        st.slot = m.slot; st.color = m.color; st.name = m.name;
        avWrap.innerHTML = ''; avWrap.append(avatar(m.color));
        who.textContent = `${m.name} · P${m.slot + 1}`;
        who.style.color = m.color;
        ctrl.style.setProperty('--pc', m.color);
        break;
      case 'layout': applyLayout(m.l, m.data || {}); break;
      case 'buzz': haptics[m.k]?.(); if (m.k === 'heavy' || m.k === 'error') body.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 160 }); break;
      case 'quiz': quizMsg?.(m); break;
      case 'pong': ping.textContent = `sinyal ${Math.round(performance.now() - m.ts)} ms`; break;
      case 'full': alive = false; cleanup(); go(joinScreen, code, 'Room penuh (maks. 4 pemain). Minta host mengeluarkan pemain yang tidak main.'); break;
      case 'bye': alive = false; cleanup(); go(joinScreen, '', 'Host menutup room.'); break;
      case 'kicked': alive = false; cleanup(); go(joinScreen, code, 'Kamu dikeluarkan dari room oleh host.'); break;
    }
  });
  net.connect(code);

  let quizMsg = null, layoutCleanup = null;
  const resetInput = () => { Object.assign(st.input, { x: 0, y: 0, gas: false, brake: false, l: false, r: false, a: false, b: false, steer: 0 }); sendInput(true); };

  function applyLayout(l, data) {
    if (st.layout === l && !['results', 'lobby', 'menu', 'wait', 'secret', 'vote', 'score', 'sound', 'buttons', 'pad'].includes(l)) return;
    st.layout = l;
    layoutCleanup?.(); layoutCleanup = null; quizMsg = null;
    resetInput();
    body.innerHTML = '';
    body.className = 'ctrl-body';
    const L = LAYOUTS[l] || LAYOUTS.lobby;
    layoutCleanup = L(body, data, { st, send, sendInput, setQuiz: f => (quizMsg = f) });
  }

  function cleanup() {
    clearInterval(keepalive); clearInterval(pinger);
    layoutCleanup?.();
    net.close(true);
  }
  function leave() {
    confirmBox('Keluar dari room?', 'Kamu bisa gabung lagi pakai kode yang sama.', 'Keluar', () => {
      leaving = true; alive = false; cleanup(); go(joinScreen, code);
    });
  }
  onScreenBack(() => { leave(); return true; });
  return () => { if (alive) { alive = false; cleanup(); } };
}

function message(body, art, title, sub, color) {
  body.innerHTML = '';
  const a = art === 'spin' ? h('div', { class: 'spin' }) : avatar(color || '#8a5cff', art);
  body.append(h('div', { class: 'ctrl-msg' }, a, h('h2', { class: 'title-m' }, title), sub ? h('p', {}, sub) : null));
}

// Hold-style button that reports pressed state.
function holdBtn(cls, inner, onChange) {
  const b = h('div', { class: 'cbtn ' + cls });
  if (typeof inner === 'string' && inner.startsWith('<svg')) b.append(svgEl(inner)); else if (inner) b.append(inner);
  const pts = new Set();
  const set = () => { const on = pts.size > 0; b.classList.toggle('down', on); onChange(on); };
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); pts.add(e.pointerId); haptics.tap(); set(); });
  const up = e => { if (pts.delete(e.pointerId)) set(); };
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
  return b;
}
// Tap-style button.
function tapBtn(cls, inner, onTap, label) {
  const b = holdBtn(cls, inner, on => { if (on) { audio.play('tap'); onTap(); } });
  if (label) b.append(h('small', {}, label));
  return b;
}

function joystick(onMove) {
  const j = h('div', { class: 'joy' });
  const knob = h('div', { class: 'knob' });
  j.append(knob);
  let id = null;
  const move = e => {
    const r = j.getBoundingClientRect();
    let x = (e.clientX - r.left - r.width / 2) / (r.width * 0.36), y = (e.clientY - r.top - r.height / 2) / (r.height * 0.36);
    const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    knob.style.transform = `translate(${x * r.width * 0.32}px, ${y * r.height * 0.32}px)`;
    onMove(+x.toFixed(2), +y.toFixed(2));
  };
  j.addEventListener('pointerdown', e => { e.preventDefault(); id = e.pointerId; j.setPointerCapture?.(id); haptics.tap(); move(e); });
  j.addEventListener('pointermove', e => { if (e.pointerId === id) move(e); });
  const end = e => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; onMove(0, 0); };
  j.addEventListener('pointerup', end); j.addEventListener('pointercancel', end);
  return j;
}

// ---------------------------------------------------------------------------- layouts
const LAYOUTS = {
  lobby(body, d, { st, send }) {
    const a = avatar(st.color);
    const wave = tapBtn('', ICONS.wave, () => { send({ t: 'wiggle' }); a.animate([{ transform: 'scale(1.3,.7)' }, { transform: 'scale(.9,1.2) translateY(-20px)' }, { transform: 'none' }], { duration: 420 }); }, 'Sapa');
    wave.style.width = 'min(26vh, 150px)'; wave.style.height = 'min(26vh, 150px)'; wave.style.borderRadius = '50%';
    body.append(h('div', { class: 'ctrl-msg' }, a, h('h2', { class: 'title-m' }, 'Kamu sudah masuk!'),
      h('p', {}, d.vip ? `${d.vip} sedang memilih game (${d.game})…` : 'Menunggu game dimulai…')), h('div', { class: 'center' }, wave));
  },

  menu(body, d, { send }) {
    const nav = k => send({ t: 'nav', k });
    const pad = h('div', { class: 'dpad' },
      h('div'), tapBtn('', ICONS.up, () => nav('up')), h('div'),
      tapBtn('', ICONS.left, () => nav('left')), tapBtn('gas', ICONS.check, () => nav('ok')), tapBtn('', ICONS.right, () => nav('right')),
      h('div'), tapBtn('', ICONS.down, () => nav('down')), h('div'));
    const ok = tapBtn('gas', null, () => nav('ok'));
    ok.append('MAIN!', h('small', {}, d.game || ''));
    ok.style.width = 'min(40vw, 260px)'; ok.style.height = 'min(48vh, 220px)';
    body.append(h('div', { class: 'pad' }, pad),
      h('div', { class: 'pad', style: { flexDirection: 'column' } }, h('h2', { class: 'title-m' }, 'Kamu yang pilih game!'), h('p', { class: 'dim', style: { margin: 0 } }, '◀ ▶ ganti game · tekan MAIN'), ok));
  },

  kart(body, d, { st, sendInput }) {
    const set = (k, v) => { st.input[k] = v; sendInput(); };
    let tiltOn = prefs.tilt;
    const left = holdBtn('', ICONS.left, on => { st.input.l = on; if (!tiltOn) { st.input.steer = (st.input.r ? 1 : 0) - (on ? 1 : 0); } sendInput(); });
    const right = holdBtn('', ICONS.right, on => { st.input.r = on; if (!tiltOn) { st.input.steer = (on ? 1 : 0) - (st.input.l ? 1 : 0); } sendInput(); });
    [left, right].forEach(b => { b.style.flex = '1'; b.style.height = '100%'; });
    const steerPad = h('div', { class: 'pad', style: { alignItems: 'stretch' } }, left, right);
    const tiltInfo = h('div', { class: 'ctrl-msg', style: { gap: '8px' } }, svgEl(ICONS.tilt), h('h2', { class: 'title-m' }, 'Miringkan HP'), h('p', {}, 'seperti setir'));
    tiltInfo.querySelector('svg').style.width = '70px';
    const gas = holdBtn('gas', null, on => set('gas', on)); gas.append('GAS');
    const brake = holdBtn('brake', null, on => set('brake', on)); brake.append('REM', h('small', {}, '/ mundur'));
    gas.style.flex = '1.5'; brake.style.flex = '1';
    const pedals = h('div', { class: 'pad', style: { flexDirection: 'column', alignItems: 'stretch' } }, gas, brake);
    const toggle = btn(tiltOn ? 'Mode tombol' : 'Mode miring', 'dark small', () => {
      tiltOn = !tiltOn; prefs.tilt = tiltOn; toggle.lastChild.textContent = tiltOn ? 'Mode tombol' : 'Mode miring';
      st.input.steer = 0; sendInput(); render(); if (tiltOn) askTilt();
    }, { icon: 'tilt' });
    toggle.style.position = 'absolute'; toggle.style.left = '50%'; toggle.style.bottom = 'calc(10px + var(--sab))'; toggle.style.transform = 'translateX(-50%)';
    const render = () => { body.innerHTML = ''; body.append(tiltOn ? tiltInfo : steerPad, pedals, toggle); };
    const onTilt = e => {
      if (!tiltOn) return;
      // landscape: beta tilts left/right relative to the screen
      const angle = (screen.orientation?.angle ?? window.orientation ?? 90);
      let v = (e.beta || 0) / 28;
      if (angle === 270 || angle === -90) v = -v;
      v = Math.max(-1, Math.min(1, v));
      if (Math.abs(v) < 0.08) v = 0;
      const q = Math.round(v * 20) / 20;
      if (q !== st.input.steer) { st.input.steer = q; sendInput(); }
    };
    const askTilt = () => { try { DeviceOrientationEvent?.requestPermission?.(); } catch { /* android: not needed */ } };
    window.addEventListener('deviceorientation', onTilt);
    render();
    return () => window.removeEventListener('deviceorientation', onTilt);
  },

  sumo(body, d, { st, sendInput }) {
    const joy = joystick((x, y) => { st.input.x = x; st.input.y = y; sendInput(); });
    const dash = holdBtn('dash', null, on => { st.input.a = on; sendInput(); if (on) audio.play('tap'); });
    dash.append('DASH');
    dash.style.width = 'min(44vh, 40vw)'; dash.style.height = 'min(44vh, 40vw)';
    body.append(h('div', { class: 'pad' }, joy), h('div', { class: 'pad', style: { flexDirection: 'column' } }, dash, h('div', { class: 'mini' }, 'Seruduk lawan keluar arena!')));
  },

  quiz(body, d, { send, setQuiz }) {
    let picked = -1, open = true;
    const status = h('div', { class: 'title-m', style: { textAlign: 'center' } }, 'Pilih jawaban!');
    const bs = [0, 1, 2, 3].map(i => {
      const b = tapBtn('q' + i, SHAPES[i], () => {
        if (!open || picked >= 0) return;
        picked = i; send({ t: 'ans', i });
        bs.forEach((x, k) => x.classList.toggle(k === i ? 'picked' : 'dim', true));
        status.textContent = 'Terkunci! Tunggu yang lain…';
      });
      b.querySelector('svg').classList.remove('shape');
      return b;
    });
    const grid = h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', flex: 1 } }, bs);
    body.style.flexDirection = 'column';
    body.append(status, grid);
    setQuiz(m => {
      if (m.phase === 'q') {
        picked = -1; open = true; status.textContent = `Soal ${m.n}: pilih jawaban!`; body.className = 'ctrl-body';
        bs.forEach(x => x.classList.remove('picked', 'dim'));
      } else if (m.phase === 'reveal') {
        open = false;
        if (m.right) { status.textContent = `Benar! +${m.pts}`; body.classList.add('flash-ok'); audio.play('correct'); haptics.success(); }
        else { status.textContent = picked < 0 ? 'Waktu habis!' : 'Salah…'; body.classList.add('flash-bad'); audio.play('wrong'); haptics.error(); }
        bs.forEach((x, k) => { x.classList.toggle('dim', k !== m.correct); x.classList.toggle('picked', k === m.correct); });
      }
    });
  },


  // generic joystick + up to two action buttons (most 2D games)
  pad(body, d, { st, sendInput }) {
    const joy = joystick((x, y) => { st.input.x = x; st.input.y = y; st.input.steer = x; st.input.l = x < -0.3; st.input.r = x > 0.3; sendInput(); });
    const right = h('div', { class: 'pad', style: { flexDirection: 'column', gap: '14px' } });
    if (d.a) { const a = holdBtn('dash', null, on => { st.input.a = on; st.input.gas = on; sendInput(); }); a.append(d.a); a.style.width = d.b ? 'min(30vh, 30vw)' : 'min(44vh, 40vw)'; a.style.height = a.style.width; right.append(a); }
    if (d.b) { const b = holdBtn('', null, on => { st.input.b = on; st.input.brake = on; sendInput(); }); b.append(d.b); b.style.width = 'min(26vh, 26vw)'; b.style.height = b.style.width; b.style.borderRadius = '50%'; right.append(b); }
    right.append(h('div', { class: 'mini' }, d.hint || d.game || ''));
    body.append(h('div', { class: 'pad' }, joy), right);
  },

  // one or two big buttons (mash games, reflex, buzzer)
  buttons(body, d, { st, sendInput }) {
    const mk = (label, key, cls) => { const b = holdBtn(cls, null, on => { st.input[key] = on; if (key === 'a') st.input.gas = on; sendInput(); }); b.append(label); b.style.flex = '1'; b.style.height = '100%'; b.style.fontSize = 'clamp(26px, 9vh, 56px)'; return b; };
    const wrap = h('div', { class: 'pad', style: { alignItems: 'stretch', gap: '18px' } });
    if (d.b) wrap.append(mk(d.b, 'b', ''));
    wrap.append(mk(d.a || 'TEKAN', 'a', 'gas'));
    body.style.flexDirection = 'column';
    body.append(h('div', { class: 'mini', style: { textAlign: 'center' } }, d.hint || ''), wrap);
  },

  vote(body, d, { send }) {
    const cols = ['gas', 'brake', 'q1', 'q2', 'q3'];
    let mine = -1;
    const bs = (d.opts || []).map((o, i) => { const b = tapBtn(cols[i % 5], null, () => { mine = i; send({ t: 'vote', i }); bs.forEach((x, k) => x.classList.toggle('picked', k === mine)); haptics.success(); }); b.append(o); b.style.flex = '1'; b.style.fontSize = 'clamp(16px, 6vh, 32px)'; return b; });
    body.style.flexDirection = 'column';
    body.append(h('div', { class: 'title-m', style: { textAlign: 'center' } }, 'Pilih jawabanmu!'), h('div', { class: 'pad', style: { alignItems: 'stretch', flexWrap: 'wrap' } }, bs));
  },

  draw(body, d, { st, send }) {
    const cv = h('canvas', { class: 'drawcanvas' });
    const palette = ['#0b0720', st.color, '#ff4d6d', '#3ab0ff', '#ffc93c', '#3ddc84', '#8a5cff', '#ffffff'];
    let col = st.color, w = 8, pts = [], startNew = true, last = 0;
    const tools = h('div', { class: 'col', style: { gap: '8px', justifyContent: 'center' } },
      ...palette.map(c => { const b = h('div', { style: { width: '40px', height: '40px', borderRadius: '50%', background: c, border: '4px solid #fff', boxShadow: '0 0 0 3px #0b0720' } }); b.addEventListener('pointerdown', () => { col = c; w = c === '#ffffff' ? 30 : 8; haptics.tap(); }); return b; }),
      btn(null, 'dark round small', () => send({ t: 'clear' }), { icon: 'close' }));
    const fit = () => { const r = body.getBoundingClientRect(); const ww = Math.max(100, r.width - 80), hh = Math.max(80, r.height - 10); const s = Math.min(ww / 16, hh / 9); cv.width = 16 * s; cv.height = 9 * s; cv.style.width = cv.width + 'px'; cv.style.height = cv.height + 'px'; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); };
    const flush = () => { if (!pts.length) return; send({ t: 'draw', p: pts, c: col, w, s: startNew }); startNew = false; pts = pts.slice(-2); };
    let prev = null;
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); startNew = true; pts = []; prev = null; add(e); });
    cv.addEventListener('pointermove', e => { if (e.buttons || e.pressure > 0) add(e); });
    cv.addEventListener('pointerup', () => { flush(); prev = null; });
    function add(e) {
      const r = cv.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      const c = cv.getContext('2d'); c.strokeStyle = col; c.lineWidth = w * cv.width / 1280 * 1.4; c.lineCap = 'round';
      if (prev) { c.beginPath(); c.moveTo(prev[0] * cv.width, prev[1] * cv.height); c.lineTo(x * cv.width, y * cv.height); c.stroke(); }
      prev = [x, y]; pts.push(+x.toFixed(4), +y.toFixed(4));
      if (performance.now() - last > 50) { last = performance.now(); flush(); }
    }
    body.append(tools, h('div', { class: 'pad' }, cv));
    setTimeout(fit, 30);
    addEventListener('resize', fit);
    return () => removeEventListener('resize', fit);
  },

  text(body, d, { send }) {
    const inp = h('input', { class: 'field', maxlength: 80, placeholder: 'Tulis pesan untuk layar…' });
    const go = () => { const v = inp.value.trim(); if (!v) return; send({ t: 'text', v }); inp.value = ''; haptics.success(); toast('Terkirim ke layar!'); };
    inp.addEventListener('keydown', e => e.key === 'Enter' && go());
    body.style.flexDirection = 'column'; body.style.justifyContent = 'center';
    body.append(h('h2', { class: 'title-m', style: { textAlign: 'center' } }, 'Teks Berjalan'), inp, h('div', { class: 'center' }, btn('KIRIM', 'pink', go, { icon: 'play' })));
  },

  emoji(body, d, { send }) {
    const E = ['😂', '😍', '👏', '🔥', '😱', '🤣', '😎', '🥳', '💯', '❤️', '👍', '😭'];
    const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', flex: 1 } }, E.map(e => { const b = tapBtn('', null, () => send({ t: 'emoji', v: e })); b.append(e); b.style.fontSize = 'clamp(28px, 10vh, 54px)'; b.style.background = 'linear-gradient(#3a2c86,#241656)'; return b; }));
    body.append(grid);
  },

  sound(body, d, { send }) {
    const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', flex: 1 } }, (d.items || []).map((s, i) => { const b = tapBtn(i % 2 ? '' : 'q0', null, () => send({ t: 'sound', i })); b.append(s); b.style.fontSize = 'clamp(13px, 4vh, 20px)'; return b; }));
    body.append(grid);
  },

  score(body, d, { send }) {
    const cols = ['q0', 'q1', 'q2', 'q3'];
    const grid = h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${d.teams || 2}, 1fr)`, gap: '12px', flex: 1 } });
    for (let i = 0; i < (d.teams || 2); i++) {
      const plus = tapBtn(cols[i], null, () => send({ t: 'score', i, d: 1 })); plus.append(`TIM ${'ABCD'[i]}`, h('small', {}, '+1')); plus.style.flex = '1';
      const minus = tapBtn('', null, () => send({ t: 'score', i, d: -1 })); minus.append('−1'); minus.style.height = '60px';
      grid.append(h('div', { class: 'col', style: { gap: '8px' } }, plus, minus));
    }
    body.append(grid);
  },

  secret(body, d, { st }) {
    message(body, 'cool', d.title || '', d.sub || '', st.color);
    body.querySelector('h2').style.fontSize = 'clamp(36px, 14vh, 80px)';
  },

  wait(body, d, { st }) { message(body, 'happy', d.title || 'Tunggu sebentar…', d.sub || 'Lihat layar utama', st.color); },

  results(body, d, { st, send }) {
    const r = d.rank || 0;
    const titles = ['', 'JUARA 1! 🏆', 'Juara 2!', 'Juara 3!', 'Juara 4'];
    message(body, r === 1 ? 'cool' : r === 4 ? 'sleep' : 'happy', titles[r] || 'Selesai!', d.label || '', st.color);
    if (r === 1) { audio.play('win'); haptics.success(); }
    if (d.vip) {
      const ok = tapBtn('gas', null, () => send({ t: 'nav', k: 'ok' }));
      ok.append('LANJUT'); ok.style.width = 'min(36vw,240px)'; ok.style.height = 'min(34vh,160px)';
      body.append(h('div', { class: 'center' }, ok));
    }
  }
};
