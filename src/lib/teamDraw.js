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

// Quantas jogadoras têm essa posição como PRINCIPAL (é o que conta pras cotas).
const primaryCount = (team, dim) => team.filter((p) => p.position_primary === dim).length;

// Peso das posições no score da combinação. Meio não entra aqui (coringa).
const POSITION_PENALTY = 3;
// Cota não cumprida (time sem zagueira ou sem corredora). Só entra em jogo
// quando nenhuma/quase nenhuma combinação consegue cumprir — aí o score
// empurra pras menos ruins.
const QUOTA_PENALTY = 12;
// Abaixo disso, a filtragem por cota é rígida demais pro sorteio ter variedade.
const MIN_VALID = 10;

const TRIES = 600;
const TOP_FRACTION = 0.03;

// Cotas qualitativas: se o grupo tem 2+ zagueiras, cada time precisa de pelo
// menos 1 (mesma regra pras corredoras). Com só 1 no grupo, não dá pra dividir.
const QUOTA_DIMS = ['defesa', 'meio'];

const quotaMisses = (a, b, totals) =>
  QUOTA_DIMS.reduce((miss, dim) => {
    if (totals[dim] < 2) return miss;
    return miss + (primaryCount(a, dim) === 0 ? 1 : 0) + (primaryCount(b, dim) === 0 ? 1 : 0);
  }, 0);

/**
 * Escolhe quem reveza, dentro do time maior.
 * - Nunca a única zagueira nem a única corredora (o time perderia a função)
 * - Prefere quem joga no meio (coringa, o time se rearranja sem ela)
 * - Empate: a mais próxima da média do time (não tira nem a melhor nem a pior)
 * - Se todas forem críticas, vai a mais versátil (tem posição secundária)
 */
function pickReserva(team) {
  const onlyOne = (p, dim) => p.position_primary === dim && primaryCount(team, dim) === 1;
  const critical = (p) => onlyOne(p, 'defesa') || onlyOne(p, 'meio');

  let pool = team.filter((p) => !critical(p));
  if (!pool.length) pool = team.filter((p) => p.position_secondary);
  if (!pool.length) pool = [...team];

  const avg = team.reduce((s, p) => s + p.overall, 0) / team.length;
  return [...pool].sort((x, y) => {
    const meio = (p) => (p.position_primary === 'meio' ? 0 : 1);
    return meio(x) - meio(y) || Math.abs(x.overall - avg) - Math.abs(y.overall - avg);
  })[0];
}

/**
 * Sorteia dois times equilibrados.
 * Cada jogadora: { id, name, scores: {...}, overall, position_primary?, position_secondary? }
 *
 * Gera 600 divisões aleatórias, descarta as que deixam algum time sem zagueira
 * ou sem corredora (quando dá pra cumprir), pontua o resto por diferença de
 * força somada + desequilíbrio de ataque/defesa, e sorteia entre as 3% melhores.
 * A comparação é de SOMA, não de média: com times ímpares o time maior soma
 * parecido com menos qualidade por jogadora — quem tem a reserva compensa
 * revezando.
 *
 * @returns {{a, b, sumA, sumB, attrDiff, attackDiff, defenseDiff, reserva}|null}
 */
export function drawTeams(players) {
  if (players.length < 2) return null;
  const n = players.length;
  const sizeA = Math.ceil(n / 2);
  const totals = Object.fromEntries(QUOTA_DIMS.map((dim) => [dim, primaryCount(players, dim)]));

  const all = [];
  for (let i = 0; i < TRIES; i++) {
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
    const misses = quotaMisses(a, b, totals);
    const score =
      attrDiff + attackDiff * POSITION_PENALTY + defenseDiff * POSITION_PENALTY + misses * QUOTA_PENALTY;

    all.push({ a, b, attrDiff, attackDiff, defenseDiff, misses, score });
  }

  // Cotas como filtro rígido; se sobrar pouca coisa, cai pro conjunto todo —
  // onde elas ainda pesam via QUOTA_PENALTY.
  const valid = all.filter((r) => r.misses === 0);
  const pool = valid.length >= MIN_VALID ? valid : all;

  pool.sort((x, y) => x.score - y.score);
  const topSize = Math.max(3, Math.floor(pool.length * TOP_FRACTION));
  const pick = pool[Math.floor(Math.random() * Math.min(topSize, pool.length))];

  const sumOverall = (t) => t.reduce((s, p) => s + p.overall, 0);

  // Time ímpar: a maior cede alguém pro revezamento.
  let reserva = null;
  if (pick.a.length !== pick.b.length) {
    const maiorKey = pick.a.length > pick.b.length ? 'a' : 'b';
    reserva = {
      jogadora: pickReserva(pick[maiorKey]),
      time_maior: maiorKey,
      time_menor: maiorKey === 'a' ? 'b' : 'a',
    };
  }

  return {
    a: pick.a,
    b: pick.b,
    sumA: sumOverall(pick.a),
    sumB: sumOverall(pick.b),
    attrDiff: pick.attrDiff,
    attackDiff: pick.attackDiff,
    defenseDiff: pick.defenseDiff,
    reserva,
  };
}
