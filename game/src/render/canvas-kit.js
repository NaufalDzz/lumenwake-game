// Small drawing helpers shared by every renderer: rounded panels, glows, text with shadows, wrapping.

import { FONT_UI } from './palette.js';

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

export function fillRound(ctx, x, y, w, h, r, fill, stroke, lineWidth = 1) {
  roundRect(ctx, x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

/** Soft radial glow, drawn additively. */
export function glow(ctx, x, y, r, color, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function text(ctx, str, x, y, { size = 16, weight = 600, color = '#fff', align = 'left', baseline = 'alphabetic', font = FONT_UI, shadow = true, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (shadow) {
    ctx.fillStyle = 'rgba(5, 4, 20, 0.6)';
    ctx.fillText(str, x, y + Math.max(1, size / 14));
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

export function measure(ctx, str, size = 16, weight = 600, font = FONT_UI) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${font}`;
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

/** Word-wrap `str` into lines no wider than `maxWidth`; returns the y after the last line. */
export function wrapText(ctx, str, x, y, maxWidth, lineHeight, opts = {}) {
  const words = String(str).split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && measure(ctx, test, opts.size, opts.weight, opts.font) > maxWidth) {
      text(ctx, line, x, cy, opts);
      line = word;
      cy += lineHeight;
    } else line = test;
  }
  if (line) text(ctx, line, x, cy, opts);
  return cy + lineHeight;
}

export function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x, y - s * 0.1, x - s * 0.55, y - s * 0.15, x - s * 0.55, y + s * 0.15);
  ctx.bezierCurveTo(x - s * 0.55, y + s * 0.45, x - s * 0.1, y + s * 0.6, x, y + s * 0.8);
  ctx.bezierCurveTo(x + s * 0.1, y + s * 0.6, x + s * 0.55, y + s * 0.45, x + s * 0.55, y + s * 0.15);
  ctx.bezierCurveTo(x + s * 0.55, y - s * 0.15, x, y - s * 0.1, x, y + s * 0.35);
  ctx.closePath();
}

export function dewPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.6);
  ctx.bezierCurveTo(x + s * 0.15, y - s * 0.3, x + s * 0.45, y, x + s * 0.45, y + s * 0.2);
  ctx.arc(x, y + s * 0.2, s * 0.45, 0, Math.PI);
  ctx.bezierCurveTo(x - s * 0.45, y, x - s * 0.15, y - s * 0.3, x, y - s * 0.6);
  ctx.closePath();
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp01 = (t) => Math.max(0, Math.min(1, t));
export const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 3);
