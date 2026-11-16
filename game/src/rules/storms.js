// Storms of the sky islands. Each storm is forecast while the keeper plans and strikes at the start of
// the next pulse, before the light flows, so every one can be answered:
//   gale    — a gust down one row or column flips every mirror in it (pre-flip a mirror to ride it)
//   cloud   — a 2x2 cloudbank blocks light there for this pulse and the next
//   hail    — two cells are struck; relays there are knocked back into the satchel
//   eclipse — the well burns 1 weaker for this pulse

import { COLS, ROWS, cellIndex, cellX, cellY, manhattan } from './grid.js';
import { streamFor } from './rng.js';

export const STORM_INFO = {
  gale: { name: 'Gale', blurb: 'flips every mirror in its lane' },
  cloud: { name: 'Cloudbank', blurb: 'blocks light for two pulses' },
  hail: { name: 'Hail', blurb: 'knocks struck relays back to your satchel' },
  eclipse: { name: 'Eclipse', blurb: 'the well burns 1 weaker' },
};

/**
 * Forecast the storm of one pulse. Gales and hail aim at the keeper's network when there is one, so they
 * always matter; every choice still comes from the seeded stream for this night and hour.
 */
export function forecastStorm(seed, night, hour, kinds, state) {
  const rng = streamFor(seed, 'storm', night, hour);
  const kind = rng.pick(kinds);
  const { relays, board } = state;
  if (kind === 'gale') {
    const lanes = [];
    for (let y = 0; y < ROWS; y++) lanes.push({ axis: 'row', line: y });
    for (let x = 0; x < COLS; x++) lanes.push({ axis: 'col', line: x });
    const withMirrors = lanes.filter((lane) => laneCells(lane).some((i) => relays[i]?.type === 'mirror'));
    const lane = rng.pick(withMirrors.length ? withMirrors : lanes);
    return { kind, ...lane, cells: laneCells(lane) };
  }
  if (kind === 'cloud') {
    const options = [];
    for (let y = 0; y < ROWS - 1; y++) {
      for (let x = 0; x < COLS - 1; x++) {
        const cells = [cellIndex(x, y), cellIndex(x + 1, y), cellIndex(x, y + 1), cellIndex(x + 1, y + 1)];
        if (cells.every((i) => board.terrain[i] !== 'well' && manhattan(i, board.wellIndex) > 1)) options.push(cells);
      }
    }
    return { kind, cells: rng.pick(options) };
  }
  if (kind === 'hail') {
    const relayCells = relays.map((r, i) => (r ? i : -1)).filter((i) => i >= 0);
    const open = board.terrain.map((t, i) => (t === 'land' ? i : -1)).filter((i) => i >= 0);
    const cells = [];
    if (relayCells.length) cells.push(rng.pick(relayCells));
    while (cells.length < 2) {
      const c = rng.pick(open);
      if (!cells.includes(c)) cells.push(c);
    }
    return { kind, cells };
  }
  return { kind: 'eclipse', cells: [] };
}

/** Cells along a gale's lane. */
export function laneCells({ axis, line }) {
  const out = [];
  if (axis === 'row') for (let x = 0; x < COLS; x++) out.push(cellIndex(x, line));
  else for (let y = 0; y < ROWS; y++) out.push(cellIndex(line, y));
  return out;
}

/** Human description of a forecast, e.g. "Gale along row 3". */
export function describeStorm(storm) {
  if (!storm) return 'Calm skies';
  if (storm.kind === 'gale') return storm.axis === 'row' ? `Gale along row ${storm.line + 1}` : `Gale down column ${colName(storm.line)}`;
  if (storm.kind === 'cloud') return `Cloudbank near ${colName(cellX(storm.cells[0]))}${cellY(storm.cells[0]) + 1}`;
  if (storm.kind === 'hail') return `Hail on ${storm.cells.map((c) => colName(cellX(c)) + (cellY(c) + 1)).join(' & ')}`;
  return 'Eclipse dims the well';
}

const colName = (x) => 'ABCDEFGHIJ'[x];
