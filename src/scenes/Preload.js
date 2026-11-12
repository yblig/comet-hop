import Phaser from 'phaser';
import { audio } from '../lib/audio.js';
import { txt, HEX, C } from '../theme.js';
import { SKINS } from '../config.js';
import { makeProceduralTextures } from '../ui/SpaceBG.js';

const SFX = ['ui_tap', 'ui_open', 'ui_back', 'toggle', 'launch', 'capture', 'perfect', 'dust', 'combo', 'powerup',
  'shield_break', 'tick', 'crash', 'swallow', 'lost', 'gameover', 'sector', 'newbest', 'unlock', 'buy', 'error', 'revive'];
const ICONS = ['pause', 'play', 'home', 'retry', 'gear', 'music', 'sound', 'vibrate', 'comet', 'help', 'close', 'lock',
  'aim', 'check', 'trophy', 'star', 'reset'];

export default class Preload extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    const { width: W, height: H } = this.scale;
    this.cameras.main.setBackgroundColor('#0b0a24');
    const planet = this.add.image(W / 2, H * 0.42, 'boot_planet').setScale(0.9);
    const comet = this.add.image(W / 2, H * 0.42, 'boot_comet').setScale(0.6);
    this.tweens.addCounter({
      from: 0, to: Math.PI * 2, duration: 1400, repeat: -1,
      onUpdate: tw => comet.setPosition(W / 2 + Math.cos(tw.getValue()) * 210, H * 0.42 + Math.sin(tw.getValue()) * 210)
    });
    this.tweens.add({ targets: planet, scale: 0.95, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
    const bw = Math.min(720, W * 0.7), by = H * 0.64;
    const bar = this.add.graphics();
    const t = txt(this, W / 2, by + 90, 'Loading the cosmos…', 44, HEX.dim, { stroke: 8 });
    const draw = p => {
      bar.clear();
      bar.fillStyle(C.outline, 1).fillRoundedRect(W / 2 - bw / 2 - 8, by - 30, bw + 16, 60, 30);
      bar.fillStyle(0x2a2068, 1).fillRoundedRect(W / 2 - bw / 2, by - 22, bw, 44, 22);
      if (p > 0.02) {
        bar.fillGradientStyle(C.cyan, C.pink, C.cyan, C.pink, 1);
        bar.fillRoundedRect(W / 2 - bw / 2, by - 22, Math.max(44, bw * p), 44, 22);
        bar.fillStyle(0xffffff, 0.35).fillRoundedRect(W / 2 - bw / 2 + 12, by - 16, Math.max(20, bw * p - 24), 10, 5);
      }
    };
    draw(0);
    this.load.on('progress', p => draw(p * 0.85));
    this._draw = draw; this._t = t;

    const A = 'art/';
    for (let i = 0; i < 6; i++) this.load.svg(`planet_${i}`, `${A}planet_${i}.svg`, { width: 512, height: 512 });
    for (let i = 0; i < 2; i++) this.load.svg(`planet_ringed_${i}`, `${A}planet_ringed_${i}.svg`, { width: 800, height: 560 });
    for (const f of ['sleep', 'happy', 'scared']) this.load.svg(`face_${f}`, `${A}face_${f}.svg`, { width: 512, height: 512 });
    for (const s of SKINS) this.load.svg(`comet_${s.id}`, `${A}comet_${s.id}.svg`, { width: 220, height: 220 });
    for (let i = 0; i < 3; i++) this.load.svg(`asteroid_${i}`, `${A}asteroid_${i}.svg`, { width: 256, height: 256 });
    for (let i = 0; i < 3; i++) this.load.svg(`nebula_${i}`, `${A}nebula_${i}.svg`, { width: 1024, height: 1024 });
    this.load.svg('blackhole', `${A}blackhole.svg`, { width: 420, height: 420 });
    this.load.svg('blackhole_swirl', `${A}blackhole_swirl.svg`, { width: 420, height: 420 });
    this.load.svg('stardust', `${A}stardust.svg`, { width: 96, height: 96 });
    this.load.svg('pu_shield', `${A}pu_shield.svg`, { width: 160, height: 160 });
    this.load.svg('pu_magnet', `${A}pu_magnet.svg`, { width: 160, height: 160 });
    this.load.svg('shield_bubble', `${A}shield_bubble.svg`, { width: 220, height: 220 });
    for (const c of ['yellow', 'cyan', 'pink', 'dark']) {
      this.load.svg(`btn_${c}`, `${A}btn_${c}.svg`, { width: 560, height: 180 });
      this.load.svg(`round_${c}`, `${A}round_${c}.svg`, { width: 160, height: 168 });
    }
    for (const i of ICONS) this.load.svg(`icon_${i}`, `${A}icon_${i}.svg`, { width: 96, height: 96 });
  }

  async create() {
    makeProceduralTextures(this);
    const map = {};
    SFX.forEach(k => (map[k] = `audio/${k}.wav`));
    map.music_title = 'audio/music_title.ogg';
    map.music_game = 'audio/music_game.ogg';
    this._draw(0.9);
    await audio.load(map);
    this._draw(1);
    this.time.delayedCall(150, () => {
      this.cameras.main.fadeOut(250, 11, 10, 36);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Title'));
    });
  }
}
