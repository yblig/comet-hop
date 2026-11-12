// Lompat Putar · Lari Kencang · Reaksi Kilat · Tangkap Buah
import { W, H, rr, spr, shadow, clamp, game2d, defaultBg } from './engine.js';

const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));

// ============================================================ LOMPAT PUTAR
const CX = 640, CY = 420, RING = 230;
export const jumpbar = game2d({
  id: 'jumpbar', name: 'Lompat Putar', music: 'music_sumo', fill: 3, layout: 'buttons', ctrl: { a: 'LOMPAT', hint: 'Lompat saat palang lewat!' },
  help: 'Palang berputar makin cepat. Lompat tepat waktu saat palang lewat di bawahmu. Yang terakhir bertahan menang!',
  controls: '✕ / LOMPAT  ·  hati-hati, kadang arah putarannya berbalik!',
  hudValue: e => e.alive ? `${e.score} lompat` : 'jatuh',
  label: e => `${e.score} kali lompat`,
  bg(G, b) {
    defaultBg(b, '#3a2c86', '#150d38');
    b.fillStyle = 'rgba(0,0,0,.3)'; b.beginPath(); b.ellipse(CX, CY + 40, RING + 90, (RING + 90) * 0.5, 0, 0, 6.283); b.fill();
    b.fillStyle = '#0b0720'; b.beginPath(); b.ellipse(CX, CY + 10, RING + 84, (RING + 84) * 0.5, 0, 0, 6.283); b.fill();
    const g = b.createRadialGradient(CX, CY - 40, 40, CX, CY, RING + 80); g.addColorStop(0, '#9a7bff'); g.addColorStop(1, '#5a3bc8');
    b.fillStyle = g; b.beginPath(); b.ellipse(CX, CY, RING + 78, (RING + 78) * 0.5, 0, 0, 6.283); b.fill();
    b.strokeStyle = 'rgba(255,255,255,.3)'; b.lineWidth = 3; b.beginPath(); b.ellipse(CX, CY, RING, RING * 0.5, 0, 0, 6.283); b.stroke();
  },
  setup(G) {
    G.ang = -Math.PI / 2; G.omega = 1.5; G.dir = 1; G.flipT = 12; G.out = [];
    const n = G.ents.length;
    G.ents.forEach((e, k) => Object.assign(e, { a: Math.PI / 2 + (k / n) * Math.PI * 2, z: 0, vz: 0, fly: 0 }));
  },
  update(G, dt) {
    G.omega = Math.min(4.6, 1.5 + G.t * 0.055);
    G.flipT -= dt;
    if (G.flipT <= 0) { G.dir *= -1; G.flipT = G.rand(7, 13); G.toast('BALIK ARAH!', 1100); G.sfx('select'); }
    const prev = G.ang;
    G.ang = wrapA(G.ang + G.omega * G.dir * dt);
    const beams = G.t > 22 ? [G.ang, G.ang + Math.PI] : [G.ang];
    const prevBeams = G.t > 22 ? [prev, prev + Math.PI] : [prev];
    for (const e of G.ents) {
      if (e.fly) { e.fly += dt; continue; }
      if (G.tap(e, 'a') && e.z <= 0) { e.vz = 620; G.sfxv('jump', { volume: 0.6 }); }
      if (e.z > 0 || e.vz > 0) { e.vz -= 2100 * dt; e.z = Math.max(0, e.z + e.vz * dt); if (e.z === 0) e.vz = 0; }
      if (!e.alive) continue;
      beams.forEach((bm, k) => {
        const d0 = wrapA(prevBeams[k] - e.a), d1 = wrapA(bm - e.a);
        if (Math.sign(d0) !== Math.sign(d1) && Math.abs(d0) < 1 && Math.abs(d1) < 1) {
          if (e.z < 34) { e.alive = false; e.fly = 0.001; G.out.unshift(e); G.sfx('fall'); G.buzz(e, 'heavy'); G.shake = 0.4; G.burst(px(e), py(e), e.color, 16); }
          else { e.score++; G.float(px(e), py(e) - 80, '+1', '#ffd23f'); }
        }
      });
    }
    const solo = G.ents.length === 1;
    if ((solo && !G.alive.length) || (!solo && G.alive.length <= 1)) G.end([...G.alive, ...G.out]);
  },
  bot(G, e) {
    const d = wrapA(G.ang - e.a) * -G.dir;
    const tt = (d < 0 ? d + Math.PI * 2 : d) / G.omega;
    const want = 0.13 + (e.i * 0.013);
    return { a: tt < want && tt > 0.05 && Math.random() < 0.93 };
  },
  draw(G, ctx) {
    const beams = G.t > 22 ? [G.ang, G.ang + Math.PI] : [G.ang];
    const list = [...G.ents.map(e => ({ y: py(e), e })), ...beams.map(a => ({ y: CY + Math.sin(a) * RING * 0.25, beam: a }))].sort((a, b) => a.y - b.y);
    // post
    for (const it of list) {
      if (it.beam != null) {
        const a = it.beam, x2 = CX + Math.cos(a) * (RING + 70), y2 = CY + Math.sin(a) * (RING + 70) * 0.5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#0b0720'; ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(CX, CY - 12); ctx.lineTo(x2, y2 - 12); ctx.stroke();
        ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 17; ctx.beginPath(); ctx.moveTo(CX, CY - 12); ctx.lineTo(x2, y2 - 12); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 17; ctx.setLineDash([22, 22]); ctx.beginPath(); ctx.moveTo(CX, CY - 12); ctx.lineTo(x2, y2 - 12); ctx.stroke(); ctx.setLineDash([]);
      } else {
        const e = it.e, x = px(e), y = py(e);
        if (e.fly) { spr(ctx, G.blob(e, 'wow'), x + e.fly * 500 * Math.cos(e.a), y - e.fly * 600 + e.fly * e.fly * 900, 70, 70, e.fly * 8); continue; }
        shadow(ctx, x, y + 26, 60 - e.z * 0.08);
        spr(ctx, G.blob(e, e.z > 0 ? 'wow' : 'happy'), x, y - e.z * 0.6, 70);
        ctx.font = '700 17px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(e.name, x, y + 52);
      }
    }
    ctx.fillStyle = '#0b0720'; rr(ctx, CX - 22, CY - 70, 44, 76, 12); ctx.fill();
    ctx.fillStyle = '#ffd23f'; rr(ctx, CX - 16, CY - 64, 32, 64, 9); ctx.fill();
    G.text(`Kecepatan ${Math.round(G.omega * 10)}`, W - 150, 100, 26, '#2de2e6');
  }
});
const px = e => CX + Math.cos(e.a) * RING;
const py = e => CY + Math.sin(e.a) * RING * 0.5;

// ============================================================ LARI KENCANG
const LANES = [230, 345, 460, 575], START = 130, FIN = 1150, HURD = [340, 520, 700, 880, 1040];
export const race = game2d({
  id: 'race', name: 'Lari Kencang', music: 'music_kart', time: 60, fill: 4, layout: 'buttons', ctrl: { a: 'LARI', b: 'LOMPAT', hint: 'Tekan LARI berkali-kali!' },
  help: 'Tekan LARI secepat mungkin untuk berlari. Tekan LOMPAT tepat sebelum rintangan, kalau tidak kamu tersandung!',
  controls: '✕ / LARI: tekan terus  ·  ○ □ / LOMPAT: lompati rintangan',
  sprites: () => ['hurdle', 'flag:#ffd23f', 'tree', 'cloud'],
  hudValue: e => e.place ? `#${e.place}` : `${Math.round(((e.x || START) - START) / (FIN - START) * 100)}%`,
  label: e => e.place ? `finish ${e.ft.toFixed(1)} dtk` : `${Math.round((e.x - START) / (FIN - START) * 100)}% jalan`,
  bg(G, b) {
    const g = b.createLinearGradient(0, 0, 0, 200); g.addColorStop(0, '#5ec8ff'); g.addColorStop(1, '#bff0ff'); b.fillStyle = g; b.fillRect(0, 0, W, 200);
    for (let k = 0; k < 5; k++) b.drawImage(G.sprite('cloud'), 80 + k * 260, 70 + (k % 2) * 30, 180, 90);
    for (let k = 0; k < 14; k++) b.drawImage(G.sprite('tree'), k * 96 - 10, 120 + (k % 2) * 10, 80, 100);
    b.fillStyle = '#3fbf63'; b.fillRect(0, 170, W, H);
    b.fillStyle = '#d9643a'; b.fillRect(0, 175, W, 470);
    LANES.forEach((y, k) => { b.fillStyle = k % 2 ? '#e3724a' : '#d9643a'; b.fillRect(0, y - 55, W, 110); b.fillStyle = '#fff'; b.fillRect(0, y + 53, W, 4); });
    b.fillStyle = '#fff'; b.fillRect(START - 4, 175, 8, 460);
    for (let y = 175, k = 0; y < 635; y += 20, k++) for (let x = 0; x < 2; x++) { b.fillStyle = (k + x) % 2 ? '#111' : '#fff'; b.fillRect(FIN + x * 20, y, 20, 20); }
    b.fillStyle = '#3fbf63'; b.fillRect(0, 640, W, 80);
  },
  setup(G) {
    G.places = 0;
    G.ents.forEach((e, k) => Object.assign(e, { x: START, v: 0, z: 0, vz: 0, stun: 0, lane: LANES[k], knocked: new Set(), place: 0, ft: 0 }));
  },
  update(G, dt) {
    for (const e of G.ents) {
      if (e.place) continue;
      e.stun -= dt;
      if (G.tap(e, 'a') && e.stun <= 0) { e.v = Math.min(520, e.v + 52); }
      if (G.tap(e, 'b') && e.z <= 0 && e.stun <= 0) { e.vz = 560; G.sfxv('jump', { volume: 0.5 }); }
      e.v = Math.max(0, e.v - 230 * dt);
      if (e.z > 0 || e.vz > 0) { e.vz -= 2000 * dt; e.z = Math.max(0, e.z + e.vz * dt); if (!e.z) e.vz = 0; }
      const nx = e.x + e.v * dt;
      for (const hx of HURD) if (e.x < hx - 20 && nx >= hx - 20 && !e.knocked.has(hx)) {
        if (e.z < 30) { e.knocked.add(hx); e.stun = 0.75; e.v = 0; G.sfx('bump'); G.buzz(e, 'heavy'); G.burst(hx, e.lane, '#fff', 8, 150); }
      }
      e.x = e.stun > 0 ? e.x : nx;
      if (e.x >= FIN) { e.x = FIN; e.place = ++G.places; e.ft = G.t; G.sfx(e.place === 1 ? 'roundwin' : 'lap'); G.buzz(e, 'success'); G.toast(`${e.name} finish #${e.place}!`); if (!G.endAt) G.endAt = G.t + 8; }
    }
    if (G.ents.every(e => e.place) || (G.endAt && G.t > G.endAt)) G.end([...G.ents].sort((a, b) => (a.place || 99) - (b.place || 99) || b.x - a.x));
  },
  order: G => [...G.ents].sort((a, b) => (a.place || 99) - (b.place || 99) || b.x - a.x),
  bot(G, e) {
    const next = HURD.find(hx => hx > e.x + 5 && !e.knocked.has(hx));
    const jump = next && next - e.x < 70 + e.v * 0.12 && next - e.x > 20 && Math.random() < 0.5;
    return { a: Math.random() < 7.5 / 60, b: jump && Math.random() < 0.9 };
  },
  draw(G, ctx) {
    for (const e of G.ents) {
      for (const hx of HURD) { if (e.knocked.has(hx)) spr(ctx, G.sprite('hurdle'), hx + 10, e.lane + 30, 70, 62, 1.2); else spr(ctx, G.sprite('hurdle'), hx, e.lane + 10, 64, 56); }
    }
    for (const e of G.ents) {
      shadow(ctx, e.x, e.lane + 40, 56 - e.z * 0.05);
      const run = G.lite ? 0 : Math.abs(Math.sin(G.t * (6 + e.v / 30))) * (e.v > 20 ? 8 : 0);
      spr(ctx, G.blob(e, e.stun > 0 ? 'wow' : e.place === 1 ? 'cool' : 'happy'), e.x, e.lane + 8 - e.z * 0.7 - run, 70, 70, e.stun > 0 ? 0.5 : 0);
      ctx.font = '700 18px Fredoka, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText(e.name, 14, e.lane - 30);
      if (e.place) G.text('#' + e.place, e.x + 50, e.lane - 20, 34, '#ffd23f');
    }
    spr(ctx, G.sprite('flag:#ffd23f'), FIN + 60, 150, 56, 70);
  }
});

// ============================================================ REAKSI KILAT
const ROUNDS = 6;
export const reflex = game2d({
  id: 'reflex', name: 'Reaksi Kilat', music: 'music_quiz', fill: 2, layout: 'buttons', ctrl: { a: 'TEKAN!', hint: 'Tunggu hijau, lalu tekan!' },
  help: 'Tunggu lampu HIJAU lalu tekan secepat kilat! Kalau menekan saat masih merah, kamu gugur di ronde itu.',
  controls: '✕ / TEKAN  ·  ' + ROUNDS + ' ronde',
  sprites: () => ['bolt'],
  label: e => `${e.score} ronde menang · terbaik ${e.best ? e.best + ' ms' : '-'}`,
  setup(G) { G.round = 0; next(G); G.ents.forEach(e => { e.best = 0; }); },
  update(G, dt) {
    G.pt += dt;
    if (G.ph === 'wait') {
      for (const e of G.ents) if (G.tap(e, 'a') && !e.res) { e.res = 'early'; G.sfx('wrong'); G.buzz(e, 'error'); }
      if (G.pt >= G.waitFor) { G.ph = 'go'; G.pt = 0; G.sfx('go'); G.ents.forEach(e => G.buzz(e, 'medium')); }
      if (G.ents.every(e => e.res === 'early')) { G.ph = 'res'; G.pt = 0; }
    } else if (G.ph === 'go') {
      for (const e of G.ents) if (G.tap(e, 'a') && !e.res) {
        e.res = Math.round(G.pt * 1000);
        if (!G.winner) { G.winner = e; e.score++; G.sfx('roundwin'); G.buzz(e, 'success'); }
        if (!e.best || e.res < e.best) e.best = e.res;
      }
      if (G.pt > 2 || G.ents.every(e => e.res)) { G.ph = 'res'; G.pt = 0; }
    } else if (G.ph === 'res' && G.pt > 2.2) { if (G.round >= ROUNDS) G.end(); else next(G); }
  },
  bot(G, e) {
    if (G.ph === 'wait') return { a: G.pt > 0.5 && Math.random() < 0.0015 };
    if (G.ph === 'go') { e.data.react ||= G.rand(0.21, 0.42); return { a: G.pt > e.data.react }; }
    e.data.react = 0; return {};
  },
  draw(G, ctx) {
    const go = G.ph === 'go', res = G.ph === 'res';
    const col = go ? '#3ddc84' : res ? '#8a5cff' : '#ff4d6d';
    ctx.fillStyle = '#0b0720'; ctx.beginPath(); ctx.arc(W / 2, 300, 176, 0, 6.283); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(W / 2, 300, 160, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(W / 2 - 50, 230, 60, 30, -0.5, 0, 6.283); ctx.fill();
    if (go) spr(ctx, G.sprite('bolt'), W / 2, 300, 200);
    G.text(go ? 'TEKAN!' : res ? (G.winner ? `${G.winner.name}!` : 'Tidak ada!') : 'TUNGGU…', W / 2, 300 + (go ? 0 : 0), go ? 72 : 56, '#fff', 10);
    G.text(`Ronde ${G.round}/${ROUNDS}`, W / 2, 110, 30, '#ffd23f');
    const n = G.ents.length;
    G.ents.forEach((e, k) => {
      const x = W / 2 + (k - (n - 1) / 2) * 270, y = 580;
      ctx.fillStyle = 'rgba(11,7,32,.7)'; rr(ctx, x - 120, y - 80, 240, 160, 24); ctx.fill();
      if (G.winner === e && res) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 6; rr(ctx, x - 120, y - 80, 240, 160, 24); ctx.stroke(); }
      spr(ctx, G.blob(e, e.res === 'early' ? 'wow' : G.winner === e ? 'cool' : 'happy'), x, y - 22, 80);
      const t = e.res === 'early' ? 'Terlalu cepat!' : typeof e.res === 'number' ? e.res + ' ms' : (go ? '…' : '');
      G.text(t, x, y + 50, 26, e.res === 'early' ? '#ff4d6d' : '#fff', 4);
    });
  }
});
function next(G) { G.round++; G.ph = 'wait'; G.pt = 0; G.waitFor = G.rand(1.4, 4.2); G.winner = null; G.ents.forEach(e => { e.res = null; }); }

// ============================================================ TANGKAP BUAH
const FRUITS = ['apple', 'orange', 'banana', 'grape', 'melon', 'strawberry'];
export const fruit = game2d({
  id: 'fruit', name: 'Tangkap Buah', music: 'music_lobby', time: 60, fill: 2, layout: 'pad', ctrl: { a: null, hint: 'Geser keranjangmu' },
  help: 'Tangkap buah yang jatuh dengan keranjangmu! Apel emas +5. Bom -3 dan bikin pusing.',
  controls: 'Stik kiri-kanan: geser keranjang',
  sprites: G => [...FRUITS, 'goldfruit', 'bomb', 'boom', 'cloud', 'tree', ...G.ents.map(e => `basket:${e.color}`)],
  bg(G, b) {
    const g = b.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#6fd3ff'); g.addColorStop(0.75, '#d6f6ff'); g.addColorStop(0.751, '#5fd06b'); g.addColorStop(1, '#3fbf63');
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    for (let k = 0; k < 4; k++) b.drawImage(G.sprite('cloud'), 60 + k * 330, 110 + (k % 2) * 50, 220, 110);
    for (let k = 0; k < 8; k++) b.drawImage(G.sprite('tree'), k * 170 - 20, 420 + (k % 2) * 20, 150, 190);
    b.fillStyle = '#4bcb6f'; b.fillRect(0, 610, W, 110);
  },
  setup(G) {
    G.items = []; G.booms = [];
    const n = G.ents.length;
    G.ents.forEach((e, k) => Object.assign(e, { x: W / 2 + (k - (n - 1) / 2) * 220, stun: 0, wob: 0 }));
  },
  update(G, dt) {
    G.spawn = (G.spawn || 0) - dt;
    if (G.spawn <= 0) {
      G.spawn = Math.max(0.22, 0.55 - G.t * 0.006) / Math.max(1, G.ents.length * 0.6);
      const r = Math.random();
      G.items.push({ x: G.rand(60, W - 60), y: -40, vy: G.rand(160, 260), kind: r < 0.15 ? 'bomb' : r < 0.25 ? 'goldfruit' : G.pick(FRUITS), rot: G.rand(-2, 2) });
    }
    for (const e of G.ents) {
      e.stun -= dt; e.wob = Math.max(0, e.wob - dt * 4);
      if (e.stun <= 0) e.x = clamp(e.x + e.in.x * 780 * dt, 60, W - 60);
    }
    for (const it of G.items) {
      it.vy += 300 * dt; it.y += it.vy * dt;
      if (it.y > 600 && it.y < 660 && !it.done) {
        const e = G.ents.filter(q => Math.abs(q.x - it.x) < 66).sort((a, b) => Math.abs(a.x - it.x) - Math.abs(b.x - it.x))[0];
        if (e) {
          it.done = true; e.wob = 1;
          if (it.kind === 'bomb') { e.score = Math.max(0, e.score - 3); e.stun = 1; G.booms.push({ x: it.x, y: 620, t: 0 }); G.sfx('fall'); G.buzz(e, 'heavy'); G.float(it.x, 560, '-3', '#ff4d6d'); }
          else { const v = it.kind === 'goldfruit' ? 5 : 1; e.score += v; G.sfxv(v > 1 ? 'roundwin' : 'lock', { volume: 0.6 }); G.buzz(e); G.float(it.x, 560, '+' + v, v > 1 ? '#ffd23f' : '#fff'); }
        }
      }
    }
    G.items = G.items.filter(i => !i.done && i.y < H + 60);
    G.booms = G.booms.filter(b => (b.t += dt) < 0.4);
  },
  bot(G, e) {
    let best = null, bs = 1e9;
    for (const it of G.items) {
      if (it.kind === 'bomb' || it.y > 640) continue;
      const tLand = (620 - it.y) / Math.max(60, it.vy);
      const reach = Math.abs(it.x - e.x) / 700;
      if (reach > tLand + 0.1) continue;
      const s = tLand + (it.kind === 'goldfruit' ? -0.5 : 0);
      if (s < bs) { bs = s; best = it; }
    }
    const bomb = G.items.find(it => it.kind === 'bomb' && it.y > 380 && Math.abs(it.x - e.x) < 80);
    if (bomb) return { x: bomb.x > e.x ? -1 : 1 };
    if (!best) return { x: clamp((W / 2 - e.x) / 300, -0.5, 0.5) };
    return { x: clamp((best.x - e.x) / 60, -1, 1) };
  },
  draw(G, ctx) {
    for (const it of G.items) spr(ctx, G.sprite(it.kind), it.x, it.y, it.kind === 'goldfruit' ? 64 : 54, it.kind === 'goldfruit' ? 64 : 54, G.lite ? 0 : G.t * it.rot);
    for (const e of G.ents) {
      const wob = Math.sin(G.t * 30) * e.wob * 6;
      spr(ctx, G.blob(e, e.stun > 0 ? 'wow' : 'happy'), e.x, 590 + wob, 56);
      spr(ctx, G.sprite(`basket:${e.color}`), e.x, 640 + wob, 130, 76);
    }
    for (const b of G.booms) spr(ctx, G.sprite('boom'), b.x, b.y, 120 + b.t * 200);
  }
});
