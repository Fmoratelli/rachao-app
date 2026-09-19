import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout, Button } from '../components/Layout.jsx';
import { PinInput } from '../components/PinInput.jsx';
import { supabase, PLAYER_COLS } from '../lib/supabase.js';
import { ArrowLeft, Check } from 'lucide-react';

const LS_KEY = 'rachao_player_id';

// /entrar/criar-pin?playerId=… — 1ª vez (ou depois de reset pela técnica).
// Só grava o localStorage DEPOIS do PIN criado.
export default function CriarPin() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const playerId = params.get('playerId');
  const [player, setPlayer] = useState(null);
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      if (!playerId) { nav('/entrar', { replace: true }); return; }
      const { data } = await supabase.from('players').select(PLAYER_COLS).eq('id', playerId).maybeSingle();
      if (!data || !data.active) { nav('/entrar', { replace: true }); return; }
      if (data.has_pin) { nav(`/entrar/pin?playerId=${playerId}`, { replace: true }); return; }
      setPlayer(data);
    })();
  }, [playerId]);

  const mismatch = pin.length === 4 && confirm.length === 4 && pin !== confirm;
  const ready = pin.length === 4 && confirm.length === 4 && pin === confirm;

  const save = async (e) => {
    e?.preventDefault();
    if (!ready || saving) return;
    setError(''); setSaving(true);
    const { error: rpcErr } = await supabase.rpc('set_player_pin', { p_player_id: playerId, p_pin: pin });
    setSaving(false);
    if (rpcErr) { setError(rpcErr.message); return; }
    localStorage.setItem(LS_KEY, playerId);
    nav('/eu', { replace: true });
  };

  if (!player) {
    return <Layout><div className="text-center py-12 text-chalk-dim">carregando...</div></Layout>;
  }

  return (
    <Layout>
      <button onClick={() => nav('/entrar')} className="text-chalk-dim hover:text-chalk text-xs font-body flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> voltar
      </button>

      <div className="text-[10px] text-orange font-display uppercase tracking-widest">{player.name}</div>
      <h2 className="font-display text-3xl text-chalk leading-tight">cria teu PIN</h2>
      <p className="text-sm text-chalk-dim font-body mb-6">
        4 dígitos que só tu sabe. Vai usar toda vez que entrar.
      </p>

      <form onSubmit={save}>
        <div className="bg-elevated border border-line rounded-lg p-4 mb-4">
          <div className="text-[11px] font-display uppercase tracking-widest text-chalk-dim mb-3">novo PIN</div>
          <PinInput value={pin} onChange={setPin} autoFocus name="novo" />
        </div>

        <div className="bg-elevated border border-line rounded-lg p-4 mb-4">
          <div className="text-[11px] font-display uppercase tracking-widest text-chalk-dim mb-3">confirma:</div>
          <PinInput value={confirm} onChange={setConfirm} name="confirma" />
        </div>

        {mismatch && <p className="mb-3 text-sm text-red-400 font-body text-center">os PINs não são iguais</p>}
        {error && <p className="mb-3 text-sm text-red-400 font-body text-center">{error}</p>}

        <Button variant="big" type="submit" disabled={!ready || saving}>
          <Check size={18} strokeWidth={3.5} />
          {saving ? 'salvando...' : 'criar PIN'}
        </Button>
      </form>
    </Layout>
  );
}
