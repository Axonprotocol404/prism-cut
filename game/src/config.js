// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical area;
// the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The orb the player steers, orbited by up to three blades. */
export const ORB = {
  radius: 14,
  accel: 2400,
  maxSpeed: 640,
  drag: 0.86,
  start: { x: 640, y: 460 },
};

/** A blade orbits the orb and slices shapes; each caught ring adds another blade. */
export const BLADE = {
  length: 46,
  width: 7,
  speed: 3.1,
  speedPerBlade: 0.55,
  gap: 0.26,
};

/** Shards fall from the top; slicing scores, touching one's core costs a life. */
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

/** A prismatic ring: catch it with the orb (not the blades) to add a blade. */
export const RING = {
  radius: 22,
  speed: 165,
  points: 25,
  interval: 9,
  intervalJitter: 4,
};

/** Waves ramp the pace; a wave ends when its quota of shards is sliced. */
export const WAVE = { quota: 8, ramp: 1.18, max: 9 };

export const LIVES = 3;

/** Consecutive slices within the window grow the combo multiplier. */
export const COMBO = { window: 2.2, step: 0.5, max: 8 };

export const POOL_SIZE = 72;

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
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'prism-cut.best';
