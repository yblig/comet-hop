import { h, btn, svgEl, ICONS, avatar, PCOLORS, dialog } from '../ui/dom.js';
import { onScreenBack, go } from '../app.js';
import { audio } from '../lib/audio.js';
import { haptics } from '../lib/haptics.js';
import { native } from '../lib/native.js';
import { hostScreen } from '../host/host.js';
import { joinScreen } from '../controller/controller.js';

export function homeScreen(root) {
  audio.playMusic('music_lobby');
  root.style.padding = '0';
  const bg = h('div', { class: 'party-bg' }, h('div', { class: 'confetti-dots' }));
  const blobs = h('div', { class: 'blob-row' }, PCOLORS.map((c, i) => avatar(c, ['happy', 'wow', 'cool', 'happy'][i])));
  blobs.querySelectorAll('.avatar').forEach(a => a.addEventListener('pointerdown', () => { audio.playVaried('wiggle'); haptics.light(); a.animate([{ transform: 'scale(1.3,.7)' }, { transform: 'scale(.9,1.15) translateY(-14px)' }, { transform: 'none' }], { duration: 420, easing: 'ease-out' }); }));

  const hostBtn = btn(null, 'pink big-choice', () => go(hostScreen));
  hostBtn.append(svgEl(ICONS.tv), h('span', {}, 'Jadi Layar', h('small', {}, 'HP ini menampilkan game')));
  hostBtn.querySelector('svg').classList.add('ico');
  const padBtn = btn(null, 'cyan big-choice', () => go(joinScreen));
  padBtn.append(svgEl(ICONS.pad), h('span', {}, 'Jadi Controller', h('small', {}, 'Gabung ke room teman')));
  padBtn.querySelector('svg').classList.add('ico');

  const main = h('div', { class: 'home-main' },
    h('div', { class: 'home-hero' },
      h('div', { class: 'logo bob' }, h('span', { class: 'a' }, 'MABAR'), h('span', { class: 'b' }, 'PARTY!')),
      blobs,
      h('p', { class: 'dim', style: { margin: 0, fontSize: 'clamp(13px,3.2vh,18px)', textAlign: 'center' } }, '1 layar · sampai 4 pemain · pakai HP masing-masing')),
    h('div', { class: 'home-actions' }, hostBtn, padBtn,
      h('div', { class: 'row', style: { justifyContent: 'center', gap: '18px' } },
        btn(null, 'dark round', () => settingsDialog(), { icon: 'gear' }),
        btn(null, 'dark round', () => helpDialog(), { icon: 'help' }))));
  const wrap = h('div', { class: 'screen', style: { animation: 'none' } }, main);
  root.append(bg, wrap);
  native.hideSplash();
  onScreenBack(() => false);
}

export function settingsDialog() {
  dialog((card, close) => {
    card.style.minWidth = 'min(480px, 86vw)';
    const row = (label, get, set) => {
      const sw = h('div', { class: 'switch' + (get() ? ' on' : '') });
      const r = h('div', { class: 'toggle-row' }, h('span', { class: 'grow' }, label), sw);
      r.addEventListener('pointerdown', () => { const v = !get(); set(v); sw.classList.toggle('on', v); audio.play('toggle'); haptics.tap(); });
      return r;
    };
    card.append(h('h2', { class: 'title-m', style: { textAlign: 'center' } }, 'Pengaturan'),
      row('Musik', () => audio.settings.music > 0, v => audio.set({ music: v ? 0.55 : 0 })),
      row('Efek suara', () => audio.settings.sfx > 0, v => audio.set({ sfx: v ? 1 : 0 })),
      row('Getar', () => haptics.isEnabled(), v => { haptics.setEnabled(v); if (v) haptics.medium(); }),
      h('p', { class: 'mini', style: { textAlign: 'center', margin: '4px 0 0' } }, 'Mabar Party v1.0 · dibuat dengan Claude'),
      h('div', { class: 'center' }, btn('Oke', 'cyan small', close, { icon: 'check' })));
  });
}

export function helpDialog() {
  dialog((card, close) => {
    const step = (n, t, d) => h('div', { class: 'row', style: { alignItems: 'flex-start' } },
      h('div', { class: 'center', style: { flex: 'none', width: '38px', height: '38px', borderRadius: '50%', background: 'var(--yellow)', color: 'var(--outline)', border: '3px solid var(--outline)', font: '800 20px var(--title)' } }, n),
      h('div', {}, h('b', { style: { fontSize: '19px' } }, t), h('div', { class: 'dim', style: { fontSize: '15px' } }, d)));
    card.append(h('h2', { class: 'title-m', style: { textAlign: 'center' } }, 'Cara Main'),
      step('1', 'Satu HP jadi Layar', 'Taruh di tengah, atau mirror/cast ke TV biar seru.'),
      step('2', 'HP lain jadi Controller', 'Pasang Mabar Party juga, pilih "Jadi Controller", masukkan kode 4 huruf.'),
      step('3', 'Pemain 1 pilih game', 'Pakai controller atau sentuh kartu game di layar.'),
      step('!', 'Koneksi', 'Paling lancar kalau semua HP di Wi-Fi yang sama. Butuh internet untuk menyambung.'),
      h('div', { class: 'center' }, btn('Siap!', 'pink small', close)));
  });
}
