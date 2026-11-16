# lumenwake-game

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/NaufalDzz/lumenwake-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/NaufalDzz/lumenwake-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**LUMENWAKE** is a luminous canal-routing puzzle set on a floating archipelago at blue hour. Turn carved canal
tiles so the golden glow of a lighthouse flows through matching openings to every sleeping garden. Each garden
blooms as the light reaches it; wake them all before the tide runs out. Entered in make.fun's
[Make the best game](https://make.fun/bounty/best-game-01) bounty.

It runs offline in a desktop browser from plain static files: no build step, no libraries, no downloaded assets
and no network requests. All art is drawn procedurally on a canvas and all music and sound is synthesized with
Web Audio after your first click or key press.

## How to play

- **Goal:** route light from the lighthouse to every garden at once. Light passes between two neighbouring tiles
  only when both open toward each other. Branch tiles split the stream; pools join all four sides.
- **Turn a canal:** click it (clockwise), or right-click / Shift-click (counter-clockwise).
- **Keyboard:** arrows or WASD move the mint selection, Space/Enter turns clockwise, Q or Shift+Space turns back,
  Z undoes, R resets the stage, Esc opens the menu, M toggles sound. In menus, arrows/Tab move focus and Enter selects.
- **Tide:** every turn spends one unit of tide. Undo returns a turn, but if the tide runs out before every garden
  wakes, the stage is lost and you retry from the same deterministic scramble.
- **Stars and score:** match the stage's par for three stars; unused tide adds to the score. Mossy stone canals
  never turn and act as clues.
- **Campaign:** 12 handcrafted stages, from a single garden to five-garden deltas, spirals and loops. Clearing a
  stage unlocks the next; unlocks, best results and the mute choice are saved in `localStorage` (the game still
  plays if storage is blocked). Clearing stage 12 shows the campaign results with a restart.

## Run it

```sh
node serve.ts    # then open http://127.0.0.1:8096/ in desktop Chrome
```

Other commands (Node 22.18 or later, nothing to install):

```sh
node --test 'tests/*.test.mjs'                       # rule tests + headless UI smoke test
MAKEFUN_OUTPUT_DIR=/tmp/lumenwake-out node main.ts   # hand-in: copies game/ + screenshots/, writes dossier.json
```

## Layout

| Path | Job |
| --- | --- |
| `game/index.html`, `game/style.css` | page shell and letterboxed 1280×720 canvas |
| `game/src/puzzle.js` | rules: ports, rotation, light reachability, tide budget, undo/reset, win/loss, score |
| `game/src/levels.js` | the 12 handcrafted stages, written as solved layouts |
| `game/src/board-view.js`, `tile-art.js`, `scenery.js`, `ui.js` | canvas rendering and procedural art |
| `game/src/screens.js` | HUD, side panel, title, stage select, how-to, pause, results, finale |
| `game/src/audio.js` | procedural Web Audio music and sound effects |
| `game/src/input.js`, `main.js` | mouse/keyboard input and the screen flow controller |
| `game/src/progress.js`, `debug.js` | saved progress; read-only `window.lumenwake` state snapshot for testing |
| `main.ts`, `vendor/makefun-game.ts` | hand-in program and the kit's unchanged dossier library |
| `serve.ts` | loopback static server for play-testing |
| `tests/` | Node built-in tests |

Licensed under the MIT License (see `LICENSE`).

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
