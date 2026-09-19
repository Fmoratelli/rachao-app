import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout, Button } from '../components/Layout.jsx';
import { PinInput } from '../components/PinInput.jsx';
import { supabase, PLAYER_COLS } from '../lib/supabase.js';
import { ArrowLeft, LogIn } from 'lucide-react';

const LS_KEY = 'rachao_player_id';

// /entrar/pin?playerId=… — confere o PIN antes de gravar o localStorage.
export default function PinLogin() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const playerId = params.get('playerId');
  const [player, setPlayer] = useState(null);
  const [pin, setPin] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      if (!playerId) { nav('/entrar', { replace: true }); return; }
      const { data } = await supabase.from('players').select(PLAYER_COLS).eq('id', playerId).maybeSingle();
      if (!data || !data.active) { nav('/entrar', { replace: true }); return; }
      if (!data.has_pin) { nav(`/entrar/criar-pin?playerId=${playerId}`, { replace: true }); return; }
      setPlayer(data);
    })();
  }, [playerId]);

  const enter = async (e) => {
    e?.preventDefault();
    if (pin.length !== 4 || checking) return;
    setError(''); setChecking(true);
    const { data: ok, error: rpcErr } = await supabase.rpc('verify_player_pin', { p_player_id: playerId, p_pin: pin });
    setChecking(false);
    if (rpcErr) { setError(rpcErr.message); return; }
    if (ok === null) { nav(`/entrar/criar-pin?playerId=${playerId}`, { replace: true }); return; } // PIN resetado nesse meio tempo
    if (!ok) { setError('PIN incorreto'); setPin(''); return; } // setPin('') refoca a 1ª caixa
    localStorage.setItem(LS_KEY, playerId);
    nav('/eu', { replace: true });
  };

  const esqueci = () => {
    alert('Chama a Fabi pra resetar teu PIN. Ela reseta e você cria um novo no próximo acesso.');
  };

  if (!player) {
    return <Layout><div className="text-center py-12 text-chalk-dim">carregando...</div></Layout>;
  }

  return (
    <Layout>
      <button onClick={() => nav('/entrar')} className="text-chalk-dim hover:text-chalk text-xs font-body flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> voltar
      </button>

      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="font-brush text-orange text-2xl rotate-brush-1">e aí,</span>
        <h2 className="font-display text-3xl text-chalk leading-tight">{player.name}</h2>
      </div>
      <p className="text-sm text-chalk-dim font-body mb-6">digita teu PIN</p>

      <form onSubmit={enter}>
        <div className="bg-elevated border border-line rounded-lg p-4 mb-4">
          <PinInput value={pin} onChange={setPin} autoFocus name="pin" />
        </div>

        {error && <p className="mb-3 text-sm text-red-400 font-body text-center">{error}</p>}

        <Button variant="big" type="submit" disabled={pin.length !== 4 || checking}>
          <LogIn size={18} strokeWidth={3} />
          {checking ? 'conferindo...' : 'entrar'}
        </Button>
      </form>

      <div className="text-center mt-5">
        <button onClick={esqueci} className="text-xs text-chalk-dim hover:text-chalk font-body underline underline-offset-4">
          esqueci meu PIN
        </button>
      </div>
    </Layout>
  );
}
