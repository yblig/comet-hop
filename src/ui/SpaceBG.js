// Layered space background: gradient sky, nebula clouds and three parallax star fields,
// plus a vignette. Everything is screen-fixed (scrollFactor 0) and scrolled manually so it
// works for an endless vertical world.
import Phaser from 'phaser';

function hex(c) { return '#' + c.toString(16).padStart(6, '0'); }
function mix(a, b, t) {
  const ch = (c, s) => (c >> s) & 255;
  const m = s => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
  return (m(16) << 16) | (m(8) << 8) | m(0);
}

export function gradientKey(scene, top, bottom) {
  const key = `grad_${top}_${bottom}`;
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, 16, 512);
    const ctx = tex.getContext();
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, hex(top)); g.addColorStop(0.55, hex(mix(top, bottom, 0.6))); g.addColorStop(1, hex(bottom));
    ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 512);
    tex.refresh();
  }
  return key;
}

export class SpaceBG {
  constructor(scene, top, bottom, { depth = -100 } = {}) {
    this.scene = scene;
    const { width: W, height: H } = scene.scale;
    this.layer = scene.add.container(0, 0).setDepth(depth).setScrollFactor(0);
    this.grad = scene.add.image(W / 2, H / 2, gradientKey(scene, top, bottom)).setDisplaySize(W, H).setScrollFactor(0);
    this.layer.add(this.grad);
    this.nebulas = [];
    const nk = ['nebula_0', 'nebula_1', 'nebula_2'];
    for (let i = 0; i < 4; i++) {
      const n = scene.add.image(0, 0, nk[i % 3]).setScrollFactor(0).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD);
      n.setScale(1.3 + (i % 2) * 0.4);
      n.baseX = (i % 2 ? 0.8 : 0.2) * W + Phaser.Math.Between(-120, 120);
      n.baseY = i * 900;
      this.nebulas.push(n);
      this.layer.add(n);
    }
    this.stars = [
      { key: 'stars_far', f: 0.08 }, { key: 'stars_mid', f: 0.2 }, { key: 'stars_near', f: 0.4 }
    ].map(s => {
      const t = scene.add.tileSprite(W / 2, H / 2, W, H, s.key).setScrollFactor(0);
      t.f = s.f; this.layer.add(t); return t;
    });
    scene.tweens.add({ targets: this.stars[2], alpha: 0.6, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.vig = scene.add.image(W / 2, H / 2, 'vignette').setDisplaySize(W, H).setScrollFactor(0).setDepth(depth + 50);
    this.drift = 0;
    this.scroll = 0;
  }

  setColors(top, bottom, ms = 1200) {
    const { width: W, height: H } = this.scene.scale;
    const next = this.scene.add.image(W / 2, H / 2, gradientKey(this.scene, top, bottom)).setDisplaySize(W, H).setScrollFactor(0).setAlpha(0);
    this.layer.addAt(next, 1);
    this.scene.tweens.add({
      targets: next, alpha: 1, duration: ms, onComplete: () => {
        this.grad.destroy(); this.grad = next;
      }
    });
  }

  // scrollY: camera scroll in world px (negative as we climb). dt in ms for idle drift.
  update(scrollY, dt) {
    const { width: W, height: H } = this.scene.scale;
    this.drift += dt * 0.012;
    const s = scrollY - this.drift;
    for (const t of this.stars) t.tilePositionY = s * t.f;
    const span = H + 1800;
    for (const n of this.nebulas) {
      const y = Phaser.Math.Wrap(n.baseY - s * 0.14, -900, span - 900);
      n.setPosition(n.baseX, y);
    }
  }

  resize() {
    const { width: W, height: H } = this.scene.scale;
    this.grad.setPosition(W / 2, H / 2).setDisplaySize(W, H);
    this.vig.setPosition(W / 2, H / 2).setDisplaySize(W, H);
    for (const t of this.stars) t.setPosition(W / 2, H / 2).setSize(W, H);
  }
}

// Procedural textures used everywhere (stars, glow dots, vignette). Called from Preload.
export function makeProceduralTextures(scene) {
  const starTex = (key, count, minR, maxR, glow) => {
    const S = 512;
    const tex = scene.textures.createCanvas(key, S, S);
    const ctx = tex.getContext();
    let seed = key.length * 977;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const cols = ['#ffffff', '#cfe9ff', '#ffe8f6', '#fff4c4', '#c9fffb'];
    for (let i = 0; i < count; i++) {
      const x = r() * S, y = r() * S, rad = minR + r() * (maxR - minR);
      const col = cols[Math.floor(r() * cols.length)];
      if (glow) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad * 4);
        g.addColorStop(0, col); g.addColorStop(0.25, col + '88'); g.addColorStop(1, col + '00');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad * 4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 0.5 + r() * 0.5;
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    tex.refresh();
  };
  starTex('stars_far', 140, 0.6, 1.4, false);
  starTex('stars_mid', 45, 1.2, 2.2, true);
  starTex('stars_near', 14, 2, 3.4, true);

  const radial = (key, size, stops) => {
    const tex = scene.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    tex.refresh();
  };
  radial('glow', 128, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]);
  radial('softglow', 256, [[0, 'rgba(255,255,255,0.55)'], [0.5, 'rgba(255,255,255,0.18)'], [1, 'rgba(255,255,255,0)']]);
  radial('dot', 32, [[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,0.9)'], [1, 'rgba(255,255,255,0)']]);
  {
    const S = 512;
    const tex = scene.textures.createCanvas('vignette', S, S);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.75);
    g.addColorStop(0, 'rgba(5,3,20,0)'); g.addColorStop(1, 'rgba(5,3,20,0.6)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    tex.refresh();
  }
  {
    const tex = scene.textures.createCanvas('topshade', 8, 256);
    const ctx = tex.getContext();
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(5,3,20,0.75)'); g.addColorStop(1, 'rgba(5,3,20,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 8, 256);
    tex.refresh();
  }
  // tiny 4-point sparkle for particle bursts
  {
    const tex = scene.textures.createCanvas('spark', 48, 48);
    const ctx = tex.getContext();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(24, 0); ctx.quadraticCurveTo(28, 20, 48, 24); ctx.quadraticCurveTo(28, 28, 24, 48);
    ctx.quadraticCurveTo(20, 28, 0, 24); ctx.quadraticCurveTo(20, 20, 24, 0); ctx.fill();
    tex.refresh();
  }
  // rock chip for asteroid debris
  {
    const tex = scene.textures.createCanvas('chip', 24, 24);
    const ctx = tex.getContext();
    ctx.fillStyle = '#8f80b8'; ctx.strokeStyle = '#140f33'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(4, 8); ctx.lineTo(14, 3); ctx.lineTo(21, 11); ctx.lineTo(16, 21); ctx.lineTo(5, 18); ctx.closePath();
    ctx.fill(); ctx.stroke();
    tex.refresh();
  }
}
