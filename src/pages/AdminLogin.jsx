import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Button, Card } from '../components/Layout.jsx';
import { supabase, ADMIN_EMAIL } from '../lib/supabase.js';
import { Mail } from 'lucide-react';

export default function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) nav('/admin', { replace: true });
    })();
  }, [nav]);

  const send = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <Layout>
      <div className="text-[10px] text-orange font-display uppercase tracking-widest">
        entrada do técnico
      </div>
      <h2 className="font-display text-3xl text-chalk mb-1 leading-tight">acesso admin</h2>
      <p className="text-sm text-chalk-dim font-body mb-5">
        só o organizador vê as médias agregadas e sorteia os times.
      </p>

      {sent ? (
        <Card className="p-6 text-center">
          <Mail size={32} className="mx-auto mb-3 text-orange" />
          <div className="font-display text-lg text-chalk">link enviado</div>
          <p className="text-sm text-chalk-dim mt-2">
            confere <span className="text-chalk font-mono">{email}</span> e clica no link.
          </p>
        </Card>
      ) : (
        <form onSubmit={send}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full bg-elevated border border-line rounded px-3 py-3 text-chalk font-body focus:outline-none focus:border-orange mb-3"
          />
          <Button variant="big" type="submit" disabled={loading || !email}>
            {loading ? 'enviando...' : 'enviar link mágico'}
          </Button>
          {error && <p className="mt-3 text-sm text-red-400 font-body">{error}</p>}
        </form>
      )}
    </Layout>
  );
}
