// When the browser blocks localStorage (private modes, strict privacy settings) the game must still start,
// play, score and show results; records simply live for the session. Also renders every screen with high
// contrast and reduced motion on, so no drawing path produces non-finite coordinates.
// Node built-ins only: node --test 'tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installBrowser, stats } from './support/fake-browser.mjs';

let lcg = 777;
Math.random = () => ((lcg = (lcg * 1103515245 + 12345) % 2147483648) / 2147483648);

const b = installBrowser({ blockedStorage: true });
await import('../game/src/app/main.js');
b.frames(3);

test('blocked storage: the game boots, plays to a result and keeps records for the session', () => {
  const s = b.snap();
  assert.equal(s.screen, 'title');
  assert.equal(s.records.persistent, false);
  b.press('contrast');
  b.press('motion');
  assert.equal(b.snap().settings.contrast, true);
  assert.equal(b.snap().settings.reduceMotion, true);
  b.press('howto');
  assert.equal(b.snap().overlay, 'howto');
  b.press('howto-close');
  b.press('diff-next');
  assert.equal(b.snap().setup.difficulty, 'stormcaller');
  b.key('Enter');
  assert.equal(b.snap().screen, 'game');
  b.key('Escape');
  assert.equal(b.snap().overlay, null);
  for (let guard = 0; guard < 200 && b.snap().view !== 'results'; guard++) {
    const view = b.snap().view;
    if (view === 'plan') {
      b.key(' ');
      b.frames(50);
    } else if (view === 'dusk') b.press('to-waystation');
    else if (view === 'waystation') {
      b.key('1');
      b.press('set-out');
    } else b.frames(1);
  }
  const end = b.snap();
  assert.equal(end.view, 'results');
  assert.equal(end.run.phase, 'lost');
  assert.equal(end.records.runs, 1);
  assert.equal(b.store.size, 0, 'nothing was written');
  b.key('t');
  assert.equal(b.snap().screen, 'title');
  assert.equal(b.snap().records.runs, 1, 'session records survive');
  assert.ok(stats.drawCalls > 1000);
});
