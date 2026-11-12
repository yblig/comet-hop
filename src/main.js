import Phaser from 'phaser';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import { storage } from './lib/storage.js';
import { native } from './lib/native.js';
import { save } from './state.js';
import { DESIGN_W, DESIGN_H } from './config.js';
import Boot from './scenes/Boot.js';
import Preload from './scenes/Preload.js';
import Title from './scenes/Title.js';
import HowTo from './scenes/HowTo.js';
import Game from './scenes/Game.js';
import Pause from './scenes/Pause.js';
import Results from './scenes/Results.js';
import Settings from './scenes/Settings.js';
import Skins from './scenes/Skins.js';

async function start() {
  await storage.init();
  await native.init();
  save.init();
  try {
    await Promise.all([document.fonts.load('700 64px Fredoka'), document.fonts.load('600 64px Fredoka')]);
  } catch { /* fall back silently */ }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'app',
    backgroundColor: '#0b0a24',
    scale: { mode: Phaser.Scale.EXPAND, autoCenter: Phaser.Scale.CENTER_BOTH, width: DESIGN_W, height: DESIGN_H },
    input: { activePointers: 2 },
    render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
    fps: { target: 60 },
    scene: [Boot, Preload, Title, Skins, Game, Pause, Results, HowTo, Settings]
  });
  window.__game = game;
}
start();
