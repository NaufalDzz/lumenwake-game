// The dusk sky behind each island: a cached gradient with stars, a low sun, far floating isles and a sea
// of cloud, plus a few live layers (twinkles, drifting wisps, storm flashes) drawn every frame.

import { ISLAND_PALETTES } from './palette.js';
import { glow } from './canvas-kit.js';
import { createRng } from '../rules/rng.js';

const W = 1280;
const H = 720;
const cache = new Map();

export function makeLayer(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function farIsle(ctx, x, y, w, color, rim) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.quadraticCurveTo(x - w * 0.3, y - w * 0.12, x, y - w * 0.1);
  ctx.quadraticCurveTo(x + w * 0.35, y - w * 0.14, x + w / 2, y);
  ctx.quadraticCurveTo(x + w * 0.2, y + w * 0.18, x + w * 0.05, y + w * 0.42);
  ctx.quadraticCurveTo(x - w * 0.1, y + w * 0.2, x - w / 2, y);
  ctx.fill();
  ctx.strokeStyle = rim;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.quadraticCurveTo(x - w * 0.3, y - w * 0.12, x, y - w * 0.1);
  ctx.quadraticCurveTo(x + w * 0.35, y - w * 0.14, x + w / 2, y);
  ctx.stroke();
}

function paintSky(islandId) {
  const p = ISLAND_PALETTES[islandId];
  const layer = makeLayer(W, H);
  const ctx = layer.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, p.skyTop);
  g.addColorStop(0.55, p.skyMid);
  g.addColorStop(0.86, p.horizon);
  g.addColorStop(1, p.skyMid);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const rng = createRng(islandId.length * 977 + 13);
  for (let i = 0; i < 170; i++) {
    const y = rng.next() * H * 0.62;
    ctx.globalAlpha = 0.25 + rng.next() * 0.6 * (1 - y / (H * 0.7));
    ctx.fillStyle = '#fff6e0';
    const s = rng.next() < 0.1 ? 2 : 1;
    ctx.fillRect(rng.next() * W, y, s, s);
  }
  ctx.globalAlpha = 1;
  // a low sun or moon sinking into the cloud sea
  glow(ctx, 1010, 600, 260, p.haze.replace(/[\d.]+\)$/, '0.55)'));
  glow(ctx, 1010, 600, 70, 'rgba(255, 240, 210, 0.9)');
  // far floating isles
  for (let i = 0; i < 7; i++) {
    const x = rng.next() * W;
    const y = 330 + rng.next() * 230;
    farIsle(ctx, x, y, 50 + rng.next() * 120, p.farIsland, 'rgba(255,230,200,0.12)');
  }
  // cloud sea
  for (let i = 0; i < 46; i++) {
    const x = (i / 46) * W + rng.next() * 40;
    const y = 640 + rng.next() * 50;
    const r = 50 + rng.next() * 70;
    const cg = ctx.createRadialGradient(x, y, 0, x, y, r);
    cg.addColorStop(0, 'rgba(255, 220, 230, 0.32)');
    cg.addColorStop(1, 'rgba(255, 220, 230, 0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return layer;
}

/** Draw the sky for an island; `t` in seconds animates twinkles and drifting wisps. */
export function drawSky(ctx, islandId, t, { stormy = false, flash = 0, reduceMotion = false } = {}) {
  if (!cache.has(islandId)) cache.set(islandId, paintSky(islandId));
  ctx.drawImage(cache.get(islandId), 0, 0);
  const motion = reduceMotion ? 0 : t;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 18; i++) {
    const x = (i * 211.7) % W;
    const y = (i * 97.3) % 300;
    const a = 0.5 + 0.5 * Math.sin(motion * 1.7 + i * 2.1);
    ctx.fillStyle = `rgba(255, 250, 230, ${0.5 * a})`;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();
  for (let i = 0; i < 5; i++) {
    const x = ((motion * (8 + i * 3) + i * 300) % (W + 400)) - 200;
    const y = 120 + i * 90;
    const wisp = ctx.createRadialGradient(x, y, 0, x, y, 160);
    wisp.addColorStop(0, stormy ? 'rgba(120, 110, 170, 0.16)' : 'rgba(255, 230, 240, 0.07)');
    wisp.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = wisp;
    ctx.fillRect(x - 160, y - 160, 320, 320);
  }
  if (flash > 0) {
    ctx.fillStyle = `rgba(220, 220, 255, ${0.25 * flash})`;
    ctx.fillRect(0, 0, W, H);
  }
}
