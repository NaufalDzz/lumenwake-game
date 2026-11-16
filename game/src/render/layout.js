// Screen layout in world pixels (the canvas is always 1280 x 720 world units, scaled to fit the window).
// Board cells, the side panel and the satchel tray are placed here so drawing and hit-testing agree.

import { COLS, ROWS, cellIndex } from '../rules/grid.js';

export const WORLD = { w: 1280, h: 720 };
export const BOARD = { x: 34, y: 82, cell: 70 };
BOARD.w = BOARD.cell * COLS;
BOARD.h = BOARD.cell * ROWS;
export const PANEL = { x: 770, y: 82, w: 476, h: 622 };
export const TRAY = { x: 34, y: BOARD.y + BOARD.h + 30, w: BOARD.w, h: 104 };

export const cellLeft = (x) => BOARD.x + x * BOARD.cell;
export const cellTop = (y) => BOARD.y + y * BOARD.cell;

/** Centre of a cell index in world pixels. */
export function cellCenter(i) {
  return { x: BOARD.x + ((i % COLS) + 0.5) * BOARD.cell, y: BOARD.y + (Math.floor(i / COLS) + 0.5) * BOARD.cell };
}

/** Grid units (cell centres at +0.5) to world pixels, used for beam segments. */
export const gridToWorld = (gx, gy) => ({ x: BOARD.x + gx * BOARD.cell, y: BOARD.y + gy * BOARD.cell });

/** The cell under a world point, or -1. */
export function cellAt(px, py) {
  const x = Math.floor((px - BOARD.x) / BOARD.cell);
  const y = Math.floor((py - BOARD.y) / BOARD.cell);
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return -1;
  return cellIndex(x, y);
}
