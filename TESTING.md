# LUMENWAKE testing

## Automated (Node 22, built-ins only)

```sh
node --test 'tests/*.test.mjs'
```

- `tests/puzzle.test.mjs`: port rotation, reciprocal connectivity, source/garden behaviour, branches, locked
  tiles, tide spending, undo/reset, tide-out loss and retry, scoring, deterministic scrambles, and every stage
  solved from its scramble by a known legal turn sequence within budget.
- `tests/ui-smoke.test.mjs`: loads the real `game/src/main.js` against a stub canvas/DOM and plays only through
  synthetic mouse and keyboard events: title → stage 1 (keyboard turn, undo, reset, refused lighthouse click,
  mouse solve) → win overlay → next stage → tide-out → retry → pause/how-to/stage select → all 12 stages →
  campaign finale → play again → mute persisted.

## Browser smoke test (desktop Chrome, 1280×720 viewport)

Start the server with `node serve.ts` and open `http://127.0.0.1:8096/`. For a clean run, clear the site's
local storage first. Coordinates below are canvas coordinates at a 1280×720 viewport (the canvas fills it).
`L(x,y)` = left click, `R(x,y)` = right click. `window.lumenwake` (read-only) shows screen, level, moves,
status and each tile's `centerX/centerY` if the viewport differs.

1. **Title.** Expect the LUMENWAKE wordmark, a glowing preview of stage 6 on the left, menu panel on the right
   with "Begin the Wake" focused (mint dashed ring). Press `ArrowDown` twice: focus moves to "How to Play".
   Press `Enter`: the How to Play sheet opens. Press `Esc`: back to title.
2. **Start.** Click "Begin the Wake" (≈ 980, 342). Stage 1 "First Light" loads; HUD shows TURNS 0, par 7,
   TIDE 13 left, GARDENS 0/1; right panel shows objective, tide, star thresholds, keeper's note, controls.
3. **Keyboard + undo/reset.** Press `ArrowRight`, then `Space`: the selected tile turns with a pop, TURNS 1.
   Press `Z`: it turns back, TURNS 0. Press `Space`, then `R`: toast "Canals reset", TURNS 0.
4. **Fixed tiles.** Click the lighthouse L(206,274): it shakes, a stone knock plays, toast explains, TURNS stays 0.
5. **Win stage 1 by mouse (par 7):** L(324,274) R(442,274) R(324,392) R(442,392) R(324,510) L(442,510) L(560,510).
   Light ripples outward from the lighthouse, the garden blooms, then "The Gardens Wake" appears with 3 stars,
   Turns 7 (par 7), Tide left 6, score and best. *(Screenshot candidate: results.)*
6. **Next.** Press `Enter`: Stage 2 "Twin Gardens" (par 6, tide 10).
7. **Lose.** Shift-click a decoy canal in the bottom-left loop, e.g. L(324,569) with Shift held, ten times.
   The tide bar drains and turns coral; at 0 left the "The Tide Has Ebbed" card shows gardens awake and turns.
   *(Screenshot candidate: loss screen.)* Press `R`: the stage restarts with full tide.
8. **Win stage 2 (par 6):** R(324,333) L(442,333) L(560,333) L(560,333) L(560,451) L(560,569). Both gardens bloom.
9. **Pause.** On stage 3 press `Esc`: Paused menu. `Esc` again resumes. Click "Menu" in the header (≈ 1112, 32)
   then "Stage Select": cleared stages show gold thumbnails and stars; stage 4+ show "Locked". Press `Esc`.
10. **Sound.** After the first click, a soft pad and bells play; press `M` (header button reads "Muted"), press
    `M` again to restore. Reload the page: stage unlocks, stars and the mute choice persist.
11. **Mid-game screenshot.** Stage 7 "Tidepool Weave" (needs stages 1–6 cleared) is the richest mid-game view:
    play about half of its sequence so two of four gardens are lit and the HUD shows turns/tide in progress.
    Its par sequence (25 turns):
    L(346,150) L(443,150) L(540,150) R(637,150) L(152,247) L(346,247) R(443,247) L(540,247) R(152,344)
    L(249,344) L(346,344) L(346,344) L(443,344) L(540,344) L(540,344) L(637,344) L(637,344) L(249,441)
    L(249,441) L(540,441) R(637,441) L(249,538) L(443,538) R(637,538) L(443,635).
12. **Campaign end.** Clearing stage 12 shows "See the Dawn"; it opens the finale with total stars, total best
    score, per-stage stars and "Play Again from Stage 1", which restarts the campaign at stage 1.

## Screenshots still to take (by the parent, in the real browser)

3 or 4 genuine 1280×720 PNG/JPEG captures (each ≤ 256 KiB) saved to `screenshots/`, first by name = cover:
`1-title.png` (title), `2-play.png` (stage in progress with HUD), `3-win.png` (results card), optionally
`4-tide-out.png` or the finale. Then run `MAKEFUN_OUTPUT_DIR=/tmp/lumenwake-out node main.ts`.
