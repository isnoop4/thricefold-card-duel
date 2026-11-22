// One job: play a duel forward instantly by the real rules, with a stand-in for the human player.
// The screenshot scenes use it to reach a true mid-duel table, a true win and a true loss, and the
// balance script (tools/simulate-duels.mjs) uses it to measure how long and how fair duels are.
import { canPlay, drawCard, duelWinner, fullLanes, judgeLane, openLanes, playCard, settleLane } from './duel-rules.js';
import { chooseOpponentLane, chooseOpponentPlay, rankPlays } from './opponent-ai.js';

/**
 * Stand-in players: `keen` takes its best-rated play, `hasty` plays its first card into the first
 * open fold without a thought, and `careless` takes its worst-rated play.
 */
export const STAND_IN_POLICIES = {
  keen: (duel) => rankPlays(duel, 'player')[0],
  hasty: (duel) => ({ handIndex: 0, laneIndex: openLanes(duel, 'player')[0] }),
  careless: (duel) => {
    const plays = rankPlays(duel, 'player');
    return plays[plays.length - 1];
  },
};

function settleEveryFullLane(duel, verdicts) {
  for (const laneIndex of fullLanes(duel)) {
    const verdict = judgeLane(duel, laneIndex);
    settleLane(duel, verdict);
    verdicts.push(verdict);
    if (duelWinner(duel) !== null) return;
  }
}

/** One turn of `side` (a play, a draw, any full folds settled); false when that side had no play. */
function takeTurnInstantly(duel, side, play, verdicts) {
  if (!play) return false;
  playCard(duel, side, play.handIndex, play.laneIndex);
  drawCard(duel, side);
  settleEveryFullLane(duel, verdicts);
  return true;
}

/**
 * Plays whole rounds (your turn, then Magpie's) until the duel is won, `shouldStop(duel, report)`
 * says so, or `maxRounds` have passed. Returns what happened and the fold Magpie eyes next.
 */
export function playDuelInstantly(duel, policy, shouldStop = () => false, maxRounds = 200) {
  const report = { rounds: 0, verdicts: [], eyedLane: chooseOpponentLane(duel), winner: null };
  while (report.rounds < maxRounds) {
    if (canPlay(duel, 'player')) takeTurnInstantly(duel, 'player', policy(duel), report.verdicts);
    report.winner = duelWinner(duel);
    if (report.winner !== null) break;
    if (canPlay(duel, 'opponent')) {
      takeTurnInstantly(duel, 'opponent', chooseOpponentPlay(duel, report.eyedLane), report.verdicts);
    }
    report.winner = duelWinner(duel);
    report.rounds += 1;
    report.eyedLane = chooseOpponentLane(duel);
    if (report.winner !== null || shouldStop(duel, report)) break;
  }
  return report;
}
