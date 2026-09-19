import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Button } from '../components/Layout.jsx';
import { TacticalDot } from '../components/TacticalMarks.jsx';
import { supabase } from '../lib/supabase.js';
import { POSITIONS } from '../lib/positions.js';
import { Check } from 'lucide-react';

const LS_KEY = 'rachao_player_id';

function PositionButton({ emoji, label, selected, disabled, onClick, quiet = false, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded border px-2 py-3 font-display uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-colors ${
        selected
          ? (quiet ? 'bg-elevated border-orange text-orange' : 'bg-orange border-orange text-ink')
          : disabled
            ? 'bg-surface border-line text-line cursor-not-allowed'
            : 'bg-elevated border-line text-chalk hover:border-orange'
      } ${className}`}
    >
      <span className="text-base">{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <TacticalDot size={8} className="text-orange" />
      <span className="text-[11px] font-display uppercase tracking-widest text-chalk-dim">{children}</span>
    </div>
  );
}

// 1º acesso (position_primary null) ou edição via link no /eu.
export default function Posicoes() {
  const nav = useNavigate();
  const myId = localStorage.getItem(LS_KEY);
  const [loading, setLoading] = useState(true);
  const [primary, setPrimary] = useState(null);
  const [secondary, setSecondary] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      if (!myId) { nav('/entrar', { replace: true }); return; }
      // select('*') tolera o banco ainda sem as colunas de posição
      const { data } = await supabase.from('players').select('*').eq('id', myId).maybeSingle();
      if (!data) { localStorage.removeItem(LS_KEY); nav('/entrar', { replace: true }); return; }
      setPrimary(data.position_primary || null);
      setSecondary(data.position_secondary || null);
      setLoading(false);
    })();
  }, []);

  const pickPrimary = (key) => {
    setPrimary(key);
    if (secondary === key) setSecondary(null); // a UI garante que não são iguais
  };

  const save = async () => {
    setError(''); setSaving(true);
    const { error: rpcErr } = await supabase.rpc('save_my_positions', {
      p_player_id: myId,
      p_primary: primary,
      p_secondary: secondary,
    });
    setSaving(false);
    if (rpcErr) { setError(rpcErr.message); return; }
    nav('/eu', { replace: true });
  };

  if (loading) {
    return <Layout><div className="text-center py-12 text-chalk-dim">carregando...</div></Layout>;
  }

  return (
    <Layout>
      <h2 className="font-display text-3xl text-chalk leading-tight">onde tu joga?</h2>
      <p className="text-sm text-chalk-dim font-body mb-5">
        escolhe tua posição principal e uma secundária (se rolar)
      </p>

      <div className="bg-elevated border border-line rounded-lg p-4 mb-4">
        <SectionTitle>principal</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {POSITIONS.map((p) => (
            <PositionButton
              key={p.key}
              emoji={p.emoji}
              label={p.label}
              selected={primary === p.key}
              onClick={() => pickPrimary(p.key)}
            />
          ))}
        </div>
      </div>

      <div className="bg-elevated border border-line rounded-lg p-4 mb-4">
        <SectionTitle>secundária (opcional)</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {POSITIONS.map((p) => (
            <PositionButton
              key={p.key}
              emoji={p.emoji}
              label={p.label}
              selected={secondary === p.key}
              disabled={primary === p.key}
              onClick={() => setSecondary(p.key)}
            />
          ))}
          <PositionButton
            emoji="✗"
            label="nenhuma"
            selected={secondary === null}
            quiet
            onClick={() => setSecondary(null)}
            className="col-span-3 py-2 text-xs"
          />
        </div>
      </div>

      <div className="bg-surface border border-line rounded-lg p-4 mb-5 space-y-1.5">
        {POSITIONS.map((p) => (
          <div key={p.key} className="text-sm font-body text-chalk-dim">
            <span className="mr-1">{p.emoji}</span>
            <span className="text-chalk">{p.label}</span> — {p.desc}
          </div>
        ))}
      </div>

      <Button variant="big" onClick={save} disabled={!primary || saving}>
        <Check size={18} strokeWidth={3.5} />
        {saving ? 'salvando...' : 'salvar e continuar'}
      </Button>
      {error && <p className="mt-3 text-sm text-red-400 font-body">{error}</p>}
    </Layout>
  );
}
