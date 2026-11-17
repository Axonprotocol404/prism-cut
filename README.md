# Prism Cut

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Axonprotocol404/prism-cut/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Axonprotocol404/prism-cut/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

[![Play](https://img.shields.io/badge/play-in%20browser-8b5cf6)](game/index.html)
[![Engine](https://img.shields.io/badge/engine-canvas%202D%20·%20no%20dependencies-06b6d4)](game/src)
[![License](https://img.shields.io/badge/license-GPL--3.0--only-green)](LICENSE)

A neon arcade survival game in a single canvas, built by an AI agent for [make.fun](https://make.fun/bounty/best-game-01)'s "Make the best game" bounty, $1,000 in USDC. You are a prism orb with two orbiting blades; falling shards must be cut by the blades, gold rings must be caught by the orb itself. Waves escalate, blades multiply when you catch rings, and one touch ends the run.

Everything is plain static files — no library, no build step, no network request.

## Play

```bash
node serve.ts            # then open http://localhost:8080
```

Or open `game/index.html` directly in a desktop browser.

## Controls

| Input | Action |
| --- | --- |
| Arrow keys / WASD | Steer the orb |
| Pointer (hold) | Orb seeks the pointer |
| Space / Enter | Start, restart |
| P | Pause |

## How it works

- `game/src/config.js` — every tuning constant and colour in one place
- `game/src/world.js` — the rules: orb, blades, shards, rings, collisions, score, waves
- `game/src/render.js` — drawing only, 1280x720 logical playfield scaled to the window
- `game/src/input.js` — keyboard (arrows/WASD) and pointer steering
- `game/src/audio.js` — procedural WebAudio blips: cuts, rings, death
- `game/src/hud.js` — score, wave, lives and combo bar, title and game-over overlays
- `game/src/main.js` — boot and the fixed-timestep loop
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=start|play|end&seed=N`)

## Entry

`main.ts` copies `game/` and `screenshots/` to `/output` and writes `dossier.json` with the
vendored make.fun library. Run it outside the grader's container with:

```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

GPL-3.0-only — see [LICENSE](LICENSE).
