// Board renderer: lays a stage out in a rectangle, tweens tile turns, ripples the light outward from the
// lighthouse when routes connect, blooms gardens, draws tide rings, particles, hover and keyboard focus.

import { traceLight } from './puzzle.js';
import { COLORS, roundRect, glowSprite, easeOutBack, clamp } from './ui.js';
import { drawIslet, drawCanals, drawLighthouse, drawGarden, drawOpenWater } from './tile-art.js';

export function layoutBoard(game, rect, maxTile = 104) {
  const pad = 22;
  const s = Math.floor(Math.min(maxTile, (rect.w - pad * 2) / game.cols, (rect.h - pad * 2) / game.rows));
  const w = s * game.cols;
  const h = s * game.rows;
  return { s, x: Math.round(rect.x + (rect.w - w) / 2), y: Math.round(rect.y + (rect.h - h) / 2), w, h, pad };
}

export function cellAt(layout, game, px, py) {
  const c = Math.floor((px - layout.x) / layout.s);
  const r = Math.floor((py - layout.y) / layout.s);
  if (r < 0 || c < 0 || r >= game.rows || c >= game.cols) return null;
  return { r, c };
}

export function createBoardView({ reducedMotion = false } = {}) {
  let game = null;
  let turnAnim = [];
  let shakeAnim = [];
  let litAt = [];
  let light = [];
  let wake = [];
  let flow = null;
  let rings = [];
  let particles = [];
  let ringClock = 0;
  let nowTime = 0;

  function attach(newGame, time = 0) {
    game = newGame;
    const n = game.tiles.length;
    turnAnim = new Array(n).fill(null);
    shakeAnim = new Array(n).fill(-10);
    litAt = new Array(n).fill(Infinity);
    light = new Array(n).fill(0);
    wake = new Array(n).fill(0);
    particles = [];
    rings = [];
    flow = null;
    sync(time, true);
  }

  /** Recompute light after any change; newly lit tiles light in a wave ordered by distance from the source. */
  function sync(time, instant = false) {
    const next = traceLight(game);
    let minDepth = Infinity;
    next.lit.forEach((on, i) => {
      if (on && !(flow && flow.lit[i])) minDepth = Math.min(minDepth, next.depth[i]);
    });
    next.lit.forEach((on, i) => {
      if (!on) litAt[i] = Infinity;
      else if (!(flow && flow.lit[i])) litAt[i] = instant ? time - 1 : time + (next.depth[i] - minDepth) * (reducedMotion ? 0 : 0.045);
    });
    if (instant) next.lit.forEach((on, i) => {
      light[i] = on ? 1 : 0;
      wake[i] = on ? 1 : 0;
    });
    flow = next;
    return next;
  }

  function onTurn(index, dir, time, layout) {
    turnAnim[index] = { from: (-dir * Math.PI) / 2, start: time };
    const t = game.tiles[index];
    const cx = layout.x + (t.c + 0.5) * layout.s;
    const cy = layout.y + (t.r + 0.5) * layout.s;
    rings.push({ x: cx, y: cy, start: time, max: layout.s * 0.75, strong: true });
    spray(cx, cy, layout.s, 'rgba(160,190,255,1)', reducedMotion ? 3 : 8, 0.6);
    sync(time);
  }

  function onBlocked(index, time) {
    shakeAnim[index] = time;
  }

  function spray(x, y, s, color, count, speed = 1) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (0.4 + Math.random()) * s * 1.4 * speed;
      particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - s * 0.6 * speed, life: 0, max: 0.6 + Math.random() * 0.6, size: 3 + Math.random() * 5, color });
    }
  }

  function celebrate(layout) {
    if (!game) return;
    game.tiles.forEach((t) => {
      if (t.kind !== 'target' && t.kind !== 'source') return;
      const cx = layout.x + (t.c + 0.5) * layout.s;
      const cy = layout.y + (t.r + 0.5) * layout.s;
      spray(cx, cy, layout.s * 0.8, 'rgba(255,214,140,1)', reducedMotion ? 6 : 26, 1.2);
      spray(cx, cy, layout.s * 0.6, 'rgba(150,245,205,1)', reducedMotion ? 4 : 16, 1);
    });
  }

  function step(dt, time, layout) {
    nowTime = time;
    if (!game || !flow) return;
    const rate = reducedMotion ? 30 : 7;
    game.tiles.forEach((t, i) => {
      const goal = time >= litAt[i] ? 1 : 0;
      light[i] += (goal - light[i]) * clamp(dt * rate, 0, 1);
      if (t.kind === 'target') {
        const before = wake[i];
        wake[i] += (goal - wake[i]) * clamp(dt * (goal ? 2.6 : 4), 0, 1);
        if (before < 0.5 && wake[i] >= 0.5) {
          const cx = layout.x + (t.c + 0.5) * layout.s;
          const cy = layout.y + (t.r + 0.5) * layout.s;
          spray(cx, cy, layout.s * 0.7, 'rgba(150,245,205,1)', reducedMotion ? 5 : 22, 1);
          spray(cx, cy, layout.s * 0.5, 'rgba(255,190,150,1)', reducedMotion ? 3 : 12, 0.8);
          rings.push({ x: cx, y: cy, start: time, max: layout.s * 1.4, strong: true, mint: true });
        }
      }
    });
    ringClock -= dt;
    if (ringClock <= 0 && !reducedMotion) {
      ringClock = 0.55 + Math.random() * 0.6;
      rings.push({ x: layout.x + Math.random() * layout.w, y: layout.y + Math.random() * layout.h, start: time, max: layout.s * (0.4 + Math.random() * 0.5) });
    }
    rings = rings.filter((r) => time - r.start < 2.6);
    for (const p of particles) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 160 * dt;
      p.vx *= 0.985;
    }
    particles = particles.filter((p) => p.life < p.max);
  }

  function drawBasin(ctx, layout, time) {
    const { x, y, w, h, pad } = layout;
    ctx.save();
    // soft drop shadow and a warm halo under the floating board
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.25;
    ctx.drawImage(glowSprite('rgba(255,170,120,0.6)'), x - 80, y + h - 40, w + 160, 140);
    ctx.restore();
    ctx.save();
    ctx.shadowColor = 'rgba(2,3,18,0.7)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 18;
    roundRect(ctx, x - pad, y - pad, w + pad * 2, h + pad * 2, 30);
    const rim = ctx.createLinearGradient(0, y - pad, 0, y + h + pad);
    rim.addColorStop(0, '#6b6aa8');
    rim.addColorStop(1, '#2c2b62');
    ctx.fillStyle = rim;
    ctx.fill();
    ctx.restore();
    roundRect(ctx, x - pad + 7, y - pad + 7, w + pad * 2 - 14, h + pad * 2 - 14, 24);
    const water = ctx.createLinearGradient(0, y, 0, y + h);
    water.addColorStop(0, '#1a2069');
    water.addColorStop(1, '#0b0f3a');
    ctx.fillStyle = water;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // slow caustic swells
    ctx.strokeStyle = 'rgba(120,140,255,0.07)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const yy = y - pad + (i + 0.5) * ((h + pad * 2) / 14);
      ctx.beginPath();
      for (let xx = x - pad; xx <= x + w + pad; xx += 24) {
        const o = reducedMotion ? 0 : Math.sin(xx * 0.03 + time * 0.8 + i * 1.7) * 4;
        if (xx === x - pad) ctx.moveTo(xx, yy + o);
        else ctx.lineTo(xx, yy + o);
      }
      ctx.stroke();
    }
    // tide rings
    for (const r of rings) {
      const t = (time - r.start) / 2.6;
      const rad = r.max * (0.15 + t);
      ctx.strokeStyle = r.mint ? `rgba(150,245,205,${(1 - t) * 0.6})` : `rgba(170,190,255,${(1 - t) * (r.strong ? 0.45 : 0.18)})`;
      ctx.lineWidth = r.strong ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, rad, rad * 0.62, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    // moss tufts on the rim
    ctx.fillStyle = 'rgba(120,200,160,0.55)';
    for (let i = 0; i < 18; i++) {
      const t = i / 18;
      const px = x - pad + 14 + t * (w + pad * 2 - 28);
      ctx.beginPath();
      ctx.ellipse(px, y - pad + 4, 6 + (i % 3) * 3, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Draw the whole board. opts: hover {r,c}, cursor {r,c}, showCursor, dim (0..1) and preview (no input chrome).
   */
  function draw(ctx, layout, time, opts = {}) {
    if (!game) return;
    const { s } = layout;
    drawBasin(ctx, layout, time);
    // pass 1: open water decorations
    game.tiles.forEach((t, i) => {
      if (t.kind !== 'empty') return;
      ctx.save();
      ctx.translate(layout.x + (t.c + 0.5) * s, layout.y + (t.r + 0.5) * s);
      drawOpenWater(ctx, s, i * 7 + game.id * 131, time);
      ctx.restore();
    });
    // pass 2: islets and canals
    game.tiles.forEach((t, i) => {
      if (t.kind === 'empty') return;
      const cx = layout.x + (t.c + 0.5) * s;
      const cy = layout.y + (t.r + 0.5) * s;
      let angle = 0;
      let pop = 1;
      const anim = turnAnim[i];
      if (anim) {
        const dur = reducedMotion ? 0.06 : 0.22;
        const k = clamp((time - anim.start) / dur, 0, 1);
        angle = anim.from * (1 - easeOutBack(k));
        pop = 1 + Math.sin(k * Math.PI) * 0.06;
        if (k >= 1) turnAnim[i] = null;
      }
      const shake = time - shakeAnim[i] < 0.3 ? Math.sin((time - shakeAnim[i]) * 60) * 4 * (1 - (time - shakeAnim[i]) / 0.3) : 0;
      const hovered = opts.hover && opts.hover.r === t.r && opts.hover.c === t.c;
      ctx.save();
      ctx.translate(cx + shake, cy);
      // floating shadow on the water
      ctx.fillStyle = 'rgba(3,5,25,0.45)';
      ctx.beginPath();
      ctx.ellipse(0, s * 0.42, s * 0.4, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      const bob = reducedMotion || opts.preview ? 0 : Math.sin(time * 1.2 + t.r * 0.9 + t.c * 1.3) * 1.2;
      ctx.translate(0, bob - (hovered && !t.locked ? 2 : 0));
      ctx.rotate(angle);
      ctx.scale(pop, pop);
      drawIslet(ctx, s, { kind: t.kind, stone: t.stone, seed: i + game.id * 97, hover: hovered && !t.locked });
      drawCanals(ctx, t.mask, s, { light: light[i], entry: flow ? flow.entry[i] : 0, time, stone: t.stone, reducedMotion });
      ctx.restore();
      ctx.save();
      ctx.translate(cx + shake, cy + bob);
      if (t.kind === 'source') drawLighthouse(ctx, s, time);
      if (t.kind === 'target') drawGarden(ctx, s, wake[i], time, i);
      if (t.stone) {
        // a carved lock rune marks the stone as fixed
        ctx.strokeStyle = 'rgba(230,235,255,0.6)';
        ctx.lineWidth = Math.max(1.5, s * 0.022);
        ctx.beginPath();
        ctx.arc(s * 0.3, -s * 0.3, s * 0.06, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s * 0.3, -s * 0.24);
        ctx.lineTo(s * 0.3, -s * 0.2);
        ctx.stroke();
      }
      ctx.restore();
    });
    // lighthouse beam sweeping across the board
    game.tiles.forEach((t) => {
      if (t.kind !== 'source') return;
      const cx = layout.x + (t.c + 0.5) * s;
      const cy = layout.y + (t.r + 0.5) * s - s * 0.24;
      const a = reducedMotion ? -0.6 : time * 0.7;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const len = s * 3.2;
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, len);
      g.addColorStop(0, 'rgba(255,220,150,0.30)');
      g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = g;
      for (const off of [0, Math.PI]) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, len, a + off - 0.16, a + off + 0.16);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    });
    // particles
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      const k = 1 - p.life / p.max;
      const size = p.size * (0.6 + k) * 2;
      ctx.globalAlpha = k;
      ctx.drawImage(glowSprite(p.color), p.x - size / 2, p.y - size / 2, size, size);
    }
    ctx.restore();
    if (opts.preview) return;
    // hover highlight
    if (opts.hover && !opts.showCursor) highlight(ctx, layout, opts.hover, time, false);
    if (opts.cursor && opts.showCursor) highlight(ctx, layout, opts.cursor, time, true);
  }

  function highlight(ctx, layout, cell, time, focus) {
    if (cell.r >= game.rows || cell.c >= game.cols) return;
    const t = game.tiles[cell.r * game.cols + cell.c];
    const { s } = layout;
    const x = layout.x + cell.c * s;
    const y = layout.y + cell.r * s;
    ctx.save();
    roundRect(ctx, x + 2, y + 2, s - 4, s - 4, s * 0.2);
    if (focus) {
      ctx.strokeStyle = COLORS.mint;
      ctx.lineWidth = 3;
      ctx.setLineDash([s * 0.12, s * 0.08]);
      ctx.lineDashOffset = -time * 30;
      ctx.shadowColor = 'rgba(143,240,200,0.8)';
      ctx.shadowBlur = 10;
    } else {
      ctx.strokeStyle = t.locked ? 'rgba(201,198,240,0.35)' : 'rgba(255,240,210,0.8)';
      ctx.lineWidth = 2;
    }
    ctx.stroke();
    ctx.restore();
    if (!t.locked) {
      // tiny clockwise arrow hint in the corner
      ctx.save();
      ctx.translate(x + s - s * 0.17, y + s * 0.17);
      ctx.strokeStyle = focus ? COLORS.mint : COLORS.goldHot;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.07, -Math.PI * 0.9, Math.PI * 0.4);
      ctx.stroke();
      const ax = Math.cos(Math.PI * 0.4) * s * 0.07;
      const ay = Math.sin(Math.PI * 0.4) * s * 0.07;
      ctx.beginPath();
      ctx.moveTo(ax - 4, ay - 1);
      ctx.lineTo(ax, ay + 1);
      ctx.lineTo(ax + 1, ay - 4);
      ctx.stroke();
      ctx.restore();
    }
  }

  return {
    attach,
    sync,
    onTurn,
    onBlocked,
    celebrate,
    step,
    draw,
    get flow() {
      return flow;
    },
    get now() {
      return nowTime;
    },
  };
}
