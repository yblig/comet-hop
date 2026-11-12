// 30 utility tools for the TV (remote / controller friendly) and phones.
// Tools marked net:true let phones in the room take part (buzzer, voting, drawing, …).
import { h, btn, toast } from '../ui/dom.js';
import { audio } from '../lib/audio.js';
import { haptics } from '../lib/haptics.js';
import { storage } from '../lib/storage.js';
import { listPads, BTN } from '../input/pads.js';
import { isLite } from '../lite.js';
import { native } from '../lib/native.js';
import { TRUTH, DARE, TALK, CHARADES } from './decks.js';

const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const pad2 = n => String(n).padStart(2, '0');
const fmtT = s => { s = Math.max(0, Math.ceil(s)); const m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)}:${pad2(m % 60)}:${pad2(s % 60)}` : `${pad2(m)}:${pad2(s % 60)}`; };
const rupiah = n => 'Rp' + Math.round(n).toLocaleString('id-ID');
const names = c => { const l = c.session?.list.filter(p => p.connected).map(p => p.name) || []; return l.length >= 2 ? l : null; };

// ------------------------------------------------------------------ framework
export function openTool(t, root, session) {
  root.style.padding = '0';
  root.append(h('div', { class: 'party-bg' }, h('div', { class: 'confetti-dots' })));
  const main = h('div', { class: 'tool-main' });
  const sub = h('div', { class: 'mini' }, t.desc || '');
  const scr = h('div', { class: 'tool-screen' },
    h('div', { class: 'topbar' }, btn(null, 'dark round', () => native.handleBack(), { icon: 'back', sound: 'back' }),
      h('div', { class: 'ti', style: { fontSize: '34px' } }, t.icon), h('div', { class: 'grow' }, h('h2', { class: 'title-m' }, t.name), sub)),
    main);
  root.append(scr);
  const timers = [], offs = [];
  const inst = { name: t.name, onPad: null, onMsg: null, layoutFor: null, destroy: null };
  const c = {
    main, session, sub, lite: isLite(),
    every(ms, f) { const id = setInterval(f, ms); timers.push(id); return id; },
    after(ms, f) { const id = setTimeout(f, ms); timers.push(id); return id; },
    raf(f) { let on = true; const loop = now => { if (!on) return; f(now); requestAnimationFrame(loop); }; requestAnimationFrame(loop); offs.push(() => (on = false)); },
    onPad: f => (inst.onPad = f), onMsg: f => (inst.onMsg = f), layout: f => { inst.layoutFor = f; session?.sendLayouts(); },
    sendAll: m => session?.list.forEach(p => session.send(p, m)),
    off: f => offs.push(f)
  };
  if (t.net && !session) main.append(h('p', { class: 'dim', style: { fontSize: '18px' } }, '📱 Fitur ini makin seru kalau dibuka dari Lobby host, supaya HP teman bisa ikut.'));
  const cleanup = t.run(c);
  inst.destroy = () => { timers.forEach(id => { clearInterval(id); clearTimeout(id); }); offs.forEach(f => f()); cleanup?.(); };
  return inst;
}

// big round buttons row helper
const row = (...kids) => h('div', { class: 'tool-row' }, ...kids);
const B = (label, cls, f, icon) => btn(label, cls + ' small', f, icon ? { icon } : {});
function stepper(label, get, set, step = 1, min = 0, max = 999, fmt = v => v) {
  const val = h('b', { style: { minWidth: '70px', fontSize: '24px', textAlign: 'center' } }, fmt(get()));
  const upd = d => { set(Math.max(min, Math.min(max, get() + d))); val.textContent = fmt(get()); audio.play('tick'); };
  return h('div', { class: 'pill row', style: { gap: '8px' } }, h('span', {}, label), B('−', 'dark', () => upd(-step)), val, B('+', 'dark', () => upd(step)));
}
function alarm(c, times = 3) { for (let k = 0; k < times; k++) c.after(k * 600, () => audio.play('alarm')); haptics.heavy(); }

// ------------------------------------------------------------------ tools
export const TOOLS = [
  { id: 'clock', name: 'Jam Besar', icon: '🕐', desc: 'Jam & tanggal layar penuh', run(c) {
    const t = h('div', { class: 'big-num' }), d = h('div', { class: 'title-m dim' });
    c.main.append(t, d);
    const upd = () => { const n = new Date(); t.textContent = `${pad2(n.getHours())}:${pad2(n.getMinutes())}`; d.textContent = n.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ` · ${pad2(n.getSeconds())}`; };
    upd(); c.every(1000, upd);
  } },

  { id: 'timer', name: 'Timer', icon: '⏲️', desc: 'Hitung mundur dengan alarm', run(c) {
    let total = storage.get('tmr', 300), left = total, on = false, last = 0;
    const big = h('div', { class: 'big-num' }, fmtT(left));
    const go = B('Mulai', 'green', () => { on = !on; last = performance.now(); go.lastChild.textContent = on ? 'Jeda' : 'Lanjut'; }, 'play');
    const set = s => { total = left = s; on = false; storage.set('tmr', s); big.textContent = fmtT(left); go.lastChild.textContent = 'Mulai'; };
    c.main.append(big, row(...[1, 3, 5, 10, 15, 30].map(m => B(m + ' mnt', 'dark', () => set(m * 60)))), row(B('−1 mnt', 'dark', () => set(Math.max(60, total - 60))), B('+1 mnt', 'dark', () => set(total + 60)), go, B('Ulang', 'cyan', () => set(total), 'back')));
    c.every(200, () => { if (!on) return; const n = performance.now(); left -= (n - last) / 1000; last = n; big.textContent = fmtT(left); big.style.color = left < 10 ? 'var(--red)' : ''; if (left <= 0) { on = false; left = 0; alarm(c, 4); go.lastChild.textContent = 'Mulai'; toast('⏰ Waktu habis!'); } });
  } },

  { id: 'stopwatch', name: 'Stopwatch', icon: '⏱️', desc: 'Hitung waktu + putaran', run(c) {
    let t = 0, on = false, last = 0; const laps = [];
    const big = h('div', { class: 'big-num' }, '00:00.0'), list = h('div', { class: 'list-edit' });
    const f = s => `${pad2(Math.floor(s / 60))}:${pad2(Math.floor(s % 60))}.${Math.floor((s * 10) % 10)}`;
    const go = B('Mulai', 'green', () => { on = !on; last = performance.now(); go.lastChild.textContent = on ? 'Jeda' : 'Lanjut'; }, 'play');
    c.main.append(big, row(go, B('Putaran', 'cyan', () => { if (!on) return; laps.unshift(t); list.prepend(h('span', { class: 'pill' }, `#${laps.length} ${f(t)}`)); audio.play('select'); }), B('Reset', 'dark', () => { on = false; t = 0; laps.length = 0; list.innerHTML = ''; big.textContent = f(0); go.lastChild.textContent = 'Mulai'; })), list);
    c.every(100, () => { if (!on) return; const n = performance.now(); t += (n - last) / 1000; last = n; big.textContent = f(t); });
  } },

  { id: 'pomodoro', name: 'Pomodoro', icon: '🍅', desc: 'Fokus 25 menit, istirahat 5', run(c) {
    let phase = 'Fokus', left = 25 * 60, on = false, last = 0, done = 0;
    const ph = h('div', { class: 'title-l' }, '🍅 Fokus'), big = h('div', { class: 'big-num' }, fmtT(left)), cnt = h('div', { class: 'pill' }, 'Sesi selesai: 0');
    const go = B('Mulai', 'green', () => { on = !on; last = performance.now(); go.lastChild.textContent = on ? 'Jeda' : 'Lanjut'; }, 'play');
    const next = () => { if (phase === 'Fokus') { done++; phase = done % 4 ? 'Istirahat' : 'Istirahat panjang'; left = done % 4 ? 300 : 900; } else { phase = 'Fokus'; left = 1500; } ph.textContent = (phase === 'Fokus' ? '🍅 ' : '☕ ') + phase; cnt.textContent = 'Sesi selesai: ' + done; big.textContent = fmtT(left); };
    c.main.append(ph, big, cnt, row(go, B('Lewati', 'dark', next), B('Reset', 'dark', () => { phase = 'Fokus'; left = 1500; done = 0; on = false; next(); phase = 'Fokus'; left = 1500; ph.textContent = '🍅 Fokus'; big.textContent = fmtT(left); go.lastChild.textContent = 'Mulai'; })));
    c.every(250, () => { if (!on) return; const n = performance.now(); left -= (n - last) / 1000; last = n; if (left <= 0) { alarm(c, 2); next(); } big.textContent = fmtT(left); });
  } },

  { id: 'hiit', name: 'Timer Olahraga', icon: '💪', desc: 'Interval latihan & istirahat', run(c) {
    const presets = [[20, 10, 8], [30, 10, 8], [40, 20, 6], [45, 15, 6]];
    let [work, rest, rounds] = presets[1], r = 1, phase = 'SIAP', left = 5, on = false, last = 0;
    const ph = h('div', { class: 'title-l' }), big = h('div', { class: 'big-num' }), info = h('div', { class: 'pill' });
    const paint = () => { ph.textContent = phase; big.textContent = Math.ceil(left); info.textContent = `Ronde ${r}/${rounds} · ${work}s latihan / ${rest}s istirahat`; c.main.style.background = phase === 'LATIHAN' ? 'rgba(61,220,132,.18)' : phase === 'ISTIRAHAT' ? 'rgba(58,176,255,.18)' : ''; };
    const go = B('Mulai', 'green', () => { on = !on; last = performance.now(); go.lastChild.textContent = on ? 'Jeda' : 'Lanjut'; }, 'play');
    const reset = () => { r = 1; phase = 'SIAP'; left = 5; on = false; go.lastChild.textContent = 'Mulai'; paint(); };
    c.main.append(ph, big, info, row(...presets.map(p => B(`${p[0]}/${p[1]}`, 'dark', () => { [work, rest, rounds] = p; reset(); }))), row(go, B('Reset', 'dark', reset)));
    paint();
    let lastSec = 0;
    c.every(100, () => {
      if (!on) return; const n = performance.now(); left -= (n - last) / 1000; last = n;
      const s = Math.ceil(left); if (s !== lastSec && s <= 3 && s > 0) audio.play('count'); lastSec = s;
      if (left <= 0) {
        if (phase !== 'LATIHAN') { phase = 'LATIHAN'; left = work; audio.play('go'); }
        else if (r >= rounds) { phase = 'SELESAI! 🎉'; on = false; left = 0; audio.play('win'); }
        else { phase = 'ISTIRAHAT'; left = rest; r++; audio.play('lap'); }
      }
      paint();
    });
  } },

  { id: 'turns', name: 'Jam Giliran', icon: '♟️', desc: 'Jam catur untuk 2–4 pemain', run(c) {
    let n = 2, mins = 5, cur = -1, last = 0, times = [];
    const wrap = h('div', { class: 'teams' });
    const reset = () => { times = Array(n).fill(mins * 60); cur = -1; draw(); };
    const tap = () => { const now = performance.now(); if (cur >= 0) times[cur] -= (now - last) / 1000; cur = (cur + 1) % n; last = now; audio.play('select'); draw(); };
    const draw = () => { wrap.innerHTML = ''; times.forEach((t, i) => wrap.append(h('div', { class: 'score-team', style: { background: i === cur ? ['#ff4d6d', '#3ab0ff', '#ffc93c', '#3ddc84'][i] : 'rgba(0,0,0,.3)' } }, h('div', { class: 'title-m' }, `Pemain ${i + 1}`), h('div', { class: 'mid-num' }, fmtT(t))))); };
    const tb = B('GANTI GILIRAN', 'pink', tap, 'right'); tb.dataset.autofocus = '';
    c.main.append(wrap, row(tb, B('Reset', 'dark', reset)), row(stepper('Pemain', () => n, v => { n = v; reset(); }, 1, 2, 4), stepper('Menit', () => mins, v => { mins = v; reset(); }, 1, 1, 60)));
    c.main.append(h('div', { class: 'mini' }, 'Tombol ✕ di stik mana pun juga mengganti giliran.'));
    c.onPad((p, i) => { if (i === BTN.A || i === BTN.X) tap(); });
    reset();
    c.every(200, () => { if (cur < 0) return; const now = performance.now(); times[cur] -= (now - last) / 1000; last = now; if (times[cur] <= 0) { times[cur] = 0; alarm(c, 2); toast(`Waktu Pemain ${cur + 1} habis!`); cur = -1; } draw(); });
  } },

  { id: 'wheel', name: 'Roda Putar', icon: '🎡', desc: 'Putar roda untuk memilih', run(c) {
    const sets = { Pemain: () => names(c) || ['P1', 'P2', 'P3', 'P4'], 'Ya / Tidak': () => ['YA', 'TIDAK', 'YA', 'TIDAK'], 'Angka 1–8': () => ['1', '2', '3', '4', '5', '6', '7', '8'], Makanan: () => ['Bakso', 'Mie Ayam', 'Nasi Goreng', 'Sate', 'Martabak', 'Seblak', 'Pizza', 'Ayam Geprek'], Tantangan: () => ['Nyanyi', 'Joget', 'Push-up 5x', 'Pantun', 'Tebak lagu', 'Bebas!'] };
    let items = sets.Pemain(), ang = 0, spin = 0, spinning = false;
    const cv = h('canvas', { width: 600, height: 600 }), res = h('div', { class: 'title-l' }, 'Tekan PUTAR!');
    const cols = ['#ff4d6d', '#3ab0ff', '#ffc93c', '#3ddc84', '#8a5cff', '#ff9d2e', '#2de2e6', '#ff6fb5'];
    const draw = () => {
      const x = cv.getContext('2d'), n = items.length; x.clearRect(0, 0, 600, 600);
      items.forEach((it, i) => { x.beginPath(); x.moveTo(300, 300); x.arc(300, 300, 280, ang + i * 2 * Math.PI / n, ang + (i + 1) * 2 * Math.PI / n); x.closePath(); x.fillStyle = cols[i % cols.length]; x.fill(); x.lineWidth = 6; x.strokeStyle = '#0b0720'; x.stroke();
        x.save(); x.translate(300, 300); x.rotate(ang + (i + 0.5) * 2 * Math.PI / n); x.font = '800 34px "Baloo 2", sans-serif'; x.textAlign = 'right'; x.textBaseline = 'middle'; x.lineWidth = 6; x.strokeText(it, 260, 0); x.fillStyle = '#fff'; x.fillText(it, 260, 0); x.restore(); });
      x.beginPath(); x.arc(300, 300, 40, 0, 6.283); x.fillStyle = '#fff'; x.fill(); x.lineWidth = 8; x.stroke();
    };
    const go = () => { if (spinning) return; spinning = true; spin = 0.5 + Math.random() * 0.25; res.textContent = '…'; audio.play('start'); };
    const sb = B('PUTAR!', 'pink', go, 'play'); sb.dataset.autofocus = '';
    c.main.append(h('div', { class: 'row', style: { gap: '3vw' } }, h('div', { class: 'wheel-wrap' }, cv, h('div', { class: 'wheel-ptr' })), h('div', { class: 'col', style: { alignItems: 'center' } }, res, sb, row(...Object.keys(sets).map(k => B(k, 'dark', () => { items = sets[k](); draw(); }))))));
    draw();
    let tickA = 0;
    c.raf(() => { if (!spinning) return; ang += spin; spin *= 0.985; const seg = Math.floor(ang / (2 * Math.PI / items.length)); if (seg !== tickA) { tickA = seg; audio.play('tick'); } draw();
      if (spin < 0.002) { spinning = false; const n = items.length; const a = ((-Math.PI / 2 - ang) % (2 * Math.PI) + 4 * Math.PI) % (2 * Math.PI); res.textContent = '🎉 ' + items[Math.floor(a / (2 * Math.PI / n))]; audio.play('win'); } });
  } },

  { id: 'dice', name: 'Lempar Dadu', icon: '🎲', desc: '1–3 dadu', run(c) {
    let n = 2; const box = h('div', { class: 'tool-row', style: { gap: '24px' } }), tot = h('div', { class: 'title-l' }, '');
    const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
    const face = v => h('div', { class: 'die' }, [...Array(9)].map((_, i) => h('i', { class: PIPS[v].includes(i) ? 'on' : '' })));
    const show = vals => { box.innerHTML = ''; vals.forEach(v => box.append(face(v))); tot.textContent = n > 1 ? `Total: ${vals.reduce((a, b) => a + b, 0)}` : ''; };
    const roll = () => { const fin = [...Array(n)].map(() => 1 + Math.floor(Math.random() * 6)); if (c.lite) { show(fin); audio.play('lock'); return; } let k = 0; const id = setInterval(() => { show([...Array(n)].map(() => 1 + Math.floor(Math.random() * 6))); audio.play('tick'); if (++k > 8) { clearInterval(id); show(fin); audio.play('lock'); } }, 70); };
    const rb = B('LEMPAR!', 'pink', roll, 'play'); rb.dataset.autofocus = '';
    c.main.append(box, tot, row(rb, stepper('Dadu', () => n, v => { n = v; roll(); }, 1, 1, 3)));
    roll(); c.onPad((p, i) => i === BTN.A && roll());
  } },

  { id: 'coin', name: 'Lempar Koin', icon: '🪙', desc: 'Angka atau gambar?', run(c) {
    const coin = h('div', { class: 'coin3d' }, '?'), r = h('div', { class: 'title-l' }), hist = h('div', { class: 'mini' });
    const res = [];
    const flip = () => { const v = Math.random() < 0.5 ? 'ANGKA' : 'GAMBAR'; coin.textContent = '…'; c.after(c.lite ? 0 : 500, () => { coin.textContent = v === 'ANGKA' ? '1000' : '🦅'; r.textContent = v; res.unshift(v[0]); hist.textContent = 'Riwayat: ' + res.slice(0, 15).join(' '); audio.play('lock'); }); audio.play('dash'); };
    const fb = B('LEMPAR!', 'pink', flip, 'play'); fb.dataset.autofocus = '';
    c.main.append(coin, r, fb, hist); c.onPad((p, i) => i === BTN.A && flip());
  } },

  { id: 'random', name: 'Angka Acak', icon: '🔢', desc: 'Angka acak dari min–maks', run(c) {
    let lo = 1, hi = 100; const big = h('div', { class: 'big-num' }, '?');
    const gen = () => { big.textContent = lo + Math.floor(Math.random() * (hi - lo + 1)); audio.play('lock'); };
    const gb = B('ACAK!', 'pink', gen, 'play'); gb.dataset.autofocus = '';
    c.main.append(big, gb, row(stepper('Min', () => lo, v => (lo = Math.min(v, hi)), 1, 0, 9999), stepper('Maks', () => hi, v => (hi = Math.max(v, lo)), 10, 1, 99999)));
  } },

  { id: 'teams', name: 'Bagi Tim', icon: '👥', desc: 'Acak orang jadi beberapa tim', run(c) {
    let people = 8, teams = 2; const out = h('div', { class: 'teams' });
    const cols = ['#ff4d6d', '#3ab0ff', '#ffc93c', '#3ddc84'];
    const make = () => { const list = shuffle(names(c) || [...Array(people)].map((_, i) => `Orang ${i + 1}`)); out.innerHTML = ''; for (let t = 0; t < teams; t++) out.append(h('div', { class: 'score-team', style: { background: cols[t] + '33', borderColor: cols[t] } }, h('div', { class: 'title-m', style: { color: cols[t] } }, `Tim ${'ABCD'[t]}`), ...list.filter((_, i) => i % teams === t).map(n => h('div', { style: { fontSize: '20px' } }, n)))); audio.play('confirm'); };
    const mb = B('ACAK TIM', 'pink', make, 'play'); mb.dataset.autofocus = '';
    c.main.append(out, row(mb, stepper('Tim', () => teams, v => (teams = v), 1, 2, 4), names(c) ? h('span', { class: 'pill' }, 'Pakai nama pemain di room') : stepper('Orang', () => people, v => (people = v), 1, 2, 20)));
    make();
  } },

  { id: 'picker', name: 'Siapa Duluan?', icon: '👉', desc: 'Pilih satu orang secara acak', run(c) {
    let n = 4; const big = h('div', { class: 'mid-num' }, '?');
    const go = () => { const l = names(c) || [...Array(n)].map((_, i) => `Pemain ${i + 1}`); let k = 0; const fin = pick(l); const id = setInterval(() => { big.textContent = pick(l); audio.play('tick'); if (++k > (c.lite ? 1 : 12)) { clearInterval(id); big.textContent = '👉 ' + fin; audio.play('win'); } }, 80); };
    const pb = B('PILIH!', 'pink', go, 'play'); pb.dataset.autofocus = '';
    c.main.append(big, pb, names(c) ? h('div', { class: 'mini' }, 'Dari pemain di room') : stepper('Jumlah orang', () => n, v => (n = v), 1, 2, 20));
  } },

  { id: 'counter', name: 'Penghitung', icon: '➕', desc: '4 penghitung terpisah', run(c) {
    const vals = storage.get('counters', [0, 0, 0, 0]);
    const wrap = h('div', { class: 'teams' });
    const draw = () => { wrap.innerHTML = ''; vals.forEach((v, i) => { const num = h('div', { class: 'mid-num' }, v); wrap.append(h('div', { class: 'score-team', style: { background: 'rgba(0,0,0,.3)' } }, h('div', { class: 'pill' }, `Hitungan ${i + 1}`), num, row(B('−', 'dark', () => { vals[i]--; save(); }), B('+', 'green', () => { vals[i]++; save(); })))); }); };
    const save = () => { storage.set('counters', vals); audio.play('tick'); draw(); };
    c.main.append(wrap, B('Nolkan semua', 'dark', () => { vals.fill(0); save(); }));
    draw();
  } },

  { id: 'score', name: 'Papan Skor', icon: '🏆', net: true, desc: 'Skor tim untuk olahraga/kartu', run(c) {
    let n = 2; const sc = storage.get('scoreboard', [0, 0, 0, 0]);
    const cols = ['#ff4d6d', '#3ab0ff', '#ffc93c', '#3ddc84'];
    const wrap = h('div', { class: 'teams' });
    const add = (i, d) => { sc[i] = Math.max(0, sc[i] + d); storage.set('scoreboard', sc); audio.play(d > 0 ? 'lock' : 'tick'); draw(); };
    const draw = () => { wrap.innerHTML = ''; for (let i = 0; i < n; i++) wrap.append(h('div', { class: 'score-team', style: { background: cols[i] + '33', borderColor: cols[i] } }, h('div', { class: 'title-m', style: { color: cols[i] } }, `TIM ${'ABCD'[i]}`), h('div', { class: 'big-num', style: { fontSize: 'clamp(50px,22vh,180px)' } }, sc[i]), row(B('−1', 'dark', () => add(i, -1)), B('+1', 'green', () => add(i, 1)), B('+3', 'cyan', () => add(i, 3))))); };
    c.main.append(wrap, row(stepper('Tim', () => n, v => { n = v; draw(); c.layout(lay); }, 1, 2, 4), B('Nolkan', 'dark', () => { sc.fill(0); storage.set('scoreboard', sc); draw(); })), h('div', { class: 'mini' }, 'HP di room bisa menambah skor juga.'));
    const lay = () => ({ l: 'score', data: { teams: n } });
    c.layout(lay); c.onMsg((p, m) => { if (m.t === 'score') add(m.i | 0, m.d | 0); });
    draw();
  } },

  { id: 'truth', name: 'Jujur atau Tantangan', icon: '🤫', desc: 'Kartu permainan klasik', run(c) {
    const card = h('div', { class: 'cardtext' }, 'Pilih JUJUR atau TANTANGAN'), kind = h('div', { class: 'title-m' });
    const show = (k, deck) => { kind.textContent = k; kind.style.color = k === 'JUJUR' ? 'var(--cyan)' : 'var(--pink)'; card.textContent = pick(deck); audio.play('question'); };
    const jb = B('JUJUR', 'cyan', () => show('JUJUR', TRUTH)); jb.dataset.autofocus = '';
    c.main.append(kind, card, row(jb, B('TANTANGAN', 'pink', () => show('TANTANGAN', DARE))));
  } },

  { id: 'charades', name: 'Tebak Gaya', icon: '🎭', net: true, desc: 'Peragakan kata, yang lain menebak', run(c) {
    let cat = 'Hewan', word = '', left = 60, on = false, score = 0, actor = -1;
    const info = h('div', { class: 'title-m' }), big = h('div', { class: 'cardtext' }, 'Pilih kategori lalu MULAI'), tm = h('div', { class: 'mid-num' }, '60'), sc = h('div', { class: 'pill' }, 'Benar: 0');
    const players = () => c.session?.list.filter(p => p.connected && p.kind === 'phone') || [];
    const nextWord = () => {
      word = pick(CHARADES[cat]);
      const ps = players();
      if (ps.length) { actor = (actor + 1) % ps.length; const a = ps[actor]; big.textContent = `🤫 ${a.name} memperagakan… (kata ada di HP-nya)`; c.session.list.forEach(p => c.session.send(p, { t: 'layout', l: 'secret', data: p === a ? { title: word, sub: `Peragakan tanpa bicara! (${cat})` } : { title: 'Tebak!', sub: `${a.name} sedang memperagakan` } })); }
      else big.textContent = word;
    };
    const go = () => { score = 0; left = 60; on = true; sc.textContent = 'Benar: 0'; nextWord(); audio.play('go'); };
    c.main.append(info, big, tm, sc, row(B('MULAI', 'green', go, 'play'), B('✓ Benar', 'cyan', () => { if (!on) return; score++; sc.textContent = 'Benar: ' + score; audio.play('correct'); nextWord(); }), B('Lewati', 'dark', () => on && nextWord())), row(...Object.keys(CHARADES).map(k => B(k, 'dark', () => { cat = k; info.textContent = 'Kategori: ' + k; }))));
    info.textContent = 'Kategori: ' + cat;
    c.every(250, () => { if (!on) return; left -= 0.25; tm.textContent = Math.ceil(left); if (left <= 0) { on = false; alarm(c, 2); big.textContent = `Waktu habis! Benar ${score} kata.`; c.session?.sendLayouts(); } });
    c.layout(() => ({ l: 'wait', data: { title: 'Tebak Gaya', sub: 'Tunggu giliran memperagakan' } }));
  } },

  { id: 'talk', name: 'Kartu Ngobrol', icon: '💬', desc: 'Pertanyaan seru untuk ngobrol', run(c) {
    const deck = shuffle(TALK); let i = 0;
    const card = h('div', { class: 'cardtext' }, deck[0]), cnt = h('div', { class: 'pill' }, `1/${deck.length}`);
    const nx = B('Kartu berikutnya', 'pink', () => { i = (i + 1) % deck.length; card.textContent = deck[i]; cnt.textContent = `${i + 1}/${deck.length}`; audio.play('question'); }, 'right'); nx.dataset.autofocus = '';
    c.main.append(card, cnt, nx);
  } },

  { id: 'arisan', name: 'Undian Arisan', icon: '🎟️', desc: 'Undi nama tanpa terulang', run(c) {
    let n = 10, pool = [], won = [];
    const big = h('div', { class: 'mid-num' }, '?'), list = h('div', { class: 'list-edit' });
    const reset = () => { pool = names(c) || [...Array(n)].map((_, i) => `Peserta ${i + 1}`); won = []; list.innerHTML = ''; big.textContent = '?'; };
    const draw = () => { if (!pool.length) { big.textContent = 'Semua sudah dapat!'; return; } const k = Math.floor(Math.random() * pool.length); const w = pool.splice(k, 1)[0]; won.push(w); big.textContent = '🎉 ' + w; list.append(h('span', { class: 'pill' }, `${won.length}. ${w}`)); audio.play('win'); };
    const db = B('UNDI!', 'pink', draw, 'play'); db.dataset.autofocus = '';
    c.main.append(big, row(db, B('Ulang', 'dark', reset), names(c) ? null : stepper('Peserta', () => n, v => { n = v; reset(); }, 1, 2, 50)), list);
    reset();
  } },

  { id: 'bill', name: 'Patungan', icon: '💸', desc: 'Bagi tagihan rata', run(c) {
    let total = 0, people = 4, tip = 0;
    const disp = h('div', { class: 'mid-num' }, rupiah(0)), res = h('div', { class: 'title-l' });
    const upd = () => { disp.textContent = rupiah(total); res.textContent = people ? `${rupiah(total * (1 + tip / 100) / people)} / orang` : ''; };
    const key = k => { if (k === 'C') total = 0; else if (k === '⌫') total = Math.floor(total / 10); else if (k === '000') total = total * 1000; else total = total * 10 + +k; if (total > 1e12) total = 1e12; audio.play('tick'); upd(); };
    const pad = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' } }, ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '000', '⌫'].map(k => B(k, k === 'C' ? 'red' : 'dark', () => key(k))));
    c.main.append(h('div', { class: 'row', style: { gap: '4vw', alignItems: 'center' } }, h('div', { class: 'col', style: { alignItems: 'center' } }, h('div', { class: 'dim' }, 'Total tagihan'), disp, res, stepper('Orang', () => people, v => { people = v; upd(); }, 1, 1, 50), stepper('Servis %', () => tip, v => { tip = v; upd(); }, 5, 0, 30)), pad));
    upd();
  } },

  { id: 'metronome', name: 'Metronom', icon: '🥁', desc: 'Ketukan tempo untuk musik', run(c) {
    let bpm = 100, on = false, beat = 0, id = null;
    const dots = h('div', { class: 'tool-row' }, [0, 1, 2, 3].map(() => h('div', { style: { width: '50px', height: '50px', borderRadius: '50%', border: '5px solid var(--outline)', background: 'rgba(0,0,0,.3)' } })));
    const big = h('div', { class: 'big-num' }, bpm);
    const tick = () => { [...dots.children].forEach((d, i) => (d.style.background = i === beat % 4 ? (beat % 4 ? 'var(--cyan)' : 'var(--pink)') : 'rgba(0,0,0,.3)')); audio.play(beat % 4 ? 'tick' : 'count', { volume: 0.8 }); beat++; };
    const restart = () => { clearInterval(id); if (on) id = setInterval(tick, 60000 / bpm); big.textContent = bpm; };
    c.main.append(big, h('div', { class: 'pill' }, 'BPM'), dots, row(B('Mulai/Stop', 'green', () => { on = !on; beat = 0; restart(); }, 'play'), B('−5', 'dark', () => { bpm = Math.max(40, bpm - 5); restart(); }), B('+5', 'dark', () => { bpm = Math.min(220, bpm + 5); restart(); })));
    return () => clearInterval(id);
  } },

  { id: 'light', name: 'Senter Layar', icon: '💡', desc: 'Layar jadi lampu warna', run(c) {
    const cols = [['Putih', '#ffffff'], ['Hangat', '#ffd9a0'], ['Merah', '#ff2a3a'], ['Biru', '#2a7bff'], ['Hijau', '#2aff7b'], ['Ungu', '#9a4bff'], ['Pink', '#ff4fb8']];
    const full = h('div', { class: 'light-full', style: { background: '#fff' } });
    c.main.style.position = 'static';
    c.main.closest('.tool-screen').prepend(full);
    c.main.append(row(...cols.map(([n, col]) => B(n, 'dark', () => { full.style.background = col; }))), h('div', { class: 'mini', style: { color: '#333' } }, 'Atur kecerahan layar/TV untuk hasil terbaik'));
  } },

  { id: 'ambient', name: 'Lampu Suasana', icon: '🌈', desc: 'Warna lembut berganti pelan', run(c) {
    const full = h('div', { class: 'light-full' });
    c.main.closest('.tool-screen').prepend(full);
    let hue = 0, speed = 1;
    const label = h('div', { class: 'pill' }, 'Kecepatan: Pelan');
    c.main.append(label, row(B('Pelan', 'dark', () => { speed = 1; label.textContent = 'Kecepatan: Pelan'; }), B('Sedang', 'dark', () => { speed = 3; label.textContent = 'Kecepatan: Sedang'; }), B('Pesta', 'pink', () => { speed = 12; label.textContent = 'Kecepatan: Pesta'; })));
    const step = () => { hue = (hue + speed * 2) % 360; full.style.background = `radial-gradient(circle at 50% 40%, hsl(${hue},80%,55%), hsl(${(hue + 60) % 360},70%,25%))`; };
    step(); c.every(c.lite ? 1000 : 120, step);
  } },

  { id: 'padtest', name: 'Tes Stik', icon: '🎮', desc: 'Cek tombol & analog stik', run(c) {
    const wrap = h('div', { class: 'padtest' });
    const LAB = ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'SEL', 'START', 'L3', 'R3', '↑', '↓', '←', '→', 'PS'];
    c.main.append(wrap, h('div', { class: 'mini' }, 'Colok/sambungkan stik lalu tekan tombol. Stik PS3 paling stabil lewat kabel USB/OTG.'));
    c.every(80, () => {
      const pads = listPads();
      wrap.innerHTML = '';
      if (!pads.length) { wrap.append(h('div', { class: 'title-m dim' }, 'Belum ada stik terdeteksi 🎮')); return; }
      pads.forEach(p => {
        const stick = (x, y) => h('div', { style: { width: '90px', height: '90px', borderRadius: '50%', border: '4px solid var(--outline)', background: 'rgba(0,0,0,.35)', position: 'relative' } }, h('div', { style: { position: 'absolute', width: '26px', height: '26px', borderRadius: '50%', background: 'var(--cyan)', left: 32 + x * 32 + 'px', top: 32 + y * 32 + 'px' } }));
        wrap.append(h('div', { class: 'card' }, h('b', {}, p.name), h('div', { class: 'row', style: { justifyContent: 'center', gap: '20px', marginTop: '8px' } }, stick(p.a[0], p.a[1]), stick(p.a[2], p.a[3])),
          h('div', { class: 'btnlights' }, LAB.map((l, i) => h('span', { class: p.b & (1 << i) ? 'on' : '' }, l)))));
      });
    });
  } },

  { id: 'info', name: 'Info Perangkat', icon: '📶', desc: 'Status room, koneksi & layar', run(c) {
    const box = h('div', { class: 'card col', style: { padding: '16px 22px', textAlign: 'left', minWidth: 'min(640px, 90vw)' } });
    c.main.append(box);
    const upd = () => {
      const s = c.session, rows = [
        ['Kode room', s?.code || '— (buka dari lobby host)'], ['Pemain', s ? s.list.filter(p => p.connected).map(p => `${p.name} (${p.kind === 'pad' ? 'stik' : 'HP'})`).join(', ') || 'belum ada' : '-'],
        ['Stik terdeteksi', listPads().map(p => p.name).join(', ') || 'tidak ada'], ['Internet', navigator.onLine ? 'tersambung ✅' : 'offline ❌'],
        ['Layar', `${innerWidth}×${innerHeight} (×${devicePixelRatio})`], ['Mode hemat', isLite() ? 'aktif (animasi minimal)' : 'mati'], ['Versi', 'Mabar Party 2.0']
      ];
      box.innerHTML = ''; rows.forEach(([k, v]) => box.append(h('div', { class: 'row', style: { justifyContent: 'space-between', gap: '20px', fontSize: '18px' } }, h('span', { class: 'dim' }, k), h('b', { style: { textAlign: 'right' } }, v))));
    };
    upd(); c.every(1500, upd);
  } },

  // ---------------------------------------------------------- networked
  { id: 'buzzer', name: 'Bel Kuis', icon: '🔔', net: true, desc: 'Siapa duluan menekan bel', run(c) {
    let order = [], open = true;
    const big = h('div', { class: 'mid-num' }, 'Siap… tekan bel!'), list = h('div', { class: 'list-edit' });
    const reset = () => { order = []; open = true; big.textContent = 'Siap… tekan bel!'; big.style.color = ''; list.innerHTML = ''; c.session?.sendLayouts(); audio.play('select'); };
    const press = p => {
      if (!open || order.includes(p)) return;
      order.push(p);
      if (order.length === 1) { big.textContent = '🔔 ' + p.name; big.style.color = p.color; audio.play('roundwin'); c.session?.buzz(p, 'success'); }
      else audio.play('lock');
      list.append(h('span', { class: 'pill', style: { borderColor: p.color } }, `${order.length}. ${p.name}`));
    };
    const rb = B('Reset bel', 'pink', reset, 'back'); rb.dataset.autofocus = '';
    c.main.append(big, list, rb, h('div', { class: 'mini' }, 'HP: tombol BEL · Stik: tombol apa saja'));
    c.layout(() => ({ l: 'buttons', data: { a: 'BEL!', hint: 'Tekan secepatnya!' } }));
    c.onMsg((p, m) => { if (m.t === 'in' || m.t === 'bell') { /* handled by polling */ } });
    c.onPad((p, i) => press(p));
    c.raf(() => { c.session?.list.forEach(p => { if (p.kind === 'phone' && p.input?.a && !p._bell) { p._bell = true; press(p); } if (p.kind === 'phone' && !p.input?.a) p._bell = false; }); });
  } },

  { id: 'vote', name: 'Voting', icon: '🗳️', net: true, desc: 'Semua memilih dari HP', run(c) {
    const sets = { 'Ya / Tidak': ['YA 👍', 'TIDAK 👎'], 'A B C D': ['A', 'B', 'C', 'D'], 'Bintang 1–5': ['⭐1', '⭐2', '⭐3', '⭐4', '⭐5'], 'Makan apa?': ['Bakso', 'Mie', 'Nasi Goreng', 'Pizza'] };
    let opts = sets['Ya / Tidak'], votes = new Map(), hide = false;
    const bars = h('div', { class: 'col', style: { alignItems: 'center', width: '100%' } }), cnt = h('div', { class: 'pill' });
    const cols = ['#3ddc84', '#ff4d6d', '#3ab0ff', '#ffc93c', '#8a5cff'];
    const draw = () => { bars.innerHTML = ''; const total = votes.size; opts.forEach((o, i) => { const n = [...votes.values()].filter(v => v === i).length; bars.append(h('div', { class: 'vote-bar' }, h('b', { style: { minWidth: '150px', fontSize: '22px', textAlign: 'right' } }, o), h('div', { class: 'bar' }, h('i', { style: { width: hide ? '0' : (total ? n / total * 100 : 0) + '%', background: cols[i % 5] } })), h('b', { style: { minWidth: '40px', fontSize: '24px' } }, hide ? '?' : n))); }); cnt.textContent = `${votes.size} suara masuk`; };
    const lay = () => ({ l: 'vote', data: { opts } });
    c.main.append(cnt, bars, row(B('Tampilkan / Sembunyikan', 'cyan', () => { hide = !hide; draw(); }), B('Reset', 'dark', () => { votes.clear(); draw(); c.layout(lay); })), row(...Object.keys(sets).map(k => B(k, 'dark', () => { opts = sets[k]; votes.clear(); draw(); c.layout(lay); }))));
    c.layout(lay); c.onMsg((p, m) => { if (m.t === 'vote') { votes.set(p.id, m.i | 0); audio.play('lock'); draw(); } });
    c.onPad((p, i) => { const k = { [BTN.A]: 0, [BTN.B]: 1, [BTN.X]: 2, [BTN.Y]: 3 }[i]; if (k != null && k < opts.length) { votes.set(p.id, k); audio.play('lock'); draw(); } });
    draw();
  } },

  { id: 'draw', name: 'Papan Gambar', icon: '🎨', net: true, desc: 'Gambar di HP, tampil di TV', run(c) {
    const cv = h('canvas', { class: 'drawcanvas', width: 1280, height: 720 });
    cv.style.width = 'min(92vw, 150vh)'; cv.style.aspectRatio = '16/9';
    const x = cv.getContext('2d'); x.lineCap = 'round'; x.lineJoin = 'round';
    const clear = () => { x.fillStyle = '#fff'; x.fillRect(0, 0, 1280, 720); };
    clear();
    c.main.append(cv, row(B('Bersihkan', 'dark', () => { clear(); audio.play('back'); }), h('span', { class: 'mini' }, 'Gambar dari HP di room. Warna garis = warna pemain.')));
    const last = new Map();
    c.layout(() => ({ l: 'draw' }));
    c.onMsg((p, m) => {
      if (m.t === 'draw') {
        x.strokeStyle = m.c || p.color; x.lineWidth = m.w || 8;
        const pts = m.p || [];
        let prev = m.s ? null : last.get(p.id);
        for (let k = 0; k < pts.length; k += 2) { const px = pts[k] * 1280, py = pts[k + 1] * 720; if (prev) { x.beginPath(); x.moveTo(prev[0], prev[1]); x.lineTo(px, py); x.stroke(); } prev = [px, py]; }
        last.set(p.id, prev);
      } else if (m.t === 'clear') clear();
    });
  } },

  { id: 'marquee', name: 'Teks Berjalan', icon: '📢', net: true, desc: 'Pesan besar berjalan di layar', run(c) {
    let msg = 'Selamat datang di Mabar Party! 🎉', pos = 1, col = '#ffd23f';
    const m = h('div', { class: 'marquee' }, msg);
    const stage = h('div', { style: { position: 'relative', width: '100%', flex: 1, overflow: 'hidden' } }, m);
    const inp = h('input', { class: 'field', placeholder: 'Ketik pesan…', maxlength: 80, style: { maxWidth: '520px' } });
    const set = (t, c2) => { msg = t; col = c2 || '#ffd23f'; m.textContent = msg; m.style.color = col; pos = 1; audio.play('notify'); };
    c.main.append(stage, row(inp, B('Tampilkan', 'pink', () => inp.value.trim() && set(inp.value.trim()))));
    c.layout(() => ({ l: 'text' }));
    c.onMsg((p, mm) => { if (mm.t === 'text' && mm.v) set(`${p.name}: ${String(mm.v).slice(0, 80)}`, p.color); });
    m.style.color = col;
    let lastT = performance.now();
    c.raf(now => { const dt = (now - lastT) / 1000; lastT = now; pos -= dt * 0.18; const w = m.offsetWidth / (stage.offsetWidth || 1); if (pos < -w) pos = 1; m.style.left = (pos * 100) + '%'; });
  } },

  { id: 'emoji', name: 'Reaksi Emoji', icon: '😂', net: true, desc: 'Kirim emoji dari HP ke TV', run(c) {
    const stage = h('div', { style: { position: 'absolute', inset: 0, overflow: 'hidden' } });
    const counts = {};
    const tally = h('div', { class: 'tool-row' });
    c.main.append(stage, h('div', { class: 'title-m dim' }, 'Kirim reaksi dari HP! 😂 😍 👏 🔥 😱 🤣'), tally);
    const items = [];
    const fly = (e, who, color) => {
      const el = h('div', { class: 'emoji-fly' }, e, h('div', { style: { fontSize: '14px', color, textAlign: 'center', fontFamily: 'var(--body)' } }, who));
      el.style.left = (10 + Math.random() * 80) + '%'; el.style.top = '100%';
      stage.append(el); items.push({ el, y: 100, v: 18 + Math.random() * 12, x: Math.random() });
      if (items.length > 30) items.shift().el.remove();
      counts[e] = (counts[e] || 0) + 1;
      tally.innerHTML = ''; Object.entries(counts).forEach(([k, v]) => tally.append(h('span', { class: 'pill' }, `${k} ${v}`)));
      audio.playVaried('lock', { volume: 0.4 });
    };
    c.layout(() => ({ l: 'emoji' }));
    c.onMsg((p, m) => { if (m.t === 'emoji') fly(String(m.v).slice(0, 4), p.name, p.color); });
    c.onPad((p, i) => fly(['😂', '😍', '👏', '🔥'][i % 4], p.name, p.color));
    let last = performance.now();
    c.raf(now => { const dt = (now - last) / 1000; last = now; for (const it of items) { it.y -= it.v * dt; it.el.style.top = it.y + '%'; if (it.y < -20) it.el.style.display = 'none'; } });
  } },

  { id: 'soundboard', name: 'Soundboard', icon: '🔊', net: true, desc: 'Efek suara lucu untuk suasana', run(c) {
    const S = [['👏', 'Tepuk tangan', 'sb_clap'], ['🥁', 'Drumroll', 'sb_drum'], ['🤡', 'Ba-dum-tss', 'sb_rimshot'], ['📯', 'Terompet', 'sb_horn'], ['✅', 'Benar', 'correct'], ['❌', 'Salah', 'wrong'], ['🏆', 'Menang', 'win'], ['😢', 'Kalah', 'sb_lose'], ['🔔', 'Ding dong', 'sb_ding'], ['🦗', 'Krik krik', 'sb_cricket']];
    const last = h('div', { class: 'title-l' }, '🔊');
    const play = (i, who) => { const s = S[i]; if (!s) return; audio.play(s[2]); last.textContent = `${s[0]} ${s[1]}${who ? ' · ' + who : ''}`; };
    const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', width: 'min(980px, 96%)' } }, S.map((s, i) => B(`${s[0]} ${s[1]}`, i % 2 ? 'cyan' : 'pink', () => play(i))));
    c.main.append(last, grid);
    c.layout(() => ({ l: 'sound', data: { items: S.map(s => `${s[0]} ${s[1]}`) } }));
    c.onMsg((p, m) => { if (m.t === 'sound') play(m.i | 0, p.name); });
  } }
];
