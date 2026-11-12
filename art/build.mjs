// Generates every SVG sprite for Comet Hop into public/art/.
//   node art/build.mjs
// One style everywhere: chunky cartoon vector, #140f33 outline, top-left light.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, '..', 'public', 'art');
fs.mkdirSync(out, { recursive: true });
const OUT = '#140f33';
const write = (name, svg) => fs.writeFileSync(path.join(out, name + '.svg'), svg.trim() + '\n');
const svg = (vb, body, w, h) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${w ? ` width="${w}" height="${h}"` : ''}>${body}</svg>`;

// tiny seeded rng so art is reproducible
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// ---------------------------------------------------------------- planets
const PLANETS = [
  { light: '#c8ffe6', base: '#5ee6b0', dark: '#2a9e86', det: '#3fc79a', kind: 'bands' },
  { light: '#ffd0bd', base: '#ff7a6b', dark: '#c4455a', det: '#e85d5d', kind: 'craters' },
  { light: '#ebdcff', base: '#b48cff', dark: '#7650cf', det: '#9a70f0', kind: 'bands' },
  { light: '#cff0ff', base: '#4fb8ff', dark: '#2a66c9', det: '#8fe39a', kind: 'land' },
  { light: '#fff2b8', base: '#ffc94f', dark: '#dc7f26', det: '#f0a63a', kind: 'craters' },
  { light: '#ffd6ee', base: '#ff6fb5', dark: '#c33e80', det: '#ff9bd0', kind: 'spots' }
];

function planetBody(p, id, seed) {
  const r = rng(seed);
  let det = '';
  if (p.kind === 'bands') {
    for (let i = 0; i < 4; i++) {
      const y = 62 + i * 42 + r() * 10, a = 8 + r() * 8, h = 12 + r() * 10;
      det += `<path d="M0 ${y} Q64 ${y - a} 128 ${y} T256 ${y} V${y + h} Q192 ${y + h + a} 128 ${y + h} T0 ${y + h}Z" fill="${p.det}" opacity=".8"/>`;
    }
  } else if (p.kind === 'craters') {
    const cs = [[88, 92, 22], [160, 150, 28], [110, 178, 14], [176, 88, 12], [70, 150, 10]];
    for (const [x, y, s] of cs) {
      det += `<ellipse cx="${x}" cy="${y}" rx="${s}" ry="${s * 0.82}" fill="${p.dark}" opacity=".55"/>` +
             `<ellipse cx="${x + s * 0.18}" cy="${y + s * 0.2}" rx="${s * 0.78}" ry="${s * 0.6}" fill="${p.det}"/>`;
    }
  } else if (p.kind === 'land') {
    det += `<path d="M60 70q30-22 58-4t30 30q-10 26-44 22T52 98q-6-16 8-28z" fill="${p.det}"/>` +
           `<path d="M140 140q34-14 58 6t6 46q-26 18-52 4t-12-56z" fill="${p.det}"/>` +
           `<path d="M70 168q18-8 28 6t-6 22q-18 4-24-10t2-18z" fill="${p.det}"/>`;
  } else {
    for (let i = 0; i < 7; i++) {
      const x = 50 + r() * 160, y = 50 + r() * 160, s = 8 + r() * 16;
      det += `<circle cx="${x}" cy="${y}" r="${s}" fill="${p.det}" opacity=".9"/>`;
    }
  }
  return `
  <defs>
    <radialGradient id="g${id}" cx="36%" cy="30%" r="80%">
      <stop offset="0" stop-color="${p.light}"/><stop offset=".5" stop-color="${p.base}"/><stop offset="1" stop-color="${p.dark}"/>
    </radialGradient>
    <clipPath id="c${id}"><circle cx="128" cy="128" r="110"/></clipPath>
  </defs>
  <circle cx="128" cy="128" r="110" fill="url(#g${id})"/>
  <g clip-path="url(#c${id})">
    ${det}
    <path d="M-20-20H280V280H-20Z M128 22a106 106 0 1 0 0.1 0Z" transform="translate(-26 -26)" fill="${OUT}" opacity=".28" fill-rule="evenodd"/>
    <circle cx="128" cy="128" r="104" fill="none" stroke="#fff" stroke-width="6" opacity=".12" transform="translate(4 -4)"/>
  </g>
  <circle cx="128" cy="128" r="110" fill="none" stroke="${OUT}" stroke-width="10"/>
  <ellipse cx="80" cy="66" rx="30" ry="16" fill="#fff" opacity=".55" transform="rotate(-32 80 66)"/>
  <circle cx="58" cy="96" r="6" fill="#fff" opacity=".5"/>`;
}

PLANETS.forEach((p, i) => write(`planet_${i}`, svg('0 0 256 256', planetBody(p, i, 11 + i * 7))));

// ringed planets: same 256 body scale, wider viewBox "-72 -12 400 280" so origin stays (0.5,0.5)
function ringed(p, ringCol, ringLight, id) {
  const back = 'M-57 128A185 46 0 0 1 313 128';
  const front = 'M313 128A185 46 0 0 1 -57 128';
  const ring = d => `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="34" stroke-linecap="round"/>` +
    `<path d="${d}" fill="none" stroke="${ringCol}" stroke-width="22" stroke-linecap="round"/>` +
    `<path d="${d}" fill="none" stroke="${ringLight}" stroke-width="6" stroke-linecap="round" opacity=".8"/>`;
  return svg('-72 -12 400 280',
    `<g transform="rotate(-14 128 128)">${ring(back)}</g>${planetBody(p, 'r' + id, 99 + id)}<g transform="rotate(-14 128 128)">${ring(front)}</g>`);
}
write('planet_ringed_0', ringed(PLANETS[2], '#ffd84f', '#fff4b0', 0));
write('planet_ringed_1', ringed(PLANETS[3], '#ff9bd0', '#ffe0f1', 1));

// ---------------------------------------------------------------- faces (overlay, 256 body scale)
const blush = `<ellipse cx="76" cy="158" rx="16" ry="9" fill="#ff4f8b" opacity=".45"/><ellipse cx="180" cy="158" rx="16" ry="9" fill="#ff4f8b" opacity=".45"/>`;
write('face_sleep', svg('0 0 256 256', `${blush}
  <path d="M84 138q14 12 28 0M144 138q14 12 28 0" fill="none" stroke="${OUT}" stroke-width="8" stroke-linecap="round"/>
  <ellipse cx="128" cy="168" rx="7" ry="6" fill="${OUT}"/>
  <text x="182" y="92" font-family="Arial" font-weight="900" font-size="30" fill="#fff" opacity=".85">z</text>
  <text x="200" y="66" font-family="Arial" font-weight="900" font-size="22" fill="#fff" opacity=".65">z</text>`));
write('face_happy', svg('0 0 256 256', `${blush}
  <ellipse cx="98" cy="132" rx="13" ry="16" fill="${OUT}"/><ellipse cx="158" cy="132" rx="13" ry="16" fill="${OUT}"/>
  <circle cx="102" cy="126" r="5" fill="#fff"/><circle cx="162" cy="126" r="5" fill="#fff"/>
  <path d="M108 160q20 22 40 0" fill="${OUT}" stroke="${OUT}" stroke-width="7" stroke-linejoin="round"/>
  <path d="M118 170q10 7 20 0" fill="#ff6f91"/>`));
write('face_scared', svg('0 0 256 256', `
  <ellipse cx="96" cy="128" rx="18" ry="22" fill="#fff" stroke="${OUT}" stroke-width="6"/>
  <ellipse cx="160" cy="128" rx="18" ry="22" fill="#fff" stroke="${OUT}" stroke-width="6"/>
  <circle cx="96" cy="132" r="7" fill="${OUT}"/><circle cx="160" cy="132" r="7" fill="${OUT}"/>
  <path d="M104 172q8-8 12 0t12 0 12 0 12 0" fill="none" stroke="${OUT}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M196 84q10 18 0 26q-10-8 0-26z" fill="#9fe8ff" stroke="${OUT}" stroke-width="4"/>
  <path d="M70 92l24 8M186 92l-24 8" stroke="${OUT}" stroke-width="7" stroke-linecap="round"/>`));

// ---------------------------------------------------------------- comet heads
export const SKINS = [
  { id: 'classic', core: '#e6fdff', glow: '#3ff0ff', deep: '#1f8fd6' },
  { id: 'ember', core: '#fff1c9', glow: '#ff9a3d', deep: '#e0441f' },
  { id: 'plasma', core: '#ffe0f8', glow: '#ff4fd8', deep: '#8a3bff' },
  { id: 'aurora', core: '#e6fff0', glow: '#3dff9a', deep: '#1aa7c9' },
  { id: 'frost', core: '#ffffff', glow: '#b6dcff', deep: '#5f8fe0' },
  { id: 'gold', core: '#fffbe0', glow: '#ffd23d', deep: '#e08a00' },
  { id: 'void', core: '#f0e4ff', glow: '#a46bff', deep: '#3a1680' },
  { id: 'prism', core: '#ffffff', glow: '#ff7ad9', deep: '#5b8cff', prism: true }
];
for (const s of SKINS) {
  const coreFill = s.prism
    ? `<linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe066"/><stop offset=".35" stop-color="#ff6fb5"/><stop offset=".7" stop-color="#7a8cff"/><stop offset="1" stop-color="#3dffc0"/></linearGradient>`
    : `<radialGradient id="cg" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="${s.core}"/><stop offset=".55" stop-color="${s.glow}"/><stop offset="1" stop-color="${s.deep}"/></radialGradient>`;
  write(`comet_${s.id}`, svg('0 0 128 128', `
  <defs>${coreFill}
    <radialGradient id="gl" cx="50%" cy="50%" r="50%"><stop offset=".45" stop-color="${s.glow}" stop-opacity=".55"/><stop offset="1" stop-color="${s.glow}" stop-opacity="0"/></radialGradient>
  </defs>
  <circle cx="64" cy="64" r="62" fill="url(#gl)"/>
  <circle cx="64" cy="64" r="34" fill="url(#cg)" stroke="${OUT}" stroke-width="6"/>
  <ellipse cx="52" cy="48" rx="11" ry="6" fill="#fff" opacity=".8" transform="rotate(-30 52 48)"/>
  <ellipse cx="55" cy="67" rx="5" ry="7" fill="${OUT}"/><ellipse cx="75" cy="67" rx="5" ry="7" fill="${OUT}"/>
  <circle cx="57" cy="64" r="2" fill="#fff"/><circle cx="77" cy="64" r="2" fill="#fff"/>
  <path d="M60 78q5 5 10 0" fill="none" stroke="${OUT}" stroke-width="3.5" stroke-linecap="round"/>`));
}

// ---------------------------------------------------------------- asteroids
for (let v = 0; v < 3; v++) {
  const r = rng(500 + v * 31);
  const n = 9, pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, rad = 88 + r() * 26;
    pts.push([128 + Math.cos(a) * rad, 128 + Math.sin(a) * rad]);
  }
  let d = '';
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    d += i === 0 ? `M${m[0].toFixed(1)} ${m[1].toFixed(1)}` : '';
    const q2 = pts[(i + 1) % n], m2 = [(q2[0] + pts[(i + 2) % n][0]) / 2, (q2[1] + pts[(i + 2) % n][1]) / 2];
    d += `Q${q2[0].toFixed(1)} ${q2[1].toFixed(1)} ${m2[0].toFixed(1)} ${m2[1].toFixed(1)}`;
  }
  d += 'Z';
  let craters = '';
  for (let i = 0; i < 4; i++) {
    const x = 80 + r() * 96, y = 80 + r() * 96, s = 10 + r() * 14;
    craters += `<ellipse cx="${x}" cy="${y}" rx="${s}" ry="${s * .8}" fill="#4a3f6e" opacity=".7"/><ellipse cx="${x + 2}" cy="${y + 3}" rx="${s * .7}" ry="${s * .55}" fill="#8576aa"/>`;
  }
  write(`asteroid_${v}`, svg('0 0 256 256', `
  <defs><radialGradient id="ag" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#cbbfe6"/><stop offset=".5" stop-color="#8f80b8"/><stop offset="1" stop-color="#4e4378"/></radialGradient>
  <clipPath id="ac"><path d="${d}"/></clipPath></defs>
  <path d="${d}" fill="url(#ag)"/>
  <g clip-path="url(#ac)">${craters}<path d="M-20-20H280V280H-20Z M128 28a100 100 0 1 0 .1 0Z" transform="translate(-20 -20)" fill="${OUT}" opacity=".3" fill-rule="evenodd"/></g>
  <path d="${d}" fill="none" stroke="${OUT}" stroke-width="10" stroke-linejoin="round"/>
  <ellipse cx="92" cy="72" rx="20" ry="10" fill="#fff" opacity=".45" transform="rotate(-30 92 72)"/>`));
}

// ---------------------------------------------------------------- black hole
write('blackhole', svg('0 0 256 256', `
  <defs>
    <radialGradient id="bo" cx="50%" cy="50%" r="50%"><stop offset=".45" stop-color="#ff4fd8" stop-opacity=".6"/><stop offset=".7" stop-color="#8a3bff" stop-opacity=".25"/><stop offset="1" stop-color="#8a3bff" stop-opacity="0"/></radialGradient>
    <linearGradient id="bd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd84f"/><stop offset=".5" stop-color="#ff7a3d"/><stop offset="1" stop-color="#ff4fd8"/></linearGradient>
    <radialGradient id="bc" cx="50%" cy="50%" r="50%"><stop offset=".7" stop-color="#000"/><stop offset="1" stop-color="#1a0630"/></radialGradient>
  </defs>
  <circle cx="128" cy="128" r="126" fill="url(#bo)"/>
  <circle cx="128" cy="128" r="80" fill="none" stroke="${OUT}" stroke-width="34"/>
  <circle cx="128" cy="128" r="80" fill="none" stroke="url(#bd)" stroke-width="22"/>
  <circle cx="128" cy="128" r="62" fill="url(#bc)" stroke="#ffe9a0" stroke-width="4"/>`));
write('blackhole_swirl', svg('0 0 256 256', `
  <g fill="none" stroke-linecap="round">
    <path d="M128 40a88 88 0 0 1 80 52" stroke="#fff" stroke-width="7" opacity=".7"/>
    <path d="M216 150a88 88 0 0 1-62 64" stroke="#ffd84f" stroke-width="6" opacity=".8"/>
    <path d="M110 216a88 88 0 0 1-70-60" stroke="#fff" stroke-width="5" opacity=".6"/>
    <path d="M42 108a88 88 0 0 1 46-58" stroke="#ff9be9" stroke-width="6" opacity=".8"/>
    <path d="M150 64a68 68 0 0 1 40 30" stroke="#ff9be9" stroke-width="4" opacity=".6"/>
    <path d="M100 190a68 68 0 0 1-34-30" stroke="#ffd84f" stroke-width="4" opacity=".6"/>
  </g>`));

// ---------------------------------------------------------------- stardust & power-ups
const star4 = (cx, cy, R, r) => `M${cx} ${cy - R}Q${cx + r} ${cy - r} ${cx + R} ${cy}Q${cx + r} ${cy + r} ${cx} ${cy + R}Q${cx - r} ${cy + r} ${cx - R} ${cy}Q${cx - r} ${cy - r} ${cx} ${cy - R}Z`;
write('stardust', svg('0 0 64 64', `
  <defs><radialGradient id="sg" cx="50%" cy="50%" r="50%"><stop offset=".2" stop-color="#ffe680" stop-opacity=".9"/><stop offset="1" stop-color="#ffb52e" stop-opacity="0"/></radialGradient>
  <linearGradient id="sf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffbe0"/><stop offset=".5" stop-color="#ffd84f"/><stop offset="1" stop-color="#ff9d2e"/></linearGradient></defs>
  <circle cx="32" cy="32" r="31" fill="url(#sg)" opacity=".7"/>
  <path d="${star4(32, 32, 24, 7)}" fill="url(#sf)" stroke="#a5520b" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="27" cy="25" r="3" fill="#fff"/>`));

function badge(name, top, bottom, icon) {
  write(name, svg('0 0 128 128', `
  <defs><linearGradient id="pb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
  <radialGradient id="pg" cx="50%" cy="50%" r="50%"><stop offset=".6" stop-color="${top}" stop-opacity=".6"/><stop offset="1" stop-color="${top}" stop-opacity="0"/></radialGradient></defs>
  <circle cx="64" cy="64" r="63" fill="url(#pg)"/>
  <circle cx="64" cy="64" r="42" fill="url(#pb)" stroke="${OUT}" stroke-width="6"/>
  <g fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${icon}</g>
  <ellipse cx="50" cy="40" rx="12" ry="6" fill="#fff" opacity=".6" transform="rotate(-30 50 40)"/>`));
}
badge('pu_shield', '#9ffbff', '#1f9fd6', `<path d="M64 42l18 7v14c0 12-8 20-18 24-10-4-18-12-18-24V49z"/>`);
badge('pu_magnet', '#ff9be9', '#c9309f', `<path d="M48 48v16a16 16 0 0 0 32 0V48"/><path d="M48 50h8M72 50h8" stroke="#ffd84f"/>`);
write('shield_bubble', svg('0 0 200 200', `
  <defs><radialGradient id="sb" cx="50%" cy="50%" r="50%"><stop offset=".6" stop-color="#3ff0ff" stop-opacity="0"/><stop offset="1" stop-color="#3ff0ff" stop-opacity=".45"/></radialGradient></defs>
  <circle cx="100" cy="100" r="92" fill="url(#sb)" stroke="#9ffbff" stroke-width="6"/>
  <path d="M46 62a70 70 0 0 1 44-28" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".8"/>`));

// ---------------------------------------------------------------- nebula clouds (soft, blurred)
const NEB = [['#ff4fd8', '#8a3bff', '#3ff0ff'], ['#3ff0ff', '#5b5bf7', '#ff6fb5'], ['#ffb84d', '#ff4fd8', '#7a3dff']];
NEB.forEach((cols, i) => {
  const r = rng(900 + i * 13);
  let blobs = '';
  for (let k = 0; k < 7; k++) {
    const x = 260 + r() * 500, y = 260 + r() * 500, rx = 120 + r() * 160, ry = 90 + r() * 140;
    blobs += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${cols[k % 3]}" opacity="${(0.28 + r() * 0.25).toFixed(2)}"/>`;
  }
  write(`nebula_${i}`, svg('0 0 1024 1024', `<defs><filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="70"/></filter></defs><g filter="url(#b)">${blobs}</g>`));
});

// ---------------------------------------------------------------- buttons
function button(name, top, bottom, base) {
  write(name, svg('0 0 560 180', `
  <defs><linearGradient id="bf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>
  <rect x="8" y="24" width="544" height="148" rx="62" fill="${base}" stroke="${OUT}" stroke-width="8"/>
  <rect x="8" y="8" width="544" height="148" rx="62" fill="url(#bf)" stroke="${OUT}" stroke-width="8"/>
  <rect x="42" y="22" width="476" height="34" rx="17" fill="#fff" opacity=".35"/>`));
}
button('btn_yellow', '#ffef9a', '#ffaa2b', '#b8620f');
button('btn_cyan', '#a8fcff', '#22c2e3', '#126ea0');
button('btn_pink', '#ffa6ee', '#e33bbd', '#841b74');
button('btn_dark', '#4a3d9e', '#2a2068', '#130e38');
function round(name, top, bottom, base) {
  write(name, svg('0 0 160 168', `
  <defs><linearGradient id="rf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>
  <circle cx="80" cy="90" r="72" fill="${base}" stroke="${OUT}" stroke-width="8"/>
  <circle cx="80" cy="78" r="72" fill="url(#rf)" stroke="${OUT}" stroke-width="8"/>
  <ellipse cx="58" cy="40" rx="26" ry="12" fill="#fff" opacity=".35" transform="rotate(-24 58 40)"/>`));
}
round('round_dark', '#4a3d9e', '#2a2068', '#130e38');
round('round_cyan', '#a8fcff', '#22c2e3', '#126ea0');
round('round_pink', '#ffa6ee', '#e33bbd', '#841b74');
round('round_yellow', '#ffef9a', '#ffaa2b', '#b8620f');

// ---------------------------------------------------------------- icons (white, 96 box)
const ic = (name, body, fill = false) => write('icon_' + name, svg('0 0 96 96',
  `<g fill="${fill ? '#fff' : 'none'}" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">${body}</g>`));
ic('pause', `<rect x="26" y="22" width="12" height="52" rx="4" fill="#fff"/><rect x="58" y="22" width="12" height="52" rx="4" fill="#fff"/>`);
ic('play', `<path d="M32 20l42 28-42 28z" fill="#fff"/>`);
ic('home', `<path d="M16 46L48 18l32 28"/><path d="M26 40v36h44V40"/><path d="M42 76V58h12v18"/>`);
ic('retry', `<path d="M74 50a26 26 0 1 1-8-20"/><path d="M68 14v18H50" />`);
{
  let teeth = '';
  for (let i = 0; i < 8; i++) { const a = i * 45; teeth += `<rect x="42" y="8" width="12" height="18" rx="3" fill="#fff" stroke="none" transform="rotate(${a} 48 48)"/>`; }
  ic('gear', `${teeth}<circle cx="48" cy="48" r="24"/><circle cx="48" cy="48" r="8" fill="#fff"/>`);
}
ic('music', `<path d="M38 70V22l36-8v48"/><circle cx="28" cy="70" r="10" fill="#fff"/><circle cx="64" cy="62" r="10" fill="#fff"/>`);
ic('sound', `<path d="M16 38h14l20-16v52L30 58H16z" fill="#fff"/><path d="M62 36q10 12 0 24M72 26q20 22 0 44"/>`);
ic('vibrate', `<rect x="30" y="16" width="36" height="64" rx="8"/><path d="M16 34v28M80 34v28"/>`);
ic('comet', `<circle cx="62" cy="34" r="16" fill="#fff"/><path d="M48 48L18 78M40 34L20 46M62 56L46 78"/>`);
ic('help', `<path d="M34 34a14 14 0 1 1 20 13c-4 2-6 5-6 9v4"/><circle cx="48" cy="76" r="3" fill="#fff"/>`);
ic('close', `<path d="M26 26l44 44M70 26L26 70"/>`);
ic('lock', `<rect x="22" y="44" width="52" height="38" rx="8" fill="#fff"/><path d="M34 44V32a14 14 0 0 1 28 0v12"/>`);
ic('aim', `<path d="M14 82l10-10M32 64l10-10M50 46l10-10"/><path d="M58 22h18v18"/>`);
ic('check', `<path d="M20 50l18 18 38-40"/>`);
ic('trophy', `<path d="M30 18h36v18a18 18 0 0 1-36 0z" fill="#fff"/><path d="M30 24H16q0 18 16 18M66 24h14q0 18-16 18M48 54v14M34 80h28"/>`);
ic('star', `<path d="M48 12l10 22 24 3-18 17 5 24-21-12-21 12 5-24-18-17 24-3z" fill="#fff" stroke-width="4"/>`);
ic('reset', `<path d="M22 50a26 26 0 1 0 8-20"/><path d="M28 14v18h18"/><path d="M48 36v14l10 6"/>`);

console.log('art written to', out, fs.readdirSync(out).length, 'files');
