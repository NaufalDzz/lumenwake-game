// End of an expedition, won or lost: the final score, records, what was grown, and the ways to play on
// (a new seed, the same seed again, or back to the title).

import { text, fillRound, glow } from '../render/canvas-kit.js';
import { FONT_DISPLAY, INK } from '../render/palette.js';
import { button } from './widgets.js';
import { drawBloom } from '../render/bloom-art.js';
import { SPECIES } from '../rules/blooms.js';
import { boonById } from '../rules/boons.js';
import { DIFFICULTIES, NIGHT_COUNT } from '../rules/expedition.js';
import { ISLANDS } from '../rules/islands.js';

export function drawResults(ui, run, outcome, age) {
  const { ctx, ink, t } = ui;
  const won = run.phase === 'won';
  const a = Math.min(1, age * 2);
  ctx.fillStyle = won ? `rgba(22, 12, 36, ${0.74 * a})` : `rgba(4, 3, 16, ${0.72 * a})`;
  ctx.fillRect(0, 0, 1280, 720);
  if (won) {
    glow(ctx, 640, 150, 420, 'rgba(255, 200, 140, 0.35)');
    drawBloom(ctx, 'dawnheart', 640, 150, 150, { stage: 1, t });
  }
  const y0 = won ? 250 : 120;
  text(ctx, won ? 'Dawn Breaks over Stormcrown' : 'The Gardens Fall Dark', 640, y0, { size: 50, weight: 700, color: won ? INK.gold : INK.rose, align: 'center', font: FONT_DISPLAY });
  const where = `${ISLANDS[run.board.island].name}, night ${run.night + 1} of ${NIGHT_COUNT}`;
  text(ctx, won ? victoryLine(run) : `Your last heart faded on ${where}.`, 640, y0 + 36, { size: 18, color: ink.soft, align: 'center' });

  const cardY = y0 + 60;
  fillRound(ctx, 250, cardY, 780, won ? 300 : 390, 20, ink.panel, won ? INK.gold : INK.rose, 2);
  text(ctx, 'FINAL SCORE', 330, cardY + 40, { size: 13, weight: 800, color: ink.dim, shadow: false });
  text(ctx, String(run.score), 330, cardY + 96, { size: 64, weight: 800, color: INK.gold });
  if (outcome?.newBest) text(ctx, '★ New record', 334, cardY + 126, { size: 17, weight: 800, color: INK.mint });
  else if (outcome?.previousBest) text(ctx, `Record: ${outcome.previousBest}`, 334, cardY + 126, { size: 15, color: ink.dim });

  const stats = [
    ['Nights cleared', `${run.stats.nightsCleared} / ${NIGHT_COUNT}`],
    ['Blooms harvested', String(run.stats.harvested)],
    ['Blooms withered', String(run.stats.withered)],
    ['Best chorus', run.stats.bestChorus > 1 ? `${run.stats.bestChorus} at once` : '—'],
    ['Hearts left', `${run.hearts} / ${run.maxHearts}`],
    ['Expedition', `${DIFFICULTIES[run.difficulty].name} · seed ${run.seed}`],
  ];
  stats.forEach(([k, v], i) => {
    const sy = cardY + 40 + i * 28;
    text(ctx, k, 620, sy, { size: 15, color: ink.soft });
    text(ctx, v, 990, sy, { size: 15, weight: 800, color: ink.text, align: 'right' });
  });
  // harvest by species
  const species = Object.keys(SPECIES);
  species.forEach((sp, i) => {
    const x = 330 + i * 90;
    const y = cardY + 210;
    drawBloom(ctx, sp, x, y, 56, { stage: 1, t, alpha: run.stats.bySpecies[sp] ? 1 : 0.3 });
    text(ctx, `×${run.stats.bySpecies[sp] ?? 0}`, x, y + 44, { size: 15, weight: 800, color: run.stats.bySpecies[sp] ? ink.text : ink.dim, align: 'center' });
  });
  const boons = run.boons.map((id) => boonById(id).name).join(' · ') || 'no boons';
  text(ctx, `Boons: ${boons}`, 640, cardY + (won ? 288 : 290), { size: 13, color: INK.gold, align: 'center' });
  if (!won) {
    text(ctx, outcome?.tip ?? '', 640, cardY + 330, { size: 15, color: ink.soft, align: 'center' });
  }

  const by = won ? 630 : 590;
  button(ui, { id: 'new-run', x: 330, y: by, w: 250, h: 58, label: 'New Expedition', sub: 'fresh seed', hint: 'Enter', primary: true, size: 20, onClick: ui.actions.newRun });
  button(ui, { id: 'retry-seed', x: 596, y: by, w: 200, h: 58, label: 'Retry Seed', sub: `seed ${run.seed}`, hint: 'R', onClick: ui.actions.retrySeed });
  button(ui, { id: 'to-title', x: 812, y: by, w: 140, h: 58, label: 'Title', hint: 'T', onClick: ui.actions.toTitle });
}

/** The victory subtitle, honest about the run: the goal is surviving all seven nights; the Dawnheart is a bonus. */
export function victoryLine(run) {
  const hearts = run.stats.bySpecies.dawnheart ?? 0;
  if (hearts > 0) return `The Dawnheart bloomed${hearts > 1 ? ` ×${hearts}` : ''}. All seven nights survived; your expedition is complete.`;
  return 'All seven nights survived; your expedition is complete. The Dawnheart slipped away this time.';
}
