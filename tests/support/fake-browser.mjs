// A minimal stand-in browser for Node tests: a canvas whose 2D context records draw calls (and throws on
// non-finite numbers, catching NaN layout bugs), window/document listeners, requestAnimationFrame driven
// by hand, a fake clock and an in-memory (or blocked) localStorage. Tests then load the real
// game/src/app/main.js and play it only through synthetic mouse and keyboard events.

export const stats = { drawCalls: 0, texts: [] };

function fakeContext() {
  const state = {};
  return new Proxy(state, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => ({ addColorStop() {} });
      if (prop === 'measureText') return (text) => ({ width: String(text).length * 8 });
      return (...args) => {
        stats.drawCalls++;
        if (prop === 'fillText') stats.texts.push(String(args[0]));
        for (const a of args) {
          if (typeof a === 'number' && !Number.isFinite(a)) throw new Error(`non-finite argument to ${String(prop)}`);
        }
      };
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
    has() {
      return true;
    },
  });
}

function fakeCanvas() {
  const listeners = {};
  return {
    width: 300,
    height: 150,
    style: {},
    listeners,
    getContext: () => fakeContext(),
    addEventListener: (type, fn) => {
      (listeners[type] ??= []).push(fn);
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
    focus() {},
  };
}

export function installBrowser({ blockedStorage = false } = {}) {
  const canvas = fakeCanvas();
  const windowListeners = {};
  let rafCallback = null;
  let clock = 0;
  const store = new Map();
  globalThis.window = globalThis;
  globalThis.innerWidth = 1280;
  globalThis.innerHeight = 720;
  globalThis.devicePixelRatio = 1;
  globalThis.addEventListener = (type, fn) => {
    (windowListeners[type] ??= []).push(fn);
  };
  globalThis.document = { getElementById: () => canvas, createElement: () => fakeCanvas() };
  globalThis.requestAnimationFrame = (fn) => {
    rafCallback = fn;
  };
  const storage = blockedStorage
    ? { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } }
    : { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  globalThis.performance.now = () => clock;

  const frames = (n = 1, ms = 33) => {
    for (let i = 0; i < n; i++) {
      clock += ms;
      const cb = rafCallback;
      rafCallback = null;
      cb?.(clock);
    }
  };
  const key = (k, shiftKey = false) => {
    let prevented = false;
    for (const fn of windowListeners.keydown ?? []) fn({ key: k, shiftKey, altKey: false, ctrlKey: false, metaKey: false, preventDefault() { prevented = true; } });
    frames(1);
    return prevented;
  };
  const mouse = (type, x, y, button = 0) => {
    for (const fn of canvas.listeners[type] ?? []) fn({ clientX: x, clientY: y, button, shiftKey: false, deltaY: 1, preventDefault() {} });
  };
  const click = (x, y, button = 0) => {
    mouse('mousemove', x, y);
    mouse('mousedown', x, y, button);
    frames(1);
  };
  const snap = () => globalThis.lumenwake;
  /** Click the centre of a hitbox found by id in the read-only snapshot. */
  const press = (id) => {
    const box = snap().hitboxes.find((b) => b.id === id);
    if (!box) throw new Error(`no hitbox ${id} on ${snap().view}: ${snap().hitboxes.map((b) => b.id).join(',')}`);
    click(box.clientX, box.clientY);
    return box;
  };
  /** Wait out the pulse animation. */
  const settle = () => {
    for (let i = 0; i < 80 && snap().animating; i++) frames(1);
    frames(2);
  };
  return { canvas, store, frames, key, click, mouse, snap, press, settle };
}
