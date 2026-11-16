// Rule tests for LUMENWAKE: light tracing through every relay, bloom responses, keeper transactions and
// focus, storms, pulses (growth, harvest, chorus, withering, hearts), nights, the waystation, every boon,
// difficulty settings and seeded determinism. Node built-ins only: node --test 'tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLS, ROWS, CELL_COUNT, cellIndex } from '../game/src/rules/grid.js';
import { traceLight, totalLight, distinctSources } from '../game/src/rules/light-trace.js';
import { reflect } from '../game/src/rules/relays.js';
import { SPECIES, bloomResponse, sproutBloom } from '../game/src/rules/blooms.js';
import { generateIsland, nightPlan, NIGHT_COUNT, ISLANDS } from '../game/src/rules/islands.js';
import { forecastStorm, describeStorm } from '../game/src/rules/storms.js';
import { BOONS, boonById } from '../game/src/rules/boons.js';
import {
  createRun, previewPulse, placeRelay, flipMirror, liftRelay, turnWell, undoAction, releasePulse,
  enterWaystation, chooseBoon, skipBoon, buyRelay, mendHeart, setOut, DIFFICULTIES, STARTING_SATCHEL,
  MEND_PRICE, SKIP_BOON_DEW, ISLAND_SETUP_FOCUS,
} from '../game/src/rules/expedition.js';

const C = cellIndex;

/** A field with open land everywhere, the well at (1,3) shining east, for direct tracing tests. */
function field({ relays = {}, blooms = [], clouds = [], rocks = [], dirs = [1], mods = {} } = {}) {
  const terrain = new Array(CELL_COUNT).fill('land');
  for (const r of rocks) terrain[r] = 'rock';
  const wellIndex = C(1, 3);
  terrain[wellIndex] = 'well';
  const rel = new Array(CELL_COUNT).fill(null);
  for (const [cell, r] of Object.entries(relays)) rel[cell] = r;
  return {
    terrain,
    wellIndex,
    wellDirs: dirs,
    relays: rel,
    bloomCells: new Set(blooms),
    clouds: new Set(clouds),
    mods: { wellStrength: 3, prismLoss: 1, lensGain: 1, haloReach: 4, ...mods },
  };
}

/** A run on a clean open board (well at (1,3) facing east, no blooms, no storm) for transaction tests. */
function cleanRun(opts = {}) {
  const run = createRun({ seed: 4242, ...opts });
  const terrain = new Array(CELL_COUNT).fill('land');
  terrain[C(1, 3)] = 'well';
  run.board = { terrain, wellIndex: C(1, 3), island: 0 };
  run.wellDir = 1;
  run.blooms = [];
  run.clouds = [];
  run.forecast = null;
  run.relays = new Array(CELL_COUNT).fill(null);
  run.focus = 10;
  run.history = [];
  return run;
}

function addBloom(run, species, cell) {
  const b = sproutBloom(run.nextBloomId++, species, cell, run.mods.patienceBonus);
  run.blooms.push(b);
  return b;
}

// ------------------------------------------------------------------ light

test('a beam runs straight from the well to the board edge', () => {
  const t = traceLight(field());
  assert.equal(t.segments.length, 1);
  assert.ok(t.crossed.has(C(9, 3)));
  assert.ok(!t.crossed.has(C(0, 3)));
});

test('mirrors reflect: "/" turns east to north, "\\" turns east to south', () => {
  assert.equal(reflect(0, 1), 0);
  assert.equal(reflect(1, 1), 2);
  assert.equal(reflect(0, 0), 1);
  const t = traceLight(field({ relays: { [C(4, 3)]: { type: 'mirror', orient: 0 } } }));
  assert.ok(t.crossed.has(C(4, 0)));
  assert.ok(!t.crossed.has(C(5, 3)));
  assert.ok(t.relayHits.has(C(4, 3)));
});

test('a prism splits a beam left and right, each one weaker', () => {
  const t = traceLight(field({ relays: { [C(4, 3)]: { type: 'prism', orient: 0 } }, blooms: [C(4, 0), C(4, 6)] }));
  assert.equal(totalLight(t, C(4, 0)), 2);
  assert.equal(totalLight(t, C(4, 6)), 2);
  assert.ok(!t.crossed.has(C(5, 3)));
  const flawless = traceLight(field({ relays: { [C(4, 3)]: { type: 'prism', orient: 0 } }, blooms: [C(4, 0)], mods: { prismLoss: 0 } }));
  assert.equal(totalLight(flawless, C(4, 0)), 3);
});

test('a lens adds strength; Burning Glass adds two', () => {
  const t = traceLight(field({ relays: { [C(3, 3)]: { type: 'lens', orient: 0 } }, blooms: [C(7, 3)] }));
  assert.equal(totalLight(t, C(7, 3)), 4);
  const t2 = traceLight(field({ relays: { [C(3, 3)]: { type: 'lens', orient: 0 } }, blooms: [C(7, 3)], mods: { lensGain: 2 } }));
  assert.equal(totalLight(t2, C(7, 3)), 5);
});

test('a halo lantern catches the beam and glows on 4 (or 8 with Wide Halo) neighbours', () => {
  const blooms = [C(5, 2), C(6, 3), C(5, 4), C(6, 2)];
  const t = traceLight(field({ relays: { [C(5, 3)]: { type: 'halo', orient: 0 } }, blooms }));
  assert.equal(totalLight(t, C(5, 2)), 2);
  assert.equal(totalLight(t, C(6, 3)), 2);
  assert.equal(totalLight(t, C(6, 2)), 0, 'diagonal is dark without Wide Halo');
  assert.ok(!t.crossed.has(C(8, 3)), 'the beam stops in the lantern');
  const wide = traceLight(field({ relays: { [C(5, 3)]: { type: 'halo', orient: 0 } }, blooms, mods: { haloReach: 8 } }));
  assert.equal(totalLight(wide, C(6, 2)), 2);
});

test('rocks and clouds block light; blooms drink it', () => {
  const rock = traceLight(field({ rocks: [C(5, 3)] }));
  assert.ok(!rock.crossed.has(C(6, 3)));
  const cloud = traceLight(field({ clouds: [C(4, 3)], blooms: [C(6, 3)] }));
  assert.equal(totalLight(cloud, C(6, 3)), 0);
  const bloom = traceLight(field({ blooms: [C(4, 3), C(7, 3)] }));
  assert.equal(totalLight(bloom, C(4, 3)), 3);
  assert.equal(totalLight(bloom, C(7, 3)), 0);
});

test('mirror loops terminate', () => {
  const relays = {
    [C(5, 3)]: { type: 'mirror', orient: 0 },
    [C(5, 1)]: { type: 'mirror', orient: 1 },
    [C(7, 1)]: { type: 'mirror', orient: 1 },
    [C(7, 3)]: { type: 'mirror', orient: 0 },
  };
  const t = traceLight(field({ relays }));
  assert.ok(t.segments.length < 50);
});

test('two beams from different sides count as two sources', () => {
  // prism at (4,3) splits north/south; mirrors bring both halves into (6,1) from the west and the south
  const relays = {
    [C(4, 3)]: { type: 'prism', orient: 0 },
    [C(4, 1)]: { type: 'mirror', orient: 0 }, // north -> east, arrives at (6,1) from the west
    [C(4, 5)]: { type: 'mirror', orient: 1 }, // south -> east
    [C(6, 5)]: { type: 'mirror', orient: 0 }, // east -> north, arrives at (6,1) from the south
  };
  const t = traceLight(field({ relays, blooms: [C(6, 1)] }));
  assert.equal(distinctSources(t, C(6, 1)), 2);
  assert.equal(totalLight(t, C(6, 1)), 4);
});

// ------------------------------------------------------------------ blooms

test('each species answers the light by its own need', () => {
  const lit = (strength, sources = 1) => ({ light: new Map([[5, Array.from({ length: sources }, (_, i) => ({ strength, from: `beam:${i}` }))]]) });
  const dark = { light: new Map() };
  const b = (species) => sproutBloom(1, species, 5);
  assert.equal(bloomResponse(b('dawnpetal'), lit(1)), 'grow');
  assert.equal(bloomResponse(b('dawnpetal'), dark), 'wilt');
  assert.equal(bloomResponse(b('moonlily'), lit(2)), 'sustain');
  assert.equal(bloomResponse(b('moonlily'), lit(3)), 'grow');
  assert.equal(bloomResponse(b('twinbell'), lit(3)), 'sustain');
  assert.equal(bloomResponse(b('twinbell'), lit(1, 2)), 'grow');
  assert.equal(bloomResponse(b('shadecap'), dark), 'grow');
  assert.equal(bloomResponse(b('shadecap'), lit(1)), 'wilt');
  assert.equal(bloomResponse(b('dawnheart'), lit(4)), 'sustain');
  assert.equal(bloomResponse(b('dawnheart'), lit(5)), 'grow');
});

// ------------------------------------------------------------------ islands and determinism

test('islands are seeded: same seed same terrain, other seeds differ, the well can always shine out', () => {
  for (let island = 0; island < ISLANDS.length; island++) {
    const a = generateIsland(77, island);
    assert.deepEqual(a, generateIsland(77, island));
    assert.notDeepEqual(a.terrain, generateIsland(78, island).terrain);
    const wx = a.wellIndex % COLS;
    const wy = Math.floor(a.wellIndex / COLS);
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) assert.equal(a.terrain[C(wx + dx, wy + dy)], 'land');
    assert.equal(a.terrain.filter((t) => t === 'well').length, 1);
  }
});

test('the campaign has seven nights over three islands, growing harder', () => {
  assert.equal(NIGHT_COUNT, 7);
  const sprouts = Array.from({ length: NIGHT_COUNT }, (_, n) => nightPlan(n).sprouts.flat().length);
  assert.ok(sprouts[6] > sprouts[0] * 2);
  assert.deepEqual([...new Set(Array.from({ length: NIGHT_COUNT }, (_, n) => nightPlan(n).island))], [0, 1, 2]);
  assert.ok(nightPlan(6).sprouts.flat().includes('dawnheart'));
  for (let n = 0; n < NIGHT_COUNT; n++) {
    const plan = nightPlan(n);
    plan.sprouts.forEach((list, hour) => list.forEach((sp) => assert.ok(plan.hours - hour >= SPECIES[sp].growth, `night ${n + 1} hour ${hour} ${sp} can finish`)));
  }
});

test('the same seed and the same actions replay identically', () => {
  const a = createRun({ seed: 9001 });
  const b = createRun({ seed: 9001 });
  for (const run of [a, b]) {
    placeRelay(run, run.blooms[0].cell === 0 ? 1 : 0, 'mirror', 0);
    for (let i = 0; i < 4; i++) releasePulse(run);
  }
  assert.deepEqual(JSON.parse(JSON.stringify({ ...a, lastPulse: null })), JSON.parse(JSON.stringify({ ...b, lastPulse: null })));
  assert.notDeepEqual(createRun({ seed: 9002 }).board.terrain, createRun({ seed: 9001 }).board.terrain, 'another seed, another island');
});

// ------------------------------------------------------------------ transactions

test('a new run starts on night 1 with the starting satchel, dew, hearts and landfall focus', () => {
  const run = createRun({ seed: 5 });
  assert.equal(run.phase, 'plan');
  assert.equal(run.night, 0);
  assert.deepEqual(run.satchel, STARTING_SATCHEL);
  assert.equal(run.hearts, 5);
  assert.equal(run.focus, run.mods.focusPerHour + ISLAND_SETUP_FOCUS);
  assert.equal(run.blooms.length, 2);
});

test('placing costs focus and a relay; invalid placements are refused with reasons', () => {
  const run = cleanRun();
  addBloom(run, 'dawnpetal', C(8, 3));
  run.board.terrain[C(0, 0)] = 'void';
  run.board.terrain[C(0, 1)] = 'rock';
  assert.ok(placeRelay(run, C(4, 3), 'mirror', 1).ok);
  assert.equal(run.focus, 9);
  assert.equal(run.satchel.mirror, STARTING_SATCHEL.mirror - 1);
  assert.match(placeRelay(run, C(4, 3), 'prism').reason, /already/);
  assert.match(placeRelay(run, C(8, 3), 'prism').reason, /bloom/);
  assert.match(placeRelay(run, C(0, 0), 'prism').reason, /rift/);
  assert.match(placeRelay(run, C(0, 1), 'prism').reason, /stone/);
  assert.match(placeRelay(run, C(1, 3), 'prism').reason, /Well/);
  assert.match(placeRelay(run, C(5, 5), 'halo').reason, /No Halo/);
  run.focus = 0;
  assert.match(placeRelay(run, C(5, 5), 'prism').reason, /focus/);
});

test('flip and turning the well cost focus; lifting is free; undo refunds everything', () => {
  const run = cleanRun();
  placeRelay(run, C(4, 3), 'mirror', 0);
  assert.ok(flipMirror(run, C(4, 3)).ok);
  assert.equal(run.relays[C(4, 3)].orient, 1);
  assert.ok(turnWell(run).ok);
  assert.equal(run.wellDir, 2);
  assert.equal(run.focus, 7);
  assert.ok(liftRelay(run, C(4, 3)).ok);
  assert.equal(run.focus, 7);
  assert.equal(run.satchel.mirror, STARTING_SATCHEL.mirror);
  placeRelay(run, C(2, 3), 'prism');
  assert.equal(flipMirror(run, C(2, 3)).ok, false, 'prisms do not flip');
  for (let i = 0; i < 5; i++) assert.ok(undoAction(run).ok);
  assert.equal(undoAction(run).ok, false);
  assert.equal(run.focus, 10);
  assert.equal(run.wellDir, 1);
  assert.deepEqual(run.satchel, STARTING_SATCHEL);
  assert.ok(run.relays.every((r) => r === null));
});

test('the preview shows exactly what the pulse will do', () => {
  const run = cleanRun();
  const near = addBloom(run, 'dawnpetal', C(6, 3));
  const far = addBloom(run, 'dawnpetal', C(6, 0));
  const p = previewPulse(run);
  assert.equal(p.responses.get(near.id), 'grow');
  assert.equal(p.responses.get(far.id), 'wilt');
  const e = releasePulse(run);
  assert.equal(e.responses[near.id], 'grow');
  assert.equal(e.responses[far.id], 'wilt');
  assert.equal(far.patience, SPECIES.dawnpetal.patience - 1);
});

// ------------------------------------------------------------------ pulses

test('lit blooms grow and are harvested for score and dew; chorus multiplies simultaneous harvests', () => {
  const run = cleanRun();
  run.hours = 6;
  run.plan = { ...run.plan, hours: 6, sprouts: [], storms: [] };
  placeRelay(run, C(4, 3), 'prism');
  const a = addBloom(run, 'dawnpetal', C(4, 0));
  const b = addBloom(run, 'dawnpetal', C(4, 6));
  const score0 = run.score;
  const dew0 = run.dew;
  releasePulse(run);
  assert.equal(a.growth, 1);
  const e = releasePulse(run);
  assert.equal(e.harvested.length, 2);
  assert.equal(e.chorus, 2);
  const each = Math.round(SPECIES.dawnpetal.value * 1.25);
  assert.equal(run.score - score0, each * 2);
  assert.equal(run.dew - dew0, SPECIES.dawnpetal.dew * 2);
  assert.equal(run.blooms.length, 0);
  assert.equal(run.stats.bestChorus, 2);
  void b;
});

test('a bloom that runs out of patience withers and costs a heart; zero hearts loses the run', () => {
  const run = cleanRun();
  run.plan = { ...run.plan, hours: 9, sprouts: [], storms: [] };
  run.hours = 9;
  run.hearts = 1;
  addBloom(run, 'dawnpetal', C(5, 0));
  releasePulse(run);
  releasePulse(run);
  assert.equal(run.phase, 'plan');
  const e = releasePulse(run);
  assert.equal(e.withered.length, 1);
  assert.equal(run.hearts, 0);
  assert.equal(run.phase, 'lost');
  assert.equal(releasePulse(run).ok, false);
  assert.equal(placeRelay(run, C(3, 3), 'mirror').ok, false);
});

test('shadecaps grow in darkness and wilt in light', () => {
  const run = cleanRun();
  run.plan = { ...run.plan, hours: 9, sprouts: [], storms: [] };
  run.hours = 9;
  const lit = addBloom(run, 'shadecap', C(5, 3));
  const dark = addBloom(run, 'shadecap', C(5, 0));
  releasePulse(run);
  assert.equal(lit.patience, SPECIES.shadecap.patience - 1);
  assert.equal(dark.growth, 1);
});

test('unused focus carries into the next hour up to the cap', () => {
  const run = cleanRun();
  run.plan = { ...run.plan, hours: 9, sprouts: [], storms: [] };
  run.hours = 9;
  run.focus = 2;
  releasePulse(run);
  assert.equal(run.focus, 2 + run.mods.focusPerHour);
  releasePulse(run);
  assert.equal(run.focus, run.mods.focusPerHour + 2);
});

// ------------------------------------------------------------------ storms

test('a gale flips every mirror in its lane before the light flows', () => {
  const run = cleanRun();
  run.plan = { ...run.plan, hours: 9, sprouts: [], storms: [] };
  run.hours = 9;
  placeRelay(run, C(4, 3), 'mirror', 1); // would send light south
  const bloom = addBloom(run, 'dawnpetal', C(4, 0)); // but the bloom is north
  run.forecast = { kind: 'gale', axis: 'row', line: 3, cells: Array.from({ length: COLS }, (_, x) => C(x, 3)) };
  assert.equal(previewPulse(run).responses.get(bloom.id), 'grow', 'preview includes the gale');
  const e = releasePulse(run);
  assert.deepEqual(e.flipped, [C(4, 3)]);
  assert.equal(run.relays[C(4, 3)].orient, 0);
  assert.equal(bloom.growth, 1);
});

test('hail knocks relays back to the satchel; Anchored Frames resists gales and hail', () => {
  const run = cleanRun();
  run.plan = { ...run.plan, hours: 9, sprouts: [], storms: [] };
  run.hours = 9;
  placeRelay(run, C(4, 3), 'prism');
  run.forecast = { kind: 'hail', cells: [C(4, 3), C(8, 6)] };
  const e = releasePulse(run);
  assert.equal(e.knocked.length, 1);
  assert.equal(run.relays[C(4, 3)], null);
  assert.equal(run.satchel.prism, STARTING_SATCHEL.prism);
  boonById('anchored-frames').apply(run);
  placeRelay(run, C(4, 3), 'mirror', 0);
  run.forecast = { kind: 'hail', cells: [C(4, 3), C(8, 6)] };
  releasePulse(run);
  assert.ok(run.relays[C(4, 3)]);
  run.forecast = { kind: 'gale', axis: 'row', line: 3, cells: Array.from({ length: COLS }, (_, x) => C(x, 3)) };
  releasePulse(run);
  assert.equal(run.relays[C(4, 3)].orient, 0);
});

test('cloudbanks block light for two pulses; eclipses dim the well for one', () => {
  const run = cleanRun();
  run.plan = { ...run.plan, hours: 9, sprouts: [], storms: [] };
  run.hours = 9;
  const bloom = addBloom(run, 'moonlily', C(7, 3));
  run.forecast = { kind: 'cloud', cells: [C(5, 3), C(6, 3), C(5, 4), C(6, 4)] };
  releasePulse(run);
  assert.equal(bloom.patience, SPECIES.moonlily.patience - 1);
  assert.equal(run.clouds.length, 4);
  releasePulse(run);
  assert.equal(bloom.patience, SPECIES.moonlily.patience - 2);
  assert.equal(run.clouds.length, 0);
  run.forecast = { kind: 'eclipse', cells: [] };
  const e = releasePulse(run);
  assert.equal(e.responses[bloom.id], 'sustain', 'strength 2 is not enough for a moonlily');
  releasePulse(run);
  assert.equal(bloom.growth, 1);
});

test('storm forecasts are seeded and aim at the network', () => {
  const run = cleanRun();
  placeRelay(run, C(4, 5), 'mirror', 0);
  const a = forecastStorm(1, 2, 3, ['gale'], run);
  assert.deepEqual(a, forecastStorm(1, 2, 3, ['gale'], run));
  assert.ok(a.cells.includes(C(4, 5)));
  const hail = forecastStorm(1, 2, 3, ['hail'], run);
  assert.ok(hail.cells.includes(C(4, 5)));
  assert.match(describeStorm(a), /Gale/);
  assert.equal(describeStorm(null), 'Calm skies');
});

// ------------------------------------------------------------------ nights and waystation

function finishNight(run) {
  while (run.phase === 'plan') releasePulse(run);
}

test('a night ends at dawn with bonuses, then the waystation offers seeded boons and a shop', () => {
  const run = createRun({ seed: 31337, difficulty: 'breeze' });
  finishNight(run);
  assert.equal(run.phase, 'dusk');
  assert.equal(run.nightLog.bonus, Math.round(15 * 0.75) + (run.nightLog.withered === 0 ? Math.round(30 * 0.75) : 0));
  assert.equal(run.nightLog.dew >= 2, true);
  assert.equal(enterWaystation(run).ok, true);
  const offers = run.waystation.boonOffers;
  assert.equal(offers.length, 3);
  assert.equal(new Set(offers).size, 3);
  const twin = createRun({ seed: 31337, difficulty: 'breeze' });
  finishNight(twin);
  enterWaystation(twin);
  assert.deepEqual(twin.waystation, run.waystation);
});

test('waystation transactions: one boon, buying, mending, skipping, setting out', () => {
  const run = createRun({ seed: 2024 });
  finishNight(run);
  enterWaystation(run);
  run.dew = 20;
  run.hearts = 3;
  const offer = run.waystation.shop[0];
  const before = run.satchel[offer.type];
  assert.ok(buyRelay(run, 0).ok);
  assert.equal(run.dew, 20 - offer.price);
  assert.equal(run.satchel[offer.type], before + 1);
  assert.equal(buyRelay(run, 0).ok, false, 'sold out');
  const dew = run.dew;
  assert.ok(mendHeart(run).ok);
  assert.equal(run.hearts, 4);
  assert.equal(run.dew, dew - MEND_PRICE);
  assert.equal(mendHeart(run).ok, false, 'one mend per waystation');
  run.dew = 0;
  assert.equal(buyRelay(run, 1).ok, false, 'cannot afford');
  assert.ok(chooseBoon(run, 0).ok);
  assert.equal(chooseBoon(run, 1).ok, false);
  assert.equal(skipBoon(run).ok, false);
  assert.ok(setOut(run).ok);
  assert.equal(run.night, 1);
  assert.equal(run.phase, 'plan');
});

test('setting out without a boon skips it for dew', () => {
  const run = createRun({ seed: 2025 });
  finishNight(run);
  enterWaystation(run);
  const dew = run.dew;
  setOut(run);
  assert.equal(run.dew, dew + SKIP_BOON_DEW);
  assert.deepEqual(run.boons, []);
});

test('relays stay put on the same island and return to the satchel on a new island', () => {
  const run = createRun({ seed: 77, difficulty: 'breeze' });
  const spot = run.board.terrain.findIndex((t, i) => t === 'land' && !run.blooms.some((b) => b.cell === i));
  placeRelay(run, spot, 'lens');
  finishNight(run);
  enterWaystation(run);
  setOut(run);
  assert.equal(run.relays[spot]?.type, 'lens', 'night 2 is on the same island');
  finishNight(run);
  if (run.phase === 'dusk') {
    enterWaystation(run);
    setOut(run);
    assert.equal(run.board.island, 1);
    assert.ok(run.relays.every((r) => r === null));
    assert.equal(run.satchel.lens, STARTING_SATCHEL.lens);
  }
});

// ------------------------------------------------------------------ boons

test('every boon changes the rule it names', () => {
  const expect = {
    'twin-aperture': (r) => r.mods.twinAperture === true,
    'kindled-well': (r) => r.mods.wellStrength === 4,
    'steady-hands': (r) => r.mods.focusPerHour === 4,
    'flawless-prisms': (r) => r.mods.prismLoss === 0,
    'wide-halo': (r) => r.mods.haloReach === 8 && r.satchel.halo === 1,
    'burning-glass': (r) => r.mods.lensGain === 2,
    'dew-gatherers': (r) => r.mods.harvestDew === 1,
    'deep-roots': (r) => r.mods.patienceBonus === 1,
    'anchored-frames': (r) => r.mods.stormproof === true,
    'mending-rain': (r) => r.maxHearts === 6 && r.hearts === 6,
    chorus: (r) => r.mods.chorusStep === 0.5,
    'crystal-cache': (r) => r.satchel.mirror === STARTING_SATCHEL.mirror + 2 && r.satchel.prism === STARTING_SATCHEL.prism + 1 && r.satchel.lens === STARTING_SATCHEL.lens + 1,
  };
  assert.deepEqual(BOONS.map((b) => b.id).sort(), Object.keys(expect).sort());
  for (const boon of BOONS) {
    const run = cleanRun();
    run.hearts = 4;
    boon.apply(run);
    assert.ok(expect[boon.id](run), boon.id);
  }
});

test('boons change play: twin aperture lights behind the well, dew gatherers and deep roots pay off', () => {
  const run = cleanRun();
  run.plan = { ...run.plan, hours: 9, sprouts: [], storms: [] };
  run.hours = 9;
  const behind = addBloom(run, 'dawnpetal', C(0, 3));
  assert.equal(previewPulse(run).responses.get(behind.id), 'wilt');
  boonById('twin-aperture').apply(run);
  assert.equal(previewPulse(run).responses.get(behind.id), 'grow');
  boonById('dew-gatherers').apply(run);
  const dew = run.dew;
  releasePulse(run);
  releasePulse(run);
  assert.equal(run.dew - dew, SPECIES.dawnpetal.dew + 1);
  boonById('deep-roots').apply(run);
  assert.equal(addBloom(run, 'dawnpetal', C(8, 0)).patience, SPECIES.dawnpetal.patience + 1);
});

test('chorus of petals raises the multi-harvest bonus', () => {
  const play = (withChorus) => {
    const run = cleanRun();
    run.plan = { ...run.plan, hours: 9, sprouts: [], storms: [] };
    run.hours = 9;
    if (withChorus) boonById('chorus').apply(run);
    placeRelay(run, C(4, 3), 'prism');
    addBloom(run, 'dawnpetal', C(4, 0));
    addBloom(run, 'dawnpetal', C(4, 6));
    releasePulse(run);
    return releasePulse(run).harvested.reduce((s, h) => s + h.points, 0);
  };
  assert.equal(play(false), 2 * Math.round(10 * 1.25));
  assert.equal(play(true), 2 * Math.round(10 * 1.5));
});

// ------------------------------------------------------------------ difficulty

test('difficulties differ in hearts, patience, sprouts, storms and score', () => {
  const breeze = createRun({ seed: 3, difficulty: 'breeze' });
  const way = createRun({ seed: 3, difficulty: 'wayfarer' });
  const storm = createRun({ seed: 3, difficulty: 'stormcaller' });
  assert.deepEqual([breeze.hearts, way.hearts, storm.hearts], [7, 5, 4]);
  assert.equal(breeze.blooms[0].patience, SPECIES[breeze.blooms[0].species].patience + 1);
  const n2 = nightPlan(1, DIFFICULTIES.stormcaller);
  assert.ok(n2.sprouts.flat().length > nightPlan(1, DIFFICULTIES.wayfarer).sprouts.flat().length);
  assert.equal(n2.storms.length, n2.hours - 1);
  assert.equal(DIFFICULTIES.stormcaller.scoreMult, 1.5);
  assert.equal(createRun({ difficulty: 'nonsense' }).difficulty, 'wayfarer');
  void ROWS;
});
