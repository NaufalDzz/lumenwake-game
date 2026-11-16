// How to play: four illustrated columns (light, blooms, storms, the expedition) and the controls.

import { text, wrapText, fillRound } from '../render/canvas-kit.js';
import { FONT_DISPLAY, INK } from '../render/palette.js';
import { button, panel } from './widgets.js';
import { drawRelay } from '../render/relay-art.js';
import { drawBloom } from '../render/bloom-art.js';
import { SPECIES } from '../rules/blooms.js';
import { RELAYS, RELAY_ORDER } from '../rules/relays.js';

export function drawHowTo(ui) {
  const { ctx, ink, t } = ui;
  ctx.fillStyle = 'rgba(6, 5, 22, 0.78)';
  ctx.fillRect(0, 0, 1280, 720);
  text(ctx, 'How to keep the light', 640, 58, { size: 36, weight: 700, color: INK.gold, align: 'center', font: FONT_DISPLAY });

  const cols = [
    { x: 30, title: '1 · Route the light' },
    { x: 340, title: '2 · Grow the blooms' },
    { x: 650, title: '3 · Weather storms' },
    { x: 960, title: '4 · The expedition' },
  ];
  for (const c of cols) panel(ui, c.x, 84, 290, 520, c.title);

  // relays
  RELAY_ORDER.forEach((type, i) => {
    const y = 130 + i * 74;
    drawRelay(ctx, type, 0, 64, y + 12, 54, { lit: true, t });
    text(ctx, RELAYS[type].name, 100, y + 6, { size: 15, weight: 800, color: ink.text });
    wrapText(ctx, RELAYS[type].blurb, 100, y + 24, 200, 15, { size: 12, color: ink.soft });
  });
  wrapText(ctx, 'The Lumen Well shines strength 3. Pick a relay card (1-4), click a cell to place it: 1 focus. Click a mirror to flip it: 1 focus. Right-click a relay to lift it back: free. Turn the well (W): 1 focus.', 48, 436, 258, 17, { size: 13, color: ink.dim });

  // blooms
  ['dawnpetal', 'moonlily', 'twinbell', 'shadecap', 'dawnheart'].forEach((sp, i) => {
    const y = 128 + i * 64;
    drawBloom(ctx, sp, 372, y + 14, 52, { stage: 1, t });
    text(ctx, SPECIES[sp].name, 404, y + 8, { size: 15, weight: 800, color: ink.text });
    text(ctx, SPECIES[sp].need, 404, y + 26, { size: 12, color: ink.soft });
    text(ctx, `grows in ${SPECIES[sp].growth} · ${SPECIES[sp].value} pts`, 404, y + 42, { size: 11, color: ink.dim, shadow: false });
  });
  wrapText(ctx, 'Each pulse a bloom grows ▲ (need met), holds ● (some light) or wilts ▼ (loses a patience leaf). At zero it withers and you lose a heart. Badges preview the next pulse.', 358, 460, 258, 17, { size: 13, color: ink.dim });

  // storms
  const storms = [
    ['Gale', 'Flips every mirror in one row or column. Pre-flip a mirror to ride it.'],
    ['Cloudbank', 'A 2×2 cloud blocks light for two pulses. Shadecaps love it.'],
    ['Hail', 'Knocks relays on two cells back to your satchel.'],
    ['Eclipse', 'The well burns 1 weaker for one pulse.'],
  ];
  storms.forEach(([name, blurb], i) => {
    const y = 132 + i * 86;
    text(ctx, `⚡ ${name}`, 668, y, { size: 16, weight: 800, color: '#bfe8ff' });
    wrapText(ctx, blurb, 668, y + 20, 250, 16, { size: 13, color: ink.soft });
  });
  wrapText(ctx, 'Every storm is forecast on the board and in the Next Pulse card before you commit, and the beams you see already include it.', 668, 486, 258, 17, { size: 13, color: ink.dim });

  // expedition
  wrapText(ctx, 'Seven nights on three islands: Verdant Shoal, Mistveil Reach, Stormcrown. Keep at least one heart through all seven nights to win; the Dawnheart on the last night is a rich bonus. Lose every heart and the expedition ends.', 978, 128, 258, 17, { size: 13, color: ink.soft });
  wrapText(ctx, 'Relays stay where you set them for the whole island. Focus left over carries into the next hour (up to +2). Landfall on a new island gives +4 focus.', 978, 236, 258, 17, { size: 13, color: ink.soft });
  wrapText(ctx, 'Between nights, the waystation offers one of three boons, a trader selling relays for dew, and a healer.', 978, 328, 258, 17, { size: 13, color: ink.soft });
  wrapText(ctx, 'Score: bloom values, +25% per extra harvest in the same pulse (Chorus), night bonuses, a flawless-night bonus and 50 per heart left at dawn.', 978, 404, 258, 17, { size: 13, color: INK.gold });

  fillRound(ctx, 30, 616, 1220, 40, 12, 'rgba(255,255,255,0.06)');
  text(ctx, 'Mouse: click cards, cells, mirrors, well · right-click lifts   ·   Keys: arrows move · Enter acts · 1-4 relay · F flip ghost · X lift · W well · Space pulse · Z undo · Esc menu · M sound', 640, 642, { size: 13, weight: 700, color: ink.text, align: 'center' });
  button(ui, { id: 'howto-close', x: 540, y: 664, w: 200, h: 46, label: 'Got it', hint: 'Esc', primary: true, onClick: ui.actions.closeHowto });
}
