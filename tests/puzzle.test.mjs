// Rule tests for LUMENWAKE (Node built-ins only): run with `node --test tests/`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  N, E, S, W, rotateMask, turnsBetween, parseLayout, traceLight, createGame, rotateTile, undoMove, resetGame,
  scoreResult, solutionSequence, isSolved, tileAt,
} from '../game/src/puzzle.js';
import { LEVELS } from '../game/src/levels.js';

const tiny = (grid, extra = {}) => ({ id: 99, seed: 5, grid, ...extra });

test('rotation turns ports clockwise and back', () => {
  assert.equal(rotateMask(N, 1), E);
  assert.equal(rotateMask(E | S, 1), S | W);
  assert.equal(rotateMask(N | E | S, 1), E | S | W);
  assert.equal(rotateMask(W, 1), N);
  assert.equal(rotateMask(N | E, -1), N | W);
  for (let m = 0; m < 16; m++) {
    assert.equal(rotateMask(m, 4), m);
    assert.equal(rotateMask(rotateMask(m, 1), -1), m);
  }
  assert.equal(turnsBetween(N | S, E | W), 1);
  assert.equal(turnsBetween(N | E, S | W), 2);
  assert.equal(turnsBetween(N | E, N | W), 1);
  assert.equal(turnsBetween(N, N | S), -1);
});

test('light needs reciprocal ports: a one-sided opening does not connect', () => {
  const lay = parseLayout(tiny(['R─l']));
  assert.equal(traceLight(lay).litTargets, 1);
  // straight turned to N|S: source points east but the canal has no west port
  lay.tiles[1].mask = N | S;
  const flow = traceLight(lay);
  assert.equal(flow.litTargets, 0);
  assert.equal(flow.lit[1], false);
  // canal opens west toward the source but not east toward the garden
  lay.tiles[1].mask = N | W;
  const flow2 = traceLight(lay);
  assert.equal(flow2.lit[1], true);
  assert.equal(flow2.litTargets, 0);
});

test('targets do not pass light onward and sources start the flow', () => {
  const lay = parseLayout(tiny(['R─r─l']));
  // the first garden faces east, away from the canal on its west: it stays dark and blocks nothing beyond it
  const flow = traceLight(lay);
  assert.equal(flow.lit[0], true);
  assert.equal(flow.lit[2], false);
  assert.equal(flow.lit[4], false);
  assert.equal(flow.totalTargets, 2);
});

test('branch tiles feed several gardens and all must be lit to solve', () => {
  const lay = parseLayout(tiny(['.d.', 'R┴l']));
  assert.equal(traceLight(lay).litTargets, 2);
  assert.ok(isSolved(lay));
  lay.tiles[4].mask = E | S | W; // branch turned so its north opening faces away
  const flow = traceLight(lay);
  assert.equal(flow.litTargets, 1);
  assert.equal(isSolved(lay), false);
});

test('locked stones, lighthouses, gardens and open water cannot be turned', () => {
  const g = createGame(LEVELS[2]); // Stone Steps has stones at 0,3 and 2,1
  assert.equal(rotateTile(g, 0, 3, 1).reason, 'stone');
  assert.equal(rotateTile(g, 0, 0, 1).reason, 'fixed');
  assert.equal(rotateTile(g, 2, 0, 1).reason, 'fixed');
  assert.equal(rotateTile(g, 1, 3, 1).reason, 'empty');
  assert.equal(g.moves, 0, 'refused turns cost no tide');
});

test('each turn spends one tide, undo returns it, reset restores the scramble', () => {
  const g = createGame(LEVELS[1]);
  const start = g.tiles.map((t) => t.mask);
  const pipe = g.tiles.find((t) => t.kind === 'pipe' && !t.locked);
  const before = pipe.mask;
  assert.ok(rotateTile(g, pipe.r, pipe.c, 1).ok);
  assert.equal(pipe.mask, rotateMask(before, 1));
  assert.equal(g.moves, 1);
  assert.ok(rotateTile(g, pipe.r, pipe.c, -1).ok);
  assert.equal(pipe.mask, before);
  assert.equal(g.moves, 2);
  assert.ok(undoMove(g).ok);
  assert.equal(g.moves, 1);
  assert.equal(pipe.mask, rotateMask(before, 1));
  assert.equal(g.undos, 1);
  resetGame(g);
  assert.deepEqual(g.tiles.map((t) => t.mask), start);
  assert.equal(g.moves, 0);
  assert.equal(g.history.length, 0);
  assert.equal(undoMove(g).ok, false);
});

test('running out of tide loses the stage, and reset allows a retry', () => {
  const g = createGame(LEVELS[1]);
  // spin a decoy canal (off the solved route) until the tide is gone: it can never wake a garden
  const solved = traceLight({ ...g, tiles: g.tiles.map((t) => ({ ...t, mask: t.solvedMask })) });
  const pipe = g.tiles.find((t, i) => t.kind === 'pipe' && !t.locked && !solved.lit[i]);
  assert.ok(pipe, 'stage 2 has a decoy canal');
  let last;
  while (g.status === 'playing') last = rotateTile(g, pipe.r, pipe.c, 1);
  assert.equal(g.status, 'lost');
  assert.equal(last.lost, true);
  assert.equal(g.moves, g.budget);
  assert.equal(rotateTile(g, pipe.r, pipe.c, 1).reason, 'over', 'no turns after the tide ebbs');
  assert.equal(undoMove(g).ok, false, 'undo cannot rescue a lost stage');
  resetGame(g);
  assert.equal(g.status, 'playing');
  assert.equal(scoreResult(g).stars, 0);
});

test('every stage is deterministic, starts unsolved, and its known turn sequence wins within budget', () => {
  assert.ok(LEVELS.length >= 10);
  const ids = new Set();
  for (const def of LEVELS) {
    assert.ok(!ids.has(def.id), `duplicate stage id ${def.id}`);
    ids.add(def.id);
    const a = createGame(def);
    const b = createGame(def);
    assert.deepEqual(a.tiles.map((t) => t.mask), b.tiles.map((t) => t.mask), `stage ${def.id} scramble is deterministic`);
    assert.equal(isSolved(a), false, `stage ${def.id} starts unsolved`);
    assert.ok(a.budget > a.par, `stage ${def.id} budget leaves slack`);
    const seq = solutionSequence(a);
    assert.equal(seq.length, a.par, `stage ${def.id} sequence length equals par`);
    for (const step of seq) {
      if (a.status !== 'playing') break;
      const res = rotateTile(a, step.r, step.c, step.dir);
      assert.ok(res.ok, `stage ${def.id} step ${step.r},${step.c} is legal`);
    }
    assert.equal(a.status, 'won', `stage ${def.id} is solved by its sequence`);
    assert.ok(a.moves <= a.par && a.moves <= a.budget);
    const flow = traceLight(a);
    assert.equal(flow.litTargets, flow.totalTargets);
    assert.equal(scoreResult(a).stars, 3, `stage ${def.id} par solve earns three stars`);
    // locked stones are never part of the scramble: they already sit in their solved orientation
    a.tiles.filter((t) => t.stone).forEach((t) => assert.equal(t.mask, t.solvedMask));
  }
});

test('stages grow in size and gardens, and none beyond the intro is a one-turn puzzle', () => {
  const games = LEVELS.map((d) => createGame(d));
  games.forEach((g, i) => {
    assert.ok(g.par >= 6, `stage ${g.id} needs several turns (par ${g.par})`);
    if (i > 0) assert.ok(g.rows * g.cols >= games[0].rows * games[0].cols);
  });
  const last = games[games.length - 1];
  assert.ok(last.rows * last.cols > games[0].rows * games[0].cols * 3);
  assert.ok(traceLight(last).totalTargets >= 5);
  assert.ok(LEVELS.some((d) => (d.lock ?? []).length > 0), 'some stages use locked stones');
  assert.ok(LEVELS.some((d) => d.grid.join('').match(/[├┤┬┴]/)), 'branch tiles appear');
});

test('a win is only declared by real connectivity, and score rewards fewer turns', () => {
  const g = createGame(LEVELS[3]);
  const seq = solutionSequence(g);
  // play all but the last step: not yet solved
  for (const s of seq.slice(0, -1)) rotateTile(g, s.r, s.c, s.dir);
  assert.equal(g.status, 'playing');
  assert.ok(traceLight(g).litTargets < traceLight(g).totalTargets);
  const lastStep = seq[seq.length - 1];
  const res = rotateTile(g, lastStep.r, lastStep.c, lastStep.dir);
  assert.equal(res.solved, true);
  const best = scoreResult(g);

  const slow = createGame(LEVELS[3]);
  const spare = slow.tiles.find((t) => t.kind === 'pipe' && !t.locked && !traceLight({ ...slow, tiles: slow.tiles.map((x) => ({ ...x, mask: x.solvedMask })) }).lit[t.r * slow.cols + t.c]);
  for (let i = 0; i < 4; i++) rotateTile(slow, spare.r, spare.c, 1); // four wasted turns on a decoy
  for (const s of solutionSequence(slow)) rotateTile(slow, s.r, s.c, s.dir);
  assert.equal(slow.status, 'won');
  const worse = scoreResult(slow);
  assert.ok(worse.score < best.score);
  assert.ok(worse.stars <= best.stars);
  assert.equal(tileAt(slow, -1, 0), null);
});
