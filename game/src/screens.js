// Screen painters: header HUD, objective/progress side panel, title, stage select, how-to-play,
// pause, stage results, tide-out and campaign finale. Each registers its buttons on app.buttons
// as it draws them, so clicks and keyboard focus always match the picture.

import { LEVELS } from './levels.js';
import { parseLayout, N, E, S, W } from './puzzle.js';
import {
  VIEW_W, VIEW_H, COLORS, FONT_DISPLAY, drawPanel, drawText, drawWrapped, drawButton, drawStar, roundRect,
  glowSprite, easeOutBack, clamp,
} from './ui.js';
import { drawIslet, drawCanals, drawGarden, drawLighthouse } from './tile-art.js';

export const BOARD_RECT = { x: 24, y: 78, w: 836, h: 628 };
const PANEL = { x: 886, y: 84, w: 370, h: 616 };

function button(ctx, app, spec) {
  const index = app.buttons.length;
  const b = { ...spec, index };
  app.buttons.push(b);
  if (spec.custom) return b;
  // header buttons stay inert-looking while a card or menu is open over the board
  const live = !(spec.hud && app.overlay);
  drawButton(ctx, b, { hover: live && app.hoverButton === index, focus: live && app.focus === index, time: app.time });
  return b;
}

function dimScreen(ctx, alpha = 0.55) {
  ctx.fillStyle = `rgba(6,8,30,${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function wordmark(ctx, x, y, size, time) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.5;
  ctx.drawImage(glowSprite('rgba(255,190,120,0.5)'), x - size * 4.5, y - size * 1.3, size * 9, size * 2);
  ctx.restore();
  ctx.save();
  ctx.font = `600 ${size}px ${FONT_DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(size * 0.14)}px`;
  const g = ctx.createLinearGradient(0, y - size, 0, y);
  g.addColorStop(0, '#fff5d6');
  g.addColorStop(0.55, '#ffd27a');
  g.addColorStop(1, '#f39a72');
  ctx.shadowColor = 'rgba(255,170,100,0.65)';
  ctx.shadowBlur = 22 + Math.sin(time * 1.5) * 4;
  ctx.fillStyle = g;
  ctx.fillText('LUMENWAKE', x, y);
  ctx.restore();
}

// ---------------------------------------------------------------- play HUD

export function drawHud(ctx, app) {
  const g = app.game;
  const flow = app.view.flow;
  ctx.save();
  const bar = ctx.createLinearGradient(0, 0, 0, 64);
  bar.addColorStop(0, 'rgba(8,10,34,0.92)');
  bar.addColorStop(1, 'rgba(14,17,52,0.78)');
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, VIEW_W, 64);
  ctx.fillStyle = 'rgba(255,200,150,0.25)';
  ctx.fillRect(0, 64, VIEW_W, 1);
  ctx.restore();
  ctx.save();
  ctx.translate(36, 34);
  drawLighthouse(ctx, 44, app.time);
  ctx.restore();
  drawText(ctx, 'LUMENWAKE', 62, 30, { size: 19, weight: 700, color: COLORS.gold, family: FONT_DISPLAY, spacing: 3 });
  drawText(ctx, `Stage ${g.id} of ${LEVELS.length}`, 62, 50, { size: 13, weight: 600, color: COLORS.textDim });
  drawText(ctx, g.def.name, 232, 40, { size: 24, weight: 700, color: COLORS.text, family: FONT_DISPLAY });
  // turn counter and tide meter
  const left = g.budget - g.moves;
  const mx = 520;
  drawText(ctx, 'TURNS', mx, 24, { size: 11, weight: 700, color: COLORS.textDim, spacing: 2 });
  drawText(ctx, `${g.moves}`, mx, 50, { size: 24, weight: 700, color: COLORS.text });
  drawText(ctx, `par ${g.par}`, mx + 36, 50, { size: 13, weight: 600, color: g.moves <= g.par ? COLORS.mint : COLORS.textDim });
  const tx = 628;
  const tw = 140;
  drawText(ctx, 'TIDE', tx, 24, { size: 11, weight: 700, color: COLORS.textDim, spacing: 2 });
  drawText(ctx, `${left} left`, tx + tw, 24, { size: 12, weight: 700, color: left <= 3 ? COLORS.danger : COLORS.mint, align: 'right' });
  tideBar(ctx, tx, 32, tw, 18, left / g.budget, app.time, left <= 3);
  const awake = flow ? flow.litTargets : 0;
  drawText(ctx, 'GARDENS', 852, 24, { size: 11, weight: 700, color: COLORS.textDim, align: 'right', spacing: 1 });
  drawText(ctx, `${awake}/${flow ? flow.totalTargets : 0}`, 852, 50, { size: 22, weight: 700, color: COLORS.mint, align: 'right' });
  const by = 14;
  const bh = 36;
  button(ctx, app, { hud: true, action: 'undo', label: 'Undo', keyHint: 'Z', x: 870, y: by, w: 92, h: bh, size: 14, disabled: g.history.length === 0 || g.status !== 'playing' });
  button(ctx, app, { hud: true, action: 'reset', label: 'Reset', keyHint: 'R', x: 968, y: by, w: 92, h: bh, size: 14 });
  button(ctx, app, { hud: true, action: 'pause', label: 'Menu', keyHint: 'Esc', x: 1066, y: by, w: 92, h: bh, size: 14 });
  button(ctx, app, { hud: true, action: 'mute', label: app.audio.muted ? 'Muted' : 'Sound', keyHint: 'M', x: 1164, y: by, w: 92, h: bh, size: 14 });
}

function tideBar(ctx, x, y, w, h, frac, time, low) {
  ctx.save();
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(8,10,40,0.9)';
  ctx.fill();
  ctx.clip();
  const fw = Math.max(0, w * clamp(frac, 0, 1));
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  if (low) {
    g.addColorStop(0, '#ff8f8f');
    g.addColorStop(1, '#ffb38a');
  } else {
    g.addColorStop(0, '#3fb595');
    g.addColorStop(1, '#8ff0c8');
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  for (let xx = 0; xx <= fw; xx += 4) ctx.lineTo(x + xx, y + 3 + Math.sin(xx * 0.12 + time * 3) * 1.6);
  ctx.lineTo(x + fw, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.strokeStyle = 'rgba(201,198,240,0.3)';
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- side panel

export function drawSidePanel(ctx, app) {
  const g = app.game;
  const flow = app.view.flow;
  const { x, y, w } = PANEL;
  drawPanel(ctx, x, y, w, PANEL.h);
  let yy = y + 34;
  drawText(ctx, 'OBJECTIVE', x + 24, yy, { size: 12, weight: 700, color: COLORS.peach, spacing: 2.5 });
  yy += 28;
  drawText(ctx, 'Wake every garden', x + 24, yy, { size: 22, weight: 700, family: FONT_DISPLAY });
  const total = flow ? flow.totalTargets : 0;
  const awake = flow ? flow.litTargets : 0;
  drawText(ctx, `${awake} / ${total} awake`, x + w - 24, yy, { size: 15, weight: 700, color: awake === total ? COLORS.mint : COLORS.textDim, align: 'right' });
  yy += 22;
  for (let i = 0; i < total; i++) {
    ctx.save();
    ctx.translate(x + 44 + i * 52, yy + 26);
    drawGarden(ctx, 46, i < awake ? 1 : 0, app.time, i);
    ctx.restore();
  }
  yy += 70;
  // tide
  const left = g.budget - g.moves;
  drawText(ctx, 'TIDE', x + 24, yy, { size: 12, weight: 700, color: COLORS.peach, spacing: 2.5 });
  drawText(ctx, `${left} of ${g.budget} turns left`, x + w - 24, yy, { size: 13, weight: 600, color: left <= 3 ? COLORS.danger : COLORS.textDim, align: 'right' });
  tideBar(ctx, x + 24, yy + 10, w - 48, 14, left / g.budget, app.time, left <= 3);
  yy += 56;
  // stars
  drawText(ctx, 'STARS', x + 24, yy, { size: 12, weight: 700, color: COLORS.peach, spacing: 2.5 });
  const two = g.par + Math.ceil(g.par * 0.35) + 1;
  const rows = [
    [3, `in ${g.par} turns or fewer (par)`],
    [2, `in ${two} turns or fewer`],
    [1, 'wake them all before the tide ebbs'],
  ];
  rows.forEach(([n, text], i) => {
    const ry = yy + 24 + i * 26;
    for (let k = 0; k < 3; k++) drawStar(ctx, x + 34 + k * 19, ry - 5, 8, k < n);
    const reachable = n === 3 ? g.moves <= g.par : n === 2 ? g.moves <= two : true;
    drawText(ctx, text, x + 100, ry, { size: 13, weight: 600, color: reachable ? COLORS.text : 'rgba(180,178,224,0.45)', shadow: false });
  });
  const best = app.progress.best(g.id);
  yy += 108;
  drawText(ctx, best ? `Best: ${'★'.repeat(best.stars)}${'☆'.repeat(3 - best.stars)}  ${best.score} pts · ${best.moves} turns` : 'Best: not yet woken', x + 24, yy, { size: 13, weight: 600, color: COLORS.gold, shadow: false });
  yy += 22;
  // hint
  roundRect(ctx, x + 18, yy, w - 36, 92, 12);
  ctx.fillStyle = 'rgba(143,240,200,0.07)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(143,240,200,0.25)';
  ctx.stroke();
  drawText(ctx, 'KEEPER’S NOTE', x + 32, yy + 22, { size: 11, weight: 700, color: COLORS.mint, spacing: 2 });
  drawWrapped(ctx, g.def.hint, x + 32, yy + 43, w - 64, { size: 14, lineHeight: 19, color: COLORS.text });
  yy += 112;
  // controls
  drawText(ctx, 'CONTROLS', x + 24, yy, { size: 12, weight: 700, color: COLORS.peach, spacing: 2.5 });
  const controls = [
    ['Click / Space', 'turn clockwise'],
    ['Right-click / Shift', 'turn counter-clockwise'],
    ['Arrows / WASD', 'move selection'],
    ['Z  ·  R  ·  Esc', 'undo · reset · menu'],
  ];
  controls.forEach(([k, v], i) => {
    const ry = yy + 22 + i * 21;
    drawText(ctx, k, x + 24, ry, { size: 13, weight: 700, color: COLORS.text, shadow: false });
    drawText(ctx, v, x + w - 24, ry, { size: 13, weight: 500, color: COLORS.textDim, align: 'right', shadow: false });
  });
  // campaign progress strip: cleared stages glow gold, the current one is ringed in mint
  const sy = y + PANEL.h - 30;
  const gap = (w - 60) / (LEVELS.length - 1);
  ctx.save();
  ctx.strokeStyle = 'rgba(201,198,240,0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 30, sy);
  ctx.lineTo(x + w - 30, sy);
  ctx.stroke();
  LEVELS.forEach((def, i) => {
    const px = x + 30 + i * gap;
    const cleared = !!app.progress.best(def.id);
    ctx.fillStyle = cleared ? COLORS.gold : def.id <= app.progress.unlocked ? '#6c6ab0' : '#2a2c62';
    ctx.beginPath();
    ctx.arc(px, sy, cleared ? 6 : 5, 0, Math.PI * 2);
    ctx.fill();
    if (def.id === g.id) {
      ctx.strokeStyle = COLORS.mint;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, sy, 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  ctx.restore();
  drawText(ctx, 'CAMPAIGN', x + 24, sy - 18, { size: 11, weight: 700, color: COLORS.peach, spacing: 2.5 });
  drawText(ctx, `${app.progress.totalStars()} / ${LEVELS.length * 3} stars`, x + w - 24, sy - 18, { size: 12, weight: 700, color: COLORS.gold, align: 'right', shadow: false });
}

// ---------------------------------------------------------------- toast

export function drawToast(ctx, app) {
  if (!app.toast) return;
  const age = app.time - app.toast.time;
  if (age > 2.4) {
    app.toast = null;
    return;
  }
  const a = Math.min(1, age * 6, (2.4 - age) * 3);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = '700 16px "Trebuchet MS", sans-serif';
  const tw = ctx.measureText(app.toast.text).width + 40;
  const cx = BOARD_RECT.x + BOARD_RECT.w / 2;
  roundRect(ctx, cx - tw / 2, 664 - (1 - a) * 8, tw, 34, 17);
  ctx.fillStyle = 'rgba(16,19,56,0.92)';
  ctx.fill();
  ctx.strokeStyle = app.toast.warn ? 'rgba(255,143,143,0.6)' : 'rgba(255,210,122,0.5)';
  ctx.stroke();
  drawText(ctx, app.toast.text, cx, 682 - (1 - a) * 8, { size: 16, weight: 700, align: 'center', baseline: 'middle', color: app.toast.warn ? COLORS.danger : COLORS.goldHot, shadow: false });
  ctx.restore();
}

// ---------------------------------------------------------------- title

export function drawTitle(ctx, app) {
  wordmark(ctx, 640, 112, 82, app.time);
  drawText(ctx, 'Turn the canals. Carry the lighthouse glow to every sleeping garden.', 640, 152, { size: 18, weight: 500, color: COLORS.mist, align: 'center' });
  const px = 760;
  const py = 214;
  const pw = 440;
  drawPanel(ctx, px, py, pw, 430);
  const unlocked = app.progress.unlocked;
  const next = Math.min(unlocked, LEVELS.length);
  const fresh = !app.progress.best(1);
  drawText(ctx, fresh ? 'A blue-hour canal puzzle' : 'Welcome back, keeper', px + pw / 2, py + 44, { size: 22, weight: 700, color: COLORS.text, align: 'center', family: FONT_DISPLAY });
  drawText(ctx, `${app.progress.totalStars()} / ${LEVELS.length * 3} stars  ·  ${unlocked} of ${LEVELS.length} stages open`, px + pw / 2, py + 72, { size: 14, weight: 600, color: COLORS.gold, align: 'center', shadow: false });
  const bx = px + 50;
  const bw = pw - 100;
  button(ctx, app, { action: 'continue', label: fresh ? 'Begin the Wake' : `Continue · Stage ${next}`, keyHint: 'Enter', x: bx, y: py + 100, w: bw, h: 56, primary: true, size: 20 });
  button(ctx, app, { action: 'select', label: 'Choose a Stage', x: bx, y: py + 172, w: bw, h: 48 });
  button(ctx, app, { action: 'howto', label: 'How to Play', x: bx, y: py + 232, w: bw, h: 48 });
  button(ctx, app, { action: 'mute', label: app.audio.muted ? 'Sound: Off' : 'Sound: On', keyHint: 'M', x: bx, y: py + 292, w: bw, h: 48 });
  drawText(ctx, '12 handcrafted stages · undo freely · beat par for three stars', px + pw / 2, py + 380, { size: 13, weight: 600, color: COLORS.textDim, align: 'center', shadow: false });
  drawText(ctx, 'Mouse or keyboard  ·  arrows + Enter in menus', px + pw / 2, py + 404, { size: 13, weight: 600, color: COLORS.textDim, align: 'center', shadow: false });
  drawText(ctx, 'Moss Crossing, awake', 390, 690, { size: 13, weight: 600, color: 'rgba(201,198,240,0.6)', align: 'center', shadow: false });
}

// ---------------------------------------------------------------- stage select

const layoutCache = new Map();
function miniBoard(ctx, def, x, y, w, h, open, cleared) {
  if (!layoutCache.has(def.id)) layoutCache.set(def.id, parseLayout(def));
  const lay = layoutCache.get(def.id);
  const s = Math.min(w / lay.cols, h / lay.rows);
  const ox = x + (w - s * lay.cols) / 2;
  const oy = y + (h - s * lay.rows) / 2;
  ctx.save();
  ctx.lineCap = 'round';
  for (const t of lay.tiles) {
    if (t.kind === 'empty') continue;
    const cx = ox + (t.c + 0.5) * s;
    const cy = oy + (t.r + 0.5) * s;
    ctx.fillStyle = t.stone ? 'rgba(150,155,180,0.5)' : 'rgba(90,94,166,0.55)';
    roundRect(ctx, cx - s * 0.42, cy - s * 0.42, s * 0.84, s * 0.84, s * 0.18);
    ctx.fill();
    if (!open) continue;
    ctx.strokeStyle = cleared ? COLORS.gold : 'rgba(200,198,240,0.6)';
    ctx.lineWidth = Math.max(1.5, s * 0.2);
    for (const [bit, dx, dy] of [[N, 0, -1], [E, 1, 0], [S, 0, 1], [W, -1, 0]]) {
      if (!(t.mask & bit)) continue;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + dx * s * 0.5, cy + dy * s * 0.5);
      ctx.stroke();
    }
    if (t.kind === 'source' || t.kind === 'target') {
      ctx.fillStyle = t.kind === 'source' ? COLORS.goldHot : cleared ? COLORS.mint : '#5b8f88';
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawSelect(ctx, app) {
  dimScreen(ctx, 0.35);
  drawText(ctx, 'Choose a Stage', 640, 70, { size: 40, weight: 600, family: FONT_DISPLAY, align: 'center', color: COLORS.goldHot });
  drawText(ctx, `${app.progress.totalStars()} of ${LEVELS.length * 3} stars gathered${app.progress.persistent ? '' : '  ·  progress kept for this visit only'}`, 640, 100, { size: 15, weight: 600, color: COLORS.textDim, align: 'center' });
  const cw = 272;
  const ch = 158;
  const gap = 18;
  const x0 = (VIEW_W - (cw * 4 + gap * 3)) / 2;
  const y0 = 122;
  LEVELS.forEach((def, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = x0 + col * (cw + gap);
    const y = y0 + row * (ch + gap);
    const open = def.id <= app.progress.unlocked;
    const best = app.progress.best(def.id);
    const b = button(ctx, app, { action: 'play', arg: i, x, y, w: cw, h: ch, custom: true, disabled: !open, label: def.name });
    const hover = app.hoverButton === b.index && open;
    const focus = app.focus === b.index;
    drawPanel(ctx, x, y - (hover ? 3 : 0), cw, ch, { radius: 16, glow: focus ? COLORS.mint : hover ? 'rgba(255,210,122,0.6)' : '', alpha: open ? 0.82 : 0.5 });
    const yy = y - (hover ? 3 : 0);
    miniBoard(ctx, def, x + 14, yy + 14, 120, ch - 28, open, !!best);
    drawText(ctx, `${def.id}`, x + 148, yy + 44, { size: 30, weight: 700, color: open ? COLORS.gold : COLORS.textDim, family: FONT_DISPLAY });
    drawText(ctx, def.name, x + 148, yy + 72, { size: 15, weight: 700, color: open ? COLORS.text : COLORS.textDim });
    if (open) {
      for (let k = 0; k < 3; k++) drawStar(ctx, x + 158 + k * 24, yy + 102, 10, best && k < best.stars);
      drawText(ctx, best ? `${best.score} pts` : 'not yet woken', x + 148, yy + 132, { size: 13, weight: 600, color: best ? COLORS.mint : COLORS.textDim, shadow: false });
    } else {
      drawText(ctx, 'Locked', x + 148, yy + 108, { size: 14, weight: 700, color: COLORS.textDim });
      drawText(ctx, `wake stage ${def.id - 1} first`, x + 148, yy + 130, { size: 12, weight: 600, color: COLORS.textDim, shadow: false });
    }
    if (focus) {
      ctx.save();
      roundRect(ctx, x - 5, yy - 5, cw + 10, ch + 10, 20);
      ctx.strokeStyle = COLORS.mint;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -app.time * 20;
      ctx.stroke();
      ctx.restore();
    }
  });
  button(ctx, app, { action: 'title', label: 'Back to Title', keyHint: 'Esc', x: 540, y: 662, w: 200, h: 42 });
}

// ---------------------------------------------------------------- how to play

function demoTile(ctx, x, y, s, mask, lit, time, opts = {}) {
  ctx.save();
  ctx.translate(x, y);
  drawIslet(ctx, s, { kind: opts.kind ?? 'pipe', stone: opts.stone, seed: x + y });
  drawCanals(ctx, mask, s, { light: lit ? 1 : 0, entry: opts.entry ?? 0, time, stone: opts.stone });
  if (opts.kind === 'source') drawLighthouse(ctx, s, time);
  if (opts.kind === 'target') drawGarden(ctx, s, lit ? 1 : 0, time);
  ctx.restore();
}

export function drawHowTo(ctx, app) {
  dimScreen(ctx, 0.5);
  const x = 120;
  const y = 40;
  const w = 1040;
  const h = 640;
  drawPanel(ctx, x, y, w, h, { glow: 'rgba(255,210,122,0.3)' });
  drawText(ctx, 'How to Play', 640, y + 54, { size: 36, weight: 600, family: FONT_DISPLAY, align: 'center', color: COLORS.goldHot });
  drawText(ctx, 'The gardens of the archipelago sleep until the lighthouse glow reaches them through the canals.', 640, y + 86, { size: 16, weight: 500, color: COLORS.mist, align: 'center' });
  const cols = [x + 40, x + 380, x + 720];
  const t = app.time;
  const s = 76;
  // 1: turning
  const turnPhase = Math.floor(t / 1.2) % 4;
  demoTile(ctx, cols[0] + 140, y + 190, s, [E | S, S | W, W | N, N | E][turnPhase], false, t);
  drawText(ctx, '1  Turn canals', cols[0] + 20, y + 280, { size: 20, weight: 700, color: COLORS.gold });
  drawWrapped(ctx, 'Click a canal to turn it clockwise. Right-click or Shift-click turns it back. Each turn spends one unit of tide.', cols[0] + 20, y + 306, 290, { size: 15 });
  // 2: matching ports
  demoTile(ctx, cols[1] + 60, y + 190, s, E, true, t, { kind: 'source' });
  demoTile(ctx, cols[1] + 60 + s, y + 190, s, E | W, true, t, { entry: W });
  demoTile(ctx, cols[1] + 60 + s * 2, y + 190, s, W, true, t, { kind: 'target', entry: W });
  drawText(ctx, '2  Openings must meet', cols[1] + 20, y + 280, { size: 20, weight: 700, color: COLORS.gold });
  drawWrapped(ctx, 'Light passes only where two neighbouring canals open toward each other. Branches split it, pools join all four sides.', cols[1] + 20, y + 306, 290, { size: 15 });
  // 3: stones & gardens
  demoTile(ctx, cols[2] + 100, y + 190, s, N | S, false, t, { stone: true });
  demoTile(ctx, cols[2] + 100 + s, y + 190, s, W, false, t, { kind: 'target' });
  drawText(ctx, '3  Wake every garden', cols[2] + 20, y + 280, { size: 20, weight: 700, color: COLORS.gold });
  drawWrapped(ctx, 'Mossy stones never turn. Light every garden at once before the tide runs out to clear the stage.', cols[2] + 20, y + 306, 290, { size: 15 });
  // scoring + controls
  const by = y + 400;
  roundRect(ctx, x + 40, by, w - 80, 150, 14);
  ctx.fillStyle = 'rgba(10,12,40,0.45)';
  ctx.fill();
  drawText(ctx, 'SCORING', x + 70, by + 32, { size: 12, weight: 700, color: COLORS.peach, spacing: 2.5 });
  drawWrapped(ctx, 'Every stage has a par: the fewest turns the lighthouse keeper needed. Match par for three stars. Unused tide adds to your score. Undo returns a turn; running out of tide ends the attempt, but you can always retry.', x + 70, by + 58, 440, { size: 14, lineHeight: 20 });
  drawText(ctx, 'CONTROLS', x + 580, by + 32, { size: 12, weight: 700, color: COLORS.peach, spacing: 2.5 });
  const keys = [
    ['Mouse', 'hover + click to turn, right-click back'],
    ['Arrows / WASD', 'move the mint selection'],
    ['Space / Enter · Q', 'turn clockwise · back'],
    ['Z  R  Esc  M', 'undo, reset, menu, sound'],
  ];
  keys.forEach(([k, v], i) => {
    drawText(ctx, k, x + 580, by + 60 + i * 22, { size: 14, weight: 700, shadow: false });
    drawText(ctx, v, x + 735, by + 60 + i * 22, { size: 14, weight: 500, color: COLORS.textDim, shadow: false });
  });
  button(ctx, app, { action: 'back', label: 'Got it', keyHint: 'Esc', x: 640 - 110, y: y + h - 70, w: 220, h: 48, primary: true });
}

// ---------------------------------------------------------------- pause

export function drawPause(ctx, app) {
  dimScreen(ctx, 0.6);
  const w = 400;
  const h = 440;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;
  drawPanel(ctx, x, y, w, h, { glow: 'rgba(255,210,122,0.3)' });
  drawText(ctx, 'Paused', 640, y + 56, { size: 36, weight: 600, family: FONT_DISPLAY, align: 'center', color: COLORS.goldHot });
  drawText(ctx, `Stage ${app.game.id} · ${app.game.def.name}`, 640, y + 86, { size: 15, weight: 600, color: COLORS.textDim, align: 'center' });
  const bx = x + 60;
  const bw = w - 120;
  button(ctx, app, { action: 'resume', label: 'Resume', keyHint: 'Esc', x: bx, y: y + 112, w: bw, h: 50, primary: true });
  button(ctx, app, { action: 'reset', label: 'Restart Stage', keyHint: 'R', x: bx, y: y + 174, w: bw, h: 44 });
  button(ctx, app, { action: 'howto', label: 'How to Play', x: bx, y: y + 228, w: bw, h: 44 });
  button(ctx, app, { action: 'select', label: 'Stage Select', x: bx, y: y + 282, w: bw, h: 44 });
  button(ctx, app, { action: 'title', label: 'Title Screen', x: bx, y: y + 336, w: bw, h: 44 });
  button(ctx, app, { action: 'mute', label: app.audio.muted ? 'Sound: Off' : 'Sound: On', keyHint: 'M', x: bx, y: y + 390, w: bw, h: 36, size: 14 });
}

// ---------------------------------------------------------------- results

function statRow(ctx, x, y, w, label, value, color = COLORS.text) {
  drawText(ctx, label, x, y, { size: 15, weight: 600, color: COLORS.textDim, shadow: false });
  drawText(ctx, value, x + w, y, { size: 17, weight: 700, color, align: 'right', shadow: false });
  ctx.fillStyle = 'rgba(201,198,240,0.12)';
  ctx.fillRect(x, y + 10, w, 1);
}

export function drawResult(ctx, app) {
  const r = app.result;
  const age = app.time - app.resultTime;
  dimScreen(ctx, Math.min(0.5, age * 1.5));
  const w = 470;
  const x = BOARD_RECT.x + (BOARD_RECT.w - w) / 2;
  const enter = easeOutBack(clamp(age * 2.5, 0, 1));
  const won = r.status === 'won';
  const h = won ? 470 : 400;
  const y = 120 + (1 - enter) * 40;
  ctx.save();
  ctx.globalAlpha = clamp(age * 4, 0, 1);
  drawPanel(ctx, x, y, w, h, { glow: won ? 'rgba(255,210,122,0.55)' : 'rgba(255,143,143,0.45)' });
  const cx = x + w / 2;
  if (won) {
    drawText(ctx, 'STAGE ' + r.id + ' CLEARED', cx, y + 40, { size: 13, weight: 700, color: COLORS.mint, align: 'center', spacing: 3 });
    drawText(ctx, 'The Gardens Wake', cx, y + 82, { size: 36, weight: 600, family: FONT_DISPLAY, align: 'center', color: COLORS.goldHot });
    for (let k = 0; k < 3; k++) {
      const t = clamp((age - 0.35 - k * 0.22) * 3, 0, 1);
      drawStar(ctx, cx - 64 + k * 64, y + 140, k === 1 ? 30 : 25, k < r.stars && t > 0, k < r.stars ? 0.4 + easeOutBack(t) * 0.6 : 1);
    }
    const sx = x + 50;
    const sw = w - 100;
    statRow(ctx, sx, y + 206, sw, 'Turns used', `${r.moves}  (par ${r.par})`, r.moves <= r.par ? COLORS.mint : COLORS.text);
    statRow(ctx, sx, y + 238, sw, 'Tide left', `${r.tideLeft} of ${r.budget}`);
    statRow(ctx, sx, y + 270, sw, 'Undos', `${r.undos}`);
    statRow(ctx, sx, y + 302, sw, 'Score', `${r.score}`, COLORS.gold);
    statRow(ctx, sx, y + 334, sw, 'Best', r.improved ? `${r.best}  · new best!` : `${r.best}`, r.improved ? COLORS.mint : COLORS.text);
    const by = y + h - 82;
    const last = r.id === LEVELS.length;
    button(ctx, app, { action: last ? 'finale' : 'next', label: last ? 'See the Dawn' : 'Next Stage', keyHint: 'Enter', x: x + 30, y: by, w: 180, h: 50, primary: true });
    button(ctx, app, { action: 'retry', label: 'Replay', keyHint: 'R', x: x + 222, y: by, w: 110, h: 50 });
    button(ctx, app, { action: 'select', label: 'Stages', x: x + 344, y: by, w: 96, h: 50 });
  } else {
    drawText(ctx, 'TIDE OUT', cx, y + 40, { size: 13, weight: 700, color: COLORS.danger, align: 'center', spacing: 3 });
    drawText(ctx, 'The Tide Has Ebbed', cx, y + 82, { size: 34, weight: 600, family: FONT_DISPLAY, align: 'center', color: COLORS.peach });
    drawText(ctx, 'The canals ran dry before every garden woke.', cx, y + 114, { size: 15, weight: 500, color: COLORS.mist, align: 'center' });
    const sx = x + 50;
    const sw = w - 100;
    statRow(ctx, sx, y + 164, sw, 'Gardens awake', `${r.awake} of ${r.total}`, COLORS.mint);
    statRow(ctx, sx, y + 196, sw, 'Turns used', `${r.moves} of ${r.budget}`);
    statRow(ctx, sx, y + 228, sw, 'Par for this stage', `${r.par} turns`);
    drawWrapped(ctx, 'Tip: trace backwards from each garden, and lean on the stone clues. Undo is free while the tide lasts.', sx, y + 268, sw, { size: 14, lineHeight: 19 });
    const by = y + h - 76;
    button(ctx, app, { action: 'retry', label: 'Try Again', keyHint: 'Enter', x: x + 30, y: by, w: 190, h: 50, primary: true });
    button(ctx, app, { action: 'select', label: 'Stages', x: x + 232, y: by, w: 100, h: 50 });
    button(ctx, app, { action: 'title', label: 'Title', x: x + 344, y: by, w: 96, h: 50 });
  }
  ctx.restore();
}

export function drawFinale(ctx, app) {
  const age = app.time - app.resultTime;
  dimScreen(ctx, Math.min(0.45, age));
  // dawn breaking: warm wash rising from the horizon
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = clamp(age * 0.5, 0, 0.6);
  ctx.drawImage(glowSprite('rgba(255,170,110,0.7)'), -200, 260, VIEW_W + 400, 700);
  ctx.restore();
  const w = 760;
  const h = 560;
  const x = (VIEW_W - w) / 2;
  const y = 80;
  drawPanel(ctx, x, y, w, h, { glow: 'rgba(255,210,122,0.6)' });
  wordmark(ctx, 640, y + 70, 46, app.time);
  drawText(ctx, 'Dawn returns to the archipelago', 640, y + 108, { size: 22, weight: 600, family: FONT_DISPLAY, align: 'center', color: COLORS.mint });
  const stars = app.progress.totalStars();
  let total = 0;
  LEVELS.forEach((def) => {
    total += app.progress.best(def.id)?.score ?? 0;
  });
  drawText(ctx, `${stars} / ${LEVELS.length * 3}`, x + 190, y + 172, { size: 38, weight: 700, color: COLORS.gold, align: 'center' });
  drawText(ctx, 'STARS', x + 190, y + 196, { size: 12, weight: 700, color: COLORS.textDim, align: 'center', spacing: 2.5 });
  drawText(ctx, `${total}`, x + w - 190, y + 172, { size: 38, weight: 700, color: COLORS.gold, align: 'center' });
  drawText(ctx, 'TOTAL BEST SCORE', x + w - 190, y + 196, { size: 12, weight: 700, color: COLORS.textDim, align: 'center', spacing: 2.5 });
  LEVELS.forEach((def, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const rx = x + 60 + col * 340;
    const ry = y + 240 + row * 30;
    const best = app.progress.best(def.id);
    drawText(ctx, `${def.id}. ${def.name}`, rx, ry, { size: 14, weight: 600, shadow: false, color: best ? COLORS.text : COLORS.textDim });
    for (let k = 0; k < 3; k++) drawStar(ctx, rx + 230 + k * 20, ry - 5, 8, best && k < best.stars);
  });
  button(ctx, app, { action: 'restart-campaign', label: 'Play Again from Stage 1', keyHint: 'Enter', x: x + 60, y: y + h - 76, w: 300, h: 50, primary: true });
  button(ctx, app, { action: 'select', label: 'Stages', x: x + 376, y: y + h - 76, w: 150, h: 50 });
  button(ctx, app, { action: 'title', label: 'Title', x: x + 542, y: y + h - 76, w: 158, h: 50 });
}
