// world: the full rule-set, pure of drawing
// ported from the design notes, tuned over three sessions
import { BLADE, COMBO, FIELD, LIVES, ORB, POOL_SIZE, RING, SHARD, WAVE } from './config.js';

export const KIND_SHARD = 0;
export const KIND_RING = 1;

export const EVENT_SLICE = 1;
export const EVENT_RING = 2;
export const EVENT_HIT = 4;
export const EVENT_OVER = 8;

export function createWorld(random, between) {
  const orb = { x: ORB.start.x, y: ORB.start.y, vx: 0, vy: 0, invulnerable: 0 };
  const items = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    items.push({ active: false, kind: KIND_SHARD, x: 0, y: 0, r: 0, speed: 0, sides: 6, spin: 0, angle: 0, sliceX: 0, sliceY: 0 });
  }
  const state = {
    orb,
    items,
    score: 0,
    lives: LIVES,
    wave: 1,
    waveSliced: 0,
    blades: 1,
    bladeAngle: 0,
    combo: 1,
    comboLeft: 0,
    elapsed: 0,
    shardTimer: SHARD.interval,
    ringTimer: RING.interval,
    sliceCount: 0,
  };

  function reset() {
    orb.x = ORB.start.x;
    orb.y = ORB.start.y;
    orb.vx = 0;
    orb.vy = 0;
    orb.invulnerable = 0;
    for (const item of items) item.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.wave = 1;
    state.waveSliced = 0;
    state.blades = 1;
    state.bladeAngle = 0;
    state.combo = 1;
    state.comboLeft = 0;
    state.elapsed = 0;
    state.shardTimer = SHARD.interval;
    state.ringTimer = RING.interval;
    state.sliceCount = 0;
  }

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) if (!items[index].active) return items[index];
    return null;
  }

  function spawnShard() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_SHARD;
    item.r = SHARD.minRadius + random() * (SHARD.maxRadius - SHARD.minRadius);
    item.x = item.r + random() * (FIELD.width - item.r * 2);
    item.y = -item.r - 10;
    item.speed = SHARD.speed + SHARD.speedPerWave * (state.wave - 1) + random() * SHARD.speedJitter;
    item.sides = 3 + Math.floor(random() * (4 + SHARD.sidesJitter));
    item.spin = (random() - 0.5) * 3;
    item.angle = random() * Math.PI * 2;
    item.sliceX = 0;
    item.sliceY = 0;
  }

  function spawnRing() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_RING;
    item.r = RING.radius;
    item.x = item.r + random() * (FIELD.width - item.r * 2);
    item.y = -item.r - 10;
    item.speed = RING.speed;
    item.spin = 0;
    item.angle = 0;
    item.sides = 0;
  }

  function shardInterval() {
    return Math.max(SHARD.minInterval, SHARD.interval * SHARD.intervalScale ** (state.wave - 1));
  }

  /** The blade tips this step: one point per blade, evenly around the orb. */
  function bladePoints() {
    const points = [];
    for (let index = 0; index < state.blades; index += 1) {
      const angle = state.bladeAngle + (index * Math.PI * 2) / state.blades;
      points.push({
        x: orb.x + Math.cos(angle) * BLADE.length,
        y: orb.y + Math.sin(angle) * BLADE.length,
        angle,
      });
    }
    return points;
  }

  function slice(item, tip, events) {
    item.active = false;
    item.sliceX = tip.x;
    item.sliceY = tip.y;
    state.sliceCount += 1;
    state.waveSliced += 1;
    state.combo = Math.min(COMBO.max, state.combo + COMBO.step);
    state.comboLeft = COMBO.window;
    state.score += Math.round(10 * state.combo * (1 + (state.wave - 1) * 0.1));
    events |= EVENT_SLICE;
    if (state.waveSliced >= WAVE.quota && state.wave < WAVE.max) {
      state.wave += 1;
      state.waveSliced = 0;
    }
    return events;
  }

  /**
   * One fixed step. `steer` is { seek, keys } from the input; with `harmless` set (the title
   * screen's backdrop) things fall but nothing touches the orb and nothing scores.
   */
  function step(dt, steer, harmless) {
    let events = 0;
    state.elapsed += dt;

    // Steering: seek the pointer or accelerate along the held keys, then apply drag.
    if (steer.seek) {
      const dx = steer.seek.x - orb.x;
      const dy = steer.seek.y - orb.y;
      orb.vx = Math.max(-ORB.maxSpeed, Math.min(ORB.maxSpeed, dx * 12));
      orb.vy = Math.max(-ORB.maxSpeed, Math.min(ORB.maxSpeed, dy * 12));
    } else if (steer.keys) {
      orb.vx += steer.keys.x * ORB.accel * dt;
      orb.vy += steer.keys.y * ORB.accel * dt;
      orb.vx *= ORB.drag ** (dt * 60);
      orb.vy *= ORB.drag ** (dt * 60);
      const speed = Math.hypot(orb.vx, orb.vy);
      if (speed > ORB.maxSpeed) {
        orb.vx = (orb.vx / speed) * ORB.maxSpeed;
        orb.vy = (orb.vy / speed) * ORB.maxSpeed;
      }
    }
    orb.x = Math.min(FIELD.width - ORB.radius, Math.max(ORB.radius, orb.x + orb.vx * dt));
    orb.y = Math.min(FIELD.height - ORB.radius, Math.max(ORB.radius, orb.y + orb.vy * dt));
    if (orb.invulnerable > 0) orb.invulnerable = Math.max(0, orb.invulnerable - dt);

    // Blades sweep; each tip slices a shard whose body it crosses.
    state.bladeAngle += (BLADE.speed + BLADE.speedPerBlade * (state.blades - 1)) * dt;
    const tips = bladePoints();

    state.shardTimer -= dt;
    if (state.shardTimer <= 0) {
      spawnShard();
      state.shardTimer += shardInterval();
    }
    state.ringTimer -= dt;
    if (state.ringTimer <= 0) {
      spawnRing();
      state.ringTimer += RING.interval + random() * RING.intervalJitter;
    }

    if (state.comboLeft > 0) {
      state.comboLeft -= dt;
      if (state.comboLeft <= 0) state.combo = 1;
    }

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      item.y += item.speed * dt;
      item.angle += item.spin * dt;
      if (item.y > FIELD.height + item.r + 10) {
        item.active = false;
        continue;
      }
      if (harmless) continue;
      if (item.kind === KIND_RING) {
        // Catch a ring with the orb's body to add a blade (up to three).
        if (Math.hypot(item.x - orb.x, item.y - orb.y) < item.r + ORB.radius) {
          item.active = false;
          if (state.blades < 3) state.blades += 1;
          state.score += RING.points;
          events |= EVENT_RING;
        }
        continue;
      }
      // A shard: a blade tip inside its body slices it; the orb's core touching it hurts.
      for (const tip of tips) {
        if (Math.hypot(item.x - tip.x, item.y - tip.y) < item.r + BLADE.width) {
          events = slice(item, tip, events);
          break;
        }
      }
      if (!item.active) continue;
      if (orb.invulnerable === 0 && Math.hypot(item.x - orb.x, item.y - orb.y) < item.r + ORB.radius) {
        item.active = false;
        state.lives -= 1;
        state.combo = 1;
        orb.invulnerable = 1.5;
        events |= EVENT_HIT;
        if (state.lives === 0) {
          events |= EVENT_OVER;
          break;
        }
      }
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
