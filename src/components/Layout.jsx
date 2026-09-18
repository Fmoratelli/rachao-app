import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from './TacticalMarks.jsx';

export function Layout({ children, showHeader = true }) {
  return (
    <div className="min-h-screen w-full bg-ink font-body text-chalk">
      {showHeader && <Header />}
      <main className="w-full max-w-md mx-auto px-4 pb-16 overflow-x-clip">{children}</main>
    </div>
  );
}

function Header() {
  const loc = useLocation();
  const isAdmin = loc.pathname.startsWith('/admin');
  return (
    <header className="max-w-md mx-auto px-4 pt-5">
      <Link to="/" className="flex items-center gap-2.5 mb-5 pb-3 border-b border-line">
        <Logo size={32} />
        <div>
          <div className="font-display text-sm text-chalk leading-none tracking-wide">MEIA BOCA</div>
          <div className="font-brush text-orange text-sm leading-none mt-0.5 rotate-brush">juniors</div>
        </div>
        <div className="ml-auto text-[10px] font-display uppercase tracking-widest text-chalk-dim">
          {isAdmin ? 'admin' : 'rachão'}
        </div>
      </Link>
    </header>
  );
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'font-display uppercase tracking-widest transition-colors disabled:cursor-not-allowed inline-flex items-center justify-center gap-2';
  const styles = {
    primary: 'bg-orange hover:bg-orange-hi disabled:bg-line disabled:text-chalk-dim text-ink text-sm px-4 py-3 rounded',
    big:     'bg-orange hover:bg-orange-hi disabled:bg-line disabled:text-chalk-dim text-ink text-lg py-4 rounded w-full',
    ghost:   'text-chalk-dim hover:text-chalk text-xs px-3 py-2 rounded',
    outline: 'border border-line hover:border-orange hover:text-orange text-chalk-dim text-sm px-4 py-3 rounded',
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-elevated border border-line rounded-lg ${className}`}>
      {children}
    </div>
  );
}
