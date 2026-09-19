import { ALL_ATTRIBUTES } from './attributes.js';

// Peso de uma jogadora numa dimensão de posição.
// Principal vale 1, secundária 0.5. Sem posição = 0 (não ajuda nem atrapalha;
// entra no sorteio só pela força).
const positionWeight = (player, dim) => {
  let w = 0;
  if (player.position_primary === dim) w += 1.0;
  if (player.position_secondary === dim) w += 0.5;
  return w;
};

const sumWeight = (team, dim) => team.reduce((s, p) => s + positionWeight(p, dim), 0);

// Peso das posições no score da combinação. Meio não entra (coringa).
const POSITION_PENALTY = 3;

/**
 * Draw two balanced teams from a list of players.
 * Each player: { id, name, scores: {...}, overall, position_primary?, position_secondary? }
 * Tries 600 random splits, scores each by strength difference per attribute
 * plus attack/defense imbalance, picks randomly from the best 3%.
 */
export function drawTeams(players) {
  if (players.length < 2) return null;
  const n = players.length;
  const sizeA = Math.ceil(n / 2);

  const results = [];
  for (let i = 0; i < 600; i++) {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const a = shuffled.slice(0, sizeA);
    const b = shuffled.slice(sizeA);

    let attrDiff = 0;
    ALL_ATTRIBUTES.forEach((attr) => {
      const sA = a.reduce((s, p) => s + Number(p.scores[attr.key] || 0), 0);
      const sB = b.reduce((s, p) => s + Number(p.scores[attr.key] || 0), 0);
      attrDiff += Math.abs(sA - sB);
    });

    const attackDiff = Math.abs(sumWeight(a, 'ataque') - sumWeight(b, 'ataque'));
    const defenseDiff = Math.abs(sumWeight(a, 'defesa') - sumWeight(b, 'defesa'));
    const score = attrDiff + attackDiff * POSITION_PENALTY + defenseDiff * POSITION_PENALTY;

    results.push({ a, b, attrDiff, attackDiff, defenseDiff, score });
  }
  results.sort((x, y) => x.score - y.score);
  const poolSize = Math.max(3, Math.floor(results.length * 0.03));
  const pick = results[Math.floor(Math.random() * poolSize)];

  const sumOverall = (t) => t.reduce((s, p) => s + p.overall, 0);
  return {
    a: pick.a,
    b: pick.b,
    sumA: sumOverall(pick.a),
    sumB: sumOverall(pick.b),
    attrDiff: pick.attrDiff,
    attackDiff: pick.attackDiff,
    defenseDiff: pick.defenseDiff,
  };
}
