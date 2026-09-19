// Attributes each player is rated on.
// Change this list to fit your group.
// - Self attributes: rated by the player themselves AND by others (final = weighted avg)
// - Peer-only attributes: only teammates rate (self doesn't rate own "nota geral")
// - desc: one-line hint shown under the slider

export const SELF_ATTRIBUTES = [
  { key: 'finalizacao',    label: 'Finalização',    short: 'FIN', desc: 'mira e precisão pra decidir dentro da área' },
  { key: 'chute_fora',     label: 'Chute de fora',  short: 'CHT', desc: 'potência e precisão de longe' },
  { key: 'passe',          label: 'Passe',          short: 'PAS', desc: 'precisão, timing, escolha certa' },
  { key: 'drible',         label: 'Drible',         short: 'DRI', desc: 'controle, um contra um, fintar' },
  { key: 'marcacao',       label: 'Marcação',       short: 'MRC', desc: 'pega no adversário, disputa' },
  { key: 'posicionamento', label: 'Posicionamento', short: 'POS', desc: 'leitura, sabe onde ficar' },
  { key: 'visao',          label: 'Visão de jogo',  short: 'VIS', desc: 'enxerga a jogada antes, acha o passe' },
  { key: 'pique',          label: 'Pique/Fôlego',   short: 'PIQ', desc: 'velocidade e aguenta os 90 min' },
  { key: 'coletividade',   label: 'Coletividade',   short: 'COL', desc: 'joga em equipe, não é individualista' },
];

export const PEER_ONLY_ATTRIBUTES = [
  { key: 'nota_geral',     label: 'Nota Geral',     short: 'GRL', desc: 'no geral, quão bom é como jogador' },
];

export const ALL_ATTRIBUTES = [...SELF_ATTRIBUTES, ...PEER_ONLY_ATTRIBUTES];

// weight of self vs peer for shared attributes
export const SELF_WEIGHT = 0.3;
export const PEER_WEIGHT = 0.7;

// avg helper
const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + Number(v), 0) / arr.length : 0);

// Overall = média simples dos atributos com nota (> 0).
// Usado tanto no admin (aggregatePlayer) quanto no /sortear (notas já
// combinadas que vêm da RPC get_draw_profiles).
export function overallFromScores(scores) {
  const vals = ALL_ATTRIBUTES.map((a) => Number(scores?.[a.key] || 0)).filter((v) => v > 0);
  return vals.length ? avg(vals) : 0;
}

/**
 * Aggregate a player's final scores from all assessments.
 * @param {string} playerId
 * @param {Array} assessments - all rows from the assessments table
 * @returns {{scores: Object, overall: number, hasData: boolean}}
 */
export function aggregatePlayer(playerId, assessments) {
  const selfRow = assessments.find(
    (a) => a.rater_id === playerId && a.ratee_id === playerId && a.is_self
  );
  const peerRows = assessments.filter(
    (a) => a.ratee_id === playerId && a.rater_id !== playerId
  );

  const scores = {};
  let filledCount = 0;

  SELF_ATTRIBUTES.forEach((attr) => {
    const selfScore = selfRow?.scores?.[attr.key];
    const peerScores = peerRows
      .map((r) => r.scores?.[attr.key])
      .filter((v) => v !== undefined && v !== null);

    let final = 0;
    if (peerScores.length > 0 && selfScore !== undefined) {
      final = Number(selfScore) * SELF_WEIGHT + avg(peerScores) * PEER_WEIGHT;
      filledCount++;
    } else if (peerScores.length > 0) {
      final = avg(peerScores);
      filledCount++;
    } else if (selfScore !== undefined) {
      final = Number(selfScore);
      filledCount++;
    }
    scores[attr.key] = final;
  });

  PEER_ONLY_ATTRIBUTES.forEach((attr) => {
    const peerScores = peerRows
      .map((r) => r.scores?.[attr.key])
      .filter((v) => v !== undefined && v !== null);
    if (peerScores.length > 0) {
      scores[attr.key] = avg(peerScores);
      filledCount++;
    } else {
      scores[attr.key] = 0;
    }
  });

  const overall = overallFromScores(scores);

  return {
    scores,
    overall,
    hasData: filledCount > 0,
    peerCount: peerRows.length,
    hasSelf: !!selfRow,
  };
}
