import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout.jsx';
import { Draw } from '../components/Draw.jsx';
import { supabase } from '../lib/supabase.js';
import { SELF_WEIGHT, PEER_WEIGHT, overallFromScores } from '../lib/attributes.js';
import { ArrowLeft } from 'lucide-react';

// Sorteio público: sem login nem localStorage. As notas vêm já combinadas
// da RPC get_draw_profiles (pesos passados daqui) e não aparecem na tela.
export default function Sortear() {
  const nav = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error: rpcErr } = await supabase.rpc('get_draw_profiles', {
        p_self_weight: SELF_WEIGHT,
        p_peer_weight: PEER_WEIGHT,
      });
      if (rpcErr) setError(rpcErr.message);
      setPlayers((data || []).map((p) => ({
        ...p,
        hasData: !!p.has_data,
        overall: overallFromScores(p.scores),
      })));
      setLoading(false);
    })();
  }, []);

  return (
    <Layout>
      <button onClick={() => nav('/')} className="text-chalk-dim hover:text-chalk text-xs font-body flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> voltar
      </button>

      <h2 className="font-display text-3xl text-chalk leading-tight">quem joga hoje?</h2>
      <p className="text-sm text-chalk-dim font-body mb-5">marca as presenças e sorteia</p>

      {error && <p className="mb-4 text-sm text-red-400 font-body">{error}</p>}

      {loading
        ? <div className="text-center py-12 text-chalk-dim">carregando...</div>
        : <Draw players={players} />
      }
    </Layout>
  );
}
