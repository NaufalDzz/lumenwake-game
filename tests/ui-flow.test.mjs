// End-to-end UI test: loads the real game (game/src/app/main.js) in a stand-in browser and plays a full
// expedition only with synthetic mouse clicks and key presses: title and seed setup, the guide, placing,
// flipping, moving and lifting relays, turning the well, undo, pulses, dusk, waystation choices, victory,
// records, retry, a lost run, new run, pause, mute and settings. A shadow run driven through the pure rules
// checks after every step that the screen state is exactly what the rules say it should be.
// Node built-ins only: node --test 'tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installBrowser, stats } from './support/fake-browser.mjs';
import { chooseAction, applyAction, planWaystation } from './support/strategy-bot.mjs';
import { createRun, releasePulse, enterWaystation, chooseBoon, buyRelay, mendHeart, setOut, wellDirections } from '../game/src/rules/expedition.js';
import { RELAY_ORDER } from '../game/src/rules/relays.js';
import { cellX, cellY } from '../game/src/rules/grid.js';

// Fresh seeds come from Math.random in the browser; pin it so this test always plays the same seeds.
let lcg = 12345;
Math.random = () => ((lcg = (lcg * 1103515245 + 12345) % 2147483648) / 2147483648);

const b = installBrowser();
await import('../game/src/app/main.js');
b.frames(3);

const run = () => b.snap().run;
const cell = (i) => run().cells[i];
const clickCell = (i, button = 0) => b.click(cell(i).clientX, cell(i).clientY, button);

function matches(shadow, where) {
  const r = run();
  assert.equal(r.phase, shadow.phase, `${where}: phase`);
  assert.equal(r.night, shadow.night + 1, `${where}: night`);
  assert.equal(r.hour, shadow.hour + 1, `${where}: hour`);
  assert.equal(r.focus, shadow.focus, `${where}: focus`);
  assert.equal(r.hearts, shadow.hearts, `${where}: hearts`);
  assert.equal(r.dew, shadow.dew, `${where}: dew`);
  assert.equal(r.score, shadow.score, `${where}: score`);
  assert.deepEqual(r.satchel, shadow.satchel, `${where}: satchel`);
  assert.deepEqual(r.boons, shadow.boons, `${where}: boons`);
  assert.deepEqual(r.well.dirs, wellDirections(shadow), `${where}: well`);
  assert.deepEqual(r.relays.map((x) => [x.cell, x.type, x.orient]), shadow.relays.map((x, i) => (x ? [i, x.type, x.orient] : null)).filter(Boolean), `${where}: relays`);
  assert.deepEqual(r.blooms.map((x) => [x.cell, x.species, x.growth, x.patience]), shadow.blooms.map((x) => [x.cell, x.species, x.growth, x.patience]), `${where}: blooms`);
}

/** Move the keyboard cursor to a cell with arrow keys. */
function cursorTo(target) {
  if (b.snap().cursor < 0) b.key('ArrowUp');
  let guard = 0;
  while (b.snap().cursor !== target && guard++ < 30) {
    const c = b.snap().cursor;
    if (cellX(c) < cellX(target)) b.key('ArrowRight');
    else if (cellX(c) > cellX(target)) b.key('ArrowLeft');
    else if (cellY(c) < cellY(target)) b.key('ArrowDown');
    else b.key('ArrowUp');
  }
  assert.equal(b.snap().cursor, target);
}

function setGhost(orient) {
  if (b.snap().ghostOrient !== orient) b.key('f');
  assert.equal(b.snap().ghostOrient, orient);
}

let actionCount = 0;
/** Perform one bot decision with real input, alternating mouse and keyboard. */
function perform(a) {
  const viaKeys = actionCount++ % 3 === 2;
  if (a.kind === 'well') {
    if (viaKeys) b.key('w');
    else clickCell(run().well.cell);
  } else if (a.kind === 'flip') {
    if (viaKeys) {
      cursorTo(a.cell);
      b.key('Enter');
    } else clickCell(a.cell);
  } else if (a.kind === 'place') {
    if (viaKeys) b.key(String(RELAY_ORDER.indexOf(a.type) + 1));
    else b.press(`relay-${a.type}`);
    assert.equal(b.snap().selection, a.type);
    setGhost(a.orient);
    if (viaKeys) {
      cursorTo(a.cell);
      b.key('e');
    } else clickCell(a.cell);
  } else if (a.kind === 'move') {
    if (viaKeys) {
      cursorTo(a.from);
      b.key('x');
    } else clickCell(a.from, 2);
    assert.equal(b.snap().selection, a.type, 'lifting selects the lifted relay');
    setGhost(a.orient);
    clickCell(a.cell);
  }
}

function pulse(shadow) {
  b.key(' ');
  b.settle();
  return releasePulse(shadow);
}

const visited = { boon: 0, buy: 0, mend: 0, keysBoon: 0, place: 0, move: 0, flip: 0, well: 0, undo: 0 };

function waystation(shadow) {
  assert.equal(b.snap().view, 'dusk');
  b.press('to-waystation');
  enterWaystation(shadow);
  assert.equal(b.snap().view, 'waystation');
  assert.deepEqual(run().waystation.boonOffers, shadow.waystation.boonOffers, 'seeded offers match');
  for (const s of planWaystation(shadow)) {
    if (s.kind === 'boon') {
      if (shadow.night % 2) {
        b.key(String(s.index + 1));
        visited.keysBoon++;
      } else b.press(`boon-${s.index}`);
      chooseBoon(shadow, s.index);
      visited.boon++;
    }
    if (s.kind === 'mend') {
      b.press('mend');
      mendHeart(shadow);
      visited.mend++;
    }
    if (s.kind === 'buy') {
      if (shadow.night % 2) b.key(String(s.index + 4));
      else b.press(`shop-${s.index}`);
      buyRelay(shadow, s.index);
      visited.buy++;
    }
    matches(shadow, `waystation ${s.kind}`);
  }
  b.press('set-out');
  setOut(shadow);
  b.frames(2);
  assert.equal(b.snap().view, 'plan');
  matches(shadow, 'set out');
}

test('the title screen offers a real seeded setup and records', () => {
  const s = b.snap();
  assert.equal(s.screen, 'title');
  for (const id of ['start', 'diff-prev', 'diff-next', 'seed-prev', 'seed-next', 'seed-shuffle', 'howto', 'title-mute', 'contrast', 'motion']) {
    assert.ok(s.hitboxes.some((h) => h.id === id), id);
  }
  assert.equal(s.setup.difficulty, 'wayfarer');
  const seed = s.setup.seed;
  b.press('seed-next');
  assert.equal(b.snap().setup.seed, seed + 1);
  b.press('seed-prev');
  b.press('seed-shuffle');
  assert.notEqual(b.snap().setup.seed, seed);
  b.press('diff-prev');
  assert.equal(b.snap().setup.difficulty, 'breeze');
  assert.equal(s.records.runs, 0);
  assert.ok(stats.texts.some((t) => /LUMENWAKE/i.test(t)));
});

let won;

test('a whole Breeze expedition can be won with mouse and keyboard alone', () => {
  b.key('Tab');
  assert.ok(b.snap().focusId, 'Tab moves keyboard focus on the title');
  b.press('start');
  assert.equal(b.snap().overlay, 'howto', 'first run opens the guide');
  b.key('Escape');
  assert.equal(b.snap().overlay, null);
  const s = run();
  assert.equal(s.difficulty, 'breeze');
  const shadow = createRun({ seed: s.seed, difficulty: 'breeze' });
  matches(shadow, 'start');

  // undo through the UI before playing for real
  b.press('relay-mirror');
  const spot = run().cells.find((c) => c.terrain === 'land' && !run().blooms.some((x) => x.cell === c.i)).i;
  clickCell(spot);
  assert.equal(run().relays.length, 1);
  assert.ok(run().canUndo);
  b.key('z');
  visited.undo++;
  assert.equal(run().relays.length, 0);
  matches(shadow, 'after undo');

  for (let guard = 0; guard < 600 && shadow.phase !== 'won' && shadow.phase !== 'lost'; guard++) {
    if (shadow.phase === 'dusk') {
      waystation(shadow);
      continue;
    }
    const a = chooseAction(shadow);
    if (!a) {
      pulse(shadow);
      if (shadow.phase === 'plan') matches(shadow, 'pulse');
      continue;
    }
    perform(a);
    applyAction(shadow, a);
    visited[a.kind] = (visited[a.kind] ?? 0) + 1;
    matches(shadow, a.kind);
  }
  assert.equal(shadow.phase, 'won', 'the keeper wins this seed');
  b.frames(10);
  const end = b.snap();
  assert.equal(end.view, 'results');
  assert.equal(end.run.phase, 'won');
  assert.equal(end.run.score, shadow.score);
  assert.equal(end.records.wins, 1);
  assert.equal(end.records.best.breeze, shadow.score);
  assert.ok(b.store.get('lumenwake.records.v2').includes(String(shadow.score)), 'record persisted');
  for (const id of ['new-run', 'retry-seed', 'to-title']) assert.ok(end.hitboxes.some((h) => h.id === id), id);
  assert.ok(visited.boon >= 5 && visited.keysBoon >= 1 && visited.buy >= 1 && visited.place >= 4 && visited.move >= 1 && visited.flip >= 1, JSON.stringify(visited));
  won = end.run;
});

test('retrying the seed restarts the same island; neglect loses and is recorded', () => {
  b.key('r');
  const s = run();
  assert.equal(s.seed, won.seed);
  assert.equal(s.night, 1);
  assert.equal(s.phase, 'plan');
  assert.equal(b.snap().overlay, null, 'the guide only opens on the very first run');
  for (let guard = 0; guard < 120 && b.snap().view !== 'results'; guard++) {
    const view = b.snap().view;
    if (view === 'plan') {
      b.key(' ');
      b.settle();
    } else if (view === 'dusk' || view === 'waystation') b.key('Enter');
    else b.frames(1);
  }
  const end = b.snap();
  assert.equal(end.view, 'results');
  assert.equal(end.run.phase, 'lost');
  assert.equal(end.run.hearts, 0);
  assert.equal(end.records.runs, 2);
  assert.equal(end.records.wins, 1);
  assert.ok(stats.texts.some((t) => /Gardens Fall Dark/i.test(t)));
});

test('new run, pause menu, mute, contrast and abandoning to the title', () => {
  b.press('new-run');
  assert.notEqual(run().seed, won.seed);
  assert.equal(run().difficulty, 'breeze');
  b.key('Escape');
  assert.equal(b.snap().overlay, 'pause');
  const focus = run().focus;
  const hour = run().hour;
  b.key(' ');
  assert.equal(b.snap().overlay, null, 'Space confirms Resume on the pause menu');
  assert.equal(run().hour, hour, 'and does not release a pulse');
  assert.equal(run().focus, focus);
  b.key('Escape');
  b.press('pause-mute');
  assert.equal(b.snap().muted, true);
  b.key('m');
  assert.equal(b.snap().muted, false);
  b.press('pause-contrast');
  assert.equal(b.snap().settings.contrast, true);
  b.press('resume');
  assert.equal(b.snap().overlay, null);
  b.key('Escape');
  b.press('abandon');
  assert.equal(b.snap().screen, 'title');
  assert.equal(b.snap().run, null);
  assert.equal(JSON.parse(b.store.get('lumenwake.records.v2')).settings.contrast, true, 'settings persist');
});

test('the snapshot hook is read-only', () => {
  const s = b.snap();
  assert.ok(Object.isFrozen(s));
  assert.throws(() => {
    'use strict';
    s.screen = 'results';
  });
  assert.equal(typeof globalThis.lumenwake, 'object');
  assert.ok(Object.values(s).every((v) => typeof v !== 'function'));
  assert.throws(() => {
    globalThis.lumenwake = {};
  });
});
