import React, { useEffect, useRef } from 'react';

const LEN = 4;

// 4 caixinhas de dígito. `value` é uma string contígua de 0–4 dígitos.
// Digitar avança; Backspace apaga o último e volta; colar 4 dígitos preenche tudo.
export function PinInput({ value = '', onChange, autoFocus = false, disabled = false, name = 'pin' }) {
  const refs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const focusAt = (i) => refs[Math.max(0, Math.min(i, LEN - 1))].current?.focus();

  useEffect(() => {
    if (autoFocus && value === '') focusAt(0);
  }, [value, autoFocus]);

  const handleChange = (i, e) => {
    const d = e.target.value.replace(/\D/g, '').slice(-1);
    if (!d) return;
    const at = Math.min(i, value.length); // sem buracos: escreve na 1ª caixa vazia
    const next = (value.slice(0, at) + d).slice(0, LEN);
    onChange(next);
    focusAt(next.length);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (!value.length) return;
      const next = value.slice(0, -1);
      onChange(next);
      focusAt(next.length);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
    }
  };

  const handlePaste = (e) => {
    const d = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, LEN);
    if (!d) return;
    e.preventDefault();
    onChange(d);
    focusAt(d.length);
  };

  return (
    <div className="flex gap-3 justify-center">
      {Array.from({ length: LEN }).map((_, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoComplete="off"
          name={`${name}-${i}`}
          aria-label={`dígito ${i + 1}`}
          disabled={disabled}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => { if (i > value.length) focusAt(value.length); }}
          className="w-14 h-16 text-center font-mono text-2xl text-chalk bg-elevated border border-line rounded focus:outline-none focus:border-orange disabled:opacity-50"
        />
      ))}
    </div>
  );
}
