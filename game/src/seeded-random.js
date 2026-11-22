// One job: a small seeded random number generator, so a duel can be replayed from its seed.

/** Returns a function giving the next number in [0, 1) of the stream that `seed` starts. */
export function createSeededRandom(seed) {
  let state = (Number(seed) >>> 0) || 1;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seed for a fresh duel, taken from the clock so no two evenings deal alike. */
export function seedFromClock() {
  return (Date.now() % 2147483647) + 1;
}

/** Reads ?seed=N from the page address; null when it names none. */
export function seedFromAddress(search) {
  const value = new URLSearchParams(search).get('seed');
  const seed = Number(value);
  return value !== null && Number.isFinite(seed) && seed > 0 ? Math.floor(seed) : null;
}
