// Sprite library: every 2D game asset is a hand-authored SVG (same chunky style as the
// avatars: dark outline, top-left light, gradients, highlights), rasterised once into an
// <img> and drawn with drawImage — cheap enough for slow Android TV boxes.
import { avatarSvg } from '../ui/dom.js';

const O = '#0b0720';
let uid = 0;
const id = p => p + (uid++);
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = s => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
  return '#' + [c(16), c(8), c(0)].map(v => v.toString(16).padStart(2, '0')).join('');
}
const wrap = (vb, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`;
const rg = (gid, c) => `<radialGradient id="${gid}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="${shade(c, 1.5)}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, .6)}"/></radialGradient>`;
const shine = (x, y, rx, ry, a = -30) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".6" transform="rotate(${a} ${x} ${y})"/>`;

export const ART = {
  blob: (c, mood = 'happy') => avatarSvg(c, mood).replace('class="avatar" ', ''),
  coin: () => { const g = id('c'); return wrap('0 0 64 64', `<defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3a0"/><stop offset=".5" stop-color="#ffc93c"/><stop offset="1" stop-color="#d98a00"/></linearGradient></defs>
    <circle cx="32" cy="32" r="27" fill="url(#${g})" stroke="${O}" stroke-width="4"/><circle cx="32" cy="32" r="19" fill="none" stroke="#b86e00" stroke-width="3" opacity=".7"/>
    <path d="M32 19l4 8.5 9 1.2-6.6 6.3 1.7 9-8.1-4.4-8.1 4.4 1.7-9-6.6-6.3 9-1.2z" fill="#fff6c2" stroke="#b86e00" stroke-width="2" stroke-linejoin="round"/>${shine(22, 18, 8, 4)}`); },
  gem: () => wrap('0 0 64 64', `<path d="M14 24l10-12h16l10 12-18 28z" fill="#2de2e6" stroke="${O}" stroke-width="4" stroke-linejoin="round"/><path d="M14 24h36M24 12l8 12 8-12M32 24v28" stroke="#127e9c" stroke-width="2.5" fill="none"/><path d="M24 12l8 12-18 0z" fill="#b6fbff"/>`),
  bomb: () => { const g = id('b'); return wrap('0 0 64 64', `<defs>${rg(g, '#3a3550')}</defs><circle cx="30" cy="38" r="21" fill="url(#${g})" stroke="${O}" stroke-width="4"/>
    <rect x="34" y="12" width="12" height="10" rx="2" transform="rotate(35 40 17)" fill="#6b6688" stroke="${O}" stroke-width="3.5"/>
    <path d="M44 12q6-8 12-4" fill="none" stroke="#c9a46a" stroke-width="3.5" stroke-linecap="round"/><path d="M56 3l2 5 5 1-4 3 1 5-4-3-5 2 2-5-3-4 5 0z" fill="#ffd23f" stroke="#ff6a00" stroke-width="1.5"/>${shine(22, 30, 7, 4)}`); },
  apple: () => wrap('0 0 64 64', `<path d="M32 18c-6-6-24-4-24 16s12 26 18 26c3 0 4-2 6-2s3 2 6 2c6 0 18-6 18-26S38 12 32 18z" fill="#ff4d4d" stroke="${O}" stroke-width="4"/><path d="M32 18c0-6 2-10 6-12" stroke="#6b3b1b" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M36 10c6-6 14-4 14-4s-2 8-10 8z" fill="#3ddc84" stroke="${O}" stroke-width="3"/>${shine(20, 28, 6, 4)}`),
  orange: () => wrap('0 0 64 64', `<circle cx="32" cy="36" r="22" fill="#ff9d2e" stroke="${O}" stroke-width="4"/><g fill="#ffb95e" opacity=".8"><circle cx="24" cy="32" r="2"/><circle cx="38" cy="44" r="2"/><circle cx="40" cy="30" r="2"/><circle cx="28" cy="46" r="2"/></g><path d="M32 14q8-8 14-2-6 6-14 2z" fill="#3ddc84" stroke="${O}" stroke-width="3"/>${shine(22, 26, 6, 4)}`),
  banana: () => wrap('0 0 64 64', `<path d="M10 22c4 22 20 34 42 30 4-1 4-6 0-6-16 2-28-8-34-26-2-4-8-3-8 2z" fill="#ffe14a" stroke="${O}" stroke-width="4" stroke-linejoin="round"/><path d="M18 26c6 14 16 20 30 21" stroke="#e8b400" stroke-width="3" fill="none"/><path d="M10 20l-2-6 6 1z" fill="#6b3b1b" stroke="${O}" stroke-width="3"/>`),
  grape: () => wrap('0 0 64 64', `<g fill="#9b5cff" stroke="${O}" stroke-width="3">${[[24, 24], [38, 24], [18, 36], [31, 36], [44, 36], [24, 48], [38, 48], [31, 58]].map(([x, y]) => `<circle cx="${x}" cy="${y - 4}" r="8"/>`).join('')}</g><path d="M31 16q2-8 10-10" stroke="#3ddc84" stroke-width="4" fill="none" stroke-linecap="round"/><g fill="#fff" opacity=".5"><circle cx="21" cy="17" r="2.5"/><circle cx="15" cy="29" r="2.5"/></g>`),
  melon: () => wrap('0 0 64 64', `<path d="M6 22a26 26 0 0 0 52 0z" fill="#3ddc84" stroke="${O}" stroke-width="4" stroke-linejoin="round"/><path d="M11 22a21 21 0 0 0 42 0z" fill="#ff5b6e"/><g fill="${O}"><ellipse cx="24" cy="30" rx="2" ry="3"/><ellipse cx="32" cy="36" rx="2" ry="3"/><ellipse cx="40" cy="30" rx="2" ry="3"/><ellipse cx="32" cy="27" rx="2" ry="3"/></g>`),
  strawberry: () => wrap('0 0 64 64', `<path d="M32 58C16 46 10 30 16 22c6-6 26-6 32 0 6 8 0 24-16 36z" fill="#ff3d5a" stroke="${O}" stroke-width="4" stroke-linejoin="round"/><g fill="#ffe680">${[[24, 30], [34, 28], [42, 32], [28, 40], [38, 40], [32, 48]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.6" ry="2.4"/>`).join('')}</g><path d="M20 20l6-8 6 6 6-6 6 8z" fill="#3ddc84" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>`),
  goldfruit: () => wrap('0 0 64 64', `<circle cx="32" cy="34" r="24" fill="#ffd23f" opacity=".35"/><path d="M32 18c-6-6-24-4-24 16s12 26 18 26c3 0 4-2 6-2s3 2 6 2c6 0 18-6 18-26S38 12 32 18z" fill="#ffc93c" stroke="${O}" stroke-width="4"/><path d="M32 18c0-6 2-10 6-12" stroke="#6b3b1b" stroke-width="4" fill="none" stroke-linecap="round"/>${shine(20, 28, 7, 5)}<path d="M46 14l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" fill="#fff"/>`),
  meteor: () => { const g = id('m'); return wrap('0 0 96 96', `<defs><linearGradient id="${g}" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd23f" stop-opacity="0"/><stop offset=".6" stop-color="#ff7a1f"/><stop offset="1" stop-color="#ff3d1f"/></linearGradient></defs>
    <path d="M90 6L40 48l12 8z" fill="url(#${g})"/><path d="M80 4L34 44l10 6z" fill="#ffd23f" opacity=".6"/>
    <path d="M26 46c10-8 26-6 30 6s-2 26-16 28-26-6-26-18 4-12 12-16z" fill="#7d6a8f" stroke="${O}" stroke-width="4"/><g fill="#5a4a6e"><circle cx="34" cy="62" r="5"/><circle cx="46" cy="52" r="3.5"/><circle cx="26" cy="56" r="3"/></g>${shine(30, 54, 5, 3)}`); },
  tank: c => { const g = id('t'); return wrap('0 0 80 80', `<defs>${rg(g, c)}</defs>
    <rect x="8" y="10" width="16" height="60" rx="6" fill="#3a3550" stroke="${O}" stroke-width="4"/><rect x="56" y="10" width="16" height="60" rx="6" fill="#3a3550" stroke="${O}" stroke-width="4"/>
    <g stroke="#1c1830" stroke-width="3">${[18, 28, 38, 48, 58].map(y => `<path d="M11 ${y}h10M59 ${y}h10"/>`).join('')}</g>
    <rect x="18" y="16" width="44" height="48" rx="10" fill="url(#${g})" stroke="${O}" stroke-width="4"/>${shine(30, 24, 7, 4)}`); },
  turret: c => { const g = id('u'); return wrap('0 0 80 80', `<defs>${rg(g, c)}</defs><rect x="35" y="2" width="10" height="34" rx="3" fill="#3a3550" stroke="${O}" stroke-width="4"/><circle cx="40" cy="42" r="15" fill="url(#${g})" stroke="${O}" stroke-width="4"/>${shine(35, 36, 4, 3)}`); },
  ball: () => wrap('0 0 64 64', `<circle cx="32" cy="32" r="27" fill="#fff" stroke="${O}" stroke-width="4"/><path d="M32 20l10 7-4 12H26l-4-12z" fill="${O}"/><g stroke="${O}" stroke-width="3" fill="none"><path d="M32 20V7M42 27l12-4M38 39l8 10M26 39l-8 10M22 27l-12-4"/></g>${shine(20, 18, 7, 4)}`),
  puck: () => wrap('0 0 64 64', `<circle cx="32" cy="32" r="26" fill="#2de2e6" opacity=".3"/><circle cx="32" cy="32" r="18" fill="#fff" stroke="${O}" stroke-width="4"/><circle cx="32" cy="32" r="9" fill="#2de2e6"/>${shine(26, 25, 5, 3)}`),
  target: () => wrap('0 0 200 200', `<circle cx="100" cy="100" r="96" fill="#fff" stroke="${O}" stroke-width="6"/><circle cx="100" cy="100" r="78" fill="${O}"/><circle cx="100" cy="100" r="62" fill="#3ab0ff"/><circle cx="100" cy="100" r="44" fill="#ff4d6d"/><circle cx="100" cy="100" r="26" fill="#ffd23f"/><circle cx="100" cy="100" r="10" fill="#fff6c2" stroke="#d98a00" stroke-width="3"/>`),
  arrow: c => wrap('0 0 24 120', `<path d="M12 0l9 18H3z" fill="#c9cbd6" stroke="${O}" stroke-width="3" stroke-linejoin="round"/><rect x="10" y="16" width="4" height="84" fill="#8a5a3c"/><path d="M12 92l10 26H2z" fill="${c}" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>`),
  chest: () => wrap('0 0 80 70', `<rect x="6" y="26" width="68" height="38" rx="5" fill="#a0612f" stroke="${O}" stroke-width="4"/><path d="M6 30c0-16 10-22 34-22s34 6 34 22z" fill="#c47a3c" stroke="${O}" stroke-width="4"/><g fill="#ffd23f" stroke="${O}" stroke-width="3"><rect x="34" y="22" width="12" height="16" rx="2"/><rect x="6" y="40" width="68" height="6"/></g><circle cx="40" cy="30" r="2.5" fill="${O}"/><path d="M14 18l3-6 3 6M58 14l3-6 3 6" stroke="#fff6c2" stroke-width="3" fill="none"/>`),
  star: () => wrap('0 0 64 64', `<path d="M32 4l8 17 19 3-14 13 4 19-17-9-17 9 4-19L5 24l19-3z" fill="#ffd23f" stroke="${O}" stroke-width="4" stroke-linejoin="round"/>${shine(24, 22, 5, 3)}`),
  heart: () => wrap('0 0 64 64', `<path d="M32 56S6 40 6 22c0-10 8-16 15-16 6 0 9 4 11 7 2-3 5-7 11-7 7 0 15 6 15 16 0 18-26 34-26 34z" fill="#ff3d6e" stroke="${O}" stroke-width="4" stroke-linejoin="round"/>${shine(18, 20, 6, 4)}`),
  crown: () => wrap('0 0 80 60', `<path d="M8 50L4 14l20 16 16-26 16 26 20-16-4 36z" fill="#ffd23f" stroke="${O}" stroke-width="4" stroke-linejoin="round"/><rect x="8" y="44" width="64" height="10" rx="3" fill="#ffb52e" stroke="${O}" stroke-width="4"/><circle cx="40" cy="30" r="5" fill="#ff3d8b" stroke="${O}" stroke-width="2"/>`),
  boom: () => wrap('0 0 128 128', `<path d="M64 4l12 32 34-12-18 30 32 14-34 8 12 34-30-20-8 34-8-34-30 20 12-34-34-8 32-14-18-30 34 12z" fill="#ff7a1f" stroke="${O}" stroke-width="4" stroke-linejoin="round"/><path d="M64 30l7 20 20-6-10 18 18 8-20 4 6 20-17-11-4 20-4-20-17 11 6-20-20-4 18-8-10-18 20 6z" fill="#ffd23f"/><circle cx="64" cy="64" r="12" fill="#fff6c2"/>`),
  hurdle: () => wrap('0 0 80 70', `<rect x="8" y="20" width="8" height="48" fill="#ddd" stroke="${O}" stroke-width="3"/><rect x="64" y="20" width="8" height="48" fill="#ddd" stroke="${O}" stroke-width="3"/><rect x="4" y="14" width="72" height="14" rx="3" fill="#fff" stroke="${O}" stroke-width="4"/><g fill="#ff4d6d"><rect x="14" y="16" width="12" height="10"/><rect x="38" y="16" width="12" height="10"/><rect x="62" y="16" width="10" height="10"/></g>`),
  basket: c => { const g = id('k'); return wrap('0 0 120 70', `<defs>${rg(g, c)}</defs><path d="M6 18h108l-12 48H18z" fill="url(#${g})" stroke="${O}" stroke-width="5" stroke-linejoin="round"/><g stroke="${O}" stroke-width="3" opacity=".35"><path d="M30 18l6 48M54 18l2 48M66 18l-2 48M90 18l-6 48M12 34h96M16 50h88"/></g><rect x="2" y="10" width="116" height="12" rx="6" fill="${shade(c, .75)}" stroke="${O}" stroke-width="5"/>`); },
  splat: c => wrap('0 0 64 64', `<path d="M32 6c5 0 6 8 10 9s9-6 12-2-4 9-2 13 10 4 9 9-9 3-11 7 3 11-2 13-8-5-12-4-6 9-11 7 1-9-3-12-11 0-11-5 8-5 8-9-8-8-5-12 9 2 11-1-2-10 2-12 4 4 5-1 1-5 5-5z" fill="${c}"/>`),
  wall: () => wrap('0 0 64 64', `<rect x="2" y="2" width="60" height="60" rx="8" fill="#5b4bb0" stroke="${O}" stroke-width="4"/><rect x="8" y="8" width="48" height="48" rx="5" fill="#6d5cd0"/><path d="M8 32h48M32 8v24M20 32v24M44 32v24" stroke="#4a3b96" stroke-width="3"/><rect x="10" y="10" width="20" height="6" rx="3" fill="#fff" opacity=".25"/>`),
  bolt: () => wrap('0 0 64 64', `<circle cx="32" cy="32" r="26" fill="#ffd23f" opacity=".3"/><path d="M36 6L14 36h14l-4 22 24-32H34z" fill="#ffd23f" stroke="${O}" stroke-width="4" stroke-linejoin="round"/>`),
  shield: () => wrap('0 0 64 64', `<path d="M32 6l22 8v16c0 14-10 24-22 28C20 54 10 44 10 30V14z" fill="#2de2e6" stroke="${O}" stroke-width="4" stroke-linejoin="round"/><path d="M32 14l14 5v11c0 9-6 16-14 19z" fill="#b6fbff"/>`),
  flag: c => wrap('0 0 64 80', `<rect x="10" y="6" width="6" height="72" rx="2" fill="#ddd" stroke="${O}" stroke-width="3"/><path d="M16 8h40l-10 14 10 14H16z" fill="${c}" stroke="${O}" stroke-width="4" stroke-linejoin="round"/>`),
  cloud: () => wrap('0 0 160 80', `<path d="M30 70c-16 0-24-10-22-22s16-16 24-12c4-16 18-26 36-22 10-10 32-8 40 6 18-4 34 8 32 26s-14 24-30 24z" fill="#fff" opacity=".9"/>`),
  tree: () => wrap('0 0 80 100', `<rect x="34" y="62" width="12" height="32" rx="3" fill="#8a5a3c" stroke="${O}" stroke-width="4"/><circle cx="40" cy="40" r="30" fill="#2fbf63" stroke="${O}" stroke-width="4"/><circle cx="28" cy="30" r="10" fill="#6be08f" opacity=".7"/>`),
  rock: () => wrap('0 0 80 64', `<path d="M8 56l6-26 18-20 26 4 16 22-4 20z" fill="#8f86b8" stroke="${O}" stroke-width="4" stroke-linejoin="round"/><path d="M20 30l12-14 16 4" stroke="#fff" stroke-width="3" fill="none" opacity=".4"/>`)
};

const cache = new Map();
export function sprite(key) { return cache.get(key); }

// keys like 'coin', 'blob:#ff4d6d:happy', 'tank:#3ab0ff'
export function loadSprites(keys, size = 128) {
  return Promise.all(keys.map(key => {
    if (cache.has(key)) return null;
    const [name, ...args] = key.split(':');
    let svg = ART[name](...args);
    const vb = svg.match(/viewBox="([\d.\s-]+)"/);
    if (vb) { const [, , w, hgt] = vb[1].trim().split(/\s+/).map(Number); svg = svg.replace('<svg ', `<svg width="${w * 4}" height="${hgt * 4}" `); }
    const img = new Image();
    const p = new Promise(res => { img.onload = res; img.onerror = res; });
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    // rasterise once to a canvas so drawing never re-decodes the SVG
    const c = document.createElement('canvas');
    cache.set(key, c);
    return p.then(() => {
      const r = (img.naturalHeight || 1) / (img.naturalWidth || 1);
      c.width = size; c.height = Math.round(size * r) || size;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    });
  }));
}
