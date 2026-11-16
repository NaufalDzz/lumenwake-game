// LUMENWAKE controller: owns the app state (title, expedition, overlays), turns mouse and keyboard
// input into rule transactions from rules/expedition.js, plays feedback (sound, particles, messages),
// and draws each frame. Rules never live here; this file only routes and presents them.

import {
  createRun, previewPulse, placeRelay, flipMirror, liftRelay, turnWell, undoAction, releasePulse,
  enterWaystation, chooseBoon, skipBoon, buyRelay, mendHeart, setOut, DIFFICULTY_ORDER,
} from '../rules/expedition.js';
import { RELAYS, RELAY_ORDER } from '../rules/relays.js';
import { SPECIES } from '../rules/blooms.js';
import { ISLANDS } from '../rules/islands.js';
import { COLS, ROWS, cellX, cellY, cellIndex } from '../rules/grid.js';
import { normaliseSeed } from '../rules/rng.js';
import { WORLD, BOARD, cellAt, cellCenter } from '../render/layout.js';
import { drawSky } from '../render/sky-backdrop.js';
import { drawBoard } from '../render/board-view.js';
import { createEffects } from '../render/effects.js';
import { inkFor, INK, SPECIES_COLORS } from '../render/palette.js';
import { traceLength } from '../render/beam-art.js';
import { createHitboxes } from '../ui/widgets.js';
import { drawTopBar, drawSidePanel, drawTray, drawMessageLine } from '../ui/hud.js';
import { drawTitle } from '../ui/title-screen.js';
import { drawHowTo } from '../ui/howto-screen.js';
import { drawDuskSummary } from '../ui/dusk-summary.js';
import { drawWaystation } from '../ui/waystation-screen.js';
import { drawResults } from '../ui/results-screen.js';
import { drawPauseMenu } from '../ui/pause-menu.js';
import { createAudio } from './audio.js';
import { createRecords } from './records.js';
import { bindInput } from './input.js';
import { tutorialHint, lossTip } from './tutorial-hints.js';
import { exposeSnapshot } from './debug-snapshot.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const records = createRecords();
const audio = createAudio();
audio.setMuted(records.data.settings.muted);

const app = {
  canvas,
  records,
  audio,
  hit: createHitboxes(),
  settings: { contrast: !!records.data.settings.contrast, reduceMotion: !!records.data.settings.reduceMotion },
  screen: 'title', // 'title' | 'game'
  view: 'title', // finer: 'title' | 'plan' | 'dusk' | 'waystation' | 'results'
  overlay: null, // null | 'pause' | 'howto'
  setup: { difficulty: DIFFICULTY_ORDER.includes(records.data.lastDifficulty) ? records.data.lastDifficulty : 'wayfarer', seed: freshSeed() },
  run: null,
  selection: 'mirror',
  ghostOrient: 0,
  cursor: -1,
  hover: -1,
  pointer: null,
  pulseAnim: null,
  phaseAge: 0,
  outcome: null,
  message: null,
  focusId: null,
  preview: null,
  previewKey: '',
  ghostCache: { key: '', value: null },
  version: 0,
  t: 0,
};
const effects = createEffects();

function freshSeed() {
  return normaliseSeed(Math.floor(Math.random() * 90000) + 10000);
}

function say(text, tone = 'info') {
  app.message = { text, tone, age: 0 };
}

function changed() {
  app.version += 1;
}

// ---------------------------------------------------------------- run lifecycle

function startRun(seed = app.setup.seed, difficulty = app.setup.difficulty) {
  app.run = createRun({ seed, difficulty });
  app.setup = { seed: app.run.seed, difficulty };
  app.screen = 'game';
  app.overlay = null;
  app.pulseAnim = null;
  app.outcome = null;
  app.selection = 'mirror';
  app.cursor = -1;
  app.focusId = null;
  effects.clear();
  audio.setIsland(0);
  changed();
  say(`Night 1 · ${ISLANDS[0].name}. Light the Dawnpetals before their patience runs out.`, 'good');
  if (!records.data.seenGuide) {
    records.data.seenGuide = true;
    records.save();
    app.overlay = 'howto';
  }
}

function canAct() {
  return app.run && app.run.phase === 'plan' && !app.pulseAnim && !app.overlay;
}

function result(res, sound) {
  if (res.ok) {
    changed();
    sound?.();
  } else {
    audio.deny();
    say(res.reason, 'bad');
  }
  return res;
}

function placeAt(cell) {
  const run = app.run;
  const type = app.selection;
  const res = result(placeRelay(run, cell, type, app.ghostOrient), () => audio.place(type));
  if (res.ok) {
    const c = cellCenter(cell);
    effects.burst(c.x, c.y, '#fff1c0', 10, 60);
    say(`${RELAYS[type].name} placed at ${label(cell)} · ${run.focus} focus left.`);
    if (run.satchel[type] === 0) {
      const next = RELAY_ORDER.find((t) => run.satchel[t] > 0);
      if (next) app.selection = next;
    }
  }
}

function boardClick(cell, secondary) {
  const run = app.run;
  if (!canAct() || cell < 0) return;
  const t = run.board.terrain[cell];
  const relay = run.relays[cell];
  if (t === 'well') {
    result(turnWell(run), () => audio.well());
    if (app.run.history.length) say(`The well turns ${['north', 'east', 'south', 'west'][run.wellDir]}.`);
    return;
  }
  if (relay) {
    if (secondary) {
      const res = result(liftRelay(run, cell), () => audio.lift());
      if (res.ok) {
        app.selection = relay.type;
        app.ghostOrient = relay.orient;
        say(`${RELAYS[relay.type].name} lifted (free). Click a cell to set it down again.`);
      }
    } else if (RELAYS[relay.type].rotatable) {
      const res = result(flipMirror(run, cell), () => audio.flip());
      if (res.ok) say(`Mirror flipped · ${run.focus} focus left.`);
    } else {
      audio.deny();
      say(`${RELAYS[relay.type].name}: ${RELAYS[relay.type].blurb} Right-click to lift it.`);
    }
    return;
  }
  const bloom = run.blooms.find((b) => b.cell === cell);
  if (bloom) {
    const sp = SPECIES[bloom.species];
    say(`${sp.name}: ${sp.need}. Grows in ${sp.growth - bloom.growth} more lit pulse(s); ${bloom.patience} patience left. Worth ${sp.value}.`);
    return;
  }
  if (secondary) {
    app.ghostOrient ^= 1;
    return;
  }
  placeAt(cell);
}

function doPulse() {
  if (!canAct()) return;
  const run = app.run;
  const event = releasePulse(run);
  if (!event.ok) return;
  changed();
  const length = traceLength(event.trace);
  app.pulseAnim = { event, age: 0, fired: false, length };
  audio.pulse();
  if (event.storm) audio.storm(event.storm.kind);
  if (event.knocked.length) say(`Hail knocked ${event.knocked.length} relay(s) back into your satchel.`, 'bad');
}

function firePulseEffects(anim) {
  const e = anim.event;
  e.harvested.forEach((h, i) => {
    const c = cellCenter(h.cell);
    effects.burst(c.x, c.y - 10, SPECIES_COLORS[h.species].petal, 26, 120);
    effects.float(c.x, c.y - 26 - i * 4, `+${h.points}`, INK.gold, 22);
    effects.float(c.x + 22, c.y + 4, `+${h.dew} dew`, INK.sky, 14);
  });
  let g = 0;
  for (const b of app.run.blooms) {
    if (e.responses[b.id] === 'grow') {
      const c = cellCenter(b.cell);
      effects.burst(c.x, c.y - 8, '#bfffd6', 8, 50);
      audio.grow(g++);
    }
  }
  for (const w of e.withered) {
    const c = cellCenter(w.cell);
    effects.ash(c.x, c.y);
    effects.float(c.x, c.y - 20, '−♥', INK.wilt, 24);
    effects.shake(10);
  }
  if (e.harvested.length) audio.harvest(e.harvested.length);
  if (e.withered.length) audio.wither();
  // keep the chorus banner fully on the board, away from the left edge and the side panel
  if (e.chorus > 1) effects.float(Math.min(Math.max(cellCenter(e.harvested[0].cell).x, BOARD.x + 110), BOARD.x + BOARD.w - 110), 120, `Chorus ×${e.chorus}!`, INK.mint, 26);
  const parts = [];
  if (e.harvested.length) parts.push(`${e.harvested.length} harvested (+${e.harvested.reduce((s, h) => s + h.points, 0)})`);
  const grew = Object.values(e.responses).filter((r) => r === 'grow').length - e.harvested.length;
  if (grew > 0) parts.push(`${grew} grew`);
  if (e.withered.length) parts.push(`${e.withered.length} withered (−${e.withered.length} heart)`);
  if (e.sprouted.length) parts.push(`${e.sprouted.length} new sprout${e.sprouted.length > 1 ? 's' : ''}`);
  if (parts.length) say(parts.join(' · '), e.withered.length ? 'bad' : 'good');
}

function finishPulse() {
  const run = app.run;
  app.pulseAnim = null;
  app.phaseAge = 0;
  if (run.phase === 'dusk') audio.dawn();
  if (run.phase === 'won' || run.phase === 'lost') {
    app.outcome = { ...records.recordRun(run), tip: run.phase === 'lost' ? lossTip(run) : null };
    if (run.phase === 'won') {
      audio.win();
      for (let i = 0; i < 6; i++) effects.burst(200 + i * 180, 200, i % 2 ? '#ffd27a' : '#ffb0a0', 24, 160);
    } else audio.lose();
  }
  app.focusId = null;
}

// ---------------------------------------------------------------- actions used by UI widgets

const actions = {
  start: () => {
    audio.ui();
    startRun();
  },
  cycleDifficulty(step) {
    const i = DIFFICULTY_ORDER.indexOf(app.setup.difficulty);
    app.setup.difficulty = DIFFICULTY_ORDER[(i + step + DIFFICULTY_ORDER.length) % DIFFICULTY_ORDER.length];
    audio.ui();
  },
  stepSeed(step) {
    app.setup.seed = normaliseSeed(app.setup.seed + step);
    audio.ui();
  },
  shuffleSeed() {
    app.setup.seed = freshSeed();
    audio.ui();
  },
  howto() {
    app.overlay = 'howto';
    app.focusId = null;
    audio.ui();
  },
  closeHowto() {
    app.overlay = app.screen === 'game' && app.view !== 'results' ? (app.prevOverlay ?? null) : null;
    app.prevOverlay = null;
    app.focusId = null;
    audio.ui();
  },
  pause() {
    if (app.screen !== 'game') return;
    app.overlay = app.overlay === 'pause' ? null : 'pause';
    app.focusId = null;
    audio.ui();
  },
  toggleMute() {
    audio.setMuted(!audio.muted);
    records.setSetting('muted', audio.muted);
  },
  toggleContrast() {
    app.settings.contrast = !app.settings.contrast;
    records.setSetting('contrast', app.settings.contrast);
    audio.ui();
  },
  toggleMotion() {
    app.settings.reduceMotion = !app.settings.reduceMotion;
    records.setSetting('reduceMotion', app.settings.reduceMotion);
    audio.ui();
  },
  abandon() {
    app.screen = 'title';
    app.overlay = null;
    app.run = null;
    effects.clear();
    audio.ui();
  },
  selectRelay(type) {
    app.selection = type;
    audio.ui();
    say(`${RELAYS[type].name} ×${app.run.satchel[type]}: ${RELAYS[type].blurb}`);
  },
  pulse: doPulse,
  undo() {
    if (!canAct()) return;
    const res = result(undoAction(app.run), () => audio.undo());
    if (res.ok) say(`Undone · ${app.run.focus} focus.`);
  },
  turnWell() {
    if (!canAct()) return;
    result(turnWell(app.run), () => audio.well());
  },
  toWaystation() {
    result(enterWaystation(app.run), () => audio.ui());
    app.phaseAge = 0;
    app.focusId = null;
  },
  chooseBoon(i) {
    const res = result(chooseBoon(app.run, i), () => audio.boon());
    if (res.ok) effects.burst(240 + i * 400, 236, '#ffd27a', 30, 150);
  },
  skipBoon() {
    result(skipBoon(app.run), () => audio.buy());
  },
  buy(i) {
    const res = result(buyRelay(app.run, i), () => audio.buy());
    if (res.ok) effects.burst(151 + i * 180, 480, '#bfe8ff', 20, 110);
  },
  mend() {
    result(mendHeart(app.run), () => audio.buy());
  },
  setOut() {
    const res = result(setOut(app.run), () => audio.ui());
    if (res.ok) {
      const run = app.run;
      audio.setIsland(run.board.island);
      app.phaseAge = 0;
      app.focusId = null;
      app.cursor = -1;
      if (!RELAY_ORDER.includes(app.selection) || run.satchel[app.selection] === 0) app.selection = RELAY_ORDER.find((t) => run.satchel[t] > 0) ?? 'mirror';
      const landfall = run.history.length === 0 && run.focus > run.mods.focusPerHour + 2;
      say(`Night ${run.night + 1} · ${ISLANDS[run.board.island].name}${landfall ? ' — landfall: relays returned, +4 focus to rebuild' : ''}.`, 'good');
    }
  },
  newRun() {
    app.setup.seed = freshSeed();
    startRun(app.setup.seed, app.run.difficulty);
  },
  retrySeed() {
    startRun(app.run.seed, app.run.difficulty);
  },
  toTitle() {
    app.screen = 'title';
    app.run = null;
    app.overlay = null;
    app.focusId = null;
    effects.clear();
  },
};

const label = (cell) => `${'ABCDEFGHIJ'[cellX(cell)]}${cellY(cell) + 1}`;

// ---------------------------------------------------------------- previews

function currentPreview() {
  const run = app.run;
  if (!run || run.phase !== 'plan') return null;
  const key = `${app.version}`;
  if (app.previewKey !== key) {
    app.preview = previewPulse(run);
    app.previewKey = key;
  }
  return app.preview;
}

/** Preview of placing the selected relay on the hovered/cursor cell (a what-if on a scratch copy). */
function ghostPreview() {
  const run = app.run;
  if (!canAct()) return null;
  const cell = app.hover >= 0 ? app.hover : app.cursor;
  if (cell < 0) return null;
  if (run.relays[cell] || run.board.terrain[cell] === 'well' || run.blooms.some((b) => b.cell === cell)) return null;
  const key = `${app.version}:${cell}:${app.selection}:${app.ghostOrient}`;
  if (app.ghostCache.key === key) return app.ghostCache.value;
  const scratch = { ...run, relays: run.relays.map((r) => (r ? { ...r } : null)), satchel: { ...run.satchel }, history: [], stats: { ...run.stats } };
  const res = placeRelay(scratch, cell, app.selection, app.ghostOrient);
  const value = { cell, type: app.selection, orient: app.ghostOrient, blocked: !res.ok, reason: res.reason, preview: res.ok ? previewPulse(scratch) : null };
  app.ghostCache = { key, value };
  return value;
}

// ---------------------------------------------------------------- input

function pointerMove(p) {
  app.pointer = p;
  app.hover = app.screen === 'game' && app.view === 'plan' && !app.overlay ? cellAt(p.x, p.y) : -1;
}

function pointerDown(p, which) {
  app.pointer = p;
  const box = app.hit.at(p.x, p.y);
  if (box) {
    if (box.enabled !== false) box.onClick?.();
    else audio.deny();
    return;
  }
  if (app.screen === 'game' && app.view === 'plan' && !app.overlay) {
    const cell = cellAt(p.x, p.y);
    if (cell >= 0) {
      app.cursor = -1;
      boardClick(cell, which === 'secondary');
    }
  }
}

function wheel(p, delta) {
  if (app.screen === 'game' && app.view === 'plan' && cellAt(p.x, p.y) >= 0 && delta) app.ghostOrient ^= 1;
}

function moveFocus(step) {
  const list = app.hit.focusable();
  if (!list.length) return;
  const i = list.findIndex((b) => b.id === app.focusId);
  const next = i < 0 ? (step > 0 ? 0 : list.length - 1) : (i + step + list.length) % list.length;
  app.focusId = list[next].id;
  audio.ui();
}

function activateFocus() {
  const box = app.focusId ? app.hit.byId(app.focusId) : null;
  if (box && box.enabled !== false) {
    box.onClick?.();
    return true;
  }
  return false;
}

function menuKeys(e, primaryId) {
  if (e.key === 'Tab' || e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    moveFocus(e.shiftKey && e.key === 'Tab' ? -1 : 1);
    return true;
  }
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    moveFocus(-1);
    return true;
  }
  if (e.key === 'Enter' || e.key === ' ') {
    if (!activateFocus()) app.hit.byId(primaryId)?.onClick?.();
    return true;
  }
  return false;
}

function key(e) {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === 'm') {
    actions.toggleMute();
    return true;
  }
  if (app.overlay === 'howto') {
    if (k === 'Escape' || k === 'Enter' || k === 'h') actions.closeHowto();
    return true;
  }
  if (app.overlay === 'pause') {
    if (k === 'Escape') actions.pause();
    else if (k === 'h') {
      app.prevOverlay = 'pause';
      actions.howto();
    } else return menuKeys(e, 'resume');
    return true;
  }
  if (app.screen === 'title') {
    if (k === 'h') actions.howto();
    else if (k === 's') actions.shuffleSeed();
    else return menuKeys(e, 'start');
    return true;
  }
  const run = app.run;
  if (app.view === 'results') {
    if (k === 'r') actions.retrySeed();
    else if (k === 't' || k === 'Escape') actions.toTitle();
    else return menuKeys(e, 'new-run');
    return true;
  }
  if (k === 'Escape') {
    actions.pause();
    return true;
  }
  if (app.view === 'dusk') return menuKeys(e, 'to-waystation');
  if (app.view === 'waystation') {
    if (k >= '1' && k <= '3') actions.chooseBoon(Number(k) - 1);
    else if (k >= '4' && k <= '6') actions.buy(Number(k) - 4);
    else if (k === '7') actions.mend();
    else return menuKeys(e, 'set-out');
    return true;
  }
  if (app.view !== 'plan') return false;
  if (app.pulseAnim) {
    if (k === ' ') app.pulseAnim.age = Math.max(app.pulseAnim.age, 1.15);
    return true;
  }
  if (k >= '1' && k <= '4') {
    actions.selectRelay(RELAY_ORDER[Number(k) - 1]);
    return true;
  }
  if (k.startsWith('Arrow')) {
    if (app.cursor < 0) app.cursor = run.board.wellIndex;
    let x = cellX(app.cursor);
    let y = cellY(app.cursor);
    if (k === 'ArrowLeft') x = Math.max(0, x - 1);
    if (k === 'ArrowRight') x = Math.min(COLS - 1, x + 1);
    if (k === 'ArrowUp') y = Math.max(0, y - 1);
    if (k === 'ArrowDown') y = Math.min(ROWS - 1, y + 1);
    app.cursor = cellIndex(x, y);
    app.hover = -1;
    return true;
  }
  const map = {
    ' ': doPulse,
    z: actions.undo,
    w: actions.turnWell,
    f: () => (app.ghostOrient ^= 1),
    q: () => (app.ghostOrient ^= 1),
    h: () => {
      app.prevOverlay = null;
      actions.howto();
    },
    Enter: () => boardClick(app.cursor, false),
    e: () => boardClick(app.cursor, false),
    x: () => boardClick(app.cursor, true),
    Backspace: () => boardClick(app.cursor, true),
    Delete: () => boardClick(app.cursor, true),
  };
  if (map[k]) {
    map[k]();
    return true;
  }
  return false;
}

bindInput(canvas, {
  pointerMove,
  pointerDown,
  pointerLeave: () => {
    app.pointer = null;
    app.hover = -1;
  },
  wheel,
  key,
  gesture: () => audio.start(),
});

// ---------------------------------------------------------------- frame

/**
 * The space the canvas may really use: the stage element's box when the page has laid it out, else the
 * document's client area (which excludes scrollbars), else the window. innerWidth alone can include a
 * scrollbar or stale emulated metrics and make the canvas overflow its letterbox.
 */
function availableSize() {
  const stage = canvas.parentElement?.getBoundingClientRect?.();
  if (stage && stage.width > 0 && stage.height > 0) return { vw: stage.width, vh: stage.height };
  const doc = globalThis.document?.documentElement;
  if (doc && doc.clientWidth > 0 && doc.clientHeight > 0) return { vw: doc.clientWidth, vh: doc.clientHeight };
  return { vw: globalThis.innerWidth || WORLD.w, vh: globalThis.innerHeight || WORLD.h };
}

function resize() {
  const { vw, vh } = availableSize();
  const scale = Math.min(vw / WORLD.w, vh / WORLD.h);
  const cssW = Math.floor(WORLD.w * scale);
  const cssH = Math.floor(WORLD.h * scale);
  const k = Math.min(2, scale * (globalThis.devicePixelRatio || 1));
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  // resetting the backing store clears it, so only do so when the size really changed
  if (canvas.width !== Math.round(WORLD.w * k)) canvas.width = Math.round(WORLD.w * k);
  if (canvas.height !== Math.round(WORLD.h * k)) canvas.height = Math.round(WORLD.h * k);
  app.pixelScale = k;
}

function currentView() {
  if (app.screen === 'title') return 'title';
  const phase = app.run.phase;
  if (app.pulseAnim) return 'plan';
  if (phase === 'dusk') return 'dusk';
  if (phase === 'waystation') return 'waystation';
  if (phase === 'won' || phase === 'lost') return 'results';
  return 'plan';
}

function update(dt) {
  app.t += dt;
  app.phaseAge += dt;
  effects.update(dt);
  if (app.message) app.message.age += dt;
  if (app.pulseAnim && !app.overlay) {
    const anim = app.pulseAnim;
    anim.age += app.settings.reduceMotion ? dt * 2 : dt;
    if (!anim.fired && anim.age >= 0.5) {
      anim.fired = true;
      firePulseEffects(anim);
    }
    if (anim.age >= 1.25) finishPulse();
  }
  app.view = currentView();
}

function uiContext() {
  return {
    ctx,
    hit: app.hit,
    ink: inkFor(app.settings.contrast),
    t: app.t,
    pointer: app.pointer,
    focusId: app.focusId,
    actions,
    muted: audio.muted,
    settings: app.settings,
    selection: app.selection,
    ghostOrient: app.ghostOrient,
    canAct: canAct(),
    hoverBloom: app.run?.blooms.find((b) => b.cell === (app.hover >= 0 ? app.hover : app.cursor))?.id ?? null,
  };
}

function render() {
  ctx.setTransform(app.pixelScale, 0, 0, app.pixelScale, 0, 0);
  app.hit.begin();
  const ui = uiContext();
  if (app.screen === 'title') {
    drawSky(ctx, 'verdant', app.t, { reduceMotion: app.settings.reduceMotion });
    drawTitle(ui, app.setup, records);
  } else {
    const run = app.run;
    const islandId = ISLANDS[run.board.island].id;
    const flash = app.pulseAnim?.event.storm && app.pulseAnim.age < 0.4 ? 1 - app.pulseAnim.age / 0.4 : 0;
    drawSky(ctx, islandId, app.t, { stormy: !!run.forecast, flash: app.settings.reduceMotion ? 0 : flash, reduceMotion: app.settings.reduceMotion });
    const shake = app.settings.reduceMotion ? { x: 0, y: 0 } : effects.shakeOffset;
    ctx.save();
    ctx.translate(shake.x, shake.y);
    const preview = currentPreview();
    const ghost = app.view === 'plan' ? ghostPreview() : null;
    drawBoard(ctx, {
      run,
      preview,
      ghost,
      cursor: app.view === 'plan' ? app.cursor : -1,
      hover: app.view === 'plan' ? app.hover : -1,
      pulse: app.pulseAnim,
      t: app.settings.reduceMotion ? 0 : app.t,
      settings: app.settings,
    });
    ctx.restore();
    if (app.view === 'plan' || app.view === 'dusk') {
      drawTopBar(ui, run);
      drawSidePanel(ui, run, preview);
      drawTray(ui, run);
      const fresh = app.message && app.message.age < 6 ? app.message : null;
      const hint = fresh ?? (ghost?.blocked && ghost.reason ? { text: ghost.reason, tone: 'bad' } : null) ?? { text: tutorialHint(run, app.selection), tone: 'info' };
      drawMessageLine(ui, hint);
    }
    effects.draw(ctx);
    if (app.view === 'dusk') {
      app.hit.begin();
      drawDuskSummary(ui, run, app.phaseAge);
    }
    if (app.view === 'waystation') drawWaystation(ui, run);
    if (app.view === 'results') drawResults(ui, run, app.outcome, app.phaseAge);
    if (app.overlay === 'pause') {
      app.hit.begin();
      drawPauseMenu(ui);
    }
  }
  if (app.overlay === 'howto') {
    app.hit.begin();
    drawHowTo(ui);
  }
  if (app.screen === 'title' && app.overlay !== 'howto') effects.draw(ctx);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

resize();
addEventListener('resize', resize);
// the stage can change size without a window resize event (devtools, zoom, emulated viewports)
if (typeof ResizeObserver === 'function' && canvas.parentElement) new ResizeObserver(() => resize()).observe(canvas.parentElement);
exposeSnapshot(() => app);
requestAnimationFrame(frame);
