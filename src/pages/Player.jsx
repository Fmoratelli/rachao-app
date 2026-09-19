import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout, Card } from '../components/Layout.jsx';
import { AssessmentForm } from '../components/AssessmentForm.jsx';
import { TacticalX, TacticalDot } from '../components/TacticalMarks.jsx';
import { supabase, PLAYER_COLS } from '../lib/supabase.js';
import { ChevronRight, MapPin, ArrowLeft, KeyRound } from 'lucide-react';

const LS_KEY = 'rachao_player_id';

export default function Player() {
  const nav = useNavigate();
  const [me, setMe] = useState(null);
  const [players, setPlayers] = useState([]);
  // Só o que a lista precisa: fiz a auto? quem já avaliei? Nenhuma nota fica no cliente.
  const [selfDone, setSelfDone] = useState(false);
  const [ratedIds, setRatedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [assessing, setAssessing] = useState(null); // { target, isSelf, existing, loading }
  const [error, setError] = useState('');

  const myId = localStorage.getItem(LS_KEY);

  const load = async () => {
    if (!myId) { nav('/entrar', { replace: true }); return; }
    setLoading(true);

    const { data: meData } = await supabase.from('players').select(PLAYER_COLS).eq('id', myId).maybeSingle();
    if (!meData) {
      localStorage.removeItem(LS_KEY);
      nav('/entrar', { replace: true });
      return;
    }
    // Migração: quem já tinha localStorage (sem PIN) é obrigada a criar antes de tudo
    if (!meData.has_pin) { nav(`/entrar/criar-pin?playerId=${myId}`, { replace: true }); return; }
    // 1º acesso: escolhe posições antes de ver o dashboard
    if (!meData.position_primary) { nav('/eu/posicoes', { replace: true }); return; }
    setMe(meData);

    const { data: allPlayers } = await supabase.from('players').select('id, name').eq('active', true).order('name');
    setPlayers(allPlayers || []);

    // RPC devolve uma linha: { self_done, rated_ids }
    const { data: progress, error: progressErr } = await supabase.rpc('get_my_progress', { p_rater_id: myId });
    if (progressErr) setError(progressErr.message);
    const row = progress?.[0];
    setSelfDone(!!row?.self_done);
    setRatedIds(new Set(row?.rated_ids || []));

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Abre o form. Se já tem nota salva, busca só essa avaliação antes de montar.
  const startAssessing = async (target, isSelf) => {
    setError('');
    const alreadyRated = isSelf ? selfDone : ratedIds.has(target.id);
    if (!alreadyRated) {
      setAssessing({ target, isSelf, existing: null, loading: false });
      return;
    }
    setAssessing({ target, isSelf, existing: null, loading: true });
    const { data, error: rpcErr } = await supabase.rpc('get_my_assessment', {
      p_rater_id: me.id,
      p_ratee_id: target.id,
    });
    if (rpcErr) setError(rpcErr.message);
    const row = data?.[0];
    setAssessing({ target, isSelf, existing: row ? { scores: row.scores } : null, loading: false });
  };

  // Única porta de escrita: a função valida e faz o upsert. Retorno é void.
  const save = async (scores) => {
    const { target, isSelf } = assessing;
    setError('');
    const { error: rpcErr } = await supabase.rpc('save_my_assessment', {
      p_rater_id: me.id,
      p_ratee_id: target.id,
      p_scores: scores,
      p_is_self: isSelf,
    });
    if (rpcErr) { setError(rpcErr.message); return; }
    if (isSelf) setSelfDone(true);
    else setRatedIds((prev) => new Set([...prev, target.id]));
    setAssessing(null);
  };

  if (loading) {
    return <Layout><div className="text-center py-12 text-chalk-dim">carregando...</div></Layout>;
  }

  if (assessing) {
    if (assessing.loading) {
      return <Layout><div className="text-center py-12 text-chalk-dim">carregando...</div></Layout>;
    }
    return (
      <Layout>
        <button onClick={() => setAssessing(null)} className="text-chalk-dim hover:text-chalk text-xs font-body flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> voltar
        </button>
        <AssessmentForm
          target={assessing.target}
          isSelf={assessing.isSelf}
          existing={assessing.existing}
          raterName={me.name}
          onSave={save}
          onCancel={() => setAssessing(null)}
        />
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </Layout>
    );
  }

  const teammates = players.filter((p) => p.id !== me.id);
  const peersDone = teammates.filter((p) => ratedIds.has(p.id)).length;
  const total = teammates.length + 1;
  const done = (selfDone ? 1 : 0) + peersDone;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Layout>
      <button onClick={() => nav('/')} className="text-chalk-dim hover:text-chalk text-xs font-body flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> voltar
      </button>

      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-[10px] text-chalk-dim font-display uppercase tracking-widest">e aí</div>
          <div className="font-display text-3xl text-chalk leading-tight">{me.name}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Link to="/eu/posicoes" className="text-chalk-dim hover:text-orange p-2 pb-0 text-xs flex items-center gap-1 font-body whitespace-nowrap">
            <MapPin size={12} /> editar posições
          </Link>
          <Link to="/eu/trocar-pin" className="text-chalk-dim hover:text-orange p-2 pt-0 text-xs flex items-center gap-1 font-body whitespace-nowrap">
            <KeyRound size={12} /> trocar PIN
          </Link>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-400 font-body">{error}</p>}

      {/* Progress in chunks */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-2 font-body text-chalk-dim">
            <TacticalDot size={8} className="text-orange" />
            progresso
          </div>
          <span className="font-mono text-chalk">{done}/{total} · {pct}%</span>
        </div>
        <div className="flex gap-1 h-3">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 rounded-sm ${i < done ? 'bg-orange' : 'bg-elevated'}`}
              style={i < done ? { boxShadow: '0 0 0 1px rgba(255,132,16,0.3) inset' } : {}}
            />
          ))}
        </div>
      </div>

      {/* Self */}
      <div className="mb-5">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="font-mono text-orange text-xs">01</span>
          <span className="text-[11px] font-display uppercase tracking-widest text-chalk-dim">teu jogo</span>
        </div>
        <PlayerRow
          player={me}
          done={selfDone}
          label={selfDone ? 'auto-avaliação feita' : 'fazer auto-avaliação'}
          onClick={() => startAssessing(me, true)}
        />
      </div>

      {/* Peers */}
      <div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="font-mono text-orange text-xs">02</span>
          <span className="text-[11px] font-display uppercase tracking-widest text-chalk-dim">as coleguinhas</span>
        </div>
        {teammates.length === 0 ? (
          <Card className="p-4 text-chalk-dim text-sm text-center">
            aguardando as outras se cadastrarem...
          </Card>
        ) : (
          <div className="space-y-2">
            {teammates.map((p) => (
              <PlayerRow
                key={p.id}
                player={p}
                done={ratedIds.has(p.id)}
                onClick={() => startAssessing(p, false)}
              />
            ))}
          </div>
        )}
      </div>

      {pct === 100 && (
        <div className="mt-6 border border-orange bg-orange/10 rounded-lg p-4 text-center">
          <div className="font-display text-orange text-lg uppercase tracking-widest">tá pronto!</div>
          <div className="font-brush text-chalk-dim text-lg mt-1 rotate-brush-1">
            agora é só esperar o próximo rachão
          </div>
        </div>
      )}
    </Layout>
  );
}

function PlayerRow({ player, done, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3.5 py-3 rounded border transition-all flex items-center justify-between ${
        done
          ? 'bg-orange/8 border-orange/40 hover:border-orange'
          : 'bg-elevated border-line hover:border-chalk-dim'
      }`}
      style={done ? { backgroundColor: 'rgba(255,132,16,0.08)', borderColor: 'rgba(255,132,16,0.4)' } : {}}
    >
      <div className="flex items-center gap-3">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
          done ? 'bg-orange text-ink' : 'border border-line'
        }`}>
          {done && <TacticalX size={14} className="text-ink" />}
        </div>
        <span className="font-display text-lg text-chalk tracking-wide">
          {label || player.name}
        </span>
      </div>
      <ChevronRight size={16} className="text-chalk-dim" />
    </button>
  );
}
