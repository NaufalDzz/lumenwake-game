// Short contextual guidance shown on the message line while no fresher message is up. The first night
// teaches the core loop step by step; later nights introduce each new bloom and storm when it first shows.

import { SPECIES } from '../rules/blooms.js';
import { RELAYS } from '../rules/relays.js';

export function tutorialHint(run, selection) {
  if (run.phase !== 'plan') return null;
  const kinds = new Set(run.blooms.map((b) => b.species));
  if (run.night === 0 && run.hour === 0) {
    if (run.stats.relaysPlaced === 0) return 'Bloom badges ▼ mean they will wilt. Pick a Mirror (1), then click a cell on the beam to bend light toward a Dawnpetal.';
    return 'Badges ▲ show which blooms the next pulse will grow. When it looks right, Release Pulse (Space).';
  }
  if (run.night === 0 && run.hour === 1) return 'Prisms (2) split a beam to feed two blooms at once. Right-click lifts a relay back for free.';
  if (run.forecast && run.night <= 2 && run.forecast.kind === 'gale') return 'A gale will flip every mirror in the lit lane before the light flows. Flip one now to ride the wind.';
  if (kinds.has('dawnheart')) return 'The Dawnheart needs strength 5: stack Lenses, or join two beams on it. Keep it fed while the rest of the garden grows.';
  if (kinds.has('shadecap') && run.night <= 3) return 'Shadecaps grow only in darkness. They sprout on lit cells, so steer the beam away.';
  if (kinds.has('twinbell') && run.night <= 3) return 'Twinbells need light from two different sides: split with a Prism and bring both halves in.';
  if (kinds.has('moonlily') && run.night <= 2) return 'Moonlilies need strength 3. Prism halves are weaker; a Lens (+1) restores them.';
  return `${RELAYS[selection]?.name ?? 'Relay'}: ${RELAYS[selection]?.blurb ?? ''}  ·  Wheel or F flips a mirror before placing.`;
}

export function lossTip(run) {
  const tips = [
    'Tip: a Prism lets one beam feed two blooms; follow it with a Lens to keep both strong.',
    'Tip: banked focus carries into the next hour (up to +2). Save some before storm-heavy hours.',
    'Tip: lifting a relay is free. Move your network toward new sprouts instead of building new arms.',
    'Tip: a Gale flips mirrors before the light flows; pre-flip a mirror so the wind sets it right.',
    'Tip: Deep Roots and Mending Rain buy time when the garden grows faster than your network.',
  ];
  return tips[(run.seed + run.night) % tips.length];
}

export const speciesName = (id) => SPECIES[id]?.name ?? id;
