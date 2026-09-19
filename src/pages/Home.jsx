import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Layout.jsx';
import { Logo, TacticalDivider } from '../components/TacticalMarks.jsx';
import { supabase } from '../lib/supabase.js';
import { Shuffle, ClipboardList } from 'lucide-react';

const LS_KEY = 'rachao_player_id';

// Botão de duas linhas: título em display + subtítulo pequeno
function BigButton({ variant, title, subtitle, icon, onClick }) {
  return (
    <Button
      variant={variant}
      onClick={onClick}
      className={variant === 'outline' ? 'w-full py-4 text-base' : ''}
    >
      {icon}
      <span className="flex flex-col items-start leading-tight">
        <span>{title}</span>
        <span className="font-body normal-case tracking-normal text-[11px] opacity-70">{subtitle}</span>
      </span>
    </Button>
  );
}

export default function Home() {
  const nav = useNavigate();
  const [checking, setChecking] = useState(true);
  const [me, setMe] = useState(null); // { id, name } quando reconhecida

  useEffect(() => {
    (async () => {
      const savedId = localStorage.getItem(LS_KEY);
      if (savedId) {
        const { data } = await supabase.from('players').select('name').eq('id', savedId).maybeSingle();
        if (data) setMe({ id: savedId, name: data.name });
        else localStorage.removeItem(LS_KEY); // jogadora removida → modo visitante
      }
      setChecking(false);
    })();
  }, []);

  const trocarNome = () => {
    localStorage.removeItem(LS_KEY);
    window.location.reload();
  };

  return (
    <div className="min-h-screen w-full bg-ink font-body text-chalk">
      <div className="w-full max-w-md mx-auto px-4 pt-8 pb-16 overflow-x-clip">
        <div className="text-center mb-6">
          <Logo size={140} />
          <div className="mt-4 font-brush text-orange text-3xl leading-none rotate-brush-3">
            {checking ? '\u00a0' : me ? `e aí, ${me.name}!` : 'e aí, meia boca?'}
          </div>
        </div>

        <TacticalDivider className="mb-6" />

        {!checking && (
          <div className="space-y-3">
            <BigButton
              variant="big"
              icon={<Shuffle size={20} strokeWidth={3} />}
              title="sortear times"
              subtitle="pra jogar hoje"
              onClick={() => nav('/sortear')}
            />
            {me ? (
              <BigButton
                variant="outline"
                icon={<ClipboardList size={18} />}
                title="avaliações"
                subtitle="ver e editar"
                onClick={() => nav('/eu')}
              />
            ) : (
              <BigButton
                variant="outline"
                icon={<ClipboardList size={18} />}
                title="fazer avaliação"
                subtitle="se ainda não fez"
                onClick={() => nav('/entrar')}
              />
            )}
            {me && (
              <div className="text-center pt-2">
                <button onClick={trocarNome} className="text-xs text-chalk-dim hover:text-chalk font-body underline underline-offset-4">
                  esse não é meu nome
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
