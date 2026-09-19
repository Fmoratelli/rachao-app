// Posições em quadra. Chaves batem com o check constraint em players
// (schema-positions.sql): 'ataque' | 'meio' | 'defesa'.
export const POSITIONS = [
  { key: 'ataque', label: 'ataque', emoji: '🎯', desc: 'fico mais na frente, gosto de finalizar' },
  { key: 'meio',   label: 'meio',   emoji: '⚙️', desc: 'corro pra tudo quanto é lado' },
  { key: 'defesa', label: 'defesa', emoji: '🛡️', desc: 'fico mais atrás, marcação' },
];

export const positionByKey = (key) => POSITIONS.find((p) => p.key === key) || null;

// "🎯 ataque · ⚙️ meio" — ou '' se não definiu
export function positionLabel(player) {
  const parts = [player?.position_primary, player?.position_secondary]
    .map(positionByKey)
    .filter(Boolean)
    .map((p) => `${p.emoji} ${p.label}`);
  return parts.join(' · ');
}
