// Composes the island board for one frame: terrain, storm forecast, light (the live preview of the next
// pulse, a ghost preview while hovering a placement, or the surge of a released pulse), the well, relays,
// blooms with their status, clouds, and the keeper's cursor.

import { BOARD, cellCenter, cellLeft, cellTop } from './layout.js';
import { cellX, cellY } from '../rules/grid.js';
import { terrainLayer } from './terrain-art.js';
import { drawBeams } from './beam-art.js';
import { drawRelay, drawWell } from './relay-art.js';
import { drawBloom, drawBloomStatus } from './bloom-art.js';
import { drawForecast, drawClouds } from './storm-art.js';
import { totalLight, distinctSources } from '../rules/light-trace.js';
import { SPECIES } from '../rules/blooms.js';
import { wellDirections } from '../rules/expedition.js';
import { ISLANDS } from '../rules/islands.js';
import { INK } from './palette.js';
import { easeOut } from './canvas-kit.js';

/**
 * @param view { run, preview, ghost: {cell,type,orient,preview,blocked} | null, cursor, hover, pulse: {event, age} | null, t, settings }
 */
export function drawBoard(ctx, view) {
  const { run, preview, ghost, pulse, t, settings } = view;
  const s = BOARD.cell;
  const islandId = ISLANDS[run.board.island].id;
  ctx.drawImage(terrainLayer(run.board, islandId, run.seed), 0, 0);

  const planning = run.phase === 'plan' && !pulse;
  if (planning) drawForecast(ctx, run.forecast, t, run.board.wellIndex);

  // light
  const surging = pulse && pulse.age < 1.2;
  const shown = ghost && !ghost.blocked ? ghost.preview : preview;
  if (surging) {
    drawBeams(ctx, pulse.event.trace, t, { surge: easeOut(pulse.age / 0.75) * 16, contrast: settings.contrast, reduceMotion: settings.reduceMotion });
  } else if (shown && run.phase === 'plan') {
    drawBeams(ctx, shown.trace, t, { contrast: settings.contrast, reduceMotion: settings.reduceMotion, alpha: ghost && !ghost.blocked ? 0.9 : 1 });
  }

  const wc = cellCenter(run.board.wellIndex);
  const strength = run.mods.wellStrength - (run.forecast?.kind === 'eclipse' && planning ? 1 : 0);
  drawWell(ctx, wc.x, wc.y, s, wellDirections(run), t, strength);

  // relays
  const lit = (shown?.trace ?? preview?.trace)?.relayHits ?? new Set();
  const flipped = new Set(planning ? preview?.flipped ?? [] : []);
  const knocked = new Set(planning ? (preview?.knocked ?? []).map((k) => k.cell) : []);
  for (let i = 0; i < run.relays.length; i++) {
    const r = run.relays[i];
    if (!r) continue;
    const c = cellCenter(i);
    drawRelay(ctx, r.type, r.orient, c.x, c.y, s, { lit: lit.has(i), t });
    if (flipped.has(i)) marker(ctx, c.x + s * 0.32, c.y + s * 0.3, '↻', '#bfe8ff');
    if (knocked.has(i)) marker(ctx, c.x + s * 0.32, c.y + s * 0.3, '✕', INK.wilt);
  }

  // blooms
  const trace = shown?.trace;
  for (const bloom of run.blooms) {
    const c = cellCenter(bloom.cell);
    const sp = SPECIES[bloom.species];
    const response = (ghost && !ghost.blocked ? ghost.preview : preview)?.responses.get(bloom.id) ?? 'wilt';
    const isNew = pulse?.event.sprouted?.some((b) => b.id === bloom.id) ? Math.min(1, pulse.age / 0.6) : 1;
    drawBloom(ctx, bloom.species, c.x, c.y, s * (0.6 + 0.4 * isNew), { stage: bloom.growth / sp.growth, t, wilting: bloom.patience <= 1 });
    if (run.phase === 'plan' && !surging) {
      const received = { total: trace ? totalLight(trace, bloom.cell) : 0, sources: trace ? distinctSources(trace, bloom.cell) : 0 };
      drawBloomStatus(ctx, bloom, c.x, c.y, s, response, received, { contrast: settings.contrast });
    }
  }

  // blooms leaving this pulse (harvested float up, withered sink)
  if (pulse && pulse.age < 1.4) {
    for (const h of pulse.event.harvested) {
      const c = cellCenter(h.cell);
      drawBloom(ctx, h.species, c.x, c.y, s, { stage: 1, t, alpha: 1 - pulse.age / 1.4, lift: pulse.age * 30 });
    }
    for (const w of pulse.event.withered) {
      const c = cellCenter(w.cell);
      drawBloom(ctx, w.species, c.x, c.y, s, { stage: 0.2, t, wilting: true, alpha: Math.max(0, 0.8 - pulse.age) });
    }
  }

  drawClouds(ctx, run.clouds, t);

  // cursor (keyboard) and hover (mouse)
  for (const [cell, color] of [[view.hover, 'rgba(255,255,255,0.5)'], [view.cursor, INK.mint]]) {
    if (cell == null || cell < 0) continue;
    ctx.strokeStyle = color;
    ctx.lineWidth = cell === view.cursor ? 3 : 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cellLeft(cellX(cell)) + 3, cellTop(cellY(cell)) + 3, s - 6, s - 6, 10);
    else ctx.rect(cellLeft(cellX(cell)) + 3, cellTop(cellY(cell)) + 3, s - 6, s - 6);
    ctx.stroke();
  }
  if (ghost && planning) {
    const c = cellCenter(ghost.cell);
    if (ghost.blocked) marker(ctx, c.x, c.y, '✕', INK.wilt, 16);
    else drawRelay(ctx, ghost.type, ghost.orient, c.x, c.y, s, { alpha: 0.6, t });
  }
}

function marker(ctx, x, y, glyph, color, r = 10) {
  ctx.save();
  ctx.fillStyle = 'rgba(12, 10, 34, 0.88)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `800 ${Math.round(r * 1.3)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, x, y + 1);
  ctx.restore();
}
