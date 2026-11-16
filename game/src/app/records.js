// Keeper records and settings: best score per difficulty, runs and wins, furthest night, blooms
// harvested, last setup, and the sound/contrast/motion choices. Uses localStorage when the browser allows
// it and quietly keeps everything in memory otherwise.

const KEY = 'lumenwake.records.v2';

function blank() {
  return {
    best: {},
    runs: 0,
    wins: 0,
    deepestNight: 0,
    harvested: 0,
    lastDifficulty: 'wayfarer',
    settings: { muted: false, contrast: false, reduceMotion: false },
    seenGuide: false,
  };
}

function openStorage() {
  try {
    const s = globalThis.localStorage;
    const probe = '__lumenwake_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function createRecords() {
  const store = openStorage();
  const data = blank();
  if (store) {
    try {
      const parsed = JSON.parse(store.getItem(KEY) ?? 'null');
      if (parsed && typeof parsed === 'object') {
        data.best = parsed.best && typeof parsed.best === 'object' ? parsed.best : {};
        for (const k of ['runs', 'wins', 'deepestNight', 'harvested']) data[k] = Math.max(0, Number(parsed[k]) || 0);
        if (typeof parsed.lastDifficulty === 'string') data.lastDifficulty = parsed.lastDifficulty;
        Object.assign(data.settings, parsed.settings ?? {});
        data.seenGuide = !!parsed.seenGuide;
      }
    } catch {
      /* corrupt record: start fresh */
    }
  }
  const save = () => {
    if (!store) return;
    try {
      store.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage full or blocked: records stay for this visit only */
    }
  };
  return {
    persistent: !!store,
    data,
    save,
    bestFor(difficulty) {
      return data.best[difficulty] ?? 0;
    },
    setSetting(name, value) {
      data.settings[name] = value;
      save();
    },
    /** Record a finished run; returns { newBest, previousBest }. */
    recordRun(run) {
      const previousBest = data.best[run.difficulty] ?? 0;
      const newBest = run.score > previousBest;
      if (newBest) data.best[run.difficulty] = run.score;
      data.runs += 1;
      if (run.phase === 'won') data.wins += 1;
      data.deepestNight = Math.max(data.deepestNight, run.stats.nightsCleared + (run.phase === 'won' ? 0 : 1));
      data.harvested += run.stats.harvested;
      data.lastDifficulty = run.difficulty;
      save();
      return { newBest, previousBest };
    },
  };
}
