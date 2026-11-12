// Turbo Kart 3D — split-screen arcade racing. 1–4 humans, bots fill the grid to 4.
import * as THREE from 'three';
import { getRenderer, releaseRenderer, loop, disposeScene, canvasTexture, blobMesh, blobShadow, hexNum } from './three-common.js';
import { h, PCOLORS, btn } from '../ui/dom.js';
import { audio } from '../lib/audio.js';
import { isLite } from '../lite.js';
import { nav } from '../input/nav.js';

const S = 1.45, W = 17, N = 900, LAPS = 3;
const PTS = [[0, 0], [80, -6], [150, 10], [190, 60], [180, 120], [130, 150], [80, 132], [50, 92], [0, 88], [-50, 120], [-110, 122], [-152, 80], [-142, 22], [-80, -10]];
const BOT_NAMES = ['Bot Kilat', 'Bot Turbo', 'Bot Santai', 'Bot Ngebut'];
const MAX_V = 44, ACCEL = 26, BRAKE = 46, REV_MAX = -12;

export function createKart(session, root, humans) {
  const renderer = getRenderer();
  const scene = new THREE.Scene();
  const sky = 0x8fd8ff;
  scene.background = new THREE.Color(sky);
  scene.fog = new THREE.Fog(sky, 170, 560);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x4c7a3a, 1.25));
  const sun = new THREE.DirectionalLight(0xfff2d6, 1.6);
  sun.position.set(-120, 200, 80);
  scene.add(sun);

  // ------------------------------------------------------------ track samples
  const curve = new THREE.CatmullRomCurve3(PTS.map(p => new THREE.Vector3(p[0] * S, 0, p[1] * S)), true, 'catmullrom', 0.5);
  const P = curve.getSpacedPoints(N);
  P.pop();
  const T = [], Nm = [];
  for (let i = 0; i < N; i++) {
    const a = P[(i + N - 1) % N], b = P[(i + 1) % N];
    const t = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
    T.push(t); Nm.push(new THREE.Vector3(-t.z, 0, t.x));
  }
  const len = curve.getLength();

  // road ribbon
  function ribbon(off0, off1, y, mat, vScale) {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const k = i % N, p = P[k], n = Nm[k];
      pos.push(p.x + n.x * off0, y, p.z + n.z * off0, p.x + n.x * off1, y, p.z + n.z * off1);
      const v = (i / N) * len / vScale;
      uv.push(0, v, 1, v);
      if (i < N) { const j = i * 2; idx.push(j, j + 2, j + 1, j + 1, j + 2, j + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    scene.add(m);
    return m;
  }
  const asphalt = canvasTexture(128, 256, (c, w, hh) => {
    c.fillStyle = '#4b4a5c'; c.fillRect(0, 0, w, hh);
    for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},${Math.random() * .08})`; c.fillRect(Math.random() * w, Math.random() * hh, 2, 2); }
    c.fillStyle = '#fff'; c.fillRect(w / 2 - 3, 0, 6, hh * 0.5);
  });
  asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping;
  ribbon(W / 2, -W / 2, 0.03, new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.9 }), 14);
  const curbTex = canvasTexture(32, 64, (c, w, hh) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, hh); c.fillStyle = '#ff3d5a'; c.fillRect(0, 0, w, hh / 2); });
  curbTex.wrapS = curbTex.wrapT = THREE.RepeatWrapping;
  const curbMat = new THREE.MeshStandardMaterial({ map: curbTex, roughness: 0.7 });
  ribbon(W / 2 + 1.8, W / 2, 0.05, curbMat, 4);
  ribbon(-W / 2, -W / 2 - 1.8, 0.05, curbMat, 4);
  // low fence walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  for (const side of [1, -1]) {
    const off = side * (W / 2 + 7.5);
    const pos = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const k = i % N, p = P[k], n = Nm[k];
      pos.push(p.x + n.x * off, 0, p.z + n.z * off, p.x + n.x * off, 1.2, p.z + n.z * off);
      if (i < N) { const j = i * 2; idx.push(j, j + 2, j + 1, j + 1, j + 2, j + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: side > 0 ? 0x3ab0ff : 0xff4d6d, side: THREE.DoubleSide, roughness: 0.5 }));
    scene.add(m);
  }
  void wallMat;

  // ground
  const grass = canvasTexture(128, 128, (c, w, hh) => {
    c.fillStyle = '#5fd06b'; c.fillRect(0, 0, w, hh);
    for (let i = 0; i < 500; i++) { c.fillStyle = Math.random() < .5 ? 'rgba(40,140,60,.35)' : 'rgba(170,255,150,.25)'; c.fillRect(Math.random() * w, Math.random() * hh, 3, 3); }
  }, [90, 90]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshStandardMaterial({ map: grass, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // start line + arch
  const check = canvasTexture(128, 32, (c, w, hh) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { c.fillStyle = (x + y) % 2 ? '#111' : '#fff'; c.fillRect(x * 8, y * 8, 8, 8); } });
  const line = new THREE.Mesh(new THREE.PlaneGeometry(W, 3), new THREE.MeshStandardMaterial({ map: check }));
  line.rotation.x = -Math.PI / 2;
  line.position.set(P[0].x, 0.06, P[0].z);
  line.rotation.z = Math.atan2(T[0].x, T[0].z);
  scene.add(line);
  const arch = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2068 });
  for (const s of [-1, 1]) { const pole = new THREE.Mesh(new THREE.BoxGeometry(1.2, 9, 1.2), poleMat); pole.position.set(s * (W / 2 + 2), 4.5, 0); arch.add(pole); }
  const bannerTex = canvasTexture(512, 96, (c, w, hh) => {
    const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#ff3d8b'); g.addColorStop(1, '#8a5cff');
    c.fillStyle = g; c.fillRect(0, 0, w, hh);
    c.font = '900 64px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 10; c.strokeStyle = '#0b0720';
    c.strokeText('MABAR GP', w / 2, hh / 2 + 4); c.fillStyle = '#fff'; c.fillText('MABAR GP', w / 2, hh / 2 + 4);
  });
  const banner = new THREE.Mesh(new THREE.BoxGeometry(W + 6, 2.6, 0.8), [poleMat, poleMat, poleMat, poleMat, new THREE.MeshBasicMaterial({ map: bannerTex }), new THREE.MeshBasicMaterial({ map: bannerTex })]);
  banner.position.y = 9; arch.add(banner);
  arch.position.copy(P[0]); arch.rotation.y = Math.atan2(T[0].x, T[0].z);
  scene.add(arch);

  // boost pads
  const padTex = canvasTexture(64, 128, (c, w, hh) => {
    c.fillStyle = '#ff9d00'; c.fillRect(0, 0, w, hh);
    c.fillStyle = '#ffe680';
    for (let k = 0; k < 3; k++) { const y = 10 + k * 40; c.beginPath(); c.moveTo(8, y + 28); c.lineTo(32, y + 6); c.lineTo(56, y + 28); c.lineTo(56, y + 40); c.lineTo(32, y + 18); c.lineTo(8, y + 40); c.fill(); }
  });
  const pads = [0.14, 0.36, 0.6, 0.83].map((f, i) => {
    const k = Math.floor(f * N), lat = [-3.5, 3.5, 0, -2.5][i];
    const m = new THREE.Mesh(new THREE.PlaneGeometry(5, 9), new THREE.MeshBasicMaterial({ map: padTex }));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = Math.atan2(T[k].x, T[k].z) + Math.PI;
    m.position.set(P[k].x + Nm[k].x * lat, 0.07, P[k].z + Nm[k].z * lat);
    scene.add(m);
    return { k, lat, m };
  });

  // scenery: instanced trees, far mountains, clouds
  const near = (x, z, min) => { for (let i = 0; i < N; i += 6) { const dx = P[i].x - x, dz = P[i].z - z; if (dx * dx + dz * dz < min * min) return true; } return false; };
  const treeSpots = [];
  for (let tries = 0; tries < 1400 && treeSpots.length < (isLite() ? 70 : 170); tries++) {
    const x = THREE.MathUtils.randFloat(-330, 360), z = THREE.MathUtils.randFloat(-140, 340);
    if (!near(x, z, W / 2 + 12)) treeSpots.push([x, z, THREE.MathUtils.randFloat(0.8, 1.5)]);
  }
  const leaf = new THREE.InstancedMesh(new THREE.ConeGeometry(3.2, 8, 7), new THREE.MeshStandardMaterial({ color: 0x2fa85a, flatShading: true }), treeSpots.length);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.7, 2.6, 6), new THREE.MeshStandardMaterial({ color: 0x8a5a3c }), treeSpots.length);
  const mtx = new THREE.Matrix4();
  treeSpots.forEach(([x, z, s], i) => {
    mtx.compose(new THREE.Vector3(x, 6 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); leaf.setMatrixAt(i, mtx);
    mtx.compose(new THREE.Vector3(x, 1.3 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); trunk.setMatrixAt(i, mtx);
  });
  scene.add(leaf, trunk);
  const mountMat = new THREE.MeshStandardMaterial({ color: 0x7a8fd6, flatShading: true });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2, r = 470 + Math.random() * 60, hgt = 70 + Math.random() * 80;
    const m = new THREE.Mesh(new THREE.ConeGeometry(hgt * 0.9, hgt, 6), mountMat);
    m.position.set(40 + Math.cos(a) * r, hgt / 2 - 2, 90 + Math.sin(a) * r);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(hgt * 0.27, hgt * 0.3, 6), snowMat);
    cap.position.y = hgt * 0.36; m.add(cap);
    scene.add(m);
  }
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xc8d4f0, emissiveIntensity: 0.7, roughness: 1, flatShading: true });
  for (let i = 0; i < (isLite() ? 5 : 14); i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(8 + Math.random() * 6, 0), cloudMat); s.position.set(k * 9 - 13, Math.random() * 4, Math.random() * 6); c.add(s); }
    c.position.set(THREE.MathUtils.randFloat(-350, 400), THREE.MathUtils.randFloat(70, 110), THREE.MathUtils.randFloat(-200, 380));
    scene.add(c);
  }

  // ------------------------------------------------------------ karts
  const used = new Set(humans.map(p => p.slot));
  const free = [0, 1, 2, 3].filter(i => !used.has(i));
  const entrants = humans.map(p => ({ p, name: p.name, color: p.color, human: true }));
  let bi = 0;
  while (entrants.length < 4) { const slot = free.shift(); entrants.push({ p: null, name: BOT_NAMES[bi++], color: PCOLORS[slot], human: false }); }

  const karts = entrants.map((e, i) => {
    const mesh = kartMesh(e.color);
    scene.add(mesh);
    const label = nameSprite(e.name, e.color);
    label.position.y = 4.2; mesh.add(label);
    // grid: 2 columns behind the line
    const row = Math.floor(i / 2), col = i % 2;
    const k0 = (N - 12 - row * 14) % N;
    const lat = col ? -3.6 : 3.6;
    const p = P[k0];
    return {
      ...e, mesh, label, x: p.x + Nm[k0].x * lat, z: p.z + Nm[k0].z * lat, a: Math.atan2(T[k0].x, T[k0].z), v: 0, idx: k0, lap: 0, half: false,
      prevIdx: k0, boostT: 0, finished: false, finishT: 0, lane: (Math.random() - 0.5) * 6, skill: 0.9 + Math.random() * 0.07, bumpT: 0, wobble: 0
    };
  });
  // lap 0 starts behind the line: crossing it the first time makes lap 1
  karts.forEach(k => { k.lap = 0; k.half = true; });

  // ------------------------------------------------------------ cameras / viewports / HUD
  const hud = h('div', { class: 'hud' });
  root.append(hud);
  const humanKarts = karts.filter(k => k.human);
  const vps = humanKarts.map(k => {
    const cam = new THREE.PerspectiveCamera(68, 1, 0.5, 900);
    const el = h('div', { class: 'vp-label' });
    const pos = h('div', { class: 'vp-pos' });
    const lap = h('div', { class: 'vp-lap' });
    const name = h('div', { class: 'vp-name', style: { background: k.color } }, k.name);
    const msg = h('div', { class: 'vp-msg', style: { position: 'absolute', left: '50%', top: '40%', transform: 'translate(-50%,-50%)', font: '800 clamp(24px,8vh,56px) var(--title)', textShadow: '0 4px 0 #0b0720', whiteSpace: 'nowrap', color: '#fff' } });
    el.append(name, pos, lap);
    const box = h('div', { style: { position: 'absolute', overflow: 'hidden' } }, el, msg);
    hud.append(box);
    return { k, cam, box, pos, lap, msg, rect: null };
  });
  const overview = null;
  const quad4 = vps.length === 3 ? h('div', { style: { position: 'absolute', background: 'radial-gradient(circle at 50% 40%, #2b1c66, #120c2c)' } }) : null;
  if (quad4) root.querySelector('.hud')?.append(quad4);
  const mini = h('canvas', { class: 'minimap' });
  hud.append(mini);
  const center = h('div', { class: 'center-msg' });
  hud.append(center);
  const pauseBtn = btn(null, 'dark round small pausebtn', () => session.game && root.dispatchEvent(new Event('askquit')), { icon: 'pause', sound: 'tap' });
  pauseBtn.style.pointerEvents = 'auto';
  hud.append(pauseBtn);
  const lines = h('div');
  hud.append(lines);

  function layout() {
    const Wd = window.innerWidth, Hd = window.innerHeight;
    renderer.setSize(Wd, Hd, false);
    const n = vps.length;
    const rects = n === 1 ? [[0, 0, Wd, Hd]] : n === 2 ? [[0, 0, Wd / 2, Hd], [Wd / 2, 0, Wd / 2, Hd]]
      : [[0, 0, Wd / 2, Hd / 2], [Wd / 2, 0, Wd / 2, Hd / 2], [0, Hd / 2, Wd / 2, Hd / 2], [Wd / 2, Hd / 2, Wd / 2, Hd / 2]];
    vps.forEach((v, i) => {
      v.rect = rects[i];
      const [x, y, w, hh] = v.rect;
      Object.assign(v.box.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: hh + 'px' });
      v.cam.aspect = w / hh; v.cam.fov = w / hh < 1 ? 78 : 66; v.cam.updateProjectionMatrix();
    });
    lines.innerHTML = '';
    if (n >= 2) lines.append(h('div', { class: 'split-line', style: { left: Wd / 2 - 3 + 'px', top: 0, width: '6px', height: Hd + 'px' } }));
    if (n >= 3) lines.append(h('div', { class: 'split-line', style: { left: 0, top: Hd / 2 - 3 + 'px', width: Wd + 'px', height: '6px' } }));
    // minimap placement
    const ms = Math.round(Math.min(Wd, Hd) * (n === 1 ? 0.3 : 0.24));
    mini.width = ms * 2; mini.height = ms * 2;
    Object.assign(mini.style, { width: ms + 'px', height: ms + 'px' });
    if (n === 1) Object.assign(mini.style, { left: 'calc(12px + var(--sal))', top: 'auto', bottom: '12px', transform: 'none' });
    else if (n === 2) Object.assign(mini.style, { left: '50%', top: 'auto', bottom: '10px', transform: 'translateX(-50%)' });
    else if (n === 3) {
      const qs = Math.round(Math.min(Wd / 2, Hd / 2) * 0.9);
      mini.width = qs * 2; mini.height = qs * 2;
      Object.assign(mini.style, { width: qs + 'px', height: qs + 'px', left: (Wd * 0.75 - qs / 2) + 'px', top: (Hd * 0.75 - qs / 2) + 'px', bottom: 'auto', transform: 'none' });
      Object.assign(quad4.style, { left: Wd / 2 + 'px', top: Hd / 2 + 'px', width: Wd / 2 + 'px', height: Hd / 2 + 'px' });
    }
    else Object.assign(mini.style, { left: '50%', top: '50%', bottom: 'auto', transform: 'translate(-50%,-50%)' });
    if (overview) {
      const [ , , w, hh] = rects[3];
      const ext = 330 * S / 1.45, asp = w / hh;
      overview.left = -ext * asp / 2 * 1.1; overview.right = ext * asp / 2 * 1.1; overview.top = ext / 2 * 1.1; overview.bottom = -ext / 2 * 1.1;
      overview.position.set(20 * S, 400, 70 * S); overview.up.set(0, 0, -1); overview.lookAt(20 * S, 0, 70 * S); overview.updateProjectionMatrix();
    }
  }
  layout();
  window.addEventListener('resize', layout);

  // minimap geometry
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  P.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); });
  function drawMini() {
    if (mini.style.display === 'none') return;
    const c = mini.getContext('2d'), s = mini.width;
    const sc = (s * 0.84) / Math.max(maxX - minX, maxZ - minZ);
    const ox = s / 2 - ((minX + maxX) / 2) * sc, oz = s / 2 - ((minZ + maxZ) / 2) * sc;
    c.clearRect(0, 0, s, s);
    c.fillStyle = 'rgba(11,7,32,.55)'; c.beginPath(); c.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2); c.fill();
    c.lineJoin = 'round';
    c.strokeStyle = '#0b0720'; c.lineWidth = s * 0.07; c.beginPath();
    P.forEach((p, i) => (i ? c.lineTo : c.moveTo).call(c, ox + p.x * sc, oz + p.z * sc)); c.closePath(); c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = s * 0.035; c.stroke();
    for (const k of [...karts].reverse()) {
      c.fillStyle = k.color; c.strokeStyle = '#0b0720'; c.lineWidth = s * 0.012;
      c.beginPath(); c.arc(ox + k.x * sc, oz + k.z * sc, s * (k.human ? 0.045 : 0.032), 0, Math.PI * 2); c.fill(); c.stroke();
    }
  }

  // ------------------------------------------------------------ race state
  let state = 'count', t = 0, raceT = 0, endT = null, lastCount = 4, finishOrder = 0;
  const say = (txt, ms = 900) => {
    center.textContent = txt; center.classList.remove('pop'); void center.offsetWidth; center.classList.add('pop');
    clearTimeout(say.t); say.t = setTimeout(() => (center.textContent = ''), ms);
  };
  audio.playMusic('music_kart');

  const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
  const tmp = new THREE.Vector3(), look = new THREE.Vector3();

  function nearestIdx(k) {
    let best = k.idx, bd = 1e9;
    for (let o = -30; o <= 45; o++) {
      const i = (k.idx + o + N) % N, p = P[i];
      const d = (p.x - k.x) ** 2 + (p.z - k.z) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  function control(k) {
    if (k.human && !k.finished) {
      const inp = k.p.input;
      let steer = inp.steer || 0;
      if (!steer) steer = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
      return { steer, gas: !!inp.gas, brake: !!inp.brake };
    }
    // AI (bots, and humans after they finish)
    const look = (k.idx + 20 + Math.floor(Math.max(0, k.v) / 3)) % N;
    const lane = k.lane + Math.sin(raceT * 0.4 + k.skill * 20) * 2;
    const tx = P[look].x + Nm[look].x * lane, tz = P[look].z + Nm[look].z * lane;
    const want = Math.atan2(tx - k.x, tz - k.z);
    const diff = wrapA(want - k.a);
    return { steer: Math.max(-1, Math.min(1, -diff * 2.6)), gas: true, brake: Math.abs(diff) > 0.55 && k.v > 26 };
  }

  function stepKart(k, dt) {
    const c = state === 'race' ? control(k) : { steer: 0, gas: false, brake: false };
    let max = MAX_V;
    if (!k.human || k.finished) {
      const lead = Math.max(...karts.filter(q => q.human).map(q => q.lap * N + q.idx));
      const me = k.lap * N + k.idx;
      max *= k.skill * (me > lead + N * 0.25 ? 0.86 : me < lead - N * 0.15 ? 1.06 : 1);
    }
    k.boostT = Math.max(0, k.boostT - dt);
    if (k.boostT > 0) max *= 1.45;
    const lat = (k.x - P[k.idx].x) * Nm[k.idx].x + (k.z - P[k.idx].z) * Nm[k.idx].z;
    const off = Math.abs(lat) > W / 2 + 1.8;
    if (off) max *= 0.55;
    if (c.gas) k.v += ACCEL * (k.boostT > 0 ? 1.8 : 1) * dt;
    if (c.brake) k.v -= (k.v > 0 ? BRAKE : 14) * dt;
    if (!c.gas && !c.brake) k.v *= Math.pow(0.55, dt);
    if (k.v > max) k.v = Math.max(max, k.v - 60 * dt);
    k.v = Math.max(REV_MAX, k.v);
    const grip = Math.min(1, Math.abs(k.v) / 10) * (k.v >= 0 ? 1 : -1);
    const turn = (2.25 - Math.min(0.6, Math.abs(k.v) / 90)) * grip;
    k.a -= c.steer * turn * dt;
    k.x += Math.sin(k.a) * k.v * dt; k.z += Math.cos(k.a) * k.v * dt;
    k.prevIdx = k.idx; k.idx = nearestIdx(k);
    // walls
    const lat2 = (k.x - P[k.idx].x) * Nm[k.idx].x + (k.z - P[k.idx].z) * Nm[k.idx].z;
    const lim = W / 2 + 6.6;
    if (Math.abs(lat2) > lim) {
      const push = lat2 - Math.sign(lat2) * lim;
      k.x -= Nm[k.idx].x * push; k.z -= Nm[k.idx].z * push;
      if (Math.abs(k.v) > 12) bump(k, 0.7);
      k.v *= 0.72;
      const ta = Math.atan2(T[k.idx].x, T[k.idx].z);
      k.a += wrapA((k.v >= 0 ? ta : ta + Math.PI) - k.a) * 0.25;
    }
    // boost pads
    for (const pd of pads) {
      const di = Math.abs(((k.idx - pd.k + N + N / 2) % N) - N / 2);
      if (di < 5 && Math.abs(lat2 - pd.lat) < 3 && k.boostT < 0.9) {
        k.boostT = 1.4; k.v = Math.max(k.v, MAX_V);
        if (k.human) { audio.play('boost', { volume: 0.8 }); session.buzz(k.p, 'medium'); }
      }
    }
    // lap logic
    if (k.idx > N * 0.45 && k.idx < N * 0.55) k.half = true;
    if (k.prevIdx > N * 0.85 && k.idx < N * 0.15) {
      if (k.half) { k.half = false; k.lap++; onLap(k); }
    } else if (k.prevIdx < N * 0.15 && k.idx > N * 0.85) { k.lap--; k.half = true; }
  }

  function bump(k, f) {
    if (k.bumpT > 0) return;
    k.bumpT = 0.35; k.wobble = 1;
    if (k.human) { audio.playVaried('bump', { volume: 0.5 + f * 0.5 }); session.buzz(k.p, 'heavy'); }
  }

  function onLap(k) {
    if (k.lap > LAPS && !k.finished) {
      k.finished = true; k.finishT = raceT; k.place = ++finishOrder;
      if (k.human) {
        audio.play('finish'); session.buzz(k.p, 'success');
        const v = vps.find(q => q.k === k);
        if (v) v.msg.textContent = `FINISH! #${k.place}`;
        if (endT == null) endT = raceT + 20;
      }
    } else if (k.human && k.lap >= 1 && k.lap <= LAPS) {
      const v = vps.find(q => q.k === k);
      if (k.lap > 1) {
        audio.play('lap');
        if (v) { v.msg.textContent = k.lap === LAPS ? 'LAP TERAKHIR!' : `LAP ${k.lap}`; setTimeout(() => { if (!k.finished) v.msg.textContent = ''; }, 1400); }
      }
    }
  }

  function collide() {
    for (let i = 0; i < karts.length; i++) for (let j = i + 1; j < karts.length; j++) {
      const a = karts[i], b = karts[j];
      const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
      if (d < 2.8 && d > 0.001) {
        const o = (2.8 - d) / 2, nx = dx / d, nz = dz / d;
        a.x -= nx * o; a.z -= nz * o; b.x += nx * o; b.z += nz * o;
        const rel = Math.abs(a.v - b.v);
        if (rel > 6) { bump(a, 0.5); bump(b, 0.5); }
        const av = a.v; a.v = a.v * 0.9 + b.v * 0.06; b.v = b.v * 0.9 + av * 0.06;
      }
    }
  }

  function ranking() {
    return [...karts].sort((a, b) => {
      if (a.finished && b.finished) return a.place - b.place;
      if (a.finished) return -1; if (b.finished) return 1;
      return (b.lap * N + b.idx) - (a.lap * N + a.idx);
    });
  }

  const stop = loop(dt => {
    t += dt;
    if (state === 'count') {
      const left = Math.ceil(3.2 - t);
      if (left !== lastCount && left > 0 && left <= 3) { lastCount = left; say(String(left), 800); audio.play('count'); }
      if (t >= 3.2) { state = 'race'; say('GO!', 900); audio.play('go'); humans.forEach(p => session.buzz(p, 'medium')); }
    } else if (state === 'race') {
      raceT += dt;
      for (const k of karts) k.bumpT = Math.max(0, k.bumpT - dt);
      const allHumansDone = karts.filter(k => k.human).every(k => k.finished);
      if (allHumansDone && endT != null) endT = Math.min(endT, raceT + 2.5);
      if (endT != null && raceT >= endT) return finish();
    }
    for (const k of karts) stepKart(k, dt);
    collide();

    const order = ranking();
    for (const k of karts) {
      k.mesh.position.set(k.x, 0, k.z);
      k.mesh.rotation.y = k.a;
      k.wobble = Math.max(0, k.wobble - dt * 3);
      k.mesh.rotation.z = Math.sin(t * 40) * 0.06 * k.wobble;
      const spin = k.v * dt / 0.45;
      k.mesh.userData.wheels.forEach(w => (w.rotation.x += spin));
      k.mesh.userData.flame.visible = k.boostT > 0;
      k.mesh.userData.flame.scale.setScalar(0.8 + Math.random() * 0.5);
      k.mesh.userData.driver.rotation.y = -(k.human ? (k.p.input.steer || ((k.p.input.r ? 1 : 0) - (k.p.input.l ? 1 : 0))) : 0) * 0.3;
    }
    // render each viewport
    const Hd = window.innerHeight;
    renderer.setScissorTest(true);
    for (const v of vps) {
      const k = v.k;
      const fx = Math.sin(k.a), fz = Math.cos(k.a);
      const back = 8.5 + Math.max(0, k.v) * 0.04;
      tmp.set(k.x - fx * back, 4.2, k.z - fz * back);
      if (!v.init) { v.cam.position.copy(tmp); v.init = true; }
      v.cam.position.lerp(tmp, 1 - Math.exp(-dt * 7));
      look.set(k.x + fx * 6, 1.2, k.z + fz * 6);
      v.cam.lookAt(look);
      const [x, y, w, hh] = v.rect;
      renderer.setViewport(x, Hd - y - hh, w, hh); renderer.setScissor(x, Hd - y - hh, w, hh);
      karts.forEach(q => (q.label.visible = q !== k));
      renderer.render(scene, v.cam);
      const place = order.indexOf(k) + 1;
      v.pos.innerHTML = `${place}<sup>${['', 'st', 'nd', 'rd', 'th'][place]}</sup>`;
      v.pos.style.color = place === 1 ? '#ffd23f' : '#fff';
      v.lap.textContent = k.finished ? 'Selesai!' : `Lap ${Math.max(1, Math.min(LAPS, k.lap))}/${LAPS}`;
    }
    if (overview) {
      const Wd = window.innerWidth;
      const x = Wd / 2, w = Wd / 2, hh = Hd / 2;
      karts.forEach(q => (q.label.visible = true));
      renderer.setViewport(x, 0, w, hh); renderer.setScissor(x, 0, w, hh);
      renderer.render(scene, overview);
    }
    renderer.setScissorTest(false);
    drawMini();
  });

  function finish() {
    if (state === 'done') return;
    state = 'done';
    const order = ranking();
    const fmt = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
    setTimeout(() => session.finish(order.map(k => ({ p: k.p, name: k.name, color: k.color, label: k.finished ? fmt(k.finishT) : 'belum finish' })), 'Turbo Kart 3D · ' + LAPS + ' lap'), 400);
  }

  root.addEventListener('askquit', () => {
    import('../ui/dom.js').then(m => m.confirmBox('Keluar balapan?', 'Kembali ke lobby.', 'Keluar', () => import('../app.js').then(a => import('../host/host.js').then(hh => a.go(hh.hostScreen)))));
  });

  // debug hooks for the preview script
  window.__kart = { karts, finish, setState: s => (state = s), get t() { return t; }, get state() { return state; } };

  return {
    destroy() {
      stop(); window.removeEventListener('resize', layout);
      clearTimeout(say.t);
      disposeScene(scene); releaseRenderer();
      delete window.__kart;
    },
    layoutFor(p) { return humans.includes(p) ? { l: 'kart' } : { l: 'wait', data: { title: 'Balapan sedang berjalan', sub: 'Kamu ikut di ronde berikutnya!' } }; }
  };
}

function kartMesh(color) {
  const g = new THREE.Group();
  const col = hexNum(color);
  const paint = new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c1830, roughness: 0.7 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.25, metalness: 0.7 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.55, 3.5), paint); body.position.y = 0.75; g.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.4, 1.2), paint); nose.position.set(0, 0.7, 2.1); g.add(nose);
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 0.35), dark); bumper.position.set(0, 0.55, 2.75); g.add(bumper);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 0.35), dark); seat.position.set(0, 1.35, -0.9); g.add(seat);
  const spoilerPost = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), dark); spoilerPost.position.set(0, 1.25, -1.6); g.add(spoilerPost);
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.12, 0.7), paint); spoiler.position.set(0, 1.65, -1.65); g.add(spoiler);
  const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.45, 14);
  const wheels = [];
  for (const [x, z] of [[-1.25, 1.25], [1.25, 1.25], [-1.25, -1.15], [1.25, -1.15]]) {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(wheelGeo, dark); tire.rotation.z = Math.PI / 2; w.add(tire);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.48, 8), chrome); hub.rotation.z = Math.PI / 2; w.add(hub);
    w.position.set(x, 0.48, z); g.add(w); wheels.push(w);
  }
  const driver = blobMesh(col, 0.62);
  driver.position.set(0, 1.55, -0.35);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.66, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
  helmet.position.y = 0.06; driver.add(helmet);
  g.add(driver);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 8), new THREE.MeshBasicMaterial({ color: 0xffa21f, transparent: true, opacity: 0.9 }));
  flame.rotation.x = -Math.PI / 2; flame.position.set(0, 0.8, -2.2); flame.visible = false; g.add(flame);
  const sh = blobShadow(1.8); sh.position.y = 0.05; sh.scale.set(1, 1.5, 1); g.add(sh);
  g.userData = { wheels, driver, flame };
  return g;
}

function nameSprite(name, color) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const x = c.getContext('2d');
  x.font = '800 34px Arial';
  const w = Math.min(244, x.measureText(name).width + 34);
  x.fillStyle = '#0b0720'; roundRect(x, (256 - w) / 2 - 3, 5, w + 6, 54, 27); x.fill();
  x.fillStyle = color; roundRect(x, (256 - w) / 2, 8, w, 48, 24); x.fill();
  x.fillStyle = '#0b0720'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name, 128, 34);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(4.4, 1.1, 1);
  s.renderOrder = 10;
  return s;
}
function roundRect(x, a, b, w, hh, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + hh, r); x.arcTo(a + w, b + hh, a, b + hh, r); x.arcTo(a, b + hh, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
