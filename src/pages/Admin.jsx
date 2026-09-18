import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Button, Card } from '../components/Layout.jsx';
import { TeamsView } from '../components/TeamsView.jsx';
import { TacticalX, TacticalDot } from '../components/TacticalMarks.jsx';
import { supabase } from '../lib/supabase.js';
import { aggregatePlayer, ALL_ATTRIBUTES } from '../lib/attributes.js';
import { drawTeams } from '../lib/teamDraw.js';
import { Users, Shuffle, ClipboardList, Check, Trash2, LogOut, Link as LinkIcon, Copy } from 'lucide-react';

export default function Admin() {
  const nav = useNavigate();
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState('elenco');
  const [players, setPlayers] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { nav('/admin/login', { replace: true }); return; }
      setSession(data.session);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) nav('/admin/login', { replace: true });
      else setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [nav]);

  const load = async () => {
    setLoading(true);
    const [pRes, aRes] = await Promise.all([
      supabase.from('players').select('id, name, active').order('name'),
      supabase.from('assessments').select('*'),
    ]);
    setPlayers(pRes.data || []);
    setAssessments(aRes.data || []);
    setLoading(false);
  };

  useEffect(() => { if (session) load(); }, [session]);

  const logout = async () => { await supabase.auth.signOut(); };

  if (!session || loading) {
    return <Layout><div className="text-center py-12 text-chalk-dim">carregando...</div></Layout>;
  }

  const activePlayers = players.filter((p) => p.active !== false);
  const aggregated = activePlayers.map((p) => ({ ...p, ...aggregatePlayer(p.id, assessments) }));

  return (
    <Layout>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-[10px] text-orange font-display uppercase tracking-widest">painel do técnico</div>
            <TacticalDot size={8} className="text-orange" />
          </div>
          <div className="font-display text-3xl text-chalk leading-tight">
            {tab === 'elenco' ? 'elenco' : 'sortear times'}
          </div>
          <div className="text-[10px] text-chalk-dim font-body mt-1">{session.user.email}</div>
        </div>
        <button onClick={logout} className="text-chalk-dim hover:text-chalk p-2 text-xs flex items-center gap-1">
          <LogOut size={14} /> sair
        </button>
      </div>

      <div className="grid grid-cols-2 border border-line rounded-lg overflow-hidden mb-5">
        <TabButton active={tab === 'elenco'} onClick={() => setTab('elenco')}
                   icon={<ClipboardList size={14} />} label={`elenco (${activePlayers.length})`} />
        <TabButton active={tab === 'sorteio'} onClick={() => setTab('sorteio')}
                   icon={<Users size={14} />} label="sortear" borderLeft />
      </div>

      {tab === 'elenco'
        ? <Roster players={aggregated} assessments={assessments} onChange={load} />
        : <Draw players={aggregated} />
      }
    </Layout>
  );
}

function TabButton({ active, onClick, icon, label, borderLeft }) {
  return (
    <button
      onClick={onClick}
      className={`py-3 font-display uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-colors ${
        active ? 'bg-elevated text-chalk' : 'text-chalk-dim hover:text-chalk'
      } ${borderLeft ? 'border-l border-line' : ''}`}
    >
      {icon} {label}
    </button>
  );
}

function Roster({ players, assessments, onChange }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = window.location.origin + '/';

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const remove = async (p) => {
    if (!confirm(`Remover ${p.name}? As avaliações também apagam.`)) return;
    await supabase.from('players').delete().eq('id', p.id);
    onChange();
  };

  const sorted = [...players].sort((a, b) => b.overall - a.overall);

  return (
    <div>
      <div className="bg-elevated border border-line rounded-lg p-3 mb-5 flex items-center gap-3">
        <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
             style={{ backgroundColor: 'rgba(255,132,16,0.15)' }}>
          <LinkIcon size={14} className="text-orange" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-chalk-dim font-display uppercase tracking-widest">link pra galera</div>
          <div className="font-mono text-xs text-chalk truncate">{shareUrl}</div>
        </div>
        <button onClick={copyLink} className="p-2 text-chalk-dim hover:text-orange">
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-chalk-dim font-body text-sm">ninguém cadastrado ainda.</div>
          <div className="font-brush text-orange text-lg mt-1 rotate-brush-1">
            manda o link no zap
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((p, i) => (
            <PlayerCard key={p.id} player={p} rank={i + 1} onRemove={() => remove(p)} />
          ))}
        </div>
      )}

      <div className="mt-6 text-xs text-chalk-dim font-body flex items-center gap-2">
        <TacticalDot size={8} className="text-orange" />
        total de avaliações: <span className="font-mono text-chalk">{assessments.length}</span>
      </div>
    </div>
  );
}

function PlayerCard({ player, rank, onRemove }) {
  const p = player;
  return (
    <div className="bg-elevated border border-line rounded-lg p-3.5">
      <div className="flex items-start gap-3">
        <div className="font-mono text-chalk-dim text-xs pt-1 w-5">
          {String(rank).padStart(2, '0')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <div className="font-display text-lg text-chalk truncate">{p.name}</div>
            <div className="font-mono text-3xl text-orange leading-none">
              {p.hasData ? p.overall.toFixed(1) : '—'}
            </div>
          </div>
          <div className="text-[10px] text-chalk-dim font-body mt-0.5">
            {p.hasSelf ? '✓ auto' : '⋯ sem auto'} · {p.peerCount} coleguinha{p.peerCount === 1 ? '' : 's'} avaliaram
          </div>
          {p.hasData && (
            <div className="grid grid-cols-5 gap-1 mt-2.5">
              {ALL_ATTRIBUTES.map((a) => (
                <div key={a.key} className="text-center">
                  <div className="text-[8px] font-display text-chalk-dim tracking-wider">{a.short}</div>
                  <div className="font-mono text-[11px] text-chalk mt-0.5">
                    {(p.scores[a.key] || 0).toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={onRemove} className="text-chalk-dim hover:text-red-400 p-1">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function Draw({ players }) {
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
  const draw = () => setTeams(drawTeams(present));

  if (ready.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-chalk-dim font-body text-sm">
          ninguém foi avaliado ainda.
        </div>
        <div className="font-brush text-orange text-lg mt-1 rotate-brush-1">
          espera a galera preencher
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-sm uppercase tracking-widest text-chalk-dim">quem veio</div>
        <div className="flex gap-2 text-xs">
          <button onClick={selectAll} className="text-chalk-dim hover:text-chalk font-body">todos</button>
          <span className="text-line">·</span>
          <button onClick={selectNone} className="text-chalk-dim hover:text-chalk font-body">nenhum</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {ready.map((p) => {
          const on = presentIds.has(p.id);
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`text-left px-3 py-2 rounded border transition-colors font-body text-sm flex items-center gap-2 ${
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
              <span className="ml-auto font-mono text-[11px] text-chalk-dim">{p.overall.toFixed(1)}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mb-4 text-sm font-body text-chalk-dim">
        <span>{present.length} selecionado{present.length !== 1 ? 's' : ''}</span>
        {present.length > 0 && present.length < 2 && <span>mínimo 2</span>}
      </div>

      <Button variant="big" onClick={draw} disabled={present.length < 2}>
        <Shuffle size={20} strokeWidth={3} />
        {teams ? 'sortear de novo' : 'sortear times'}
      </Button>

      {teams && <TeamsView teams={teams} />}
    </div>
  );
}
