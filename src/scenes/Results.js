import Phaser from 'phaser';
import { audio } from '../lib/audio.js';
import { haptics } from '../lib/haptics.js';
import { native } from '../lib/native.js';
import { save } from '../state.js';
import { txt, HEX, C, fmt, gradientFill } from '../theme.js';
import { button, iconButton, panel, modal } from '../ui/widgets.js';
import { CONTINUE_COST } from '../config.js';

const CAUSES = {
  decay: ['BURNED UP!', 'Leave before the ring timer runs out.'],
  rock: ['CRASH!', 'Time your launch between the rocks.'],
  hole: ['SWALLOWED!', 'Black holes pull you in — aim wide.'],
  lost: ['LOST IN SPACE', 'Follow the dotted line before you tap.']
};

export default class Results extends Phaser.Scene {
  constructor() { super('Results'); }

  init(d) { this.d = d; this._done = false; }

  create() {
    const d = this.d;
    const prevBest = save.best;
    const newBest = save.submitBest(d.score);
    audio.play(newBest ? 'newbest' : 'gameover');
    newBest ? haptics.success() : haptics.error();
    const [title, tip] = CAUSES[d.cause] || CAUSES.lost;
    const canCont = d.canContinue;
    const ph = canCont ? 1350 : 1150;

    this.m = modal(this, root => {
      root.add(panel(this, 0, 0, 900, ph, title));
      const top = -ph / 2;
      root.add(txt(this, 0, top + 140, tip, 36, HEX.dim, { stroke: 7 }));
      root.add(txt(this, 0, top + 230, 'SCORE', 44, HEX.cyan, { stroke: 8 }));
      const score = txt(this, 0, top + 340, '0', 170, HEX.text, { stroke: 22 });
      gradientFill(score, '#ffffff', '#bfe9ff');
      root.add(score);
      this.tweens.addCounter({
        from: 0, to: d.score, duration: Math.min(1200, 300 + d.score * 4), ease: 'Cubic.easeOut', delay: 300,
        onUpdate: tw => { score.setText(fmt(Math.round(tw.getValue()))); gradientFill(score, '#ffffff', '#bfe9ff'); },
        onComplete: () => {
          this.tweens.add({ targets: score, scale: 1.15, duration: 120, yoyo: true });
          if (newBest) this.celebrate(root, top);
        }
      });
      const bestLine = txt(this, 0, top + 460, newBest ? `previous best ${fmt(prevBest)}` : `BEST  ${fmt(save.best)}`, 42, HEX.yellow, { stroke: 8 });
      root.add(bestLine);

      // stat chips
      const chips = [['icon_comet', d.hops, 'planets', 0x3ff0ff], ['icon_star', d.perfects, 'perfect', 0xffd84f], ['stardust', '+' + d.dust, 'stardust', null]];
      chips.forEach(([icon, val, label, tint], i) => {
        const x = (i - 1) * 270, y = top + 600;
        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.28).fillRoundedRect(x - 120, y - 80, 240, 170, 32);
        const ic = this.add.image(x, y - 34, icon).setDisplaySize(56, 56);
        if (tint) ic.setTint(tint);
        root.add([g, ic, txt(this, x, y + 22, String(val), 52, HEX.text, { stroke: 9 }), txt(this, x, y + 66, label, 28, HEX.dim, { stroke: 6 })]);
      });

      let y = top + 800;
      if (canCont) {
        const affordable = save.dust >= CONTINUE_COST;
        const cont = button(this, 0, y, `CONTINUE  ${CONTINUE_COST}`, { color: 'pink', width: 600, size: 60, icon: 'play', onClick: () => this.cont() });
        const ds = this.add.image(cont.label.x + cont.label.width / 2 + 40, -8, 'stardust').setDisplaySize(64, 64);
        cont.add(ds);
        cont.setDisabled(!affordable);
        if (affordable) this.tweens.add({ targets: cont, scale: cont.getData('s') * 1.04, duration: 500, yoyo: true, repeat: -1 });
        root.add(cont);
        root.add(txt(this, 0, y + 105, affordable ? `You have ${fmt(save.dust)} ✦` : `Need ${CONTINUE_COST} ✦ — you have ${fmt(save.dust)}`, 30, HEX.dim, { stroke: 6 }));
        y += 200;
      }
      root.add(button(this, 0, y + 10, 'PLAY AGAIN', { color: 'yellow', width: 620, size: 72, icon: 'retry', onClick: () => this.retry() }));
      root.add(iconButton(this, -200, y + 200, 'home', { onClick: () => this.home() }));
      root.add(iconButton(this, 200, y + 200, 'comet', { color: 'cyan', onClick: () => this.skins() }));
    });
    this.offBack = native.onBack(() => { this.home(); return true; });
    this.events.once('shutdown', () => this.offBack());
  }

  celebrate(root, top) {
    const stamp = txt(this, 250, top + 260, 'NEW\nBEST!', 64, HEX.text, { stroke: 12 });
    gradientFill(stamp, '#fff6c2', '#ff9a3d');
    stamp.setAngle(14).setScale(3).setAlpha(0);
    root.add(stamp);
    this.tweens.add({ targets: stamp, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });
    audio.play('perfect');
    const { width: W } = this.scale;
    const conf = this.add.particles(0, -40, 'spark', {
      x: { min: 0, max: W }, lifespan: 2600, speedY: { min: 250, max: 520 }, speedX: { min: -80, max: 80 },
      scale: { start: 0.9, end: 0.3 }, rotate: { min: 0, max: 360 }, quantity: 3, frequency: 40,
      tint: [0xffd84f, 0xff4fd8, 0x3ff0ff, 0x3dff9a, 0xffffff]
    }).setDepth(-1);
    this.time.delayedCall(1600, () => conf.stop());
    this.cameras.main.shake(160, 0.004);
  }

  finishRun() {
    const d = this.d;
    save.recordStats({ hops: d.hops, sector: d.sector, perfects: d.perfects });
  }

  cont() {
    if (this._done) return;
    if (save.dust < CONTINUE_COST) return;
    this._done = true;
    save.addDust(-CONTINUE_COST);
    audio.play('buy');
    this.m.close(() => {
      const g = this.scene.get('Game');
      g.dustText.setText(fmt(save.dust));
      this.scene.stop();
      g.revive();
    });
  }

  retry() {
    if (this._done) return; this._done = true;
    this.finishRun();
    this.scene.start('Game');
  }

  home() {
    if (this._done) return; this._done = true;
    this.finishRun();
    this.cameras.main.fadeOut(220, 5, 3, 26);
    this.cameras.main.once('camerafadeoutcomplete', () => { this.scene.stop('Game'); this.scene.start('Title'); });
  }

  skins() {
    if (this._done) return; this._done = true;
    this.finishRun();
    this.cameras.main.fadeOut(220, 5, 3, 26);
    this.cameras.main.once('camerafadeoutcomplete', () => { this.scene.stop('Game'); this.scene.start('Skins'); });
  }
}
