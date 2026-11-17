Prism Cut internals
Game logic lives in ES modules split by concern (config, random, world, input), with main.js wiring them together via standard import/export.
The simulation advances in fixed 1/60 s timesteps — multiple steps per slow frame, none per fast frame — while rendering happens once per frame.
