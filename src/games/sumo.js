// Sumo Bump 3D — push everyone off a shrinking floating arena. First to 3 round wins.
import * as THREE from 'three';
import { getRenderer, releaseRenderer, loop, disposeScene, canvasTexture, blobMesh, blobShadow, hexNum } from './three-common.js';
import { h, PCOLORS, btn, avatar, confirmBox } from '../ui/dom.js';
import { audio } from '../lib/audio.js';

const R0 = 20, RMIN = 9, WIN = 3, BR = 1.9;
const BOT_NAMES = ['Bot Gembul', 'Bot Bandel', 'Bot Bulat', 'Bot Kepo'];

export function createSumo(session, root, humans) {
  const renderer = getRenderer();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x150d38);
  scene.fog = new THREE.Fog(0x150d38, 60, 160);
  scene.add(new THREE.HemisphereLight(0xcfc4ff, 0x30184f, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(-20, 40, 25); scene.add(key);
  const rim = new THREE.PointLight(0xff3d8b, 120, 80); rim.position.set(0, -8, 0); scene.add(rim);

  // stars
  const sg = new THREE.BufferGeometry();
  const sp = [];
  for (let i = 0; i < 700; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(120 + Math.random() * 40); if (v.y < -10) v.y = -v.y; sp.push(v.x, v.y, v.z); }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, sizeAttenuation: true })));

  // arena: layered platform with a ring texture
  const topTex = canvasTexture(512, 512, (c, w) => {
    const g = c.createRadialGradient(w / 2, w / 2, 10, w / 2, w / 2, w / 2);
    g.addColorStop(0, '#b49cff'); g.addColorStop(0.7, '#8a6bff'); g.addColorStop(1, '#6a4bd8');
    c.fillStyle = g; c.fillRect(0, 0, w, w);
    c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 6;
    for (let r = 60; r < w / 2; r += 60) { c.beginPath(); c.arc(w / 2, w / 2, r, 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.18)'; c.font = '900 90px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('MABAR', w / 2, w / 2);
  });
  const arena = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(R0, R0, 1.2, 64), [
    new THREE.MeshStandardMaterial({ color: 0x5a3bc8, roughness: 0.6 }), new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.55 }), new THREE.MeshStandardMaterial({ color: 0x3a2490 })]);
  top.position.y = -0.6;
  const edge = new THREE.Mesh(new THREE.TorusGeometry(R0, 0.35, 10, 80), new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffa000, emissiveIntensity: 0.6 }));
  edge.rotation.x = Math.PI / 2;
  const under = new THREE.Mesh(new THREE.ConeGeometry(R0 * 0.95, 14, 10), new THREE.MeshStandardMaterial({ color: 0x2a1a63, flatShading: true }));
  under.rotation.x = Math.PI; under.position.y = -8.2;
  arena.add(top, edge, under);
  scene.add(arena);
  // floating rocks around
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x4a3590, flatShading: true });
  const rocks = [];
  for (let i = 0; i < 14; i++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1 + Math.random() * 2.5, 0), rockMat);
    const a = Math.random() * Math.PI * 2, d = 32 + Math.random() * 30;
    r.position.set(Math.cos(a) * d, -6 + Math.random() * 14, Math.sin(a) * d);
    r.userData.s = 0.2 + Math.random() * 0.5; rocks.push(r); scene.add(r);
  }

  const cam = new THREE.PerspectiveCamera(48, 1, 1, 400);
  function layout() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    cam.aspect = window.innerWidth / window.innerHeight;
    const k = cam.aspect < 1.4 ? 1.35 : 1;
    cam.position.set(0, 33 * k, 37 * k);
    cam.lookAt(0, -1, -4);
    cam.updateProjectionMatrix();
  }
  layout();
  window.addEventListener('resize', layout);

  // ------------------------------------------------------------ fighters
  const used = new Set(humans.map(p => p.slot));
  const free = [0, 1, 2, 3].filter(i => !used.has(i));
  const ents = humans.map(p => ({ p, name: p.name, color: p.color, human: true }));
  let bi = 0;
  while (ents.length < 4) { const s = free.shift(); ents.push({ p: null, name: BOT_NAMES[bi++], color: PCOLORS[s], human: false }); }
  const fs = ents.map((e, i) => {
    const mesh = blobMesh(hexNum(e.color), BR);
    const sh = blobShadow(BR); scene.add(sh);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(BR * 1.25, 0.12, 8, 30), new THREE.MeshBasicMaterial({ color: hexNum(e.color) }));
    ring.rotation.x = Math.PI / 2; scene.add(ring);
    scene.add(mesh);
    return { ...e, mesh, sh, ring, x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, alive: true, wins: 0, dashT: 0, cd: 0, face: 0, hitT: 0, aiT: 0, tx: 0, tz: 0, i };
  });

  // ------------------------------------------------------------ HUD
  const hud = h('div', { class: 'hud' });
  root.append(hud);
  const board = h('div', { style: { position: 'absolute', top: 'calc(10px + var(--sat))', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '14px' } });
  hud.append(board);
  const center = h('div', { class: 'center-msg' });
  const banner = h('div', { class: 'banner', style: { display: 'none' } });
  hud.append(center, banner);
  const pb = btn(null, 'dark round small pausebtn', () => confirmBox('Keluar game?', 'Kembali ke lobby.', 'Keluar', quit), { icon: 'pause' });
  pb.style.pointerEvents = 'auto'; hud.append(pb);
  function drawBoard() {
    board.innerHTML = '';
    for (const f of fs) {
      const pips = h('div', { style: { display: 'flex', gap: '4px', justifyContent: 'center' } },
        [0, 1, 2].map(k => h('div', { style: { width: '14px', height: '14px', borderRadius: '50%', border: '3px solid #0b0720', background: k < f.wins ? '#ffd23f' : 'rgba(255,255,255,.2)' } })));
      const av = avatar(f.color, f.alive ? 'happy' : 'sleep');
      av.style.width = '46px'; av.style.animation = 'none'; av.style.opacity = f.alive ? 1 : 0.4;
      board.append(h('div', { class: 'col', style: { gap: '2px', alignItems: 'center', fontSize: '13px' } }, av, h('div', { style: { textShadow: '0 2px 0 #0b0720' } }, f.name), pips));
    }
  }

  // ------------------------------------------------------------ rounds
  let state = 'intro', t = 0, round = 0, radius = R0, roundT = 0, endTimer = 0;
  const say = (s, ms = 900) => { center.textContent = s; center.classList.remove('pop'); void center.offsetWidth; center.classList.add('pop'); clearTimeout(say.t); say.t = setTimeout(() => (center.textContent = ''), ms); };
  const show = (s, ms = 1600) => { banner.textContent = s; banner.style.display = ''; clearTimeout(show.t); show.t = setTimeout(() => (banner.style.display = 'none'), ms); };
  audio.playMusic('music_sumo');

  function startRound() {
    round++; radius = R0; roundT = 0; state = 'count'; t = 0;
    fs.forEach((f, i) => {
      const a = (i / fs.length) * Math.PI * 2 + Math.PI / 4;
      Object.assign(f, { x: Math.cos(a) * R0 * 0.6, z: Math.sin(a) * R0 * 0.6, y: 0, vx: 0, vz: 0, vy: 0, alive: true, dashT: 0, cd: 0 });
      f.face = Math.atan2(-f.x, -f.z);
      f.mesh.visible = true;
    });
    arena.scale.set(1, 1, 1);
    show(`RONDE ${round}`, 1400);
    drawBoard();
  }
  startRound();

  function control(f, dt) {
    if (f.human) {
      const inp = f.p.input;
      return { x: inp.x || 0, z: inp.y || 0, dash: !!inp.a };
    }
    f.aiT -= dt;
    // pick a target: nearest living opponent, but retreat from the edge first
    const dc = Math.hypot(f.x, f.z);
    if (dc > radius - 3.2) return { x: -f.x / dc, z: -f.z / dc, dash: false };
    let best = null, bd = 1e9;
    for (const o of fs) if (o !== f && o.alive) { const d = Math.hypot(o.x - f.x, o.z - f.z); if (d < bd) { bd = d; best = o; } }
    if (!best) return { x: 0, z: 0, dash: false };
    let dx = best.x - f.x, dz = best.z - f.z;
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    // push the target outward: aim slightly toward the arena centre side of them
    const wob = Math.sin(t * 2 + f.i) * 0.25;
    const dash = bd < 7 && f.cd <= 0 && Math.random() < 0.06;
    return { x: dx + wob * dz, z: dz - wob * dx, dash };
  }

  function step(dt) {
    roundT += dt;
    if (state === 'fight') radius = Math.max(RMIN, R0 - Math.max(0, roundT - 12) * 0.32);
    arena.scale.set(radius / R0, 1, radius / R0);
    for (const f of fs) {
      f.cd = Math.max(0, f.cd - dt); f.dashT = Math.max(0, f.dashT - dt); f.hitT = Math.max(0, f.hitT - dt);
      if (!f.alive) { f.vy -= 40 * dt; f.y += f.vy * dt; f.x += f.vx * dt; f.z += f.vz * dt; continue; }
      const c = state === 'fight' ? control(f, dt) : { x: 0, z: 0, dash: false };
      const m = Math.min(1, Math.hypot(c.x, c.z));
      if (m > 0.08) {
        const acc = f.dashT > 0 ? 10 : 46;
        f.vx += (c.x / (Math.hypot(c.x, c.z) || 1)) * m * acc * dt;
        f.vz += (c.z / (Math.hypot(c.x, c.z) || 1)) * m * acc * dt;
        f.face = Math.atan2(c.x, c.z);
      }
      if (c.dash && f.cd <= 0 && state === 'fight') {
        const dx = Math.sin(f.face), dz = Math.cos(f.face);
        f.vx += dx * 26; f.vz += dz * 26; f.dashT = 0.32; f.cd = 1.1;
        if (f.human) { audio.playVaried('dash'); session.buzz(f.p, 'light'); }
      }
      const damp = Math.pow(f.dashT > 0 ? 0.6 : 0.12, dt);
      f.vx *= damp; f.vz *= damp;
      const sp = Math.hypot(f.vx, f.vz), max = f.dashT > 0 ? 34 : 13;
      if (sp > max) { f.vx *= max / sp; f.vz *= max / sp; }
      f.x += f.vx * dt; f.z += f.vz * dt;
      if (Math.hypot(f.x, f.z) > radius + 0.3) {
        f.alive = false; f.vy = 4;
        audio.play('fall'); if (f.human) session.buzz(f.p, 'error');
        show(`${f.name} jatuh!`, 1200);
        drawBoard();
      }
    }
    // collisions
    for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length; j++) {
      const a = fs[i], b = fs[j];
      if (!a.alive || !b.alive) continue;
      const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
      if (d < BR * 2 && d > 0.001) {
        const nx = dx / d, nz = dz / d, o = (BR * 2 - d) / 2;
        a.x -= nx * o; a.z -= nz * o; b.x += nx * o; b.z += nz * o;
        const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
        if (rv < 0) {
          const ma = a.dashT > 0 ? 2.6 : 1, mb = b.dashT > 0 ? 2.6 : 1;
          const jimp = -(1 + 1.25) * rv / (1 / ma + 1 / mb);
          a.vx -= (jimp / ma) * nx; a.vz -= (jimp / ma) * nz;
          b.vx += (jimp / mb) * nx; b.vz += (jimp / mb) * nz;
          if (-rv > 6) {
            audio.playVaried('hit', { volume: Math.min(1, -rv / 25) });
            [a, b].forEach(f => { f.hitT = 0.25; if (f.human) session.buzz(f.p, -rv > 16 ? 'heavy' : 'medium'); });
            if (-rv > 16) shake = 0.35;
          }
        }
      }
    }
  }

  let shake = 0;
  const stop = loop((dt, now) => {
    t += dt;
    if (state === 'count') {
      const left = Math.ceil(2.4 - t);
      if (left !== step.last && left > 0) { step.last = left; say(String(left), 700); audio.play('count'); }
      if (t >= 2.4) { state = 'fight'; step.last = null; say('DORONG!', 800); audio.play('go'); }
    }
    if (state === 'count' || state === 'fight' || state === 'roundEnd') step(dt);
    if (state === 'fight') {
      const alive = fs.filter(f => f.alive);
      if (alive.length <= 1) {
        state = 'roundEnd'; endTimer = 2.2;
        const w = alive[0];
        if (w) { w.wins++; audio.play('roundwin'); if (w.human) session.buzz(w.p, 'success'); show(`${w.name} menang ronde!`, 2000); }
        else show('Seri!', 1600);
        drawBoard();
      } else if (roundT > 60 && fs.filter(f => f.alive && f.human).length === 0) {
        // only bots left — finish the round quickly by shrinking hard
        radius = Math.max(4, radius - dt * 2);
      }
    } else if (state === 'roundEnd') {
      endTimer -= dt;
      if (endTimer <= 0) {
        const champ = fs.find(f => f.wins >= WIN);
        if (champ) return finish();
        startRound();
      }
    }
    // visuals
    for (const f of fs) {
      f.mesh.visible = f.y > -40;
      f.mesh.position.set(f.x, BR * 0.92 + f.y + Math.abs(Math.sin(now * 9 + f.i)) * Math.min(1, Math.hypot(f.vx, f.vz) / 10) * 0.35, f.z);
      const target = f.face;
      f.mesh.rotation.y += Math.atan2(Math.sin(target - f.mesh.rotation.y), Math.cos(target - f.mesh.rotation.y)) * Math.min(1, dt * 12);
      const sq = f.hitT > 0 ? 1 + f.hitT * 1.2 : 1;
      f.mesh.scale.set(sq, 1 / sq, sq);
      f.sh.position.set(f.x, 0.02, f.z); f.sh.visible = f.alive;
      f.ring.position.set(f.x, 0.06, f.z); f.ring.visible = f.alive && f.human;
      f.mesh.userData.body.material.emissive?.setHex(f.dashT > 0 ? 0x553300 : 0x000000);
    }
    edge.material.emissiveIntensity = 0.5 + Math.sin(now * 4) * 0.3 + (radius < R0 ? 0.4 : 0);
    rocks.forEach((r, i) => { r.rotation.x += r.userData.s * dt; r.rotation.y += r.userData.s * dt * 0.7; r.position.y += Math.sin(now + i) * 0.01; });
    shake = Math.max(0, shake - dt);
    cam.position.x = (Math.random() - 0.5) * shake * 2;
    renderer.render(scene, cam);
  });

  function finish() {
    state = 'done';
    const order = [...fs].sort((a, b) => b.wins - a.wins);
    setTimeout(() => session.finish(order.map(f => ({ p: f.p, name: f.name, color: f.color, label: `${f.wins} ronde menang` })), 'Sumo Bump · siapa paling kuat dorong'), 300);
  }
  function quit() { import('../app.js').then(a => import('../host/host.js').then(hh => a.go(hh.hostScreen))); }
  window.__sumo = { fs, finish };

  return {
    destroy() { stop(); window.removeEventListener('resize', layout); clearTimeout(say.t); clearTimeout(show.t); disposeScene(scene); releaseRenderer(); delete window.__sumo; },
    layoutFor(p) { return humans.includes(p) ? { l: 'sumo' } : { l: 'wait', data: { title: 'Pertandingan berjalan', sub: 'Kamu ikut di ronde berikutnya!' } }; }
  };
}
