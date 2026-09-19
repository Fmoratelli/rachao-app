import React, { useState } from 'react';
import { Button } from './Layout.jsx';
import { TeamsView } from './TeamsView.jsx';
import { TacticalX } from './TacticalMarks.jsx';
import { drawTeams } from '../lib/teamDraw.js';
import { Shuffle } from 'lucide-react';

// Marcar presença + sortear. Usado no /sortear (público) e no /admin.
// Não mostra nota nenhuma na lista de presença — só nome + check.
// players: [{ id, name, scores, overall, hasData, position_primary?, position_secondary? }]
export function Draw({ players, showScores = false }) {
  const [presentIds, setPresentIds] = useState(new Set());
  const [teams, setTeams] = useState(null);

  const ready = players.filter((p) => p.hasData);

  const toggle = (id) => {
    const s = new Set(presentIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setPresentIds(s);
    setTeams(null);
  };
  const selectAll = () => { setPresentIds(new Set(ready.map((p) => p.id))); setTeams(null); };
  const selectNone = () => { setPresentIds(new Set()); setTeams(null); };

  const present = ready.filter((p) => presentIds.has(p.id));
  const semPosicao = present.filter((p) => !p.position_primary).length;
  const draw = () => setTeams(drawTeams(present));

  if (ready.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-chalk-dim font-body text-sm">ninguém foi avaliada ainda.</div>
        <div className="font-brush text-orange text-lg mt-1 rotate-brush-1">espera a galera preencher</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-sm uppercase tracking-widest text-chalk-dim">quem veio</div>
        <div className="flex gap-2 text-xs">
          <button onClick={selectAll} className="text-chalk-dim hover:text-chalk font-body">todas</button>
          <span className="text-line">·</span>
          <button onClick={selectNone} className="text-chalk-dim hover:text-chalk font-body">nenhuma</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {ready.map((p) => {
          const on = presentIds.has(p.id);
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`text-left px-3 py-2.5 rounded border transition-colors font-body text-sm flex items-center gap-2 ${
                on ? 'border-orange text-chalk' : 'bg-elevated border-line text-chalk-dim hover:text-chalk'
              }`}
              style={on ? { backgroundColor: 'rgba(255,132,16,0.10)' } : {}}
            >
              <div className={`w-4 h-4 rounded-sm flex-shrink-0 flex items-center justify-center ${
                on ? 'bg-orange' : 'border border-line'
              }`}>
                {on && <TacticalX size={11} className="text-ink" />}
              </div>
              <span className="truncate">{p.name}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mb-4 text-sm font-body text-chalk-dim">
        <span>{present.length} selecionada{present.length !== 1 ? 's' : ''}</span>
        {present.length > 0 && present.length < 2 && <span>mínimo 2</span>}
        {semPosicao > 0 && present.length >= 2 && (
          <span className="text-xs">{semPosicao} sem posição (entra{semPosicao !== 1 ? 'm' : ''} só pela força)</span>
        )}
      </div>

      <Button variant="big" onClick={draw} disabled={present.length < 2}>
        <Shuffle size={20} strokeWidth={3} />
        {teams ? 'sortear de novo' : 'sortear times'}
      </Button>

      {teams && <TeamsView teams={teams} showScores={showScores} />}
    </div>
  );
}
