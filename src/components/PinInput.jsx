import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const LEN = 4;

// 4 caixinhas de dígito. `value` é uma string contígua de 0–4 dígitos.
// Digitar avança; Backspace apaga o último e volta; colar 4 dígitos preenche tudo;
// ao completar os 4, chama onComplete (o pai usa pra pular pro próximo grupo).
// ref.focus() foca a 1ª caixa vazia.
export const PinInput = forwardRef(function PinInput(
  { value = '', onChange, onComplete, autoFocus = false, disabled = false, name = 'pin' },
  ref
) {
  const refs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  // Valor mais recente, atualizado ANTES de mover o foco. Os handlers de foco
  // não podem depender do `value` da closure: focus() dispara onFocus de forma
  // síncrona, antes do React aplicar o setState, e um guard com valor velho
  // devolvia o foco pra caixa anterior (bug do "cursor travado").
  const latest = useRef(value);
  latest.current = value;

  const focusAt = (i) => refs[Math.max(0, Math.min(i, LEN - 1))].current?.focus();
  const commit = (next) => {
    latest.current = next;
    onChange(next);
    focusAt(next.length);
    if (next.length === LEN) onComplete?.(next);
  };

  useImperativeHandle(ref, () => ({ focus: () => focusAt(latest.current.length) }));

  useEffect(() => {
    if (autoFocus && value === '') focusAt(0);
  }, [value, autoFocus]);

  const handleChange = (i, e) => {
    const d = e.target.value.replace(/\D/g, '').slice(-1);
    if (!d) return;
    const cur = latest.current;
    const at = Math.min(i, cur.length); // sem buracos: escreve na 1ª caixa vazia
    commit((cur.slice(0, at) + d).slice(0, LEN));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const cur = latest.current;
      if (!cur.length) return;
      const next = cur.slice(0, -1);
      latest.current = next;
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
    commit(d);
  };

  // Tocar numa caixa à frente das preenchidas → foca a 1ª vazia (usa `latest`, não `value`)
  const handleFocus = (i) => {
    const len = latest.current.length;
    if (i > len) focusAt(len);
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
          autoComplete="one-time-code"
          name={`${name}-${i}`}
          aria-label={`dígito ${i + 1}`}
          disabled={disabled}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => handleFocus(i)}
          className="w-14 h-16 text-center font-mono text-2xl text-chalk bg-elevated border border-line rounded focus:outline-none focus:border-orange disabled:opacity-50"
        />
      ))}
    </div>
  );
});
