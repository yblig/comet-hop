import '@fontsource/baloo-2/800.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './style.css';
import { storage } from './lib/storage.js';
import { native } from './lib/native.js';
import { audio } from './lib/audio.js';
import { mountRoot, go } from './app.js';
import { homeScreen } from './screens/home.js';

const SFX = ['tap', 'back', 'open', 'toggle', 'select', 'confirm', 'join', 'leave', 'wiggle', 'start', 'count', 'go', 'boost',
  'bump', 'lap', 'finish', 'dash', 'hit', 'fall', 'roundwin', 'correct', 'wrong', 'tick', 'win', 'question', 'lock'];
const MUSIC = ['music_lobby', 'music_kart', 'music_sumo', 'music_quiz'];

async function start() {
  await storage.init();
  await native.init();
  mountRoot();
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
