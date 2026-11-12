// Cat Wilayah · Bom Panas · Labirin Harta · Ingat Warna · Hitung Cepat · Panahan
import { W, H, rr, spr, shadow, clamp, game2d, arenaBg, defaultBg, moveBody, keepIn, collideAll, drawBlob, toward } from './engine.js';
import { SHAPES } from '../ui/dom.js';

// ============================================================ CAT WILAYAH
const PC = 60, PCOLS = 19, PROWS = 9, PX = (W - PCOLS * PC) / 2, PY = 100;
export const paint = game2d({
  id: 'paint', name: 'Cat Wilayah', music: 'music_lobby', time: 60, fill: 2, layout: 'pad', ctrl: { a: 'BOM CAT', hint: 'Warnai lantai!' },
  help: 'Jalan untuk mewarnai lantai dengan warnamu. Lempar bom cat untuk mewarnai area besar. Wilayah terluas menang!',
  controls: 'Stik: jalan  ·  ✕ / BOM CAT: cat area 3×3 (tunggu isi ulang)',
  hudValue: e => `${e.score} petak`,
  label: e => `${e.score} petak`,
  sprites: G => G.ents.map(e => `splat:${e.color}`),
  bg(G, b) {
    defaultBg(b, '#2a2068', '#120c2c');
    rr(b, PX - 12, PY - 12, PCOLS * PC + 24, PROWS * PC + 24, 24); b.fillStyle = '#0b0720'; b.fill();
    for (let r = 0; r < PROWS; r++) for (let c = 0; c < PCOLS; c++) { b.fillStyle = (r + c) % 2 ? '#e9e4ff' : '#dcd5fb'; b.fillRect(PX + c * PC, PY + r * PC, PC, PC); }
  },
  setup(G) {
    G.own = new Int8Array(PCOLS * PROWS).fill(-1);
    G.layer = document.createElement('canvas'); G.layer.width = W; G.layer.height = H;
    const st = [[PX + 80, PY + 80], [W - PX - 80, PY + PROWS * PC - 80], [W - PX - 80, PY + 80], [PX + 80, PY + PROWS * PC - 80]];
    G.ents.forEach((e, k) => Object.assign(e, { x: st[k][0], y: st[k][1], vx: 0, vy: 0, cd: 1, boost: 0 }));
  },
  update(G, dt) {
    for (const e of G.ents) {
      e.cd -= dt;
      moveBody(e, e.in, dt, { max: 300 });
      keepIn(e, { x0: PX, y0: PY, x1: PX + PCOLS * PC, y1: PY + PROWS * PC }, 22);
      const c = Math.floor((e.x - PX) / PC), r = Math.floor((e.y - PY) / PC);
      paintTile(G, e, c, r);
      if (G.tap(e, 'a') && e.cd <= 0) {
        e.cd = 3.5; G.sfxv('hit', { volume: 0.6 }); G.buzz(e, 'medium');
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) paintTile(G, e, c + dx, r + dy);
        G.burst(e.x, e.y, e.color, 18, 300);
      }
    }
    collideAll(G.ents, 24, 0.5);
    G.ents.forEach(e => (e.score = 0));
    for (const o of G.own) if (o >= 0) G.ents[o].score++;
  },
  bot(G, e) {
    if (!e.data.t || G.t > e.data.until || Math.hypot(e.x - e.data.t.x, e.y - e.data.t.y) < 30) {
      let best = null, bs = -1;
      for (let k = 0; k < 12; k++) {
        const c = G.randi(0, PCOLS - 1), r = G.randi(0, PROWS - 1);
        const s = (G.own[r * PCOLS + c] !== e.i ? 2 : 0) - Math.hypot(PX + c * PC - e.x, PY + r * PC - e.y) / 400 + Math.random();
        if (s > bs) { bs = s; best = { x: PX + c * PC + 30, y: PY + r * PC + 30 }; }
      }
      e.data.t = best; e.data.until = G.t + 2.5;
    }
    return { ...toward(e, e.data.t), a: Math.random() < 0.01 };
  },
  draw(G, ctx) {
    ctx.drawImage(G.layer, 0, 0, W, H);
    for (const e of G.ents) {
      drawBlob(G, ctx, e, 56);
      if (e.cd <= 0) { ctx.strokeStyle = e.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(e.x, e.y + 4, 36, 0, 6.283); ctx.stroke(); }
    }
    // share bar
    let x = 140; const total = PCOLS * PROWS;
    for (const e of G.ents) { const w = (e.score / total) * 1000; ctx.fillStyle = e.color; ctx.fillRect(x, 676, w, 22); x += w; }
    ctx.strokeStyle = '#0b0720'; ctx.lineWidth = 4; ctx.strokeRect(140, 676, 1000, 22);
  }
});
function paintTile(G, e, c, r) {
  if (c < 0 || r < 0 || c >= PCOLS || r >= PROWS) return;
  const k = r * PCOLS + c;
  if (G.own[k] === e.i) return;
  G.own[k] = e.i;
  const l = G.layer.getContext('2d');
  l.fillStyle = e.color; l.fillRect(PX + c * PC, PY + r * PC, PC, PC);
  l.drawImage(G.sprite(`splat:${e.color}`), PX + c * PC - 8, PY + r * PC - 8, PC + 16, PC + 16);
  l.fillStyle = 'rgba(255,255,255,.18)'; l.fillRect(PX + c * PC + 6, PY + r * PC + 6, 18, 8);
}

// ============================================================ BOM PANAS
export const hotbomb = game2d({
  id: 'hotbomb', name: 'Bom Panas', music: 'music_sumo', fill: 3, layout: 'pad', ctrl: { a: 'DASH', hint: 'Oper bomnya!' },
  help: 'Satu pemain memegang bom yang bisa meledak kapan saja! Sentuh pemain lain untuk mengoper bom. Bertahan sampai terakhir.',
  controls: 'Stik: lari  ·  ✕ / DASH: lari cepat',
  hudValue: e => e.alive ? (e.hot ? '💣' : 'aman') : 'meledak',
  label: e => e.alive ? 'selamat!' : 'meledak',
  sprites: () => ['bomb', 'boom'],
  bg(G, b) { G.B = arenaBg(b, { floor: '#6b3a2c', line: '#7d4a38', grass: '#2b120d', border: '#ff7a1f' }); },
  setup(G) {
    G.B ||= { x0: 70, y0: 100, x1: 1210, y1: 650 }; G.out = []; G.booms = [];
    const n = G.ents.length;
    G.ents.forEach((e, k) => Object.assign(e, { x: W / 2 + Math.cos(k / n * 6.283) * 240, y: 380 + Math.sin(k / n * 6.283) * 160, vx: 0, vy: 0, cd: 0, boost: 0, hot: false, pass: 0 }));
    newBomb(G);
  },
  update(G, dt) {
    if (G.wait > 0) { G.wait -= dt; if (G.wait <= 0) newBomb(G); }
    else {
      G.fuse -= dt;
      G.beep -= dt;
      if (G.beep <= 0) { G.beep = clamp(G.fuse / 6, 0.1, 0.8); G.sfx('tick'); }
      if (G.fuse <= 0) {
        const h0 = G.ents.find(e => e.hot);
        if (h0) { h0.alive = false; h0.hot = false; G.out.unshift(h0); G.booms.push({ x: h0.x, y: h0.y, t: 0 }); G.sfx('fall'); G.shake = 0.8; G.buzz(h0, 'heavy'); G.toast(`DUAR! ${h0.name} meledak!`); G.burst(h0.x, h0.y, '#ff7a1f', 30, 400); }
        G.wait = 1.6;
      }
    }
    for (const e of G.ents) {
      if (!e.alive) continue;
      e.cd -= dt; e.boost -= dt; e.pass -= dt;
      if (G.tap(e, 'a') && e.cd <= 0) { e.boost = 0.3; e.cd = 1.5; const a = e.face || 0; e.vx += Math.cos(a) * 400; e.vy += Math.sin(a) * 400; G.sfx('dash', { volume: 0.4 }); }
      moveBody(e, e.in, dt, { max: e.hot ? 360 : 320 });
      keepIn(e, G.B, 26);
    }
    collideAll(G.alive, 28, 0.9, (a, b) => {
      const [h0, o] = a.hot ? [a, b] : b.hot ? [b, a] : [null, null];
      if (h0 && h0.pass <= 0) { h0.hot = false; o.hot = true; o.pass = 0.6; G.sfx('select'); G.buzz(o, 'heavy'); G.buzz(h0, 'light'); }
    });
    G.booms = G.booms.filter(b => (b.t += dt) < 0.5);
    if (G.alive.length <= 1 && G.wait > 0) G.end([...G.alive, ...G.out]);
  },
  bot(G, e) {
    const h0 = G.ents.find(x => x.hot);
    if (!h0) return toward(e, { x: W / 2, y: 380 }, 0.4, G.t + e.i);
    if (h0 === e) {
      let tgt = null, bd = 1e9;
      for (const o of G.alive) if (o !== e) { const d = Math.hypot(o.x - e.x, o.y - e.y); if (d < bd) { bd = d; tgt = o; } }
      return tgt ? { ...toward(e, tgt), a: bd < 180 && Math.random() < 0.05 } : {};
    }
    const away = toward(h0, e, 0.5, G.t + e.i);
    const cx = (W / 2 - e.x) / 600, cy = (380 - e.y) / 400;
    return { x: away.x + cx, y: away.y + cy, a: Math.hypot(h0.x - e.x, h0.y - e.y) < 120 && Math.random() < 0.05 };
  },
  draw(G, ctx) {
    for (const e of G.ents) {
      if (!e.alive) continue;
      drawBlob(G, ctx, e, 60, e.hot ? 'wow' : 'happy');
      if (e.hot) {
        const s = 52 + (G.lite ? 0 : Math.sin(G.t * (12 - G.fuse)) * 5);
        spr(ctx, G.sprite('bomb'), e.x + 4, e.y - 50, s);
        ctx.fillStyle = 'rgba(255,61,31,.25)'; ctx.beginPath(); ctx.arc(e.x, e.y, 46, 0, 6.283); ctx.fill();
      }
      ctx.font = '700 15px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(e.name, e.x, e.y + 48);
    }
    for (const b of G.booms) spr(ctx, G.sprite('boom'), b.x, b.y, 160 + b.t * 260);
  }
});
function newBomb(G) {
  const list = G.alive;
  if (list.length <= 1) return;
  G.ents.forEach(e => (e.hot = false));
  const h0 = G.pick(list); h0.hot = true; h0.pass = 1;
  G.fuse = G.rand(9, 16); G.beep = 0; G.wait = 0;
  G.toast(`${h0.name} pegang bom!`, 1200); G.buzz(h0, 'heavy');
}

// ============================================================ LABIRIN HARTA
const MC = 48, MCOLS = 25, MROWS = 13, MX = (W - MCOLS * MC) / 2, MY = 84;
export const maze = game2d({
  id: 'maze', name: 'Labirin Harta', music: 'music_quiz', fill: 2, layout: 'pad', ctrl: { a: null, hint: 'Cari jalan ke harta!' },
  help: 'Labirin acak di tiap ronde. Siapa duluan sampai ke peti harta di tengah dapat 1 poin. 3 ronde!',
  controls: 'Stik / D-pad: jalan per kotak',
  label: e => `${e.score} harta`,
  sprites: () => ['chest', 'star'],
  setup(G) { G.round = 0; G.layer = document.createElement('canvas'); G.layer.width = W; G.layer.height = H; newMaze(G); },
  update(G, dt) {
    if (G.pause > 0) { G.pause -= dt; if (G.pause <= 0) { if (G.round >= 3) return G.end(); newMaze(G); } return; }
    for (const e of G.ents) {
      e.cd -= dt;
      e.px += (e.c * MC + MC / 2 + MX - e.px) * Math.min(1, dt * 18); e.py += (e.r * MC + MC / 2 + MY - e.py) * Math.min(1, dt * 18);
      if (e.cd > 0) continue;
      const { x, y } = e.in;
      if (Math.max(Math.abs(x), Math.abs(y)) < 0.45) continue;
      const [dc, dr] = Math.abs(x) > Math.abs(y) ? [Math.sign(x), 0] : [0, Math.sign(y)];
      if (open(G, e.c, e.r, dc, dr)) { e.c += dc; e.r += dr; e.cd = e.human ? 0.1 : 0.17; }
      if (e.c === G.goal.c && e.r === G.goal.r) {
        e.score++; G.toast(`${e.name} menemukan harta!`); G.sfx('roundwin'); G.buzz(e, 'success'); G.burst(e.px, e.py, '#ffd23f', 30, 300); G.pause = 2.2;
        break;
      }
    }
  },
  bot(G, e) {
    if (!e.data.path || !e.data.path.length || e.data.round !== G.round) { e.data.path = bfs(G, e.c, e.r); e.data.round = G.round; }
    while (e.data.path.length && e.data.path[0][0] === e.c && e.data.path[0][1] === e.r) e.data.path.shift();
    const n = e.data.path[0];
    if (!n) return {};
    return { x: n[0] - e.c, y: n[1] - e.r };
  },
  draw(G, ctx) {
    ctx.drawImage(G.layer, 0, 0, W, H);
    spr(ctx, G.sprite('chest'), MX + G.goal.c * MC + MC / 2, MY + G.goal.r * MC + MC / 2 + (G.lite ? 0 : Math.sin(G.t * 3) * 3), 54, 47);
    for (const e of G.ents) { shadow(ctx, e.px, e.py + 16, 34); spr(ctx, G.blob(e), e.px, e.py, 42); }
    G.text(`Ronde ${Math.min(3, G.round)}/3`, W - 120, 40, 26, '#ffd23f');
  },
  bg: (G, b) => defaultBg(b, '#1e3d2a', '#0d1f14')
});
function newMaze(G) {
  G.round++; G.pause = 0;
  // walls[r][c] = bitmask N1 E2 S4 W8 (1 = wall)
  const wl = Array.from({ length: MROWS }, () => new Array(MCOLS).fill(15));
  const seen = Array.from({ length: MROWS }, () => new Array(MCOLS).fill(false));
  const st = [[0, 0]]; seen[0][0] = true;
  const D = [[0, -1, 1, 4], [1, 0, 2, 8], [0, 1, 4, 1], [-1, 0, 8, 2]];
  while (st.length) {
    const [c, r] = st[st.length - 1];
    const nb = D.filter(([dc, dr]) => { const c2 = c + dc, r2 = r + dr; return c2 >= 0 && r2 >= 0 && c2 < MCOLS && r2 < MROWS && !seen[r2][c2]; });
    if (!nb.length) { st.pop(); continue; }
    const [dc, dr, b1, b2] = nb[Math.floor(Math.random() * nb.length)];
    wl[r][c] &= ~b1; wl[r + dr][c + dc] &= ~b2; seen[r + dr][c + dc] = true; st.push([c + dc, r + dr]);
  }
  for (let k = 0; k < 40; k++) { const c = G.randi(1, MCOLS - 2), r = G.randi(1, MROWS - 2), d = D[G.randi(0, 3)]; wl[r][c] &= ~d[2]; wl[r + d[1]][c + d[0]] &= ~d[3]; }
  G.walls = wl; G.goal = { c: Math.floor(MCOLS / 2), r: Math.floor(MROWS / 2) };
  const corners = [[0, 0], [MCOLS - 1, MROWS - 1], [MCOLS - 1, 0], [0, MROWS - 1]];
  G.ents.forEach((e, k) => { const [c, r] = corners[k]; Object.assign(e, { c, r, px: MX + c * MC + MC / 2, py: MY + r * MC + MC / 2, cd: 0.3 }); e.data.path = null; });
  const l = G.layer.getContext('2d'); l.clearRect(0, 0, W, H);
  rr(l, MX - 10, MY - 10, MCOLS * MC + 20, MROWS * MC + 20, 16); l.fillStyle = '#0b0720'; l.fill();
  for (let r = 0; r < MROWS; r++) for (let c = 0; c < MCOLS; c++) { l.fillStyle = (r + c) % 2 ? '#c9b98a' : '#d4c596'; l.fillRect(MX + c * MC, MY + r * MC, MC, MC); }
  l.strokeStyle = '#2f7a3f'; l.lineWidth = 10; l.lineCap = 'round';
  for (let r = 0; r < MROWS; r++) for (let c = 0; c < MCOLS; c++) {
    const x = MX + c * MC, y = MY + r * MC, w = wl[r][c];
    l.beginPath();
    if (w & 1) { l.moveTo(x, y); l.lineTo(x + MC, y); }
    if (w & 8) { l.moveTo(x, y); l.lineTo(x, y + MC); }
    if (r === MROWS - 1 && w & 4) { l.moveTo(x, y + MC); l.lineTo(x + MC, y + MC); }
    if (c === MCOLS - 1 && w & 2) { l.moveTo(x + MC, y); l.lineTo(x + MC, y + MC); }
    l.stroke();
  }
  l.strokeStyle = '#6bdc77'; l.lineWidth = 3;
  for (let r = 0; r < MROWS; r++) for (let c = 0; c < MCOLS; c++) {
    const x = MX + c * MC, y = MY + r * MC, w = wl[r][c];
    l.beginPath(); if (w & 1) { l.moveTo(x + 2, y - 2); l.lineTo(x + MC - 2, y - 2); } if (w & 8) { l.moveTo(x - 2, y + 2); l.lineTo(x - 2, y + MC - 2); } l.stroke();
  }
  if (G.round > 1) G.say(`RONDE ${G.round}`, '#ffd23f', 900);
}
function open(G, c, r, dc, dr) {
  const c2 = c + dc, r2 = r + dr;
  if (c2 < 0 || r2 < 0 || c2 >= MCOLS || r2 >= MROWS) return false;
  const bit = dc === 1 ? 2 : dc === -1 ? 8 : dr === 1 ? 4 : 1;
  return !(G.walls[r][c] & bit);
}
function bfs(G, c0, r0) {
  const prev = new Map(), q = [[c0, r0]], key = (c, r) => c + ',' + r;
  prev.set(key(c0, r0), null);
  while (q.length) {
    const [c, r] = q.shift();
    if (c === G.goal.c && r === G.goal.r) break;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (open(G, c, r, dc, dr) && !prev.has(key(c + dc, r + dr))) { prev.set(key(c + dc, r + dr), [c, r]); q.push([c + dc, r + dr]); }
  }
  const path = []; let cur = [G.goal.c, G.goal.r];
  while (cur && !(cur[0] === c0 && cur[1] === r0)) { path.unshift(cur); cur = prev.get(key(cur[0], cur[1])); }
  return path;
}

// ============================================================ shared: 4 answer pads on TV
const QCOL = ['#e8325a', '#1f86e0', '#f0a91a', '#1fae5c'];
let shapeImgs = null;
function shapes() {
  if (shapeImgs) return shapeImgs;
  shapeImgs = SHAPES.map(s => { const i = new Image(); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" ')); return i; });
  return shapeImgs;
}
function answerPad(G, ctx, i, x, y, w, hh, label, state) {
  ctx.globalAlpha = state === 'dim' ? 0.3 : 1;
  rr(ctx, x, y + 8, w, hh, 22); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
  rr(ctx, x, y, w, hh, 22); ctx.fillStyle = QCOL[i]; ctx.fill();
  ctx.lineWidth = state === 'lit' ? 10 : 5; ctx.strokeStyle = state === 'lit' ? '#fff' : '#0b0720'; ctx.stroke();
  if (state === 'lit') { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill(); }
  const img = shapes()[i]; if (img.complete) ctx.drawImage(img, x + 22, y + hh / 2 - 26, 52, 52);
  if (label != null) G.text(String(label), x + w / 2 + 30, y + hh / 2, Math.min(52, hh * 0.5), '#fff', 7);
  ctx.globalAlpha = 1;
}

// ============================================================ INGAT WARNA (Simon)
export const simon = game2d({
  id: 'simon', name: 'Ingat Warna', music: 'music_quiz', layout: 'quiz', ctrl: { hint: 'Ulangi urutan warnanya' },
  help: 'Perhatikan urutan warna yang menyala, lalu ulangi pakai tombol warna. Tiap ronde urutannya bertambah. Salah = gugur!',
  controls: 'HP: tombol warna  ·  Stik: △ ○ ✕ □',
  hudValue: e => e.alive ? `${e.score} ronde` : 'gugur',
  label: e => `${e.score} ronde`,
  setup(G) { G.seq = []; G.out = []; nextSeq(G); },
  update(G, dt) {
    G.pt += dt;
    if (G.ph === 'show') {
      const k = Math.floor(G.pt / 0.62);
      if (k !== G.lastK && k < G.seq.length && G.pt % 0.62 < 0.45) { G.lastK = k; G.sfx('select', { rate: 0.8 + G.seq[k] * 0.15 }); }
      if (G.pt > G.seq.length * 0.62 + 0.3) { G.ph = 'input'; G.pt = 0; G.ents.forEach(e => { e.pos = 0; e.done = !e.alive; e.lastT = 0; }); }
    } else if (G.ph === 'input') {
      for (const e of G.ents) if (e.alive && !e.done && G.pt - e.lastT > 5) failSimon(G, e);
      if (G.ents.every(e => e.done)) {
        G.ents.forEach(e => { if (e.alive) { e.score++; G.buzz(e, 'success'); } });
        const solo = G.ents.length === 1;
        if (!G.alive.length || (!solo && G.alive.length <= 1)) return G.end([...G.alive, ...G.out]);
        G.sfx('correct'); nextSeq(G);
      }
    }
  },
  onAnswer(G, e, i) {
    if (G.ph !== 'input' || !e.alive || e.done) return;
    e.flash = { i, t: G.t };
    if (G.seq[e.pos] === i) { e.pos++; e.lastT = G.pt; if (e.pos >= G.seq.length) { e.done = true; G.sfx('lock'); } }
    else failSimon(G, e);
  },
  draw(G, ctx) {
    const lit = G.ph === 'show' ? (() => { const k = Math.floor(G.pt / 0.62); return k < G.seq.length && G.pt % 0.62 < 0.45 ? G.seq[k] : -1; })() : -1;
    for (let i = 0; i < 4; i++) answerPad(G, ctx, i, 190 + (i % 2) * 460, 150 + Math.floor(i / 2) * 200, 420, 170, null, lit === i ? 'lit' : lit >= 0 ? 'dim' : '');
    G.text(G.ph === 'show' ? `Perhatikan! (${G.seq.length} warna)` : 'Ulangi urutannya!', W / 2, 600, 40, G.ph === 'show' ? '#ffd23f' : '#2de2e6');
    const n = G.ents.length;
    G.ents.forEach((e, k) => {
      const x = W / 2 + (k - (n - 1) / 2) * 200;
      spr(ctx, G.blob(e, !e.alive ? 'sleep' : e.done ? 'cool' : 'happy'), x - 50, 668, 52);
      G.text(G.ph === 'input' && e.alive ? `${e.pos}/${G.seq.length}` : e.alive ? '' : 'gugur', x + 20, 668, 26, e.alive ? '#fff' : '#ff4d6d', 4);
    });
  }
});
function nextSeq(G) { G.seq.push(G.randi(0, 3)); G.ph = 'show'; G.pt = -0.6; G.lastK = -1; }
function failSimon(G, e) { e.alive = false; e.done = true; G.out.unshift(e); G.sfx('wrong'); G.buzz(e, 'error'); G.toast(`${e.name} salah!`, 1100); }

// ============================================================ HITUNG CEPAT (math race)
const MQ = 12, MT = 9;
export const math = game2d({
  id: 'math', name: 'Hitung Cepat', music: 'music_quiz', layout: 'quiz', ctrl: { hint: 'Pilih jawaban yang benar' },
  help: '12 soal hitungan cepat! Benar = 500 poin + bonus kecepatan. Salah = 0. Siapa jago matematika?',
  controls: 'HP: tombol warna  ·  Stik: △ ○ ✕ □',
  setup(G) { G.qi = 0; nextMath(G); },
  update(G, dt) {
    G.pt += dt;
    if (G.ph === 'q' && (G.pt > MT || G.ents.every(e => e.ans != null))) {
      G.ph = 'r'; G.pt = 0;
      for (const e of G.ents) { if (e.ans === G.q.correct) { const p = 500 + Math.round(500 * Math.max(0, MT - e.at) / MT); e.score += p; G.buzz(e, 'success'); e.gain = p; } else { e.gain = 0; G.buzz(e, 'error'); } }
      G.sfx(G.ents.some(e => e.gain) ? 'correct' : 'wrong');
    } else if (G.ph === 'r' && G.pt > 2.2) { if (G.qi >= MQ) G.end(); else nextMath(G); }
  },
  onAnswer(G, e, i) { if (G.ph === 'q' && e.ans == null) { e.ans = i; e.at = G.pt; G.sfx('lock'); } },
  draw(G, ctx) {
    G.text(`Soal ${G.qi}/${MQ}`, 140, 110, 30, '#ffd23f');
    const f = G.ph === 'q' ? Math.max(0, 1 - G.pt / MT) : 0;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; rr(ctx, 260, 98, 900, 20, 10); ctx.fill();
    ctx.fillStyle = f < 0.3 ? '#ff4d6d' : '#3ddc84'; rr(ctx, 260, 98, 900 * f, 20, 10); ctx.fill();
    G.text(G.q.text + ' = ?', W / 2, 250, 110, '#fff', 12);
    G.q.opts.forEach((o, i) => answerPad(G, ctx, i, 150 + (i % 2) * 500, 370 + Math.floor(i / 2) * 140, 480, 120, o, G.ph === 'r' ? (i === G.q.correct ? 'lit' : 'dim') : ''));
    const n = G.ents.length;
    G.ents.forEach((e, k) => {
      const x = W / 2 + (k - (n - 1) / 2) * 180;
      spr(ctx, G.blob(e, e.ans != null ? 'cool' : 'happy'), x, 672, 46);
      if (G.ph === 'r') G.text(e.gain ? '+' + e.gain : '✗', x + 52, 672, 24, e.gain ? '#3ddc84' : '#ff4d6d', 4);
    });
  }
});
function nextMath(G) {
  G.qi++; G.ph = 'q'; G.pt = 0; G.ents.forEach(e => { e.ans = null; e.at = 0; });
  const lvl = Math.min(3, Math.floor(G.qi / 4));
  let a, b, op, ans;
  const t = G.randi(0, lvl >= 2 ? 3 : 2);
  if (t === 0) { a = G.randi(5, 30 + lvl * 30); b = G.randi(5, 30 + lvl * 30); op = '+'; ans = a + b; }
  else if (t === 1) { a = G.randi(20, 60 + lvl * 30); b = G.randi(2, a - 1); op = '−'; ans = a - b; }
  else if (t === 2) { a = G.randi(2, 9 + lvl); b = G.randi(2, 9 + lvl); op = '×'; ans = a * b; }
  else { b = G.randi(2, 9); ans = G.randi(2, 12); a = b * ans; op = '÷'; }
  const opts = new Set([ans]);
  while (opts.size < 4) { const d = ans + G.pick([-10, -2, -1, 1, 2, 3, 10, -3]) * (G.randi(1, 2)); if (d >= 0) opts.add(d); }
  const arr = [...opts].sort(() => Math.random() - 0.5);
  G.q = { text: `${a} ${op} ${b}`, opts: arr, correct: arr.indexOf(ans) };
}

// ============================================================ PANAHAN
const TX = 640, TYc = 360, ARROWS = 6;
export const archery = game2d({
  id: 'archery', name: 'Panahan', music: 'music_lobby', fill: 2, layout: 'pad', ctrl: { a: 'LEPAS', hint: 'Bidik lalu lepaskan!' },
  help: 'Bidik papan sasaran yang bergeser. Perhatikan angin! Tengah kuning = 10 poin. Masing-masing punya 6 anak panah.',
  controls: 'Stik: gerakkan bidikan  ·  ✕ / LEPAS: tembak',
  hudValue: e => `${e.score} · ${'➶'.repeat(Math.max(0, ARROWS - (e.shot || 0)))}`,
  label: e => `${e.score} poin`,
  sprites: G => ['target', 'cloud', ...G.ents.map(e => `arrow:${e.color}`)],
  bg(G, b) {
    const g = b.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#79d4ff'); g.addColorStop(0.7, '#d9f6ff'); g.addColorStop(0.7, '#7ad681'); g.addColorStop(1, '#4bb85a');
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    for (let k = 0; k < 4; k++) b.drawImage(G.sprite('cloud'), 40 + k * 330, 90 + (k % 2) * 40, 200, 100);
  },
  setup(G) {
    G.tx = TX; G.wind = G.rand(-1, 1); G.hits = [];
    G.ents.forEach((e, k) => Object.assign(e, { ax: TX + (k - 1.5) * 120, ay: TYc + 160, shot: 0, cd: 0, fly: [] }));
  },
  update(G, dt) {
    G.tx = TX + Math.sin(G.t * 0.7) * 230;
    G.windT = (G.windT || 6) - dt;
    if (G.windT <= 0) { G.windT = 6; G.wind = G.rand(-1, 1); G.toast(`Angin ${G.wind > 0 ? '→' : '←'} ${Math.abs(Math.round(G.wind * 10))}`, 1000); }
    for (const e of G.ents) {
      e.cd -= dt;
      const sway = G.lite ? 0.6 : 1;
      e.ax = clamp(e.ax + (e.in.x * 380 + Math.sin(G.t * 2.3 + e.i) * 40 * sway) * dt, 100, W - 100);
      e.ay = clamp(e.ay + (e.in.y * 380 + Math.cos(G.t * 1.9 + e.i * 2) * 40 * sway) * dt, 120, 640);
      if (G.tap(e, 'a') && e.cd <= 0 && e.shot < ARROWS) {
        e.shot++; e.cd = 1;
        e.fly.push({ x: e.ax, y: e.ay, t: 0, tx: G.tx, wind: G.wind });
        G.sfxv('dash', { volume: 0.6 });
      }
      for (const f of e.fly) {
        f.t += dt;
        if (f.t >= 0.5 && !f.done) {
          f.done = true;
          const hx = f.x + f.wind * 60, hy = f.y;
          const d = Math.hypot(hx - G.tx, hy - TYc);
          const pts = d < 14 ? 10 : d < 34 ? 8 : d < 56 ? 6 : d < 72 ? 4 : d < 92 ? 2 : 0;
          e.score += pts;
          G.hits.push({ e, dx: hx - G.tx, dy: hy - TYc, pts, miss: !pts, x: hx, y: hy });
          G.float(hx, hy - 30, pts ? '+' + pts : 'meleset', pts >= 8 ? '#ffd23f' : '#fff');
          G.sfx(pts >= 8 ? 'roundwin' : pts ? 'lock' : 'wrong'); G.buzz(e, pts >= 8 ? 'success' : 'light');
        }
      }
      e.fly = e.fly.filter(f => !f.done);
    }
    if (G.ents.every(e => e.shot >= ARROWS && !e.fly.length)) { if (!G.endT) G.endT = G.t + 1.2; if (G.t > G.endT) G.end(); }
  },
  bot(G, e) {
    const aimX = G.tx - G.wind * 60 + Math.cos(G.t * 0.7) * 230 * 0.7 * 0.5, aimY = TYc;
    const dx = aimX - e.ax, dy = aimY - e.ay;
    return { x: clamp(dx / 60, -1, 1), y: clamp(dy / 60, -1, 1), a: Math.hypot(dx, dy) < 22 + e.i * 6 && Math.random() < 0.15 };
  },
  draw(G, ctx) {
    ctx.fillStyle = '#0b0720'; ctx.fillRect(G.tx - 16, 440, 32, 200); ctx.fillRect(G.tx - 110, 612, 220, 26);
    ctx.fillStyle = '#8a5a3c'; ctx.fillRect(G.tx - 11, 444, 22, 192); ctx.fillRect(G.tx - 105, 616, 210, 18);
    spr(ctx, G.sprite('target'), G.tx, TYc, 200);
    for (const h0 of G.hits) if (!h0.miss) spr(ctx, G.sprite(`arrow:${h0.e.color}`), G.tx + h0.dx + 6, TYc + h0.dy + 26, 12, 60, 0.12);
    for (const e of G.ents) for (const f of e.fly) {
      const k = f.t / 0.5, x = f.x + f.wind * 60 * k, y = f.y + (1 - k) * 260;
      spr(ctx, G.sprite(`arrow:${e.color}`), x, y, 14 * (1.6 - k * 0.6), 70 * (1.6 - k * 0.6), 0);
    }
    for (const e of G.ents) {
      ctx.strokeStyle = '#0b0720'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(e.ax, e.ay, 24, 0, 6.283); ctx.stroke();
      ctx.strokeStyle = e.color; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(e.ax, e.ay, 24, 0, 6.283); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(e.ax - 34, e.ay); ctx.lineTo(e.ax - 14, e.ay); ctx.moveTo(e.ax + 14, e.ay); ctx.lineTo(e.ax + 34, e.ay); ctx.moveTo(e.ax, e.ay - 34); ctx.lineTo(e.ax, e.ay - 14); ctx.moveTo(e.ax, e.ay + 14); ctx.lineTo(e.ax, e.ay + 34); ctx.stroke();
      ctx.font = '700 15px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#0b0720'; ctx.fillText(e.name, e.ax, e.ay + 50);
    }
    // wind meter
    ctx.fillStyle = 'rgba(11,7,32,.75)'; rr(ctx, 40, 640, 240, 56, 28); ctx.fill();
    G.text('ANGIN', 88, 668, 22, '#fff', 0);
    ctx.fillStyle = 'rgba(255,255,255,.2)'; rr(ctx, 140, 660, 124, 16, 8); ctx.fill();
    ctx.fillStyle = '#2de2e6'; rr(ctx, 202 + Math.min(0, G.wind) * 60, 660, Math.abs(G.wind) * 60 + 4, 16, 8); ctx.fill();
  }
});
