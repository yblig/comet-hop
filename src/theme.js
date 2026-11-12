export const C = {
  bg: 0x0b0a24, surface: 0x1d1650, surface2: 0x2a2068, outline: 0x140f33,
  cyan: 0x3ff0ff, pink: 0xff4fd8, yellow: 0xffd84f, danger: 0xff3b5c, text: 0xf2f0ff, mint: 0x3dff9a
};
export const HEX = {
  outline: '#140f33', text: '#f2f0ff', cyan: '#3ff0ff', pink: '#ff4fd8', yellow: '#ffd84f',
  danger: '#ff3b5c', dim: '#a9a3d9', mint: '#3dff9a'
};
export const FONT = 'Fredoka';

// Big heavy text with a dark stroke and soft drop shadow.
export function txt(scene, x, y, str, size = 56, color = HEX.text, opts = {}) {
  const t = scene.add.text(x, y, str, {
    fontFamily: FONT, fontStyle: opts.weight || '700', fontSize: size + 'px', color,
    stroke: HEX.outline, strokeThickness: opts.stroke ?? Math.max(6, Math.round(size * 0.16)),
    align: opts.align || 'center', wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
    lineSpacing: opts.lineSpacing || 0, padding: { x: 6, y: 6 }
  }).setOrigin(opts.ox ?? 0.5, opts.oy ?? 0.5);
  if (opts.shadow !== false) t.setShadow(0, Math.round(size * 0.1), '#000000', 0, true, false);
  return t;
}

// Fill a text object with a vertical gradient (used for the logo and big numbers).
export function gradientFill(t, top, bottom) {
  const g = t.context.createLinearGradient(0, 0, 0, t.height);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  t.setFill(g);
  return t;
}

export function fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}
