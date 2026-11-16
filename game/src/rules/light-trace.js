// Traces the Lumen Well's beams across the board. Beams travel cell to cell in straight lines, bend at
// mirrors, split at prisms, brighten through lenses, pool in halo lanterns, and stop at rocks, storm
// clouds and blooms (a bloom drinks the light that reaches it). The result feeds both the bloom rules
// and the renderer, so what the player sees is exactly what the rules use.

import { COLS, ROWS, DIRS, cellIndex, inBounds, neighbours } from './grid.js';
import { reflect, splitBeam, focusBeam, haloGlow } from './relays.js';

const MAX_STEPS = 4000;

/**
 * @param {object} field
 *   terrain: string[] ('land' | 'void' | 'rock' | 'well'), wellIndex, wellDirs: number[],
 *   relays: (null | {type, orient})[], bloomCells: Set<number>, clouds: Set<number>,
 *   mods: { wellStrength, prismLoss, lensGain, haloReach }
 */
export function traceLight(field) {
  const { terrain, wellIndex, wellDirs, relays, bloomCells, clouds, mods } = field;
  const segments = [];
  const light = new Map(); // cell -> [{ strength, from }]
  const crossed = new Set(); // every cell a beam enters
  const haloInput = new Map(); // halo cell -> strongest beam that reached it
  const relayHits = new Set();
  const seen = new Set();
  const queue = [];
  const wx = wellIndex % COLS;
  const wy = Math.floor(wellIndex / COLS);

  const addLight = (cell, strength, from) => {
    if (!light.has(cell)) light.set(cell, []);
    light.get(cell).push({ strength, from });
  };

  for (const dir of wellDirs) queue.push({ x: wx, y: wy, dir, strength: mods.wellStrength });

  let steps = 0;
  while (queue.length && steps < MAX_STEPS) {
    const beam = queue.shift();
    let { x, y, dir, strength } = beam;
    const startX = x + 0.5;
    const startY = y + 0.5;
    let endX = startX;
    let endY = startY;
    const push = () => {
      if (endX !== startX || endY !== startY) segments.push({ ax: startX, ay: startY, bx: endX, by: endY, strength, dir });
    };
    for (;;) {
      steps++;
      if (steps > MAX_STEPS) break;
      const nx = x + DIRS[dir].dx;
      const ny = y + DIRS[dir].dy;
      if (!inBounds(nx, ny)) {
        endX = x + 0.5 + DIRS[dir].dx * 0.5;
        endY = y + 0.5 + DIRS[dir].dy * 0.5;
        push();
        break;
      }
      const cell = cellIndex(nx, ny);
      const key = cell * 4 + dir;
      if (seen.has(key)) {
        endX = nx + 0.5;
        endY = ny + 0.5;
        push();
        break;
      }
      seen.add(key);
      const t = terrain[cell];
      if (t === 'rock' || t === 'well') {
        endX = nx + 0.5 - DIRS[dir].dx * 0.42;
        endY = ny + 0.5 - DIRS[dir].dy * 0.42;
        push();
        break;
      }
      crossed.add(cell);
      endX = nx + 0.5;
      endY = ny + 0.5;
      if (clouds.has(cell)) {
        push();
        break;
      }
      if (bloomCells.has(cell)) {
        addLight(cell, strength, `beam:${dir}`);
        push();
        break;
      }
      const relay = relays[cell];
      x = nx;
      y = ny;
      if (!relay) continue;
      relayHits.add(cell);
      if (relay.type === 'mirror') {
        push();
        queue.push({ x, y, dir: reflect(relay.orient, dir), strength });
        break;
      }
      if (relay.type === 'prism') {
        push();
        for (const half of splitBeam(dir, strength, mods.prismLoss)) {
          if (half.strength > 0) queue.push({ x, y, dir: half.dir, strength: half.strength });
        }
        break;
      }
      if (relay.type === 'lens') {
        push();
        queue.push({ x, y, dir, strength: focusBeam(strength, mods.lensGain) });
        break;
      }
      if (relay.type === 'halo') {
        haloInput.set(cell, Math.max(haloInput.get(cell) ?? 0, strength));
        push();
        break;
      }
    }
  }

  // Lit halo lanterns shed glow on their neighbours; glow lights blooms but never relays or other halos.
  const halos = [];
  for (const [cell, input] of haloInput) {
    const glow = haloGlow(input);
    const reach = neighbours(cell, mods.haloReach >= 8).filter((n) => terrain[n] !== 'rock' && !clouds.has(n));
    halos.push({ cell, strength: glow, reach });
    for (const n of reach) {
      crossed.add(n);
      if (bloomCells.has(n)) addLight(n, glow, `halo:${cell}`);
    }
  }

  return { segments, light, crossed, halos, relayHits };
}

/** Sum of light strength a cell received. */
export function totalLight(trace, cell) {
  return (trace.light.get(cell) ?? []).reduce((sum, l) => sum + l.strength, 0);
}

/** Number of distinct sources (beam directions or halo lanterns) lighting a cell. */
export function distinctSources(trace, cell) {
  return new Set((trace.light.get(cell) ?? []).map((l) => l.from)).size;
}

export const BOARD_SIZE = { cols: COLS, rows: ROWS };
