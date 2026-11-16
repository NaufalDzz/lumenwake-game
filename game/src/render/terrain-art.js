// Paints an island's terrain once into a cached layer: grassy cell tops that merge into one landmass,
// earthen cliffs hanging under every exposed edge (so the island reads as floating), sky rifts, standing
// stones, the well's stone basin and the A-J / 1-7 coordinates that storm forecasts refer to.

import { COLS, ROWS, cellIndex } from '../rules/grid.js';
import { BOARD, WORLD } from './layout.js';
import { ISLAND_PALETTES } from './palette.js';
import { makeLayer } from './sky-backdrop.js';
import { createRng } from '../rules/rng.js';
import { text } from './canvas-kit.js';

const solid = (terrain, x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && terrain[cellIndex(x, y)] !== 'void';

let cached = { key: null, layer: null };

export function terrainLayer(board, islandId, seed) {
  const key = `${seed}:${board.island}`;
  if (cached.key === key) return cached.layer;
  const layer = makeLayer(WORLD.w, WORLD.h);
  paintTerrain(layer.getContext('2d'), board, islandId, seed);
  cached = { key, layer };
  return layer;
}

function paintTerrain(ctx, board, islandId, seed) {
  const p = ISLAND_PALETTES[islandId];
  const { terrain } = board;
  const s = BOARD.cell;
  const rng = createRng(seed * 31 + board.island);

  // drop shadow far below the landmass
  ctx.save();
  ctx.filter = 'blur(18px)';
  ctx.fillStyle = 'rgba(8, 6, 30, 0.45)';
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (solid(terrain, x, y)) ctx.fillRect(BOARD.x + x * s + 10, BOARD.y + y * s + 46, s, s * 0.7);
  }
  ctx.restore();

  // cliffs under exposed bottom edges
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (!solid(terrain, x, y) || solid(terrain, x, y + 1)) continue;
    const left = BOARD.x + x * s;
    const top = BOARD.y + (y + 1) * s - 6;
    const depth = 26 + rng.int(0, 16);
    const g = ctx.createLinearGradient(0, top, 0, top + depth);
    g.addColorStop(0, p.cliff);
    g.addColorStop(1, p.cliffDark);
    ctx.fillStyle = g;
    ctx.beginPath();
    const inL = solid(terrain, x - 1, y) && !solid(terrain, x - 1, y + 1) ? 0 : 8;
    const inR = solid(terrain, x + 1, y) && !solid(terrain, x + 1, y + 1) ? 0 : 8;
    ctx.moveTo(left, top);
    ctx.lineTo(left + s, top);
    ctx.lineTo(left + s - inR, top + depth * 0.7);
    ctx.quadraticCurveTo(left + s / 2 + rng.int(-10, 10), top + depth + 10, left + inL, top + depth * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 2;
    for (let k = 1; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(left + 6, top + k * 9);
      ctx.lineTo(left + s - 6, top + k * 9 + rng.int(-2, 2));
      ctx.stroke();
    }
    // hanging roots
    ctx.strokeStyle = 'rgba(60, 40, 30, 0.7)';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 2; k++) {
      const rx = left + 12 + rng.next() * (s - 24);
      ctx.beginPath();
      ctx.moveTo(rx, top + depth * 0.6);
      ctx.quadraticCurveTo(rx + rng.int(-6, 6), top + depth + 8, rx + rng.int(-4, 4), top + depth + 14 + rng.int(0, 10));
      ctx.stroke();
    }
  }

  // tops
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const left = BOARD.x + x * s;
    const top = BOARD.y + y * s;
    if (!solid(terrain, x, y)) {
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = 'rgba(220, 210, 255, 0.16)';
      ctx.lineWidth = 1;
      ctx.strokeRect(left + 6.5, top + 6.5, s - 13, s - 13);
      ctx.setLineDash([]);
      continue;
    }
    const n = !solid(terrain, x, y - 1);
    const e = !solid(terrain, x + 1, y);
    const so = !solid(terrain, x, y + 1);
    const w = !solid(terrain, x - 1, y);
    const r = 16;
    const radii = [n && w ? r : 0, n && e ? r : 0, so && e ? r : 0, so && w ? r : 0];
    const g = ctx.createLinearGradient(left, top, left + s, top + s);
    const light = (x + y) % 2 === 0;
    g.addColorStop(0, light ? p.landTop : shade(p.landTop, -8));
    g.addColorStop(1, light ? p.landTop2 : shade(p.landTop2, -8));
    ctx.fillStyle = g;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(left, top, s, s, radii);
    else ctx.rect(left, top, s, s);
    ctx.fill();
    // rim light on exposed north/west edges, shade on south/east
    ctx.lineWidth = 3;
    ctx.strokeStyle = p.landEdge;
    ctx.globalAlpha = 0.55;
    if (n) line(ctx, left + (w ? r : 0), top + 1.5, left + s - (e ? r : 0), top + 1.5);
    if (w) line(ctx, left + 1.5, top + (n ? r : 0), left + 1.5, top + s - (so ? r : 0));
    ctx.globalAlpha = 1;
    // grass tufts and pebbles
    for (let k = 0; k < 4; k++) {
      const gx = left + 10 + rng.next() * (s - 20);
      const gy = top + 12 + rng.next() * (s - 20);
      ctx.strokeStyle = 'rgba(210, 255, 210, 0.28)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(gx - 3, gy);
      ctx.lineTo(gx - 1, gy - 5);
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + 1, gy - 7);
      ctx.moveTo(gx + 3, gy);
      ctx.lineTo(gx + 4, gy - 4);
      ctx.stroke();
    }
    if (rng.chance(0.4)) {
      ctx.fillStyle = 'rgba(30, 40, 60, 0.18)';
      ctx.beginPath();
      ctx.ellipse(left + 14 + rng.next() * (s - 28), top + 14 + rng.next() * (s - 28), 4, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // material: soft mottling, a gentle inner bevel per plot and a darker turf lip on exposed south edges.
  // Uses its own random stream so stones and cliffs keep their shapes.
  const mat = createRng(seed * 97 + board.island + 7);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (!solid(terrain, x, y)) continue;
    const left = BOARD.x + x * s;
    const top = BOARD.y + y * s;
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, s, s);
    ctx.clip();
    for (let k = 0; k < 3; k++) {
      const mx = left + mat.next() * s;
      const my = top + mat.next() * s;
      const mr = 14 + mat.next() * 18;
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
      g.addColorStop(0, k === 0 ? 'rgba(255, 255, 220, 0.09)' : 'rgba(10, 40, 30, 0.10)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(left, top, s, s);
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 240, 0.10)';
    line(ctx, left + 4, top + 3, left + s - 4, top + 3);
    line(ctx, left + 3, top + 4, left + 3, top + s - 4);
    ctx.strokeStyle = 'rgba(5, 25, 25, 0.16)';
    line(ctx, left + 4, top + s - 3, left + s - 4, top + s - 3);
    line(ctx, left + s - 3, top + 4, left + s - 3, top + s - 4);
    if (!solid(terrain, x, y + 1)) {
      const lip = ctx.createLinearGradient(0, top + s - 12, 0, top + s);
      lip.addColorStop(0, 'rgba(15, 45, 30, 0)');
      lip.addColorStop(1, 'rgba(15, 45, 30, 0.38)');
      ctx.fillStyle = lip;
      ctx.fillRect(left, top + s - 12, s, 12);
    }
    ctx.restore();
  }

  // subtle cell seams so the grid stays readable
  ctx.strokeStyle = 'rgba(10, 30, 30, 0.16)';
  ctx.lineWidth = 1;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (solid(terrain, x, y)) ctx.strokeRect(BOARD.x + x * s + 0.5, BOARD.y + y * s + 0.5, s - 1, s - 1);
  }

  for (let i = 0; i < terrain.length; i++) {
    const cx = BOARD.x + ((i % COLS) + 0.5) * s;
    const cy = BOARD.y + (Math.floor(i / COLS) + 0.5) * s;
    if (terrain[i] === 'rock') drawStandingStone(ctx, cx, cy, s, rng);
    if (terrain[i] === 'well') drawWellBasin(ctx, cx, cy, s);
  }

  for (let x = 0; x < COLS; x++) text(ctx, 'ABCDEFGHIJ'[x], BOARD.x + (x + 0.5) * s, BOARD.y - 8, { size: 12, color: 'rgba(230,225,255,0.55)', align: 'center', shadow: false });
  for (let y = 0; y < ROWS; y++) text(ctx, String(y + 1), BOARD.x - 12, BOARD.y + (y + 0.5) * s + 4, { size: 12, color: 'rgba(230,225,255,0.55)', align: 'center', shadow: false });
}

function line(ctx, ax, ay, bx, by) {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, v + amt));
  return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
}

function drawStandingStone(ctx, cx, cy, s, rng) {
  ctx.fillStyle = 'rgba(10, 10, 30, 0.35)';
  ctx.beginPath();
  ctx.ellipse(cx + 4, cy + s * 0.3, s * 0.3, s * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createLinearGradient(cx - 16, 0, cx + 16, 0);
  g.addColorStop(0, '#9a96b8');
  g.addColorStop(1, '#55506f');
  ctx.fillStyle = g;
  ctx.beginPath();
  const lean = rng.int(-4, 4);
  ctx.moveTo(cx - 15, cy + s * 0.3);
  ctx.lineTo(cx - 12 + lean, cy - s * 0.32);
  ctx.quadraticCurveTo(cx + lean, cy - s * 0.44, cx + 12 + lean, cy - s * 0.3);
  ctx.lineTo(cx + 16, cy + s * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(160, 230, 255, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 4 + lean / 2, cy - 10);
  ctx.lineTo(cx + 3 + lean / 2, cy - 2);
  ctx.lineTo(cx - 3 + lean / 2, cy + 6);
  ctx.stroke();
}

function drawWellBasin(ctx, cx, cy, s) {
  ctx.fillStyle = 'rgba(10, 10, 30, 0.35)';
  ctx.beginPath();
  ctx.ellipse(cx + 3, cy + 8, s * 0.42, s * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(cx, cy - 4, 4, cx, cy, s * 0.42);
  g.addColorStop(0, '#d9d2f0');
  g.addColorStop(1, '#6d6790');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#2b2550';
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.27, 0, Math.PI * 2);
  ctx.fill();
}
