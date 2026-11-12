// Small DOM toolkit: element builder, buttons with sound+haptics, toast, dialogs, art.
import { audio } from '../lib/audio.js';
import { haptics } from '../lib/haptics.js';
import { native } from '../lib/native.js';

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}

export function btn(label, cls = '', onClick, { sound = 'tap', icon = null } = {}) {
  const b = h('button', { class: 'btn ' + cls, type: 'button' });
  if (icon) b.append(svgEl(ICONS[icon] || icon));
  if (label) b.append(typeof label === 'string' ? document.createTextNode(label) : label);
  b.addEventListener('pointerdown', () => { audio.play(sound); haptics.tap(); });
  b.addEventListener('click', e => { e.preventDefault(); onClick?.(e); });
  return b;
}

export function svgEl(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild;
}

export function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = h('div', { class: 'toast' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}
native.toast = msg => toast(msg === 'Press back again to exit' ? 'Tekan kembali sekali lagi untuk keluar' : msg);

// Modal card. build(card, close) fills it. Back button closes it.
export function dialog(build, { dismissible = true } = {}) {
  const card = h('div', { class: 'card col' });
  const ov = h('div', { class: 'overlay' }, card);
  let offBack = null;
  const close = () => { offBack?.(); ov.remove(); };
  if (dismissible) ov.addEventListener('pointerdown', e => { if (e.target === ov) { audio.play('back'); close(); } });
  offBack = native.onBack(() => { if (dismissible) { audio.play('back'); close(); } return true; });
  build(card, close);
  document.body.append(ov);
  audio.play('open');
  return close;
}

export function confirmBox(title, text, yes, onYes, cls = 'pink') {
  dialog((card, close) => {
    card.style.textAlign = 'center';
    card.append(h('h2', { class: 'title-m' }, title), h('p', { class: 'dim', style: { margin: '4px 0 10px', fontSize: '18px' } }, text),
      h('div', { class: 'row', style: { justifyContent: 'center' } },
        btn('Batal', 'dark small', close, { sound: 'back' }),
        btn(yes, cls + ' small', () => { close(); onYes(); })));
  });
}

// ------------------------------------------------------------------ art
export const PCOLORS = ['#ff4d6d', '#3ab0ff', '#ffc93c', '#3ddc84'];
export const PNAMES = ['P1', 'P2', 'P3', 'P4'];

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = s => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}

let avId = 0;
export function avatarSvg(color = '#ff4d6d', mood = 'happy') {
  const id = 'av' + avId++;
  const face = {
    happy: '<ellipse cx="38" cy="50" rx="6" ry="8" fill="#0b0720"/><ellipse cx="62" cy="50" rx="6" ry="8" fill="#0b0720"/><circle cx="40" cy="47" r="2.4" fill="#fff"/><circle cx="64" cy="47" r="2.4" fill="#fff"/><path d="M40 64q10 10 20 0" fill="#0b0720" stroke="#0b0720" stroke-width="4" stroke-linejoin="round"/>',
    wow: '<circle cx="38" cy="48" r="9" fill="#fff" stroke="#0b0720" stroke-width="3"/><circle cx="62" cy="48" r="9" fill="#fff" stroke="#0b0720" stroke-width="3"/><circle cx="39" cy="50" r="4" fill="#0b0720"/><circle cx="63" cy="50" r="4" fill="#0b0720"/><ellipse cx="50" cy="68" rx="6" ry="7" fill="#0b0720"/>',
    sleep: '<path d="M32 50q6 5 12 0M56 50q6 5 12 0" stroke="#0b0720" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="50" cy="66" rx="4" ry="3" fill="#0b0720"/>',
    cool: '<path d="M26 44h48v8q-2 8-12 8t-12-8q0 8-12 8t-12-8z" fill="#0b0720"/><path d="M42 66q8 6 16 0" stroke="#0b0720" stroke-width="4" fill="none" stroke-linecap="round"/>'
  }[mood] || '';
  return `<svg class="avatar" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="${id}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="${shade(color, 1.45)}"/><stop offset=".55" stop-color="${color}"/><stop offset="1" stop-color="${shade(color, .62)}"/></radialGradient></defs>
    <ellipse cx="50" cy="94" rx="30" ry="5" fill="#000" opacity=".3"/>
    <path d="M50 10c26 0 40 20 40 44 0 22-16 36-40 36S10 76 10 54c0-24 14-44 40-44z" fill="url(#${id})" stroke="#0b0720" stroke-width="5"/>
    <ellipse cx="34" cy="28" rx="10" ry="6" fill="#fff" opacity=".55" transform="rotate(-25 34 28)"/>
    <ellipse cx="27" cy="62" rx="7" ry="4" fill="#ff2f6b" opacity=".35"/><ellipse cx="73" cy="62" rx="7" ry="4" fill="#ff2f6b" opacity=".35"/>
    ${face}</svg>`;
}
export const avatar = (color, mood) => svgEl(avatarSvg(color, mood));

export const ICONS = {
  tv: '<svg viewBox="0 0 64 64"><rect x="6" y="12" width="52" height="34" rx="7" fill="#fff" stroke="#0b0720" stroke-width="5"/><rect x="12" y="18" width="40" height="22" rx="3" fill="#2de2e6"/><path d="M22 54h20M32 46v8" stroke="#0b0720" stroke-width="5" stroke-linecap="round"/><path d="M20 6l12 8 12-8" fill="none" stroke="#0b0720" stroke-width="4" stroke-linecap="round"/></svg>',
  pad: '<svg viewBox="0 0 64 64"><path d="M14 18h36c8 0 12 8 12 20s-2 18-8 18c-5 0-8-8-12-10H22c-4 2-7 10-12 10S2 50 2 38s4-20 12-20z" fill="#fff" stroke="#0b0720" stroke-width="5" stroke-linejoin="round"/><path d="M16 30v12M10 36h12" stroke="#0b0720" stroke-width="5" stroke-linecap="round"/><circle cx="44" cy="32" r="4" fill="#ff3d8b"/><circle cx="52" cy="40" r="4" fill="#3ddc84"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M9 9a3 3 0 1 1 4.2 2.8c-.8.4-1.2 1-1.2 1.9V15"/><circle cx="12" cy="19" r=".6" fill="currentColor"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1.5"/><rect x="14" y="4" width="5" height="16" rx="1.5"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="M15 4L6 12l9 8z" fill="currentColor"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="M9 4l9 8-9 8z" fill="currentColor"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M4 15l8-9 8 9z" fill="currentColor"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M4 9l8 9 8-9z" fill="currentColor"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7M6 9v11h12V9"/></svg>',
  wave: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M7 12V6a1.5 1.5 0 0 1 3 0v5M10 11V4.5a1.5 1.5 0 0 1 3 0V11M13 11V5.5a1.5 1.5 0 0 1 3 0V13M16 9.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-3-5a1.5 1.5 0 0 1 2.6-1.5L7 13"/></svg>',
  tilt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="7" width="14" height="10" rx="2" transform="rotate(-15 12 12)"/><path d="M3 5a10 10 0 0 1 5-3M21 19a10 10 0 0 1-5 3"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor" stroke="#0b0720" stroke-width="1.5" stroke-linejoin="round"/></svg>'
};

export const SHAPES = [
  '<svg class="shape" viewBox="0 0 40 40"><path d="M20 5l16 28H4z" fill="#fff" stroke="#0b0720" stroke-width="3" stroke-linejoin="round"/></svg>',
  '<svg class="shape" viewBox="0 0 40 40"><path d="M20 3l17 17-17 17L3 20z" fill="#fff" stroke="#0b0720" stroke-width="3" stroke-linejoin="round"/></svg>',
  '<svg class="shape" viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="#fff" stroke="#0b0720" stroke-width="3"/></svg>',
  '<svg class="shape" viewBox="0 0 40 40"><rect x="5" y="5" width="30" height="30" rx="4" fill="#fff" stroke="#0b0720" stroke-width="3"/></svg>'
];

// Game card illustrations (same chunky style as the avatars)
export const GAME_ART = {
  kart: `<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="ks" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fc3ff"/><stop offset="1" stop-color="#b9f0ff"/></linearGradient></defs>
    <rect width="320" height="180" fill="url(#ks)"/><circle cx="262" cy="40" r="20" fill="#fff6a8"/>
    <path d="M0 100q60-30 120-8t120-10 80 10v88H0z" fill="#56d67a"/><path d="M0 120q80-20 160 0t160-6v66H0z" fill="#3fbf63"/>
    <path d="M110 180L150 96h20l40 84z" fill="#4a4560" stroke="#0b0720" stroke-width="4"/><path d="M160 100v10M160 122v14M160 150v18" stroke="#fff" stroke-width="5"/>
    <path d="M110 180l40-84M210 180l-40-84" stroke="#ff4d6d" stroke-width="6" stroke-dasharray="10 10"/>
    <g transform="translate(118 112)"><rect x="0" y="22" width="84" height="26" rx="10" fill="#ff4d6d" stroke="#0b0720" stroke-width="4"/><rect x="22" y="6" width="40" height="22" rx="8" fill="#ffc93c" stroke="#0b0720" stroke-width="4"/>
    <circle cx="42" cy="12" r="11" fill="#fff" stroke="#0b0720" stroke-width="4"/><rect x="-4" y="38" width="18" height="20" rx="5" fill="#2a2440" stroke="#0b0720" stroke-width="4"/><rect x="70" y="38" width="18" height="20" rx="5" fill="#2a2440" stroke="#0b0720" stroke-width="4"/>
    <rect x="8" y="16" width="68" height="8" rx="3" fill="#0b0720"/></g>
    <path d="M60 140l14-6M48 152l18-4M250 142l-14-6M262 154l-18-4" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`,
  sumo: `<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><rect width="320" height="180" fill="#1b1145"/><g fill="#fff" opacity=".7"><circle cx="30" cy="30" r="2"/><circle cx="280" cy="24" r="2"/><circle cx="200" cy="16" r="1.5"/><circle cx="70" cy="70" r="1.5"/><circle cx="300" cy="90" r="2"/></g>
    <ellipse cx="160" cy="120" rx="130" ry="44" fill="#6a4bd8" stroke="#0b0720" stroke-width="5"/><ellipse cx="160" cy="112" rx="130" ry="44" fill="#8a6bff" stroke="#0b0720" stroke-width="5"/>
    <ellipse cx="160" cy="112" rx="96" ry="30" fill="none" stroke="#ffd23f" stroke-width="4" stroke-dasharray="10 8"/>
    <g transform="translate(86 62) scale(.62)">${avatarInner('#3ab0ff')}</g><g transform="translate(176 52) scale(.7) rotate(12 50 50)">${avatarInner('#ff4d6d', 'wow')}</g>
    <path d="M146 78l18-6M146 90l20 0" stroke="#fff" stroke-width="5" stroke-linecap="round"/><text x="230" y="58" font-family="Arial" font-weight="900" font-size="26" fill="#ffd23f" stroke="#0b0720" stroke-width="3">BUK!</text></svg>`,
  quiz: `<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="qb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a5cff"/><stop offset="1" stop-color="#ff3d8b"/></linearGradient></defs>
    <rect width="320" height="180" fill="url(#qb)"/><path d="M90 26h140a18 18 0 0 1 18 18v40a18 18 0 0 1-18 18h-70l-24 22v-22H90a18 18 0 0 1-18-18V44a18 18 0 0 1 18-18z" fill="#fff" stroke="#0b0720" stroke-width="5"/>
    <text x="160" y="84" text-anchor="middle" font-family="Arial" font-weight="900" font-size="54" fill="#8a5cff" stroke="#0b0720" stroke-width="3">?</text>
    <rect x="20" y="128" width="64" height="38" rx="10" fill="#e8325a" stroke="#0b0720" stroke-width="4"/><rect x="92" y="128" width="64" height="38" rx="10" fill="#1f86e0" stroke="#0b0720" stroke-width="4"/>
    <rect x="164" y="128" width="64" height="38" rx="10" fill="#f0a91a" stroke="#0b0720" stroke-width="4"/><rect x="236" y="128" width="64" height="38" rx="10" fill="#1fae5c" stroke="#0b0720" stroke-width="4"/>
    <path d="M40 158l12-20 12 20z" fill="#fff"/><path d="M124 136l10 10-10 10-10-10z" fill="#fff"/><circle cx="196" cy="147" r="9" fill="#fff"/><rect x="259" y="138" width="18" height="18" rx="2" fill="#fff"/></svg>`
};
function avatarInner(color, mood) { return avatarSvg(color, mood).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''); }
