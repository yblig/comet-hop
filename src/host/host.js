// Host side: room, players, lobby, game launching and results.
import { h, btn, avatar, PCOLORS, PNAMES, GAME_ART, toast, confirmBox, svgEl, ICONS } from '../ui/dom.js';
import { go, onScreenBack } from '../app.js';
import { HostNet, LOCAL } from '../net/net.js';
import { audio } from '../lib/audio.js';
import { haptics } from '../lib/haptics.js';
import { prefs } from '../state.js';
import { GAMES } from '../games/index.js';

let session = null;

export function hostScreen(root) {
  if (!session) session = new HostSession();
  return session.lobby(root);
}

const blankInput = () => ({ x: 0, y: 0, l: false, r: false, gas: false, brake: false, a: false, b: false, steer: 0 });

class HostSession {
  constructor() {
    this.players = [null, null, null, null];
    this.sel = 0;
    this.state = 'lobby';
    this.game = null;
    this.net = new HostNet();
    this.net.on('ready', code => { this.code = code; this.refresh?.(); });
    this.net.on('error', msg => { this.netError = msg; this.refresh?.(); });
    this.net.on('warn', msg => toast(msg));
    this.net.on('msg', (c, m) => this.onMsg(c, m));
    this.net.on('leave', c => this.onLeave(c));
    this.net.start();
    window.__host = this; // used by the preview/test scripts
  }

  // -------------------------------------------------------------- players
  get list() { return this.players.filter(Boolean); }
  get vip() { return this.list.find(p => p.connected) || null; }

  onMsg(conn, m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'hello') return this.onHello(conn, m);
    const p = this.players.find(q => q && q.conn === conn);
    if (!p) return;
    p.seen = performance.now();
    switch (m.t) {
      case 'in': Object.assign(p.input, m.s); break;
      case 'nav': this.onNav(p, m.k); break;
      case 'wiggle': this.onWiggle?.(p); break;
      case 'ping': conn.send({ t: 'pong', ts: m.ts }); break;
      default: this.game?.onMsg?.(p, m);
    }
  }

  onHello(conn, m) {
    const name = String(m.name || '').trim().slice(0, 12);
    let slot = this.players.findIndex(p => p && p.id === m.id);
    if (slot < 0) slot = this.players.findIndex(p => !p);
    if (slot < 0) { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 300); return; }
    const old = this.players[slot];
    const p = old || { slot, id: m.id, color: PCOLORS[slot], input: blankInput(), score: 0 };
    p.name = name || PNAMES[slot];
    p.conn = conn; p.connected = true; p.seen = performance.now();
    this.players[slot] = p;
    conn.send({ t: 'welcome', slot, color: p.color, name: p.name, room: this.code });
    audio.play(old ? 'select' : 'join'); haptics.light();
    if (!old) toast(`${p.name} bergabung!`);
    this.sendLayouts();
    this.refresh?.(slot);
    this.game?.onJoin?.(p);
  }

  onLeave(conn) {
    const p = this.players.find(q => q && q.conn === conn);
    if (!p) return;
    p.connected = false; p.input = blankInput();
    audio.play('leave');
    toast(`${p.name} terputus`);
    if (this.state === 'lobby') this.players[p.slot] = null;
    this.sendLayouts();
    this.refresh?.();
  }

  send(p, m) { if (p?.connected) p.conn.send(m); }
  buzz(p, k = 'light') { this.send(p, { t: 'buzz', k }); }

  layoutFor(p) {
    if (this.state === 'game' && this.game) return this.game.layoutFor?.(p) || { l: this.game.def.layout };
    if (this.state === 'results') return { l: 'results', data: this.resultFor(p) };
    const g = GAMES[this.sel];
    return p === this.vip ? { l: 'menu', data: { game: g.name } } : { l: 'lobby', data: { game: g.name, vip: this.vip?.name } };
  }

  sendLayouts() { for (const p of this.list) this.send(p, { t: 'layout', ...this.layoutFor(p) }); }

  onNav(p, k) {
    if (this.state === 'lobby' && p === this.vip) {
      if (k === 'left' || k === 'up') this.select((this.sel + GAMES.length - 1) % GAMES.length);
      else if (k === 'right' || k === 'down') this.select((this.sel + 1) % GAMES.length);
      else if (k === 'ok') this.startGame();
    } else if (this.state === 'results' && p === this.vip && k === 'ok') {
      go(hostScreen);
    } else if (this.state === 'game') this.game?.onNav?.(p, k);
  }

  select(i) {
    if (this.sel === i) return;
    this.sel = i;
    audio.play('select'); haptics.tap();
    this.refreshGames?.();
    this.sendLayouts();
  }

  // -------------------------------------------------------------- lobby
  lobby(root) {
    this.state = 'lobby';
    this.game = null;
    audio.playMusic('music_lobby');
    root.style.padding = '0';
    const bg = h('div', { class: 'party-bg' }, h('div', { class: 'confetti-dots' }));
    const wrap = h('div', { class: 'screen', style: { animation: 'none', gap: '12px' } });
    root.append(bg, wrap);

    const codeEl = h('div', { class: 'room-code' }, '····');
    const status = h('div', { class: 'mini' });
    const roomCard = h('div', { class: 'card room-card' },
      h('div', { class: 'title-m dim' }, 'KODE ROOM'), codeEl, status,
      h('div', { class: 'steps' },
        h('div', {}, '1. Di HP lain buka ', h('b', {}, 'Mabar Party')),
        h('div', {}, '2. Pilih ', h('b', {}, 'Jadi Controller')),
        h('div', {}, '3. Ketik kode di atas — maks. ', h('b', {}, '4 pemain'))));

    const slotsEl = h('div', { class: 'slots' });
    const gamesEl = h('div', { class: 'games' });
    const startBtn = btn('MAIN!', 'green', () => this.startGame(), { icon: 'play', sound: 'confirm' });
    const hint = h('div', { class: 'mini grow' });
    const right = h('div', { class: 'col', style: { minHeight: 0, gap: '14px' } }, slotsEl, gamesEl,
      h('div', { class: 'lobby-bottom' }, hint, startBtn));
    const top = h('div', { class: 'topbar' },
      btn(null, 'dark round', () => this.leave(), { icon: 'back', sound: 'back' }),
      h('h2', { class: 'title-m grow' }, 'Lobby'),
      h('div', { class: 'mini' }, LOCAL ? 'mode tes lokal' : ''));
    wrap.append(top, h('div', { class: 'lobby' }, roomCard, right));

    const renderSlots = joined => {
      slotsEl.innerHTML = '';
      this.players.forEach((p, i) => {
        const el = h('div', { class: 'card slot' + (p ? '' : ' empty') + (joined === i ? ' joined' : '') },
          avatar(p ? p.color : '#5b5390', p ? (p.connected ? 'happy' : 'sleep') : 'sleep'),
          h('div', { class: 'nm' }, p ? p.name : 'Kosong'));
        if (p && p === this.vip) el.append(h('div', { class: 'tag', style: { background: 'var(--yellow)' } }, 'PILIH GAME'));
        else el.append(h('div', { class: 'tag', style: { background: PCOLORS[i] } }, PNAMES[i]));
        p && (el.querySelector('.avatar').dataset.slot = i);
        slotsEl.append(el);
      });
      const n = this.list.filter(p => p.connected).length;
      const g = GAMES[this.sel];
      startBtn.disabled = n < 1;
      hint.textContent = n < 1 ? 'Menunggu pemain bergabung…' : `${n} pemain siap · ${g.name}${n < g.ideal ? ' · bot akan ikut main' : ''}`;
    };
    const renderGames = () => {
      gamesEl.innerHTML = '';
      GAMES.forEach((g, i) => {
        const card = h('div', { class: 'card game-card' + (i === this.sel ? ' sel' : '') },
          h('div', { class: 'art', html: GAME_ART[g.id] }),
          h('div', { class: 'meta' }, h('h3', {}, g.name), h('p', {}, g.desc)));
        if (g.badge) card.append(h('div', { class: 'badge' }, g.badge));
        card.addEventListener('pointerdown', () => { if (this.sel === i) return; this.select(i); });
        gamesEl.append(card);
      });
      renderSlots();
    };
    this.refreshGames = renderGames;
    this.refresh = joined => {
      codeEl.textContent = this.code || '····';
      status.textContent = this.netError ? '⚠ ' + this.netError : this.code ? 'Room siap — ayo gabung!' : 'Membuat room…';
      status.style.color = this.netError ? 'var(--red)' : '';
      renderSlots(joined);
    };
    this.onWiggle = p => {
      audio.playVaried('wiggle');
      const a = slotsEl.querySelector(`.avatar[data-slot="${p.slot}"]`);
      a?.animate([{ transform: 'scale(1.3,.7)' }, { transform: 'scale(.9,1.2) translateY(-18px)' }, { transform: 'none' }], { duration: 450, easing: 'ease-out' });
    };
    if (this.netError) { this.netError = null; this.net.start(); }
    renderGames();
    this.refresh();
    this.sendLayouts();
    onScreenBack(() => { this.leave(); return true; });
    return () => { this.refresh = null; this.refreshGames = null; this.onWiggle = null; };
  }

  leave() {
    confirmBox('Tutup room?', 'Semua controller akan terputus.', 'Tutup', () => {
      this.net.stop();
      session = null;
      import('../screens/home.js').then(m => go(m.homeScreen));
    });
  }

  // -------------------------------------------------------------- games
  startGame() {
    if (this.state !== 'lobby') return;
    const humans = this.list.filter(p => p.connected);
    if (!humans.length) { toast('Belum ada pemain. Gabung pakai kode room dulu!'); audio.play('wrong'); return; }
    const def = GAMES[this.sel];
    this.state = 'game';
    prefs.played(def.id);
    audio.play('start'); haptics.success();
    go(root => {
      root.style.padding = '0';
      this.game = def.create(this, root, humans);
      this.game.def = def;
      this.sendLayouts();
      onScreenBack(() => {
        confirmBox('Keluar game?', 'Kembali ke lobby, skor ronde ini hilang.', 'Keluar', () => go(hostScreen));
        return true;
      });
      return () => { this.game?.destroy(); this.game = null; };
    });
  }

  // results: [{ p (player or bot), name, color, label }] best first
  finish(results, title = 'Hasil') {
    this.results = results;
    this.state = 'results';
    go(root => this.resultsScreen(root, title));
  }

  resultFor(p) {
    const i = (this.results || []).findIndex(r => r.p === p);
    if (i < 0) return { rank: 0, label: '' };
    return { rank: i + 1, label: this.results[i].label, vip: p === this.vip };
  }

  resultsScreen(root, title) {
    audio.stopMusic(0.3);
    audio.play('win'); haptics.success();
    root.style.padding = '0';
    root.append(h('div', { class: 'party-bg' }, h('div', { class: 'confetti-dots' })));
    const wrap = h('div', { class: 'screen', style: { animation: 'none' } });
    root.append(wrap);
    const r = this.results;
    const order = [1, 0, 2, 3].filter(i => r[i]);
    const heights = ['62%', '46%', '34%', '24%'];
    const blockCol = ['#ffd23f', '#d6dcff', '#ff9d5c', '#8a7fd6'];
    const podium = h('div', { class: 'podium' }, order.map(i => h('div', { class: 'step', style: { height: '100%', justifyContent: 'flex-end' } },
      avatar(r[i].color, i === 0 ? 'cool' : i === 3 ? 'sleep' : 'happy'),
      h('div', { class: 'nm' }, r[i].name), h('div', { class: 'pts' }, r[i].label),
      h('div', { class: 'block', style: { height: heights[i], background: blockCol[i], animationDelay: (0.15 * (3 - i)) + 's' } }, String(i + 1)))));
    wrap.append(
      h('div', { class: 'row', style: { justifyContent: 'center' } }, h('h1', { class: 'title-l' }, `🏆 ${r[0].name} juara!`)),
      h('div', { class: 'dim', style: { textAlign: 'center', fontSize: '15px' } }, title),
      podium,
      h('div', { class: 'row', style: { justifyContent: 'center', paddingTop: '8px' } },
        btn('Lobby', 'dark small', () => go(hostScreen), { icon: 'home', sound: 'back' }),
        btn('Main Lagi', 'green small', () => { go(hostScreen); setTimeout(() => this.startGame(), 350); }, { icon: 'play', sound: 'confirm' })));
    this.sendLayouts();
    onScreenBack(() => { go(hostScreen); return true; });
  }
}
