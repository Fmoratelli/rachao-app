import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Button } from '../components/Layout.jsx';
import { PinInput } from '../components/PinInput.jsx';
import { supabase, PLAYER_COLS } from '../lib/supabase.js';
import { ArrowLeft, Check } from 'lucide-react';

const LS_KEY = 'rachao_player_id';

// /eu/trocar-pin — exige o PIN atual.
export default function TrocarPin() {
  const nav = useNavigate();
  const myId = localStorage.getItem(LS_KEY);
  const [player, setPlayer] = useState(null);
  const [atual, setAtual] = useState('');
  const [novo, setNovo] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      if (!myId) { nav('/entrar', { replace: true }); return; }
      const { data } = await supabase.from('players').select(PLAYER_COLS).eq('id', myId).maybeSingle();
      if (!data) { localStorage.removeItem(LS_KEY); nav('/entrar', { replace: true }); return; }
      if (!data.has_pin) { nav(`/entrar/criar-pin?playerId=${myId}`, { replace: true }); return; }
      setPlayer(data);
    })();
  }, []);

  const mismatch = novo.length === 4 && confirm.length === 4 && novo !== confirm;
  const ready = atual.length === 4 && novo.length === 4 && confirm.length === 4 && novo === confirm;

  const save = async (e) => {
    e?.preventDefault();
    if (!ready || saving) return;
    setError(''); setSaving(true);
    const { error: rpcErr } = await supabase.rpc('change_player_pin', {
      p_player_id: myId, p_current_pin: atual, p_new_pin: novo,
    });
    setSaving(false);
    if (rpcErr) {
      setError(/atual incorreto/i.test(rpcErr.message) ? 'PIN atual incorreto' : rpcErr.message);
      setAtual('');
      return;
    }
    setDone(true);
    setTimeout(() => nav('/eu', { replace: true }), 900);
  };

  if (!player) {
    return <Layout><div className="text-center py-12 text-chalk-dim">carregando...</div></Layout>;
  }

  return (
    <Layout>
      <button onClick={() => nav('/eu')} className="text-chalk-dim hover:text-chalk text-xs font-body flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> voltar
      </button>

      <div className="text-[10px] text-orange font-display uppercase tracking-widest">{player.name}</div>
      <h2 className="font-display text-3xl text-chalk leading-tight mb-6">trocar PIN</h2>

      {done ? (
        <div className="border border-orange bg-orange/10 rounded-lg p-4 text-center">
          <div className="font-display text-orange text-lg uppercase tracking-widest">PIN atualizado</div>
        </div>
      ) : (
        <form onSubmit={save}>
          <div className="bg-elevated border border-line rounded-lg p-4 mb-4">
            <div className="text-[11px] font-display uppercase tracking-widest text-chalk-dim mb-3">PIN atual:</div>
            <PinInput value={atual} onChange={setAtual} autoFocus name="atual" />
          </div>
          <div className="bg-elevated border border-line rounded-lg p-4 mb-4">
            <div className="text-[11px] font-display uppercase tracking-widest text-chalk-dim mb-3">novo PIN:</div>
            <PinInput value={novo} onChange={setNovo} name="novo" />
          </div>
          <div className="bg-elevated border border-line rounded-lg p-4 mb-4">
            <div className="text-[11px] font-display uppercase tracking-widest text-chalk-dim mb-3">confirma novo:</div>
            <PinInput value={confirm} onChange={setConfirm} name="confirma" />
          </div>

          {mismatch && <p className="mb-3 text-sm text-red-400 font-body text-center">os PINs não são iguais</p>}
          {error && <p className="mb-3 text-sm text-red-400 font-body text-center">{error}</p>}

          <Button variant="big" type="submit" disabled={!ready || saving}>
            <Check size={18} strokeWidth={3.5} />
            {saving ? 'salvando...' : 'salvar'}
          </Button>
        </form>
      )}
    </Layout>
  );
}
