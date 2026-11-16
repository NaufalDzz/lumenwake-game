// Procedural art for a single board cell, drawn around (0,0) at tile size s: the floating islet,
// its carved canal arms, flowing golden light, the lighthouse source, gardens and mossy stone tiles.

import { DIRS } from './puzzle.js';
import { COLORS, roundRect, glowSprite } from './ui.js';

const VEC = { 1: [0, -1], 2: [1, 0], 4: [0, 1], 8: [-1, 0] };

function hash(n) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

/** The islet a canal is carved into. */
export function drawIslet(ctx, s, { kind, stone, seed = 0, hover = false }) {
  const half = s / 2 - s * 0.05;
  const r = s * 0.17;
  const depth = s * 0.075;
  let top0 = '#5a5ea6';
  let top1 = '#3b3f84';
  let side = '#232560';
  if (stone) {
    top0 = '#77809a';
    top1 = '#555c78';
    side = '#30344e';
  } else if (kind === 'target') {
    top0 = '#3f8d8a';
    top1 = '#2b5f72';
    side = '#183653';
  } else if (kind === 'source') {
    top0 = '#7a6aa8';
    top1 = '#4f4588';
    side = '#2a2560';
  }
  // cliff side
  roundRect(ctx, -half, -half + depth, half * 2, half * 2, r);
  ctx.fillStyle = side;
  ctx.fill();
  // top face
  roundRect(ctx, -half, -half, half * 2, half * 2, r);
  const g = ctx.createLinearGradient(-half, -half, half, half);
  g.addColorStop(0, hover ? lighten(top0) : top0);
  g.addColorStop(1, top1);
  ctx.fillStyle = g;
  ctx.fill();
  // rim light from the warm horizon
  ctx.save();
  roundRect(ctx, -half + 1, -half + 1, half * 2 - 2, half * 2 - 2, r);
  ctx.strokeStyle = stone ? 'rgba(220,225,240,0.25)' : 'rgba(255,214,180,0.22)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  // speckles and moss
  for (let i = 0; i < 7; i++) {
    const px = (hash(seed * 31 + i) - 0.5) * half * 1.6;
    const py = (hash(seed * 17 + i * 7) - 0.5) * half * 1.6;
    const pr = s * (0.012 + hash(seed + i * 13) * 0.02);
    ctx.fillStyle = stone ? (i % 2 ? 'rgba(110,190,140,0.55)' : 'rgba(30,34,60,0.35)') : i % 3 ? 'rgba(20,22,70,0.25)' : 'rgba(200,190,255,0.18)';
    ctx.beginPath();
    ctx.arc(px, py, stone && i % 2 ? pr * 2.2 : pr, 0, Math.PI * 2);
    ctx.fill();
  }
}

function lighten(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.min(255, Math.round(v * 1.18 + 12));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function armPath(ctx, bit, s, inward) {
  const [vx, vy] = VEC[bit];
  const e = s / 2;
  ctx.beginPath();
  if (inward) {
    ctx.moveTo(vx * e, vy * e);
    ctx.lineTo(0, 0);
  } else {
    ctx.moveTo(0, 0);
    ctx.lineTo(vx * e, vy * e);
  }
}

/** Carved canal arms for a port mask; `light` 0..1 fades the golden stream in, flowing away from `entry`. */
export function drawCanals(ctx, mask, s, { light = 0, entry = 0, time = 0, stone = false, reducedMotion = false }) {
  const cw = s * 0.27;
  const bits = DIRS.map((d) => d.bit).filter((b) => mask & b);
  ctx.save();
  ctx.lineCap = 'butt';
  // stone lip of the channel
  ctx.strokeStyle = stone ? 'rgba(200,205,225,0.55)' : 'rgba(150,150,225,0.55)';
  ctx.lineWidth = cw + s * 0.07;
  for (const b of bits) {
    armPath(ctx, b, s, false);
    ctx.stroke();
  }
  ctx.fillStyle = ctx.strokeStyle;
  ctx.beginPath();
  ctx.arc(0, 0, (cw + s * 0.07) / 2, 0, Math.PI * 2);
  ctx.fill();
  // deep water inside the channel
  ctx.strokeStyle = '#0c1035';
  ctx.lineWidth = cw;
  for (const b of bits) {
    armPath(ctx, b, s, false);
    ctx.stroke();
  }
  ctx.fillStyle = '#0c1035';
  ctx.beginPath();
  ctx.arc(0, 0, cw / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,110,210,0.35)';
  ctx.lineWidth = cw * 0.3;
  for (const b of bits) {
    armPath(ctx, b, s, false);
    ctx.stroke();
  }
  if (light > 0.01) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = light;
    ctx.strokeStyle = 'rgba(255,196,110,0.16)';
    ctx.lineWidth = cw * 2.1;
    for (const b of bits) {
      armPath(ctx, b, s, false);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = cw * 0.86;
    for (const b of bits) {
      armPath(ctx, b, s, false);
      ctx.stroke();
    }
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(0, 0, cw * 0.43, 0, Math.PI * 2);
    ctx.fill();
    // bright core, dashed and drifting downstream so the light visibly flows
    ctx.strokeStyle = COLORS.goldHot;
    ctx.lineWidth = cw * 0.34;
    ctx.setLineDash([s * 0.09, s * 0.11]);
    ctx.lineDashOffset = reducedMotion ? 0 : -time * s * 0.55;
    for (const b of bits) {
      armPath(ctx, b, s, b === entry);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/** Lighthouse: striped tower with a glowing lantern room. */
export function drawLighthouse(ctx, s, time) {
  const k = s / 100;
  ctx.save();
  ctx.translate(0, 6 * k);
  // rock footing
  ctx.fillStyle = '#2d2a5c';
  ctx.beginPath();
  ctx.ellipse(0, 18 * k, 22 * k, 8 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  // tower body
  ctx.beginPath();
  ctx.moveTo(-13 * k, 18 * k);
  ctx.lineTo(-8 * k, -22 * k);
  ctx.lineTo(8 * k, -22 * k);
  ctx.lineTo(13 * k, 18 * k);
  ctx.closePath();
  const body = ctx.createLinearGradient(-13 * k, 0, 13 * k, 0);
  body.addColorStop(0, '#fbe9dc');
  body.addColorStop(0.6, '#e9c9c0');
  body.addColorStop(1, '#a98aa8');
  ctx.fillStyle = body;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = COLORS.coral;
  for (const y of [8, -6]) {
    ctx.beginPath();
    ctx.moveTo(-20 * k, (y + 4) * k);
    ctx.lineTo(20 * k, (y - 2) * k);
    ctx.lineTo(20 * k, (y - 8) * k);
    ctx.lineTo(-20 * k, (y - 2) * k);
    ctx.fill();
  }
  ctx.restore();
  // door
  ctx.fillStyle = '#3b2a4a';
  roundRect(ctx, -3 * k, 10 * k, 6 * k, 8 * k, 3 * k);
  ctx.fill();
  // gallery and lantern
  ctx.fillStyle = '#3a2f5c';
  ctx.fillRect(-12 * k, -25 * k, 24 * k, 4 * k);
  const pulse = 0.85 + 0.15 * Math.sin(time * 3);
  ctx.fillStyle = `rgba(255,${226 + 20 * pulse},170,1)`;
  ctx.fillRect(-7 * k, -35 * k, 14 * k, 10 * k);
  ctx.strokeStyle = '#3a2f5c';
  ctx.lineWidth = 1.4 * k;
  ctx.beginPath();
  ctx.moveTo(0, -35 * k);
  ctx.lineTo(0, -25 * k);
  ctx.stroke();
  // roof
  ctx.fillStyle = '#4a3a6e';
  ctx.beginPath();
  ctx.moveTo(-10 * k, -35 * k);
  ctx.lineTo(0, -45 * k);
  ctx.lineTo(10 * k, -35 * k);
  ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  const gs = 60 * k * pulse;
  ctx.drawImage(glowSprite('rgba(255,210,130,1)'), -gs / 2, -30 * k - gs / 2, gs, gs);
  ctx.restore();
}

/** Garden: a round bed whose bud sleeps (dim) and blooms into mint leaves and peach petals when lit. */
export function drawGarden(ctx, s, wake, time, seed = 0) {
  const k = s / 100;
  ctx.save();
  // soil bed
  ctx.fillStyle = '#1d2a45';
  ctx.beginPath();
  ctx.ellipse(0, 4 * k, 27 * k, 23 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(143,240,200,${0.25 + wake * 0.5})`;
  ctx.lineWidth = 2 * k;
  ctx.stroke();
  if (wake > 0.02) {
    ctx.globalCompositeOperation = 'lighter';
    const gs = 120 * k * wake;
    ctx.globalAlpha = 0.7;
    ctx.drawImage(glowSprite('rgba(150,245,205,0.55)'), -gs / 2, -gs / 2, gs, gs);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  // leaves unfurl
  const leafCount = 6;
  for (let i = 0; i < leafCount; i++) {
    const a = (i / leafCount) * Math.PI * 2 + seed + Math.sin(time * 0.8 + i) * 0.05;
    const len = (9 + wake * 13) * k;
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = wake > 0.5 ? COLORS.mint : '#3c6f6b';
    ctx.globalAlpha = 0.55 + wake * 0.45;
    ctx.beginPath();
    ctx.ellipse(len * 0.75, 0, len * 0.6, len * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  if (wake < 0.5) {
    // sleeping bud with a tiny crescent above it
    ctx.fillStyle = '#5b8f88';
    ctx.beginPath();
    ctx.moveTo(0, -11 * k);
    ctx.quadraticCurveTo(8 * k, 0, 0, 6 * k);
    ctx.quadraticCurveTo(-8 * k, 0, 0, -11 * k);
    ctx.fill();
    ctx.fillStyle = 'rgba(220,215,255,0.8)';
    ctx.beginPath();
    ctx.arc(14 * k, -18 * k, 4.5 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b5f72';
    ctx.beginPath();
    ctx.arc(16 * k, -19.5 * k, 4 * k, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const bloom = Math.min(1, (wake - 0.5) * 2);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2 + time * 0.15;
      ctx.save();
      ctx.rotate(a);
      ctx.fillStyle = COLORS.peach;
      ctx.beginPath();
      ctx.ellipse(8 * k * bloom, 0, 8 * k * bloom, 5 * k * bloom, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = COLORS.goldHot;
    ctx.beginPath();
    ctx.arc(0, 0, 5 * k * bloom, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A lily pad or two drifting on open water cells, so empty space still feels alive. */
export function drawOpenWater(ctx, s, seed, time) {
  if (hash(seed) > 0.55) return;
  const a = hash(seed + 3) * Math.PI * 2 + Math.sin(time * 0.4 + seed) * 0.15;
  const r = s * (0.12 + hash(seed + 5) * 0.08);
  const x = (hash(seed + 7) - 0.5) * s * 0.4;
  const y = (hash(seed + 9) - 0.5) * s * 0.4;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(70,150,140,0.55)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, r, a + 0.35, a + Math.PI * 2 - 0.1);
  ctx.closePath();
  ctx.fill();
  if (hash(seed + 11) < 0.3) {
    ctx.fillStyle = 'rgba(255,190,200,0.85)';
    ctx.beginPath();
    ctx.arc(r * 0.2, -r * 0.2, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
