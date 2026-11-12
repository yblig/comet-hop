// All tunable numbers live here — one place to balance the game.
export const DESIGN_W = 1080;
export const DESIGN_H = 1920;

export const COMET_R = 24;          // collision radius of the comet head
export const ORBIT_GAP = 78;        // orbit radius = body radius + this
export const PERFECT_RATIO = 0.55;  // |impact parameter| / orbit radius needed for PERFECT
export const MAX_MULT = 5;
export const POINTS_HOP = 10;
export const POINTS_DUST = 5;
export const DUST_PICK_R = 52;
export const MAGNET_R = 300;
export const MAGNET_TIME = 10000;
export const CONTINUE_COST = 50;
export const CAMERA_ANCHOR = 0.68;  // current planet sits at this fraction of screen height

// Difficulty as a function of planets hopped (h).
export const diff = h => ({
  gapY: 430 + Math.min(150, h * 3),
  decay: Math.max(3.0, 7.0 - h * 0.04),
  vOrbit: 470 + Math.min(260, h * 4),
  vFly: 1150 + Math.min(260, h * 4),
  bodyMin: Math.max(52, 70 - h * 0.3),
  bodyMax: Math.max(72, 98 - h * 0.3),
  moving: h >= 10 ? Math.min(0.55, 0.35 + (h - 10) * 0.005) : 0,
  asteroids: h >= 25 ? Math.min(0.75, 0.45 + (h - 25) * 0.008) : 0,
  asteroid2: h >= 55 ? 0.3 : 0,
  blackhole: h >= 45 ? Math.min(0.4, 0.25 + (h - 45) * 0.004) : 0,
  powerup: h >= 6 ? 0.09 : 0,
  ringed: 0.14,
  dustTrail: h >= 3 ? 0.65 : 0.4
});

export const SECTORS = [
  { from: 0, name: 'Moon Orchard', top: 0x241a66, bottom: 0x0b0a24, tip: 'Tap to fly. Glide into the next ring!' },
  { from: 10, name: 'Nebula Drift', top: 0x4a1666, bottom: 0x120a2e, tip: 'Planets are on the move!' },
  { from: 25, name: 'Asteroid Alley', top: 0x123a63, bottom: 0x070d22, tip: 'Watch out for drifting rocks!' },
  { from: 45, name: 'Black Hole Bay', top: 0x3a0f45, bottom: 0x050310, tip: 'Black holes bend your path!' },
  { from: 70, name: 'Nova Fields', top: 0x5a1f33, bottom: 0x140818, tip: 'Everything, faster. Good luck!' }
];
export function sectorFor(h) {
  let i = 0;
  for (let k = 0; k < SECTORS.length; k++) if (h >= SECTORS[k].from) i = k;
  if (h >= 100) {
    const n = Math.floor((h - 100) / 30);
    const base = SECTORS[1 + (n % 4)];
    return { index: 5 + n, name: `Deep Space ${n + 1}`, top: base.top, bottom: base.bottom, tip: 'Endless space. How far can you go?' };
  }
  return { index: i, ...SECTORS[i] };
}

export const SKINS = [
  { id: 'classic', name: 'Twinkle', price: 0, trail: [0x3ff0ff, 0x2a7bff] },
  { id: 'ember', name: 'Ember', price: 150, trail: [0xffb84d, 0xff4f2f] },
  { id: 'plasma', name: 'Plasma', price: 300, trail: [0xff4fd8, 0x8a3bff] },
  { id: 'aurora', name: 'Aurora', price: 450, trail: [0x3dff9a, 0x2bd6ff] },
  { id: 'frost', name: 'Frost', price: 600, trail: [0xffffff, 0x7fb8ff] },
  { id: 'gold', name: 'Solar Gold', price: 900, trail: [0xffe066, 0xff9d00] },
  { id: 'void', name: 'Void', price: 1200, trail: [0xb07aff, 0x3a1680] },
  { id: 'prism', name: 'Prism', price: 2000, trail: null }
];
export const skinById = id => SKINS.find(s => s.id === id) || SKINS[0];

export const PLANET_KEYS = ['planet_0', 'planet_1', 'planet_2', 'planet_3', 'planet_4', 'planet_5'];
export const PLANET_GLOW = [0x5ee6b0, 0xff7a6b, 0xb48cff, 0x4fb8ff, 0xffc94f, 0xff6fb5];
export const RINGED_KEYS = ['planet_ringed_0', 'planet_ringed_1'];
export const RINGED_GLOW = [0xb48cff, 0x4fb8ff];
