// "Mode hemat" for TVs and slow devices: no CSS animations, lighter 3D, lower resolution.
import { storage } from './lib/storage.js';
import { env, onPad } from './input/pads.js';

export function isLite() {
  const v = storage.get('lite', null);
  return v == null ? env.tv : v;
}
export function setLite(on) { storage.set('lite', !!on); apply(); }
export function apply() { document.body.classList.toggle('lite', isLite()); }
onPad('tv', apply);
