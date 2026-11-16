// Headless UI smoke test: loads the real game/src/main.js against a stub DOM and recording 2D context,
// then plays only through synthetic mouse and keyboard events, reading state from the read-only
// window.lumenwake snapshot. Covers title → play → win → next → tide-out → retry → pause → stage select
// → all twelve stages → campaign finale → restart. Node built-ins only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../game/src/levels.js';
import { createGame, solutionSequence, traceLight } from '../game/src/puzzle.js';

// ---- stub browser -------------------------------------------------------
let drawCalls = 0;
function fakeContext() {
  const state = { canvas: null };
  return new Proxy(state, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => ({ addColorStop() {} });
      if (prop === 'measureText') return (text) => ({ width: String(text).length * 8 });
      return (...args) => {
        drawCalls++;
        for (const a of args) if (typeof a === 'number' && !Number.isFinite(a) && prop !== 'arc') throw new Error(`non-finite arg to ${String(prop)}`);
      };
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
    has() {
      return true;
    },
  });
}
function fakeCanvas() {
  const listeners = {};
  return {
    width: 300,
    height: 150,
    style: {},
    listeners,
    getContext: () => fakeContext(),
    addEventListener: (type, fn) => {
      (listeners[type] ??= []).push(fn);
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
    focus() {},
  };
}
const mainCanvas = fakeCanvas();
const windowListeners = {};
let rafCallback = null;
let clock = 0;
const store = new Map();
globalThis.window = globalThis;
globalThis.innerWidth = 1280;
globalThis.innerHeight = 720;
globalThis.devicePixelRatio = 1;
globalThis.addEventListener = (type, fn) => {
  (windowListeners[type] ??= []).push(fn);
};
globalThis.document = { getElementById: () => mainCanvas, createElement: () => fakeCanvas() };
globalThis.requestAnimationFrame = (fn) => {
  rafCallback = fn;
};
Object.defineProperty(globalThis, 'localStorage', {
  value: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
});
globalThis.performance.now = () => clock;

function frames(n = 1, ms = 40) {
  for (let i = 0; i < n; i++) {
    clock += ms;
    const cb = rafCallback;
    rafCallback = null;
    cb(clock);
  }
}
function key(k, shiftKey = false) {
  for (const fn of windowListeners.keydown ?? []) fn({ key: k, shiftKey, altKey: false, ctrlKey: false, metaKey: false, preventDefault() {} });
  frames(1);
}
function click(x, y, button = 0, shiftKey = false) {
  const ev = { clientX: x, clientY: y, button, shiftKey, preventDefault() {} };
  for (const fn of mainCanvas.listeners.pointermove ?? []) fn(ev);
  for (const fn of mainCanvas.listeners.pointerdown ?? []) fn(ev);
  frames(1);
}
const snap = () => globalThis.lumenwake;

/** Solve the current stage with mouse clicks only (left = clockwise, right = counter-clockwise). */
function solveByMouse() {
  const s = snap();
  const plan = solutionSequence(createGame(LEVELS[s.level - 1]));
  for (const step of plan) {
    const t = snap().tiles.find((x) => x.r === step.r && x.c === step.c);
    click(t.centerX, t.centerY, step.dir > 0 ? 0 : 2);
  }
  frames(40);
}

test('the game plays end to end through mouse and keyboard only', async () => {
  await import('../game/src/main.js');
  frames(5);
  assert.equal(snap().screen, 'title');
  assert.ok(drawCalls > 100, 'title screen draws');

  // snapshot is read-only and exposes no functions
  assert.throws(() => {
    'use strict';
    globalThis.lumenwake = {};
  });
  const s0 = snap();
  assert.ok(Object.isFrozen(s0));
  assert.ok(!Object.values(s0).some((v) => typeof v === 'function'));

  // Enter on the focused primary button begins stage 1
  key('Enter');
  assert.equal(snap().screen, 'play');
  assert.equal(snap().level, 1);
  assert.equal(snap().moves, 0);

  // keyboard: move the selection and turn with Space, then undo with Z and reset with R
  const start = snap().tiles.map((t) => t.ports).join();
  key('ArrowRight');
  key(' ');
  assert.equal(snap().moves, 1);
  assert.notEqual(snap().tiles.map((t) => t.ports).join(), start);
  key('z');
  assert.equal(snap().moves, 0);
  assert.equal(snap().tiles.map((t) => t.ports).join(), start);
  key(' ');
  key('r');
  assert.equal(snap().moves, 0);
  assert.equal(snap().tiles.map((t) => t.ports).join(), start);

  // clicking the lighthouse is refused and costs nothing
  const src = snap().tiles.find((t) => t.kind === 'source');
  click(src.centerX, src.centerY);
  assert.equal(snap().moves, 0);

  // solve stage 1 with the mouse: the win overlay appears only after real connectivity
  solveByMouse();
  assert.equal(snap().solved, true);
  assert.equal(snap().overlay, 'won');
  assert.equal(snap().gardensAwake, snap().gardensTotal);
  assert.equal(snap().unlocked, 2);
  assert.ok(store.get('lumenwake.progress.v1').includes('"unlocked":2'), 'unlock saved');

  // Enter = Next Stage
  key('Enter');
  assert.equal(snap().level, 2);
  assert.equal(snap().overlay, null);

  // run the tide out on a decoy canal → tide-out overlay, then R retries
  const g2 = createGame(LEVELS[1]);
  const solved = traceLight({ ...g2, tiles: g2.tiles.map((t) => ({ ...t, mask: t.solvedMask })) });
  const decoy = g2.tiles.find((t, i) => t.kind === 'pipe' && !t.locked && !solved.lit[i]);
  const dt = snap().tiles.find((t) => t.r === decoy.r && t.c === decoy.c);
  for (let i = 0; i < snap().budget; i++) click(dt.centerX, dt.centerY, 0, true);
  frames(30);
  assert.equal(snap().status, 'lost');
  assert.equal(snap().overlay, 'lost');
  key('r');
  assert.equal(snap().status, 'playing');
  assert.equal(snap().moves, 0);

  // Esc pauses, Esc resumes; Tab reaches the header buttons
  key('Escape');
  assert.equal(snap().overlay, 'pause');
  key('Escape');
  assert.equal(snap().overlay, null);
  // pause menu → How to Play → back keeps the pause menu
  key('Escape');
  key('ArrowDown');
  key('ArrowDown');
  key('Enter');
  assert.equal(snap().screen, 'howto');
  key('Escape');
  assert.equal(snap().screen, 'play');
  assert.equal(snap().overlay, 'pause');
  // pause → Stage Select (4th button)
  key('ArrowDown');
  key('Enter');
  assert.equal(snap().screen, 'select');
  // stage 3 is locked: Enter on it does nothing; stage 2 opens
  key('ArrowRight');
  key('Enter');
  assert.equal(snap().screen, 'select');
  key('ArrowLeft');
  key('Enter');
  assert.equal(snap().screen, 'play');
  assert.equal(snap().level, 2);

  // play through every remaining stage with the mouse
  for (let id = 2; id <= LEVELS.length; id++) {
    assert.equal(snap().level, id);
    solveByMouse();
    assert.equal(snap().overlay, 'won', `stage ${id} won`);
    key('Enter');
  }
  assert.equal(snap().overlay, 'finale');
  assert.equal(snap().unlocked, LEVELS.length);
  frames(20);
  key('Enter'); // Play Again from Stage 1
  assert.equal(snap().level, 1);
  assert.equal(snap().moves, 0);
  assert.equal(snap().status, 'playing');

  // mute toggles and persists
  key('m');
  assert.equal(snap().muted, true);
  assert.ok(store.get('lumenwake.progress.v1').includes('"muted":true'));
});

test('win/loss screens open on real elapsed time even when frames are throttled', () => {
  // continues from the previous test: stage 1 freshly restarted
  assert.equal(snap().level, 1);
  assert.equal(snap().status, 'playing');
  const plan = solutionSequence(createGame(LEVELS[0]));
  for (const step of plan) {
    const t = snap().tiles.find((x) => x.r === step.r && x.c === step.c);
    click(t.centerX, t.centerY, step.dir > 0 ? 0 : 2); // each click runs one normal 40 ms frame
  }
  assert.equal(snap().status, 'won');
  assert.equal(snap().overlay, null, 'the light gets its short flow animation before the card');
  // a throttled tab: one frame arrives 5 s later; the capped animation clock moves only 50 ms,
  // but the result card must open on that very frame
  frames(1, 5000);
  assert.equal(snap().overlay, 'won');
  key('Enter');
  assert.equal(snap().level, 2);

  // loss with no frames at all after the last turn: the next key press reveals the card and is consumed
  const g2 = createGame(LEVELS[1]);
  const solved = traceLight({ ...g2, tiles: g2.tiles.map((t) => ({ ...t, mask: t.solvedMask })) });
  const decoy = g2.tiles.find((t, i) => t.kind === 'pipe' && !t.locked && !solved.lit[i]);
  const dt = snap().tiles.find((t) => t.r === decoy.r && t.c === decoy.c);
  const ev = { clientX: dt.centerX, clientY: dt.centerY, button: 0, shiftKey: false, preventDefault() {} };
  for (let i = 0; i < snap().budget; i++) for (const fn of mainCanvas.listeners.pointerdown) fn(ev);
  assert.equal(snap().status, 'lost');
  assert.equal(snap().overlay, null);
  clock += 3000; // real time passes while the tab renders nothing
  for (const fn of windowListeners.keydown) fn({ key: 'Enter', shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, preventDefault() {} });
  assert.equal(snap().overlay, 'lost', 'the key opened the tide-out card');
  assert.equal(snap().status, 'lost', 'and was not also taken as Try Again');
  frames(1); // the card is drawn
  key('Enter'); // now Enter activates the focused Try Again
  assert.equal(snap().status, 'playing');
  assert.equal(snap().moves, 0);
});
