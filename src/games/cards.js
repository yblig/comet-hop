// Card illustrations for the game browser, composed from the same sprite art as the games.
import { ART } from '../games2d/sprites.js';
import { GAME_ART } from '../ui/dom.js';

const P = ['#ff4d6d', '#3ab0ff', '#ffc93c', '#3ddc84'];
const put = (svg, x, y, w, h = w, rot = 0) => {
  const inner = svg.replace('<svg ', `<svg x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" `);
  return `<g transform="translate(${x} ${y}) rotate(${rot})">${inner}</g>`;
};
const frame = (bg, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice">${bg}${body}</svg>`;
let gi = 0;
const grad = (a, b) => { const id = 'cg' + (gi++); return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="320" height="180" fill="url(#${id})"/>`; };
const txt = (t, x, y, s, c) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="${s}" fill="${c}" stroke="#0b0720" stroke-width="${s / 8}" paint-order="stroke">${t}</text>`;

export const CARDS = {
  kart: GAME_ART.kart, sumo: GAME_ART.sumo, quiz: GAME_ART.quiz,
  snake: frame(grad('#6bdc77', '#3fbf63'), [...Array(6)].map((_, i) => `<circle cx="${70 + i * 26}" cy="${118 - Math.sin(i) * 18}" r="15" fill="#3ab0ff" stroke="#0b0720" stroke-width="4"/>`).join('') + put(ART.blob('#3ab0ff'), 236, 104, 64) + put(ART.apple(), 280, 58, 44) + put(ART.grape(), 150, 50, 38)),
  tron: frame(`<rect width="320" height="180" fill="#0a0620"/>` + [...Array(9)].map((_, i) => `<path d="M${i * 40} 0v180" stroke="#2de2e6" stroke-opacity=".15"/>`).join('') + `<path d="M20 140h110v-70h90" fill="none" stroke="#ff4d6d" stroke-width="10"/><path d="M300 40h-60v90h-50" fill="none" stroke="#3ab0ff" stroke-width="10"/>`, put(ART.blob('#ff4d6d', 'cool'), 220, 70, 46) + put(ART.blob('#3ab0ff'), 190, 130, 46)),
  tanks: frame(grad('#e0bf84', '#b8915a'), put(ART.wall(), 160, 90, 52) + put(ART.tank('#ff4d6d'), 80, 100, 74, 74, 90) + put(ART.turret('#ff4d6d'), 80, 100, 74, 74, 90) + put(ART.tank('#3ab0ff'), 250, 80, 74, 74, -90) + put(ART.turret('#3ab0ff'), 250, 80, 74, 74, -90) + put(ART.boom(), 200, 120, 50)),
  soccer: frame([...Array(8)].map((_, i) => `<rect x="${i * 40}" width="40" height="180" fill="${i % 2 ? '#3fbf63' : '#4bcb6f'}"/>`).join('') + `<circle cx="160" cy="90" r="46" fill="none" stroke="#fff" stroke-width="4"/><path d="M160 0v180" stroke="#fff" stroke-width="4"/>`, put(ART.blob('#ff4d6d'), 90, 96, 70) + put(ART.ball(), 160, 116, 40) + put(ART.blob('#3ab0ff', 'wow'), 236, 84, 70)),
  pong: frame(grad('#1b1145', '#3a1650'), `<rect x="70" y="20" width="180" height="140" rx="12" fill="#21184f" stroke="#0b0720" stroke-width="6"/><rect x="120" y="146" width="80" height="10" rx="5" fill="#ff4d6d" stroke="#0b0720" stroke-width="3"/><rect x="120" y="24" width="80" height="10" rx="5" fill="#3ab0ff" stroke="#0b0720" stroke-width="3"/><rect x="74" y="60" width="10" height="60" rx="5" fill="#ffc93c" stroke="#0b0720" stroke-width="3"/><rect x="236" y="70" width="10" height="60" rx="5" fill="#3ddc84" stroke="#0b0720" stroke-width="3"/>` + put(ART.puck(), 170, 92, 36)),
  coins: frame(grad('#2f6b4f', '#173a2b'), put(ART.coin(), 60, 60, 40) + put(ART.coin(), 110, 130, 40) + put(ART.gem(), 260, 60, 44) + put(ART.coin(), 220, 130, 40) + put(ART.bomb(), 290, 140, 40) + put(ART.blob('#ffc93c', 'cool'), 160, 90, 72)),
  meteors: frame(grad('#5a3a6e', '#1a0d2b'), `<circle cx="150" cy="130" r="38" fill="#ff3d1f" fill-opacity=".25" stroke="#ff3d1f" stroke-width="3"/>` + put(ART.meteor(), 200, 60, 90) + put(ART.meteor(), 70, 40, 60) + put(ART.blob('#3ddc84', 'wow'), 230, 134, 56)),
  jumpbar: frame(grad('#3a2c86', '#150d38'), `<ellipse cx="160" cy="130" rx="140" ry="42" fill="#7a5bff" stroke="#0b0720" stroke-width="5"/><path d="M160 120L290 150" stroke="#0b0720" stroke-width="16" stroke-linecap="round"/><path d="M160 120L290 150" stroke="#ff4d6d" stroke-width="10" stroke-linecap="round" stroke-dasharray="14 14"/>` + put(ART.blob('#3ab0ff', 'wow'), 230, 76, 60) + put(ART.blob('#ffc93c'), 80, 116, 50)),
  race: frame(`<rect width="320" height="70" fill="#6fd3ff"/><rect y="70" width="320" height="110" fill="#d9643a"/><path d="M0 110h320M0 145h320" stroke="#fff" stroke-width="3"/>`, put(ART.hurdle(), 200, 120, 60, 52) + put(ART.blob('#ff4d6d', 'wow'), 140, 90, 60) + put(ART.blob('#3ddc84'), 70, 150, 50) + put(ART.flag('#ffd23f'), 290, 60, 40, 50)),
  reflex: frame(grad('#2a1a6e', '#120c2c'), `<circle cx="160" cy="90" r="70" fill="#0b0720"/><circle cx="160" cy="90" r="62" fill="#3ddc84"/>` + put(ART.bolt(), 160, 90, 96) + txt('!', 270, 110, 70, '#ffd23f')),
  fruit: frame(grad('#6fd3ff', '#d6f6ff'), `<rect y="140" width="320" height="40" fill="#4bcb6f"/>` + put(ART.apple(), 80, 50, 40) + put(ART.banana(), 170, 30, 40) + put(ART.melon(), 250, 70, 44) + put(ART.bomb(), 120, 90, 34) + put(ART.basket('#3ab0ff'), 180, 146, 110, 64)),
  paint: frame(`<rect width="320" height="180" fill="#e9e4ff"/>` + [...Array(5)].map((_, r) => [...Array(8)].map((_, c) => `<rect x="${c * 40}" y="${r * 36}" width="40" height="36" fill="${(r * 3 + c) % 5 < 2 ? P[(r + c) % 2] : (r + c) % 2 ? '#e9e4ff' : '#dcd5fb'}"/>`).join('')).join(''), put(ART.splat('#ffc93c'), 200, 90, 90) + put(ART.blob('#ffc93c', 'cool'), 200, 86, 58)),
  hotbomb: frame(grad('#6b3a2c', '#2b120d'), put(ART.blob('#3ab0ff', 'wow'), 80, 110, 66) + put(ART.blob('#3ddc84', 'wow'), 250, 112, 62) + put(ART.bomb(), 162, 78, 90)),
  maze: frame(`<rect width="320" height="180" fill="#d4c596"/>` + `<path d="M20 20h120v40M180 20h120v80h-60M20 60v100h80M60 100h60v60M160 60v60h40M220 140h80" fill="none" stroke="#2f7a3f" stroke-width="12" stroke-linecap="round"/>`, put(ART.chest(), 250, 60, 60, 52) + put(ART.blob('#ff4d6d'), 140, 130, 44)),
  simon: frame(`<rect width="320" height="180" fill="#1b1145"/>` + ['#e8325a', '#1f86e0', '#f0a91a', '#1fae5c'].map((c, i) => `<rect x="${30 + (i % 2) * 135}" y="${16 + Math.floor(i / 2) * 78}" width="125" height="68" rx="14" fill="${c}" stroke="${i === 2 ? '#fff' : '#0b0720'}" stroke-width="${i === 2 ? 7 : 4}"/>`).join(''), ''),
  math: frame(grad('#8a5cff', '#3a1650'), txt('7×8', 160, 100, 64, '#fff') + txt('=?', 160, 160, 38, '#ffd23f') + put(ART.star(), 280, 40, 40)),
  archery: frame(grad('#79d4ff', '#d9f6ff'), `<rect y="130" width="320" height="50" fill="#7ad681"/>` + put(ART.target(), 160, 90, 130) + put(ART.arrow('#ff4d6d'), 176, 84, 10, 50, 20))
};
