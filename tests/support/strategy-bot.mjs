// A test-only keeper that plays expeditions through the same public rule functions the game's input uses.
// It is greedy: each hour it keeps taking the single action (place, flip, move, turn the well) whose
// previewed pulse looks best, then releases. Decisions are returned as plain descriptors so the UI test can
// perform the very same moves with mouse and keyboard. It exists to prove the campaign is winnable and fair
// across seeds; nothing like it ships in game/.
import { CELL_COUNT, cellX, cellY } from '../../game/src/rules/grid.js';
import { RELAY_ORDER, RELAYS } from '../../game/src/rules/relays.js';
import { SPECIES } from '../../game/src/rules/blooms.js';
import {
  previewPulse, placeRelay, flipMirror, liftRelay, turnWell, undoAction, releasePulse, enterWaystation,
  chooseBoon, buyRelay, mendHeart, setOut,
} from '../../game/src/rules/expedition.js';

function evaluate(run) {
  const { trace, responses } = previewPulse(run);
  let v = trace.crossed.size * 0.05;
  for (const b of run.blooms) {
    const sp = SPECIES[b.species];
    const r = responses.get(b.id);
    if (r === 'grow') v += 12 + b.growth * 4 + (b.growth + 1 >= sp.growth ? 10 : 0) + sp.value / 10;
    else if (r === 'sustain') v += 3;
    else v -= 8 + (b.patience <= 1 ? 40 : 0);
    if (r !== 'grow' && !sp.shade) {
      let d = 99;
      for (const c of trace.crossed) d = Math.min(d, Math.abs(cellX(c) - cellX(b.cell)) + Math.abs(cellY(c) - cellY(b.cell)));
      v -= d * 1.5;
    }
  }
  return v;
}

const free = (run, c) => run.board.terrain[c] === 'land' && !run.relays[c] && !run.blooms.some((b) => b.cell === c);

/** Every action worth considering, as descriptors. */
function candidates(run) {
  const out = [];
  for (let c = 0; c < CELL_COUNT; c++) {
    if (run.relays[c]?.type === 'mirror') out.push({ kind: 'flip', cell: c });
    if (!free(run, c)) continue;
    for (const type of RELAY_ORDER) {
      if (run.satchel[type] < 1) continue;
      out.push({ kind: 'place', cell: c, type, orient: 0 });
      if (RELAYS[type].rotatable) out.push({ kind: 'place', cell: c, type, orient: 1 });
    }
  }
  out.push({ kind: 'well' });
  for (let from = 0; from < CELL_COUNT; from++) {
    const r = run.relays[from];
    if (!r) continue;
    for (let c = 0; c < CELL_COUNT; c++) {
      if (c === from || !free(run, c)) continue;
      for (const orient of RELAYS[r.type].rotatable ? [0, 1] : [0]) out.push({ kind: 'move', from, cell: c, type: r.type, orient });
    }
  }
  return out;
}

/** Apply a descriptor with the rule functions; returns how many undo steps it took. */
export function applyAction(run, a) {
  if (a.kind === 'flip') return flipMirror(run, a.cell).ok ? 1 : 0;
  if (a.kind === 'place') return placeRelay(run, a.cell, a.type, a.orient).ok ? 1 : 0;
  if (a.kind === 'well') return turnWell(run).ok ? 1 : 0;
  if (a.kind === 'move') {
    if (!liftRelay(run, a.from).ok) return 0;
    if (!placeRelay(run, a.cell, a.type, a.orient).ok) return -1;
    return 2;
  }
  return 0;
}

/** The single best improving action this hour, or null when the keeper should release the pulse. */
export function chooseAction(run) {
  if (run.focus <= 0) return null;
  let best = null;
  let bestV = evaluate(run) + 0.5;
  for (const a of candidates(run)) {
    const steps = applyAction(run, a);
    if (steps === -1) {
      undoAction(run);
      continue;
    }
    if (steps === 0) continue;
    const v = evaluate(run);
    for (let i = 0; i < steps; i++) undoAction(run);
    if (v > bestV) {
      bestV = v;
      best = a;
    }
  }
  return best;
}

export function playHour(run) {
  for (let a = chooseAction(run); a; a = chooseAction(run)) applyAction(run, a);
  return releasePulse(run);
}

const BOON_PRIORITY = ['steady-hands', 'kindled-well', 'burning-glass', 'flawless-prisms', 'deep-roots', 'mending-rain', 'twin-aperture', 'anchored-frames', 'wide-halo', 'crystal-cache', 'dew-gatherers', 'chorus'];

/** Waystation decisions as descriptors: which boon index, which shop indices, whether to mend. */
export function planWaystation(run) {
  const w = run.waystation;
  const rank = (id) => BOON_PRIORITY.indexOf(id);
  const boon = w.boonOffers.map((id, i) => [rank(id), i]).sort((a, b) => a[0] - b[0])[0][1];
  const steps = [{ kind: 'boon', index: boon }];
  let dew = run.dew;
  const hearts = run.hearts + (w.boonOffers[boon] === 'mending-rain' ? 2 : 0);
  const maxHearts = run.maxHearts + (w.boonOffers[boon] === 'mending-rain' ? 1 : 0);
  if (Math.min(hearts, maxHearts) < maxHearts - 1 && dew >= 5) {
    steps.push({ kind: 'mend' });
    dew -= 5;
  }
  for (const want of ['prism', 'mirror', 'halo', 'lens']) {
    w.shop.forEach((o, i) => {
      if (o.type === want && !o.sold && dew >= o.price) {
        steps.push({ kind: 'buy', index: i });
        dew -= o.price;
      }
    });
  }
  return steps;
}

export function visitWaystation(run) {
  enterWaystation(run);
  for (const s of planWaystation(run)) {
    if (s.kind === 'boon') chooseBoon(run, s.index);
    if (s.kind === 'mend') mendHeart(run);
    if (s.kind === 'buy') buyRelay(run, s.index);
  }
  setOut(run);
}

/** Play a whole expedition greedily; returns the finished run. */
export function playExpedition(run, { maxPulses = 200 } = {}) {
  for (let i = 0; i < maxPulses; i++) {
    if (run.phase === 'plan') playHour(run);
    else if (run.phase === 'dusk') visitWaystation(run);
    else break;
  }
  return run;
}

/** A keeper who never acts: just releases pulses. Used to prove neglect loses. */
export function playIdle(run, { maxPulses = 200 } = {}) {
  for (let i = 0; i < maxPulses; i++) {
    if (run.phase === 'plan') releasePulse(run);
    else if (run.phase === 'dusk') {
      enterWaystation(run);
      setOut(run);
    } else break;
  }
  return run;
}
