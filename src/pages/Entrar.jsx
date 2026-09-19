import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Button } from '../components/Layout.jsx';
import { TacticalDot } from '../components/TacticalMarks.jsx';
import { supabase, PLAYER_COLS } from '../lib/supabase.js';
import { UserPlus, LogIn, ArrowLeft } from 'lucide-react';

// Escolher (ou cadastrar) o nome. Daqui vai pro PIN (criar ou digitar) — o
// localStorage só é gravado depois do PIN. O /eu cuida do 1º acesso (posições).
export default function Entrar() {
  const nav = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('players').select(PLAYER_COLS).eq('active', true).order('name');
      if (error) setError(error.message);
      else setPlayers(data || []);
      setLoading(false);
    })();
  }, []);

  const pick = (p) => nav(p.has_pin ? `/entrar/pin?playerId=${p.id}` : `/entrar/criar-pin?playerId=${p.id}`);

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
    nav(`/entrar/criar-pin?playerId=${data.id}`);
  };

  return (
    <Layout>
      <button onClick={() => nav('/')} className="text-chalk-dim hover:text-chalk text-xs font-body flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> voltar
      </button>

      <h2 className="font-display text-3xl text-chalk leading-tight">qual meia boca tu é?</h2>
      <p className="text-sm text-chalk-dim font-body mb-5">clica no teu nome pra entrar</p>

      {loading ? (
        <div className="text-center py-8 text-chalk-dim text-sm">carregando o elenco...</div>
      ) : (
        <>
          {players.length > 0 && (
            <div className="rounded-lg overflow-hidden border border-line divide-y divide-line mb-6">
              {players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => pick(p)}
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
              <span className="text-[11px] font-display uppercase tracking-widest text-chalk-dim">não tô na lista</span>
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
    </Layout>
  );
}
