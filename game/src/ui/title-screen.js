// Title screen: the logo over a living floating garden, expedition setup (difficulty and a seed the
// player can step through or shuffle), records, options and the way into the how-to-play guide.

import { text, glow, wrapText, fillRound } from '../render/canvas-kit.js';
import { FONT_DISPLAY, INK } from '../render/palette.js';
import { button, panel } from './widgets.js';
import { drawRelay, drawWell } from '../render/relay-art.js';
import { drawBloom } from '../render/bloom-art.js';
import { DIFFICULTIES } from '../rules/expedition.js';

export function drawTitle(ui, setup, records) {
  const { ctx, ink, t } = ui;
  drawShowcaseIsland(ctx, t);

  glow(ctx, 300, 150, 260, 'rgba(255, 210, 140, 0.18)');
  text(ctx, 'LUMENWAKE', 64, 148, { size: 84, weight: 700, color: INK.gold, font: FONT_DISPLAY });
  text(ctx, 'A sky-garden expedition of light, storms and blooms', 68, 188, { size: 20, weight: 600, color: ink.soft });

  const x = 64;
  let y = 226;
  button(ui, { id: 'start', x, y, w: 420, h: 66, label: 'Begin Expedition', sub: `${DIFFICULTIES[setup.difficulty].name} · seed ${setup.seed}`, hint: 'Enter', primary: true, size: 24, onClick: ui.actions.start });
  y += 84;
  // difficulty selector
  panel(ui, x, y, 420, 74);
  button(ui, { id: 'diff-prev', x: x + 10, y: y + 15, w: 44, h: 44, label: '◀', size: 16, onClick: () => ui.actions.cycleDifficulty(-1) });
  button(ui, { id: 'diff-next', x: x + 366, y: y + 15, w: 44, h: 44, label: '▶', size: 16, onClick: () => ui.actions.cycleDifficulty(1) });
  const d = DIFFICULTIES[setup.difficulty];
  text(ctx, d.name, x + 210, y + 34, { size: 22, weight: 800, color: ink.text, align: 'center', font: FONT_DISPLAY });
  text(ctx, d.blurb, x + 210, y + 56, { size: 12, color: ink.dim, align: 'center' });
  y += 86;
  // seed selector
  panel(ui, x, y, 420, 64);
  button(ui, { id: 'seed-prev', x: x + 10, y: y + 10, w: 44, h: 44, label: '◀', size: 16, onClick: () => ui.actions.stepSeed(-1) });
  button(ui, { id: 'seed-next', x: x + 250, y: y + 10, w: 44, h: 44, label: '▶', size: 16, onClick: () => ui.actions.stepSeed(1) });
  text(ctx, 'EXPEDITION SEED', x + 152, y + 26, { size: 11, weight: 800, color: ink.dim, align: 'center', shadow: false });
  text(ctx, String(setup.seed), x + 152, y + 50, { size: 22, weight: 800, color: INK.mint, align: 'center' });
  button(ui, { id: 'seed-shuffle', x: x + 304, y: y + 10, w: 106, h: 44, label: 'Shuffle', hint: 'S', size: 15, onClick: ui.actions.shuffleSeed });
  y += 78;
  button(ui, { id: 'howto', x, y, w: 204, h: 50, label: 'How to Play', hint: 'H', onClick: ui.actions.howto });
  button(ui, { id: 'title-mute', x: x + 216, y, w: 204, h: 50, label: ui.muted ? 'Sound: Off' : 'Sound: On', hint: 'M', onClick: ui.actions.toggleMute });
  y += 60;
  button(ui, { id: 'contrast', x, y, w: 204, h: 44, label: ui.settings.contrast ? 'High Contrast: On' : 'High Contrast: Off', size: 14, onClick: ui.actions.toggleContrast });
  button(ui, { id: 'motion', x: x + 216, y, w: 204, h: 44, label: ui.settings.reduceMotion ? 'Reduced Motion: On' : 'Reduced Motion: Off', size: 14, onClick: ui.actions.toggleMotion });

  // records
  const rx = 900;
  const ry = 512;
  panel(ui, rx - 20, ry, 386, 182, 'Keeper records');
  const rows = [
    ['Best score', records.bestFor(setup.difficulty) ? `${records.bestFor(setup.difficulty)} (${d.name})` : '—'],
    ['Expeditions won', `${records.data.wins} of ${records.data.runs}`],
    ['Furthest night', records.data.deepestNight ? `Night ${records.data.deepestNight}` : '—'],
    ['Blooms harvested', String(records.data.harvested)],
  ];
  rows.forEach(([k, v], i) => {
    text(ctx, k, rx - 2, ry + 58 + i * 28, { size: 15, color: ink.soft });
    text(ctx, v, rx + 348, ry + 58 + i * 28, { size: 15, weight: 800, color: ink.text, align: 'right' });
  });
  if (!records.persistent) text(ctx, 'Storage is blocked: records last for this visit only.', rx - 2, ry + 172, { size: 11, color: INK.rose, shadow: false });

  fillRound(ctx, 52, 600, 584, 104, 16, 'rgba(14, 10, 40, 0.72)', 'rgba(255, 210, 122, 0.28)', 1.5);
  wrapText(ctx, 'Bend the Lumen Well\'s light with mirrors, prisms, lenses and lanterns. Grow every bloom before its patience runs out, weather the storms, and keep your hearts through seven nights on three floating islands.', 72, 632, 548, 22, { size: 15, weight: 600, color: ink.text });
}

/** The decorative island on the title: a real well, relays and blooms drawn by the game's own art. */
function drawShowcaseIsland(ctx, t) {
  const cx = 930;
  const cy = 300 + Math.sin(t * 0.8) * 6;
  drawIslandBody(ctx, cx, cy, t);

  // Same rules as play: the well shines east into a prism, which splits north (to a mirror bending east
  // to the Moonlily) and south (to the Dawnpetal). The Twinbell waits unlit.
  const well = { x: cx - 170, y: cy - 10 };
  const prism = { x: cx - 20, y: cy - 10 };
  const mirror = { x: cx - 20, y: cy - 66 };
  const blooms = [
    { x: cx + 170, y: cy - 66, sp: 'moonlily' },
    { x: cx - 20, y: cy + 52, sp: 'dawnpetal' },
    { x: cx + 150, y: cy + 20, sp: 'twinbell' },
  ];
  const beam = (a, b, w) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const [lw, la] of [[w * 4, 0.08], [w * 2, 0.18], [w, 0.6], [w * 0.35, 1]]) {
      ctx.strokeStyle = la === 1 ? '#fffbea' : '#ffe9a8';
      ctx.globalAlpha = la;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  };
  const reach = Math.min(1, (t % 6) / 1.2);
  beam(well, { x: well.x + (prism.x - well.x) * Math.min(1, reach * 2), y: well.y }, 8);
  if (reach > 0.5) {
    beam(prism, mirror, 6);
    beam(mirror, blooms[0], 6);
    beam(prism, blooms[1], 6);
  }
  drawWell(ctx, well.x, well.y, 74, [1], t, 3);
  drawRelay(ctx, 'prism', 0, prism.x, prism.y, 70, { lit: true, t });
  drawRelay(ctx, 'mirror', 0, mirror.x, mirror.y, 70, { lit: true, t });
  blooms.forEach((b, i) => drawBloom(ctx, b.sp, b.x, b.y, 78, { stage: i === 2 ? 0.4 : 1, t }));
}

/** A small deterministic wobble so cliff edges look hewn rather than drawn with a compass. */
const rough = (i, k = 1) => Math.sin(i * 12.9898 * k) * 0.5 + Math.sin(i * 4.1414 + k) * 0.5;

/**
 * The showcase island itself: a jagged rock underside with strata and side light, hanging roots, a grass
 * lip that shows the island's thickness, a garden top with faint plot tiling echoing the board, shrubs,
 * standing stones, a thin waterfall and two drifting islets.
 */
function drawIslandBody(ctx, cx, cy, t) {
  const rx = 290;
  const ry = 92;
  const top = cy - 10;
  ctx.save();

  // drifting islets behind
  for (const [ox, oy, r, ph] of [[-330, 150, 34, 0], [330, 120, 26, 2]]) {
    const y = cy + oy + Math.sin(t * 0.6 + ph) * 5;
    ctx.fillStyle = '#3a2a3e';
    ctx.beginPath();
    ctx.moveTo(cx + ox - r, y);
    ctx.lineTo(cx + ox + r, y);
    ctx.lineTo(cx + ox + r * 0.2, y + r * 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4f9a6c';
    ctx.beginPath();
    ctx.ellipse(cx + ox, y, r, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // cast shadow on the cloud sea
  ctx.fillStyle = 'rgba(8, 6, 30, 0.32)';
  ctx.beginPath();
  ctx.ellipse(cx + 30, cy + 200, 240, 34, 0, 0, Math.PI * 2);
  ctx.fill();

  // underside contour
  const pts = [];
  const N = 28;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = cx - rx + u * rx * 2;
    const k = Math.abs((x - cx) / rx);
    const depth = 250 * Math.pow(Math.max(0, 1 - k * k), 0.9) + rough(i) * 16 * (1 - k);
    pts.push({ x, y: top + 12 + depth });
  }
  const underside = () => {
    ctx.beginPath();
    ctx.moveTo(cx - rx, top);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.lineTo(cx + rx, top);
    ctx.closePath();
  };
  const rock = ctx.createLinearGradient(0, top, 0, top + 260);
  rock.addColorStop(0, '#7a5844');
  rock.addColorStop(0.45, '#4e3542');
  rock.addColorStop(1, '#221832');
  ctx.fillStyle = rock;
  underside();
  ctx.fill();
  ctx.save();
  underside();
  ctx.clip();
  // side light from the sunset on the left, shade on the right
  const side = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
  side.addColorStop(0, 'rgba(255, 190, 140, 0.22)');
  side.addColorStop(0.5, 'rgba(255, 190, 140, 0)');
  side.addColorStop(1, 'rgba(10, 6, 30, 0.38)');
  ctx.fillStyle = side;
  ctx.fillRect(cx - rx, top, rx * 2, 280);
  // strata bands
  for (let band = 1; band <= 4; band++) {
    const f = band / 5;
    ctx.strokeStyle = band % 2 ? 'rgba(255, 220, 190, 0.10)' : 'rgba(10, 6, 30, 0.22)';
    ctx.lineWidth = 3 + band;
    ctx.beginPath();
    pts.forEach((p, i) => {
      const y = top + 10 + (p.y - top) * f + rough(i + band * 7, 2) * 4;
      if (i === 0) ctx.moveTo(p.x, y);
      else ctx.lineTo(p.x, y);
    });
    ctx.stroke();
  }
  // a few lit facets
  for (let i = 0; i < 9; i++) {
    const p = pts[3 + i * 2];
    const y = top + 30 + (p.y - top) * (0.3 + 0.06 * (i % 4));
    ctx.fillStyle = i < 5 ? 'rgba(255, 210, 170, 0.10)' : 'rgba(0, 0, 0, 0.12)';
    ctx.beginPath();
    ctx.moveTo(p.x - 14, y);
    ctx.lineTo(p.x + 10, y - 8);
    ctx.lineTo(p.x + 18, y + 18);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // hanging roots, gently swaying
  ctx.strokeStyle = 'rgba(70, 48, 50, 0.9)';
  ctx.lineCap = 'round';
  for (let i = 4; i < N - 3; i += 3) {
    const p = pts[i];
    const len = 26 + (rough(i, 3) + 1) * 22;
    const sway = Math.sin(t * 0.9 + i) * 4;
    ctx.lineWidth = 2.5 - (i % 2);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 4);
    ctx.quadraticCurveTo(p.x + 8 + sway, p.y + len * 0.5, p.x + sway * 1.6, p.y + len);
    ctx.stroke();
  }

  // waterfall off the right edge into the clouds
  const wx = cx + 236;
  const wtop = top + 30;
  const fall = ctx.createLinearGradient(0, wtop, 0, wtop + 240);
  fall.addColorStop(0, 'rgba(200, 236, 255, 0.85)');
  fall.addColorStop(1, 'rgba(200, 236, 255, 0)');
  ctx.fillStyle = fall;
  ctx.fillRect(wx, wtop, 9, 240);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  for (let i = 0; i < 5; i++) {
    const y = wtop + ((t * 70 + i * 48) % 240);
    ctx.fillRect(wx + 2, y, 3, 12);
  }

  // grass lip (the island's thickness) and the garden top
  ctx.fillStyle = '#2f6a4c';
  ctx.beginPath();
  ctx.ellipse(cx, top + 16, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  const gg = ctx.createLinearGradient(cx - rx, top - ry, cx + rx, top + ry);
  gg.addColorStop(0, '#8fcf8f');
  gg.addColorStop(0.55, '#5ea874');
  gg.addColorStop(1, '#3a7d5a');
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.ellipse(cx, top, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, top, rx - 6, ry - 4, 0, 0, Math.PI * 2);
  ctx.clip();
  // garden plots, the same checker the board uses
  for (let gy = -3; gy <= 3; gy++) {
    for (let gx = -6; gx <= 6; gx++) {
      if ((gx + gy) % 2 === 0) continue;
      ctx.fillStyle = 'rgba(20, 60, 40, 0.10)';
      ctx.fillRect(cx + gx * 48 - 24, top + gy * 28 - 14, 48, 28);
    }
  }
  // tufts
  ctx.strokeStyle = 'rgba(30, 80, 50, 0.35)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 60; i++) {
    const a = rough(i, 5) * Math.PI;
    const r = (rough(i, 9) * 0.5 + 0.5) * 0.92;
    const x = cx + Math.cos(a * 2) * rx * r;
    const y = top + Math.sin(a * 2) * ry * r;
    ctx.beginPath();
    ctx.moveTo(x - 3, y + 3);
    ctx.lineTo(x - 1, y - 3);
    ctx.moveTo(x + 2, y + 3);
    ctx.lineTo(x + 3, y - 2);
    ctx.stroke();
  }
  ctx.restore();
  // lit back rim and dark front rim
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(220, 255, 220, 0.55)';
  ctx.beginPath();
  ctx.ellipse(cx, top - 1, rx - 2, ry - 1, 0, Math.PI * 1.04, Math.PI * 1.96);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(20, 50, 34, 0.5)';
  ctx.beginPath();
  ctx.ellipse(cx, top + 2, rx - 2, ry - 1, 0, Math.PI * 0.08, Math.PI * 0.92);
  ctx.stroke();

  // shrubs on the back rim, standing stones at the edges
  const shrub = (x, y, r) => {
    ctx.fillStyle = 'rgba(10, 30, 20, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.6, r * 1.3, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const [dx, dy, s, c] of [[-r * 0.6, 0, 0.75, '#3f7f55'], [r * 0.6, 0, 0.7, '#3a7550'], [0, -r * 0.35, 0.9, '#5aa06c']]) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(220, 255, 210, 0.25)';
    ctx.beginPath();
    ctx.arc(x - r * 0.25, y - r * 0.6, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  };
  shrub(cx - 200, top - 52, 16);
  shrub(cx + 60, top - 78, 13);
  shrub(cx + 236, top - 36, 15);
  shrub(cx - 250, top + 18, 12);
  const stone = (x, y, h) => {
    ctx.fillStyle = 'rgba(10, 20, 30, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x + 4, y, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a7896';
    ctx.beginPath();
    ctx.moveTo(x - 9, y);
    ctx.lineTo(x - 7, y - h);
    ctx.quadraticCurveTo(x, y - h - 7, x + 7, y - h);
    ctx.lineTo(x + 9, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(x - 6, y - h + 2, 4, h - 4);
  };
  stone(cx + 90, top + 66, 30);
  stone(cx - 110, top - 64, 24);
  ctx.restore();
}
