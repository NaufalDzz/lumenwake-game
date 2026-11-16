// Storm visuals: the forecast drawn on the board while the keeper plans (wind streaks down a gale lane,
// shadowed cloud footprints, hail target rings, a dimming ring round the well), and the clouds that stand
// on the board for their two pulses.

import { cellCenter, BOARD } from './layout.js';
import { cellX, cellY } from '../rules/grid.js';

export function drawForecast(ctx, storm, t, wellIndex) {
  if (!storm) return;
  const s = BOARD.cell;
  const blink = 0.55 + 0.45 * Math.sin(t * 4);
  ctx.save();
  if (storm.kind === 'gale') {
    const first = cellCenter(storm.cells[0]);
    const horizontal = storm.axis === 'row';
    ctx.fillStyle = `rgba(160, 220, 255, ${0.1 + 0.06 * blink})`;
    if (horizontal) ctx.fillRect(BOARD.x, first.y - s / 2, BOARD.w, s);
    else ctx.fillRect(first.x - s / 2, BOARD.y, s, BOARD.h);
    ctx.strokeStyle = 'rgba(200, 240, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const u = ((t * 0.5 + i / 6) % 1);
      const px = horizontal ? BOARD.x + u * BOARD.w : first.x + Math.sin(i * 2.3) * s * 0.3;
      const py = horizontal ? first.y + Math.sin(i * 2.3) * s * 0.3 : BOARD.y + u * BOARD.h;
      ctx.beginPath();
      if (horizontal) {
        ctx.moveTo(px - 24, py);
        ctx.quadraticCurveTo(px - 8, py - 6, px, py);
      } else {
        ctx.moveTo(px, py - 24);
        ctx.quadraticCurveTo(px + 6, py - 8, px, py);
      }
      ctx.stroke();
    }
  } else if (storm.kind === 'cloud') {
    for (const c of storm.cells) {
      const p = cellCenter(c);
      ctx.fillStyle = `rgba(190, 190, 230, ${0.16 + 0.1 * blink})`;
      ctx.fillRect(p.x - s / 2 + 2, p.y - s / 2 + 2, s - 4, s - 4);
    }
    const p = cellCenter(storm.cells[0]);
    drawCloudPuff(ctx, p.x + s / 2, p.y + s / 2 - 6, s * 0.75, 0.35 + 0.15 * blink);
  } else if (storm.kind === 'hail') {
    for (const c of storm.cells) {
      const p = cellCenter(c);
      ctx.strokeStyle = `rgba(255, 140, 160, ${0.6 + 0.4 * blink})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, s * 0.36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.18, p.y);
      ctx.lineTo(p.x + s * 0.18, p.y);
      ctx.moveTo(p.x, p.y - s * 0.18);
      ctx.lineTo(p.x, p.y + s * 0.18);
      ctx.stroke();
    }
  } else if (storm.kind === 'eclipse') {
    const p = cellCenter(wellIndex);
    ctx.fillStyle = `rgba(20, 10, 40, ${0.35 + 0.15 * blink})`;
    ctx.beginPath();
    ctx.arc(p.x + 8, p.y - 6, s * 0.34, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawCloudPuff(ctx, x, y, w, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#e8e4ff';
  for (const [dx, dy, r] of [[-0.35, 0.05, 0.28], [0, -0.12, 0.36], [0.35, 0.04, 0.27], [0.12, 0.14, 0.3], [-0.15, 0.16, 0.28]]) {
    ctx.beginPath();
    ctx.arc(x + dx * w, y + dy * w, r * w, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Clouds already standing on the board (they block light). */
export function drawClouds(ctx, clouds, t) {
  for (const c of clouds) {
    const p = cellCenter(c.cell);
    const bob = Math.sin(t * 1.2 + c.cell) * 2;
    drawCloudPuff(ctx, p.x, p.y - 6 + bob, BOARD.cell * 0.62, 0.82);
    ctx.save();
    ctx.fillStyle = '#4b4670';
    ctx.font = '700 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${c.pulses}`, p.x, p.y - 2 + bob);
    ctx.restore();
  }
}

export const cellLabel = (c) => `${'ABCDEFGHIJ'[cellX(c)]}${cellY(c) + 1}`;
