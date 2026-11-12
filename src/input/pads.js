// Physical controllers (PS3/PS4/Xbox/generic) + TV remote keys.
// Sources: native bridge (MainActivity → window.__padEvent), the browser Gamepad API
// (fallback / desktop testing) and the keyboard (TV remote D-pad, arrows, Enter, Esc).
// Button indexes follow the W3C standard layout:
//   0 ✕/A  1 ○/B  2 □/X  3 △/Y  4 L1  5 R1  6 L2  7 R2  8 Select  9 Start
//   10 L3  11 R3  12 Up  13 Down  14 Left  15 Right  16 PS/Home
export const BTN = { A: 0, B: 1, X: 2, Y: 3, L1: 4, R1: 5, L2: 6, R2: 7, SELECT: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15, HOME: 16 };

const pads = new Map();      // id -> { id, name, b (bitmask), a: [lx,ly,rx,ry,lt,rt], src, seen }
const listeners = {};
let nativeSeen = false;
export const env = { tv: false };

function emit(e, ...a) { (listeners[e] || []).forEach(f => { try { f(...a); } catch (err) { console.error(err); } }); }
export function onPad(e, f) { (listeners[e] ||= []).push(f); return () => { listeners[e] = listeners[e].filter(x => x !== f); }; }

function upsert(id, name, src) {
  let p = pads.get(id);
  if (!p) { p = { id, name: cleanName(name), b: 0, a: [0, 0, 0, 0, 0, 0], src, seen: performance.now() }; pads.set(id, p); emit('add', p); }
  return p;
}
function cleanName(n) {
  n = String(n || 'Stik');
  if (/sony|playstation|ps3|sixaxis|dualshock|ps4|wireless controller/i.test(n)) return 'Stik PS';
  if (/xbox|microsoft/i.test(n)) return 'Stik Xbox';
  return n.length > 16 ? n.slice(0, 16) : n;
}
function setState(p, b, a) {
  const prev = p.b;
  p.b = b; p.a = a; p.seen = performance.now();
  const down = b & ~prev;
  if (down) for (let i = 0; i < 17; i++) if (down & (1 << i)) emit('press', p, i);
}

// ---------------------------------------------------------------- native bridge
window.__padEvent = ev => {
  nativeSeen = true;
  if (ev.type === 'list') {
    if (ev.tv && !env.tv) { env.tv = true; emit('tv'); }
    const ids = new Set(ev.pads.map(x => 'n' + x.id));
    ev.pads.forEach(x => upsert('n' + x.id, x.name, 'native'));
    for (const [id, p] of pads) if (p.src === 'native' && !ids.has(id)) { pads.delete(id); emit('remove', p); }
  } else if (ev.type === 'state') {
    const p = upsert('n' + ev.id, ev.name, 'native');
    setState(p, ev.b, ev.a);
  }
};

// ---------------------------------------------------------------- web Gamepad API (fallback)
function pollWeb() {
  if (nativeSeen || !navigator.getGamepads) return;
  const list = [...navigator.getGamepads()].filter(Boolean);
  const live = new Set();
  for (const g of list) {
    const id = 'w' + g.index;
    live.add(id);
    const p = upsert(id, g.id, 'web');
    let b = 0;
    g.buttons.forEach((x, i) => { if (i < 17 && (x.pressed || x.value > 0.5)) b |= 1 << i; });
    const ax = i => { const v = g.axes[i] || 0; return Math.abs(v) > 0.15 ? v : 0; };
    setState(p, b, [ax(0), ax(1), ax(2), ax(3), g.buttons[6]?.value || 0, g.buttons[7]?.value || 0]);
  }
  for (const [id, p] of pads) if (p.src === 'web' && !live.has(id)) { pads.delete(id); emit('remove', p); }
}
window.addEventListener('gamepadconnected', pollWeb);
window.addEventListener('gamepaddisconnected', pollWeb);

// ---------------------------------------------------------------- per-frame tick
// Generates menu navigation events (with key-repeat) from every pad.
const repeat = new Map();
function tick() {
  pollWeb();
  const now = performance.now();
  for (const p of pads.values()) {
    const dir = padDir(p);
    const r = repeat.get(p.id) || { dir: null, next: 0 };
    if (dir && (dir !== r.dir || now >= r.next)) {
      emit('nav', dir, p);
      r.next = now + (dir === r.dir ? 130 : 380);
    }
    r.dir = dir;
    repeat.set(p.id, r);
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

export function padDir(p) {
  const b = p.b, [lx, ly] = p.a;
  if (b & (1 << 12) || ly < -0.6) return 'up';
  if (b & (1 << 13) || ly > 0.6) return 'down';
  if (b & (1 << 14) || lx < -0.6) return 'left';
  if (b & (1 << 15) || lx > 0.6) return 'right';
  return null;
}
export const held = (p, i) => !!(p.b & (1 << i));
export function stick(p) {
  let x = p.a[0], y = p.a[1];
  if (held(p, 14)) x = -1; else if (held(p, 15)) x = 1;
  if (held(p, 12)) y = -1; else if (held(p, 13)) y = 1;
  const m = Math.hypot(x, y);
  if (m > 1) { x /= m; y /= m; }
  return { x, y };
}
export function listPads() { return [...pads.values()]; }

// Converts a pad into the generic player input every game reads.
export function padInput(p) {
  const { x, y } = stick(p);
  const cross = held(p, 0), circle = held(p, 1), square = held(p, 2), tri = held(p, 3);
  return {
    x: +x.toFixed(2), y: +y.toFixed(2), steer: +x.toFixed(2),
    l: x < -0.3, r: x > 0.3,
    gas: cross || held(p, 7) || p.a[5] > 0.3,
    brake: square || held(p, 6) || p.a[4] > 0.3,
    a: cross || held(p, 5), b: circle || square || held(p, 4),
    k: [tri, circle, cross, square]   // quiz-style answer buttons △ ○ ✕ □
  };
}

// ---------------------------------------------------------------- keyboard / TV remote
const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'ok', NumpadEnter: 'ok', ' ': 'ok', Escape: 'back', Backspace: 'back', GoBack: 'back', BrowserBack: 'back' };
window.addEventListener('keydown', e => {
  const t = e.target;
  const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
  const k = KEYMAP[e.key];
  if (!k) return;
  if (typing && k !== 'back' && k !== 'up' && k !== 'down') return;
  if (typing && (k === 'up' || k === 'down')) t.blur();
  emit('key', k, e);
});
