import { ALL_ATTRIBUTES } from './attributes.js';

/**
 * Draw two balanced teams from a list of players.
 * Each player: { id, name, scores: {...}, overall }
 * Tries 600 random splits, picks randomly from the best 3%.
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

    let diff = 0;
    ALL_ATTRIBUTES.forEach((attr) => {
      const sA = a.reduce((s, p) => s + Number(p.scores[attr.key] || 0), 0);
      const sB = b.reduce((s, p) => s + Number(p.scores[attr.key] || 0), 0);
      diff += Math.abs(sA - sB);
    });
    results.push({ a, b, diff });
  }
  results.sort((x, y) => x.diff - y.diff);
  const poolSize = Math.max(3, Math.floor(results.length * 0.03));
  const pick = results[Math.floor(Math.random() * poolSize)];

  const sumOverall = (t) => t.reduce((s, p) => s + p.overall, 0);
  return {
    a: pick.a,
    b: pick.b,
    sumA: sumOverall(pick.a),
    sumB: sumOverall(pick.b),
    attrDiff: pick.diff,
  };
}
