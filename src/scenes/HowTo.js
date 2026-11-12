import Phaser from 'phaser';
import { audio } from '../lib/audio.js';
import { native } from '../lib/native.js';
import { save } from '../state.js';
import { txt, HEX, C } from '../theme.js';
import { button, panel, modal } from '../ui/widgets.js';

export default class HowTo extends Phaser.Scene {
  constructor() { super('HowTo'); }

  init(data) { this.from = data?.from || 'Title'; this.then = data?.then || null; this._done = false; }

  create() {
    const { height: H } = this.scale;
    const ph = Math.min(1620, H - 160);
    const rowH = (ph - 340) / 4;
    this.m = modal(this, root => {
      root.add(panel(this, 0, 0, 940, ph, 'HOW TO PLAY'));
      const y0 = -ph / 2 + 120 + rowH / 2;
      const rows = [
        ['Tap to launch', 'Your comet flies off along\nthe dotted line.', this.art1],
        ['Glide into a ring', 'Aim BESIDE the next planet,\nnot at it, for PERFECT combos!', this.art2],
        ['Don\'t linger', 'Orbits decay — leave before\nthe timer runs out!', this.art3],
        ['Collect stardust', 'Dodge rocks & black holes.\nSpend ✦ on new comets.', this.art4]
      ];
      rows.forEach(([title, body, art], i) => {
        const y = y0 + i * rowH;
        const card = this.add.container(0, y);
        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.25).fillRoundedRect(-420, -rowH / 2 + 10, 840, rowH - 20, 36);
        card.add(g);
        const ill = this.add.container(-270, 0);
        art.call(this, ill);
        card.add(ill);
        card.add(txt(this, -110, -48, title, 50, HEX.yellow, { ox: 0, stroke: 9 }));
        card.add(txt(this, -110, 26, body, 34, HEX.text, { ox: 0, stroke: 7, lineSpacing: 4, align: 'left' }));
        card.setAlpha(0).setX(-60);
        this.tweens.add({ targets: card, alpha: 1, x: 0, duration: 380, delay: 200 + i * 130, ease: 'Cubic.easeOut' });
        root.add(card);
      });
      root.add(button(this, 0, ph / 2 - 110, this.then ? "LET'S FLY!" : 'GOT IT!', { color: 'yellow', width: 520, size: 64, onClick: () => this.close() }));
    });
    this.offBack = native.onBack(() => { this.close(); return true; });
    this.events.once('shutdown', () => this.offBack());
  }

  art1(c) {
    const g = this.add.graphics();
    g.lineStyle(4, 0xffffff, 0.35).strokeCircle(0, 0, 80);
    const p = this.add.image(0, 0, 'planet_0').setScale(46 / 220);
    const f = this.add.image(0, 0, 'face_happy').setScale(46 / 220);
    const cm = this.add.image(0, -80, 'comet_' + save.skin).setDisplaySize(52, 52);
    const dots = this.add.graphics();
    for (let i = 1; i <= 5; i++) { dots.fillStyle(0xffffff, 0.8 - i * 0.12).fillCircle(i * 24, -80, 6 - i * 0.6); }
    const hand = txt(this, 30, 40, 'TAP!', 32, HEX.cyan, { stroke: 7 });
    this.tweens.add({ targets: hand, scale: 1.2, duration: 400, yoyo: true, repeat: -1 });
    c.add([g, p, f, dots, cm, hand]);
  }

  art2(c) {
    const g = this.add.graphics();
    g.lineStyle(4, C.cyan, 0.6).strokeCircle(30, -10, 76);
    const p = this.add.image(30, -10, 'planet_3').setScale(40 / 220);
    g.lineStyle(5, C.yellow, 0.9);
    g.beginPath(); g.moveTo(-110, 95); g.lineTo(-40, -70); g.strokePath();
    const cm = this.add.image(-40, -70, 'comet_' + save.skin).setDisplaySize(46, 46);
    const star = this.add.image(-60, -100, 'icon_star').setDisplaySize(34, 34).setTint(0xffd84f);
    this.tweens.add({ targets: star, angle: 360, duration: 3000, repeat: -1 });
    c.add([g, p, cm, star]);
  }

  art3(c) {
    const g = this.add.graphics();
    g.lineStyle(10, C.outline, 1).beginPath().arc(0, 0, 82, -Math.PI / 2, Math.PI * 0.2).strokePath();
    g.lineStyle(6, C.danger, 1).beginPath().arc(0, 0, 82, -Math.PI / 2, Math.PI * 0.2).strokePath();
    const p = this.add.image(0, 0, 'planet_1').setScale(52 / 220);
    const f = this.add.image(0, 0, 'face_scared').setScale(52 / 220);
    this.tweens.add({ targets: [p, f], x: 4, duration: 60, yoyo: true, repeat: -1 });
    c.add([g, p, f]);
  }

  art4(c) {
    const d = this.add.image(-50, -30, 'stardust').setDisplaySize(64, 64);
    const d2 = this.add.image(10, -60, 'stardust').setDisplaySize(44, 44);
    const a = this.add.image(50, 30, 'asteroid_1').setDisplaySize(70, 70);
    const b = this.add.image(-40, 50, 'blackhole').setDisplaySize(80, 80);
    this.tweens.add({ targets: [d, d2], y: '-=10', duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: a, angle: 360, duration: 5000, repeat: -1 });
    c.add([b, a, d, d2]);
  }

  close() {
    if (this._done) return; this._done = true;
    save.howtoSeen = true;
    if (!this.then) audio.play('ui_back');
    this.m.close(() => {
      if (this.then) {
        this.scene.stop(this.from);
        this.scene.start(this.then);
      } else {
        this.scene.resume(this.from);
        this.scene.stop();
      }
    });
  }
}
