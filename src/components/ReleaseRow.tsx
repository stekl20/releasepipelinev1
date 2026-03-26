import { useState, useRef, useEffect } from 'react';
import type { Release } from '../types';
import { formatDate } from '../utils/dates';
import { useIsMobile } from '../hooks/useIsMobile';

interface ReleaseRowProps {
  release: Release;
  onToggleApproved: (id: string) => void;
  onToggleDistributed: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (release: Release) => void;
  compact?: boolean;
}

function RowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        style={{ color: 'var(--text)', fontSize: 13, letterSpacing: 2 }}
        title="options"
      >
        ···
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, backgroundColor: 'var(--surface)', border: '1px solid var(--border)', zIndex: 20, minWidth: 80 }}>
          <button onClick={() => { setOpen(false); onEdit(); }}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px', fontSize: 13, color: 'var(--text)' }}>
            edit
          </button>
          <button onClick={() => { setOpen(false); onDelete(); }}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px', fontSize: 13, color: 'var(--red)' }}>
            delete
          </button>
        </div>
      )}
    </div>
  );
}

export function ReleaseRow({ release, onToggleApproved, onToggleDistributed, onDelete, onEdit, compact = false }: ReleaseRowProps) {
  const isMobile = useIsMobile();
  const isDone = release.approved && release.distributed;

  const rowColor = isDone
    ? 'var(--dim)'
    : release.approved && !release.distributed
    ? 'var(--amber)'
    : 'var(--text)';

  // Mobile layout — card style
  if (isMobile) {
    return (
      <div style={{ padding: '10px 0', borderTop: '1px solid var(--border)', color: rowColor }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {!compact && <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 2 }}>{release.act}</div>}
            <div style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{release.title}</div>
            <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 4 }}>{formatDate(release.date)}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 12, flexShrink: 0 }}>
            <button onClick={() => onToggleApproved(release.id)} style={{ fontSize: 13, color: rowColor }}>
              {release.approved ? '[x]' : '[ ]'}
            </button>
            <button onClick={() => onToggleDistributed(release.id)} style={{ fontSize: 13, color: 'var(--dim)' }}>
              {release.distributed ? '[x]' : '[ ]'}
            </button>
            <RowMenu onEdit={() => onEdit(release)} onDelete={() => onDelete(release.id)} />
          </div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div style={{ display: 'flex', gap: 16, padding: '6px 0 6px 24px', color: rowColor, fontSize: 14, borderTop: '1px solid var(--border)', alignItems: 'center' }}>
        <span style={{ flex: '0 0 180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{release.title}</span>
        <span style={{ flex: '0 0 80px', color: 'var(--dim)' }}>{formatDate(release.date)}</span>
        <button onClick={() => onToggleApproved(release.id)} style={{ flex: '0 0 80px', textAlign: 'left', color: rowColor }}>
          {release.approved ? '[x]' : '[ ]'}
        </button>
        <button onClick={() => onToggleDistributed(release.id)} style={{ flex: '0 0 80px', textAlign: 'left', color: 'var(--dim)' }}>
          {release.distributed ? '[x]' : '[ ]'}
        </button>
        <div style={{ flex: '0 0 28px' }}>
          <RowMenu onEdit={() => onEdit(release)} onDelete={() => onDelete(release.id)} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 220px 90px 100px 110px 28px', gap: 8, padding: '10px 0', borderTop: '1px solid var(--border)', color: rowColor, alignItems: 'center' }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{release.act}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{release.title}</span>
      <span>{formatDate(release.date)}</span>
      <button onClick={() => onToggleApproved(release.id)} style={{ textAlign: 'left', color: rowColor, fontSize: 'inherit' }}
        onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggleApproved(release.id); } }}>
        {release.approved ? '[x]' : '[ ]'}
      </button>
      <button onClick={() => onToggleDistributed(release.id)} style={{ textAlign: 'left', color: 'var(--dim)', fontSize: 'inherit' }}
        onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggleDistributed(release.id); } }}>
        {release.distributed ? '[x]' : '[ ]'}
      </button>
      <RowMenu onEdit={() => onEdit(release)} onDelete={() => onDelete(release.id)} />
    </div>
  );
}
