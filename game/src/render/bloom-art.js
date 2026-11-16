// Procedural blooms. Each species has its own silhouette and colour so they read at a glance even small:
// Dawnpetal (gold star flower), Moonlily (pale cupped lily), Twinbell (two lilac bells), Shadecap (dark
// glowing mushroom) and the great Dawnheart lotus. `stage` 0..1 opens the flower as it grows. A status
// ring shows growth, leaf pips show patience, and a badge previews what the next pulse will do.

import { SPECIES_COLORS, INK } from './palette.js';
import { glow } from './canvas-kit.js';
import { SPECIES } from '../rules/blooms.js';

function stem(ctx, x, y, h, sway) {
  ctx.strokeStyle = '#3f8a5a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + sway, y - h * 0.5, x + sway * 0.6, y - h);
  ctx.stroke();
  ctx.fillStyle = '#5cbf78';
  ctx.beginPath();
  ctx.ellipse(x - 6, y - h * 0.35, 7, 3, -0.6, 0, Math.PI * 2);
  ctx.ellipse(x + 6, y - h * 0.5, 7, 3, 0.6, 0, Math.PI * 2);
  ctx.fill();
}

function petals(ctx, x, y, count, len, width, color, rot) {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const a = rot + (i / count) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5, len * 0.55, width, a, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Draw one bloom at the cell centre (x, y). */
export function drawBloom(ctx, species, x, y, s, { stage = 0, t = 0, wilting = false, alpha = 1, lift = 0 } = {}) {
  const col = SPECIES_COLORS[species];
  const sway = Math.sin(t * 1.3 + x * 0.05) * 2;
  const base = y + s * 0.26;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(0, -lift);
  ctx.fillStyle = 'rgba(8, 8, 28, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x + 2, base + 2, s * 0.22, s * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  const open = 0.35 + 0.65 * stage;
  const droop = wilting ? 0.25 : 0;
  if (stage > 0.6 && !wilting) glow(ctx, x, y - s * 0.12, s * 0.5 * open, col.glow, alpha);

  if (species === 'dawnpetal') {
    const h = s * (0.32 + 0.12 * stage);
    stem(ctx, x, base, h, sway);
    const fx = x + sway * 0.6;
    const fy = base - h + droop * 10;
    petals(ctx, fx, fy, 5, s * 0.2 * open, s * 0.075 * open, col.petal, t * 0.2 + droop);
    ctx.fillStyle = col.heart;
    ctx.beginPath();
    ctx.arc(fx, fy, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
  } else if (species === 'moonlily') {
    const h = s * (0.3 + 0.12 * stage);
    stem(ctx, x, base, h, sway);
    const fx = x + sway * 0.6;
    const fy = base - h + droop * 10;
    for (let i = -2; i <= 2; i++) {
      ctx.fillStyle = i % 2 ? '#c9dcff' : col.petal;
      ctx.beginPath();
      ctx.ellipse(fx + i * 5 * open, fy - 4 * open, s * 0.06, s * 0.2 * open, i * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = col.heart;
    ctx.beginPath();
    ctx.arc(fx, fy + 2, s * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200, 230, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(fx + s * 0.2, fy - s * 0.2, 5, Math.PI * 0.6, Math.PI * 1.9);
    ctx.stroke();
  } else if (species === 'twinbell') {
    const h = s * (0.34 + 0.08 * stage);
    ctx.strokeStyle = '#3f8a5a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.quadraticCurveTo(x + sway, base - h, x, base - h * 1.05);
    ctx.stroke();
    for (const side of [-1, 1]) {
      const bx = x + side * s * 0.16;
      const by = base - h * 0.7 + droop * 8;
      ctx.strokeStyle = '#3f8a5a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, base - h * 1.02);
      ctx.quadraticCurveTo(bx, base - h * 1.1, bx, by - s * 0.08);
      ctx.stroke();
      ctx.fillStyle = col.petal;
      ctx.beginPath();
      ctx.moveTo(bx - s * 0.1 * open, by + s * 0.06);
      ctx.quadraticCurveTo(bx - s * 0.1 * open, by - s * 0.12, bx, by - s * 0.12);
      ctx.quadraticCurveTo(bx + s * 0.1 * open, by - s * 0.12, bx + s * 0.1 * open, by + s * 0.06);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col.heart;
      ctx.beginPath();
      ctx.arc(bx, by + s * 0.07, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (species === 'shadecap') {
    const h = s * (0.16 + 0.1 * stage);
    ctx.fillStyle = '#d8cfe8';
    ctx.fillRect(x - 4, base - h, 8, h);
    const capW = s * (0.22 + 0.12 * stage);
    ctx.fillStyle = col.petal;
    ctx.beginPath();
    ctx.ellipse(x, base - h, capW, capW * 0.62, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = col.heart;
    for (const [dx, dy] of [[-0.45, -0.3], [0.1, -0.5], [0.5, -0.22]]) {
      ctx.globalAlpha = alpha * (0.6 + 0.4 * Math.sin(t * 2 + dx * 5));
      ctx.beginPath();
      ctx.arc(x + dx * capW, base - h + dy * capW * 0.6, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = alpha;
  } else if (species === 'dawnheart') {
    const fy = y - s * 0.02;
    glow(ctx, x, fy, s * (0.6 + 0.3 * stage), col.glow, alpha);
    for (let ring = 0; ring < 2; ring++) {
      const n = ring ? 6 : 8;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ring * 0.3 + t * 0.05;
        const len = s * (ring ? 0.2 : 0.3) * (0.6 + 0.4 * open);
        ctx.fillStyle = ring ? '#ffd9c8' : col.petal;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * len * 0.6, fy + Math.sin(a) * len * 0.45, len * 0.55, len * 0.22, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = col.heart;
    ctx.beginPath();
    ctx.arc(x, fy, s * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Status around a bloom: growth ring, patience leaves, need label and the preview badge.
 * `response` is the previewed outcome of the next pulse; `received` the light it would get.
 */
export function drawBloomStatus(ctx, bloom, x, y, s, response, received, { contrast = false } = {}) {
  const sp = SPECIES[bloom.species];
  const r = s * 0.42;
  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(10, 10, 30, 0.45)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  const willGrow = response === 'grow';
  ctx.strokeStyle = INK.grow;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * bloom.growth) / sp.growth);
  ctx.stroke();
  if (willGrow) {
    ctx.strokeStyle = 'rgba(125, 255, 176, 0.45)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI / 2 + (Math.PI * 2 * bloom.growth) / sp.growth, -Math.PI / 2 + (Math.PI * 2 * (bloom.growth + 1)) / sp.growth);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // patience leaves along the bottom
  const n = bloom.patience;
  for (let i = 0; i < n; i++) {
    const px = x - (n - 1) * 5 + i * 10;
    const py = y + s * 0.42;
    ctx.fillStyle = n <= 1 ? INK.wilt : '#9be6a8';
    ctx.beginPath();
    ctx.ellipse(px, py, 4, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // need tag (top-left): light needed vs. light arriving
  const need = sp.shade ? '☾' : sp.sources ? `${Math.min(2, received.sources)}/2⇄` : `${received.total}/${sp.thirst}`;
  ctx.font = `700 ${contrast ? 13 : 12}px sans-serif`;
  const tw = ctx.measureText(need).width + 8;
  ctx.fillStyle = 'rgba(12, 10, 34, 0.82)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x - s * 0.47, y - s * 0.47, tw, 16, 5);
  else ctx.rect(x - s * 0.47, y - s * 0.47, tw, 16);
  ctx.fill();
  ctx.fillStyle = sp.shade ? '#b7f0ff' : willGrow ? INK.grow : '#ffe6a8';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(need, x - s * 0.47 + 4, y - s * 0.47 + 8.5);
  // preview badge (top-right)
  const bx = x + s * 0.36;
  const by = y - s * 0.36;
  const color = response === 'grow' ? INK.grow : response === 'sustain' ? INK.sustain : INK.wilt;
  ctx.fillStyle = 'rgba(12, 10, 34, 0.9)';
  ctx.beginPath();
  ctx.arc(bx, by, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  if (response === 'grow') {
    ctx.moveTo(bx, by - 5);
    ctx.lineTo(bx + 5, by + 3);
    ctx.lineTo(bx - 5, by + 3);
  } else if (response === 'wilt') {
    ctx.moveTo(bx, by + 5);
    ctx.lineTo(bx + 5, by - 3);
    ctx.lineTo(bx - 5, by - 3);
  } else {
    ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}
