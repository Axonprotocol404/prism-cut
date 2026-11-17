// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules forward from a
// fresh world for a fixed number of steps, steered by a simple autopilot (seek the nearest blade-
// reachable shard above, else drift toward falling rings, else hold the middle), so the frame is
// what a short game really looks like and the same seed always gives the same frame.
import { FIELD, ORB, STEP } from './config.js';
import { EVENT_OVER, KIND_RING } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 600;
/** How far ahead, in seconds, the play pilot checks each candidate position. */
const HORIZON_PLAY = 0.7;
const HORIZON_END = 0.25;
const SAMPLE = 1 / 30;

/** Seconds until holding at (px, py) runs the orb into a shard's core; Infinity when it never does. */
function timeToHit(state, px, py, horizon) {
  for (let t = SAMPLE; t <= horizon; t += SAMPLE) {
    for (let index = 0; index < state.items.length; index += 1) {
      const item = state.items[index];
      if (!item.active || item.kind === KIND_RING) continue;
      const y = item.y + item.speed * t;
      if (Math.hypot(item.x - px, y - py) < item.r + ORB.radius) return t;
    }
  }
  return Infinity;
}

/** Seek the safest spot that still puts a blade near some shard: survival first, scoring second. */
function autopilot(state, horizon) {
  const orb = state.orb;
  // Find the lowest live shard as the scoring target.
  let target = null;
  for (let index = 0; index < state.items.length; index += 1) {
    const item = state.items[index];
    if (!item.active || item.kind === KIND_RING || item.y < -item.r) continue;
    if (target === null || item.y > target.y) target = item;
  }
  // Score a grid of candidate positions: near a blade-reach of the target but not inside any
  // shard's predicted core path; the safest candidate within reach of the target wins.
  let best = null;
  let bestScore = -Infinity;
  for (let gx = 3; gx <= FIELD.width; gx += 64) {
    for (let gy = 120; gy <= FIELD.height - 40; gy += 56) {
      const nearTarget = target === null ? 1 : -Math.abs(Math.hypot(target.x - gx, target.y - gy) - BLADE_REACH) / 200;
      const safe = timeToHit(state, gx, gy, horizon) === Infinity ? 0 : -1000 + timeToHit(state, gx, gy, horizon);
      const score = safe * 4 + nearTarget - Math.abs(gx - orb.x) / 300;
      if (score > bestScore) {
        bestScore = score;
        best = { x: gx, y: gy };
      }
    }
  }
  return { seek: best ?? { x: FIELD.width / 2, y: FIELD.height - 110 }, keys: null };
}

const BLADE_REACH = 46;

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and return the
 * screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, { keys: { x: 0, y: 0 }, seek: null }, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const horizon = name === 'end' ? HORIZON_END : HORIZON_PLAY;
  for (let index = 0; index < limit / STEP; index += 1) {
    if (world.step(STEP, autopilot(world.state, horizon), false) & EVENT_OVER) break;
  }
  const over = world.state.lives === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
