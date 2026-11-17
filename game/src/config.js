// Prism Cut keeps every tuning knob here. Other modules import only this file for
// numbers and colours, so rebalancing the game never means hunting through code.
// The playfield is a fixed 1280x720 logical space; the renderer scales it to fit
// whatever window it lives in, so none of the rules below care about screen size.

// Logical playfield dimensions everything else is tuned against.
export const FIELD = { width: 1280, height: 720 };

// Fixed simulation step: exactly 60 updates per second regardless of display rate.
export const STEP = 1 / 60;

// The player's orb: size, thrust, top speed, friction and where it starts each run.
export const ORB = {
  radius: 14,
  accel: 2400,
  maxSpeed: 640,
  drag: 0.86,
  start: { x: 640, y: 460 },
};

// Blades orbit the orb and do the cutting; each caught ring adds one more,
// and the whole formation spins a bit faster with every extra blade.
export const BLADE = {
  length: 46,
  width: 7,
  speed: 3.1,
  speedPerBlade: 0.55,
  gap: 0.26,
};

// Falling shards: size range, fall speed that ramps with the wave, randomised
// polygon sides and spin, plus how often they spawn (tightening each wave).
export const SHARD = {
  minRadius: 16,
  maxRadius: 34,
  speed: 130,
  speedPerWave: 26,
  speedJitter: 70,
  sidesJitter: 3,
  interval: 0.5,
  intervalScale: 0.9,
  minInterval: 0.16,
};

// Gold rings: catch one with the orb's body (not the blades) for points and a new blade.
export const RING = {
  radius: 22,
  speed: 165,
  points: 25,
  interval: 9,
  intervalJitter: 4,
};

// Waves set the pace: slice the quota to advance, cap out at the max wave.
export const WAVE = { quota: 8, ramp: 1.18, max: 9 };

// How many hits the player can take before the run ends.
export const LIVES = 3;

// Chain slices inside the window to build a multiplier; miss and it resets to 1.
export const COMBO = { window: 2.2, step: 0.5, max: 8 };

// Upper bound on the object pool; the world never allocates shapes mid-run.
export const POOL_SIZE = 72;

// Neon-on-dark palette shared by the renderer, HUD and overlays.
export const PALETTE = {
  backdrop: '#0b0d16',
  vignette: '#05060c',
  grid: '#151a2c',
  orb: '#5eead4',
  orbCore: '#f0fdfa',
  blade: '#a5f3fc',
  shard: '#f472b6',
  shardEdge: '#fda4cf',
  ring: '#fbbf24',
  text: '#eef1f5',
  muted: '#8b93a3',
  panel: 'rgba(11, 13, 22, 0.72)',
  combo: '#c084fc',
  spark: '#ffe08a',
};

// UI font stack used by every text call on the canvas.
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// localStorage slot that remembers the best score between visits.
export const BEST_KEY = 'prism-cut.best';

// Spark particle tuning for the slice burst the renderer emits.
export const SPARKS = { count: 10, speed: 220, lifetime: 0.4, gravity: 300 };
