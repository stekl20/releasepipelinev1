import { useState } from 'react';

interface PasscodeProps {
  onUnlock: () => void;
}

export function Passcode({ onUnlock }: PasscodeProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input === import.meta.env.VITE_PASSCODE) {
      sessionStorage.setItem('auth', '1');
      onUnlock();
    } else {
      setError(true);
      setInput('');
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 260 }}>
        <span style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>release-tracker/</span>
        <span style={{ fontSize: 13, color: 'var(--dim)' }}>enter passcode to continue</span>
        <input
          type="password"
          value={input}
          onChange={e => { setInput(e.target.value); setError(false); }}
          autoFocus
          style={{
            backgroundColor: 'var(--bg)',
            border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
            color: 'var(--text)',
            fontFamily: 'inherit',
            fontSize: 14,
            padding: '6px 10px',
            outline: 'none',
          }}
          onFocus={e => { if (!error) e.target.style.borderColor = 'var(--accent)'; }}
          onBlur={e => { if (!error) e.target.style.borderColor = 'var(--border)'; }}
        />
        {error && <span style={{ fontSize: 12, color: 'var(--red)' }}>incorrect passcode</span>}
        <button
          type="submit"
          disabled={!input}
          style={{ border: '1px solid var(--border)', padding: '6px 16px', fontSize: 13, color: input ? 'var(--text)' : 'var(--dim)', alignSelf: 'flex-start' }}
        >
          [ enter ]
        </button>
      </form>
    </div>
  );
}
