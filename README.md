# lumenwake-game

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/NaufalDzz/lumenwake-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/NaufalDzz/lumenwake-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**LUMENWAKE** is a sky-garden light-routing expedition set across three floating islands. At the heart of each
island a well pours out golden light. Bend, split, focus and scatter that light with relays so the gardens
bloom before their patience runs out. Seven nights take you from the Verdant Shoal through Mistveil Reach to
Stormcrown. Between nights you choose boons that shape your build. Entered in make.fun's
[Make the best game](https://make.fun/bounty/best-game-01) bounty.

It runs offline in a desktop browser from plain static files: no build step, no libraries, no downloaded assets
and no network requests. All art is drawn procedurally on a canvas. All music and sound is synthesized with
Web Audio after your first click or key press.

## How to play

**Turns.** Each night has 5–7 **hours**, and each hour you spend **focus** (3 per hour) shaping your relay
network. **Release the pulse** to end the hour. Before you release, every bloom shows what the next pulse will
do: ▲ grow, ● hold, ▼ wilt. You can undo any action within the hour. Up to 2 unused focus carries into the next
hour. When you make landfall on a new island you get +4 focus to rebuild.

**The pulse.** Each pulse runs in order:

1. The forecast storm strikes.
2. Light flows from the well.
3. Every bloom that gets what it needs grows one step; the others lose a leaf of patience.
4. Fully grown blooms are harvested for score and **dew**.
5. A bloom that runs out of patience withers and costs a **heart**.
6. New sprouts appear for the next hour.

At 0 hearts the expedition is lost. Keep at least one heart through all seven nights to win. The Dawnheart
that sprouts on the final night is a 120-point prize, not a requirement: a run can win without it, and the
results screen says honestly whether it bloomed.

**Relays** (from your satchel):

| Relay | Focus to place | Effect |
| --- | --- | --- |
| Mirror | 1 | Bends a beam 90°. Click it again to flip it (1 focus). |
| Prism | 1 | Splits a beam left and right. Each half is 1 weaker. |
| Lens | 1 | Adds +1 to the strength of a beam passing through it. |
| Halo Lantern | 1 | Catches a beam and glows on the 4 neighbouring cells. |

Clicking the well turns it a quarter (1 focus). Lifting a relay back into the satchel is free (right-click or
X). Beams start at strength 3; stones, rifts, the well and cloudbanks block them. A bloom drinks the beam that
reaches it.

**Blooms**:

| Bloom | Needs | Grows in | Value |
| --- | --- | --- | --- |
| Dawnpetal | any light | 2 pulses | 10 |
| Moonlily | strength 3+ | 3 pulses | 30 |
| Twinbell | light from two different sides | 2 pulses | 35 |
| Shadecap | darkness (it sprouts on lit cells) | 2 pulses | 20 |
| Dawnheart | strength 5+ (final night, optional prize) | 3 pulses | 120 |

When several blooms are harvested in one pulse they form a **chorus**: each extra harvest adds +25% to every
harvest in that pulse.

**Storms** are forecast one hour ahead on their target cells, and the preview already includes them:

- **Gale:** flips every mirror in a row or column.
- **Cloudbank:** a 2×2 block of cloud that stops light for two pulses.
- **Hail:** knocks relays back into your satchel.
- **Eclipse:** dims the well by 1 for one pulse.

Islands bring new storm types: Verdant has gales; Mistveil adds clouds; Stormcrown has all four.

**The waystation** (after every night):

- Pick 1 of 3 seeded **boons**, or skip it for +3 dew.
- Spend dew on relays from a 3-item shop.
- Mend a heart once for 5 dew.

The twelve boons:

- Twin Aperture
- Kindled Well
- Steady Hands
- Flawless Prisms
- Wide Halo
- Burning Glass
- Dew Gatherers
- Deep Roots
- Anchored Frames
- Mending Rain
- Chorus of Petals
- Crystal Cache

They combine into builds such as lens-heavy power, split-everything prisms or storm-proof frames.

**Score:** harvest values plus these bonuses:

- a dawn bonus each night
- +30 for a night without withering
- 50 per heart left at the end

Difficulty multiplies score:

| Difficulty | Hearts | Other changes | Score |
| --- | --- | --- | --- |
| Breeze | 7 | +1 bloom patience | ×0.75 |
| Wayfarer | 5 | none | ×1 |
| Stormcaller | 4 | extra sprouts, a storm every hour | ×1.5 |

**Seeds:** the title screen shows the run seed, which you can step or shuffle. A seed fixes the island shapes,
sprouts, storms, boon offers and shop, so a run can be replayed or shared. Records are stored in `localStorage`
and the game still plays if storage is blocked:

- best score per difficulty
- runs and wins
- deepest night reached
- settings

A full expedition takes about 6–10 minutes.

## Controls

| | Mouse | Keyboard |
| --- | --- | --- |
| Pick a relay | click a card in the tray | `1`–`4` |
| Place / flip mirror / turn well | click a cell | arrows move the cursor, `Enter` or `E` |
| Flip the relay before placing | wheel or right-click an empty cell | `F` or `Q` |
| Lift a relay (free) | right-click or Shift-click | `X`, `Backspace` |
| Turn the well | click the well or "Turn Well" | `W` |
| Release the pulse | "Release Pulse" button | `Space` (Space again skips the animation) |
| Undo within the hour | Undo button | `Z` |
| Pause / guide / mute | header Menu and Sound buttons; guide from the menu | `Esc` / `H` / `M` |
| Waystation | click cards | `1`–`3` boons, `4`–`6` shop, `7` mend, `Enter` set out |
| Results | buttons | `Enter` new run, `R` retry seed, `T` title |

Menus also take `Tab`/arrows and `Enter`. The pause menu and title offer high contrast and reduced motion.

## Run it

```sh
node serve.ts                # then open http://127.0.0.1:8096/ in desktop Chrome
PORT=8097 node serve.ts      # the same, on another loopback port
```

Other commands (Node 22.18 or later, nothing to install):

```sh
node --test 'tests/*.test.mjs'                       # rules, balance and headless UI tests
MAKEFUN_OUTPUT_DIR=/tmp/lumenwake-out node main.ts   # hand-in: copies game/ + screenshots/, writes dossier.json
```

## Layout

| Path | Job |
| --- | --- |
| `game/index.html`, `game/style.css` | page shell and letterboxed 1280×720 canvas |
| `game/src/rules/` | pure rules, no DOM: seeded RNG (`rng.js`), grid maths, relay optics (`relays.js`), beam tracing (`light-trace.js`), bloom species (`blooms.js`), islands and the night plan (`islands.js`), storm forecasts (`storms.js`), boons (`boons.js`) and the expedition state machine (`expedition.js`) |
| `game/src/render/` | canvas art: palette, sky backdrop, island terrain, beams, relays, blooms, storms, particles and the board view |
| `game/src/ui/` | screens drawn on canvas with clickable hitboxes: HUD, title, guide, dusk summary, waystation, results, pause |
| `game/src/app/` | controller (`main.js`), mouse/keyboard input, Web Audio, records, contextual hints and the read-only `window.lumenwake` snapshot |
| `main.ts`, `vendor/makefun-game.ts` | hand-in program and the kit's unchanged dossier library |
| `serve.ts` | loopback static server for play-testing |
| `tests/` | Node built-in tests; `tests/support/` holds a stand-in browser and a test-only strategy bot |

Licensed under the MIT License (see `LICENSE`).

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
