// Shared three.js renderer + helpers for the 3D games.
import * as THREE from 'three';
import { sceneEl } from '../app.js';

let renderer = null;

export function getRenderer() {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
  }
  const el = sceneEl();
  if (renderer.domElement.parentNode !== el) el.append(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  return renderer;
}

export function releaseRenderer() {
  if (!renderer) return;
  renderer.setAnimationLoop(null);
  renderer.setScissorTest(false);
  renderer.clear();
  renderer.domElement.style.display = 'none';
}

// Fixed-step-friendly loop with a dt clamp; returns stop().
export function loop(fn) {
  const r = getRenderer();
  let last = performance.now();
  r.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(window.__dtMax || 0.05, (now - last) / 1000);
    last = now;
    fn(dt, now / 1000);
  });
  return () => r.setAnimationLoop(null);
}

export function disposeScene(scene) {
  scene.traverse(o => {
    o.geometry?.dispose?.();
    const m = o.material;
    (Array.isArray(m) ? m : m ? [m] : []).forEach(x => { x.map?.dispose?.(); x.dispose?.(); });
  });
}

export function canvasTexture(w, hgt, draw, repeat = null) {
  const c = document.createElement('canvas');
  c.width = w; c.height = hgt;
  draw(c.getContext('2d'), w, hgt);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

// Cute low-poly character blob with eyes (used for sumo players and kart drivers).
export function blobMesh(color, radius = 1) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(radius, 28, 20), new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05 }));
  body.scale.set(1, 0.92, 1);
  g.add(body);
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0b0720, roughness: 0.3 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.26, 16, 12), white);
    eye.position.set(s * radius * 0.36, radius * 0.22, radius * 0.8);
    eye.scale.set(1, 1.2, 0.6);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.13, 12, 10), black);
    pupil.position.set(s * radius * 0.36, radius * 0.2, radius * 0.95);
    g.add(eye, pupil);
  }
  const cheek = new THREE.MeshBasicMaterial({ color: 0xff4f8b, transparent: true, opacity: 0.45 });
  for (const s of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.14, 12), cheek);
    c.position.set(s * radius * 0.62, -radius * 0.08, radius * 0.78);
    c.lookAt(s * radius * 2, -radius * 0.1, radius * 3);
    g.add(c);
  }
  g.userData.body = body;
  return g;
}

export function blobShadow(radius) {
  const tex = canvasTexture(64, 64, (ctx) => {
    const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, 64, 64);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2.6, radius * 2.6), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

export function hexNum(hex) { return parseInt(hex.replace('#', ''), 16); }
