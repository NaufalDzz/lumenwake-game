// Read-only inspection hook for play-testing: window.lumenwake returns a frozen snapshot of the
// current screen, stage, turns and tiles. It exposes no functions, so it can observe but never alter
// the game; mouse and keyboard remain the only way to play.

import { DIRS } from './puzzle.js';

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export function exposeSnapshot(getApp) {
  Object.defineProperty(window, 'lumenwake', {
    configurable: false,
    enumerable: false,
    get() {
      const app = getApp();
      const g = app.game;
      const flow = app.view?.flow;
      const snapshot = {
        screen: app.screen,
        overlay: app.overlay,
        unlocked: app.progress.unlocked,
        muted: app.audio.muted,
        level: g ? g.id : null,
        name: g ? g.def.name : null,
        status: g ? g.status : null,
        moves: g ? g.moves : 0,
        par: g ? g.par : 0,
        budget: g ? g.budget : 0,
        solved: g ? g.status === 'won' : false,
        gardensAwake: flow && g ? flow.litTargets : 0,
        gardensTotal: flow && g ? flow.totalTargets : 0,
        cursor: app.cursor ? { r: app.cursor.r, c: app.cursor.c } : null,
        board: g ? { rows: g.rows, cols: g.cols, ...app.layout } : null,
        tiles: g
          ? g.tiles.map((t, i) => ({
              r: t.r,
              c: t.c,
              kind: t.kind,
              locked: t.locked,
              ports: DIRS.filter((d) => t.mask & d.bit).map((d) => d.name).join(''),
              lit: !!flow?.lit[i],
              centerX: app.layout ? Math.round(app.layout.x + (t.c + 0.5) * app.layout.s) : null,
              centerY: app.layout ? Math.round(app.layout.y + (t.r + 0.5) * app.layout.s) : null,
            }))
          : [],
      };
      return deepFreeze(snapshot);
    },
  });
}
