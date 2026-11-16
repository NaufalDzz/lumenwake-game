// Procedural Web Audio for LUMENWAKE: a slow dusk pad with drifting glass bells that changes chord set
// per island, and synthesized cues for every keeper action, growth, harvest chords that climb with the
// chorus, withering, storms and the end of an expedition. Nothing starts until the first user gesture
// (browsers require it) and every sound respects mute.

const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21]; // major pentatonic over two octaves
const ISLAND_CHORDS = [
  [[50, 57, 62, 66], [47, 54, 59, 62], [43, 50, 55, 59], [45, 52, 57, 61]], // Verdant: D major drift
  [[48, 55, 60, 64], [45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 62]], // Mistveil: C, airy
  [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59], [40, 47, 52, 55]], // Stormcrown: A minor
];

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicBus = null;
  let sfxBus = null;
  let verb = null;
  let muted = false;
  let musicTimer = 0;
  let chordIndex = 0;
  let island = 0;

  function impulse(seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return buf;
  }

  function start() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.8;
    master.connect(ctx.destination);
    verb = ctx.createConvolver();
    verb.buffer = impulse(3.2);
    const verbGain = ctx.createGain();
    verbGain.gain.value = 0.45;
    verb.connect(verbGain).connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.32;
    musicBus.connect(master);
    musicBus.connect(verb);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.7;
    sfxBus.connect(master);
    sfxBus.connect(verb);
    scheduleMusic();
  }

  function voice(bus, { freq, type = 'sine', at = 0, dur = 0.4, gain = 0.2, attack = 0.01, slide = 0, cutoff = 0 }) {
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (cutoff) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = cutoff;
      osc.connect(lp);
      node = lp;
    }
    node.connect(amp).connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function noise({ at = 0, dur = 0.12, gain = 0.15, freq = 1200, q = 1.5 }) {
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = q;
    const amp = ctx.createGain();
    amp.gain.value = gain;
    src.connect(bp).connect(amp).connect(sfxBus);
    src.start(t);
  }

  // Generative score: a new pad chord every bar with two or three soft bells placed over it.
  function scheduleMusic() {
    const bar = 4.8;
    const play = () => {
      if (!ctx) return;
      const set = ISLAND_CHORDS[island] ?? ISLAND_CHORDS[0];
      const chord = set[chordIndex++ % set.length];
      for (const m of chord) {
        voice(musicBus, { freq: midiHz(m - 12), type: 'triangle', dur: bar + 1.2, gain: 0.05, attack: 1.4, cutoff: 900 });
        voice(musicBus, { freq: midiHz(m) * 1.003, type: 'sine', dur: bar + 1, gain: 0.035, attack: 1.8 });
      }
      const root = chord[0] + 12;
      const bells = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < bells; i++) {
        const step = SCALE[Math.floor(Math.random() * SCALE.length)];
        voice(musicBus, { freq: midiHz(root + step), at: 0.6 + Math.random() * (bar - 1.2), dur: 2.2, gain: 0.05, attack: 0.005 });
      }
    };
    play();
    musicTimer = setInterval(play, bar * 1000);
  }

  return {
    start,
    get muted() {
      return muted;
    },
    setMuted(value) {
      muted = !!value;
      if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.08);
    },
    setIsland(i) {
      island = i;
    },
    place(type) {
      const base = { mirror: 520, prism: 660, lens: 440, halo: 392 }[type] ?? 520;
      noise({ dur: 0.06, gain: 0.1, freq: 2600, q: 3 });
      voice(sfxBus, { freq: base, dur: 0.18, gain: 0.08, type: 'triangle', slide: 1.2 });
      voice(sfxBus, { freq: base * 1.5, at: 0.05, dur: 0.4, gain: 0.04 });
    },
    flip() {
      noise({ dur: 0.07, gain: 0.12, freq: 2200, q: 3 });
      voice(sfxBus, { freq: 600, dur: 0.12, gain: 0.07, type: 'triangle', slide: 1.3 });
    },
    lift() {
      voice(sfxBus, { freq: 500, dur: 0.16, gain: 0.06, type: 'triangle', slide: 0.7 });
    },
    well() {
      voice(sfxBus, { freq: 220, dur: 0.4, gain: 0.1, type: 'sine', slide: 1.5 });
      noise({ dur: 0.2, gain: 0.08, freq: 900, q: 1 });
    },
    deny() {
      voice(sfxBus, { freq: 180, dur: 0.16, gain: 0.08, type: 'square', cutoff: 700 });
    },
    pulse() {
      noise({ dur: 0.5, gain: 0.12, freq: 1400, q: 0.8 });
      voice(sfxBus, { freq: 196, dur: 0.9, gain: 0.08, type: 'sine', slide: 2 });
    },
    grow(i = 0) {
      voice(sfxBus, { freq: midiHz(74 + SCALE[i % SCALE.length]), at: 0.35 + i * 0.06, dur: 0.6, gain: 0.05 });
    },
    harvest(chorus) {
      const base = 74 + Math.min(chorus, 5) * 2;
      [0, 4, 7, 12, 16].slice(0, 3 + Math.min(2, chorus - 1)).forEach((s, i) => voice(sfxBus, { freq: midiHz(base + s), at: 0.45 + i * 0.07, dur: 1.2, gain: 0.07 }));
    },
    wither() {
      [62, 58, 55].forEach((m, i) => voice(sfxBus, { freq: midiHz(m), at: 0.4 + i * 0.12, dur: 0.7, gain: 0.08, type: 'triangle', cutoff: 1200 }));
      voice(sfxBus, { freq: 90, at: 0.4, dur: 0.5, gain: 0.14, slide: 0.6 });
    },
    storm(kind) {
      if (kind === 'gale') noise({ dur: 0.9, gain: 0.16, freq: 600, q: 0.6 });
      if (kind === 'hail') for (let i = 0; i < 8; i++) noise({ at: i * 0.05, dur: 0.04, gain: 0.12, freq: 3200, q: 4 });
      if (kind === 'cloud') noise({ dur: 1.2, gain: 0.08, freq: 300, q: 0.5 });
      if (kind === 'eclipse') voice(sfxBus, { freq: 110, dur: 1.2, gain: 0.12, type: 'sine', slide: 0.5 });
    },
    ui() {
      voice(sfxBus, { freq: 880, dur: 0.08, gain: 0.05, type: 'sine' });
    },
    undo() {
      voice(sfxBus, { freq: 660, dur: 0.16, gain: 0.06, type: 'triangle', slide: 0.7 });
    },
    buy() {
      [76, 83].forEach((m, i) => voice(sfxBus, { freq: midiHz(m), at: i * 0.07, dur: 0.5, gain: 0.07 }));
    },
    boon() {
      [69, 73, 76, 81].forEach((m, i) => voice(sfxBus, { freq: midiHz(m), at: i * 0.08, dur: 1.2, gain: 0.07 }));
    },
    dawn() {
      [62, 66, 69, 74].forEach((m, i) => voice(sfxBus, { freq: midiHz(m), at: i * 0.12, dur: 1.6, gain: 0.07 }));
    },
    win() {
      const notes = [62, 66, 69, 74, 78, 81, 86];
      notes.forEach((m, i) => voice(sfxBus, { freq: midiHz(m), at: i * 0.11, dur: 1.8, gain: 0.08 }));
      voice(sfxBus, { freq: midiHz(50), dur: 3, gain: 0.08, type: 'triangle', attack: 0.3, cutoff: 700 });
    },
    lose() {
      [69, 65, 62, 57].forEach((m, i) => voice(sfxBus, { freq: midiHz(m), at: i * 0.18, dur: 0.9, gain: 0.07, type: 'triangle', cutoff: 1400 }));
    },
    stop() {
      clearInterval(musicTimer);
    },
  };
}
