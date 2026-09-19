import React, { useState, useEffect } from 'react';
import { ScoreInput } from './ScoreInput.jsx';
import { Button } from './Layout.jsx';
import { TacticalDot } from './TacticalMarks.jsx';
import { SELF_ATTRIBUTES, PEER_ONLY_ATTRIBUTES } from '../lib/attributes.js';
import { Check } from 'lucide-react';

const GUIDE = [
  { range: '0-3',  text: 'ponto fraco mesmo' },
  { range: '4-6',  text: 'meia boca' },
  { range: '7-8',  text: 'resenha alto nível' },
  { range: '9-10', text: 'elite da resenha' },
];

export function AssessmentForm({ target, isSelf, existing, onSave, onCancel }) {
  const attrs = isSelf ? SELF_ATTRIBUTES : [...SELF_ATTRIBUTES, ...PEER_ONLY_ATTRIBUTES];
  const [scores, setScores] = useState(
    existing?.scores || attrs.reduce((o, a) => ({ ...o, [a.key]: 5 }), {})
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setScores(existing?.scores || attrs.reduce((o, a) => ({ ...o, [a.key]: 5 }), {}));
  }, [target?.id]);

  const submit = async () => {
    setSaving(true);
    try { await onSave(scores); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="mb-5">
        <div className="text-[10px] text-chalk-dim font-display uppercase tracking-widest">
          {isSelf ? 'auto-avaliação' : 'avaliando'}
        </div>
        <div className="font-display text-3xl text-chalk leading-tight">{target.name}</div>
        {isSelf && (
          <div className="font-brush text-orange text-lg mt-1 rotate-brush-1">
            sem se achar, hein 😅
          </div>
        )}
      </div>

      {/* Guia rápido de notas */}
      <div className="bg-elevated border border-line rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <TacticalDot size={8} className="text-orange" />
          <span className="text-[11px] font-display uppercase tracking-widest text-chalk-dim">
            guia rápido
          </span>
        </div>
        <div className="font-brush text-orange text-lg rotate-brush-1 mb-3">
          as notas são pro nível do NOSSO rachão:
        </div>
        <div className="space-y-1.5">
          {GUIDE.map((g) => (
            <div key={g.range} className="flex items-baseline gap-3 text-sm font-body text-chalk">
              <span className="font-mono text-orange w-10 flex-shrink-0">{g.range}</span>
              <span>{g.text}</span>
            </div>
          ))}
        </div>
        <div className="font-brush text-orange text-xl text-center rotate-brush-1 mt-4">
          10 não é Marta — é o teto Meia Boca Jrs 😜
        </div>
        <div className="text-xs text-chalk-dim font-body text-center mt-3">
          seja honesta — quanto mais real, mais parelho o jogo
        </div>
      </div>

      <div className="bg-elevated border border-line rounded-lg p-4 space-y-4">
        {attrs.map((attr) => (
          <ScoreInput
            key={attr.key}
            label={attr.label}
            short={attr.short}
            desc={attr.desc}
            value={scores[attr.key] ?? 5}
            onChange={(v) => setScores((s) => ({ ...s, [attr.key]: v }))}
          />
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            voltar
          </Button>
        )}
        <Button variant="big" onClick={submit} disabled={saving} className="ml-auto">
          <Check size={18} strokeWidth={3.5} />
          {saving ? 'salvando...' : existing ? 'atualizar' : 'salvar'}
        </Button>
      </div>
    </div>
  );
}
