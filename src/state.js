// Persistent player progress (best score, stardust, skins, stats, options).
import { storage } from './lib/storage.js';
import { SKINS } from './config.js';

const SAVE_VERSION = 1;

export const save = {
  init() {
    if (storage.get('saveVersion') == null) storage.set('saveVersion', SAVE_VERSION);
    if (!storage.get('ownedSkins')) storage.set('ownedSkins', ['classic']);
  },
  get best() { return storage.get('best', 0); },
  get dust() { return storage.get('dust', 0); },
  addDust(n) { storage.set('dust', Math.max(0, this.dust + n)); },
  get skin() { return storage.get('skin', 'classic'); },
  set skin(id) { storage.set('skin', id); },
  owns(id) { return storage.get('ownedSkins', ['classic']).includes(id); },
  buy(id) {
    const s = SKINS.find(k => k.id === id);
    if (!s || this.owns(id) || this.dust < s.price) return false;
    this.addDust(-s.price);
    storage.set('ownedSkins', [...storage.get('ownedSkins', ['classic']), id]);
    return true;
  },
  // Cheapest skin the player could buy right now (for a gentle "new!" hint on the title).
  affordableSkin() { return SKINS.find(s => !this.owns(s.id) && s.price <= this.dust) || null; },
  get stats() { return storage.get('stats', { games: 0, hops: 0, bestSector: 0, perfects: 0 }); },
  // Returns true on a new record.
  submitBest(score) { return score > 0 && storage.setBest('best', score); },
  // Called once per finished run (not on continue).
  recordStats({ hops, sector, perfects }) {
    const st = this.stats;
    st.games++; st.hops += hops; st.perfects = (st.perfects || 0) + perfects;
    st.bestSector = Math.max(st.bestSector, sector);
    storage.set('stats', st);
  },
  get aimGuide() { return storage.get('aimGuide', true); },
  set aimGuide(v) { storage.set('aimGuide', !!v); },
  get howtoSeen() { return storage.get('howtoSeen', false); },
  set howtoSeen(v) { storage.set('howtoSeen', !!v); },
  reset() {
    ['best', 'dust', 'skin', 'stats', 'howtoSeen'].forEach(k => storage.remove(k));
    storage.set('ownedSkins', ['classic']);
  }
};
