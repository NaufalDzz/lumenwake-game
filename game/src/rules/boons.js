// Boons offered at the waystation between nights. Each one changes a real rule of the run, and several
// build on each other (Twin Aperture feeds more prisms; Burning Glass and Kindled Well reach the Dawnheart;
// Wide Halo makes lanterns a cluster engine; Chorus of Petals rewards harvesting many blooms in one pulse).

export const BOONS = [
  {
    id: 'twin-aperture',
    name: 'Twin Aperture',
    blurb: 'The well also shines out of its back.',
    apply: (run) => {
      run.mods.twinAperture = true;
    },
  },
  {
    id: 'kindled-well',
    name: 'Kindled Well',
    blurb: 'Well beams start 1 stronger.',
    apply: (run) => {
      run.mods.wellStrength += 1;
    },
  },
  {
    id: 'steady-hands',
    name: 'Steady Hands',
    blurb: '+1 focus every hour.',
    apply: (run) => {
      run.mods.focusPerHour += 1;
    },
  },
  {
    id: 'flawless-prisms',
    name: 'Flawless Prisms',
    blurb: 'Prisms split light without losing strength.',
    apply: (run) => {
      run.mods.prismLoss = 0;
    },
  },
  {
    id: 'wide-halo',
    name: 'Wide Halo',
    blurb: 'Halo lanterns also glow on diagonals. +1 Halo.',
    apply: (run) => {
      run.mods.haloReach = 8;
      run.satchel.halo += 1;
    },
  },
  {
    id: 'burning-glass',
    name: 'Burning Glass',
    blurb: 'Lenses add +2 strength instead of +1.',
    apply: (run) => {
      run.mods.lensGain = 2;
    },
  },
  {
    id: 'dew-gatherers',
    name: 'Dew Gatherers',
    blurb: 'Every harvest yields +1 dew.',
    apply: (run) => {
      run.mods.harvestDew += 1;
    },
  },
  {
    id: 'deep-roots',
    name: 'Deep Roots',
    blurb: 'New blooms have +1 patience.',
    apply: (run) => {
      run.mods.patienceBonus += 1;
    },
  },
  {
    id: 'anchored-frames',
    name: 'Anchored Frames',
    blurb: 'Gales and hail no longer move your relays.',
    apply: (run) => {
      run.mods.stormproof = true;
    },
  },
  {
    id: 'mending-rain',
    name: 'Mending Rain',
    blurb: '+1 max heart and restore 2 hearts.',
    apply: (run) => {
      run.maxHearts += 1;
      run.hearts = Math.min(run.maxHearts, run.hearts + 2);
    },
  },
  {
    id: 'chorus',
    name: 'Chorus of Petals',
    blurb: 'Each extra harvest in one pulse scores +50% (was +25%).',
    apply: (run) => {
      run.mods.chorusStep = 0.5;
    },
  },
  {
    id: 'crystal-cache',
    name: 'Crystal Cache',
    blurb: 'Gain 2 Mirrors, 1 Prism and 1 Lens.',
    repeatable: true,
    apply: (run) => {
      run.satchel.mirror += 2;
      run.satchel.prism += 1;
      run.satchel.lens += 1;
    },
  },
];

export const boonById = (id) => BOONS.find((b) => b.id === id);

/** Boons that may still be offered: unowned ones plus repeatable ones. */
export function availableBoons(owned) {
  return BOONS.filter((b) => b.repeatable || !owned.includes(b.id));
}
