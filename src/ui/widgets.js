// Reusable UI kit: buttons, round icon buttons, toggles, panels, toasts, transitions.
import Phaser from 'phaser';
import { audio } from '../lib/audio.js';
import { haptics } from '../lib/haptics.js';
import { txt, HEX, C } from '../theme.js';

function pressable(scene, target, container, onClick, sound = 'ui_tap') {
  let down = false;
  const baseY = () => container.getData('baseY');
  container.setData('baseY', container.y);
  target.setInteractive({ useHandCursor: true });
  target.on('pointerdown', (p, lx, ly, e) => {
    e?.stopPropagation?.();
    if (container.getData('disabled')) { audio.play('error'); haptics.error(); shake(scene, container); return; }
    down = true;
    container.setData('baseY', container.getData('baseY') ?? container.y);
    scene.tweens.killTweensOf(container);
    container.setScale(container.getData('s') * 0.94);
    container.y = baseY() + 8;
    audio.play(sound); haptics.tap();
  });
  const release = fire => {
    if (!down) return;
    down = false;
    scene.tweens.add({ targets: container, scale: container.getData('s'), y: baseY(), duration: 260, ease: 'Back.easeOut' });
    if (fire) scene.time.delayedCall(70, () => onClick?.());
  };
  target.on('pointerup', () => release(true));
  target.on('pointerout', () => release(false));
}

function shake(scene, obj) {
  const x = obj.x;
  scene.tweens.add({ targets: obj, x: x + 14, duration: 50, yoyo: true, repeat: 3, onComplete: () => (obj.x = x) });
}

export function button(scene, x, y, label, { color = 'yellow', width = 560, icon = null, size = 64, onClick, textColor = HEX.text } = {}) {
  const c = scene.add.container(x, y);
  const s = width / 560;
  const img = scene.add.image(0, 0, 'btn_' + color);
  const t = txt(scene, icon ? 34 : 0, -8, label, size, textColor, { stroke: 10 });
  c.add([img, t]);
  if (icon) {
    const ic = scene.add.image(-t.width / 2 - 8, -8, 'icon_' + icon).setDisplaySize(size * 0.95, size * 0.95);
    c.add(ic);
  }
  c.setScale(s).setData('s', s).setSize(560, 180);
  pressable(scene, img, c, onClick);
  c.label = t;
  c.setLabel = str => { t.setText(str); };
  c.setDisabled = d => { c.setData('disabled', d); c.setAlpha(d ? 0.55 : 1); };
  return c;
}

export function iconButton(scene, x, y, icon, { color = 'dark', size = 130, onClick, sound } = {}) {
  const c = scene.add.container(x, y);
  const s = size / 160;
  const img = scene.add.image(0, 0, 'round_' + color);
  const ic = scene.add.image(0, -6, 'icon_' + icon).setDisplaySize(84, 84);
  c.add([img, ic]);
  c.setScale(s).setData('s', s);
  c.icon = ic;
  pressable(scene, img, c, onClick, sound);
  return c;
}

// A pill toggle with a label row, used in Settings.
export function toggleRow(scene, x, y, w, label, icon, value, onChange) {
  const c = scene.add.container(x, y);
  const bg = scene.add.graphics();
  bg.fillStyle(0x000000, 0.25).fillRoundedRect(-w / 2, -60, w, 120, 36);
  const ic = scene.add.image(-w / 2 + 70, 0, 'icon_' + icon).setDisplaySize(60, 60);
  const t = txt(scene, -w / 2 + 125, 0, label, 46, HEX.text, { ox: 0, stroke: 8, shadow: false });
  const track = scene.add.graphics();
  const knob = scene.add.circle(0, 0, 34, 0xffffff).setStrokeStyle(6, C.outline);
  const tx = w / 2 - 110;
  let on = value;
  const draw = () => {
    track.clear();
    track.fillStyle(C.outline, 1).fillRoundedRect(tx - 72, -42, 144, 84, 42);
    track.fillStyle(on ? C.mint : 0x4a4380, 1).fillRoundedRect(tx - 66, -36, 132, 72, 36);
  };
  draw();
  knob.x = tx + (on ? 34 : -34);
  c.add([bg, ic, t, track, knob]);
  const hit = scene.add.rectangle(0, 0, w, 120, 0, 0).setInteractive({ useHandCursor: true });
  c.add(hit);
  hit.on('pointerdown', () => {
    on = !on; draw();
    scene.tweens.add({ targets: knob, x: tx + (on ? 34 : -34), duration: 180, ease: 'Back.easeOut' });
    audio.play('toggle'); haptics.tap();
    onChange(on);
  });
  return c;
}

export function panel(scene, x, y, w, h, title) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.35).fillRoundedRect(-w / 2 + 6, -h / 2 + 18, w, h, 56);
  g.fillStyle(C.outline, 1).fillRoundedRect(-w / 2 - 8, -h / 2 - 8, w + 16, h + 16, 62);
  g.fillGradientStyle(0x2f2480, 0x2f2480, 0x1a1448, 0x1a1448, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 56);
  g.lineStyle(4, C.cyan, 0.35).strokeRoundedRect(-w / 2 + 10, -h / 2 + 10, w - 20, h - 20, 48);
  c.add(g);
  if (title) {
    const rib = scene.add.image(0, -h / 2, 'btn_pink').setDisplaySize(Math.min(w - 120, 620), 150);
    const t = txt(scene, 0, -h / 2 - 8, title, 64, HEX.text, { stroke: 10 });
    c.add([rib, t]);
  }
  return c;
}

// Dim backdrop + panel pop-in. Returns { root, close } — close() animates out then calls done.
export function modal(scene, build) {
  const { width: W, height: H } = scene.scale;
  const dim = scene.add.rectangle(W / 2, H / 2, W * 2, H * 2, 0x05031a, 0.72).setInteractive().setAlpha(0);
  const root = scene.add.container(W / 2, H / 2);
  build(root);
  root.setScale(0.8).setAlpha(0);
  scene.tweens.add({ targets: dim, alpha: 1, duration: 200 });
  scene.tweens.add({ targets: root, scale: 1, alpha: 1, duration: 340, ease: 'Back.easeOut' });
  audio.play('ui_open');
  return {
    dim, root,
    close(done) {
      scene.tweens.add({ targets: dim, alpha: 0, duration: 180 });
      scene.tweens.add({ targets: root, scale: 0.85, alpha: 0, duration: 180, ease: 'Cubic.easeIn', onComplete: () => done?.() });
    }
  };
}

export function toast(scene, msg) {
  const { width: W, height: H } = scene.scale;
  const t = txt(scene, W / 2, H * 0.86, msg, 42, HEX.text, { stroke: 8 });
  const bg = scene.add.graphics();
  bg.fillStyle(C.outline, 0.85).fillRoundedRect(W / 2 - t.width / 2 - 36, H * 0.86 - 52, t.width + 72, 104, 52);
  const c = scene.add.container(0, 0, [bg, t]).setDepth(1000).setAlpha(0);
  scene.tweens.add({ targets: c, alpha: 1, y: -20, duration: 220, ease: 'Cubic.easeOut', hold: 1300, yoyo: true, onComplete: () => c.destroy() });
}

export function fadeTo(scene, key, data) {
  if (scene._leaving) return;
  scene._leaving = true;
  scene.cameras.main.fadeOut(260, 5, 3, 26);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start(key, data));
}

// Floating text that rises and fades.
export function floatText(scene, x, y, str, color = HEX.yellow, size = 54) {
  const t = txt(scene, x, y, str, size, color, { stroke: 10 }).setDepth(500).setScale(0.4);
  scene.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: t, y: y - 130, alpha: 0, delay: 380, duration: 600, ease: 'Cubic.easeIn', onComplete: () => t.destroy() });
  return t;
}
