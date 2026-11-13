// Spatial focus navigation for TV remotes and controllers. Any visible .btn, .nav-item,
// .game-card or [data-nav] in the active layer (top dialog, else the screen) is reachable
// with the D-pad / stick; ✕/A/Enter clicks it, ○/B goes back, Start = ok.
import { onPad, BTN } from './pads.js';
import { native } from '../lib/native.js';
import { audio } from '../lib/audio.js';

const SEL = '.btn:not([disabled]), .nav-item, .game-card, [data-nav], input.field, .code-boxes input, .toggle-row';
let current = null;
export const nav = { gameMode: false, onStart: null, padBack: true, consume: null };

function scope() {
  const ovs = document.querySelectorAll('.overlay');
  return ovs.length ? ovs[ovs.length - 1] : document.getElementById('ui');
}
function items() {
  const s = scope();
  if (!s) return [];
  return [...s.querySelectorAll(SEL)].filter(el => {
    if (el.closest('.screen.out')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 4 && r.height > 4 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth && getComputedStyle(el).visibility !== 'hidden';
  });
}
function setFocus(el) {
  if (current) current.classList.remove('focus');
  current = el;
  if (el) {
    el.classList.add('focus');
    if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}
function valid(el) { return el && el.isConnected && items().includes(el); }

export function focusFirst() {
  const list = items();
  const pref = list.find(e => e.dataset.autofocus != null) || list.find(e => e.classList.contains('sel')) || list[0];
  setFocus(pref || null);
}

function move(dir) {
  document.body.classList.add('kbd');
  const list = items();
  if (!list.length) return;
  if (!valid(current)) { focusFirst(); return; }
  const a = current.getBoundingClientRect();
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bs = Infinity;
  for (const el of list) {
    if (el === current) continue;
    const b = el.getBoundingClientRect();
    const bx = b.left + b.width / 2, by = b.top + b.height / 2;
    const dx = bx - ax, dy = by - ay;
    let main, side;
    if (dir === 'left') { main = -dx; side = Math.abs(dy); } else if (dir === 'right') { main = dx; side = Math.abs(dy); }
    else if (dir === 'up') { main = -dy; side = Math.abs(dx); } else { main = dy; side = Math.abs(dx); }
    if (main <= 4) continue;
    const score = main + side * 2.2;
    if (score < bs) { bs = score; best = el; }
  }
  if (best) { setFocus(best); audio.play('tick', { volume: 0.5 }); }
}

function activate() {
  document.body.classList.add('kbd');
  if (!valid(current)) { focusFirst(); return; }
  const el = current;
  if (el.tagName === 'INPUT') { el.focus(); return; }
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  el.click();
  // the element may have been replaced by a re-render: keep focus near
  setTimeout(() => { if (!valid(current)) focusFirst(); }, 60);
}

function back() { native.handleBack(); setTimeout(() => { if (!valid(current)) focusFirst(); }, 300); }

// keyboard / TV remote
onPad('key', (k, e) => {
  if (nav.gameMode) { if (k === 'back') { /* handled by native/Escape */ } return; }
  if (k === 'ok') { e.preventDefault(); activate(); }
  else if (k !== 'back') { e.preventDefault(); move(k); }
});
// controllers
onPad('nav', dir => { if (!nav.gameMode) move(dir); });
onPad('press', (p, i) => {
  if (nav.consume?.(p, i)) return;
  if (nav.gameMode) {
    if (i === BTN.START || i === BTN.HOME) nav.onStart?.(p);
    return;
  }
  if (i === BTN.A || i === BTN.START) activate();
  else if (i === BTN.B && nav.padBack) back();
});

// touching the screen hides the focus ring
window.addEventListener('pointerdown', e => { if (e.isTrusted) document.body.classList.remove('kbd'); }, true);
// keep a sensible focus after screen changes
let moT = 0;
new MutationObserver(() => {
  if (nav.gameMode || !document.body.classList.contains('kbd') || moT) return;
  moT = setTimeout(() => { moT = 0; if (!valid(current)) focusFirst(); }, 120);
})
  .observe(document.documentElement, { childList: true, subtree: true });
