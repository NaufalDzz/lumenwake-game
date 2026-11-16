// Campaign fairness: a test-only greedy keeper (tests/support/strategy-bot.mjs) must be able to finish the
// seven-night expedition on most seeds, a keeper who never touches the board must always lose, and the same
// seed played the same way must give the same result. Node built-ins only: node --test 'tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, NIGHT_COUNT } from '../game/src/rules/expedition.js';
import { playExpedition, playIdle } from './support/strategy-bot.mjs';
import { victoryLine } from '../game/src/ui/results-screen.js';

const SEEDS = [7919, 15838, 23757, 31676, 39595, 47514];

test('a thoughtful keeper wins every Breeze seed tried', () => {
  for (const seed of SEEDS.slice(0, 3)) {
    const run = playExpedition(createRun({ seed, difficulty: 'breeze' }));
    assert.equal(run.phase, 'won', `breeze seed ${seed}`);
    assert.equal(run.stats.nightsCleared, NIGHT_COUNT);
  }
});

test('a thoughtful keeper wins most Wayfarer seeds, and the win is earned', () => {
  const runs = SEEDS.map((seed) => playExpedition(createRun({ seed, difficulty: 'wayfarer' })));
  const wins = runs.filter((r) => r.phase === 'won');
  assert.ok(wins.length >= 4, `won ${wins.length}/${SEEDS.length}`);
  assert.ok(runs.every((r) => r.phase === 'won' || r.phase === 'lost'));
  for (const r of wins) {
    assert.ok(r.stats.harvested >= 30, 'a win needs a real harvest');
    assert.ok(r.boons.length >= 3, 'boons were taken along the way');
    assert.ok(r.stats.pulses <= 45, 'a run stays short');
  }
});

test('neglect loses on every difficulty', () => {
  for (const difficulty of ['breeze', 'wayfarer', 'stormcaller']) {
    for (const seed of SEEDS.slice(0, 2)) {
      const run = playIdle(createRun({ seed, difficulty }));
      assert.equal(run.phase, 'lost', `${difficulty} ${seed}`);
      assert.equal(run.hearts <= 0, true);
    }
  }
});

test('Stormcaller is harder than Wayfarer for the same keeper', () => {
  const score = (difficulty) => SEEDS.slice(0, 3).map((seed) => playExpedition(createRun({ seed, difficulty }))).reduce((s, r) => s + r.hearts + (r.phase === 'won' ? 10 : 0), 0);
  assert.ok(score('stormcaller') < score('wayfarer'));
});

test('the same seed played the same way scores the same', () => {
  const a = playExpedition(createRun({ seed: 4242, difficulty: 'wayfarer' }));
  const b = playExpedition(createRun({ seed: 4242, difficulty: 'wayfarer' }));
  assert.equal(a.score, b.score);
  assert.equal(a.phase, b.phase);
  assert.deepEqual(a.stats, b.stats);
});

test('victory is surviving seven nights; the results only claim a Dawnheart when one was harvested', () => {
  const without = playExpedition(createRun({ seed: 1, difficulty: 'wayfarer' }));
  assert.equal(without.phase, 'won');
  assert.equal(without.stats.bySpecies.dawnheart ?? 0, 0, 'this seed is won without the Dawnheart');
  assert.doesNotMatch(victoryLine(without), /Dawnheart bloomed/);
  assert.match(victoryLine(without), /seven nights/);
  const withHeart = playExpedition(createRun({ seed: 15838, difficulty: 'wayfarer' }));
  assert.equal(withHeart.phase, 'won');
  assert.ok(withHeart.stats.bySpecies.dawnheart >= 1);
  assert.match(victoryLine(withHeart), /Dawnheart bloomed/);
});
