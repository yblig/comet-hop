// Screen router: one screen at a time inside #ui, with an enter/leave animation.
import { native } from './lib/native.js';

let current = null;

export function mountRoot() {
  const app = document.getElementById('app');
  app.innerHTML = '<div id="scene"></div><div id="ui"></div>';
}

export const ui = () => document.getElementById('ui');
export const sceneEl = () => document.getElementById('scene');

// screen = function(root) → optional cleanup function
export function go(screen, ...args) {
  const prev = current;
  if (prev) {
    prev.cleanup?.();
    prev.offBack?.();
    const old = prev.el;
    old.classList.add('out');
    old.style.pointerEvents = 'none';
    setTimeout(() => old.remove(), 200);
  }
  const el = document.createElement('div');
  el.className = 'screen';
  ui().append(el);
  current = { el };
  const cleanup = screen(el, ...args);
  if (current.el === el) current.cleanup = cleanup;
  return el;
}

// Per-screen back handler, removed automatically when the screen changes.
export function onScreenBack(fn) {
  if (!current) return;
  current.offBack?.();
  current.offBack = native.onBack(fn);
}
