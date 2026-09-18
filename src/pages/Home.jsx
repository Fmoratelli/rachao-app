import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/Layout.jsx';
import { Logo, TacticalDivider, TacticalDot } from '../components/TacticalMarks.jsx';
import { supabase } from '../lib/supabase.js';
import { UserPlus, LogIn } from 'lucide-react';

const LS_KEY = 'rachao_player_id';

export default function Home() {
  const nav = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const savedId = localStorage.getItem(LS_KEY);
      if (savedId) {
        const { data } = await supabase.from('players').select('id').eq('id', savedId).maybeSingle();
        if (data) { nav('/eu', { replace: true }); return; }
        localStorage.removeItem(LS_KEY);
      }
      const { data, error } = await supabase.from('players').select('id, name').eq('active', true).order('name');
      if (error) setError(error.message);
      else setPlayers(data || []);
      setLoading(false);
    })();
  }, [nav]);

  const pick = (id) => { localStorage.setItem(LS_KEY, id); nav('/eu'); };

  const add = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setAdding(true); setError('');
    const { data, error } = await supabase.from('players').insert({ name }).select('id').single();
    setAdding(false);
    if (error) {
      setError(error.code === '23505'
        ? 'Já tem alguém com esse nome. Bota um apelido pra diferenciar.'
        : error.message);
      return;
    }
    localStorage.setItem(LS_KEY, data.id);
    nav('/eu');
  };

  return (
    <div className="min-h-screen w-full bg-ink font-body text-chalk">
      <div className="w-full max-w-md mx-auto px-4 pt-8 pb-16 overflow-x-clip">
        <div className="text-center mb-6">
          <Logo size={140} />
          <div className="mt-4">
            <div className="font-brush text-orange text-3xl leading-none rotate-brush-3">
              e aí, meia-boca?
            </div>
            <p className="font-body text-sm text-chalk-dim mt-2">
              escolhe teu nome pra começar a avaliar
            </p>
          </div>
        </div>

        <TacticalDivider className="mb-4" />

        {loading ? (
          <div className="text-center py-8 text-chalk-dim text-sm">carregando o elenco...</div>
        ) : (
          <>
            {players.length > 0 && (
              <div className="rounded-lg overflow-hidden border border-line divide-y divide-line mb-6">
                {players.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => pick(p.id)}
                    className="w-full text-left px-4 py-3.5 flex items-center justify-between bg-surface hover:bg-elevated transition-colors group"
                  >
                    <span className="font-display text-lg text-chalk tracking-wide">{p.name}</span>
                    <LogIn size={16} className="text-chalk-dim group-hover:text-orange transition-colors" />
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={add}>
              <div className="flex items-center gap-2 mb-3">
                <TacticalDot size={10} className="text-orange" />
                <div className="text-[11px] font-display uppercase tracking-widest text-chalk-dim">
                  não tô na lista
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="teu nome"
                  maxLength={30}
                  className="flex-1 min-w-0 bg-elevated border border-line rounded px-3 py-3 text-chalk font-body placeholder:text-chalk-dim focus:outline-none focus:border-orange"
                />
                <Button type="submit" variant="primary" disabled={!newName.trim() || adding}>
                  <UserPlus size={16} strokeWidth={3} />
                  {adding ? '...' : 'entrar'}
                </Button>
              </div>
              {error && <p className="mt-2 text-sm text-red-400 font-body">{error}</p>}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
