// The expedition's three sky islands and the seven nights spent on them. Each island has its own seeded
// terrain (sky rifts the light crosses but nothing can stand on, standing stones that block it) and its own
// storms; each night lists which blooms sprout at which hour, so difficulty climbs on a designed curve
// while the seed varies where everything lands.

import { COLS, ROWS, CELL_COUNT, cellIndex, cellX, cellY, inBounds, manhattan } from './grid.js';
import { streamFor } from './rng.js';

export const ISLANDS = [
  {
    id: 'verdant',
    name: 'Verdant Shoal',
    motto: 'Soft winds over the first gardens.',
    rifts: [2, 3],
    stones: [2, 3],
    storms: ['gale'],
  },
  {
    id: 'mistveil',
    name: 'Mistveil Reach',
    motto: 'Clouds drift low; some blooms want the dark.',
    rifts: [3, 4],
    stones: [3, 4],
    storms: ['cloud', 'gale'],
  },
  {
    id: 'stormcrown',
    name: 'Stormcrown',
    motto: 'Hail and eclipse guard the Dawnheart.',
    rifts: [3, 5],
    stones: [4, 5],
    storms: ['hail', 'gale', 'cloud', 'eclipse'],
  },
];

// Sprouts per hour (index = hour) and which pulses bring a storm. Species are written as initials:
// d dawnpetal, m moonlily, t twinbell, s shadecap, H dawnheart.
const CODES = { d: 'dawnpetal', m: 'moonlily', t: 'twinbell', s: 'shadecap', H: 'dawnheart' };
const NIGHT_PLANS = [
  { island: 0, hours: 5, sprouts: ['dd', 'd', 'd', ''], storms: [] },
  { island: 0, hours: 5, sprouts: ['dd', 'dm', 'd', 'd'], storms: [2, 4] },
  { island: 1, hours: 5, sprouts: ['dt', 's', 'dd', 't'], storms: [1, 3] },
  { island: 1, hours: 6, sprouts: ['tdm', 'sd', 'dt', 'ms', 'dd'], storms: [1, 2, 3, 4, 5] },
  { island: 2, hours: 6, sprouts: ['dmd', 'td', 'sd', 'md', 'td'], storms: [1, 2, 3, 4, 5] },
  { island: 2, hours: 6, sprouts: ['mtd', 'sdd', 'mt', 'dsd', 'td'], storms: [1, 2, 3, 4, 5] },
  { island: 2, hours: 7, sprouts: ['Hd', 'tdd', 'sm', 'md', 'tds', 'd'], storms: [1, 2, 3, 4, 5, 6] },
];

export const NIGHT_COUNT = NIGHT_PLANS.length;

/** The plan of night `n` (0-based) with sprout codes expanded to species names. */
export function nightPlan(n, difficulty) {
  const plan = NIGHT_PLANS[n];
  const sprouts = plan.sprouts.map((code) => [...code].map((c) => CODES[c]));
  // Stormcaller nights carry one extra dawnpetal in their second hour and storm every pulse.
  if (difficulty?.extraSprouts && sprouts.length > 1) sprouts[1] = [...sprouts[1], 'dawnpetal'];
  const storms = difficulty?.stormEveryPulse && n > 0 ? Array.from({ length: plan.hours - 1 }, (_, i) => i + 1) : plan.storms;
  return { night: n, island: plan.island, hours: plan.hours, sprouts, storms };
}

/** Night index -> its position on the island (1..3) for headings like "Night 2 of Mistveil Reach". */
export function nightOnIsland(n) {
  return NIGHT_PLANS.slice(0, n + 1).filter((p) => p.island === NIGHT_PLANS[n].island).length;
}

/** True when night `n` is the first night on a new island (the board changes and relays return). */
export function startsIsland(n) {
  return n === 0 || NIGHT_PLANS[n].island !== NIGHT_PLANS[n - 1].island;
}

/**
 * Seeded terrain of one island: 'land', 'void' (sky rift), 'rock' (standing stone) and one 'well'.
 * Rifts are short random walks; stones never crowd the well; the well's four neighbours stay land so its
 * light can always leave in any direction.
 */
export function generateIsland(seed, islandIndex) {
  const def = ISLANDS[islandIndex];
  const rng = streamFor(seed, 'island', islandIndex);
  const terrain = new Array(CELL_COUNT).fill('land');
  const wellIndex = cellIndex(rng.int(3, 6), rng.int(2, 4));
  const protectedCell = (i) => manhattan(i, wellIndex) <= 1;

  // Ragged corners make each island read as a floating landmass.
  for (const [cx, cy] of [[0, 0], [COLS - 1, 0], [0, ROWS - 1], [COLS - 1, ROWS - 1]]) {
    if (rng.chance(0.7)) terrain[cellIndex(cx, cy)] = 'void';
  }
  const rifts = rng.int(def.rifts[0], def.rifts[1]);
  for (let r = 0; r < rifts; r++) {
    let x = rng.int(0, COLS - 1);
    let y = rng.int(0, ROWS - 1);
    const length = rng.int(2, 4);
    for (let s = 0; s < length; s++) {
      const i = cellIndex(x, y);
      if (!protectedCell(i) && manhattan(i, wellIndex) > 2) terrain[i] = 'void';
      const horizontal = rng.chance(0.5);
      const nx = x + (horizontal ? rng.pick([-1, 1]) : 0);
      const ny = y + (horizontal ? 0 : rng.pick([-1, 1]));
      if (inBounds(nx, ny)) {
        x = nx;
        y = ny;
      }
    }
  }
  const stones = rng.int(def.stones[0], def.stones[1]);
  let placed = 0;
  for (let tries = 0; placed < stones && tries < 200; tries++) {
    const i = rng.int(0, CELL_COUNT - 1);
    if (terrain[i] !== 'land' || manhattan(i, wellIndex) < 3) continue;
    terrain[i] = 'rock';
    placed++;
  }
  terrain[wellIndex] = 'well';
  return { terrain, wellIndex, island: islandIndex };
}

/** Cells where a bloom may sprout: land, away from the well. */
export function gardenCells(board) {
  const out = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    if (board.terrain[i] === 'land' && manhattan(i, board.wellIndex) >= 2) out.push(i);
  }
  return out;
}

export { cellX, cellY };
