// A small seeded random number generator (mulberry32): the same seed gives the same game,
// which is what makes the screenshot scenes repeatable.

// seeded RNG keeps screenshots reproducible
export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float in [lo, hi) from a random() function. */
export const between = (random, lo, hi) => lo + random() * (hi - lo);

/** An integer in [lo, hi], both ends included. */
export const pick = (random, lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
