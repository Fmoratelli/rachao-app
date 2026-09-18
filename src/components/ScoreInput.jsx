import React from 'react';

export function ScoreInput({ label, short, desc, value, onChange }) {
  return (
    <div>
      <div className="flex items-start justify-between mb-1.5">
        <div>
          <div className="flex items-center gap-2">
            {short && <span className="font-mono text-[10px] text-orange">{short}</span>}
            <span className="font-body text-sm text-chalk">{label}</span>
          </div>
          {desc && (
            <div className="text-[11px] text-chalk-dim font-body italic">{desc}</div>
          )}
        </div>
        <span className="font-mono text-xl text-orange w-14 text-right">
          {Number(value).toFixed(1)}
        </span>
      </div>
      <input
        type="range" min="0" max="10" step="0.5"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
