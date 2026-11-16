// Procedural art for the relays and the Lumen Well. Every relay sits on a small stone plinth so it reads
// as an object placed on the island; lit relays glow.

import { RELAY_COLORS } from './palette.js';
import { glow } from './canvas-kit.js';
import { DIRS } from '../rules/grid.js';

function plinth(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(8, 8, 28, 0.35)';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + s * 0.26, s * 0.32, s * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5e5980';
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.2, s * 0.3, s * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8c86b0';
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.16, s * 0.3, s * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Draw a relay of `type` centred at x,y in a cell of size s. `lit` adds glow; `alpha` for ghosts. */
export function drawRelay(ctx, type, orient, x, y, s, { lit = false, alpha = 1, t = 0 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  plinth(ctx, x, y, s);
  if (lit) glow(ctx, x, y - 4, s * 0.55, 'rgba(255, 236, 170, 0.5)', alpha);
  const c = RELAY_COLORS[type];
  if (type === 'mirror') {
    const d = s * 0.34;
    const sign = orient === 0 ? -1 : 1; // "/" rises to the right
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#4c4870';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(x - d, y - sign * d);
    ctx.lineTo(x + d, y + sign * d);
    ctx.stroke();
    const g = ctx.createLinearGradient(x - d, y - d, x + d, y + d);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.5, c);
    g.addColorStop(1, '#8fa2d8');
    ctx.strokeStyle = g;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x - d, y - sign * d);
    ctx.lineTo(x + d, y + sign * d);
    ctx.stroke();
  } else if (type === 'prism') {
    const r = s * 0.27;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.2);
    ctx.lineTo(x + r, y + r * 0.6);
    ctx.lineTo(x - r, y + r * 0.6);
    ctx.closePath();
    const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    g.addColorStop(0, 'rgba(255, 190, 230, 0.95)');
    g.addColorStop(0.5, 'rgba(184, 244, 255, 0.95)');
    g.addColorStop(1, 'rgba(200, 255, 190, 0.95)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.2);
    ctx.lineTo(x, y + r * 0.6);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (type === 'lens') {
    const r = s * 0.24;
    ctx.fillStyle = 'rgba(200, 235, 255, 0.45)';
    ctx.beginPath();
    ctx.ellipse(x, y - 2, r, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x - r * 0.25, y - 2 - r * 0.25, r * 0.5, Math.PI * 1.1, Math.PI * 1.6);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.round(s * 0.2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', x, y - 1);
  } else if (type === 'halo') {
    const r = s * 0.2;
    ctx.strokeStyle = '#3e3a60';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.16);
    ctx.lineTo(x, y + r * 0.6);
    ctx.stroke();
    ctx.fillStyle = lit ? '#fff1b8' : '#c9b98a';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.8, y + r * 0.6);
    ctx.lineTo(x + r * 0.8, y + r * 0.6);
    ctx.lineTo(x + r, y - r * 0.8);
    ctx.lineTo(x - r, y - r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6a5a3a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y - r * 0.8, r * 0.8, Math.PI, 0);
    ctx.stroke();
    ctx.strokeStyle = lit ? 'rgba(255, 230, 150, 0.9)' : 'rgba(255, 230, 150, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - 2, s * 0.36 + Math.sin(t * 3) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** The Lumen Well's glowing orb with arrows for the direction(s) it shines. */
export function drawWell(ctx, x, y, s, dirs, t, power = 1) {
  const pulse = 0.8 + 0.2 * Math.sin(t * 2.4);
  glow(ctx, x, y, s * 0.9 * pulse, 'rgba(255, 230, 160, 0.55)');
  const g = ctx.createRadialGradient(x, y, 2, x, y, s * 0.22);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.5, '#ffe9a8');
  g.addColorStop(1, '#ffb366');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, s * 0.2 * (0.95 + 0.05 * pulse), 0, Math.PI * 2);
  ctx.fill();
  for (const d of dirs) {
    const dx = DIRS[d].dx;
    const dy = DIRS[d].dy;
    const tipX = x + dx * s * 0.46;
    const tipY = y + dy * s * 0.46;
    ctx.fillStyle = '#fff4cc';
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(x + dx * s * 0.3 - dy * 7, y + dy * s * 0.3 + dx * 7);
    ctx.lineTo(x + dx * s * 0.3 + dy * 7, y + dy * s * 0.3 - dx * 7);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#3a2a10';
  ctx.font = `800 ${Math.round(s * 0.2)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(power), x, y + 1);
}
