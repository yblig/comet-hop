import { storage } from './lib/storage.js';

export const prefs = {
  get name() { return storage.get('name', ''); },
  set name(v) { storage.set('name', String(v).slice(0, 12)); },
  get clientId() {
    // in browser test mode every tab is its own player
    if (/[?&]local=1/.test(location.search)) {
      let t = sessionStorage.getItem('cid');
      if (!t) { t = 't' + Math.random().toString(36).slice(2, 10); sessionStorage.setItem('cid', t); }
      return t;
    }
    let id = storage.get('clientId');
    if (!id) { id = 'u' + Math.random().toString(36).slice(2, 10); storage.set('clientId', id); }
    return id;
  },
  get tilt() { return storage.get('tilt', false); },
  set tilt(v) { storage.set('tilt', !!v); },
  get lastCode() { return storage.get('lastCode', ''); },
  set lastCode(v) { storage.set('lastCode', v); },
  played(game) { const s = storage.get('plays', {}); s[game] = (s[game] || 0) + 1; storage.set('plays', s); },
  get plays() { return storage.get('plays', {}); }
};
