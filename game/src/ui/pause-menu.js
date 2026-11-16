// Pause menu during a night or waystation: resume, guide, options and abandoning the run.

import { text, fillRound } from '../render/canvas-kit.js';
import { FONT_DISPLAY, INK } from '../render/palette.js';
import { button } from './widgets.js';

export function drawPauseMenu(ui) {
  const { ctx, ink } = ui;
  ctx.fillStyle = 'rgba(6, 5, 22, 0.7)';
  ctx.fillRect(0, 0, 1280, 720);
  fillRound(ctx, 470, 130, 340, 460, 22, ink.panel, ink.panelEdge, 2);
  text(ctx, 'Paused', 640, 190, { size: 40, weight: 700, color: INK.gold, align: 'center', font: FONT_DISPLAY });
  const items = [
    ['resume', 'Resume', 'Esc', ui.actions.pause, true],
    ['pause-howto', 'How to Play', 'H', ui.actions.howto],
    ['pause-mute', ui.muted ? 'Sound: Off' : 'Sound: On', 'M', ui.actions.toggleMute],
    ['pause-contrast', ui.settings.contrast ? 'High Contrast: On' : 'High Contrast: Off', '', ui.actions.toggleContrast],
    ['pause-motion', ui.settings.reduceMotion ? 'Reduced Motion: On' : 'Reduced Motion: Off', '', ui.actions.toggleMotion],
    ['abandon', 'Abandon to Title', '', ui.actions.abandon],
  ];
  items.forEach(([id, label, hint, onClick, primary], i) => {
    button(ui, { id, x: 510, y: 222 + i * 58, w: 260, h: 48, label, hint, onClick, primary, size: 16 });
  });
}
