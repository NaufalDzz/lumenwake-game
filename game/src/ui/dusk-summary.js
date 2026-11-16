// The night summary shown at dawn after each cleared night: what was harvested and lost, the bonuses,
// and what waits next (a new island resets the network).

import { text, fillRound } from '../render/canvas-kit.js';
import { FONT_DISPLAY, INK } from '../render/palette.js';
import { button } from './widgets.js';
import { ISLANDS, NIGHT_COUNT, nightPlan, startsIsland } from '../rules/islands.js';

export function drawDuskSummary(ui, run, age) {
  const { ctx, ink } = ui;
  const a = Math.min(1, age * 3);
  ctx.fillStyle = `rgba(6, 5, 22, ${0.6 * a})`;
  ctx.fillRect(0, 0, 1280, 720);
  const x = 340;
  const y = 120 + (1 - a) * 20;
  fillRound(ctx, x, y, 600, 470, 22, ink.panel, INK.gold, 2);
  const island = ISLANDS[run.board.island];
  text(ctx, `Night ${run.night + 1} cleared`, 640, y + 62, { size: 40, weight: 700, color: INK.gold, align: 'center', font: FONT_DISPLAY });
  text(ctx, `Dawn reaches ${island.name}`, 640, y + 94, { size: 17, color: ink.soft, align: 'center' });
  const log = run.nightLog;
  const rows = [
    ['Blooms harvested', `${log.harvested}`, INK.grow],
    ['Blooms withered', `${log.withered}`, log.withered ? INK.wilt : ink.text],
    ['Best chorus', log.chorus > 1 ? `${log.chorus} in one pulse` : '—', ink.text],
    ['Harvest score', `+${log.score}`, INK.gold],
    [log.flawless ? 'Night bonus (flawless!)' : 'Night bonus', `+${log.bonus}`, INK.gold],
    ['Dew gathered', `+${log.dew}`, INK.sky],
    ['Hearts', `${run.hearts} / ${run.maxHearts}`, INK.rose],
  ];
  rows.forEach(([k, v, c], i) => {
    const ry = y + 140 + i * 34;
    text(ctx, k, x + 70, ry, { size: 17, color: ink.soft });
    text(ctx, v, x + 530, ry, { size: 18, weight: 800, color: c, align: 'right' });
  });
  const next = run.night + 1;
  if (next < NIGHT_COUNT) {
    const plan = nightPlan(next);
    const newIsland = startsIsland(next);
    text(ctx, `Next: Night ${next + 1} · ${ISLANDS[plan.island].name}${newIsland ? ' — new island, relays return to your satchel' : ''}`, 640, y + 392, { size: 14, weight: 700, color: newIsland ? INK.mint : ink.dim, align: 'center' });
  }
  button(ui, { id: 'to-waystation', x: 490, y: y + 408, w: 300, h: 50, label: 'To the Waystation', hint: 'Enter', primary: true, onClick: ui.actions.toWaystation });
}
