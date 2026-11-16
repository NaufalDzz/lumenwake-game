// LUMENWAKE controller: owns the screen flow (title → stage select / how-to → play → results →
// campaign finale), turns player input into rule calls, and runs the render loop.

import { LEVELS } from './levels.js';
import { createGame, rotateTile, undoMove, resetGame, scoreResult, tileAt } from './puzzle.js';
import { createProgress } from './progress.js';
import { createAudio } from './audio.js';
import { createScenery } from './scenery.js';
import { createBoardView, layoutBoard, cellAt } from './board-view.js';
import { VIEW_W, VIEW_H, hitButton } from './ui.js';
import {
  BOARD_RECT, drawHud, drawSidePanel, drawToast, drawTitle, drawSelect, drawHowTo, drawPause, drawResult, drawFinale,
} from './screens.js';
import { bindInput } from './input.js';
import { exposeSnapshot } from './debug.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const reducedMotion = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const progress = createProgress(LEVELS.length);
const audio = createAudio();
audio.setMuted(progress.muted);

const app = {
  screen: 'title',
  overlay: null,
  game: null,
  view: createBoardView({ reducedMotion }),
  layout: null,
  progress,
  audio,
  buttons: [],
  hoverButton: -1,
  focus: 0,
  mouse: { x: -1, y: -1 },
  hoverCell: null,
  cursor: null,
  keyboardMode: false,
  time: 0,
  toast: null,
  result: null,
  resultTime: 0,
  pending: null,
  howtoReturn: null,
  turnDirs: [],
  lowTideWarned: false,
};

// The title screen previews a real stage, solved and glowing.
const preview = { game: createGame(LEVELS[5]), view: createBoardView({ reducedMotion }) };
preview.game.tiles.forEach((t) => {
  t.mask = t.solvedMask;
});
preview.view.attach(preview.game, 0);
const previewLayout = layoutBoard(preview.game, { x: 40, y: 196, w: 690, h: 480 }, 92);

const scenery = createScenery({ reducedMotion });

// Logical transitions (win/loss screens) run on real elapsed time, not the capped animation clock, so a
// throttled or backgrounded tab opens the right screen as soon as it gets a frame or an input again.
const realSeconds = () => performance.now() / 1000;

function toast(text, warn = false) {
  app.toast = { text, warn, time: app.time };
}

// ---------------------------------------------------------------- flow

function startLevel(index) {
  const def = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, index))];
  app.game = createGame(def);
  app.layout = layoutBoard(app.game, BOARD_RECT, 118);
  app.view.attach(app.game, app.time);
  app.hoverCell = cellAt(app.layout, app.game, app.mouse.x, app.mouse.y);
  const source = app.game.tiles.find((t) => t.kind === 'source');
  app.cursor = { r: source.r, c: source.c };
  app.screen = 'play';
  app.overlay = null;
  app.pending = null;
  app.focus = -1;
  app.turnDirs = [];
  app.lowTideWarned = false;
  toast(`Stage ${def.id} · ${def.name}`);
}

function openOverlay(kind) {
  app.overlay = kind;
  app.focus = 0;
  app.buttons = []; // the previous screen's buttons must not answer until the card is drawn
}

function finishStage(kind) {
  const g = app.game;
  if (kind === 'won') {
    const res = scoreResult(g);
    const improved = progress.recordWin(g.id, { stars: res.stars, score: res.score, moves: g.moves });
    app.result = {
      status: 'won', id: g.id, stars: res.stars, score: res.score, tideLeft: res.tideLeft, moves: g.moves, par: g.par,
      budget: g.budget, undos: g.undos, improved, best: progress.best(g.id).score,
    };
    audio.win();
    app.view.celebrate(app.layout);
  } else {
    const flow = app.view.flow;
    app.result = { status: 'lost', id: g.id, moves: g.moves, budget: g.budget, par: g.par, awake: flow.litTargets, total: flow.totalTargets };
    audio.lose();
  }
  app.resultTime = app.time;
  openOverlay(kind);
}

function turn(r, c, dir) {
  const g = app.game;
  const res = rotateTile(g, r, c, dir);
  const t = tileAt(g, r, c);
  if (!res.ok) {
    if (res.reason === 'stone' || res.reason === 'fixed') {
      app.view.onBlocked(r * g.cols + c, app.time);
      audio.stone();
      toast(res.reason === 'stone' ? 'Mossy stone canals never turn' : t.kind === 'source' ? 'The lighthouse stands fixed' : 'Gardens stay rooted in place');
    }
    return;
  }
  app.turnDirs.push(dir);
  app.view.onTurn(r * g.cols + c, dir, app.time, app.layout);
  audio.rotate(dir, res.flow.litTargets);
  if (res.woke > 0) setTimeout(() => audio.wake(res.flow.litTargets), 140);
  else if (res.woke < 0) audio.dim();
  if (res.solved) app.pending = { kind: 'won', at: realSeconds() + (reducedMotion ? 0.3 : 1.1) };
  else if (res.lost) app.pending = { kind: 'lost', at: realSeconds() + 0.7 };
  else if (g.budget - g.moves <= 3 && !app.lowTideWarned) {
    app.lowTideWarned = true;
    toast(`The tide is low: ${g.budget - g.moves} turns left`, true);
  }
}

/** Open a due win/loss screen. Returns true when one opened. */
function settlePending() {
  if (!app.pending || realSeconds() < app.pending.at) return false;
  const kind = app.pending.kind;
  app.pending = null;
  finishStage(kind);
  return true;
}

function undo() {
  if (!app.game || app.pending) return;
  const res = undoMove(app.game);
  if (!res.ok) return;
  const dir = app.turnDirs.pop() ?? 1;
  app.view.onTurn(res.index, -dir, app.time, app.layout);
  audio.undo();
}

function reset() {
  if (!app.game) return;
  resetGame(app.game);
  app.view.attach(app.game, app.time);
  app.pending = null;
  app.overlay = null;
  app.turnDirs = [];
  app.lowTideWarned = false;
  app.focus = -1;
  toast('Canals reset · the tide returns');
}

function act(action, arg) {
  audio.ui();
  actOn(action, arg);
  app.buttons = []; // the screen changed: only buttons drawn by the next frame may be focused or clicked
}

function actOn(action, arg) {
  switch (action) {
    case 'continue':
      startLevel(progress.unlocked - 1);
      break;
    case 'select':
      app.screen = 'select';
      app.overlay = null;
      app.focus = Math.min(progress.unlocked, LEVELS.length) - 1;
      break;
    case 'play':
      startLevel(arg);
      break;
    case 'howto':
      app.howtoReturn = { screen: app.screen, overlay: app.overlay, focus: app.focus };
      app.screen = 'howto';
      app.overlay = null;
      app.focus = 0;
      break;
    case 'back':
      if (app.howtoReturn) {
        app.screen = app.howtoReturn.screen;
        app.overlay = app.howtoReturn.overlay;
        app.focus = app.howtoReturn.focus;
      } else {
        app.screen = 'title';
        app.focus = 0;
      }
      app.howtoReturn = null;
      break;
    case 'title':
      app.screen = 'title';
      app.overlay = null;
      app.focus = 0;
      break;
    case 'mute':
      audio.setMuted(!audio.muted);
      progress.setMuted(audio.muted);
      break;
    case 'undo':
      undo();
      break;
    case 'reset':
    case 'retry':
      reset();
      break;
    case 'pause':
      if (!app.overlay && !app.pending) openOverlay('pause');
      break;
    case 'resume':
      app.overlay = null;
      app.focus = -1;
      break;
    case 'next':
      startLevel(app.game.id);
      break;
    case 'finale':
      app.resultTime = app.time;
      openOverlay('finale');
      audio.win();
      break;
    case 'restart-campaign':
      startLevel(0);
      break;
    default:
      break;
  }
}

// ---------------------------------------------------------------- input

function boardActive() {
  return app.screen === 'play' && !app.overlay && !app.pending && app.game.status === 'playing';
}

bindInput(canvas, {
  move(x, y) {
    app.mouse.x = x;
    app.mouse.y = y;
    const b = hitButton(app.buttons, x, y);
    app.hoverButton = b ? b.index : -1;
    app.hoverCell = app.screen === 'play' && app.layout ? cellAt(app.layout, app.game, x, y) : null;
    if (app.hoverCell) {
      app.keyboardMode = false;
      app.cursor = app.hoverCell;
    }
    canvas.style.cursor = b || (app.hoverCell && boardActive() && !tileAt(app.game, app.hoverCell.r, app.hoverCell.c).locked) ? 'pointer' : 'default';
  },
  press(x, y, dir) {
    audio.start();
    if (settlePending()) return; // this click reveals the result card instead of acting behind it
    const b = hitButton(app.buttons, x, y);
    if (b) {
      act(b.action, b.arg);
      return;
    }
    if (!boardActive()) return;
    const cell = cellAt(app.layout, app.game, x, y);
    if (!cell) return;
    app.cursor = cell;
    turn(cell.r, cell.c, dir);
  },
  key(key, shift) {
    audio.start();
    if (settlePending()) return true; // this key reveals the result card instead of acting behind it
    const k = key.length === 1 ? key.toLowerCase() : key;
    if (k === 'm') {
      act('mute');
      return true;
    }
    // menus, cards and overlays: arrows / Tab move focus, Enter or Space activates
    const inMenu = app.screen !== 'play' || app.overlay || app.focus >= 0;
    if (k === 'Tab') {
      const n = app.buttons.length;
      if (n) {
        let i = app.focus;
        for (let step = 0; step < n; step++) {
          i = (i + (shift ? -1 : 1) + n) % n;
          if (!app.buttons[i].disabled) break;
        }
        app.focus = i;
      }
      return true;
    }
    if (app.screen === 'play' && !app.overlay) {
      if (k === 'Escape' || k === 'p') {
        if (app.focus >= 0) app.focus = -1;
        else act('pause');
        return true;
      }
      if (k === 'z' || k === 'Backspace' || k === 'u') {
        act('undo');
        return true;
      }
      if (k === 'r') {
        act('reset');
        return true;
      }
      const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], w: [-1, 0], s: [1, 0], a: [0, -1], d: [0, 1] };
      if (moves[k]) {
        app.focus = -1;
        app.keyboardMode = true;
        const [dr, dc] = moves[k];
        const g = app.game;
        app.cursor = { r: (app.cursor.r + dr + g.rows) % g.rows, c: (app.cursor.c + dc + g.cols) % g.cols };
        return true;
      }
      if ((k === ' ' || k === 'Enter' || k === 'q' || k === 'e') && app.focus < 0) {
        app.keyboardMode = true;
        if (boardActive()) turn(app.cursor.r, app.cursor.c, k === 'q' || shift ? -1 : 1);
        return true;
      }
    }
    if (app.overlay === 'pause' && (k === 'Escape' || k === 'p')) {
      act('resume');
      return true;
    }
    if ((app.overlay === 'won' || app.overlay === 'lost') && k === 'r') {
      act('retry');
      return true;
    }
    if (app.screen === 'howto' && k === 'Escape') {
      act('back');
      return true;
    }
    if (app.screen === 'select' && k === 'Escape') {
      act('title');
      return true;
    }
    if (inMenu) {
      const n = app.buttons.length;
      if (!n) return false;
      let delta = 0;
      if (app.screen === 'select' && !app.overlay) {
        delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 }[k] ?? 0;
      } else delta = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[k] ?? 0;
      if (delta) {
        let i = app.focus < 0 ? 0 : app.focus;
        let next = i + delta;
        if (next < 0 || next >= n) next = (i + Math.sign(delta) + n) % n;
        app.focus = next;
        return true;
      }
      if ((k === 'Enter' || k === ' ') && app.focus >= 0 && app.buttons[app.focus]) {
        const b = app.buttons[app.focus];
        if (!b.disabled) act(b.action, b.arg);
        else audio.stone();
        return true;
      }
    }
    return false;
  },
});

// ---------------------------------------------------------------- render loop

function resize() {
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.style.width = `${Math.floor(VIEW_W * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW_H * scale)}px`;
  const pixelScale = Math.max(1, scale) * dpr;
  canvas.width = Math.round(VIEW_W * pixelScale);
  canvas.height = Math.round(VIEW_H * pixelScale);
  app.pixelScale = pixelScale;
}
window.addEventListener('resize', resize);
resize();

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  app.time += dt;
  ctx.setTransform(app.pixelScale, 0, 0, app.pixelScale, 0, 0);
  app.buttons = [];
  scenery.drawBackground(ctx, app.time);

  settlePending();

  const behind = app.screen === 'howto' && app.howtoReturn ? app.howtoReturn.screen : app.screen;
  if (behind === 'title') {
    preview.view.step(dt, app.time, previewLayout);
    preview.view.draw(ctx, previewLayout, app.time, { preview: true });
    scenery.drawFireflies(ctx, app.time);
    if (app.screen === 'title') drawTitle(ctx, app);
  } else if (behind === 'select') {
    scenery.drawFireflies(ctx, app.time);
    if (app.screen === 'select') drawSelect(ctx, app);
  } else if (behind === 'play' && app.game) {
    app.view.step(dt, app.time, app.layout);
    app.view.draw(ctx, app.layout, app.time, {
      hover: boardActive() ? app.hoverCell : null,
      cursor: app.cursor,
      showCursor: app.keyboardMode && boardActive(),
    });
    scenery.drawFireflies(ctx, app.time);
    drawHud(ctx, app);
    drawSidePanel(ctx, app);
    drawToast(ctx, app);
    if (app.screen === 'play' && app.overlay) {
      app.buttons = [];
      if (app.overlay === 'pause') drawPause(ctx, app);
      else if (app.overlay === 'finale') drawFinale(ctx, app);
      else drawResult(ctx, app);
    }
  } else {
    scenery.drawFireflies(ctx, app.time);
  }
  if (app.screen === 'howto') {
    app.buttons = [];
    drawHowTo(ctx, app);
  }
  // keep hover in step with the buttons just drawn
  const hb = hitButton(app.buttons, app.mouse.x, app.mouse.y);
  app.hoverButton = hb ? hb.index : -1;
  requestAnimationFrame(frame);
}

exposeSnapshot(() => app);
canvas.focus({ preventScroll: true });
requestAnimationFrame(frame);
