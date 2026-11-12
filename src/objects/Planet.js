import Phaser from 'phaser';
import { C } from '../theme.js';
import { ORBIT_GAP, PLANET_KEYS, PLANET_GLOW, RINGED_KEYS, RINGED_GLOW } from '../config.js';

// A planet with a gravity ring the comet can orbit. Body art is authored with a 110-unit
// radius in a 256 box and loaded at 2×, so scale = bodyR / 220.
export default class Planet {
  constructor(scene, x, y, bodyR, { index = 0, ringed = false, variant = 0, moving = null } = {}) {
    this.scene = scene;
    this.index = index;
    this.bodyR = bodyR;
    this.ro = bodyR + ORBIT_GAP;
    this.baseX = x; this.x = x; this.y = y;
    this.moving = moving; // { amp, speed, phase }
    this.ringed = ringed;
    this.visited = false;
    this.decayLeft = 0; this.decayMax = 1;

    const glowCol = ringed ? RINGED_GLOW[variant % 2] : PLANET_GLOW[variant % 6];
    this.c = scene.add.container(x, y).setDepth(10);
    this.glow = scene.add.image(0, 0, 'softglow').setTint(glowCol).setBlendMode(Phaser.BlendModes.ADD)
      .setScale((bodyR * 2.1) / 128).setAlpha(0.5);
    this.ring = scene.add.graphics();
    this.timer = scene.add.graphics();
    const s = bodyR / 220;
    this.body = scene.add.image(0, 0, ringed ? RINGED_KEYS[variant % 2] : PLANET_KEYS[variant % 6]).setScale(s);
    this.face = scene.add.image(0, 0, 'face_sleep').setScale(s);
    this.c.add([this.glow, this.ring, this.timer, this.body, this.face]);
    this.baseScale = s;
    this.drawRing(false);
    this.ring.rotation = Math.random() * Math.PI;
    this.spin = (Math.random() < 0.5 ? -1 : 1) * 0.15;
    // gentle idle bob of the face & body
    scene.tweens.add({ targets: [this.body, this.face], scaleY: s * 0.975, scaleX: s * 1.015, duration: 1400 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    if (moving) this.drawMoveHint();
  }

  drawRing(active) {
    const g = this.ring;
    g.clear();
    const segs = Math.max(18, Math.round(this.ro / 7));
    const col = active ? C.cyan : 0xffffff;
    g.lineStyle(active ? 7 : 5, col, active ? 0.75 : 0.28);
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2, a1 = a0 + (Math.PI * 2 / segs) * 0.55;
      g.beginPath(); g.arc(0, 0, this.ro, a0, a1); g.strokePath();
    }
    if (active) { g.lineStyle(18, C.cyan, 0.08); g.strokeCircle(0, 0, this.ro); }
  }

  drawMoveHint() {
    // faint chevrons on both sides showing the planet slides sideways
    const g = this.scene.add.graphics();
    g.lineStyle(6, 0xffffff, 0.25);
    const d = this.ro + 26;
    for (const sgn of [-1, 1]) {
      g.beginPath(); g.moveTo(sgn * d, -16); g.lineTo(sgn * (d + 16), 0); g.lineTo(sgn * d, 16); g.strokePath();
    }
    this.c.addAt(g, 1);
    this.hint = g;
  }

  setFace(kind) {
    const key = 'face_' + kind;
    if (this.face.texture.key === key) return;
    this.face.setTexture(key);
    this.scene.tweens.add({ targets: this.face, scale: { from: this.baseScale * 1.15, to: this.baseScale }, duration: 220, ease: 'Back.easeOut' });
  }

  activate(decay) {
    this.isActive = true;
    this.decayMax = decay; this.decayLeft = decay;
    this.drawRing(true);
    this.setFace('happy');
    const s = this.baseScale;
    this.scene.tweens.add({ targets: this.body, scaleX: s * 1.12, scaleY: s * 0.9, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
  }

  deactivate() {
    this.isActive = false;
    this.drawRing(false);
    this.timer.clear();
    this.scene.time.delayedCall(600, () => { if (this.c.active && !this.isActive) this.setFace('sleep'); });
  }

  drawTimer(frac, t) {
    const g = this.timer;
    g.clear();
    if (frac <= 0) return;
    let col = C.mint;
    if (frac < 0.35) col = Math.floor(t / 140) % 2 ? C.danger : 0xffffff;
    else if (frac < 0.6) col = C.yellow;
    g.lineStyle(14, C.outline, 0.8);
    g.beginPath(); g.arc(0, 0, this.ro + 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); g.strokePath();
    g.lineStyle(8, col, 1);
    g.beginPath(); g.arc(0, 0, this.ro + 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); g.strokePath();
  }

  update(time, dt) {
    if (this.moving) {
      this.x = this.baseX + Math.sin(time * 0.001 * this.moving.speed + this.moving.phase) * this.moving.amp;
      this.c.x = this.x;
    }
    this.ring.rotation += this.spin * dt;
  }

  destroy() { this.c.destroy(); }
}
