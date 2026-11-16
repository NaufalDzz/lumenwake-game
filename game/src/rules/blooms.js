// Bloom species of the sky gardens and how each one answers the light of a pulse.
// Every pulse a bloom either grows (its need was met), is sustained (some light, not enough; no harm),
// or wilts (it loses one patience; at zero it withers and the keeper loses a heart).

import { totalLight, distinctSources } from './light-trace.js';

export const SPECIES = {
  dawnpetal: {
    id: 'dawnpetal',
    name: 'Dawnpetal',
    need: 'Any light',
    thirst: 1,
    growth: 2,
    patience: 3,
    value: 10,
    dew: 1,
  },
  moonlily: {
    id: 'moonlily',
    name: 'Moonlily',
    need: 'Light of strength 3+',
    thirst: 3,
    growth: 3,
    patience: 4,
    value: 30,
    dew: 2,
  },
  twinbell: {
    id: 'twinbell',
    name: 'Twinbell',
    need: 'Light from two sides',
    thirst: 1,
    sources: 2,
    growth: 2,
    patience: 4,
    value: 35,
    dew: 2,
  },
  shadecap: {
    id: 'shadecap',
    name: 'Shadecap',
    need: 'Darkness: keep beams off it',
    thirst: 0,
    shade: true,
    growth: 2,
    patience: 2,
    value: 20,
    dew: 1,
  },
  dawnheart: {
    id: 'dawnheart',
    name: 'Dawnheart',
    need: 'Light of strength 5+',
    thirst: 5,
    growth: 3,
    patience: 5,
    value: 120,
    dew: 0,
  },
};

/** 'grow' | 'sustain' | 'wilt' for one bloom under one traced pulse of light. */
export function bloomResponse(bloom, trace) {
  const sp = SPECIES[bloom.species];
  const total = totalLight(trace, bloom.cell);
  if (sp.shade) return total === 0 ? 'grow' : 'wilt';
  if (total === 0) return 'wilt';
  const sourcesMet = !sp.sources || distinctSources(trace, bloom.cell) >= sp.sources;
  return total >= sp.thirst && sourcesMet ? 'grow' : 'sustain';
}

/** A fresh bloom as it sprouts. `patienceBonus` comes from boons and difficulty. */
export function sproutBloom(id, species, cell, patienceBonus = 0) {
  return { id, species, cell, growth: 0, patience: SPECIES[species].patience + patienceBonus, age: 0 };
}
