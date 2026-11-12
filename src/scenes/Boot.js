import Phaser from 'phaser';

export default class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    // the loading screen needs these two before everything else
    this.load.svg('boot_comet', 'art/comet_classic.svg', { width: 160, height: 160 });
    this.load.svg('boot_planet', 'art/planet_2.svg', { width: 300, height: 300 });
  }
  create() { this.scene.start('Preload'); }
}
