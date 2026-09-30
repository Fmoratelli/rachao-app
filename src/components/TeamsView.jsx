import React from 'react';
import { TacticalX, TacticalArrow, TacticalDot } from './TacticalMarks.jsx';
import { SELF_ATTRIBUTES } from '../lib/attributes.js';
import { positionLabel } from '../lib/positions.js';

const TEAM_NAME = { a: 'laranja', b: 'preto' };

// showScores: mini-perfil de siglas por jogadora (só no admin).
// Na página pública mostra só nome + posições.
export function TeamsView({ teams, showScores = false }) {
  const diff = Math.abs(teams.sumA - teams.sumB);
  const label = diff < 0.5 ? 'muito parelho' : diff < 1.5 ? 'parelho' : 'aceitável';
  const reserva = teams.reserva;
  const reservaId = reserva?.jogadora?.id ?? null;

  return (
    <div className="mt-6">
      <TeamCard title={TEAM_NAME.a} players={teams.a} sum={teams.sumA} variant="orange"
                showScores={showScores} reservaId={reservaId} />

      <div className="flex items-center justify-center my-3 gap-3">
        <TacticalArrow className="text-orange rotate-180" />
        <span className="font-display text-2xl text-chalk-dim">×</span>
        <TacticalArrow className="text-orange" />
      </div>

      <TeamCard title={TEAM_NAME.b} players={teams.b} sum={teams.sumB} variant="black"
                showScores={showScores} reservaId={reservaId} />

      {reserva && (
        <div className="mt-4 font-brush text-orange text-xl text-center leading-tight rotate-brush-1">
          ⚡ {reserva.jogadora.name} começa no {TEAM_NAME[reserva.time_maior]} e reveza
          com o {TEAM_NAME[reserva.time_menor]} no 2º tempo
        </div>
      )}

      <div className="mt-5 bg-elevated border border-line rounded-lg p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 font-body text-chalk-dim">
            <TacticalDot size={10} className="text-orange" />
            equilíbrio
          </div>
          <div className="font-mono text-chalk">
            {label} · {diff.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamCard({ title, players, sum, variant, showScores, reservaId }) {
  // Cores das camisas do time: laranja e preto. O preto usa cabeçalho preto
  // com borda clara pra continuar legível no fundo escuro.
  const isOrange = variant === 'orange';
  return (
    <div className={`border-2 ${isOrange ? 'border-orange' : 'border-chalk'} rounded-lg overflow-hidden`}>
      <div className={`${isOrange ? 'bg-orange text-ink' : 'bg-ink text-chalk border-b-2 border-chalk'} px-4 py-2.5 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <TacticalX size={16} className="opacity-70" />
          <span className="font-display uppercase tracking-widest text-base">{title}</span>
        </div>
        <div className="font-mono font-bold text-lg">{sum.toFixed(1)}</div>
      </div>
      <div className="bg-elevated divide-y divide-line">
        {[...players].sort((a, b) => b.overall - a.overall).map((p) => {
          const pos = positionLabel(p);
          const isReserva = p.id === reservaId;
          return (
            <div key={p.id} className="px-4 py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <div className="font-display text-base text-chalk tracking-wide">
                  {isReserva && <span className="mr-1">🔄</span>}
                  {p.name}
                  {isReserva && (
                    <span className="ml-1.5 font-body text-[11px] text-orange">(revezamento)</span>
                  )}
                </div>
                <div className="font-body text-xs text-chalk-dim whitespace-nowrap">{pos || 'sem posição'}</div>
              </div>
              {showScores && (
                <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 mt-0.5 font-mono text-xs text-chalk-dim">
                  {SELF_ATTRIBUTES.map((a, i) => (
                    <span key={a.key} className="whitespace-nowrap">
                      {a.short} {Math.round(p.scores[a.key] || 0)}{i < SELF_ATTRIBUTES.length - 1 && <span className="ml-1.5 opacity-50">·</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
