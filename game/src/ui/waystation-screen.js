// The waystation between nights: choose one of three boons (or skip for dew), trade dew for relays,
// mend a heart, review the satchel and current light rules, then set out for the next night.

import { text, fillRound, wrapText, heartPath, dewPath, glow } from '../render/canvas-kit.js';
import { FONT_DISPLAY, INK } from '../render/palette.js';
import { button, panel, keycap } from './widgets.js';
import { drawRelay, drawWell } from '../render/relay-art.js';
import { drawBloom } from '../render/bloom-art.js';
import { boonById } from '../rules/boons.js';
import { RELAYS, RELAY_ORDER } from '../rules/relays.js';
import { ISLANDS, nightPlan, startsIsland } from '../rules/islands.js';
import { MEND_PRICE, SKIP_BOON_DEW } from '../rules/expedition.js';

const BOON_ART = {
  'twin-aperture': (ctx, x, y, t) => drawWell(ctx, x, y, 64, [1, 3], t, ''),
  'kindled-well': (ctx, x, y, t) => drawWell(ctx, x, y, 64, [0], t, '+1'),
  'steady-hands': (ctx, x, y) => diamonds(ctx, x, y, 4),
  'flawless-prisms': (ctx, x, y, t) => drawRelay(ctx, 'prism', 0, x, y, 64, { lit: true, t }),
  'wide-halo': (ctx, x, y, t) => drawRelay(ctx, 'halo', 0, x, y, 64, { lit: true, t }),
  'burning-glass': (ctx, x, y, t) => drawRelay(ctx, 'lens', 0, x, y, 64, { lit: true, t }),
  'dew-gatherers': (ctx, x, y) => {
    dewPath(ctx, x, y, 34);
    ctx.fillStyle = INK.sky;
    ctx.fill();
  },
  'deep-roots': (ctx, x, y, t) => drawBloom(ctx, 'dawnpetal', x, y, 64, { stage: 1, t }),
  'anchored-frames': (ctx, x, y, t) => drawRelay(ctx, 'mirror', 0, x, y, 64, { t }),
  'mending-rain': (ctx, x, y) => {
    heartPath(ctx, x, y - 16, 36);
    ctx.fillStyle = INK.rose;
    ctx.fill();
  },
  chorus: (ctx, x, y, t) => {
    drawBloom(ctx, 'dawnpetal', x - 18, y + 4, 44, { stage: 1, t });
    drawBloom(ctx, 'twinbell', x + 18, y + 4, 44, { stage: 1, t });
  },
  'crystal-cache': (ctx, x, y, t) => {
    drawRelay(ctx, 'mirror', 0, x - 16, y, 50, { t });
    drawRelay(ctx, 'prism', 0, x + 18, y, 50, { t });
  },
};

function diamonds(ctx, x, y, n) {
  ctx.fillStyle = INK.mint;
  for (let i = 0; i < n; i++) {
    const dx = x - (n - 1) * 9 + i * 18;
    ctx.beginPath();
    ctx.moveTo(dx, y - 10);
    ctx.lineTo(dx + 8, y);
    ctx.lineTo(dx, y + 10);
    ctx.lineTo(dx - 8, y);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawWaystation(ui, run) {
  const { ctx, ink, t } = ui;
  const w = run.waystation;
  ctx.fillStyle = 'rgba(6, 5, 22, 0.72)';
  ctx.fillRect(0, 0, 1280, 720);
  const next = run.night + 1;
  const plan = nightPlan(next);
  text(ctx, 'Waystation', 50, 66, { size: 42, weight: 700, color: INK.gold, font: FONT_DISPLAY });
  text(ctx, `Rest between Night ${run.night + 1} and Night ${next + 1}  ·  ahead: ${ISLANDS[plan.island].name}${startsIsland(next) ? ' (new island)' : ''}`, 52, 94, { size: 16, color: ink.soft });

  // hearts / dew / score
  for (let i = 0; i < run.maxHearts; i++) {
    heartPath(ctx, 850 + i * 26, 40, 22);
    ctx.fillStyle = i < run.hearts ? INK.rose : 'rgba(255,255,255,0.14)';
    ctx.fill();
  }
  dewPath(ctx, 1072, 56, 22);
  ctx.fillStyle = INK.sky;
  ctx.fill();
  text(ctx, `${run.dew} dew`, 1092, 66, { size: 24, weight: 800, color: ink.text });
  text(ctx, `Score ${run.score}`, 850, 94, { size: 16, weight: 700, color: INK.gold });

  // boons
  text(ctx, w.boonTaken ? 'BOON CHOSEN' : 'CHOOSE ONE BOON', 52, 134, { size: 13, weight: 800, color: '#ffb38a', shadow: false });
  w.boonOffers.forEach((id, i) => {
    const b = boonById(id);
    const x = 50 + i * 400;
    const y = 146;
    const taken = w.boonTaken === id;
    const dimmed = w.boonTaken && !taken;
    const hovered = !w.boonTaken && ui.pointer && ui.pointer.x >= x && ui.pointer.x <= x + 380 && ui.pointer.y >= y && ui.pointer.y <= y + 180;
    if (taken || hovered) glow(ctx, x + 190, y + 90, 230, 'rgba(255, 210, 122, 0.18)');
    fillRound(ctx, x, y, 380, 180, 18, taken ? 'rgba(70, 58, 30, 0.95)' : hovered ? 'rgba(54, 48, 112, 0.97)' : ink.panel, ui.focusId === `boon-${i}` ? INK.mint : taken ? INK.gold : ink.panelEdge, taken || ui.focusId === `boon-${i}` ? 3 : 1.5);
    ctx.save();
    ctx.globalAlpha = dimmed ? 0.4 : 1;
    BOON_ART[id]?.(ctx, x + 66, y + 92, t);
    text(ctx, b.name, x + 128, y + 58, { size: 24, weight: 700, color: INK.gold, font: FONT_DISPLAY });
    wrapText(ctx, b.blurb, x + 128, y + 90, 232, 20, { size: 16, color: ink.text });
    ctx.restore();
    if (!w.boonTaken) keycap(ctx, String(i + 1), x + 368, y + 12);
    if (taken) text(ctx, '✓ Chosen', x + 360, y + 164, { size: 15, weight: 800, color: INK.mint, align: 'right' });
    ui.hit.add({ id: `boon-${i}`, x, y, w: 380, h: 180, label: b.name, enabled: !w.boonTaken, onClick: () => ui.actions.chooseBoon(i) });
  });
  button(ui, { id: 'skip-boon', x: 50, y: 338, w: 260, h: 40, label: w.boonTaken === 'skip' ? `Skipped (+${SKIP_BOON_DEW} dew)` : `Skip boon: +${SKIP_BOON_DEW} dew`, size: 14, enabled: !w.boonTaken, onClick: ui.actions.skipBoon });

  // trader
  panel(ui, 50, 392, 760, 236, 'Trader · spend dew');
  w.shop.forEach((o, i) => {
    const x = 68 + i * 180;
    const y = 426;
    const afford = run.dew >= o.price;
    const hovered = !o.sold && ui.pointer && ui.pointer.x >= x && ui.pointer.x <= x + 166 && ui.pointer.y >= y && ui.pointer.y <= y + 184;
    fillRound(ctx, x, y, 166, 184, 14, o.sold ? 'rgba(30, 28, 60, 0.6)' : hovered ? 'rgba(60, 54, 120, 0.95)' : 'rgba(40, 36, 88, 0.9)', ui.focusId === `shop-${i}` ? INK.mint : ink.panelEdge, ui.focusId === `shop-${i}` ? 3 : 1.5);
    drawRelay(ctx, o.type, 0, x + 83, y + 56, 78, { lit: !o.sold, t, alpha: o.sold ? 0.3 : 1 });
    text(ctx, RELAYS[o.type].name, x + 83, y + 116, { size: 16, weight: 800, color: o.sold ? ink.dim : ink.text, align: 'center' });
    text(ctx, o.sold ? 'Bought' : `${o.price} dew`, x + 83, y + 142, { size: 18, weight: 800, color: o.sold ? INK.mint : afford ? INK.sky : INK.wilt, align: 'center' });
    text(ctx, `you carry ${run.satchel[o.type]}`, x + 83, y + 166, { size: 12, color: ink.dim, align: 'center', shadow: false });
    if (!o.sold) keycap(ctx, String(i + 4), x + 156, y + 8);
    ui.hit.add({ id: `shop-${i}`, x, y, w: 166, h: 184, label: `Buy ${RELAYS[o.type].name} for ${o.price}`, enabled: !o.sold && afford, onClick: () => ui.actions.buy(i) });
  });
  const mx = 608;
  const canMend = !w.mended && run.hearts < run.maxHearts && run.dew >= MEND_PRICE;
  fillRound(ctx, mx, 426, 186, 184, 14, w.mended ? 'rgba(30, 28, 60, 0.6)' : 'rgba(70, 36, 66, 0.9)', ui.focusId === 'mend' ? INK.mint : ink.panelEdge, ui.focusId === 'mend' ? 3 : 1.5);
  heartPath(ctx, mx + 93, 452, 50);
  ctx.fillStyle = INK.rose;
  ctx.fill();
  text(ctx, 'Healer', mx + 93, 542, { size: 16, weight: 800, color: ink.text, align: 'center' });
  text(ctx, w.mended ? 'Mended' : run.hearts >= run.maxHearts ? 'Hearts full' : `+1 heart · ${MEND_PRICE} dew`, mx + 93, 568, { size: 15, weight: 800, color: w.mended ? INK.mint : canMend ? INK.sky : ink.dim, align: 'center' });
  keycap(ctx, '7', mx + 176, 434);
  ui.hit.add({ id: 'mend', x: mx, y: 426, w: 186, h: 184, label: 'Mend a heart', enabled: canMend, onClick: ui.actions.mend });

  // satchel and rules
  panel(ui, 830, 392, 400, 236, 'Your satchel');
  RELAY_ORDER.forEach((type, i) => {
    const x = 866 + i * 92;
    drawRelay(ctx, type, 0, x + 10, 456, 56, { t });
    text(ctx, `×${run.satchel[type]}`, x + 10, 512, { size: 18, weight: 800, color: run.satchel[type] ? INK.gold : ink.dim, align: 'center' });
  });
  const m = run.mods;
  const rules = [
    `Well strength ${m.wellStrength}${m.twinAperture ? ' · shines both ways' : ''}`,
    `Prism halves −${m.prismLoss} · Lens +${m.lensGain} · Halo ${m.haloReach} cells`,
    `Focus +${m.focusPerHour}/hour${m.patienceBonus ? ` · blooms +${m.patienceBonus} patience` : ''}${m.stormproof ? ' · stormproof' : ''}`,
  ];
  rules.forEach((r, i) => text(ctx, r, 848, 552 + i * 22, { size: 13, color: ink.soft }));

  button(ui, { id: 'set-out', x: 830, y: 644, w: 400, h: 60, label: `Set out for Night ${next + 1}`, sub: w.boonTaken ? 'the light awaits' : `unchosen boon is skipped for +${SKIP_BOON_DEW} dew`, hint: 'Enter', primary: true, size: 22, onClick: ui.actions.setOut });
  text(ctx, 'Relays bought now go straight into your satchel.', 52, 664, { size: 13, color: ink.dim });
}
