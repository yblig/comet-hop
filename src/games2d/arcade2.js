// Bola Seru · Pong 4 Sisi · Panen Koin · Hujan Meteor
import { W, H, rr, spr, shadow, clamp, game2d, arenaBg, moveBody, keepIn, collideAll, drawBlob, toward } from './engine.js';

// ============================================================ BOLA SERU (2v2 soccer)
const F = { x0: 90, y0: 110, x1: 1190, y1: 690 }, GOAL = 170;
export const soccer = game2d({
  id: 'soccer', name: 'Bola Seru', music: 'music_kart', time: 120, fill: 4, layout: 'pad', ctrl: { a: 'TENDANG', hint: 'Lari & tendang' },
  help: 'Tim Merah lawan Tim Biru! Tendang bola ke gawang lawan. Gol pertama sampai 5 atau skor tertinggi saat waktu habis.',
  controls: 'Stik: lari  ·  ✕ / TENDANG: tendang (dekat bola) atau sprint',
  sprites: () => ['ball'],
  hud: false,
  bg(G, b) {
    for (let k = 0; k < 11; k++) { b.fillStyle = k % 2 ? '#3fbf63' : '#4bcb6f'; b.fillRect(k * (W / 11), 0, W / 11 + 1, H); }
    b.strokeStyle = '#fff'; b.lineWidth = 5;
    b.strokeRect(F.x0, F.y0, F.x1 - F.x0, F.y1 - F.y0);
    b.beginPath(); b.moveTo(W / 2, F.y0); b.lineTo(W / 2, F.y1); b.stroke();
    b.beginPath(); b.arc(W / 2, (F.y0 + F.y1) / 2, 80, 0, 6.283); b.stroke();
    const my = (F.y0 + F.y1) / 2;
    b.strokeRect(F.x0, my - 150, 120, 300); b.strokeRect(F.x1 - 120, my - 150, 120, 300);
    for (const [x, c] of [[F.x0 - 50, '#ff4d6d'], [F.x1, '#3ab0ff']]) {
      b.fillStyle = 'rgba(255,255,255,.85)'; b.fillRect(x, my - GOAL / 2, 50, GOAL);
      b.strokeStyle = 'rgba(0,0,0,.18)'; b.lineWidth = 2;
      for (let y = my - GOAL / 2; y < my + GOAL / 2; y += 14) { b.beginPath(); b.moveTo(x, y); b.lineTo(x + 50, y); b.stroke(); }
      b.strokeStyle = c; b.lineWidth = 8; b.strokeRect(x, my - GOAL / 2, 50, GOAL);
    }
    b.fillStyle = 'rgba(11,7,32,.75)'; b.fillRect(0, 0, W, 84);
  },
  setup(G) {
    G.ents.forEach((e, k) => { e.team = k % 2; });
    G.goals = [0, 0];
    G.ball = { x: W / 2, y: 400, vx: 0, vy: 0 };
    kickoff(G);
  },
  update(G, dt) {
    if (G.pause > 0) { G.pause -= dt; if (G.pause <= 0) kickoff(G); }
    const b = G.ball;
    for (const e of G.ents) {
      e.cd -= dt; e.boost -= dt;
      moveBody(e, G.pause > 0 ? { x: 0, y: 0 } : e.in, dt, { acc: 2400, max: 330 });
      keepIn(e, { x0: 30, y0: 100, x1: W - 30, y1: H - 10 }, 26);
      if (G.tap(e, 'a') && e.cd <= 0) {
        e.cd = 0.35;
        const d = Math.hypot(b.x - e.x, b.y - e.y);
        if (d < 70) {
          const nx = (b.x - e.x) / d, ny = (b.y - e.y) / d;
          b.vx = nx * 820 + e.vx * 0.3; b.vy = ny * 820 + e.vy * 0.3;
          G.sfxv('hit', { volume: 0.7 }); G.buzz(e, 'medium'); G.burst(b.x, b.y, '#fff', 6, 160);
        } else { e.boost = 0.2; e.cd = 0.9; G.sfx('dash', { volume: 0.4 }); }
      }
    }
    collideAll(G.ents, 26, 0.6);
    // ball vs players (dribble push)
    for (const e of G.ents) {
      const dx = b.x - e.x, dy = b.y - e.y, d = Math.hypot(dx, dy);
      if (d < 44 && d > 0.01) { const nx = dx / d, ny = dy / d; b.x = e.x + nx * 44; b.y = e.y + ny * 44; const rv = (b.vx - e.vx) * nx + (b.vy - e.vy) * ny; if (rv < 0) { b.vx -= 1.6 * rv * nx; b.vy -= 1.6 * rv * ny; } }
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    const k = Math.pow(0.45, dt); b.vx *= k; b.vy *= k;
    const my = (F.y0 + F.y1) / 2, inMouth = Math.abs(b.y - my) < GOAL / 2 - 14;
    if (b.y < F.y0 + 18) { b.y = F.y0 + 18; b.vy = Math.abs(b.vy) * 0.8; }
    if (b.y > F.y1 - 18) { b.y = F.y1 - 18; b.vy = -Math.abs(b.vy) * 0.8; }
    if (G.pause <= 0) {
      if (b.x < F.x0 + 18) { if (inMouth) goal(G, 1); else { b.x = F.x0 + 18; b.vx = Math.abs(b.vx) * 0.8; } }
      if (b.x > F.x1 - 18) { if (inMouth) goal(G, 0); else { b.x = F.x1 - 18; b.vx = -Math.abs(b.vx) * 0.8; } }
    } else b.x = clamp(b.x, F.x0 - 40, F.x1 + 40);
  },
  bot(G, e) {
    const b = G.ball, goalX = e.team === 0 ? F.x1 + 20 : F.x0 - 20, my = (F.y0 + F.y1) / 2;
    const ownX = e.team === 0 ? F.x0 : F.x1;
    const mates = G.ents.filter(o => o.team === e.team);
    const iAmChaser = mates.reduce((best, o) => Math.hypot(b.x - o.x, b.y - o.y) < Math.hypot(b.x - best.x, b.y - best.y) ? o : best, mates[0]) === e;
    let tx, ty;
    if (iAmChaser) {
      const gx = goalX - b.x, gy = my - b.y, gl = Math.hypot(gx, gy) || 1;
      tx = b.x - gx / gl * 40; ty = b.y - gy / gl * 40;
      const behind = Math.hypot(e.x - tx, e.y - ty) < 50;
      if (behind) { tx = b.x; ty = b.y; }
    } else { tx = (ownX + b.x) / 2; ty = (my + b.y) / 2; }
    const v = toward(e, { x: tx, y: ty });
    const near = Math.hypot(b.x - e.x, b.y - e.y) < 62;
    const facingGoal = Math.sign(goalX - e.x) === Math.sign(b.x - e.x);
    return { x: v.x, y: v.y, a: near && facingGoal && Math.random() < 0.3 };
  },
  draw(G, ctx) {
    const b = G.ball;
    for (const e of G.ents) {
      ctx.strokeStyle = e.team ? '#3ab0ff' : '#ff4d6d'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(e.x, e.y + 22, 30, 10, 0, 0, 6.283); ctx.stroke();
      drawBlob(G, ctx, e, 60);
      ctx.font = '700 15px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#0b0720'; ctx.fillText(e.name, e.x, e.y - 40);
    }
    shadow(ctx, b.x, b.y + 16, 34);
    spr(ctx, G.sprite('ball'), b.x, b.y, 38, 38, G.lite ? 0 : (b.x / 18));
    // scoreboard
    rr(ctx, W / 2 - 170, 14, 340, 58, 29); ctx.fillStyle = '#0b0720'; ctx.fill();
    G.text(`MERAH ${G.goals[0]}  -  ${G.goals[1]} BIRU`, W / 2, 44, 32, '#fff', 0);
    const s = Math.ceil(G.timeLeft);
    G.text(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, W - 80, 44, 32, s <= 10 ? '#ff4d6d' : '#ffd23f');
  },
  label: e => `Tim ${e.team ? 'Biru' : 'Merah'} · ${e.score} gol`,
  order: G => order(G)
});
function kickoff(G) {
  const my = (F.y0 + F.y1) / 2;
  Object.assign(G.ball, { x: W / 2, y: my, vx: 0, vy: 0 });
  G.pause = 0;
  const pos = [[W / 2 - 160, my - 110], [W / 2 + 160, my - 110], [W / 2 - 300, my + 110], [W / 2 + 300, my + 110]];
  G.ents.forEach((e, k) => { const [x, y] = pos[k]; Object.assign(e, { x, y, vx: 0, vy: 0, cd: 0, boost: 0 }); });
}
function goal(G, team) {
  G.goals[team]++;
  const scorer = [...G.ents].sort((a, b) => Math.hypot(G.ball.x - a.x, G.ball.y - a.y) - Math.hypot(G.ball.x - b.x, G.ball.y - b.y)).find(e => e.team === team);
  if (scorer) scorer.score++;
  G.say('GOOOL!', team ? '#3ab0ff' : '#ff4d6d', 1400); G.sfx('roundwin'); G.shake = 0.6;
  G.ents.forEach(e => G.buzz(e, e.team === team ? 'success' : 'heavy'));
  G.burst(G.ball.x, G.ball.y, team ? '#3ab0ff' : '#ff4d6d', 30, 400);
  G.pause = 1.8;
  if (G.goals[team] >= 5) setTimeout(() => G.end(order(G)), 600);
}
function order(G) { const win = G.goals[0] === G.goals[1] ? -1 : G.goals[0] > G.goals[1] ? 0 : 1; return [...G.ents].sort((a, b) => ((b.team === win) - (a.team === win)) || b.score - a.score); }

// ============================================================ PONG 4 SISI
const P = { x0: 320, y0: 64, x1: 960, y1: 704 }, PAD = 140;
export const pong = game2d({
  id: 'pong', name: 'Pong 4 Sisi', music: 'music_sumo', fill: 4, layout: 'pad', ctrl: { a: null, hint: 'Gerakkan pemukul' },
  help: 'Tiap pemain jaga satu sisi. Bola lolos = nyawa berkurang. Habis 3 nyawa, sisimu jadi tembok. Bertahan sampai akhir!',
  controls: 'Stik kiri-kanan (atau atas-bawah) untuk menggerakkan pemukul',
  hudValue: e => e.alive ? '♥'.repeat(e.lives ?? 3) : 'keluar',
  sprites: () => ['puck'],
  bg(G, b) {
    const g = b.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#1b1145'); g.addColorStop(1, '#3a1650'); b.fillStyle = g; b.fillRect(0, 0, W, H);
    rr(b, P.x0 - 14, P.y0 - 14, P.x1 - P.x0 + 28, P.y1 - P.y0 + 28, 30); b.fillStyle = '#0b0720'; b.fill();
    rr(b, P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0, 20); b.fillStyle = '#21184f'; b.fill();
    b.strokeStyle = 'rgba(45,226,230,.25)'; b.lineWidth = 3; b.setLineDash([12, 12]);
    b.beginPath(); b.moveTo(P.x0, (P.y0 + P.y1) / 2); b.lineTo(P.x1, (P.y0 + P.y1) / 2); b.moveTo((P.x0 + P.x1) / 2, P.y0); b.lineTo((P.x0 + P.x1) / 2, P.y1); b.stroke(); b.setLineDash([]);
    b.beginPath(); b.arc(W / 2, (P.y0 + P.y1) / 2, 70, 0, 6.283); b.stroke();
  },
  hud: false,
  setup(G) {
    G.ents.forEach((e, k) => { e.side = k; e.lives = 3; e.pos = 0.5; e.out = 0; });
    G.balls = []; G.outOrder = [];
    addBall(G);
  },
  update(G, dt) {
    if (G.t > 18 && G.balls.length < 2) addBall(G);
    for (const e of G.ents) {
      if (!e.alive) continue;
      const v = e.side < 2 ? e.in.x : e.in.y;
      e.pos = clamp(e.pos + v * dt * 1.7, PAD / 2 / 640, 1 - PAD / 2 / 640);
    }
    for (const b of G.balls) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      for (const e of G.ents) {
        const side = e.side;
        const along = side < 2 ? b.x - P.x0 : b.y - P.y0;
        const edgeHit = side === 0 ? b.y > P.y1 - 30 && b.vy > 0 : side === 1 ? b.y < P.y0 + 30 && b.vy < 0 : side === 2 ? b.x < P.x0 + 30 && b.vx < 0 : b.x > P.x1 - 30 && b.vx > 0;
        if (!edgeHit) continue;
        const center = e.pos * 640;
        if (!e.alive || Math.abs(along - center) < PAD / 2 + 14) {
          const sp = Math.min(900, Math.hypot(b.vx, b.vy) * 1.05);
          const off = e.alive ? (along - center) / (PAD / 2) : (Math.random() - 0.5) * 0.4;
          if (side === 0) { b.vy = -1; b.vx = off * 0.8; } else if (side === 1) { b.vy = 1; b.vx = off * 0.8; }
          else if (side === 2) { b.vx = 1; b.vy = off * 0.8; } else { b.vx = -1; b.vy = off * 0.8; }
          const l = Math.hypot(b.vx, b.vy); b.vx = b.vx / l * sp; b.vy = b.vy / l * sp;
          if (e.alive) { G.sfxv('lock', { volume: 0.6 }); G.buzz(e); } else G.sfx('tick');
        } else if (side === 0 ? b.y > P.y1 : side === 1 ? b.y < P.y0 : side === 2 ? b.x < P.x0 : b.x > P.x1) {
          e.lives--; G.burst(b.x, b.y, e.color, 18); G.sfx('wrong'); G.buzz(e, 'heavy'); G.shake = 0.4;
          if (e.lives <= 0) { e.alive = false; G.outOrder.unshift(e); G.toast(`${e.name} keluar!`); }
          b.dead = true;
        }
      }
    }
    G.balls = G.balls.filter(b => !b.dead);
    if (G.balls.length === 0) addBall(G);
    if (G.alive.length <= 1) G.end([...G.alive, ...G.outOrder]);
  },
  bot(G, e) {
    let tgt = 0.5;
    const near = G.balls.slice().sort((a, b) => sideDist(e.side, a) - sideDist(e.side, b))[0];
    if (near) tgt = clamp(((e.side < 2 ? near.x - P.x0 : near.y - P.y0) / 640), 0.1, 0.9);
    const diff = tgt - e.pos;
    return e.side < 2 ? { x: clamp(diff * 7, -0.9, 0.9) } : { y: clamp(diff * 7, -0.9, 0.9) };
  },
  draw(G, ctx) {
    for (const e of G.ents) {
      const c = e.pos * 640;
      ctx.fillStyle = e.alive ? e.color : '#5b4bb0'; ctx.strokeStyle = '#0b0720'; ctx.lineWidth = 4;
      if (!e.alive) {
        if (e.side < 2) rr(ctx, P.x0, e.side === 0 ? P.y1 - 12 : P.y0 - 4, 640, 16, 6); else rr(ctx, e.side === 2 ? P.x0 - 4 : P.x1 - 12, P.y0, 16, 640, 6);
        ctx.fill(); ctx.stroke(); continue;
      }
      if (e.side === 0) rr(ctx, P.x0 + c - PAD / 2, P.y1 - 26, PAD, 22, 11); else if (e.side === 1) rr(ctx, P.x0 + c - PAD / 2, P.y0 + 4, PAD, 22, 11);
      else if (e.side === 2) rr(ctx, P.x0 + 4, P.y0 + c - PAD / 2, 22, PAD, 11); else rr(ctx, P.x1 - 26, P.y0 + c - PAD / 2, 22, PAD, 11);
      ctx.fill(); ctx.stroke();
      const lab = [[W / 2, P.y1 + 0, 0], [W / 2, P.y0, 1], [P.x0, H / 2, 2], [P.x1, H / 2, 3]][e.side];
      const px = e.side === 2 ? P.x0 - 150 : e.side === 3 ? P.x1 + 150 : lab[0], py = e.side === 0 ? H - 22 : e.side === 1 ? 22 : H / 2;
      if (e.side >= 2) { spr(ctx, G.blob(e), px, py - 50, 80); G.text(e.name, px, py + 10, 26, e.color); G.text('♥'.repeat(e.lives), px, py + 44, 28, '#ff3d6e'); }
      else { G.text(`${e.name}  ${'♥'.repeat(e.lives)}`, px, py + (e.side === 0 ? -2 : 4), 22, e.color, 4); }
    }
    for (const b of G.balls) spr(ctx, G.sprite('puck'), b.x, b.y, 40);
  }
});
function sideDist(side, b) { return side === 0 ? P.y1 - b.y : side === 1 ? b.y - P.y0 : side === 2 ? b.x - P.x0 : P.x1 - b.x; }
function addBall(G) { const a = Math.random() * Math.PI * 2; G.balls.push({ x: W / 2, y: (P.y0 + P.y1) / 2, vx: Math.cos(a) * 340, vy: Math.sin(a) * 340 }); }

// ============================================================ PANEN KOIN
export const coins = game2d({
  id: 'coins', name: 'Panen Koin', music: 'music_lobby', time: 60, fill: 2, layout: 'pad', ctrl: { a: 'DASH', hint: 'Kumpulkan koin!' },
  help: 'Kumpulkan koin & permata sebanyak mungkin. Awas bom! Kena ledakan = pusing & koinmu tercecer.',
  controls: 'Stik: jalan  ·  ✕ / DASH: seruduk lawan biar koinnya jatuh',
  sprites: () => ['coin', 'gem', 'bomb', 'boom'],
  bg(G, b) { G.B = arenaBg(b, { floor: '#2f6b4f', line: '#3c8060', grass: '#173a2b', border: '#ffd23f' }); },
  setup(G) {
    G.B ||= { x0: 70, y0: 100, x1: 1210, y1: 650 };
    G.items = []; G.bombs = []; G.booms = [];
    G.ents.forEach((e, k) => Object.assign(e, { x: 300 + (k % 2) * 680, y: 230 + Math.floor(k / 2) * 300, vx: 0, vy: 0, cd: 0, boost: 0, stun: 0 }));
    for (let k = 0; k < 10; k++) addItem(G);
  },
  update(G, dt) {
    for (const e of G.ents) {
      e.cd -= dt; e.boost -= dt; e.stun -= dt;
      if (G.tap(e, 'a') && e.cd <= 0 && e.stun <= 0) { e.boost = 0.25; e.cd = 1; const a = e.face || 0; e.vx += Math.cos(a) * 500; e.vy += Math.sin(a) * 500; G.sfxv('dash', { volume: 0.5 }); }
      moveBody(e, e.stun > 0 ? { x: 0, y: 0 } : e.in, dt, { max: 340 });
      keepIn(e, G.B, 26);
    }
    collideAll(G.ents, 28, 0.8, (a, b, f) => {
      if (f > 300) { for (const [x, y] of [[a, b], [b, a]]) if (x.boost > 0 && y.score > 0) { const n = Math.min(3, y.score); y.score -= n; scatter(G, y, n); G.buzz(y, 'heavy'); } G.sfxv('hit', { volume: 0.5 }); }
    });
    for (const it of G.items) {
      for (const e of G.ents) if (!it.got && Math.hypot(e.x - it.x, e.y - it.y) < 44 && e.stun <= 0) {
        it.got = true; e.score += it.v; G.sfxv(it.v > 1 ? 'roundwin' : 'lock', { volume: 0.7 }); G.buzz(e); G.float(it.x, it.y - 20, '+' + it.v, it.v > 1 ? '#2de2e6' : '#ffd23f');
      }
      if (it.vx) { it.x += it.vx * dt; it.y += it.vy * dt; it.vx *= 0.9; it.vy *= 0.9; if (Math.abs(it.vx) < 5) it.vx = it.vy = 0; }
    }
    G.items = G.items.filter(i => !i.got);
    while (G.items.length < 9) addItem(G);
    G.bombT = (G.bombT || 0) - dt;
    if (G.bombT <= 0) { G.bombT = G.rand(1.6, 3.2); G.bombs.push({ x: G.rand(G.B.x0 + 60, G.B.x1 - 60), y: G.rand(G.B.y0 + 60, G.B.y1 - 60), t: 2.2 }); }
    for (const bm of G.bombs) {
      bm.t -= dt;
      if (bm.t <= 0) {
        G.booms.push({ x: bm.x, y: bm.y, t: 0 }); G.sfx('fall'); G.shake = 0.5;
        for (const e of G.ents) if (Math.hypot(e.x - bm.x, e.y - bm.y) < 130) { e.stun = 1.3; const n = Math.min(3, e.score); e.score -= n; scatter(G, e, n); G.buzz(e, 'heavy'); }
      }
    }
    G.bombs = G.bombs.filter(b => b.t > 0);
    G.booms = G.booms.filter(b => (b.t += dt) < 0.45);
  },
  bot(G, e) {
    const bomb = G.bombs.find(b => Math.hypot(b.x - e.x, b.y - e.y) < 170);
    if (bomb) { const v = toward(bomb, e); return v; }
    let best = null, bd = 1e9;
    for (const it of G.items) { const d = Math.hypot(it.x - e.x, it.y - e.y) / it.v; if (d < bd) { bd = d; best = it; } }
    return best ? { ...toward(e, best, 0.2, G.t + e.i), a: Math.random() < 0.01 } : {};
  },
  draw(G, ctx) {
    for (const bm of G.bombs) {
      const r = 130 * (1 - bm.t / 2.2);
      ctx.strokeStyle = 'rgba(255,61,90,.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(bm.x, bm.y, 130, 0, 6.283); ctx.stroke();
      ctx.fillStyle = 'rgba(255,61,90,.18)'; ctx.beginPath(); ctx.arc(bm.x, bm.y, r, 0, 6.283); ctx.fill();
      spr(ctx, G.sprite('bomb'), bm.x, bm.y, 56 + (bm.t < 0.6 && !G.lite ? Math.sin(G.t * 40) * 6 : 0));
    }
    for (const it of G.items) { shadow(ctx, it.x, it.y + 16, 30); spr(ctx, G.sprite(it.v > 1 ? 'gem' : 'coin'), it.x, it.y - (G.lite ? 0 : Math.abs(Math.sin(G.t * 4 + it.x)) * 5), it.v > 1 ? 44 : 36); }
    for (const e of G.ents) drawBlob(G, ctx, e, 62);
    for (const b of G.booms) spr(ctx, G.sprite('boom'), b.x, b.y, 140 + b.t * 200);
  }
});
function addItem(G) { const gem = Math.random() < 0.12; G.items.push({ x: G.rand(G.B.x0 + 40, G.B.x1 - 40), y: G.rand(G.B.y0 + 40, G.B.y1 - 40), v: gem ? 5 : 1 }); }
function scatter(G, e, n) { for (let k = 0; k < n; k++) { const a = Math.random() * 6.283; G.items.push({ x: e.x, y: e.y, vx: Math.cos(a) * 400, vy: Math.sin(a) * 400, v: 1 }); } }

// ============================================================ HUJAN METEOR
export const meteors = game2d({
  id: 'meteors', name: 'Hujan Meteor', music: 'music_sumo', fill: 3, layout: 'pad', ctrl: { a: 'DASH', hint: 'Hindari meteor!' },
  help: 'Meteor berjatuhan! Lingkaran merah = tempat jatuhnya. Menghindar sampai jadi yang terakhir bertahan.',
  controls: 'Stik: lari  ·  ✕ / DASH: lari cepat sebentar',
  hudValue: e => e.alive ? `${Math.floor(e.score)} dtk` : 'kena!',
  label: e => `bertahan ${Math.floor(e.score)} detik`,
  sprites: () => ['meteor', 'boom', 'rock'],
  bg(G, b) {
    G.B = arenaBg(b, { floor: '#5a3a6e', line: '#6d4a84', grass: '#1a0d2b', border: '#ff7a1f' });
    for (let k = 0; k < 14; k++) { b.fillStyle = 'rgba(0,0,0,.18)'; b.beginPath(); b.ellipse(G.rand(120, 1160), G.rand(150, 640), G.rand(20, 50), G.rand(10, 24), 0, 0, 6.283); b.fill(); }
  },
  setup(G) {
    G.B ||= { x0: 70, y0: 100, x1: 1210, y1: 650 };
    G.rocks = []; G.booms = []; G.dead = [];
    G.ents.forEach((e, k) => Object.assign(e, { x: 400 + (k % 2) * 480, y: 260 + Math.floor(k / 2) * 240, vx: 0, vy: 0, cd: 0, boost: 0 }));
  },
  update(G, dt) {
    for (const e of G.ents) {
      if (!e.alive) continue;
      e.score += dt; e.cd -= dt; e.boost -= dt;
      if (G.tap(e, 'a') && e.cd <= 0) { e.boost = 0.3; e.cd = 1.4; G.sfx('dash', { volume: 0.4 }); }
      moveBody(e, e.in, dt, { max: 330 });
      keepIn(e, G.B, 24);
    }
    collideAll(G.alive, 26, 0.6);
    G.spawnT = (G.spawnT || 0) - dt;
    if (G.spawnT <= 0) {
      G.spawnT = Math.max(0.18, 0.9 - G.t * 0.012);
      const aim = Math.random() < 0.35 && G.alive.length ? G.pick(G.alive) : null;
      G.rocks.push({ x: aim ? aim.x + G.rand(-40, 40) : G.rand(G.B.x0 + 30, G.B.x1 - 30), y: aim ? aim.y + G.rand(-40, 40) : G.rand(G.B.y0 + 30, G.B.y1 - 30), t: 1.4, r: G.rand(55, 85) });
    }
    for (const m of G.rocks) {
      m.t -= dt;
      if (m.t <= 0) {
        G.booms.push({ x: m.x, y: m.y, t: 0, r: m.r }); G.sfxv('bump', { volume: 0.5 });
        for (const e of G.alive) if (Math.hypot(e.x - m.x, e.y - m.y) < m.r) { e.alive = false; G.dead.unshift(e); G.burst(e.x, e.y, e.color, 20); G.buzz(e, 'heavy'); G.shake = 0.5; G.toast(`${e.name} kena meteor!`); }
      }
    }
    G.rocks = G.rocks.filter(m => m.t > 0);
    G.booms = G.booms.filter(b => (b.t += dt) < 0.4);
    const solo = G.ents.length === 1;
    if ((solo && G.alive.length === 0) || (!solo && G.alive.length <= 1)) G.end([...G.alive, ...G.dead]);
  },
  bot(G, e) {
    let fx = 0, fy = 0;
    for (const m of G.rocks) { const d = Math.hypot(e.x - m.x, e.y - m.y); if (d < m.r + 60) { fx += (e.x - m.x) / (d + 1) * (1.6 - m.t); fy += (e.y - m.y) / (d + 1) * (1.6 - m.t); } }
    fx += (W / 2 - e.x) * 0.0015; fy += (400 - e.y) * 0.0015;
    return { x: clamp(fx * 3, -1, 1), y: clamp(fy * 3, -1, 1), a: Math.hypot(fx, fy) > 1 && Math.random() < 0.05 };
  },
  draw(G, ctx) {
    for (const m of G.rocks) {
      const k = 1 - m.t / 1.4;
      ctx.fillStyle = 'rgba(255,61,31,.22)'; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.283); ctx.fill();
      ctx.strokeStyle = '#ff3d1f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * k, 0, 6.283); ctx.stroke();
    }
    for (const e of G.ents) if (e.alive) drawBlob(G, ctx, e, 58, G.rocks.some(m => Math.hypot(e.x - m.x, e.y - m.y) < m.r) ? 'wow' : 'happy');
    for (const m of G.rocks) { const k = m.t / 1.4; spr(ctx, G.sprite('meteor'), m.x + 120 * k, m.y - 380 * k, 90 * (1.1 - k * 0.4)); }
    for (const b of G.booms) spr(ctx, G.sprite('boom'), b.x, b.y, b.r * 2.4 * (0.6 + b.t * 2));
  }
});
