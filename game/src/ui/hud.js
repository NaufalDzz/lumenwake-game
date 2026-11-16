// The in-night HUD: top bar (night, island, hours with storm marks, hearts, dew, score), the side panel
// (next-pulse forecast and preview, the garden ledger of every bloom, owned boons, focus and the Release
// Pulse button) and the satchel tray of relay cards under the board.

import { text, fillRound, heartPath, dewPath, wrapText } from '../render/canvas-kit.js';
import { FONT_DISPLAY, INK } from '../render/palette.js';
import { PANEL, TRAY, BOARD } from '../render/layout.js';
import { button, panel, keycap, fitSize } from './widgets.js';
import { drawBloom } from '../render/bloom-art.js';
import { drawRelay } from '../render/relay-art.js';
import { SPECIES } from '../rules/blooms.js';
import { RELAYS, RELAY_ORDER } from '../rules/relays.js';
import { ISLANDS, NIGHT_COUNT, nightOnIsland } from '../rules/islands.js';
import { STORM_INFO, describeStorm } from '../rules/storms.js';
import { boonById } from '../rules/boons.js';
import { DIFFICULTIES } from '../rules/expedition.js';
import { cellLabel } from '../render/storm-art.js';

export function drawTopBar(ui, run) {
  const { ctx, ink } = ui;
  const g = ctx.createLinearGradient(0, 0, 0, 70);
  g.addColorStop(0, 'rgba(10, 8, 30, 0.92)');
  g.addColorStop(1, 'rgba(10, 8, 30, 0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1280, 66);
  ctx.fillStyle = 'rgba(255, 210, 122, 0.35)';
  ctx.fillRect(0, 66, 1280, 1);

  text(ctx, 'LUMENWAKE', 34, 32, { size: 24, weight: 700, color: INK.gold, font: FONT_DISPLAY });
  const island = ISLANDS[run.board.island];
  text(ctx, `Night ${run.night + 1} of ${NIGHT_COUNT}  ·  ${island.name} ${['I', 'II', 'III'][nightOnIsland(run.night) - 1]}`, 34, 54, { size: 14, color: ink.soft });

  // hour track
  const hx = 330;
  text(ctx, 'HOUR', hx, 26, { size: 11, weight: 800, color: ink.dim, shadow: false });
  text(ctx, `${Math.min(run.hour + 1, run.hours)} / ${run.hours}`, hx, 52, { size: 22, weight: 800, color: ink.text });
  for (let h = 0; h < run.hours; h++) {
    const x = hx + 74 + h * 30;
    const done = h < run.hour;
    const now = h === run.hour && run.phase === 'plan';
    fillRound(ctx, x, 30, 24, 20, 6, done ? 'rgba(255, 210, 122, 0.85)' : now ? 'rgba(143, 240, 200, 0.9)' : 'rgba(255,255,255,0.12)', now ? '#ffffff' : null, 2);
    if (run.plan.storms.includes(h)) {
      text(ctx, '⚡', x + 12, 46, { size: 12, color: done ? '#5a3f12' : now ? '#0c3a2a' : '#c8c0ff', align: 'center', shadow: false });
    }
  }
  text(ctx, 'storm', hx + 74, 24, { size: 10, color: ink.dim, shadow: false });

  // hearts: room for 8 (Breeze 7 + Mending Rain) between the hour track and dew; tighter spacing beyond that
  const heartsX = 664;
  const heartGap = run.maxHearts > 9 ? 216 / run.maxHearts : 24;
  text(ctx, 'HEARTS', heartsX, 26, { size: 11, weight: 800, color: ink.dim, shadow: false });
  for (let i = 0; i < run.maxHearts; i++) {
    heartPath(ctx, heartsX + 10 + i * heartGap, 32, 20);
    ctx.fillStyle = i < run.hearts ? '#ff7a8a' : 'rgba(255,255,255,0.12)';
    ctx.fill();
    if (i < run.hearts) {
      ctx.strokeStyle = 'rgba(255, 220, 230, 0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  // dew
  const dx = 920;
  text(ctx, 'DEW', dx, 26, { size: 11, weight: 800, color: ink.dim, shadow: false });
  dewPath(ctx, dx + 9, 44, 18);
  ctx.fillStyle = INK.sky;
  ctx.fill();
  text(ctx, String(run.dew), dx + 24, 53, { size: 22, weight: 800, color: ink.text });
  // score
  const sx = 1010;
  text(ctx, 'SCORE', sx, 26, { size: 11, weight: 800, color: ink.dim, shadow: false });
  text(ctx, String(run.score), sx, 53, { size: 22, weight: 800, color: INK.gold });

  button(ui, { id: 'pause', x: 1110, y: 14, w: 64, h: 40, label: 'Menu', size: 14, hint: 'Esc', onClick: ui.actions.pause });
  button(ui, { id: 'mute', x: 1182, y: 14, w: 64, h: 40, label: ui.muted ? 'Muted' : 'Sound', size: 14, hint: 'M', onClick: ui.actions.toggleMute });
}

/** Counts of previewed responses, plus blooms that would be harvested or wither. */
export function previewSummary(run, preview) {
  const out = { grow: 0, sustain: 0, wilt: 0, harvest: 0, wither: 0 };
  if (!preview) return out;
  for (const b of run.blooms) {
    const r = preview.responses.get(b.id);
    out[r] += 1;
    if (r === 'grow' && b.growth + 1 >= SPECIES[b.species].growth) out.harvest += 1;
    if (r === 'wilt' && b.patience <= 1) out.wither += 1;
  }
  return out;
}

export function drawSidePanel(ui, run, preview) {
  const { ctx, ink } = ui;
  const x = PANEL.x;
  const w = PANEL.w;
  // forecast + preview card
  panel(ui, x, PANEL.y, w, 118, 'Next pulse');
  const storm = run.forecast;
  const stormLine = storm ? `⚡ ${describeStorm(storm)}` : '☁ Calm skies';
  text(ctx, stormLine, x + 18, PANEL.y + 52, { size: 18, weight: 700, color: storm ? '#bfe8ff' : ink.soft });
  if (storm) {
    const extra = run.mods.stormproof && (storm.kind === 'gale' || storm.kind === 'hail') ? ' (Anchored Frames: no effect)' : '';
    text(ctx, `${STORM_INFO[storm.kind].blurb}${extra}`, x + 18, PANEL.y + 72, { size: 13, color: ink.dim });
  } else {
    text(ctx, 'No storm this pulse.', x + 18, PANEL.y + 72, { size: 13, color: ink.dim });
  }
  const sum = previewSummary(run, preview);
  const chips = [
    [`▲ ${sum.grow} grow`, INK.grow],
    [`● ${sum.sustain} hold`, INK.sustain],
    [`▼ ${sum.wilt} wilt`, INK.wilt],
  ];
  let cx = x + 18;
  for (const [label, color] of chips) {
    fillRound(ctx, cx, PANEL.y + 84, 92, 24, 8, 'rgba(255,255,255,0.06)', color, 1.5);
    text(ctx, label, cx + 46, PANEL.y + 101, { size: 13, weight: 700, color, align: 'center', shadow: false });
    cx += 100;
  }
  if (sum.harvest) text(ctx, `✿ ${sum.harvest} harvest`, cx + 4, PANEL.y + 101, { size: 13, weight: 800, color: INK.gold });
  else if (sum.wither) text(ctx, `✕ ${sum.wither} wither!`, cx + 4, PANEL.y + 101, { size: 13, weight: 800, color: INK.wilt });

  // garden ledger
  const ly = PANEL.y + 128;
  const lh = 270;
  panel(ui, x, ly, w, lh, `Garden · ${run.blooms.length} bloom${run.blooms.length === 1 ? '' : 's'}`);
  const rows = run.blooms
    .map((b) => ({ b, r: preview?.responses.get(b.id) ?? 'wilt' }))
    .sort((p, q) => urgency(p) - urgency(q));
  if (!rows.length) {
    text(ctx, 'No blooms awake. New sprouts arrive with the coming hours.', x + 18, ly + 60, { size: 14, color: ink.dim });
    const next = run.plan.sprouts.slice(run.hour + 1).findIndex((list) => list.length);
    if (next >= 0) text(ctx, `Next sprouts: hour ${run.hour + 2 + next}`, x + 18, ly + 84, { size: 14, color: ink.soft });
  }
  rows.slice(0, 6).forEach(({ b, r }, i) => {
    const ry = ly + 40 + i * 38;
    const sp = SPECIES[b.species];
    const sel = ui.hoverBloom === b.id;
    fillRound(ctx, x + 10, ry, w - 20, 34, 8, sel ? 'rgba(143, 240, 200, 0.12)' : 'rgba(255,255,255,0.04)');
    drawBloom(ctx, b.species, x + 30, ry + 16, 34, { stage: 0.9, t: ui.t });
    text(ctx, sp.name, x + 52, ry + 15, { size: 14, weight: 700, color: ink.text });
    text(ctx, `${cellLabel(b.cell)} · ${sp.need}`, x + 52, ry + 29, { size: 11, color: ink.dim, shadow: false });
    // growth pips
    for (let k = 0; k < sp.growth; k++) {
      ctx.fillStyle = k < b.growth ? INK.grow : 'rgba(255,255,255,0.16)';
      ctx.beginPath();
      ctx.arc(x + 262 + k * 13, ry + 17, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // patience
    text(ctx, `♥${b.patience}`, x + 330, ry + 22, { size: 13, weight: 800, color: b.patience <= 1 ? INK.wilt : '#9be6a8', shadow: false });
    const color = r === 'grow' ? INK.grow : r === 'sustain' ? INK.sustain : INK.wilt;
    const verdict = r === 'grow' ? (b.growth + 1 >= sp.growth ? 'HARVEST' : 'grows') : r === 'sustain' ? 'holds' : b.patience <= 1 ? 'WITHERS' : 'wilts';
    text(ctx, verdict, x + w - 22, ry + 22, { size: 13, weight: 800, color, align: 'right', shadow: false });
  });
  if (rows.length > 6) text(ctx, `+${rows.length - 6} more on the board`, x + 18, ly + lh - 10, { size: 12, color: ink.dim });

  // boons
  const by = ly + lh + 10;
  panel(ui, x, by, w, 74, `Boons · ${DIFFICULTIES[run.difficulty].name}`);
  if (!run.boons.length) text(ctx, 'Choose boons at each waystation between nights.', x + 18, by + 52, { size: 13, color: ink.dim });
  let bx = x + 18;
  let row = 0;
  for (const id of run.boons) {
    const name = boonById(id).name;
    ctx.font = '700 12px sans-serif';
    const bw = ctx.measureText(name).width + 16;
    if (bx + bw > x + w - 14) {
      bx = x + 18;
      row += 1;
    }
    if (row > 1) break;
    fillRound(ctx, bx, by + 36 + row * 20, bw, 18, 6, 'rgba(255, 210, 122, 0.14)', 'rgba(255,210,122,0.5)');
    text(ctx, name, bx + 8, by + 49 + row * 20, { size: 12, weight: 700, color: INK.gold, shadow: false });
    bx += bw + 6;
  }

  // focus and pulse
  const fy = by + 84;
  const fh = PANEL.y + PANEL.h - fy;
  panel(ui, x, fy, w, fh);
  text(ctx, 'FOCUS', x + 18, fy + 26, { size: 12, weight: 800, color: '#ffb38a', shadow: false });
  const cap = run.mods.focusPerHour + 2 + (run.focus > run.mods.focusPerHour + 2 ? run.focus - run.mods.focusPerHour - 2 : 0);
  for (let i = 0; i < cap; i++) {
    const on = i < run.focus;
    ctx.fillStyle = on ? INK.mint : 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(x + 30 + i * 22, fy + 36);
    ctx.lineTo(x + 38 + i * 22, fy + 46);
    ctx.lineTo(x + 30 + i * 22, fy + 56);
    ctx.lineTo(x + 22 + i * 22, fy + 46);
    ctx.closePath();
    ctx.fill();
  }
  text(ctx, `${run.focus} left · +${run.mods.focusPerHour}/hour`, x + 18, fy + 74, { size: 12, color: ink.dim, shadow: false });
  button(ui, { id: 'undo', x: x + 18, y: fy + 84, w: 120, h: 44, label: 'Undo', hint: 'Z', enabled: run.history.length > 0 && ui.canAct, onClick: ui.actions.undo });
  button(ui, { id: 'pulse', x: x + 150, y: fy + 24, w: w - 168, h: 104, label: 'Release Pulse', sub: run.hour + 1 >= run.hours ? 'last pulse of the night' : `ends hour ${run.hour + 1}`, hint: 'Space', primary: true, size: 22, enabled: ui.canAct, onClick: ui.actions.pulse });
}

function urgency({ b, r }) {
  const sp = SPECIES[b.species];
  if (r === 'wilt') return b.patience;
  if (r === 'sustain') return 10 + b.patience;
  return 20 + sp.growth - b.growth;
}

export function drawTray(ui, run) {
  const { ctx, ink } = ui;
  const cw = 132;
  RELAY_ORDER.forEach((type, i) => {
    const x = TRAY.x + i * (cw + 10);
    const y = TRAY.y;
    const count = run.satchel[type];
    const selected = ui.selection === type;
    const hovered = ui.pointer && ui.pointer.x >= x && ui.pointer.x <= x + cw && ui.pointer.y >= y && ui.pointer.y <= y + TRAY.h;
    fillRound(ctx, x, y + 3, cw, TRAY.h, 14, 'rgba(5, 4, 20, 0.45)');
    fillRound(ctx, x, y, cw, TRAY.h, 14, selected ? 'rgba(70, 60, 150, 0.96)' : hovered ? 'rgba(52, 46, 112, 0.95)' : ink.panel, ui.focusId === `relay-${type}` ? INK.mint : selected ? INK.gold : ink.panelEdge, selected ? 3 : 1.5);
    const name = RELAYS[type].name;
    text(ctx, name, x + 12, y + 24, { size: fitSize(ctx, name, cw - 50, 15, 700, 11), weight: 700, color: count ? ink.text : ink.dim });
    keycap(ctx, String(i + 1), x + cw - 8, y + 9);
    drawRelay(ctx, type, ui.ghostOrient, x + 36, y + 64, 54, { lit: selected, t: ui.t, alpha: count ? 1 : 0.35 });
    text(ctx, `×${count}`, x + 72, y + 70, { size: 24, weight: 800, color: count ? INK.gold : ink.dim });
    text(ctx, '1 focus', x + 72, y + 90, { size: 11, color: ink.dim, shadow: false });
    ui.hit.add({ id: `relay-${type}`, x, y, w: cw, h: TRAY.h, label: `${RELAYS[type].name} ×${count}`, enabled: true, onClick: () => ui.actions.selectRelay(type) });
  });
  button(ui, {
    id: 'turn-well',
    x: TRAY.x + 4 * (cw + 10),
    y: TRAY.y,
    w: TRAY.w - 4 * (cw + 10),
    h: TRAY.h,
    label: 'Turn Well',
    sub: '1 focus · turns 90°',
    hint: 'W',
    size: 15,
    enabled: ui.canAct && run.focus > 0,
    onClick: ui.actions.turnWell,
  });
}

/** One line of guidance between board and tray: the latest message or the selected relay's rule. */
export function drawMessageLine(ui, message) {
  const { ctx, ink } = ui;
  const y = BOARD.y + BOARD.h + 12;
  fillRound(ctx, BOARD.x, y, BOARD.w, 0, 0);
  if (!message) return;
  const color = message.tone === 'bad' ? INK.wilt : message.tone === 'good' ? INK.mint : ink.soft;
  wrapText(ctx, message.text, BOARD.x + BOARD.w / 2, y + 2, BOARD.w, 16, { size: 14, weight: 600, color, align: 'center', baseline: 'top' });
}
