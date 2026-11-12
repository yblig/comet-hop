// v2 test: simulated PS3 controllers + one phone; walks every game and tool, screenshots.
//   npm run build && node preview/e2e2.mjs [games|tools|all] [filter]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const what = process.argv[2] || 'all', filter = process.argv[3] || '';
fs.mkdirSync('shots', { recursive: true });
const port = 5100 + Math.floor(Math.random() * 300);
const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
const url = `http://localhost:${port}/?local=1`;
for (let i = 0; i < 80; i++) { try { await fetch(url); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
const errors = [];
const watch = (p, tag) => { p.on('pageerror', e => errors.push(`[${tag}] ${e.message}\n${e.stack?.split('\n').slice(0, 3).join('\n')}`)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(`[${tag}] ${m.text()}`); }); };
const wait = ms => new Promise(r => setTimeout(r, ms));
let n = 0;
const shot = async (p, name) => { await p.screenshot({ path: `shots/${String(++n).padStart(2, '0')}-${name}.png` }); console.log('📸', name); };

const host = await ctx.newPage(); watch(host, 'host');
await host.goto(url); await wait(1500);
await host.evaluate(() => { window.__dtMax = 0.2; window.__padEvent({ type: 'list', tv: true, pads: [{ id: 7, name: 'Sony PLAYSTATION(R)3 Controller' }, { id: 8, name: 'Sony PLAYSTATION(R)3 Controller' }] }); });
await wait(600);
await shot(host, 'home-tv');
// remote navigation
await host.keyboard.press('ArrowDown'); await wait(300); await host.keyboard.press('ArrowUp'); await wait(300);
await shot(host, 'home-focus');
await host.keyboard.press('Enter'); await wait(1500);
const code = await host.evaluate(() => window.__host?.code);
console.log('room', code, 'players', await host.evaluate(() => window.__host.list.map(p => p.name + ':' + p.kind).join(', ')));
// one phone
const pad = await ctx.newPage(); watch(pad, 'phone');
await pad.goto(url); await wait(900);
await pad.getByText('Jadi Controller').click(); await wait(600);
await pad.fill('input.field', 'Rina');
for (let k = 0; k < 4; k++) await pad.locator('.code-boxes input').nth(k).fill(code[k]);
await pad.getByText('GABUNG').click(); await wait(1200);
await host.bringToFront(); await wait(500);
await shot(host, 'lobby');

const padState = (id, b, a = [0, 0, 0, 0, 0, 0]) => host.evaluate(([id, b, a]) => window.__padEvent({ type: 'state', id, name: 'Sony PLAYSTATION(R)3 Controller', b, a }), [id, b, a]);
const games = await host.evaluate(() => window.__host && (window.__GAMES || null));
if (what === 'all' || what === 'games') {
  const ids = await host.evaluate(() => window.__gameIds) || [];
  const list = ids.length ? ids : ['snake', 'tron', 'tanks', 'soccer', 'pong', 'coins', 'meteors', 'jumpbar', 'race', 'reflex', 'fruit', 'paint', 'hotbomb', 'maze', 'simon', 'math', 'archery', 'kart', 'sumo', 'quiz'];
  for (const id of list) {
    if (filter && !filter.split(',').includes(id)) continue;
    await host.evaluate(id => { const H = window.__host; H.cat = 'semua'; const i = window.__gameIds.indexOf(id); H.sel = i; H.startGame(); }, id);
    await wait(4200);
    // drive pad 1: stick right + mash ✕, pad 2: stick up-left
    for (let k = 0; k < 10; k++) { await padState(7, k % 2 ? 1 : 0, [0.8, 0.3, 0, 0, 0, 0]); await padState(8, k % 3 ? 0 : 1 << 3, [-0.6, -0.7, 0, 0, 0, 0]); await wait(250); }
    await shot(host, 'game-' + id);
    if (id === 'snake') await shot(pad, 'phone-pad');
    if (id === 'race') await shot(pad, 'phone-buttons');
    await padState(7, 0); await padState(8, 0);
    await host.evaluate(() => { const g = window.__g2d; if (g) g.end(); else if (window.__kart) window.__kart.finish(); else if (window.__sumo) window.__sumo.finish(); else if (window.__quiz) window.__quiz.end(); });
    await wait(2600);
    if (id === 'snake') await shot(host, 'results');
    await host.evaluate(() => window.__goLobby());
    await wait(900);
  }
}
if (what === 'all' || what === 'tools') {
  await host.evaluate(() => { window.__host.tab = 'tools'; window.__goLobby(); });
  await wait(900);
  await shot(host, 'lobby-tools');
  const tools = await host.evaluate(() => window.__toolIds);
  for (const id of tools) {
    if (filter && !filter.split(',').includes(id)) continue;
    await host.evaluate(id => window.__openTool(id), id);
    await wait(900);
    await host.locator('.tool-main .btn').first().click({ timeout: 2000 }).catch(() => {});
    await wait(600);
    if (['wheel', 'buzzer', 'vote', 'draw', 'soundboard', 'score', 'padtest', 'dice', 'timer', 'charades', 'hiit', 'emoji'].includes(id)) await shot(host, 'tool-' + id);
    if (['vote', 'draw', 'emoji', 'soundboard'].includes(id)) await shot(pad, 'phone-tool-' + id);
    await host.evaluate(() => window.__goLobby());
    await wait(500);
  }
}
console.log(errors.length ? '❌ errors:\n' + [...new Set(errors)].join('\n') : '✅ no errors');
await browser.close(); server.kill();
void games;
