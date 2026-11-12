import Phaser from 'phaser';
import { audio } from '../lib/audio.js';
import { haptics } from '../lib/haptics.js';
import { native } from '../lib/native.js';
import { save } from '../state.js';
import { txt, HEX } from '../theme.js';
import { button, iconButton, panel, modal, toggleRow, toast } from '../ui/widgets.js';

export default class Settings extends Phaser.Scene {
  constructor() { super('Settings'); }

  init(data) { this.from = data?.from || 'Title'; this._done = false; }

  create() {
    const w = 760;
    this.m = modal(this, root => {
      root.add(panel(this, 0, 0, 860, 1180, 'SETTINGS'));
      const a = audio.settings;
      root.add(toggleRow(this, 0, -380, w, 'Music', 'music', a.music > 0, on => { audio.set({ music: on ? 0.6 : 0 }); }));
      root.add(toggleRow(this, 0, -240, w, 'Sound effects', 'sound', a.sfx > 0, on => { audio.set({ sfx: on ? 1 : 0 }); }));
      root.add(toggleRow(this, 0, -100, w, 'Vibration', 'vibrate', haptics.isEnabled(), on => { haptics.setEnabled(on); if (on) haptics.medium(); }));
      root.add(toggleRow(this, 0, 40, w, 'Aim guide', 'aim', save.aimGuide, on => { save.aimGuide = on; }));
      const reset = button(this, 0, 220, 'RESET PROGRESS', { color: 'dark', width: 520, size: 44, icon: 'reset', onClick: () => this.confirmReset(reset) });
      root.add(reset);
      root.add(txt(this, 0, 330, 'Comet Hop v1.0 · made with ✦ and Claude', 30, HEX.dim, { stroke: 6 }));
      root.add(iconButton(this, 0, 470, 'check', { color: 'cyan', onClick: () => this.close() }));
    });
    this.offBack = native.onBack(() => { this.close(); return true; });
    this.events.once('shutdown', () => this.offBack());
  }

  confirmReset(btn) {
    if (!this._armed) {
      this._armed = true;
      btn.setLabel('TAP AGAIN TO ERASE');
      audio.play('error');
      this.time.delayedCall(2500, () => { if (this._armed) { this._armed = false; btn.setLabel('RESET PROGRESS'); } });
      return;
    }
    this._armed = false;
    save.reset();
    btn.setLabel('PROGRESS ERASED');
    toast(this, 'Fresh start! All progress erased.');
    this._resetDone = true;
  }

  close() {
    if (this._done) return; this._done = true;
    audio.play('ui_back');
    this.m.close(() => {
      if (this._resetDone && this.from === 'Title') { this.scene.start('Title'); return; }
      this.scene.resume(this.from);
      this.scene.stop();
    });
  }
}
