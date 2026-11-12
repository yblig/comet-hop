import { createKart } from './kart.js';
import { createSumo } from './sumo.js';
import { createQuiz } from './quiz.js';
import { snake, tron, tanks } from '../games2d/arcade1.js';
import { soccer, pong, coins, meteors } from '../games2d/arcade2.js';
import { jumpbar, race, reflex, fruit } from '../games2d/arcade3.js';
import { paint, hotbomb, maze, simon, math, archery } from '../games2d/arcade4.js';

// cat: aksi | balap | otak | santai
export const GAMES = [
  { id: 'kart', name: 'Turbo Kart 3D', desc: 'Balapan split-screen 3 lap', cat: 'balap', badge: '3D', ideal: 4, layout: 'kart', create: createKart },
  { id: 'sumo', name: 'Sumo Bump 3D', desc: 'Dorong lawan keluar arena', cat: 'aksi', badge: '3D', ideal: 4, layout: 'sumo', create: createSumo },
  { id: 'quiz', name: 'Kuis Kilat', desc: '10 soal pengetahuan umum', cat: 'otak', ideal: 1, layout: 'quiz', create: createQuiz },
  { id: 'snake', name: 'Ular Rebutan', desc: 'Makan buah, jangan tabrakan', cat: 'aksi', ideal: 2, create: snake },
  { id: 'tron', name: 'Garis Cahaya', desc: 'Motor cahaya, jangan nabrak', cat: 'aksi', ideal: 2, create: tron },
  { id: 'tanks', name: 'Tank Tempur', desc: 'Tembak-tembakan tank', cat: 'aksi', ideal: 2, create: tanks },
  { id: 'soccer', name: 'Bola Seru', desc: 'Sepak bola 2 lawan 2', cat: 'aksi', ideal: 4, create: soccer },
  { id: 'pong', name: 'Pong 4 Sisi', desc: 'Jaga sisimu dari bola', cat: 'santai', ideal: 4, create: pong },
  { id: 'coins', name: 'Panen Koin', desc: 'Kumpulkan koin, awas bom', cat: 'santai', ideal: 2, create: coins },
  { id: 'meteors', name: 'Hujan Meteor', desc: 'Hindari meteor jatuh', cat: 'aksi', ideal: 3, create: meteors },
  { id: 'jumpbar', name: 'Lompat Putar', desc: 'Lompati palang berputar', cat: 'santai', ideal: 3, create: jumpbar },
  { id: 'race', name: 'Lari Kencang', desc: 'Adu cepat pencet tombol', cat: 'balap', ideal: 4, create: race },
  { id: 'reflex', name: 'Reaksi Kilat', desc: 'Siapa paling cepat menekan', cat: 'otak', ideal: 2, create: reflex },
  { id: 'fruit', name: 'Tangkap Buah', desc: 'Tangkap buah pakai keranjang', cat: 'santai', ideal: 2, create: fruit },
  { id: 'paint', name: 'Cat Wilayah', desc: 'Warnai lantai paling luas', cat: 'santai', ideal: 2, create: paint },
  { id: 'hotbomb', name: 'Bom Panas', desc: 'Oper bom sebelum meledak', cat: 'aksi', ideal: 3, create: hotbomb },
  { id: 'maze', name: 'Labirin Harta', desc: 'Cari harta di labirin', cat: 'otak', ideal: 2, create: maze },
  { id: 'simon', name: 'Ingat Warna', desc: 'Ulangi urutan warna', cat: 'otak', ideal: 1, layout: 'quiz', create: simon },
  { id: 'math', name: 'Hitung Cepat', desc: '12 soal matematika kilat', cat: 'otak', ideal: 1, layout: 'quiz', create: math },
  { id: 'archery', name: 'Panahan', desc: 'Bidik sasaran, awas angin', cat: 'santai', ideal: 2, create: archery }
];
export const CATS = [['semua', 'Semua'], ['aksi', 'Aksi'], ['balap', 'Balap'], ['otak', 'Asah Otak'], ['santai', 'Santai']];
