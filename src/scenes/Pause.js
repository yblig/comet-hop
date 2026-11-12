import Phaser from 'phaser';
import { audio } from '../lib/audio.js';
import { native } from '../lib/native.js';
import { txt, HEX, fmt } from '../theme.js';
import { button, iconButton, panel, modal } from '../ui/widgets.js';

export default class Pause extends Phaser.Scene {
  constructor() { super('Pause'); }

  create() {
    const game = this.scene.get('Game');
    audio.duckMusic(true);
    this.m = modal(this, root => {
      root.add(panel(this, 0, 0, 820, 900, 'PAUSED'));
      root.add(txt(this, 0, -270, 'SCORE', 40, HEX.dim, { stroke: 8 }));
      root.add(txt(this, 0, -195, fmt(game.score), 110, HEX.text, { stroke: 16 }));
      root.add(txt(this, 0, -100, `${game.hops} planets · ${game.sector.name}`, 38, HEX.cyan, { stroke: 8 }));
      root.add(button(this, 0, 40, 'RESUME', { color: 'yellow', width: 560, size: 70, icon: 'play', onClick: () => this.resume() }));
      root.add(button(this, 0, 220, 'RESTART', { color: 'cyan', width: 480, size: 58, icon: 'retry', onClick: () => this.restart() }));
      root.add(iconButton(this, -170, 370, 'home', { onClick: () => this.home() }));
      root.add(iconButton(this, 170, 370, 'gear', { onClick: () => this.settings() }));
    });
    this.offBack = native.onBack(() => { this.resume(); return true; });
    this.events.once('shutdown', () => this.offBack());
  }

  resume() {
    if (this._done) return; this._done = true;
    audio.play('ui_back');
    this.m.close(() => {
      audio.duckMusic(false);
      this.scene.resume('Game');
      this.scene.stop();
    });
  }

  restart() {
    if (this._done) return; this._done = true;
    this.scene.start('Game');
  }

  home() {
    if (this._done) return; this._done = true;
    this.cameras.main.fadeOut(220, 5, 3, 26);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('Game');
      this.scene.start('Title');
    });
  }

  settings() {
    this.scene.pause();
    this.scene.launch('Settings', { from: 'Pause' });
  }
}
