// Draws traced light: layered additive beams whose width follows their strength, motes flowing along
// them, halo-lantern glow fields, and the surge animation that runs out from the well on each pulse.

import { gridToWorld, cellCenter, BOARD } from './layout.js';
import { INK } from './palette.js';
import { glow } from './canvas-kit.js';

/** Give each segment the path distance at which light reaches its start, for the surge animation. */
function timeline(segments) {
  const reach = new Map();
  return segments.map((seg) => {
    const key = `${seg.ax.toFixed(2)},${seg.ay.toFixed(2)}`;
    const start = reach.get(key) ?? 0;
    const len = Math.hypot(seg.bx - seg.ax, seg.by - seg.ay);
    const endKey = `${seg.bx.toFixed(2)},${seg.by.toFixed(2)}`;
    if (!reach.has(endKey)) reach.set(endKey, start + len);
    return { ...seg, start, len };
  });
}

/**
 * @param trace   result of traceLight
 * @param t       seconds, animates motes
 * @param opts    { surge: path distance in cells the light has travelled (Infinity = all), alpha, ghost, contrast }
 */
export function drawBeams(ctx, trace, t, { surge = Infinity, alpha = 1, ghost = false, contrast = false, reduceMotion = false } = {}) {
  if (!trace) return;
  const segs = timeline(trace.segments);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const seg of segs) {
    if (surge <= seg.start) continue;
    const frac = Math.min(1, (surge - seg.start) / Math.max(0.001, seg.len));
    const a = gridToWorld(seg.ax, seg.ay);
    const bFull = gridToWorld(seg.bx, seg.by);
    const b = { x: a.x + (bFull.x - a.x) * frac, y: a.y + (bFull.y - a.y) * frac };
    const w = 3 + seg.strength * 1.6;
    const layers = ghost
      ? [[w * 2.4, 0.07], [w * 0.7, 0.28]]
      : [[w * 4.2, 0.07], [w * 2.2, 0.16], [w, 0.55], [Math.max(2, w * 0.35), contrast ? 1 : 0.9]];
    layers.forEach(([lw, la], k) => {
      ctx.strokeStyle = k === layers.length - 1 ? INK.beamCore : contrast ? '#fff1b0' : INK.beam;
      ctx.globalAlpha = la * alpha;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });
    if (!ghost && !reduceMotion && frac >= 1) {
      // motes travelling along the beam
      const len = seg.len * BOARD.cell;
      const count = Math.max(1, Math.round(seg.len * 1.4));
      for (let i = 0; i < count; i++) {
        const u = ((t * 90 + (i * len) / count) % len) / len;
        const x = a.x + (b.x - a.x) * u;
        const y = a.y + (b.y - a.y) * u;
        ctx.globalAlpha = 0.8 * alpha;
        ctx.fillStyle = '#fffbe8';
        ctx.beginPath();
        ctx.arc(x, y, 1.6 + seg.strength * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
  if (!ghost && surge === Infinity) {
    for (const halo of trace.halos) {
      const c = cellCenter(halo.cell);
      for (const n of halo.reach) {
        const nc = cellCenter(n);
        glow(ctx, nc.x, nc.y, BOARD.cell * 0.55, 'rgba(255, 220, 140, 0.32)', alpha);
      }
      glow(ctx, c.x, c.y, BOARD.cell * 1.1, 'rgba(255, 220, 140, 0.4)', alpha);
    }
  }
}

/** Total path length of a trace in cells, to time the surge animation. */
export function traceLength(trace) {
  if (!trace) return 0;
  return timeline(trace.segments).reduce((m, s) => Math.max(m, s.start + s.len), 0);
}
