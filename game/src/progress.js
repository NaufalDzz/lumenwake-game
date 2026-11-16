// Saved progress: which stages are open, each stage's best result and the mute choice.
// Uses localStorage when the browser allows it and quietly keeps everything in memory otherwise.

const KEY = 'lumenwake.progress.v1';

function blank() {
  return { unlocked: 1, best: {}, muted: false };
}

function storage() {
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

export function createProgress(levelCount) {
  const store = storage();
  let data = blank();
  if (store) {
    try {
      const parsed = JSON.parse(store.getItem(KEY) ?? 'null');
      if (parsed && typeof parsed === 'object') {
        data.unlocked = Math.min(levelCount, Math.max(1, Number(parsed.unlocked) || 1));
        data.best = parsed.best && typeof parsed.best === 'object' ? parsed.best : {};
        data.muted = !!parsed.muted;
      }
    } catch {
      data = blank();
    }
  }
  const save = () => {
    if (!store) return;
    try {
      store.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage full or blocked: progress stays for this session only */
    }
  };
  return {
    persistent: !!store,
    get unlocked() {
      return data.unlocked;
    },
    get muted() {
      return data.muted;
    },
    setMuted(value) {
      data.muted = !!value;
      save();
    },
    best(id) {
      return data.best[id] ?? null;
    },
    totalStars() {
      return Object.values(data.best).reduce((sum, b) => sum + (b.stars || 0), 0);
    },
    /** Record a win; returns true when it beats the previous best score for the stage. */
    recordWin(id, result) {
      const prev = data.best[id];
      const improved = !prev || result.score > prev.score;
      data.best[id] = {
        stars: Math.max(prev?.stars ?? 0, result.stars),
        score: Math.max(prev?.score ?? 0, result.score),
        moves: Math.min(prev?.moves ?? Infinity, result.moves),
      };
      data.unlocked = Math.min(levelCount, Math.max(data.unlocked, id + 1));
      save();
      return improved;
    },
  };
}
