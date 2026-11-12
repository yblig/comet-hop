import '@fontsource/baloo-2/800.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './style.css';
import { storage } from './lib/storage.js';
import { native } from './lib/native.js';
import { audio } from './lib/audio.js';
import { mountRoot, go } from './app.js';
import { homeScreen } from './screens/home.js';
import './input/pads.js';
import './input/nav.js';
import { apply as applyLite } from './lite.js';

const SFX = ['tap', 'back', 'open', 'toggle', 'select', 'confirm', 'join', 'leave', 'wiggle', 'start', 'count', 'go', 'boost',
  'bump', 'lap', 'finish', 'dash', 'hit', 'fall', 'roundwin', 'correct', 'wrong', 'tick', 'win', 'question', 'lock',
  'shoot', 'jump', 'alarm', 'notify', 'sb_clap', 'sb_drum', 'sb_rimshot', 'sb_horn', 'sb_lose', 'sb_ding', 'sb_cricket'];
const MUSIC = ['music_lobby', 'music_kart', 'music_sumo', 'music_quiz'];

async function start() {
  await storage.init();
  await native.init();
  mountRoot();
  applyLite();
  const map = {};
  SFX.forEach(k => (map[k] = `audio/${k}.wav`));
  MUSIC.forEach(k => (map[k] = `audio/${k}.ogg`));
  try { await Promise.all([document.fonts.load('800 40px "Baloo 2"'), document.fonts.load('600 20px Fredoka')]); } catch { /* ignore */ }
  const loading = audio.load(map);
  go(homeScreen);
  await loading;
  audio.playMusic('music_lobby');
}
start();
