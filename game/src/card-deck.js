// One job: what a Thricefold card is, the four suits, and building and shuffling the 36-card deck.

/** Each suit has its own colour AND its own shape, so no card is told apart by text alone. */
export const SUITS = [
  { key: 'sun', name: 'Sun', shape: 'circle', color: '#f2a516', ink: '#9a5b00', pale: '#fff1cc' },
  { key: 'moon', name: 'Moon', shape: 'crescent', color: '#3f74e6', ink: '#1d3f9c', pale: '#dbe7ff' },
  { key: 'peak', name: 'Peak', shape: 'triangle', color: '#1fa46d', ink: '#0b6a43', pale: '#d5f5e4' },
  { key: 'gem', name: 'Gem', shape: 'diamond', color: '#dd3f7d', ink: '#96184a', pale: '#ffdcea' },
];

export const LOWEST_VALUE = 1;
export const HIGHEST_VALUE = 9;

/** The whole deck in a fixed order: every suit's 1 to 9, each card with an id of its own. */
export function buildDeck() {
  const cards = [];
  for (let suit = 0; suit < SUITS.length; suit += 1) {
    for (let value = LOWEST_VALUE; value <= HIGHEST_VALUE; value += 1) {
      cards.push({ id: suit * HIGHEST_VALUE + (value - 1), suit, value });
    }
  }
  return cards;
}

/** Shuffles `cards` in place with the given random stream (Fisher-Yates) and returns them. */
export function shuffleDeck(cards, random) {
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    const held = cards[index];
    cards[index] = cards[other];
    cards[other] = held;
  }
  return cards;
}

/** A short spoken name such as "7 of Moon", for the status line a screen reader announces. */
export function describeCard(card) {
  return `${card.value} of ${SUITS[card.suit].name}`;
}
