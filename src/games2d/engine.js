// Tiny 2D party-game engine shared by the canvas games.
// A game is a spec: { id, name, music, help, controls, layout, ctrl, fill, time, sprites,
//   bg(G, ctx), setup(G), update(G, dt), draw(G, ctx), bot(G, e, dt), onAnswer(G, e, i), label(e) }
// Logical resolution is 1280×720 (letterboxed to any screen). In "mode hemat" the canvas
// renders at 1× with no shadows; otherwise 1.5×.
import { h, PCOLORS, confirmBox } from '../ui/dom.js';
import { audio } from '../lib/audio.js';
import { isLite } from '../lite.js';
import { nav } from '../input/nav.js';
import { loadSprites, sprite } from './sprites.js';

export const W = 1280, H = 720;
const BOTS = ['Bot Jago', 'Bot Lincah', 'Bot Usil', 'Bot Santuy'];

export function game2d(spec) {
  return (session, root, humans) => run(spec, session, root, humans);
}

function run(spec, session, root, humans) {
  const lite = isLite();
  const q = lite ? 1 : Math.min(1.5, Math.max(1, (window.devicePixelRatio || 1) * Math.min(innerWidth / W, innerHeight / H)));
  root.style.background = '#0b0720';
  const canvas = h('canvas', { style: { position: 'absolute', imageRendering: 'auto' } });
  canvas.width = Math.round(W * q); canvas.height = Math.round(H * q);
  root.append(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = canvas.width; bgCanvas.height = canvas.height;

  function layout() {
    const s = Math.min(innerWidth / W, innerHeight / H);
    Object.assign(canvas.style, { width: W * s + 'px', height: H * s + 'px', left: (innerWidth - W * s) / 2 + 'px', top: (innerHeight - H * s) / 2 + 'px' });
  }
  layout();
  addEventListener('resize', layout);

  // ------------------------------------------------------------ entrants
  const ents = humans.map(p => ({ p, human: true, name: p.name, color: p.color, slot: p.slot }));
  const want = Math.max(ents.length, typeof spec.fill === 'function' ? spec.fill(ents.length) : (spec.fill || 0));
  const used = new Set(ents.map(e => e.slot));
  const freeSlots = [0, 1, 2, 3].filter(i => !used.has(i));
  for (let i = 0; ents.length < want && freeSlots.length; i++) {
    const s = freeSlots.shift();
    ents.push({ p: null, human: false, name: BOTS[i], color: PCOLORS[s], slot: s });
  }
  ents.forEach((e, i) => Object.assign(e, { i, score: 0, alive: true, in: blank(), prev: blank(), data: {} }));

  const G = {
    W, H, ctx, lite, ents, spec, session, t: 0, phase: 'load', timeLeft: spec.time || 0,
    rand: (a, b) => a + Math.random() * (b - a), randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: arr => arr[Math.floor(Math.random() * arr.length)],
    get alive() { return ents.filter(e => e.alive); },
    get humans() { return ents.filter(e => e.human); },
    tap: (e, k) => !!e.in[k] && !e.prev[k],
    sfx: (n, o) => audio.play(n, o), sfxv: (n, o) => audio.playVaried(n, o),
    buzz: (e, k = 'light') => { if (e.human) session.buzz(e.p, k); },
    sprite, parts: [], shake: 0, msg: null, banner: null, ended: false,
    say(text, color = '#fff', ms = 900) { G.msg = { text, color, until: G.t + ms / 1000, at: G.t }; },
    toast(text, ms = 1600) { G.banner = { text, until: G.t + ms / 1000 }; },
    burst(x, y, color, n = 12, speed = 260) {
      if (lite) n = Math.ceil(n / 2);
      for (let k = 0; k < n && G.parts.length < 260; k++) {
        const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
        G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.6 + Math.random() * 0.4, t: 0, color, r: 4 + Math.random() * 5 });
      }
    },
    float(x, y, text, color = '#fff') { G.parts.push({ x, y, vx: 0, vy: -70, life: 1, t: 0, text, color }); },
    end(order, title) { finish(order, title); },
    blob: (e, mood = 'happy') => sprite(`blob:${e.color}:${mood}`)
  };

  // ------------------------------------------------------------ assets
  const keys = new Set(['star', 'crown']);
  ents.forEach(e => ['happy', 'wow', 'sleep', 'cool'].forEach(m => keys.add(`blob:${e.color}:${m}`)));
  (spec.sprites?.(G) || []).forEach(k => keys.add(k));
  loadSprites([...keys], spec.spriteSize || 128).then(() => {
    const b = bgCanvas.getContext('2d');
    b.setTransform(q, 0, 0, q, 0, 0);
    if (spec.bg) spec.bg(G, b); else defaultBg(b);
    spec.setup?.(G);
    G.phase = 'intro'; G.t = 0;
  });

  // ------------------------------------------------------------ HUD + loop
  audio.playMusic(spec.music || 'music_lobby');
  nav.gameMode = true;
  nav.onStart = () => confirmBox('Keluar game?', 'Kembali ke lobby.', 'Keluar', quit);
  let raf = 0, last = performance.now(), counted = 4;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(window.__dtMax || 0.05, (now - last) / 1000); last = now;
    G.t += dt;
    // inputs
    for (const e of ents) {
      e.prev = e.in;
      if (e.human) e.in = { ...blank(), ...e.p.input };
      else e.in = (G.phase === 'play' && e.alive && spec.bot) ? { ...blank(), ...spec.bot(G, e, dt) } : blank();
    }
    if (G.phase === 'intro' && G.t > (spec.introTime || 3.2)) { G.phase = 'count'; G.t = 0; }
    if (G.phase === 'count') {
      const left = Math.ceil(3 - G.t * 1.25);
      if (left !== counted && left > 0) { counted = left; G.say(String(left), '#fff', 700); audio.play('count'); }
      if (G.t * 1.25 >= 3) { G.phase = 'play'; G.t = 0; G.say(spec.goText || 'MULAI!', '#ffd23f', 800); audio.play('go'); ents.forEach(e => G.buzz(e, 'medium')); }
    }
    if (G.phase === 'play') {
      if (spec.time) { G.timeLeft -= dt; if (G.timeLeft <= 0) { G.timeLeft = 0; finish(); } }
      if (!G.ended) spec.update(G, dt);
    } else if (G.phase === 'count' || G.phase === 'intro') spec.idle?.(G, dt);
    // particles
    for (const p of G.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (!p.text) { p.vx *= 0.92; p.vy *= 0.92; } }
    G.parts = G.parts.filter(p => p.t < p.life);
    G.shake = Math.max(0, G.shake - dt * 2);
    draw();
  }
  raf = requestAnimationFrame(frame);

  function draw() {
    ctx.setTransform(q, 0, 0, q, 0, 0);
    if (G.shake > 0 && !lite) ctx.translate((Math.random() - 0.5) * G.shake * 20, (Math.random() - 0.5) * G.shake * 20);
    ctx.drawImage(bgCanvas, 0, 0, W, H);
    if (G.phase === 'load') { centerText('Memuat…', 40, '#fff'); return; }
    spec.draw(G, ctx);
    for (const p of G.parts) {
      const a = 1 - p.t / p.life;
      ctx.globalAlpha = Math.max(0, a);
      if (p.text) { outlined(p.text, p.x, p.y, 34, p.color); }
      else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * a + 1, 0, 6.283); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(q, 0, 0, q, 0, 0);
    if (spec.hud !== false) hud();
    if (G.phase === 'intro') intro();
    if (G.msg && G.t < G.msg.until) {
      const k = Math.min(1, (G.t - G.msg.at) * 6);
      outlined(G.msg.text, W / 2, H / 2, 150 * (lite ? 1 : 0.7 + 0.3 * k), G.msg.color, 14);
    }
    if (G.banner && G.t < G.banner.until) {
      ctx.font = '800 38px "Baloo 2", sans-serif';
      const w = ctx.measureText(G.banner.text).width + 60;
      ctx.fillStyle = 'rgba(11,7,32,.85)'; rr(ctx, W / 2 - w / 2, 96, w, 64, 32); ctx.fill();
      ctx.strokeStyle = '#ff3d8b'; ctx.lineWidth = 4; ctx.stroke();
      outlined(G.banner.text, W / 2, 129, 38, '#fff', 0);
    }
  }

  function hud() {
    const n = ents.length, slot = Math.min(250, (W - 260) / n);
    const x0 = W / 2 - (slot * n) / 2;
    ents.forEach((e, k) => {
      const x = x0 + k * slot;
      ctx.fillStyle = 'rgba(11,7,32,.7)'; rr(ctx, x + 6, 8, slot - 12, 50, 25); ctx.fill();
      ctx.globalAlpha = e.alive ? 1 : 0.4;
      const img = G.blob(e, e.alive ? 'happy' : 'sleep');
      if (img) ctx.drawImage(img, x + 10, 10, 46, 46);
      ctx.font = '700 19px Fredoka, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = e.color; ctx.fillText(e.name.slice(0, 10), x + 60, 23);
      ctx.fillStyle = '#fff'; ctx.font = '800 22px "Baloo 2", sans-serif';
      ctx.fillText(spec.hudValue ? spec.hudValue(e) : String(e.score), x + 60, 44);
      ctx.globalAlpha = 1;
    });
    if (spec.time && G.phase !== 'intro') {
      const s = Math.ceil(G.timeLeft);
      ctx.fillStyle = 'rgba(11,7,32,.8)'; rr(ctx, W - 116, 8, 104, 50, 25); ctx.fill();
      outlined(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, W - 64, 34, 30, s <= 10 ? '#ff4d6d' : '#fff', 0);
    }
  }

  function intro() {
    ctx.fillStyle = 'rgba(11,7,32,.82)'; ctx.fillRect(0, 0, W, H);
    outlined(spec.name, W / 2, 200, 84, '#ffd23f', 10);
    ctx.font = '600 30px Fredoka, sans-serif'; ctx.fillStyle = '#f5f3ff'; ctx.textAlign = 'center';
    wrapText(spec.help || '', W / 2, 290, 900, 40);
    ctx.font = '700 24px Fredoka, sans-serif'; ctx.fillStyle = '#2de2e6';
    wrapText(spec.controls || '', W / 2, 430, 1000, 34);
    const n = ents.length;
    ents.forEach((e, k) => {
      const x = W / 2 + (k - (n - 1) / 2) * 150;
      const img = G.blob(e, 'happy');
      if (img) ctx.drawImage(img, x - 45, 500, 90, 90);
      ctx.font = '700 22px Fredoka, sans-serif'; ctx.fillStyle = e.color; ctx.textAlign = 'center'; ctx.fillText(e.name, x, 615);
    });
    const p = Math.min(1, G.t / (spec.introTime || 3.2));
    ctx.fillStyle = 'rgba(255,255,255,.15)'; rr(ctx, W / 2 - 200, 660, 400, 12, 6); ctx.fill();
    ctx.fillStyle = '#ff3d8b'; rr(ctx, W / 2 - 200, 660, 400 * p, 12, 6); ctx.fill();
  }

  function wrapText(text, x, y, max, lh) {
    for (const para of String(text).split('\n')) {
      let line = '';
      for (const w of para.split(' ')) {
        const t = line ? line + ' ' + w : w;
        if (ctx.measureText(t).width > max && line) { ctx.fillText(line, x, y); y += lh; line = w; } else line = t;
      }
      ctx.fillText(line, x, y); y += lh;
    }
  }

  function centerText(t, s, c) { outlined(t, W / 2, H / 2, s, c); }
  function outlined(text, x, y, size, color, stroke = Math.round(size / 7)) {
    ctx.font = `800 ${Math.round(size)}px "Baloo 2", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = stroke; ctx.strokeStyle = '#0b0720'; ctx.strokeText(text, x, y); }
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }
  G.text = outlined;
  G.rr = (x, y, w, hh, r) => rr(ctx, x, y, w, hh, r);

  function finish(order, title) {
    if (G.ended) return;
    G.ended = true;
    order = order || (spec.order ? spec.order(G) : [...ents].sort((a, b) => b.score - a.score));
    audio.play('finish');
    G.say(spec.endText || 'SELESAI!', '#ffd23f', 1400);
    setTimeout(() => session.finish(order.map(e => ({ p: e.p, name: e.name, color: e.color, label: spec.label ? spec.label(e) : `${e.score} poin` })), title || spec.name), 1500);
  }
  function quit() { import('../app.js').then(a => import('../host/host.js').then(hh => a.go(hh.hostScreen))); }

  window.__g2d = G;
  return {
    onMsg(p, m) { if (m.t === 'ans' && G.phase === 'play') { const e = ents.find(x => x.p === p); if (e && spec.onAnswer) spec.onAnswer(G, e, m.i | 0); } },
    layoutFor(p) {
      if (!ents.find(e => e.p === p)) return { l: 'wait', data: { title: 'Game sedang berjalan', sub: 'Kamu ikut di ronde berikutnya!' } };
      return { l: spec.layout || 'pad', data: { ...(spec.ctrl || {}), game: spec.name } };
    },
    destroy() {
      cancelAnimationFrame(raf); removeEventListener('resize', layout);
      nav.gameMode = false; nav.onStart = null; spec.destroy?.(G);
      delete window.__g2d;
    }
  };
}

function blank() { return { x: 0, y: 0, a: false, b: false, gas: false, brake: false, l: false, r: false, steer: 0, k: [false, false, false, false] }; }

export function rr(ctx, x, y, w, hh, r) {
  r = Math.min(r, w / 2, hh / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hh, r); ctx.arcTo(x + w, y + hh, x, y + hh, r);
  ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export function defaultBg(b, c1 = '#2b1c66', c2 = '#120c2c') {
  const g = b.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  b.fillStyle = g; b.fillRect(0, 0, W, H);
  b.fillStyle = 'rgba(255,255,255,.05)';
  for (let y = 0; y < H; y += 48) for (let x = (y / 48) % 2 ? 24 : 0; x < W; x += 48) { b.beginPath(); b.arc(x, y, 2.5, 0, 6.283); b.fill(); }
}

// Arena floor with border used by many top-down games.
export function arenaBg(b, { floor = '#3a2c86', line = '#5a48b8', border = '#ffd23f', grass = '#1f1650', pad = 70, tiles = true } = {}) {
  b.fillStyle = grass; b.fillRect(0, 0, W, H);
  b.fillStyle = 'rgba(255,255,255,.04)';
  for (let y = 0; y < H; y += 36) for (let x = (y / 36) % 2 ? 18 : 0; x < W; x += 36) b.fillRect(x, y, 3, 3);
  rr(b, pad - 10, pad - 10 + 30, W - (pad - 10) * 2, H - (pad - 10) * 2 - 30, 34); b.fillStyle = '#0b0720'; b.fill();
  rr(b, pad, pad + 30, W - pad * 2, H - pad * 2 - 30, 26); b.fillStyle = floor; b.fill();
  if (tiles) {
    b.save(); rr(b, pad, pad + 30, W - pad * 2, H - pad * 2 - 30, 26); b.clip();
    b.strokeStyle = line; b.lineWidth = 2;
    for (let x = pad; x < W - pad; x += 60) { b.beginPath(); b.moveTo(x, pad + 30); b.lineTo(x, H - pad); b.stroke(); }
    for (let y = pad + 30; y < H - pad; y += 60) { b.beginPath(); b.moveTo(pad, y); b.lineTo(W - pad, y); b.stroke(); }
    const g = b.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 700); g.addColorStop(0, 'rgba(255,255,255,.08)'); g.addColorStop(1, 'rgba(0,0,0,.25)');
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    b.restore();
  }
  rr(b, pad, pad + 30, W - pad * 2, H - pad * 2 - 30, 26); b.strokeStyle = border; b.lineWidth = 6; b.stroke();
  return { x0: pad, y0: pad + 30, x1: W - pad, y1: H - pad };
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// steer a bot toward a point, returns {x,y} unit-ish vector
export function toward(from, to, wob = 0, t = 0) {
  let dx = to.x - from.x, dy = to.y - from.y;
  const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  if (wob) { const s = Math.sin(t * 3) * wob; return { x: dx - dy * s, y: dy + dx * s }; }
  return { x: dx, y: dy };
}
// draws a sprite centred, with optional scale/rotation
export function spr(ctx, img, x, y, w, hh = w, rot = 0) {
  if (!img) return;
  if (rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(img, -w / 2, -hh / 2, w, hh); ctx.restore(); }
  else ctx.drawImage(img, x - w / 2, y - hh / 2, w, hh);
}
export function shadow(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y, w / 2, w / 6, 0, 0, 6.283); ctx.fill();
}

// ------------------------------------------------------------ top-down body physics
export function moveBody(e, inp, dt, { acc = 2600, max = 360, damp = 0.0008 } = {}) {
  const m = Math.min(1, Math.hypot(inp.x, inp.y));
  if (m > 0.1) { e.vx += (inp.x / (Math.hypot(inp.x, inp.y) || 1)) * m * acc * dt; e.vy += (inp.y / (Math.hypot(inp.x, inp.y) || 1)) * m * acc * dt; e.face = Math.atan2(inp.y, inp.x); }
  const k = Math.pow(damp, dt); e.vx *= k; e.vy *= k;
  const s = Math.hypot(e.vx, e.vy), lim = e.boost > 0 ? max * 2.2 : max;
  if (s > lim) { e.vx *= lim / s; e.vy *= lim / s; }
  e.x += e.vx * dt; e.y += e.vy * dt;
}
export function keepIn(e, b, r) {
  if (e.x < b.x0 + r) { e.x = b.x0 + r; e.vx = Math.abs(e.vx) * 0.4; }
  if (e.x > b.x1 - r) { e.x = b.x1 - r; e.vx = -Math.abs(e.vx) * 0.4; }
  if (e.y < b.y0 + r) { e.y = b.y0 + r; e.vy = Math.abs(e.vy) * 0.4; }
  if (e.y > b.y1 - r) { e.y = b.y1 - r; e.vy = -Math.abs(e.vy) * 0.4; }
}
export function collideAll(list, r, bounce = 1, onHit) {
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d < r * 2 && d > 0.01) {
      const nx = dx / d, ny = dy / d, o = (r * 2 - d) / 2;
      a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o;
      const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rv < 0) {
        const ma = a.boost > 0 ? 2.5 : 1, mb = b.boost > 0 ? 2.5 : 1;
        const j2 = -(1 + bounce) * rv / (1 / ma + 1 / mb);
        a.vx -= j2 / ma * nx; a.vy -= j2 / ma * ny; b.vx += j2 / mb * nx; b.vy += j2 / mb * ny;
        onHit?.(a, b, -rv);
      }
    }
  }
}
// Draws a player blob with shadow, bob and facing squash.
export function drawBlob(G, ctx, e, size, mood) {
  const sp = Math.hypot(e.vx || 0, e.vy || 0);
  const bob = G.lite ? 0 : Math.abs(Math.sin(G.t * 12 + e.i)) * Math.min(1, sp / 200) * 6;
  shadow(ctx, e.x, e.y + size * 0.42, size * 0.9);
  const img = G.blob(e, mood || (e.stun > 0 ? 'wow' : 'happy'));
  spr(ctx, img, e.x, e.y - bob, size, size);
}
