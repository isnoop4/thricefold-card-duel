// One job: how strong the cards on one side of a fold are, and which combos they make.

/**
 * The four combos three cards can make. `bonus` is the strength a combo adds to its fold; `strike`
 * is the extra life it takes when that fold wins, so a rarer combo both wins more and hits harder.
 */
export const COMBOS = {
  trio: { name: 'Trio', bonus: 14, strike: 4, rule: 'same value x3' },
  ladder: { name: 'Ladder', bonus: 10, strike: 3, rule: 'values in a row' },
  blend: { name: 'Blend', bonus: 7, strike: 2, rule: 'same suit x3' },
  pair: { name: 'Pair', bonus: 4, strike: 1, rule: 'same value x2' },
};

export const COMBO_ORDER = ['trio', 'ladder', 'blend', 'pair'];

function hasTrio(values) {
  return values.length === 3 && values[0] === values[1] && values[1] === values[2];
}

function hasLadder(values) {
  return values.length === 3 && values[1] === values[0] + 1 && values[2] === values[1] + 1;
}

function hasBlend(cards) {
  return cards.length === 3 && cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;
}

function hasPair(values) {
  return !hasTrio(values) && values.some((value, index) => index > 0 && value === values[index - 1]);
}

/** The keys of every combo these cards make now; a Ladder and a Blend can stand together. */
export function findCombos(cards) {
  const values = cards.map((card) => card.value).sort((a, b) => a - b);
  const found = [];
  if (hasTrio(values)) found.push('trio');
  if (hasLadder(values)) found.push('ladder');
  if (hasBlend(cards)) found.push('blend');
  if (hasPair(values)) found.push('pair');
  return found;
}

/** A fold side's strength: the sum of its cards plus every combo bonus it has earned. */
export function scoreLane(cards) {
  const combos = findCombos(cards);
  let sum = 0;
  for (const card of cards) sum += card.value;
  let bonus = 0;
  for (const key of combos) bonus += COMBOS[key].bonus;
  return { sum, bonus, total: sum + bonus, combos };
}

/**
 * How much unfinished cards still promise: two cards that could yet become a Ladder, a Blend or a
 * Trio are worth a little more than their sum. The opponent weighs its plays with this.
 */
export function promiseOfLane(cards) {
  if (cards.length !== 2) return 0;
  const gap = Math.abs(cards[0].value - cards[1].value);
  let promise = 0;
  if (gap === 0) promise += 1.5;
  if (gap === 1 || gap === 2) promise += 3;
  if (cards[0].suit === cards[1].suit) promise += 2;
  return promise;
}

/** The extra life a winning fold strikes away for the combos it holds. */
export function comboStrike(combos) {
  let strike = 0;
  for (const key of combos) strike += COMBOS[key].strike;
  return strike;
}

/** The combo names as one label, such as "Ladder + Blend"; empty when there is none. */
export function comboLabel(combos) {
  return combos.map((key) => COMBOS[key].name).join(' + ');
}
