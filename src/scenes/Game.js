import Phaser from 'phaser';
import { audio } from '../lib/audio.js';
import { haptics } from '../lib/haptics.js';
import { native } from '../lib/native.js';
import { save } from '../state.js';
import { txt, HEX, C, fmt, gradientFill } from '../theme.js';
import { iconButton, floatText } from '../ui/widgets.js';
import { SpaceBG } from '../ui/SpaceBG.js';
import Planet from '../objects/Planet.js';
import {
  DESIGN_W, COMET_R, PERFECT_RATIO, MAX_MULT, POINTS_HOP, POINTS_DUST, DUST_PICK_R, MAGNET_R, MAGNET_TIME,
  CAMERA_ANCHOR, diff, sectorFor, skinById
} from '../config.js';

const rand = Phaser.Math.FloatBetween;
const BH_HORIZON = 64, BH_REACH = 400, BH_G = 2.4e7;

export default class Game extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    const { width: W, height: H } = this.scale;
    this.cameras.main.fadeIn(300, 5, 3, 26);
    this._leaving = false;
    this.offX = (W - DESIGN_W) / 2;

    // run state
    this.score = 0; this.hops = 0; this.combo = 0; this.perfects = 0; this.runDust = 0;
    this.maxIndex = 0; this.state = 'start'; this.usedContinue = false;
    this.shield = false; this.magnetUntil = 0; this.flightTime = 0;
    this.sector = sectorFor(0);
    this.planets = []; this.asteroids = []; this.holes = []; this.dust = []; this.powerups = [];
    this.nextIndex = 0; this.simTime = 0; this.dtCap = 100;

    this.bg = new SpaceBG(this, this.sector.top, this.sector.bottom);

    // world
    const p0 = this.addPlanet(W / 2, H * CAMERA_ANCHOR, 92, { index: 0, variant: 2 });
    this.nextIndex = 1;
    this.generate();

    // comet
    this.skin = skinById(save.skin);
    this.comet = { x: 0, y: 0, vx: 0, vy: 0, theta: -Math.PI / 2, dir: 1, planet: p0, omega: 0, last: null, r: 0 };
    this.trail = this.add.particles(0, 0, 'glow', {
      lifespan: 460, frequency: 14, quantity: 1, scale: { start: 0.62, end: 0 }, alpha: { start: 0.75, end: 0 },
      blendMode: 'ADD', tint: this.trailTint(), speed: 0
    }).setDepth(28);
    this.sparkles = this.add.particles(0, 0, 'spark', {
      lifespan: 700, frequency: 70, scale: { start: 0.45, end: 0 }, speed: { min: 20, max: 70 }, alpha: { start: 1, end: 0 },
      blendMode: 'ADD', tint: this.trailTint(), rotate: { min: 0, max: 360 }
    }).setDepth(29);
    this.cometImg = this.add.image(0, 0, 'comet_' + this.skin.id).setDepth(30).setDisplaySize(COMET_R * 3.8, COMET_R * 3.8);
    this.cometScale = this.cometImg.scale;
    this.bubble = this.add.image(0, 0, 'shield_bubble').setDepth(31).setDisplaySize(130, 130).setVisible(false);
    this.trail.startFollow(this.cometImg); this.sparkles.startFollow(this.cometImg);
    this.aim = this.add.graphics().setDepth(27);

    // one-shot burst emitters
    this.burst = this.add.particles(0, 0, 'spark', {
      emitting: false, lifespan: 650, speed: { min: 160, max: 520 }, scale: { start: 0.8, end: 0 },
      rotate: { min: 0, max: 360 }, blendMode: 'ADD'
    }).setDepth(40);
    this.boom = this.add.particles(0, 0, 'glow', {
      emitting: false, lifespan: 900, speed: { min: 120, max: 700 }, scale: { start: 1.1, end: 0 },
      alpha: { start: 1, end: 0 }, blendMode: 'ADD', tint: { onEmit: () => Phaser.Utils.Array.GetRandom([0xffd84f, 0xff7a3d, 0xff4fd8, 0xffffff]) }
    }).setDepth(41);
    this.debris = this.add.particles(0, 0, 'chip', {
      emitting: false, lifespan: 900, speed: { min: 140, max: 420 }, scale: { start: 1.6, end: 0.4 },
      rotate: { min: 0, max: 360 }, gravityY: 0, alpha: { start: 1, end: 0 }
    }).setDepth(41);

    this.orbitOn(p0, true);
    this.cameras.main.scrollY = 0;
    this.camTarget = 0;

    this.buildHud();
    this.input.on('pointerdown', (p, over) => { if (!over.length) this.tapLaunch(); });
    this.input.keyboard?.on('keydown-SPACE', () => this.tapLaunch());

    const offBack = native.onBack(() => { this.openPause(); return true; });
    if (!this._bgHooked) { this._bgHooked = true; native.onPause(() => { if (this.scene.isActive()) this.openPause(); }); }
    this.events.once('shutdown', () => { offBack(); this.input.removeAllListeners(); });
    this.scale.on('resize', this.layoutHud, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layoutHud, this));

    audio.playMusic('music_game');
    audio.duckMusic(false);
    window.__debug = this; // used by the preview script
  }

  trailTint() {
    if (!this.skin?.trail) return { onEmit: () => Phaser.Display.Color.HSVToRGB((this.time.now / 1400) % 1, 0.65, 1).color };
    const [a, b] = this.skin.trail;
    return { onEmit: () => (Math.random() < 0.6 ? a : b) };
  }

  // ------------------------------------------------------------------ world generation
  addPlanet(x, y, r, opts) {
    const p = new Planet(this, x, y, r, opts);
    this.planets.push(p);
    return p;
  }

  generate() {
    const top = this.cameras.main.scrollY - 1700;
    let last = this.planets[this.planets.length - 1];
    while (last.y > top) last = this.spawnNext(last);
  }

  spawnNext(prev) {
    const i = this.nextIndex++;
    const d = diff(i);
    const ringed = i > 2 && Math.random() < d.ringed;
    const bodyR = ringed ? rand(66, 84) : rand(d.bodyMin, d.bodyMax);
    const ro = bodyR + 78;
    const minX = this.offX + ro + 24, maxX = this.offX + DESIGN_W - ro - 24;
    let x = rand(minX, maxX);
    for (let k = 0; k < 4 && Math.abs(x - prev.baseX) < 110; k++) x = rand(minX, maxX);

    // hazards in the gap below this planet need vertical room so they never cross an orbit
    const wantRocks = Math.random() < d.asteroids;
    const wantHole = !wantRocks && Math.random() < d.blackhole;
    let gap = d.gapY + rand(-60, 60);
    if (wantRocks) gap = Math.max(gap, prev.ro + ro + 2 * (50 + 26) + 40);
    if (wantHole) gap = Math.max(gap, prev.ro + ro + 2 * (150 + 30));
    let y = prev.y - gap;
    const dist = Math.hypot(x - prev.baseX, y - prev.y);
    if (dist < prev.ro + ro + 90) y -= prev.ro + ro + 90 - dist;

    let moving = null;
    if (!ringed && Math.random() < d.moving) {
      const cx = this.offX + DESIGN_W / 2;
      x = Phaser.Math.Linear(x, cx, 0.5);
      const amp = Math.min(rand(100, 210), x - minX, maxX - x);
      if (amp > 60) moving = { amp, speed: rand(0.55, 1.05), phase: rand(0, Math.PI * 2) };
    }
    const variant = ringed ? Phaser.Math.Between(0, 1) : Phaser.Math.Between(0, 5);
    const p = this.addPlanet(x, y, bodyR, { index: i, ringed, variant, moving });

    // band between the two orbits that is free for hazards
    const bandLo = y + ro, bandHi = prev.y - prev.ro;
    if (wantRocks) {
      this.addAsteroid(bandLo, bandHi);
      if (Math.random() < d.asteroid2) this.addAsteroid(bandLo, bandHi);
    }
    if (wantHole) {
      const hx = rand(this.offX + 170, this.offX + DESIGN_W - 170);
      this.addHole(hx, (bandLo + bandHi) / 2 + rand(-12, 12));
    }
    // stardust: a gentle arc between planets, and a ring around ringed planets
    if (Math.random() < d.dustTrail) {
      const n = Phaser.Math.Between(3, 5), bend = rand(-70, 70);
      const ax = prev.baseX, ay = prev.y, bx = x, by = y;
      const len = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / len, ny = (bx - ax) / len;
      const s0 = prev.ro + 55, s1 = len - ro - 55;
      if (s1 - s0 > 90) {
        for (let k = 0; k < n; k++) {
          const u = k / Math.max(1, n - 1), t = (s0 + (s1 - s0) * u) / len;
          const off = Math.sin(u * Math.PI) * bend;
          this.addDust(ax + (bx - ax) * t + nx * off, ay + (by - ay) * t + ny * off);
        }
      }
    }
    if (ringed) {
      const n = 8;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + 0.3;
        this.addDust(x + Math.cos(a) * ro, y + Math.sin(a) * ro);
      }
    }
    if (!moving && !ringed && Math.random() < d.powerup) {
      const a = rand(0, Math.PI * 2);
      this.addPowerup(x + Math.cos(a) * ro, y + Math.sin(a) * ro, Math.random() < 0.5 ? 'shield' : 'magnet');
    }
    return p;
  }

  addAsteroid(lo, hi) {
    const r = rand(34, 50);
    if (hi - lo < 2 * (r + 26)) return;
    const y = rand(lo + r + 26, hi - r - 26);
    const { width: W } = this.scale;
    const img = this.add.image(rand(0, W), y, 'asteroid_' + Phaser.Math.Between(0, 2)).setDepth(20).setDisplaySize(r * 2.5, r * 2.5);
    const sp = rand(70, 170) * (Math.random() < 0.5 ? -1 : 1) * (1 + Math.min(0.5, this.nextIndex * 0.004));
    this.asteroids.push({ img, x: img.x, y, r, vx: sp, rot: rand(-1.4, 1.4) });
  }

  addHole(x, y) {
    const glow = this.add.image(x, y, 'softglow').setTint(0xff4fd8).setBlendMode(Phaser.BlendModes.ADD).setScale(3.2).setAlpha(0.35).setDepth(18);
    const img = this.add.image(x, y, 'blackhole').setDepth(19).setDisplaySize(280, 280);
    const swirl = this.add.image(x, y, 'blackhole_swirl').setDepth(19).setDisplaySize(250, 250).setBlendMode(Phaser.BlendModes.ADD);
    const pull = this.add.graphics().setDepth(17).setPosition(x, y);
    pull.lineStyle(4, 0xff9be9, 0.18).strokeCircle(0, 0, BH_REACH * 0.62).lineStyle(3, 0xff9be9, 0.1).strokeCircle(0, 0, BH_REACH * 0.9);
    this.tweens.add({ targets: glow, alpha: 0.55, scale: 3.5, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.holes.push({ x, y, img, swirl, glow, pull });
  }

  addDust(x, y) {
    const img = this.add.image(x, y, 'stardust').setDepth(25).setDisplaySize(62, 62);
    this.tweens.add({ targets: img, y: y - 10, duration: 700 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: img, angle: 360, duration: 6000, repeat: -1 });
    this.dust.push({ img, x, y, alive: true });
  }

  addPowerup(x, y, type) {
    const img = this.add.image(x, y, 'pu_' + type).setDepth(26).setDisplaySize(110, 110);
    this.tweens.add({ targets: img, scale: img.scale * 1.12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.powerups.push({ img, x, y, type, alive: true });
  }

  cleanup() {
    const bottom = this.cameras.main.scrollY + this.scale.height + 700;
    const keep = p => p === this.comet.planet || p === this.comet.last;
    this.planets = this.planets.filter(p => { if (p.y - p.ro > bottom && !keep(p)) { p.destroy(); return false; } return true; });
    this.asteroids = this.asteroids.filter(a => { if (a.y - a.r > bottom) { a.img.destroy(); return false; } return true; });
    this.holes = this.holes.filter(h => { if (h.y - 300 > bottom) { [h.img, h.swirl, h.glow, h.pull].forEach(o => o.destroy()); return false; } return true; });
    this.dust = this.dust.filter(s => { if (!s.alive || s.y > bottom) { if (s.alive) s.img.destroy(); return false; } return true; });
    this.powerups = this.powerups.filter(s => { if (!s.alive || s.y > bottom) { if (s.alive) s.img.destroy(); return false; } return true; });
  }

  // ------------------------------------------------------------------ HUD
  buildHud() {
    this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(200);
    const H = this.scale.height;
    this.shade = this.add.image(0, 0, 'topshade').setOrigin(0, 0);
    this.scoreText = txt(this, 0, 0, '0', 120, HEX.text, { stroke: 16 });
    gradientFill(this.scoreText, '#ffffff', '#bfe9ff');
    this.multText = txt(this, 0, 0, '', 52, HEX.yellow, { stroke: 10 }).setAlpha(0);
    this.dustIcon = this.add.image(0, 0, 'stardust').setDisplaySize(70, 70);
    this.dustText = txt(this, 0, 0, fmt(save.dust), 50, HEX.yellow, { ox: 0, stroke: 10 });
    this.bestText = txt(this, 0, 0, 'BEST ' + fmt(save.best), 36, HEX.dim, { stroke: 8 });
    this.pauseBtn = iconButton(this, 0, 0, 'pause', { size: 124, onClick: () => this.openPause() });
    this.shieldIcon = this.add.image(0, 0, 'pu_shield').setDisplaySize(96, 96).setVisible(false);
    this.magnetIcon = this.add.image(0, 0, 'pu_magnet').setDisplaySize(96, 96).setVisible(false);
    this.magnetBar = this.add.graphics();
    this.hint = txt(this, 0, 0, 'TAP TO LAUNCH', 64, HEX.cyan, { stroke: 12 });
    this.hint2 = txt(this, 0, 0, 'Aim beside the next planet for PERFECT', 36, HEX.dim, { stroke: 7 });
    this.tweens.add({ targets: this.hint, scale: 1.08, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.hud.add([this.shade, this.scoreText, this.multText, this.dustIcon, this.dustText, this.bestText, this.pauseBtn,
      this.shieldIcon, this.magnetIcon, this.magnetBar, this.hint, this.hint2]);
    const sf = o => { o.setScrollFactor?.(0); o.list?.forEach(sf); };
    sf(this.hud);
    this.layoutHud();
    this.sectorBanner(true);
    void H;
  }

  layoutHud() {
    const { width: W, height: H } = this.scale;
    const top = Math.max(90, H * 0.05);
    this.shade.setDisplaySize(W, top + 260);
    this.scoreText.setPosition(W / 2, top + 30);
    this.multText.setPosition(W / 2, top + 130);
    this.bestText.setPosition(W / 2, top - 46);
    this.dustIcon.setPosition(70, top);
    this.dustText.setPosition(112, top);
    this.pauseBtn.setPosition(W - 90, top + 4).setData('baseY', top + 4);
    this.shieldIcon.setPosition(70, top + 110);
    this.magnetIcon.setPosition(70, top + 220);
    this.hint.setPosition(W / 2, H * 0.88);
    this.hint2.setPosition(W / 2, H * 0.88 + 80);
    this.bg?.resize();
  }

  bumpScore() {
    this.scoreText.setText(fmt(this.score));
    gradientFill(this.scoreText, '#ffffff', '#bfe9ff');
    this.tweens.killTweensOf(this.scoreText);
    this.scoreText.setScale(1.25);
    this.tweens.add({ targets: this.scoreText, scale: 1, duration: 260, ease: 'Back.easeOut' });
  }

  updateMult() {
    const m = Math.min(MAX_MULT, 1 + this.combo);
    if (m > 1) {
      this.multText.setText(`×${m} COMBO`).setAlpha(1).setScale(1.4);
      this.tweens.add({ targets: this.multText, scale: 1, duration: 280, ease: 'Back.easeOut' });
    } else if (this.multText.alpha > 0) {
      this.tweens.add({ targets: this.multText, alpha: 0, duration: 200 });
    }
  }

  addDustCount(n) {
    this.runDust += n;
    save.addDust(n);
    this.dustText.setText(fmt(save.dust));
    this.tweens.killTweensOf(this.dustIcon);
    this.dustIcon.setDisplaySize(90, 90);
    this.tweens.add({ targets: this.dustIcon, displayWidth: 70, displayHeight: 70, duration: 240, ease: 'Back.easeOut' });
  }

  sectorBanner(first = false) {
    const { width: W, height: H } = this.scale;
    const s = this.sector;
    const c = this.add.container(-W, H * 0.3).setScrollFactor(0).setDepth(210);
    const g = this.add.graphics();
    g.fillStyle(C.outline, 0.85).fillRoundedRect(-W * 0.42, -110, W * 0.84, 230, 40);
    g.lineStyle(5, C.pink, 0.8).strokeRoundedRect(-W * 0.42 + 10, -100, W * 0.84 - 20, 210, 34);
    const a = txt(this, 0, -62, `SECTOR ${s.index + 1}`, 40, HEX.pink, { stroke: 8 });
    const b = txt(this, 0, 0, s.name.toUpperCase(), 76, HEX.text, { stroke: 12 });
    gradientFill(b, '#fff6c2', '#ffb84d');
    const tip = txt(this, 0, 66, s.tip, 34, HEX.dim, { stroke: 7 });
    c.add([g, a, b, tip]);
    this.tweens.add({
      targets: c, x: W / 2, duration: 520, ease: 'Back.easeOut', delay: first ? 400 : 0,
      onComplete: () => this.tweens.add({ targets: c, x: W * 2, duration: 420, delay: first ? 1600 : 1500, ease: 'Cubic.easeIn', onComplete: () => c.destroy() })
    });
    if (!first) { audio.play('sector'); haptics.success(); }
  }

  // ------------------------------------------------------------------ comet control
  orbitOn(p, initial = false) {
    const cm = this.comet;
    cm.planet = p;
    cm.omega = (diff(this.hops).vOrbit / p.ro) * cm.dir;
    cm.r = p.ro;
    if (initial) {
      cm.x = p.x + Math.cos(cm.theta) * p.ro; cm.y = p.y + Math.sin(cm.theta) * p.ro;
      p.setFace('happy'); p.drawRing(true);
      p.decayLeft = p.decayMax = diff(0).decay;
    } else {
      p.activate(diff(this.hops).decay);
    }
  }

  tapLaunch() {
    if (this.state !== 'orbit' && this.state !== 'start') return;
    const cm = this.comet, p = cm.planet;
    if (this.state === 'start') {
      this.tweens.add({ targets: [this.hint, this.hint2], alpha: 0, duration: 250 });
    }
    const tx = -Math.sin(cm.theta) * cm.dir, ty = Math.cos(cm.theta) * cm.dir;
    const v = diff(this.hops).vFly;
    // include the planet's own sideways motion so moving planets feel right
    const pvx = p.moving ? Math.cos((this.simTime || 0) * 0.001 * p.moving.speed + p.moving.phase) * p.moving.amp * p.moving.speed * 0.001 * 1000 : 0;
    cm.vx = tx * v + pvx * 0.6; cm.vy = ty * v;
    cm.last = p; this.flightTime = 0;
    p.deactivate();
    this.state = 'fly';
    this.aim.clear();
    audio.playVaried('launch'); haptics.light();
    this.burst.setParticleTint(this.skin.trail ? this.skin.trail[0] : 0xffffff);
    this.burst.explode(10, cm.x, cm.y);
    const ang = Math.atan2(cm.vy, cm.vx);
    this.cometImg.setRotation(ang);
    this.tweens.add({ targets: this.cometImg, scaleX: this.cometScale * 1.35, scaleY: this.cometScale * 0.75, duration: 90, yoyo: true, ease: 'Quad.easeOut', onComplete: () => this.cometImg.setRotation(0).setScale(this.cometScale) });
  }

  capture(p) {
    const cm = this.comet;
    const rx = cm.x - p.x, ry = cm.y - p.y, rl = Math.hypot(rx, ry) || 1;
    const vl = Math.hypot(cm.vx, cm.vy) || 1;
    const cross = (rx * cm.vy - ry * cm.vx) / (rl * vl);
    cm.dir = cross >= 0 ? 1 : -1;
    cm.theta = Math.atan2(ry, rx);
    this.state = 'orbit';
    const isNew = p.index > this.maxIndex;
    this.orbitOn(p);
    audio.play('capture', { rate: 0.95 + Math.min(0.4, this.combo * 0.07) }); haptics.medium();

    const ring = this.add.circle(p.x, p.y, p.ro).setStrokeStyle(10, C.cyan, 0.9).setDepth(15);
    this.tweens.add({ targets: ring, scale: 1.35, alpha: 0, duration: 420, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });

    if (!isNew) return;
    this.maxIndex = p.index;
    this.hops++;
    const perfect = Math.abs(cross) >= PERFECT_RATIO;
    if (perfect) { this.combo++; this.perfects++; } else this.combo = 0;
    const mult = Math.min(MAX_MULT, 1 + this.combo);
    const pts = POINTS_HOP * mult;
    this.score += pts;
    this.bumpScore();
    this.updateMult();
    if (perfect) {
      audio.play('perfect', { rate: 1 + Math.min(0.5, (this.combo - 1) * 0.08), volume: 0.8 });
      if (this.combo >= 2) audio.play('combo', { rate: 1 + Math.min(0.6, this.combo * 0.06), volume: 0.6 });
      floatText(this, p.x, p.y - p.ro - 40, this.combo > 1 ? `PERFECT ×${mult}` : 'PERFECT!', HEX.yellow, 62);
      this.burst.setParticleTint(0xffd84f);
      this.burst.explode(18, cm.x, cm.y);
      const wave = this.add.circle(p.x, p.y, p.ro).setStrokeStyle(16, C.yellow, 0.8).setDepth(15);
      this.tweens.add({ targets: wave, scale: 1.7, alpha: 0, duration: 620, ease: 'Cubic.easeOut', onComplete: () => wave.destroy() });
      this.cameras.main.shake(90, 0.003);
    } else {
      floatText(this, p.x, p.y - p.ro - 40, '+' + pts, HEX.text, 50);
    }
    const ns = sectorFor(this.hops);
    if (ns.index !== this.sector.index) {
      this.sector = ns;
      this.bg.setColors(ns.top, ns.bottom);
      this.sectorBanner();
    }
    this.generate();
  }

  // ------------------------------------------------------------------ main loop
  update(time, delta) {
    const cm = this.comet;
    const cam = this.cameras.main;
    const { height: H } = this.scale;
    // fixed-size substeps keep collisions reliable even when a frame hitches
    const total = Math.min(delta, this.dtCap || 100) / 1000;
    const n = Math.max(1, Math.ceil(total / 0.016));
    const dt = total / n;
    this.simTime = (this.simTime || 0) + total * 1000;
    for (let i = 0; i < n; i++) if (this.step(this.simTime - (n - 1 - i) * dt * 1000, dt)) break;

    if (this.state === 'start' || this.state === 'orbit') {
      this.drawAim();
      this.camTarget = cm.planet.y - H * CAMERA_ANCHOR;
      if (this.state === 'orbit') {
        const p = cm.planet, frac = Math.max(0, p.decayLeft / p.decayMax);
        p.drawTimer(frac, time);
        if (frac < 0.35) {
          p.setFace('scared');
          if (!this._tickAt || time - this._tickAt > 380) { this._tickAt = time; audio.play('tick', { volume: 0.7 }); }
        }
      }
    }
    if (this.state !== 'dead') {
      this.cometImg.setPosition(cm.x, cm.y);
      this.bubble.setPosition(cm.x, cm.y);
    }
    for (const h of this.holes) h.swirl.rotation += 2.2 * total;

    // magnet HUD
    if (this.magnetUntil > this.simTime) {
      const f = (this.magnetUntil - this.simTime) / MAGNET_TIME;
      this.magnetBar.clear().lineStyle(8, C.pink, 1).beginPath()
        .arc(this.magnetIcon.x, this.magnetIcon.y, 56, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f).strokePath();
    } else if (this.magnetIcon.visible) {
      this.magnetIcon.setVisible(false); this.magnetBar.clear();
    }

    cam.scrollY += (this.camTarget - cam.scrollY) * (1 - Math.exp(-total * 3.2));
    this.bg.update(cam.scrollY, delta);
    if ((this._cleanTick = (this._cleanTick || 0) + 1) % 30 === 0) this.cleanup();
  }

  // One physics step. Returns true when the run just ended.
  step(t, dt) {
    const cm = this.comet;
    const cam = this.cameras.main;
    const { width: W, height: H } = this.scale;
    for (const p of this.planets) p.update(t, dt);
    for (const a of this.asteroids) {
      a.x += a.vx * dt;
      if (a.x < -120) a.x = W + 120; else if (a.x > W + 120) a.x = -120;
      a.img.x = a.x; a.img.rotation += a.rot * dt;
    }
    if (this.state === 'start' || this.state === 'orbit') {
      const p = cm.planet;
      cm.theta += cm.omega * dt;
      cm.x = p.x + Math.cos(cm.theta) * cm.r; cm.y = p.y + Math.sin(cm.theta) * cm.r;
      if (this.state === 'orbit') {
        p.decayLeft -= dt;
        if (p.decayLeft <= 0) this.startSpiral();
      }
    } else if (this.state === 'fly') {
      this.flightTime += dt;
      for (const h of this.holes) {
        const dx = h.x - cm.x, dy = h.y - cm.y, d = Math.hypot(dx, dy);
        if (d < BH_REACH) {
          const a = Math.min(5200, BH_G / Math.max(d * d, 3600));
          cm.vx += (dx / d) * a * dt; cm.vy += (dy / d) * a * dt;
        }
        if (d < BH_HORIZON) { this.die('hole', h); return true; }
      }
      cm.x += cm.vx * dt; cm.y += cm.vy * dt;
      for (const p of this.planets) {
        if (p === cm.last && this.flightTime < 0.35) continue;
        if (Math.hypot(cm.x - p.x, cm.y - p.y) <= p.ro) { this.capture(p); break; }
      }
      if (this.state === 'fly') {
        const lost = cm.x < -60 || cm.x > W + 60 || cm.y > cam.scrollY + H + 80 || cm.y < cam.scrollY - 260 || this.flightTime > 3.2;
        if (lost) { this.die('lost'); return true; }
      }
    } else if (this.state === 'spiral') {
      const p = cm.planet;
      cm.r -= (p.ro - p.bodyR) * dt / 0.75;
      cm.theta += cm.omega * 1.8 * dt;
      cm.x = p.x + Math.cos(cm.theta) * cm.r; cm.y = p.y + Math.sin(cm.theta) * cm.r;
      if (cm.r <= p.bodyR * 0.95) { this.die('decay'); return true; }
    }
    if (this.state === 'dead') return true;
    this.collect(t);
    if (this.state === 'fly' || this.state === 'orbit') this.hitHazards();
    return this.state === 'dead';
  }

  drawAim() {
    const g = this.aim;
    g.clear();
    if (!save.aimGuide) return;
    const cm = this.comet;
    const tx = -Math.sin(cm.theta) * cm.dir, ty = Math.cos(cm.theta) * cm.dir;
    for (let i = 1; i <= 7; i++) {
      const d = 40 + i * 36;
      g.fillStyle(0xffffff, 0.55 * (1 - i / 8));
      g.fillCircle(cm.x + tx * d, cm.y + ty * d, 7 - i * 0.5);
    }
  }

  collect(time) {
    const cm = this.comet;
    const magnet = this.magnetUntil > time;
    for (const s of this.dust) {
      if (!s.alive) continue;
      const dx = cm.x - s.img.x, dy = cm.y - s.img.y, d = Math.hypot(dx, dy);
      if (magnet && d < MAGNET_R) {
        this.tweens.killTweensOf(s.img);
        s.img.x += dx * 0.18; s.img.y += dy * 0.18;
      }
      if (d < DUST_PICK_R) {
        s.alive = false;
        this.tweens.killTweensOf(s.img);
        this.tweens.add({ targets: s.img, scale: s.img.scale * 1.8, alpha: 0, duration: 200, onComplete: () => s.img.destroy() });
        this._dustChain = time - (this._dustAt || 0) < 900 ? (this._dustChain || 0) + 1 : 0;
        this._dustAt = time;
        audio.play('dust', { rate: 1 + Math.min(0.6, this._dustChain * 0.07), volume: 0.7, throttleMs: 15 });
        haptics.light();
        this.burst.setParticleTint(0xffd84f);
        this.burst.explode(6, s.img.x, s.img.y);
        this.score += POINTS_DUST;
        this.bumpScore();
        this.addDustCount(1);
      }
    }
    for (const u of this.powerups) {
      if (!u.alive) continue;
      if (Math.hypot(cm.x - u.x, cm.y - u.y) < 70) {
        u.alive = false;
        this.tweens.killTweensOf(u.img);
        this.tweens.add({ targets: u.img, scale: u.img.scale * 2, alpha: 0, duration: 260, onComplete: () => u.img.destroy() });
        audio.play('powerup'); haptics.medium();
        if (u.type === 'shield') { this.setShield(true); floatText(this, u.x, u.y - 60, 'SHIELD!', HEX.cyan, 56); }
        else {
          this.magnetUntil = time + MAGNET_TIME; this.magnetIcon.setVisible(true);
          floatText(this, u.x, u.y - 60, 'MAGNET!', HEX.pink, 56);
        }
      }
    }
  }

  setShield(on) {
    this.shield = on;
    this.shieldIcon.setVisible(on);
    if (on) {
      this.bubble.setVisible(true).setAlpha(0).setScale(this.bubble.scale);
      this.tweens.add({ targets: this.bubble, alpha: 1, duration: 200 });
      if (!this._bubbleTween) this._bubbleTween = this.tweens.add({ targets: this.bubble, angle: 360, duration: 3000, repeat: -1 });
    } else {
      this.tweens.add({ targets: this.bubble, alpha: 0, duration: 200, onComplete: () => this.bubble.setVisible(false) });
    }
  }

  hitHazards() {
    const cm = this.comet;
    for (const a of this.asteroids) {
      if (!a.img.active) continue;
      if (Math.hypot(cm.x - a.x, cm.y - a.y) < a.r + COMET_R * 0.8) {
        if (this.shield) {
          this.setShield(false);
          audio.play('shield_break'); haptics.heavy();
          this.debris.explode(14, a.x, a.y);
          this.cameras.main.shake(140, 0.006);
          a.img.destroy();
          this.asteroids = this.asteroids.filter(o => o !== a);
          floatText(this, cm.x, cm.y - 60, 'SAVED!', HEX.cyan, 56);
          return;
        }
        this.debris.explode(12, a.x, a.y);
        return this.die('rock');
      }
    }
  }

  startSpiral() {
    this.state = 'spiral';
    this.aim.clear();
    audio.play('swallow', { rate: 1.4 }); haptics.heavy();
  }

  // ------------------------------------------------------------------ death & continue
  die(cause, hole) {
    if (this.state === 'dead') return;
    this.state = 'dead';
    this.deathCause = cause;
    this.aim.clear();
    const cm = this.comet;
    this.trail.stop(); this.sparkles.stop();
    this.cometImg.setVisible(false); this.bubble.setVisible(false);
    this.comet.planet?.timer.clear();
    const cam = this.cameras.main;
    if (cause === 'hole') {
      const ghost = this.add.image(cm.x, cm.y, 'comet_' + this.skin.id).setDisplaySize(COMET_R * 3.8, COMET_R * 3.8).setDepth(30);
      this.tweens.add({ targets: ghost, x: hole.x, y: hole.y, scale: 0, angle: 720, duration: 650, ease: 'Cubic.easeIn', onComplete: () => ghost.destroy() });
      audio.play('swallow'); haptics.heavy();
      cam.shake(500, 0.004);
    } else if (cause === 'lost') {
      audio.play('lost'); haptics.error();
    } else {
      audio.play('crash'); haptics.heavy();
      this.boom.explode(34, cm.x, cm.y);
      this.burst.setParticleTint(0xffffff); this.burst.explode(20, cm.x, cm.y);
      cam.shake(320, 0.014);
      cam.flash(160, 255, 255, 255, false);
      if (cause === 'decay') cm.planet.setFace('scared');
    }
    audio.duckMusic(true, 0.25);
    this.time.delayedCall(cause === 'lost' ? 700 : 1100, () => {
      this.scene.pause();
      this.scene.launch('Results', {
        score: this.score, hops: this.hops, dust: this.runDust, sector: this.sector.index, perfects: this.perfects,
        cause, canContinue: !this.usedContinue
      });
    });
  }

  revive() {
    this.usedContinue = true;
    const cm = this.comet;
    const p = (this.deathCause === 'decay' ? cm.planet : cm.last) || cm.planet;
    // clear rocks right above the respawn so the player gets a fair restart
    this.asteroids = this.asteroids.filter(a => {
      if (a.y < p.y && a.y > p.y - 900) { this.debris.explode(8, a.x, a.y); a.img.destroy(); return false; }
      return true;
    });
    cm.theta = -Math.PI / 2; cm.dir = 1;
    this.orbitOn(p, true);
    p.timer.clear();
    this.state = 'start';
    this.cometImg.setVisible(true).setScale(0).setPosition(p.x, p.y - p.ro);
    this.tweens.add({ targets: this.cometImg, scale: this.cometScale, duration: 400, ease: 'Back.easeOut' });
    this.trail.start(); this.sparkles.start();
    this.setShield(true);
    this.combo = 0; this.updateMult();
    this.hint.setText('TAP TO CONTINUE').setAlpha(1);
    audio.play('revive'); haptics.success();
    audio.duckMusic(false);
    this.scene.resume();
  }

  // ------------------------------------------------------------------ debug hooks (preview script)
  debugHop(ratio = 0.75) {
    const cm = this.comet, p = cm.planet;
    const target = this.planets.find(q => q.index === this.maxIndex + 1) || this.planets.find(q => q.index > p.index);
    if (!target) return;
    let best = null;
    for (let k = 0; k < 720; k++) {
      const th = (k / 720) * Math.PI * 2;
      const px = p.x + Math.cos(th) * p.ro, py = p.y + Math.sin(th) * p.ro;
      const tx = -Math.sin(th) * cm.dir, ty = Math.cos(th) * cm.dir;
      const rx = target.x - px, ry = target.y - py;
      const along = rx * tx + ry * ty;
      if (along <= 0) continue;
      const perp = Math.abs(rx * ty - ry * tx);
      const err = Math.abs(perp - target.ro * ratio);
      if (!best || err < best.err) best = { th, err };
    }
    if (best) { cm.theta = best.th; cm.x = p.x + Math.cos(cm.theta) * cm.r; cm.y = p.y + Math.sin(cm.theta) * cm.r; this.tapLaunch(); }
  }

  debugSkip(n) {
    const cm = this.comet, p = cm.planet;
    this.planets.filter(q => q !== p).forEach(q => q.destroy());
    this.planets = [p];
    [...this.asteroids].forEach(a => a.img.destroy()); this.asteroids = [];
    this.holes.forEach(h => [h.img, h.swirl, h.glow, h.pull].forEach(o => o.destroy())); this.holes = [];
    this.dust.forEach(s => s.alive && s.img.destroy()); this.dust = [];
    this.powerups.forEach(s => s.alive && s.img.destroy()); this.powerups = [];
    p.index = n; this.maxIndex = n; this.hops = n; this.nextIndex = n + 1; this.score = n * 14;
    this.bumpScore();
    this.sector = sectorFor(n); this.bg.setColors(this.sector.top, this.sector.bottom, 10);
    this.generate();
  }

  openPause() {
    if (this.state === 'dead' || !this.scene.isActive()) return;
    this.scene.pause();
    this.scene.launch('Pause');
  }
}
