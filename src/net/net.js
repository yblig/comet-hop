// Host ⇄ controller networking.
//   Peer mode  : WebRTC data channels via PeerJS (cloud signaling, Google STUN).
//   Local mode : BroadcastChannel between tabs of one browser (?local=1) — for testing.
// Both expose the same tiny API so the rest of the app never cares which one runs.
import Peer from 'peerjs';

const PREFIX = 'mabar-party-v1-';
const LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ';
export const LOCAL = typeof location !== 'undefined' && /[?&]local=1/.test(location.search);

const PEER_OPTS = {
  debug: 0,
  config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] }
};

export function randomCode() {
  let s = '';
  for (let i = 0; i < 4; i++) s += LETTERS[Math.floor(Math.random() * LETTERS.length)];
  return s;
}

class Emitter {
  constructor() { this.h = {}; }
  on(e, f) { (this.h[e] ||= []).push(f); return () => this.off(e, f); }
  off(e, f) { this.h[e] = (this.h[e] || []).filter(x => x !== f); }
  emit(e, ...a) { (this.h[e] || []).forEach(f => { try { f(...a); } catch (err) { console.error(err); } }); }
}

// ---------------------------------------------------------------------------- host
// events: 'ready'(code) 'join'(conn) 'msg'(conn, data) 'leave'(conn) 'error'(msg)
export class HostNet extends Emitter {
  constructor() { super(); this.conns = new Map(); this.code = null; this.closed = false; }

  async start(tries = 0) {
    const code = randomCode();
    if (LOCAL) return this.startLocal(code);
    return new Promise(resolve => {
      const peer = new Peer(PREFIX + code, PEER_OPTS);
      this.peer = peer;
      peer.on('open', () => { this.code = code; this.emit('ready', code); resolve(code); });
      peer.on('connection', dc => this.accept(dc));
      peer.on('disconnected', () => { if (!this.closed) setTimeout(() => !this.closed && peer.reconnect(), 1000); });
      peer.on('error', err => {
        if (err.type === 'unavailable-id' && tries < 5) { peer.destroy(); resolve(this.start(tries + 1)); return; }
        if (!this.code) { this.emit('error', describe(err)); resolve(null); }
        else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') this.emit('warn', describe(err));
      });
    });
  }

  accept(dc) {
    const conn = { id: dc.peer, send: m => { try { dc.open && dc.send(m); } catch { /* closed */ } }, close: () => dc.close() };
    dc.on('data', d => this.emit('msg', conn, d));
    dc.on('close', () => { if (this.conns.delete(conn.id)) this.emit('leave', conn); });
    dc.on('error', () => { if (this.conns.delete(conn.id)) this.emit('leave', conn); });
    dc.on('open', () => { this.conns.set(conn.id, conn); this.emit('join', conn); });
  }

  startLocal(code) {
    this.code = code;
    const bc = new BroadcastChannel(PREFIX + code);
    this.bc = bc;
    bc.onmessage = ({ data }) => {
      if (data.to !== 'host') return;
      let conn = this.conns.get(data.from);
      if (data.kind === 'open' && !conn) {
        conn = { id: data.from, send: m => bc.postMessage({ to: data.from, from: 'host', kind: 'msg', m }), close: () => bc.postMessage({ to: data.from, from: 'host', kind: 'close' }) };
        this.conns.set(data.from, conn);
        bc.postMessage({ to: data.from, from: 'host', kind: 'opened' });
        this.emit('join', conn);
      } else if (data.kind === 'msg' && conn) this.emit('msg', conn, data.m);
      else if (data.kind === 'close' && conn) { this.conns.delete(data.from); this.emit('leave', conn); }
    };
    setTimeout(() => this.emit('ready', code), 50);
    return Promise.resolve(code);
  }

  broadcast(m) { for (const c of this.conns.values()) c.send(m); }

  stop() {
    this.closed = true;
    this.broadcast({ t: 'bye' });
    setTimeout(() => {
      try { this.peer?.destroy(); } catch { /* ignore */ }
      try { this.bc?.close(); } catch { /* ignore */ }
    }, 150);
    this.conns.clear();
  }
}

// ---------------------------------------------------------------------------- client
// events: 'open' 'msg'(data) 'close' 'error'(msg)
export class ClientNet extends Emitter {
  connect(code) {
    code = code.toUpperCase();
    this.code = code;
    if (LOCAL) return this.connectLocal(code);
    const peer = new Peer(PEER_OPTS);
    this.peer = peer;
    let opened = false;
    const fail = msg => { if (!opened) { this.emit('error', msg); this.close(true); } };
    const timer = setTimeout(() => fail('Waktu habis. Cek kode room & internet, lalu coba lagi.'), 15000);
    peer.on('open', () => {
      const dc = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
      this.dc = dc;
      dc.on('open', () => { opened = true; clearTimeout(timer); this.emit('open'); });
      dc.on('data', d => this.emit('msg', d));
      dc.on('close', () => { if (opened) this.emit('close'); });
      dc.on('error', () => fail('Gagal tersambung ke host.'));
    });
    peer.on('error', err => {
      clearTimeout(timer);
      if (err.type === 'peer-unavailable') fail(`Room "${code}" tidak ditemukan. Cek lagi kodenya di layar host.`);
      else if (!opened) fail(describe(err));
      else this.emit('close');
    });
  }

  connectLocal(code) {
    const me = 'c' + Math.random().toString(36).slice(2, 9);
    const bc = new BroadcastChannel(PREFIX + code);
    this.bc = bc; this.me = me;
    let opened = false;
    bc.onmessage = ({ data }) => {
      if (data.to !== me) return;
      if (data.kind === 'opened') { opened = true; this.emit('open'); }
      else if (data.kind === 'msg') this.emit('msg', data.m);
      else if (data.kind === 'close') this.emit('close');
    };
    bc.postMessage({ to: 'host', from: me, kind: 'open' });
    setTimeout(() => { if (!opened) { this.emit('error', `Room "${code}" tidak ditemukan.`); } }, 2500);
  }

  send(m) {
    try {
      if (this.bc) this.bc.postMessage({ to: 'host', from: this.me, kind: 'msg', m });
      else if (this.dc?.open) this.dc.send(m);
    } catch { /* ignore */ }
  }

  close(silent) {
    try { if (this.bc) { this.bc.postMessage({ to: 'host', from: this.me, kind: 'close' }); this.bc.close(); } } catch { /* ignore */ }
    try { this.dc?.close(); this.peer?.destroy(); } catch { /* ignore */ }
    this.bc = null; this.dc = null; this.peer = null;
    if (!silent) this.emit('close');
  }
}

function describe(err) {
  switch (err?.type) {
    case 'network': case 'socket-error': case 'socket-closed': case 'server-error':
      return 'Tidak bisa terhubung ke server. Pastikan HP tersambung ke internet.';
    case 'browser-incompatible': return 'Perangkat ini tidak mendukung koneksi WebRTC.';
    default: return 'Koneksi gagal (' + (err?.type || 'unknown') + '). Coba lagi.';
  }
}
