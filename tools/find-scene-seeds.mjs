// Finds seeds for the screenshot scenes: `node tools/find-scene-seeds.mjs`. It plays duels by the
// game's own rules and prints the first seeds whose mid-duel table is rich (see isRichTable), whose
// keen stand-in wins, and whose careless stand-in loses, with what each of those tables holds.
import { createSeededRandom } from '../game/src/seeded-random.js';
import { createDuel } from '../game/src/duel-rules.js';
import { findCombos } from '../game/src/lane-scoring.js';
import { playDuelInstantly, STAND_IN_POLICIES } from '../game/src/autopilot-duel.js';
import { isRichTable } from '../game/src/screenshot-scenes.js';

function describeTable(duel) {
  let cardsDown = 0;
  let combos = 0;
  for (const lane of duel.lanes) {
    for (const side of ['player', 'opponent']) {
      cardsDown += lane[side].length;
      if (findCombos(lane[side]).length > 0) combos += 1;
    }
  }
  return `${cardsDown} cards down, ${combos} standing combos, life ${duel.life.player}:${duel.life.opponent}`;
}

const found = { table: [], win: [], loss: [] };
for (let seed = 1; seed <= 400; seed += 1) {
  const table = createDuel(createSeededRandom(seed));
  const tableReport = playDuelInstantly(table, STAND_IN_POLICIES.keen, isRichTable);
  if (tableReport.winner === null && isRichTable(table)) found.table.push(`seed ${seed}: ${describeTable(table)}`);
  const won = createDuel(createSeededRandom(seed));
  if (playDuelInstantly(won, STAND_IN_POLICIES.keen).winner === 'player') found.win.push(`seed ${seed}: life ${won.life.player}:${won.life.opponent}, folds ${won.foldsWon.player}:${won.foldsWon.opponent}`);
  const lost = createDuel(createSeededRandom(seed));
  if (playDuelInstantly(lost, STAND_IN_POLICIES.hasty).winner === 'opponent' && lost.foldsWon.player >= 2) found.loss.push(`seed ${seed}: life ${lost.life.player}:${lost.life.opponent}, folds ${lost.foldsWon.player}:${lost.foldsWon.opponent}`);
}
for (const [scene, lines] of Object.entries(found)) {
  console.log(`${scene}: ${lines.length} seeds`);
  for (const line of lines.slice(0, 12)) console.log(`  ${line}`);
}
