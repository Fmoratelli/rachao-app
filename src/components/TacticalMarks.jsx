import React from 'react';

export const TacticalX = ({ size = 20, className = '' }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className}
       fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
    <path d="M5 6 L18 19" transform="rotate(-3 12 12)" />
    <path d="M18 5 L6 18" transform="rotate(2 12 12)" />
  </svg>
);

export const TacticalDot = ({ size = 12, className = '' }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className}
       fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="12" cy="12" r="6" />
  </svg>
);

export const TacticalArrow = ({ className = '' }) => (
  <svg viewBox="0 0 60 30" width="60" height="30" className={className}
       fill="none" stroke="currentColor" strokeWidth="2.4"
       strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 22 Q 20 4, 46 12" />
    <path d="M40 8 L48 12 L42 20" />
  </svg>
);

export const TacticalDivider = ({ className = '' }) => (
  <div className={`flex items-center gap-2 opacity-40 ${className}`}>
    <TacticalDot size={10} className="text-orange" />
    <div className="flex-1 h-px bg-orange" />
    <TacticalX size={14} className="text-orange" />
    <div className="flex-1 h-px bg-orange" />
    <TacticalDot size={10} className="text-orange" />
  </div>
);

// Logo component — reused across screens
export const Logo = ({ size = 48 }) => (
  <img src="/logo.png" alt="Meia Boca Juniors"
       style={{ height: size, width: 'auto' }}
       className="block select-none" />
);
