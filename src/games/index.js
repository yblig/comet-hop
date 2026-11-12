import { createKart } from './kart.js';
import { createSumo } from './sumo.js';
import { createQuiz } from './quiz.js';

export const GAMES = [
  { id: 'kart', name: 'Turbo Kart 3D', desc: 'Balapan split-screen, 3 lap', badge: '3D', ideal: 4, layout: 'kart', create: createKart },
  { id: 'sumo', name: 'Sumo Bump', desc: 'Dorong lawan keluar arena', badge: '3D', ideal: 4, layout: 'sumo', create: createSumo },
  { id: 'quiz', name: 'Kuis Kilat', desc: '10 soal, siapa paling cepat?', ideal: 1, layout: 'quiz', create: createQuiz }
];
