import { useState } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import type { Release } from '../types';
import { parseDate, snapToNextTuesday, isoDateString } from '../utils/dates';
import { slugify } from '../utils/slugify';

interface EditReleaseProps {
  release: Release;
  onSave: (oldId: string, updated: Release) => void;
  onClose: () => void;
}

export function EditRelease({ release, onSave, onClose }: EditReleaseProps) {
  const isMobile = useIsMobile();
  const [act, setAct] = useState(release.act);
  const [title, setTitle] = useState(release.title);
  const [date, setDate] = useState(release.date);
  const [dateError, setDateError] = useState<string | null>(null);

  function handleSave() {
    const parsed = parseDate(date);
    if (!parsed) {
      setDateError('invalid date — try "Apr 7" or "2025-04-07"');
      return;
    }
    const { date: snapped } = snapToNextTuesday(parsed);
    const isoDate = isoDateString(snapped);
    const newId = slugify(`${act}-${title}-${isoDate}`);
    const updated: Release = {
      ...release,
      id: newId,
      act: act.trim(),
      title: title.trim(),
      date: isoDate,
    };
    onSave(release.id, updated);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontFamily: 'inherit',
    fontSize: 14,
    padding: '6px 10px',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: 'var(--dim)',
    display: 'block',
    marginBottom: 4,
    letterSpacing: '0.05em',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 100, padding: isMobile ? 0 : 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', width: '100%', maxWidth: isMobile ? '100%' : 400, padding: 24, borderRadius: isMobile ? '12px 12px 0 0' : 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>edit release</span>
          <button onClick={onClose} style={{ color: 'var(--dim)', fontSize: 13 }}>[close]</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>ACT</label>
            <input
              value={act}
              onChange={e => setAct(e.target.value)}
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
          <div>
            <label style={labelStyle}>TITLE</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
          <div>
            <label style={labelStyle}>DATE</label>
            <input
              value={date}
              onChange={e => { setDate(e.target.value); setDateError(null); }}
              placeholder="Apr 7 or 2025-04-07"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            {dateError && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>{dateError}</div>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button
            onClick={handleSave}
            disabled={!act.trim() || !title.trim() || !date.trim()}
            style={{ border: '1px solid var(--border)', padding: '6px 16px', fontSize: 13, color: act.trim() && title.trim() && date.trim() ? 'var(--text)' : 'var(--dim)' }}
          >
            [ save ]
          </button>
          <button onClick={onClose} style={{ fontSize: 13, color: 'var(--dim)' }}>cancel</button>
        </div>
      </div>
    </div>
  );
}
