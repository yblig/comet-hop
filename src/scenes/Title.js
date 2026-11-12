import Phaser from 'phaser';
import { audio } from '../lib/audio.js';
import { native } from '../lib/native.js';
import { save } from '../state.js';
import { txt, HEX, fmt, gradientFill } from '../theme.js';
import { button, iconButton, fadeTo, toast } from '../ui/widgets.js';
import { SpaceBG } from '../ui/SpaceBG.js';
import { SECTORS } from '../config.js';

export default class Title extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    const { width: W, height: H } = this.scale;
    this._leaving = false;
    this.cameras.main.fadeIn(350, 5, 3, 26);
    native.hideSplash();
    native.toast = msg => { if (this.sys.isActive()) toast(this, msg); };
    this.bg = new SpaceBG(this, SECTORS[0].top, SECTORS[0].bottom);

    // hero: a big sleepy planet with the player's comet looping around it
    const cy = H * 0.47;
    const glow = this.add.image(W / 2, cy, 'softglow').setTint(0xb48cff).setBlendMode(Phaser.BlendModes.ADD).setScale(4.2).setAlpha(0.55);
    this.tweens.add({ targets: glow, scale: 4.6, alpha: 0.4, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const ring = this.add.graphics({ x: W / 2, y: cy });
    ring.lineStyle(6, 0xffffff, 0.28);
    for (let i = 0; i < 44; i++) { const a = (i / 44) * Math.PI * 2; ring.beginPath(); ring.arc(0, 0, 330, a, a + 0.08); ring.strokePath(); }
    this.tweens.add({ targets: ring, angle: 360, duration: 40000, repeat: -1 });
    const planet = this.add.image(W / 2, cy, 'planet_ringed_0').setScale(1.0);
    const face = this.add.image(W / 2, cy, 'face_sleep').setScale(1.0);
    this.tweens.add({ targets: [planet, face], y: cy - 16, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const skin = save.skin;
    const comet = this.add.image(0, 0, 'comet_' + skin).setDisplaySize(96, 96).setDepth(5);
    this.trail = this.add.particles(0, 0, 'glow', {
      lifespan: 520, frequency: 14, scale: { start: 0.65, end: 0 }, alpha: { start: 0.8, end: 0 }, blendMode: 'ADD',
      tint: { onEmit: () => Phaser.Display.Color.HSVToRGB(((this.time.now / 2200) % 1), 0.55, 1).color }
    }).setDepth(4);
    this.trail.startFollow(comet);
    this.tweens.addCounter({
      from: 0, to: Math.PI * 2, duration: 3400, repeat: -1,
      onUpdate: tw => {
        const a = tw.getValue();
        comet.setPosition(W / 2 + Math.cos(a) * 330, planet.y + Math.sin(a) * 330);
        comet.setDepth(Math.sin(a) > 0 ? 5 : 1);
      }
    });
    planet.setDepth(2); face.setDepth(3);
    // wake the planet when tapped — a little toy
    planet.setInteractive(new Phaser.Geom.Circle(400, 280, 220), Phaser.Geom.Circle.Contains);
    planet.on('pointerdown', () => {
      face.setTexture('face_happy'); audio.play('capture');
      this.tweens.add({ targets: [planet, face], scaleX: 1.08, scaleY: 0.94, duration: 100, yoyo: true });
      this.time.delayedCall(1400, () => face.active && face.setTexture('face_sleep'));
    });

    // logo
    const top = Math.max(90, H * 0.05);
    const logo1 = txt(this, W / 2, top + 150, 'COMET', 168, HEX.text, { stroke: 22 });
    gradientFill(logo1, '#e9fdff', '#3ff0ff');
    const logo2 = txt(this, W / 2, top + 300, 'HOP', 190, HEX.text, { stroke: 24 });
    gradientFill(logo2, '#fff3b0', '#ff9a3d');
    logo2.setAngle(-4);
    const sparkle = this.add.image(W / 2 + 230, top + 240, 'stardust').setDisplaySize(90, 90);
    this.tweens.add({ targets: sparkle, angle: 360, duration: 5000, repeat: -1 });
    this.tweens.add({ targets: sparkle, scale: sparkle.scale * 1.3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    [logo1, logo2].forEach((l, i) => {
      l.setScale(0);
      this.tweens.add({ targets: l, scale: 1, duration: 600, delay: 150 + i * 140, ease: 'Back.easeOut' });
      this.tweens.add({ targets: l, y: l.y - 12, duration: 1800 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 800 });
    });

    // top bar: stardust + best
    const dust = this.add.image(70, top, 'stardust').setDisplaySize(70, 70);
    txt(this, 112, top, fmt(save.dust), 50, HEX.yellow, { ox: 0, stroke: 10 });
    const best = save.best;
    const tro = this.add.image(W - 250, top, 'icon_trophy').setDisplaySize(56, 56).setTint(0xffd84f);
    txt(this, W - 210, top, best ? fmt(best) : '—', 50, HEX.text, { ox: 0, stroke: 10 });
    void dust; void tro;

    // buttons
    const by = H * 0.76;
    const play = button(this, W / 2, by, 'PLAY', { color: 'yellow', width: 600, size: 84, icon: 'play', onClick: () => this.play() });
    this.tweens.add({ targets: play, scale: play.getData('s') * 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const skinsBtn = button(this, W / 2, by + 190, 'COMETS', { color: 'cyan', width: 460, size: 60, icon: 'comet', onClick: () => fadeTo(this, 'Skins') });
    if (save.affordableSkin()) {
      const badge = this.add.container(W / 2 + 190, by + 140);
      const dot = this.add.circle(0, 0, 30, 0xff3b5c).setStrokeStyle(6, 0x140f33);
      badge.add([dot, txt(this, 0, -2, '!', 40, HEX.text, { stroke: 6, shadow: false })]);
      this.tweens.add({ targets: badge, scale: 1.2, duration: 500, yoyo: true, repeat: -1 });
    }
    iconButton(this, W / 2 - 360, by + 190, 'gear', { size: 130, onClick: () => this.openOverlay('Settings') });
    iconButton(this, W / 2 + 360, by + 190, 'help', { size: 130, onClick: () => this.openOverlay('HowTo', { then: null }) });
    void skinsBtn;

    const st = save.stats;
    const foot = st.games ? `${st.games} flights · ${fmt(st.hops)} planets visited` : 'A tiny comet with big dreams';
    txt(this, W / 2, H - Math.max(60, H * 0.03), foot, 34, HEX.dim, { stroke: 7 });

    audio.playMusic('music_title');
    audio.duckMusic(false);
    const offBack = native.onBack(() => false);
    this.events.once('shutdown', offBack);
  }

  openOverlay(key, data = {}) {
    this.scene.pause();
    this.scene.launch(key, { from: 'Title', ...data });
  }

  play() {
    if (!save.howtoSeen) { this.openOverlay('HowTo', { then: 'Game' }); return; }
    fadeTo(this, 'Game');
  }

  update(t, dt) { this.bg.update(0, dt); }
}
