// Ular Rebutan · Garis Cahaya · Tank Tempur
import { W, H, rr, spr, shadow, clamp, game2d } from './engine.js';

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
function stickDir(inp) {
  const { x, y } = inp;
  if (Math.max(Math.abs(x), Math.abs(y)) < 0.45) return null;
  return Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up');
}
const opposite = (a, b) => a && b && DIRS[a][0] === -DIRS[b][0] && DIRS[a][1] === -DIRS[b][1];

// ============================================================ ULAR REBUTAN (snake)
const SC = 40, SCOLS = 32, SROWS = 15, SY = 100;
export const snake = game2d({
  id: 'snake', name: 'Ular Rebutan', music: 'music_sumo', time: 90, fill: 2, layout: 'pad', ctrl: { a: null, hint: 'Arahkan ularmu' },
  help: 'Makan buah sebanyak-banyaknya! Jangan tabrak dinding, ular lain, atau badanmu sendiri.',
  controls: 'Stik / joystick: belok  ·  🍎 +1  🍇 +1  ⭐ apel emas +3',
  sprites: () => ['apple', 'grape', 'goldfruit', 'strawberry'],
  bg(G, b) {
    for (let r = 0; r < SROWS; r++) for (let c = 0; c < SCOLS; c++) { b.fillStyle = (r + c) % 2 ? '#5fd06b' : '#6bdc77'; b.fillRect(c * SC, SY + r * SC, SC, SC); }
    b.fillStyle = '#2e8f45'; b.fillRect(0, 0, W, SY); b.fillRect(0, SY + SROWS * SC, W, H);
    b.fillStyle = 'rgba(255,255,255,.08)'; for (let x = 0; x < W; x += 30) b.fillRect(x, 70, 14, 6);
    b.strokeStyle = '#0b0720'; b.lineWidth = 6; b.strokeRect(3, SY, W - 6, SROWS * SC);
  },
  setup(G) {
    G.fruits = []; G.stepT = 0;
    const starts = [[4, 3, 'right'], [27, 11, 'left'], [4, 11, 'right'], [27, 3, 'left']];
    G.ents.forEach((e, k) => spawn(G, e, starts[k]));
    for (let k = 0; k < 6; k++) addFruit(G);
  },
  update(G, dt) {
    for (const e of G.ents) {
      const d = stickDir(e.in);
      if (d && !opposite(d, e.d.dir)) e.d.next = d;
      if (!e.alive) { e.d.respawn -= dt; if (e.d.respawn <= 0) { spawn(G, e); } }
    }
    G.stepT += dt;
    const step = Math.max(0.085, 0.13 - (90 - G.timeLeft) * 0.0004);
    if (G.stepT < step) return;
    G.stepT = 0;
    const occ = new Map();
    G.ents.forEach(e => e.alive && e.d.body.forEach((s, k) => occ.set(s.c + ',' + s.r, { e, k })));
    const heads = [];
    for (const e of G.ents) {
      if (!e.alive) continue;
      e.d.dir = e.d.next;
      const [dx, dy] = DIRS[e.d.dir];
      const h0 = e.d.body[0];
      heads.push({ e, c: h0.c + dx, r: h0.r + dy });
    }
    for (const hd of heads) {
      const { e, c, r } = hd;
      let dead = c < 0 || r < 0 || c >= SCOLS || r >= SROWS;
      const hit = occ.get(c + ',' + r);
      if (hit && !(hit.e === e && hit.k === e.d.body.length - 1 && !e.d.grow)) dead = true;
      if (heads.some(o => o !== hd && o.c === c && o.r === r)) dead = true;
      if (dead) { kill(G, e); continue; }
      e.d.body.unshift({ c, r });
      const f = G.fruits.findIndex(q => q.c === c && q.r === r);
      if (f >= 0) {
        const fr = G.fruits[f]; G.fruits.splice(f, 1);
        e.score += fr.v; e.d.grow += fr.v;
        G.sfxv(fr.v > 1 ? 'roundwin' : 'lock'); G.buzz(e);
        G.float(c * SC + 20, SY + r * SC, '+' + fr.v, fr.v > 1 ? '#ffd23f' : '#fff');
        addFruit(G);
      }
      if (e.d.grow > 0) e.d.grow--; else e.d.body.pop();
    }
  },
  bot(G, e) {
    if (!e.alive) return {};
    const h0 = e.d.body[0];
    const occ = new Set();
    G.ents.forEach(o => o.alive && o.d.body.forEach(s => occ.add(s.c + ',' + s.r)));
    let tgt = null, bd = 1e9;
    for (const f of G.fruits) { const d = Math.abs(f.c - h0.c) + Math.abs(f.r - h0.r); if (d < bd) { bd = d; tgt = f; } }
    let best = null, bs = -1e9;
    for (const k of Object.keys(DIRS)) {
      if (opposite(k, e.d.dir)) continue;
      const c = h0.c + DIRS[k][0], r = h0.r + DIRS[k][1];
      if (c < 0 || r < 0 || c >= SCOLS || r >= SROWS || occ.has(c + ',' + r)) continue;
      let free = 0;
      for (const k2 of Object.keys(DIRS)) { const c2 = c + DIRS[k2][0], r2 = r + DIRS[k2][1]; if (c2 >= 0 && r2 >= 0 && c2 < SCOLS && r2 < SROWS && !occ.has(c2 + ',' + r2)) free++; }
      const s = (tgt ? -(Math.abs(tgt.c - c) + Math.abs(tgt.r - r)) : 0) + free * 3 + Math.random();
      if (s > bs) { bs = s; best = k; }
    }
    const v = DIRS[best || e.d.dir];
    return { x: v[0], y: v[1] };
  },
  draw(G, ctx) {
    for (const f of G.fruits) spr(ctx, G.sprite(f.k), f.c * SC + 20, SY + f.r * SC + 20 + (G.lite ? 0 : Math.sin(G.t * 4 + f.c) * 2), 36);
    for (const e of G.ents) {
      if (!e.alive) continue;
      const b = e.d.body;
      for (let k = b.length - 1; k >= 1; k--) {
        const x = b[k].c * SC + 20, y = SY + b[k].r * SC + 20;
        ctx.fillStyle = '#0b0720'; ctx.beginPath(); ctx.arc(x, y, 18, 0, 6.283); ctx.fill();
        ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(x, y, 14.5, 0, 6.283); ctx.fill();
        if (k % 2) { ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(x - 4, y - 5, 5, 0, 6.283); ctx.fill(); }
      }
      const hx = b[0].c * SC + 20, hy = SY + b[0].r * SC + 20;
      spr(ctx, G.blob(e), hx, hy, 50);
    }
  }
});
function spawn(G, e, start) {
  let c, r, dir;
  if (start) [c, r, dir] = start;
  else {
    const occ = new Set(); G.ents.forEach(o => o.alive && o.d.body.forEach(s => occ.add(s.c + ',' + s.r)));
    for (let k = 0; k < 50; k++) { c = G.randi(4, SCOLS - 5); r = G.randi(2, SROWS - 3); if (!occ.has(c + ',' + r)) break; }
    dir = c < SCOLS / 2 ? 'right' : 'left';
  }
  const dx = DIRS[dir][0];
  e.d = { body: [{ c, r }, { c: c - dx, r }, { c: c - 2 * dx, r }], dir, next: dir, grow: 0, respawn: 0 };
  e.alive = true;
}
function kill(G, e) {
  e.alive = false; e.d.respawn = 2;
  const h0 = e.d.body[0];
  G.burst(h0.c * SC + 20, SY + h0.r * SC + 20, e.color, 18);
  G.sfx('bump'); G.buzz(e, 'heavy');
}
function addFruit(G) {
  const occ = new Set(); G.ents.forEach(o => o.alive && o.d?.body.forEach(s => occ.add(s.c + ',' + s.r)));
  G.fruits.forEach(f => occ.add(f.c + ',' + f.r));
  for (let k = 0; k < 60; k++) {
    const c = G.randi(1, SCOLS - 2), r = G.randi(1, SROWS - 2);
    if (occ.has(c + ',' + r)) continue;
    const gold = Math.random() < 0.12;
    G.fruits.push({ c, r, v: gold ? 3 : 1, k: gold ? 'goldfruit' : G.pick(['apple', 'grape', 'strawberry']) });
    return;
  }
}

// ============================================================ GARIS CAHAYA (light cycles)
const TC = 16, TCOLS = 80, TROWS = 38, TY = 86;
export const tron = game2d({
  id: 'tron', name: 'Garis Cahaya', music: 'music_kart', fill: 2, layout: 'pad', ctrl: { a: 'TURBO', hint: 'Belok dengan joystick' },
  help: 'Motor cahaya meninggalkan jejak. Jangan menabrak jejak siapa pun! Bertahan paling lama untuk menang ronde. Juara: 3 ronde.',
  controls: 'Stik: belok  ·  ✕ / TURBO: ngebut sebentar',
  label: e => `${e.score} ronde`,
  hudValue: e => '★'.repeat(e.score) || '0',
  bg(G, b) {
    b.fillStyle = '#0a0620'; b.fillRect(0, 0, W, H);
    b.strokeStyle = 'rgba(45,226,230,.12)'; b.lineWidth = 1;
    for (let x = 0; x <= TCOLS; x += 4) { b.beginPath(); b.moveTo(x * TC, TY); b.lineTo(x * TC, TY + TROWS * TC); b.stroke(); }
    for (let y = 0; y <= TROWS; y += 4) { b.beginPath(); b.moveTo(0, TY + y * TC); b.lineTo(W, TY + y * TC); b.stroke(); }
    b.strokeStyle = '#2de2e6'; b.lineWidth = 4; b.strokeRect(2, TY, W - 4, TROWS * TC);
  },
  setup(G) { G.trail = document.createElement('canvas'); G.trail.width = W; G.trail.height = H; round(G); },
  update(G, dt) {
    if (G.d.pause > 0) { G.d.pause -= dt; if (G.d.pause <= 0) { if (G.ents.some(e => e.score >= 3)) return G.end(); round(G); } return; }
    for (const e of G.ents) {
      if (!e.alive) continue;
      const d = stickDir(e.in);
      if (d && !opposite(d, e.d.dir)) e.d.next = d;
      if (G.tap(e, 'a') && e.d.turbo <= 0 && e.d.cd <= 0) { e.d.turbo = 0.8; e.d.cd = 4; G.sfx('boost', { volume: 0.5 }); }
      e.d.turbo -= dt; e.d.cd -= dt;
      e.d.acc += dt * (e.d.turbo > 0 ? 2 : 1);
    }
    const step = 0.05;
    let moved = true;
    while (moved) {
      moved = false;
      for (const e of G.ents) {
        if (!e.alive || e.d.acc < step) continue;
        e.d.acc -= step; moved = true;
        e.d.dir = e.d.next;
        const [dx, dy] = DIRS[e.d.dir];
        const c = e.d.c + dx, r = e.d.r + dy;
        if (c < 0 || r < 0 || c >= TCOLS || r >= TROWS || G.d.grid[r * TCOLS + c]) {
          e.alive = false; G.burst(e.d.c * TC + 8, TY + e.d.r * TC + 8, e.color, 20); G.sfx('hit'); G.buzz(e, 'heavy'); G.shake = 0.4;
          continue;
        }
        e.d.c = c; e.d.r = r; G.d.grid[r * TCOLS + c] = e.i + 1;
        paint(G, e, c, r);
      }
    }
    const alive = G.alive;
    if (alive.length <= 1 && G.ents.length > 1 || alive.length === 0) {
      const w = alive[0];
      if (w) { w.score++; G.toast(`${w.name} menang ronde!`); G.sfx('roundwin'); G.buzz(w, 'success'); } else G.toast('Seri!');
      G.d.pause = 2.2;
    }
  },
  bot(G, e) {
    if (!e.alive) return {};
    const free = k => {
      const [dx, dy] = DIRS[k]; let n = 0, c = e.d.c, r = e.d.r;
      while (n < 30) { c += dx; r += dy; if (c < 0 || r < 0 || c >= TCOLS || r >= TROWS || G.d.grid[r * TCOLS + c]) break; n++; }
      return n;
    };
    let best = e.d.dir, bs = free(e.d.dir) + (Math.random() < 0.03 ? -20 : 4);
    for (const k of Object.keys(DIRS)) { if (opposite(k, e.d.dir) || k === e.d.dir) continue; const s = free(k) + Math.random() * 2; if (s > bs) { bs = s; best = k; } }
    return { x: DIRS[best][0], y: DIRS[best][1], a: Math.random() < 0.01 };
  },
  draw(G, ctx) {
    ctx.drawImage(G.trail, 0, 0, W, H);
    for (const e of G.ents) {
      if (!e.alive) continue;
      const x = e.d.c * TC + 8, y = TY + e.d.r * TC + 8;
      ctx.fillStyle = e.color; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(x, y, 22, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
      spr(ctx, G.blob(e, e.d.turbo > 0 ? 'cool' : 'happy'), x, y, 38);
    }
  }
});
function round(G) {
  G.d = { grid: new Uint8Array(TCOLS * TROWS), pause: 0 };
  const t = G.trail.getContext('2d'); t.clearRect(0, 0, W, H);
  const st = [[10, 8, 'right'], [69, 29, 'left'], [10, 29, 'right'], [69, 8, 'left']];
  G.ents.forEach((e, k) => { const [c, r, dir] = st[k]; e.alive = true; e.d = { c, r, dir, next: dir, acc: 0, turbo: 0, cd: 0 }; G.d.grid[r * TCOLS + c] = e.i + 1; paint(G, e, c, r); });
}
function paint(G, e, c, r) {
  const t = G.trail.getContext('2d');
  t.fillStyle = e.color; t.fillRect(c * TC + 2, TY + r * TC + 2, TC - 4, TC - 4);
  t.fillStyle = 'rgba(255,255,255,.45)'; t.fillRect(c * TC + 5, TY + r * TC + 5, TC - 10, TC - 10);
}

// ============================================================ TANK TEMPUR
const T = 64;
const MAP = [
  '....................',
  '....................',
  '..##....#..#....##..',
  '..#..............#..',
  '.......##..##.......',
  '....#..........#....',
  '....#..........#....',
  '.......##..##.......',
  '..#..............#..',
  '..##....#..#....##..'
];
const TY0 = 80;
export const tanks = game2d({
  id: 'tanks', name: 'Tank Tempur', music: 'music_kart', time: 120, fill: 2, layout: 'pad', ctrl: { a: 'TEMBAK', hint: 'Gerak & tembak' },
  help: 'Tembak tank lawan! Peluru memantul sekali dari tembok. Tiap tank punya 3 nyawa. Paling banyak kena tembak = juara.',
  controls: 'Stik: jalan & arah meriam  ·  ✕ / TEMBAK',
  label: e => `${e.score} tembakan kena`,
  order: G => rank(G),
  sprites: G => [...G.ents.flatMap(e => [`tank:${e.color}`, `turret:${e.color}`]), 'wall', 'boom', 'heart'],
  bg(G, b) {
    b.fillStyle = '#c9a66b'; b.fillRect(0, 0, W, H);
    for (let k = 0; k < 500; k++) { b.fillStyle = Math.random() < .5 ? 'rgba(120,80,30,.15)' : 'rgba(255,240,200,.15)'; b.beginPath(); b.arc(Math.random() * W, Math.random() * H, 2 + Math.random() * 6, 0, 6.283); b.fill(); }
    b.fillStyle = '#7a5a2c'; b.fillRect(0, 0, W, TY0);
    MAP.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') b.drawImage(G.sprite('wall'), c * T, TY0 + r * T, T, T); }));
  },
  setup(G) {
    G.bullets = []; G.d = { booms: [] };
    G.walls = [];
    MAP.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') G.walls.push({ x0: c * T, y0: TY0 + r * T, x1: c * T + T, y1: TY0 + r * T + T }); }));
    G.spawns = [[100, 150], [1180, 680], [1180, 150], [100, 680]];
    G.ents.forEach((e, k) => { e.lives = 3; respawnTank(G, e, k); });
  },
  update(G, dt) {
    for (const e of G.ents) {
      if (!e.alive) continue;
      e.inv -= dt; e.cd -= dt;
      const m = Math.hypot(e.in.x, e.in.y);
      if (m > 0.2) { e.face = Math.atan2(e.in.y, e.in.x); e.x += Math.cos(e.face) * 230 * Math.min(1, m) * dt; e.y += Math.sin(e.face) * 230 * Math.min(1, m) * dt; e.moving = true; } else e.moving = false;
      e.x = clamp(e.x, 28, W - 28); e.y = clamp(e.y, TY0 + 28, H - 28);
      for (const w of G.walls) pushOut(e, w, 26);
      if (e.in.a && e.cd <= 0 && G.bullets.filter(b => b.e === e).length < 3) {
        e.cd = 0.45;
        G.bullets.push({ e, x: e.x + Math.cos(e.face) * 40, y: e.y + Math.sin(e.face) * 40, vx: Math.cos(e.face) * 620, vy: Math.sin(e.face) * 620, bounce: 1, life: 2.4 });
        G.sfxv('shoot', { volume: 0.5 }); e.recoil = 1;
      }
      e.recoil = Math.max(0, (e.recoil || 0) - dt * 6);
    }
    for (const b of G.bullets) {
      b.life -= dt;
      const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
      let hitX = nx < 0 || nx > W, hitY = ny < TY0 || ny > H;
      for (const w of G.walls) if (nx > w.x0 && nx < w.x1 && ny > w.y0 && ny < w.y1) { if (b.x > w.x0 && b.x < w.x1) hitY = true; else hitX = true; }
      if (hitX || hitY) { if (b.bounce-- <= 0) { b.life = 0; G.burst(b.x, b.y, '#ffd23f', 5, 120); continue; } if (hitX) b.vx = -b.vx; if (hitY) b.vy = -b.vy; G.sfx('tick'); }
      else { b.x = nx; b.y = ny; }
      for (const e of G.ents) {
        if (!e.alive || e.inv > 0 || (e === b.e && b.life > 2.3)) continue;
        if (Math.hypot(e.x - b.x, e.y - b.y) < 30) {
          b.life = 0; e.lives--; if (b.e !== e) b.e.score++;
          G.burst(e.x, e.y, '#ff7a1f', 22, 300); G.shake = 0.5; G.sfx('fall'); G.buzz(e, 'heavy'); G.buzz(b.e, 'medium');
          G.d.booms.push({ x: e.x, y: e.y, t: 0 });
          if (e.lives <= 0) { e.alive = false; G.toast(`${e.name} kalah!`); } else respawnTank(G, e, e.i);
        }
      }
    }
    G.bullets = G.bullets.filter(b => b.life > 0);
    G.d.booms = G.d.booms.filter(x => (x.t += dt) < 0.5);
    if (G.alive.length <= 1 && G.ents.length > 1) G.end(rank(G));
  },
  bot(G, e) {
    let tgt = null, bd = 1e9;
    for (const o of G.ents) if (o !== e && o.alive) { const d = Math.hypot(o.x - e.x, o.y - e.y); if (d < bd) { bd = d; tgt = o; } }
    if (!tgt) return {};
    const ang = Math.atan2(tgt.y - e.y, tgt.x - e.x);
    const diff = Math.abs(Math.atan2(Math.sin(ang - e.face), Math.cos(ang - e.face)));
    const strafe = bd < 260 ? ang + Math.PI / 2 * (e.i % 2 ? 1 : -1) : ang;
    const wob = Math.sin(G.t * 2 + e.i) * 0.6;
    const go = bd > 200 || diff > 0.3;
    const a = diff > 0.25 ? ang : strafe + wob;
    return { x: go ? Math.cos(a) : Math.cos(ang) * 0.25, y: go ? Math.sin(a) : Math.sin(ang) * 0.25, a: diff < 0.2 && Math.random() < 0.08 };
  },
  hudValue: e => `${e.score} · ${'♥'.repeat(Math.max(0, e.lives ?? 3))}`,
  draw(G, ctx) {
    for (const b of G.bullets) { ctx.fillStyle = '#0b0720'; ctx.beginPath(); ctx.arc(b.x, b.y, 8, 0, 6.283); ctx.fill(); ctx.fillStyle = b.e.color; ctx.beginPath(); ctx.arc(b.x, b.y, 5.5, 0, 6.283); ctx.fill(); }
    for (const e of G.ents) {
      if (!e.alive) continue;
      if (e.inv > 0 && Math.floor(G.t * 10) % 2) continue;
      shadow(ctx, e.x + 4, e.y + 30, 60);
      spr(ctx, G.sprite(`tank:${e.color}`), e.x, e.y, 64, 64, e.face + Math.PI / 2);
      const rc = (e.recoil || 0) * 5;
      spr(ctx, G.sprite(`turret:${e.color}`), e.x - Math.cos(e.face) * rc, e.y - Math.sin(e.face) * rc, 64, 64, e.face + Math.PI / 2);
      ctx.font = '700 16px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#0b0720'; ctx.fillText(e.name, e.x, e.y - 44);
    }
    for (const x of G.d.booms) spr(ctx, G.sprite('boom'), x.x, x.y, 60 + x.t * 160);
  }
});
function respawnTank(G, e, k) { const [x, y] = G.spawns[k % 4]; Object.assign(e, { x, y, face: x < W / 2 ? 0 : Math.PI, inv: G.t > 1 ? 2 : 0.3, cd: 0.5 }); G.d.booms ||= []; }
function pushOut(e, w, r) {
  const cx = clamp(e.x, w.x0, w.x1), cy = clamp(e.y, w.y0, w.y1);
  const dx = e.x - cx, dy = e.y - cy, d = Math.hypot(dx, dy);
  if (d < r && d > 0.001) { e.x = cx + dx / d * r; e.y = cy + dy / d * r; }
  else if (d === 0) { e.y = w.y0 - r; }
}
function rank(G) { return [...G.ents].sort((a, b) => (b.alive - a.alive) || (b.lives - a.lives) || (b.score - a.score)); }
void rr;
