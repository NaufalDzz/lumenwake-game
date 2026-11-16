// Read-only inspection hook for browser play-tests: `window.lumenwake` returns a frozen snapshot of the
// screen, HUD values, run state, board cell centres and every interactive hitbox (in world pixels and in
// client pixels). It exposes no functions and no solutions, so it can observe but never alter the game;
// mouse and keyboard remain the only way to play.

import { CELL_COUNT, cellX, cellY } from '../rules/grid.js';
import { cellCenter } from '../render/layout.js';
import { SPECIES } from '../rules/blooms.js';
import { wellDirections } from '../rules/expedition.js';
import { describeStorm } from '../rules/storms.js';

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
      const run = app.run;
      const rect = app.canvas.getBoundingClientRect();
      const sx = rect.width / 1280;
      const sy = rect.height / 720;
      const client = (x, y) => ({ clientX: Math.round(rect.left + x * sx), clientY: Math.round(rect.top + y * sy) });
      const where = (i) => {
        const c = cellCenter(i);
        return { x: Math.round(c.x), y: Math.round(c.y), ...client(c.x, c.y) };
      };
      const preview = app.preview;
      const snap = {
        screen: app.screen,
        view: app.view,
        overlay: app.overlay,
        animating: !!app.pulseAnim,
        muted: app.audio.muted,
        settings: { ...app.settings },
        setup: { ...app.setup },
        selection: app.selection,
        ghostOrient: app.ghostOrient,
        cursor: app.cursor,
        message: app.message?.text ?? null,
        focusId: app.focusId,
        hitboxes: app.hit.list.map((b) => ({ id: b.id, label: b.label, enabled: b.enabled !== false, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h), ...client(b.x + b.w / 2, b.y + b.h / 2) })),
        records: { runs: app.records.data.runs, wins: app.records.data.wins, best: { ...app.records.data.best }, persistent: app.records.persistent },
        run: run
          ? {
              seed: run.seed,
              difficulty: run.difficulty,
              phase: run.phase,
              night: run.night + 1,
              hour: run.hour + 1,
              hours: run.hours,
              island: run.board.island,
              hearts: run.hearts,
              maxHearts: run.maxHearts,
              dew: run.dew,
              score: run.score,
              focus: run.focus,
              satchel: { ...run.satchel },
              boons: [...run.boons],
              forecast: run.forecast ? { kind: run.forecast.kind, text: describeStorm(run.forecast), cells: [...run.forecast.cells] } : null,
              well: { cell: run.board.wellIndex, dirs: wellDirections(run), strength: run.mods.wellStrength, ...where(run.board.wellIndex) },
              cells: Array.from({ length: CELL_COUNT }, (_, i) => ({ i, col: cellX(i), row: cellY(i), terrain: run.board.terrain[i], ...where(i) })),
              relays: run.relays.map((r, i) => (r ? { cell: i, type: r.type, orient: r.orient, ...where(i) } : null)).filter(Boolean),
              blooms: run.blooms.map((b) => ({ id: b.id, species: b.species, name: SPECIES[b.species].name, cell: b.cell, growth: b.growth, growthNeeded: SPECIES[b.species].growth, patience: b.patience, nextPulse: preview?.responses.get(b.id) ?? null, ...where(b.cell) })),
              clouds: run.clouds.map((c) => ({ cell: c.cell, pulses: c.pulses })),
              canUndo: run.history.length > 0,
              waystation: run.waystation ? { boonOffers: [...run.waystation.boonOffers], boonTaken: run.waystation.boonTaken, shop: run.waystation.shop.map((o) => ({ ...o })), mended: run.waystation.mended } : null,
              stats: JSON.parse(JSON.stringify(run.stats)),
              lastPulse: run.lastPulse ? { harvested: run.lastPulse.harvested.length, withered: run.lastPulse.withered.length, chorus: run.lastPulse.chorus, storm: run.lastPulse.storm?.kind ?? null } : null,
            }
          : null,
      };
      return deepFreeze(snap);
    },
  });
}
