// Shared canvas UI kit: palette, fonts, rounded panels, immediate-mode buttons, stars, glow sprites.

export const VIEW_W = 1280;
export const VIEW_H = 720;

export const COLORS = {
  ink: '#0a0d26',
  night: '#10153a',
  indigo: '#1b2157',
  dusk: '#2c2f6e',
  lavender: '#8e8ad6',
  mist: '#c9c6f0',
  text: '#f4efff',
  textDim: '#b4b2e0',
  gold: '#ffd27a',
  goldHot: '#fff2c4',
  peach: '#ffad85',
  coral: '#f2836b',
  mint: '#8ff0c8',
  mintDeep: '#3fb595',
  danger: '#ff8f8f',
};

export const FONT_DISPLAY = '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif';
export const FONT_UI = '"Trebuchet MS", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

export function font(size, weight = 600, family = FONT_UI) {
  return `${weight} ${size}px ${family}`;
}

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** A frosted night-glass panel used for the side panel, menus and result cards. */
export function drawPanel(ctx, x, y, w, h, { radius = 18, glow = 'rgba(255,210,122,0.0)', alpha = 0.78 } = {}) {
  ctx.save();
  ctx.shadowColor = 'rgba(3,4,20,0.55)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, x, y, w, h, radius);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, `rgba(36,40,98,${alpha})`);
  g.addColorStop(1, `rgba(16,19,56,${alpha + 0.08})`);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, radius);
  ctx.strokeStyle = 'rgba(201,198,240,0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();
  if (glow) {
    ctx.strokeStyle = glow;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // a thin warm highlight along the top edge, like light catching glass
  const hl = ctx.createLinearGradient(x, 0, x + w, 0);
  hl.addColorStop(0, 'rgba(255,210,150,0)');
  hl.addColorStop(0.5, 'rgba(255,210,150,0.35)');
  hl.addColorStop(1, 'rgba(255,210,150,0)');
  ctx.fillStyle = hl;
  ctx.fillRect(x + radius, y + 1, w - radius * 2, 1.5);
  ctx.restore();
}

export function drawText(ctx, text, x, y, { size = 16, weight = 600, color = COLORS.text, align = 'left', baseline = 'alphabetic', family = FONT_UI, shadow = true, spacing = 0 } = {}) {
  ctx.save();
  ctx.font = font(size, weight, family);
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`;
  if (shadow) {
    ctx.shadowColor = 'rgba(5,6,24,0.7)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Word-wrap text into a box; returns the y after the last line. */
export function drawWrapped(ctx, text, x, y, maxWidth, { size = 15, lineHeight = 21, color = COLORS.textDim, weight = 500 } = {}) {
  ctx.save();
  ctx.font = font(size, weight);
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      drawText(ctx, line, x, yy, { size, weight, color, shadow: false });
      line = word;
      yy += lineHeight;
    } else line = test;
  }
  if (line) drawText(ctx, line, x, yy, { size, weight, color, shadow: false });
  ctx.restore();
  return yy + lineHeight;
}

export function starPath(ctx, cx, cy, outer, inner = outer * 0.48) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? inner : outer;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}

export function drawStar(ctx, cx, cy, r, filled, pop = 1) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pop, pop);
  starPath(ctx, 0, 0, r);
  if (filled) {
    const g = ctx.createRadialGradient(0, -r * 0.3, 1, 0, 0, r);
    g.addColorStop(0, COLORS.goldHot);
    g.addColorStop(1, '#f5a54a');
    ctx.fillStyle = g;
    ctx.shadowColor = 'rgba(255,200,110,0.8)';
    ctx.shadowBlur = r * 0.8;
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(20,24,64,0.7)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(201,198,240,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Immediate-mode button. Screens call this each frame and the returned record is kept for hit-testing,
 * so mouse hover, keyboard focus and clicks always match what is drawn.
 */
export function drawButton(ctx, b, { hover = false, focus = false, time = 0 } = {}) {
  const { x, y, w, h, label, primary, keyHint, disabled } = b;
  ctx.save();
  const lift = hover && !disabled ? -2 : 0;
  roundRect(ctx, x, y + lift, w, h, h / 2.6);
  let g;
  if (primary) {
    g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, disabled ? '#5b587e' : '#ffd99a');
    g.addColorStop(1, disabled ? '#3c3a5e' : '#f0976c');
  } else {
    g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, hover ? 'rgba(86,90,170,0.95)' : 'rgba(58,62,132,0.9)');
    g.addColorStop(1, hover ? 'rgba(50,52,118,0.95)' : 'rgba(32,35,88,0.9)');
  }
  ctx.shadowColor = primary && !disabled ? 'rgba(255,170,110,0.45)' : 'rgba(0,0,20,0.5)';
  ctx.shadowBlur = hover ? 18 : 10;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = g;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = primary ? 'rgba(255,240,210,0.7)' : 'rgba(201,198,240,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  if (focus) {
    roundRect(ctx, x - 4, y + lift - 4, w + 8, h + 8, h / 2.6 + 4);
    ctx.strokeStyle = COLORS.mint;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([7, 5]);
    ctx.lineDashOffset = -time * 20;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const textColor = primary ? (disabled ? '#a9a6c8' : '#3a1f2a') : COLORS.text;
  const size = b.size ?? Math.min(19, Math.round(h * 0.4));
  if (keyHint) {
    ctx.font = font(size, 700);
    const lw = ctx.measureText(label).width;
    ctx.font = font(11, 700);
    const kw = ctx.measureText(keyHint).width + 10;
    const total = lw + kw + 8;
    const lx = x + w / 2 - total / 2;
    drawText(ctx, label, lx, y + lift + h / 2 + 1, { size, weight: 700, color: textColor, baseline: 'middle', shadow: !primary });
    roundRect(ctx, lx + lw + 8, y + lift + h / 2 - 9, kw, 18, 5);
    ctx.fillStyle = primary ? 'rgba(80,30,40,0.18)' : 'rgba(255,255,255,0.12)';
    ctx.fill();
    drawText(ctx, keyHint, lx + lw + 8 + kw / 2, y + lift + h / 2 + 1, { size: 11, weight: 700, color: textColor, align: 'center', baseline: 'middle', shadow: false });
  } else {
    drawText(ctx, label, x + w / 2, y + lift + h / 2 + 1, { size, weight: 700, color: textColor, align: 'center', baseline: 'middle', shadow: !primary });
  }
  ctx.restore();
  return b;
}

export function hitButton(buttons, x, y) {
  for (let i = buttons.length - 1; i >= 0; i--) {
    const b = buttons[i];
    if (!b.disabled && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

const glowCache = new Map();
/** A soft radial glow sprite, cached per colour, drawn additively for light, fireflies and sparks. */
export function glowSprite(color) {
  if (glowCache.has(color)) return glowCache.get(color);
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, color);
  grad.addColorStop(0.25, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = 1;
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  glowCache.set(color, c);
  return c;
}

export function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
