// LUMENWAKE puzzle rules: tiles, ports, rotation, light reachability, move budget, undo/reset, win/loss.
// Pure logic with no DOM access, so the same file runs in the browser and in the Node tests.

export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

export const DIRS = [
  { bit: N, dr: -1, dc: 0, opp: S, name: 'N' },
  { bit: E, dr: 0, dc: 1, opp: W, name: 'E' },
  { bit: S, dr: 1, dc: 0, opp: N, name: 'S' },
  { bit: W, dr: 0, dc: -1, opp: E, name: 'W' },
];

// Solved-layout glyphs used by the handcrafted stages.
export const GLYPH_PORTS = {
  '─': E | W, '│': N | S,
  '└': N | E, '┌': E | S, '┐': S | W, '┘': N | W,
  '├': N | E | S, '┤': N | S | W, '┬': E | S | W, '┴': N | E | W,
  '┼': N | E | S | W,
};
// Lighthouse (source) and garden (target) glyphs carry the direction of their single port.
export const SOURCE_GLYPHS = { R: E, L: W, U: N, D: S };
export const TARGET_GLYPHS = { r: E, l: W, u: N, d: S };

/** Rotate a port mask clockwise by `turns` quarter turns (negative = counter-clockwise). */
export function rotateMask(mask, turns) {
  let t = ((turns % 4) + 4) % 4;
  let m = mask;
  while (t-- > 0) m = ((m << 1) | (m >> 3)) & 15;
  return m;
}

export function portCount(mask) {
  return ((mask >> 0) & 1) + ((mask >> 1) & 1) + ((mask >> 2) & 1) + ((mask >> 3) & 1);
}

/** Shape name for a pipe mask, used by rendering and the rules text. */
export function shapeOf(mask) {
  const n = portCount(mask);
  if (n === 4) return 'cross';
  if (n === 3) return 'branch';
  if (n === 2) return mask === (N | S) || mask === (E | W) ? 'straight' : 'turn';
  return n === 1 ? 'cap' : 'none';
}

/** Fewest single quarter turns (either way) that take mask `from` to mask `to`, or -1 if impossible. */
export function turnsBetween(from, to) {
  let best = -1;
  for (let k = 0; k < 4; k++) {
    if (rotateMask(from, k) === to) {
      const cost = Math.min(k, 4 - k);
      if (best < 0 || cost < best) best = cost;
    }
  }
  return best;
}

/** Small deterministic PRNG (mulberry32) so every stage scrambles the same way each time. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Parse a stage definition's solved grid into tiles (still in solved orientation). */
export function parseLayout(def) {
  const rows = def.grid.length;
  const cols = Math.max(...def.grid.map((line) => [...line].length));
  const locked = new Set((def.lock ?? []).map(([r, c]) => `${r},${c}`));
  const tiles = [];
  for (let r = 0; r < rows; r++) {
    const chars = [...def.grid[r]];
    for (let c = 0; c < cols; c++) {
      const ch = chars[c] ?? '.';
      let tile;
      if (ch in GLYPH_PORTS) tile = { kind: 'pipe', mask: GLYPH_PORTS[ch] };
      else if (ch in SOURCE_GLYPHS) tile = { kind: 'source', mask: SOURCE_GLYPHS[ch] };
      else if (ch in TARGET_GLYPHS) tile = { kind: 'target', mask: TARGET_GLYPHS[ch] };
      else if (ch === '.') tile = { kind: 'empty', mask: 0 };
      else throw new Error(`Stage ${def.id}: unknown glyph "${ch}" at ${r},${c}`);
      tile.r = r;
      tile.c = c;
      tile.solvedMask = tile.mask;
      tile.locked = tile.kind !== 'pipe' || locked.has(`${r},${c}`);
      tile.stone = tile.kind === 'pipe' && locked.has(`${r},${c}`);
      tiles.push(tile);
    }
  }
  return { rows, cols, tiles };
}

export function tileAt(state, r, c) {
  if (r < 0 || c < 0 || r >= state.rows || c >= state.cols) return null;
  return state.tiles[r * state.cols + c];
}

/**
 * Follow the light from every lighthouse through reciprocal ports only: a tile is lit when a lit neighbour
 * has a port facing it and it has the matching port facing back. Returns lit flags, the direction light
 * entered each tile (for flow animation), BFS depth, lit gardens and open "leaking" ports.
 */
export function traceLight(state) {
  const count = state.tiles.length;
  const lit = new Array(count).fill(false);
  const depth = new Array(count).fill(-1);
  const entry = new Array(count).fill(0);
  const queue = [];
  state.tiles.forEach((t, i) => {
    if (t.kind === 'source') {
      lit[i] = true;
      depth[i] = 0;
      queue.push(i);
    }
  });
  let leaks = 0;
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q];
    const t = state.tiles[i];
    for (const d of DIRS) {
      if (!(t.mask & d.bit)) continue;
      const n = tileAt(state, t.r + d.dr, t.c + d.dc);
      if (!n || !(n.mask & d.opp)) {
        leaks++;
        continue;
      }
      const j = n.r * state.cols + n.c;
      if (lit[j]) continue;
      lit[j] = true;
      depth[j] = depth[i] + 1;
      entry[j] = d.opp;
      if (n.kind !== 'target') queue.push(j);
    }
  }
  const targets = state.tiles.filter((t) => t.kind === 'target');
  const litTargets = targets.filter((t) => lit[t.r * state.cols + t.c]).length;
  return { lit, depth, entry, litTargets, totalTargets: targets.length, leaks };
}

export function isSolved(state) {
  const flow = traceLight(state);
  return flow.totalTargets > 0 && flow.litTargets === flow.totalTargets;
}

/** Deterministic scramble: every rotatable pipe on the solved route is turned 1-3 steps, decoys 0-3. */
export function scrambleTurns(def, layout) {
  const rand = seededRandom(def.seed ?? def.id * 7919);
  const solvedFlow = traceLight(layout);
  const turns = new Array(layout.tiles.length).fill(0);
  layout.tiles.forEach((t, i) => {
    if (t.kind !== 'pipe' || t.locked || t.mask === 15) return;
    const onRoute = solvedFlow.lit[i];
    let k = onRoute ? 1 + Math.floor(rand() * 3) : Math.floor(rand() * 4);
    // A turn that leaves a straight looking the same is no scramble at all: push it a further step.
    if (onRoute && rotateMask(t.mask, k) === t.mask) k = (k % 3) + 1;
    turns[i] = k;
  });
  return turns;
}

/** Build a fresh, scrambled play state for a stage definition. */
export function createGame(def) {
  const layout = parseLayout(def);
  const turns = scrambleTurns(def, layout);
  const solvedFlow = traceLight(layout);
  if (solvedFlow.litTargets !== solvedFlow.totalTargets || solvedFlow.totalTargets === 0) {
    throw new Error(`Stage ${def.id}: solved layout does not wake every garden`);
  }
  const tiles = layout.tiles.map((t, i) => ({ ...t, mask: rotateMask(t.mask, turns[i]) }));
  // Par: the fewest quarter turns that put every route tile back in its solved orientation.
  let par = 0;
  tiles.forEach((t, i) => {
    if (solvedFlow.lit[i] && t.kind === 'pipe') par += turnsBetween(t.mask, t.solvedMask);
  });
  const slack = def.slack ?? Math.max(4, Math.ceil(par * 0.5));
  const state = {
    def,
    id: def.id,
    rows: layout.rows,
    cols: layout.cols,
    tiles,
    initialMasks: tiles.map((t) => t.mask),
    par,
    budget: par + slack,
    moves: 0,
    undos: 0,
    history: [],
    status: 'playing',
  };
  if (isSolved(state)) throw new Error(`Stage ${def.id}: scramble left the stage already solved`);
  return state;
}

/**
 * Rotate the tile at r,c one quarter turn: dir +1 clockwise, -1 counter-clockwise. Spends one unit of tide.
 * Returns { ok, reason, solved, lost } so the UI can give the right feedback.
 */
export function rotateTile(state, r, c, dir = 1) {
  if (state.status !== 'playing') return { ok: false, reason: 'over' };
  const t = tileAt(state, r, c);
  if (!t || t.kind === 'empty') return { ok: false, reason: 'empty' };
  if (t.locked) return { ok: false, reason: t.stone ? 'stone' : 'fixed' };
  const before = traceLight(state).litTargets;
  state.history.push({ index: t.r * state.cols + t.c, mask: t.mask });
  t.mask = rotateMask(t.mask, dir >= 0 ? 1 : -1);
  state.moves++;
  const flow = traceLight(state);
  const solved = flow.litTargets === flow.totalTargets;
  if (solved) state.status = 'won';
  else if (state.moves >= state.budget) state.status = 'lost';
  return { ok: true, solved, lost: state.status === 'lost', woke: flow.litTargets - before, flow };
}

/** Undo the last turn: the tile turns back and its tide is returned. Not possible once a stage ends. */
export function undoMove(state) {
  if (state.status !== 'playing' || state.history.length === 0) return { ok: false };
  const last = state.history.pop();
  state.tiles[last.index].mask = last.mask;
  state.moves--;
  state.undos++;
  return { ok: true, index: last.index };
}

/** Restore the deterministic scrambled start; the stage can be replayed after a win or a loss. */
export function resetGame(state) {
  state.tiles.forEach((t, i) => {
    t.mask = state.initialMasks[i];
  });
  state.moves = 0;
  state.undos = 0;
  state.history = [];
  state.status = 'playing';
}

/** Stars and score for a finished stage. */
export function scoreResult(state) {
  if (state.status !== 'won') return { stars: 0, score: 0 };
  const twoStar = state.par + Math.ceil(state.par * 0.35) + 1;
  const stars = state.moves <= state.par ? 3 : state.moves <= twoStar ? 2 : 1;
  const tideLeft = state.budget - state.moves;
  const score = 300 + stars * 200 + tideLeft * 40 + state.par * 10 - state.undos * 5;
  return { stars, score: Math.max(100, score), tideLeft, twoStar };
}

/** A legal clockwise/counter-clockwise turn list that solves a fresh state (used by tests and docs). */
export function solutionSequence(state) {
  const solvedFlow = traceLight({ ...state, tiles: state.tiles.map((t) => ({ ...t, mask: t.solvedMask })) });
  const steps = [];
  state.tiles.forEach((t, i) => {
    if (t.kind !== 'pipe' || t.locked || !solvedFlow.lit[i]) return;
    for (let k = 0; k < 4; k++) {
      if (rotateMask(t.mask, k) !== t.solvedMask) continue;
      if (k === 0) break;
      const dir = k <= 2 ? 1 : -1;
      const count = k <= 2 ? k : 1;
      for (let n = 0; n < count; n++) steps.push({ r: t.r, c: t.c, dir });
      break;
    }
  });
  return steps;
}
