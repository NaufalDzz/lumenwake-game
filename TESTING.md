# LUMENWAKE testing

## Automated (Node 22, built-ins only)

```sh
node --test 'tests/*.test.mjs'
```

There are 44 tests, and the whole suite takes about 13 s.

- `tests/rules.test.mjs` covers the pure rules:
  - beam tracing through each relay: mirror orientations, prism split and loss, lens gain, halo glow on 4 or 8 cells, blockers, loop termination, two-source detection
  - every species' need
  - seeded island generation and the 7-night campaign plan
  - deterministic replay
  - placement refusals and their reasons
  - focus costs, free lifting, undo refunds and focus carry
  - preview equals the real pulse
  - harvest score and dew, chorus multiplier, withering hearts, loss at 0 hearts
  - each storm (gale, hail, cloudbank, eclipse), including Anchored Frames
  - waystation transactions: buy, sold out, can't afford, mend once, one boon, skip-for-dew, set out
  - relays returning to the satchel on a new island
  - the effect of every one of the 12 boons
  - difficulty settings
- `tests/balance.test.mjs` uses a test-only greedy keeper (`tests/support/strategy-bot.mjs`, never shipped). It checks that:
  - every Breeze seed tried is won
  - at least 4 of 6 Wayfarer seeds are won, each with a real harvest, at least 3 boons and no more than 45 pulses
  - idle play loses on every difficulty
  - Stormcaller is harder than Wayfarer
  - the same seed with the same play gives the same score
  - victory means surviving all seven nights: seed 1 is won without the Dawnheart, and the results subtitle only claims it bloomed when one was harvested (seed 15838)
- `tests/ui-flow.test.mjs` loads the real `game/src/app/main.js` in a stand-in browser (`tests/support/fake-browser.mjs`, where any non-finite draw argument throws). It plays only through synthetic mouse clicks and keys:
  - title: seed step/shuffle, difficulty → Breeze, Tab focus
  - the guide on the first run
  - undo
  - a **complete winning expedition**: about 80 placements, moves, flips and well turns, by mouse and by arrow-key cursor
  - pulses, dusk, and waystation boons/shop by click and by number keys
  - victory results, persisted records
  - retry the seed (`R`), then lose by neglect
  - new run, the pause menu, mute, contrast, abandoning to the title
  - the read-only snapshot

  A shadow run driven through the pure rules is compared to the on-screen state after every step.
- `tests/ui-storage.test.mjs` runs with `localStorage` throwing. It sets contrast and reduced motion, plays a Stormcaller run to a loss, and checks that records persist for the session and nothing is written.

## Browser check (desktop Chrome, 1280×720 viewport)

Start the server with `node serve.ts` (port 8096) or `PORT=8097 node serve.ts`, then open `http://127.0.0.1:8097/`.

All coordinates below are canvas pixels at a 1280×720 viewport. If the viewport differs, read `window.lumenwake` in the console. It is read-only and lists every hitbox with `clientX/clientY`, every board cell's centre, and the run state: phase, night, hour, hearts, dew, score, focus, satchel, blooms with their `nextPulse` response, and the forecast.

A board cell at column A–J and row 1–7 has its centre at **x = 69 + 70·col, y = 117 + 70·row**, with col and row counted from 0. For example, C4 is at (209, 327).

1. **Title.** Check:
   - the LUMENWAKE wordmark
   - a lit showcase island
   - Begin Expedition at (274, 259)
   - difficulty arrows at (96, 347) and (452, 347)
   - seed − at (96, 428), seed + at (336, 428), Shuffle at (421, 428)
   - Guide, Sound, Contrast and Motion buttons
   - the records panel

   `Tab` moves focus and `Enter` starts the run.
2. **Start.** The first run opens the guide. Close it with `Esc`. The HUD shows:
   - night 1 / 7, hour, hearts, dew, score
   - the island board with the well and two Dawnpetals marked ▼ (will wilt)
   - the side panel: next pulse, garden ledger, focus diamonds, Undo, and the big Release Pulse at (1074, 650)
   - the tray: Mirror, Prism, Lens, Halo, Turn Well at (668, 654)
3. **Play.** Hover a cell on the beam with the Mirror selected. A ghost relay and its preview beam show where light would go, and the badges update. Click to place it. Click the mirror again to flip it, right-click to lift it (free), and press `Z` to undo. Press `Space` to pulse: beams surge, blooms grow, and harvested blooms burst with floating score.
4. **Night end.** After the last hour the dusk summary shows harvests, bonus and dew. "To the Waystation" is at (640, 569).
5. **Waystation.**
   - Boon cards at (240, 236), (640, 236) and (1040, 236), or keys `1`–`3`.
   - Skip for dew at (180, 358).
   - Shop at (151, 518), (331, 518) and (511, 518), or keys `4`–`6`.
   - Mend at (701, 518), or key `7`.
   - Set out at (1030, 674).
6. **Storms.** From night 2, forecast cells are outlined with a storm icon, and the side panel names the storm. The preview badges already include its effect.
7. **End.** Either outcome shows the results screen, with New Expedition, Retry Seed and Title buttons:
   - Win all seven nights: "Dawn Breaks over Stormcrown".
   - Lose every heart: "The Gardens Fall Dark".
8. **Pause, sound and access.** `Esc` opens the menu (resume, guide, sound, contrast, motion, abandon). `M` toggles sound. Reload the page and check that records and settings persist.

## Screenshots still to take (by the parent, in the real browser)

The old canal-puzzle images in `screenshots/` must be replaced. Take 4 genuine 1280×720 captures of the canvas. Save them as JPEG (quality about 85 keeps each well under 256 KiB) in `screenshots/`. The first file by name becomes the cover.

1. `1-gameplay.jpg` (cover). Take it mid-run on night 3–5 (Mistveil or Stormcrown), when several blooms of different species are on the board, at least one prism split is lit and a storm forecast is showing. Before capturing, hover a free cell with a relay selected so the ghost preview is visible.
2. `2-title.jpg`: the title screen with the records panel. Records are filled in after the first run.
3. `3-waystation.jpg`: the waystation after any night, showing three boon cards, the shop and the satchel.
4. `4-results.jpg`: the victory results after winning a run (Breeze is the gentlest), with the New Expedition / Retry Seed buttons. If no win is reached, the loss results screen also shows the restart.

Then run `MAKEFUN_OUTPUT_DIR=/tmp/lumenwake-out node main.ts`.
