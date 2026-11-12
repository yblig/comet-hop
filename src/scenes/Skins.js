import Phaser from 'phaser';
import { audio } from '../lib/audio.js';
import { haptics } from '../lib/haptics.js';
import { native } from '../lib/native.js';
import { save } from '../state.js';
import { txt, HEX, C, fmt, gradientFill } from '../theme.js';
import { iconButton, fadeTo, toast } from '../ui/widgets.js';
import { SpaceBG } from '../ui/SpaceBG.js';
import { SKINS, SECTORS, skinById } from '../config.js';

export default class Skins extends Phaser.Scene {
  constructor() { super('Skins'); }

  create() {
    const { width: W, height: H } = this.scale;
    this._leaving = false;
    this.cameras.main.fadeIn(300, 5, 3, 26);
    this.bg = new SpaceBG(this, SECTORS[1].top, SECTORS[1].bottom);
    const top = Math.max(90, H * 0.05);

    iconButton(this, 90, top + 4, 'close', { size: 124, onClick: () => this.back() });
    const t = txt(this, W / 2, top + 4, 'COMETS', 96, HEX.text, { stroke: 16 });
    gradientFill(t, '#e9fdff', '#3ff0ff');
    this.add.image(W - 200, top + 4, 'stardust').setDisplaySize(70, 70);
    this.dustText = txt(this, W - 158, top + 4, fmt(save.dust), 50, HEX.yellow, { ox: 0, stroke: 10 });

    // live preview of the equipped comet
    const py = top + 330;
    this.add.image(W / 2, py, 'softglow').setTint(0xff6fb5).setBlendMode(Phaser.BlendModes.ADD).setScale(2.6).setAlpha(0.5);
    this.add.image(W / 2, py, 'planet_5').setScale(95 / 220);
    this.add.image(W / 2, py, 'face_happy').setScale(95 / 220);
    const ring = this.add.graphics({ x: W / 2, y: py });
    ring.lineStyle(5, 0xffffff, 0.3).strokeCircle(0, 0, 190);
    this.preview = this.add.image(0, 0, 'comet_' + save.skin).setDisplaySize(100, 100).setDepth(5);
    this.previewScale = this.preview.scale;
    this.trail = this.add.particles(0, 0, 'glow', {
      lifespan: 520, frequency: 12, scale: { start: 0.7, end: 0 }, alpha: { start: 0.85, end: 0 }, blendMode: 'ADD',
      tint: { onEmit: () => this.tintFor(save.skin) }
    }).setDepth(4);
    this.trail.startFollow(this.preview);
    this.tweens.addCounter({ from: 0, to: Math.PI * 2, duration: 2600, repeat: -1,
      onUpdate: tw => this.preview.setPosition(W / 2 + Math.cos(tw.getValue()) * 190, py + Math.sin(tw.getValue()) * 190) });
    this.nameText = txt(this, W / 2, py + 260, skinById(save.skin).name.toUpperCase(), 56, HEX.yellow, { stroke: 10 });

    // grid
    const gy = py + 360, cols = 2;
    const cw = Math.min(480, (W - 100) / 2), ch = Math.min(280, (H - gy - 80) / 4 - 20);
    this.cards = [];
    SKINS.forEach((s, i) => {
      const x = W / 2 + ((i % cols) - 0.5) * (cw + 24);
      const y = gy + Math.floor(i / cols) * (ch + 20) + ch / 2;
      this.cards.push(this.makeCard(s, x, y, cw, ch, i));
    });
    this.refresh();

    audio.playMusic('music_title');
    const offBack = native.onBack(() => { this.back(); return true; });
    this.events.once('shutdown', offBack);
  }

  tintFor(id) {
    const s = skinById(id);
    if (!s.trail) return Phaser.Display.Color.HSVToRGB((this.time.now / 1400) % 1, 0.65, 1).color;
    return Math.random() < 0.6 ? s.trail[0] : s.trail[1];
  }

  makeCard(s, x, y, w, h, i) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const img = this.add.image(-w / 2 + h * 0.5, 0, 'comet_' + s.id).setDisplaySize(h * 0.78, h * 0.78);
    const name = txt(this, -w / 2 + h * 0.95, -h * 0.17, s.name, 40, HEX.text, { ox: 0, stroke: 8 });
    const status = txt(this, -w / 2 + h * 0.95, h * 0.2, '', 36, HEX.yellow, { ox: 0, stroke: 7 });
    const dust = this.add.image(0, h * 0.2, 'stardust').setDisplaySize(44, 44);
    const lock = this.add.image(w / 2 - 34, -h / 2 + 34, 'icon_lock').setDisplaySize(32, 32).setAlpha(0.6);
    c.add([g, img, name, status, dust, lock]);
    c.setSize(w, h);
    const hit = this.add.rectangle(0, 0, w, h, 0, 0).setInteractive({ useHandCursor: true });
    c.add(hit);
    hit.on('pointerdown', () => {
      this.tweens.add({ targets: c, scale: 0.95, duration: 70, yoyo: true });
      this.pick(s, c);
    });
    Object.assign(c, { g, img, name, status, dust, lock, skin: s, w, h });
    c.setAlpha(0).setScale(0.8);
    this.tweens.add({ targets: c, alpha: 1, scale: 1, delay: 120 + i * 50, duration: 300, ease: 'Back.easeOut' });
    this.tweens.add({ targets: img, angle: { from: -6, to: 6 }, duration: 1200 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return c;
  }

  refresh() {
    for (const c of this.cards) {
      const s = c.skin, owned = save.owns(s.id), eq = save.skin === s.id;
      const { w, h, g } = c;
      g.clear();
      g.fillStyle(C.outline, 1).fillRoundedRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, 40);
      g.fillStyle(eq ? 0x3a2f8f : 0x231b5e, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 36);
      if (eq) g.lineStyle(7, C.cyan, 1).strokeRoundedRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 32);
      c.img.setAlpha(owned ? 1 : 0.8).setTint(owned ? 0xffffff : 0xb9b5e0);
      c.lock.setVisible(!owned);
      c.dust.setVisible(!owned);
      if (eq) c.status.setText('EQUIPPED').setColor(HEX.cyan);
      else if (owned) c.status.setText('Tap to use').setColor(HEX.dim);
      else {
        c.status.setText(fmt(s.price)).setColor(save.dust >= s.price ? HEX.yellow : '#ff8fa3');
        c.dust.x = c.status.x + c.status.width + 14;
      }
    }
    this.dustText.setText(fmt(save.dust));
  }

  pick(s, card) {
    if (save.owns(s.id)) {
      if (save.skin !== s.id) { save.skin = s.id; audio.play('toggle'); haptics.tap(); this.equipFx(s, card); }
      return;
    }
    if (save.buy(s.id)) {
      save.skin = s.id;
      audio.play('buy'); this.time.delayedCall(150, () => audio.play('unlock'));
      haptics.success();
      const burst = this.add.particles(card.x - card.w / 2 + card.h * 0.5, card.y, 'spark', {
        emitting: false, lifespan: 800, speed: { min: 150, max: 450 }, scale: { start: 0.9, end: 0 }, blendMode: 'ADD',
        tint: s.trail || [0xffd84f, 0xff4fd8, 0x3ff0ff]
      }).setDepth(50);
      burst.explode(30);
      this.time.delayedCall(1000, () => burst.destroy());
      toast(this, `${s.name} unlocked!`);
      this.equipFx(s, card);
    } else {
      audio.play('error'); haptics.error();
      const x = card.x;
      this.tweens.add({ targets: card, x: x + 14, duration: 50, yoyo: true, repeat: 3, onComplete: () => (card.x = x) });
      toast(this, `Need ${fmt(s.price - save.dust)} more ✦`);
    }
  }

  equipFx(s, card) {
    this.preview.setTexture('comet_' + s.id);
    this.tweens.killTweensOf(this.preview);
    this.tweens.add({ targets: this.preview, scale: { from: this.previewScale * 1.6, to: this.previewScale }, duration: 300, ease: 'Back.easeOut' });
    this.nameText.setText(s.name.toUpperCase());
    this.tweens.add({ targets: this.nameText, scale: { from: 1.3, to: 1 }, duration: 260, ease: 'Back.easeOut' });
    this.refresh();
    void card;
  }

  back() { fadeTo(this, 'Title'); }

  update(t, dt) { this.bg.update(0, dt); }
}
