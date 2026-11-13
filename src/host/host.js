// Host side (the TV / big screen): room, players (phones + physical controllers), lobby with
// game browser, tools and tonight's standings, game launching and results.
import { h, btn, avatar, PCOLORS, PNAMES, toast, confirmBox, svgEl } from '../ui/dom.js';
import { go, onScreenBack } from '../app.js';
import { HostNet, LOCAL } from '../net/net.js';
import { audio } from '../lib/audio.js';
import { haptics } from '../lib/haptics.js';
import { prefs } from '../state.js';
import { GAMES, CATS } from '../games/index.js';
import { CARDS } from '../games/cards.js';
import { TOOLS, openTool } from '../tools/index.js';
import { onPad, padInput, BTN } from '../input/pads.js';
import { nav } from '../input/nav.js';
import { settingsDialog } from '../screens/home.js';

let session = null;
export const getSession = () => session;

export function hostScreen(root) {
  if (!session) session = new HostSession();
  return session.lobby(root);
}

const blankInput = () => ({ x: 0, y: 0, l: false, r: false, gas: false, brake: false, a: false, b: false, steer: 0, k: [false, false, false, false] });
const PAD_ICON = '🎮', PHONE_ICON = '📱';

class HostSession {
  constructor() {
    this.players = [null, null, null, null];
    this.sel = 0; this.cat = 'semua'; this.tab = 'games';
    this.state = 'lobby';
    this.game = null; this.tool = null;
    this.standings = new Map();
    this.history = [];
    this.net = new HostNet();
    this.net.on('ready', code => { this.code = code; this.refresh?.(); });
    this.net.on('error', msg => { this.netError = msg; this.refresh?.(); });
    this.net.on('warn', msg => toast(msg));
    this.net.on('msg', (c, m) => this.onMsg(c, m));
    this.net.on('leave', c => this.onLeave(c));
    this.net.start();
    // physical controllers
    // A controller only becomes a player after it presses ✕ or START — so phantom devices
    // (sensor sub-devices, TV remotes) never take a slot.
    this.offs = [
      onPad('add', () => { if (!this._hinted) { this._hinted = true; toast('🎮 Stik terdeteksi — tekan ✕ untuk ikut main'); } }),
      onPad('remove', p => this.removePad(p)),
      onPad('press', (p, i) => this.onPadPress(p, i))
    ];
    nav.consume = (pad, i) => {
      if (this.players.some(q => q?.kind === 'pad' && q.pad.id === pad.id && q.connected)) return false;
      if (this.state !== 'lobby' && this.state !== 'tool') return false;
      if (i !== BTN.A && i !== BTN.START) return false;
      this.addPad(pad);
      return true;
    };
    const tick = () => {
      if (!this.alive) return;
      for (const pl of this.players) if (pl?.kind === 'pad') pl.input = padInput(pl.pad);
      this.raf = requestAnimationFrame(tick);
    };
    this.alive = true;
    this.raf = requestAnimationFrame(tick);
    window.__host = this; // used by the preview/test scripts
    window.__gameIds = GAMES.map(g => g.id); window.__toolIds = TOOLS.map(t => t.id);
    window.__goLobby = () => go(hostScreen); window.__openTool = id => this.openTool(TOOLS.find(t => t.id === id));
  }

  // -------------------------------------------------------------- players
  get list() { return this.players.filter(Boolean); }
  get vip() { return this.list.find(p => p.connected) || null; }

  addPad(pad, quiet) {
    if (this.players.some(p => p?.kind === 'pad' && p.pad.id === pad.id)) return;
    const old = this.players.findIndex(p => p?.kind === 'pad' && p.padName === pad.name && !p.connected);
    let slot = old >= 0 ? old : this.players.findIndex(p => !p);
    if (slot < 0) { if (!quiet) { toast('Room penuh (4 pemain). Keluarkan pemain dulu di lobby.'); audio.play('wrong'); } return; }
    const n = this.list.filter(p => p.kind === 'pad').length + 1;
    const p = this.players[slot] || { slot, id: 'pad:' + pad.id, kind: 'pad', color: PCOLORS[slot], score: 0 };
    Object.assign(p, { pad, padName: pad.name, name: old >= 0 ? p.name : `Stik ${n}`, connected: true, input: blankInput() });
    this.players[slot] = p;
    if (!quiet) { audio.play('join'); toast(`${pad.name} terhubung → ${p.name}`); }
    this.sendLayouts(); this.refresh?.(slot);
    this.game?.onJoin?.(p);
  }
  removePad(pad) {
    const p = this.players.find(q => q?.kind === 'pad' && q.pad.id === pad.id);
    if (!p) return;
    p.connected = false; p.input = blankInput();
    audio.play('leave'); toast(`${p.name} terputus`);
    if (this.state === 'lobby') this.players[p.slot] = null;
    this.sendLayouts(); this.refresh?.();
  }
  onPadPress(pad, i) {
    let p = this.players.find(q => q?.kind === 'pad' && q.pad.id === pad.id);
    if (!p || !p.connected) return;
    // answer-style games: △ ○ ✕ □ → 0..3
    const ans = { [BTN.Y]: 0, [BTN.B]: 1, [BTN.A]: 2, [BTN.X]: 3 }[i];
    if (this.state === 'game' && ans != null) this.game?.onMsg?.(p, { t: 'ans', i: ans });
    if (this.state === 'tool') this.tool?.onPad?.(p, i);
  }

  onMsg(conn, m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'hello') return this.onHello(conn, m);
    const p = this.players.find(q => q && q.conn === conn);
    if (!p) return;
    switch (m.t) {
      case 'in': Object.assign(p.input, m.s); break;
      case 'nav': this.onNav(p, m.k); break;
      case 'wiggle': this.onWiggle?.(p); break;
      case 'ping': conn.send({ t: 'pong', ts: m.ts }); break;
      default:
        if (this.state === 'tool') this.tool?.onMsg?.(p, m);
        else this.game?.onMsg?.(p, m);
    }
  }

  onHello(conn, m) {
    const name = String(m.name || '').trim().slice(0, 12);
    let slot = this.players.findIndex(p => p && p.id === m.id);
    if (slot < 0) slot = this.players.findIndex(p => !p);
    if (slot < 0) { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 300); return; }
    const old = this.players[slot];
    const p = old || { slot, id: m.id, kind: 'phone', color: PCOLORS[slot], input: blankInput(), score: 0 };
    p.name = name || PNAMES[slot];
    p.conn = conn; p.connected = true;
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

  kick(p) {
    if (p.kind === 'phone') { this.send(p, { t: 'kicked' }); setTimeout(() => p.conn?.close(), 300); }
    this.players[p.slot] = null;
    audio.play('leave'); toast(`${p.name} dikeluarkan`);
    this.sendLayouts(); this.refresh?.();
  }

  send(p, m) { if (p?.connected && p.conn) p.conn.send(m); }
  buzz(p, k = 'light') { this.send(p, { t: 'buzz', k }); }

  get shown() { return GAMES.filter(g => this.cat === 'semua' || g.cat === this.cat); }

  layoutFor(p) {
    if (this.state === 'game' && this.game) return this.game.layoutFor?.(p) || { l: this.game.def.layout || 'pad' };
    if (this.state === 'tool' && this.tool) return this.tool.layoutFor?.(p) || { l: 'lobby', data: { game: this.tool.name } };
    if (this.state === 'results') return { l: 'results', data: this.resultFor(p) };
    const g = GAMES[this.sel];
    return p === this.vip ? { l: 'menu', data: { game: g.name } } : { l: 'lobby', data: { game: g.name, vip: this.vip?.name } };
  }

  sendLayouts() { for (const p of this.list) if (p.kind === 'phone') this.send(p, { t: 'layout', ...this.layoutFor(p) }); }

  onNav(p, k) {
    if (this.state === 'lobby' && p === this.vip) {
      const list = this.shown;
      let i = Math.max(0, list.indexOf(GAMES[this.sel]));
      const step = { left: -1, right: 1, up: -4, down: 4 }[k];
      if (step) { i = (i + step + list.length * 4) % list.length; this.select(GAMES.indexOf(list[i])); }
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
    this.game = null; this.tool = null;
    nav.gameMode = false;
    audio.playMusic('music_lobby');
    root.style.padding = '0';
    const bg = h('div', { class: 'party-bg' }, h('div', { class: 'confetti-dots' }));
    const wrap = h('div', { class: 'screen', style: { animation: 'none', gap: '10px' } });
    root.append(bg, wrap);

    // left: room + players
    const codeEl = h('div', { class: 'room-code' }, '····');
    const status = h('div', { class: 'mini' });
    const playersEl = h('div', { class: 'plist' });
    const left = h('div', { class: 'card room-card' },
      h('div', { class: 'dim', style: { fontSize: '14px', letterSpacing: '2px' } }, 'KODE ROOM'), codeEl, status,
      h('div', { class: 'steps' }, 'HP: buka Mabar Party → ', h('b', {}, 'Jadi Controller'), ' → ketik kode.', h('br'), 'Stik: tekan ', h('b', {}, '✕'), ' untuk ikut. Pilih nama pemain untuk mengeluarkan.'),
      playersEl);

    // tabs
    const tabs = h('div', { class: 'tabs' });
    const body = h('div', { class: 'tabbody' });
    const right = h('div', { class: 'col', style: { minHeight: 0, gap: '10px' } }, tabs, body);
    const top = h('div', { class: 'topbar' },
      btn(null, 'dark round', () => this.leave(), { icon: 'back', sound: 'back' }),
      h('h2', { class: 'title-m grow' }, 'Lobby'),
      h('div', { class: 'mini' }, LOCAL ? 'mode tes lokal' : ''),
      btn(null, 'dark round', () => settingsDialog(), { icon: 'gear' }));
    wrap.append(top, h('div', { class: 'lobby' }, left, right));

    const renderPlayers = joined => {
      playersEl.innerHTML = '';
      this.players.forEach((p, i) => {
        const row = h('div', { class: 'prow' + (p ? '' : ' empty') + (joined === i ? ' joined' : ''), title: p ? 'Pilih untuk mengeluarkan' : '' },
          avatar(p ? p.color : '#5b5390', p ? (p.connected ? 'happy' : 'sleep') : 'sleep'),
          h('div', { class: 'grow nm' }, p ? p.name : `${PNAMES[i]} · kosong`),
          h('span', { class: 'dev' }, p ? (p.kind === 'pad' ? PAD_ICON : PHONE_ICON) : ''),
          p && p === this.vip ? h('span', { class: 'vip' }, 'PILIH') : null);
        if (p) {
          row.querySelector('.avatar').dataset.slot = i;
          row.classList.add('nav-item');
          row.addEventListener('click', () => confirmBox(`Keluarkan ${p.name}?`, p.kind === 'pad' ? 'Stik ini bisa ikut lagi dengan menekan ✕.' : 'HP ini bisa gabung lagi pakai kode room.', 'Keluarkan', () => this.kick(p)));
        }
        playersEl.append(row);
      });
    };
    const renderTabs = () => {
      tabs.innerHTML = '';
      [['games', `Game (${GAMES.length})`], ['tools', `Alat (${TOOLS.length})`], ['rank', 'Klasemen']].forEach(([k, label]) => {
        const b = btn(label, 'small ' + (this.tab === k ? 'pink' : 'dark'), () => { if (this.tab !== k) { this.tab = k; renderTabs(); renderBody(); } });
        tabs.append(b);
      });
    };
    const renderBody = () => {
      body.innerHTML = '';
      if (this.tab === 'games') renderGamesTab(); else if (this.tab === 'tools') renderToolsTab(); else renderRankTab();
    };
    let gridEl = null, hint = null, startBtn = null;
    const renderGamesTab = () => {
      const chips = h('div', { class: 'chips' }, CATS.map(([k, label]) => {
        const c = h('button', { class: 'chip nav-item' + (this.cat === k ? ' on' : ''), type: 'button' }, label);
        c.addEventListener('click', () => { this.cat = k; audio.play('tap'); renderBody(); });
        return c;
      }));
      gridEl = h('div', { class: 'ggrid' });
      hint = h('div', { class: 'mini grow' });
      startBtn = btn('MAIN!', 'green', () => this.startGame(), { icon: 'play', sound: 'confirm' });
      const rnd = btn('Acak', 'cyan small', () => { const l = this.shown; this.select(GAMES.indexOf(l[Math.floor(Math.random() * l.length)])); }, { icon: 'help' });
      body.append(chips, gridEl, h('div', { class: 'lobby-bottom' }, hint, rnd, startBtn));
      renderGrid();
    };
    const renderGrid = () => {
      if (!gridEl) return;
      gridEl.innerHTML = '';
      this.shown.forEach(g => {
        const i = GAMES.indexOf(g);
        const card = h('div', { class: 'card game-card' + (i === this.sel ? ' sel' : ''), tabindex: -1 },
          h('div', { class: 'art', html: CARDS[g.id] || '' }),
          h('div', { class: 'meta' }, h('h3', {}, g.name), h('p', {}, g.desc)));
        if (g.badge) card.append(h('div', { class: 'badge' }, g.badge));
        card.addEventListener('click', () => { if (this.sel === i) this.startGame(); else this.select(i); });
        gridEl.append(card);
      });
      const n = this.list.filter(p => p.connected).length;
      const g = GAMES[this.sel];
      if (startBtn) startBtn.disabled = n < 1;
      if (hint) hint.textContent = n < 1 ? 'Menunggu pemain (HP atau stik)…' : `${n} pemain · ${g.name}${n < g.ideal ? ' · bot ikut main' : ''}`;
    };
    const renderToolsTab = () => {
      const grid = h('div', { class: 'tgrid' });
      TOOLS.forEach(t => {
        const b = h('button', { class: 'tool nav-item', type: 'button' }, h('div', { class: 'ti' }, t.icon), h('div', { class: 'tn' }, t.name), t.net ? h('div', { class: 'tnet' }, PHONE_ICON) : null);
        b.addEventListener('click', () => { audio.play('confirm'); this.openTool(t); });
        grid.append(b);
      });
      body.append(grid);
    };
    const renderRankTab = () => {
      const rows = [...this.standings.values()].sort((a, b) => b.pts - a.pts || b.wins - a.wins);
      const list = h('div', { class: 'card col', style: { padding: '14px 18px', overflow: 'auto', flex: 1, gap: '8px' } });
      list.append(h('h3', { class: 'title-m' }, 'Klasemen malam ini'), h('div', { class: 'mini' }, 'Juara 1 = 3 poin · Juara 2 = 2 · Juara 3 = 1'));
      if (!rows.length) list.append(h('p', { class: 'dim' }, 'Belum ada game yang selesai. Ayo main!'));
      rows.forEach((r, k) => {
        const a = avatar(r.color, k === 0 ? 'cool' : 'happy'); a.style.width = '40px'; a.style.animation = 'none';
        list.append(h('div', { class: 'prow' }, h('b', { style: { width: '28px', fontSize: '22px' } }, k + 1), a, h('div', { class: 'grow nm' }, r.name), h('span', { class: 'dim' }, `${r.wins}× juara`), h('b', { style: { color: 'var(--yellow)', fontSize: '22px', minWidth: '60px', textAlign: 'right' } }, r.pts)));
      });
      if (this.history.length) list.append(h('div', { class: 'mini', style: { marginTop: '6px' } }, 'Sudah dimainkan: ' + this.history.map(x => `${x.game} (${x.winner})`).join(' · ')));
      const reset = btn('Reset klasemen', 'dark small', () => confirmBox('Reset klasemen?', 'Semua poin malam ini dihapus.', 'Reset', () => { this.standings.clear(); this.history = []; renderBody(); }), { icon: 'close' });
      body.append(list, h('div', { class: 'row' }, reset));
    };

    this.refreshGames = renderGrid;
    this.refresh = joined => {
      codeEl.textContent = this.code || '····';
      status.textContent = this.netError ? '⚠ ' + this.netError : this.code ? 'Room siap — ayo gabung!' : 'Membuat room…';
      status.style.color = this.netError ? 'var(--red)' : '';
      renderPlayers(joined);
      renderGrid();
    };
    this.onWiggle = p => {
      audio.playVaried('wiggle');
      const a = playersEl.querySelector(`.avatar[data-slot="${p.slot}"]`);
      a?.animate([{ transform: 'scale(1.3,.7)' }, { transform: 'scale(.9,1.2) translateY(-10px)' }, { transform: 'none' }], { duration: 400 });
    };
    if (this.netError) { this.netError = null; this.net.start(); }
    renderTabs(); renderBody();
    this.refresh();
    this.sendLayouts();
    onScreenBack(() => { this.leave(); return true; });
    return () => { this.refresh = null; this.refreshGames = null; this.onWiggle = null; };
  }

  leave() {
    confirmBox('Tutup room?', 'Semua controller akan terputus.', 'Tutup', () => {
      this.alive = false; cancelAnimationFrame(this.raf);
      this.offs.forEach(f => f()); nav.consume = null;
      this.net.stop();
      session = null;
      import('../screens/home.js').then(m => go(m.homeScreen));
    });
  }

  // -------------------------------------------------------------- tools
  openTool(t) {
    this.state = 'tool';
    go(root => {
      const inst = openTool(t, root, this);
      this.tool = inst;
      this.sendLayouts();
      onScreenBack(() => { go(hostScreen); return true; });
      return () => { inst?.destroy?.(); this.tool = null; };
    });
  }

  // -------------------------------------------------------------- games
  startGame() {
    if (this.state !== 'lobby') return;
    const humans = this.list.filter(p => p.connected);
    if (!humans.length) { toast('Belum ada pemain. Gabung pakai HP atau colok stik dulu!'); audio.play('wrong'); return; }
    const def = GAMES[this.sel];
    this.state = 'game';
    prefs.played(def.id);
    audio.play('start'); haptics.success();
    go(root => {
      root.style.padding = '0';
      nav.gameMode = true;
      this.game = def.create(this, root, humans);
      this.game.def = def;
      this.sendLayouts();
      const ask = () => confirmBox('Keluar game?', 'Kembali ke lobby, skor ronde ini hilang.', 'Keluar', () => go(hostScreen));
      if (!nav.onStart) nav.onStart = ask;
      onScreenBack(() => { nav.gameMode = false; ask(); setTimeout(() => { if (this.state === 'game' && !document.querySelector('.overlay')) nav.gameMode = true; }, 50); return true; });
      return () => { this.game?.destroy(); this.game = null; nav.gameMode = false; nav.onStart = null; };
    });
  }

  // results: [{ p (player or null for bots), name, color, label }] best first
  finish(results, title = 'Hasil') {
    this.results = results;
    this.state = 'results';
    nav.gameMode = false;
    const humansOnly = results.filter(r => r.p);
    humansOnly.slice(0, 3).forEach((r, k) => {
      const key = r.p.id;
      const s = this.standings.get(key) || { name: r.name, color: r.color, pts: 0, wins: 0 };
      s.pts += 3 - k; if (k === 0) s.wins++; s.name = r.name;
      this.standings.set(key, s);
    });
    this.history.push({ game: (GAMES[this.sel] || {}).name || title, winner: results[0]?.name || '-' });
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
    const again = btn('Main Lagi', 'green small', () => { go(hostScreen); setTimeout(() => this.startGame(), 350); }, { icon: 'play', sound: 'confirm' });
    again.dataset.autofocus = '';
    wrap.append(
      h('div', { class: 'row', style: { justifyContent: 'center' } }, h('h1', { class: 'title-l' }, `🏆 ${r[0].name} juara!`)),
      h('div', { class: 'dim', style: { textAlign: 'center', fontSize: '15px' } }, title),
      podium,
      h('div', { class: 'row', style: { justifyContent: 'center', paddingTop: '8px' } },
        btn('Lobby', 'dark small', () => go(hostScreen), { icon: 'home', sound: 'back' }), again));
    this.sendLayouts();
    onScreenBack(() => { go(hostScreen); return true; });
  }
}
void svgEl;
