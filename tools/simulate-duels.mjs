// Balance check for Thricefold, run with `node tools/simulate-duels.mjs [duels]`. It plays whole
// duels by the game's own rules with stand-in players and prints how often each side wins and how
// many rounds a duel lasts, so the life totals and strike sizes can be tuned on evidence.
import { createSeededRandom } from '../game/src/seeded-random.js';
import { createDuel } from '../game/src/duel-rules.js';
import { playDuelInstantly, STAND_IN_POLICIES } from '../game/src/autopilot-duel.js';

const duels = Number(process.argv[2] ?? 400);

for (const [name, policy] of Object.entries(STAND_IN_POLICIES)) {
  let playerWins = 0;
  let unfinished = 0;
  let rounds = 0;
  let combos = 0;
  let folds = 0;
  for (let seed = 1; seed <= duels; seed += 1) {
    const duel = createDuel(createSeededRandom(seed));
    const report = playDuelInstantly(duel, policy);
    if (report.winner === 'player') playerWins += 1;
    if (report.winner === null) unfinished += 1;
    rounds += report.rounds;
    for (const verdict of report.verdicts) {
      folds += 1;
      if (verdict.winner !== null && verdict[verdict.winner].combos.length > 0) combos += 1;
    }
  }
  console.log(
    `${name}: player wins ${playerWins}/${duels}, unfinished ${unfinished}, ` +
      `mean rounds ${(rounds / duels).toFixed(1)}, folds judged ${(folds / duels).toFixed(1)} a duel, ` +
      `${((100 * combos) / Math.max(1, folds)).toFixed(0)}% won with a combo`,
  );
}
