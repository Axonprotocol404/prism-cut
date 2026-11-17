# Prism Cut

A neon arcade survival game that runs entirely in one HTML canvas. You pilot a prism
orb trailing three slots' worth of orbiting blades: falling shards get sliced by the
blades for points, gold rings get caught by the orb itself to add more blades, and a
shard touching your core costs a life. Waves ramp the pace, combos multiply the score,
and the best run is remembered between visits.

No frameworks, no build step, no network calls — plain static files and vanilla JS.

[![Play](https://img.shields.io/badge/play-in%20browser-8b5cf6)](game/index.html)
[![Engine](https://img.shields.io/badge/engine-canvas%202D%20·%20zero%20dependencies-06b6d4)](game/src)
[![License](https://img.shields.io/badge/license-GPL--3.0--only-green)](LICENSE)

## How to play

- Steer the orb; its blades sweep around it and cut any shard they touch.
- Each slice scores, and slices landed within a short window build a combo
  multiplier (up to x8).
- Gold rings fall occasionally — catch one with the orb's body to add a blade
  (up to three). Blades also make the whole formation spin faster.
- Slicing the wave's quota advances the wave: shards fall faster and spawn more
  often, all the way to wave 9.
- Three lives, no continues. Best score is stored in your browser's localStorage.

## Controls

| Input | Action |
| --- | --- |
| Arrow keys / WASD | Steer the orb |
| Pointer (hold) | Orb seeks the pointer |
| Space / Enter | Start, restart |
| P or Esc | Pause |

Losing window focus pauses the game and clears all held keys, so nothing drifts
while you are away.

## File architecture

- `game/index.html` — page shell and canvas
- `game/src/config.js` — every tuning constant, palette colour and font in one place
- `game/src/world.js` — the rules: spawning, movement, blade collisions, score, waves
- `game/src/render.js` — drawing only: scaled 1280x720 playfield, grid backdrop,
  neon shapes, slice spark particles, HUD and overlay panels
- `game/src/input.js` — keyboard and pointer steering, queued one-shot presses
- `game/src/hud.js` — alternative canvas HUD helpers (palette-driven text and icons)
- `game/src/audio.js` — small WebAudio blips for slices, rings and hits
- `game/src/random.js` — seeded PRNG for reproducible runs
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=start|play|end&seed=N`)
- `game/src/main.js` — boot and the fixed 1/60 s timestep loop

## Running it

Serve the `game/` directory with any static file server:

```bash
node serve.ts            # then open http://localhost:8080
```

or open `game/index.html` directly in a desktop browser. There is nothing to install
or compile.

## Screenshots

`?shot=start&seed=7`, `?shot=play&seed=7`, `?shot=end&seed=7` stage real scenes from
a seeded world and set `window.__shotReady` once painted, so the same seed always
produces the same frame for automated capture.

## License

GPL-3.0-only — see [LICENSE](LICENSE).
