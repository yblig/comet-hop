// End-to-end test: one host page + controller pages in one browser, connected over
// BroadcastChannel (?local=1). Saves screenshots to shots/. Usage:
//   npm run build && node preview/e2e.mjs [game] [players]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const game = process.argv[2] || 'all';
const nPlayers = +(process.argv[3] || 2);
fs.mkdirSync('shots', { recursive: true });
const port = 4600 + Math.floor(Math.random() * 300);
const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
const url = `http://localhost:${port}/?local=1`;
for (let i = 0; i < 80; i++) { try { await fetch(url); break; } catch { await new Promise(r => setTimeout(r, 250)); } }

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: false });
const errors = [];
const watch = (p, tag) => {
  p.on('pageerror', e => errors.push(`[${tag}] ${e.message}`));
  p.on('console', m => { if (m.type() === 'error') errors.push(`[${tag}] ${m.text()}`); });
};
const wait = ms => new Promise(r => setTimeout(r, ms));
let n = 0;
const shot = async (p, name) => { await p.screenshot({ path: `shots/${String(++n).padStart(2, '0')}-${name}.png` }); console.log('📸', name); };

const host = await ctx.newPage(); watch(host, 'host');
await host.goto(url); await wait(1500);
await host.evaluate(() => (window.__dtMax = 0.2));
await shot(host, 'home');
await host.getByText('Jadi Layar').click(); await wait(1200);
const code = await host.evaluate(() => window.__host?.code);
console.log('room code', code);

const names = ['Andi', 'Sinta', 'Budi', 'Rina'];
const pads = [];
for (let i = 0; i < nPlayers; i++) {
  const c = await ctx.newPage(); watch(c, 'pad' + (i + 1));
  await c.goto(url); await wait(900);
  await c.getByText('Jadi Controller').click(); await wait(700);
  await c.fill('input.field', names[i]);
  const boxes = c.locator('.code-boxes input');
  for (let k = 0; k < 4; k++) await boxes.nth(k).fill(code[k]);
  if (i === 0) await shot(c, 'pad-join');
  await c.getByText('GABUNG').click(); await wait(900);
  pads.push(c);
}
await wait(600);
await shot(host, 'lobby');
await shot(pads[0], 'pad-menu');
if (pads[1]) await shot(pads[1], 'pad-lobby');

const press = async (p, sel, ms = 120) => {
  const b = p.locator(sel).first(); const box = await b.boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await wait(ms); await p.mouse.up();
};
const hold = async (p, sel) => { const b = p.locator(sel).first(); const box = await b.boundingBox(); await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); };

async function backToLobby() { await host.evaluate(() => import('/src/app.js').catch(() => null)); await host.evaluate(() => window.__host && window.__host.state !== 'lobby' && document.querySelector('.btn.dark.small')?.click()); await wait(1200); }

if (game === 'all' || game === 'quiz') {
  await host.evaluate(() => window.__host.select(2)); await wait(400);
  await press(pads[0], '.cbtn.gas >> nth=1'); await host.bringToFront(); await wait(2600);
  await shot(host, 'quiz-q');
  await shot(pads[0], 'pad-quiz');
  await press(pads[0], '.cbtn.q1'); if (pads[1]) await press(pads[1], '.cbtn.q2');
  await wait(1200);
  await shot(host, 'quiz-reveal'); await shot(pads[0], 'pad-quiz-reveal');
  await host.evaluate(() => window.__quiz.end()); await wait(1600);
  await shot(host, 'results'); await shot(pads[0], 'pad-results');
  await press(pads[0], '.cbtn.gas'); await wait(1500);
}
if (game === 'all' || game === 'kart') {
  await host.evaluate(() => window.__host.select(0)); await wait(300);
  await host.evaluate(() => window.__host.startGame()); await wait(2500);
  await shot(host, 'kart-count');
  await shot(pads[0], 'pad-kart');
  await hold(pads[0], '.cbtn.gas'); await host.bringToFront(); await wait(9000);
  console.log(await host.evaluate(() => JSON.stringify(window.__kart.karts.map(k => [k.name, Math.round(k.v), k.lap, k.idx]))));
  await shot(host, 'kart-race');
  await pads[0].mouse.up();
  await host.evaluate(() => window.__kart.finish()); await wait(1500);
  await shot(host, 'kart-results');
  await host.evaluate(() => document.querySelector('.btn.dark.small')?.click()); await wait(1200);
}
if (game === 'all' || game === 'sumo') {
  await host.evaluate(() => window.__host.select(1)); await wait(300);
  await host.evaluate(() => window.__host.startGame()); await host.bringToFront(); await wait(4500);
  await shot(pads[0], 'pad-sumo');
  const j = await pads[0].locator('.joy').boundingBox();
  await pads[0].mouse.move(j.x + j.width / 2, j.y + j.height / 2); await pads[0].mouse.down();
  await pads[0].mouse.move(j.x + j.width * 0.9, j.y + j.height * 0.2, { steps: 4 });
  await wait(2500);
  await shot(host, 'sumo-fight');
  await pads[0].mouse.up();
  await host.evaluate(() => window.__sumo.finish()); await wait(1500);
  await shot(host, 'sumo-results');
}
console.log(errors.length ? '❌ errors:\n' + [...new Set(errors)].join('\n') : '✅ no errors');
await browser.close(); server.kill();
void backToLobby;
