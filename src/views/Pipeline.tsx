import { useState, useMemo } from 'react';
import type { Release } from '../types';
import { ReleaseRow } from '../components/ReleaseRow';
import { parseDate, formatDate } from '../utils/dates';
import { useIsMobile } from '../hooks/useIsMobile';

interface PipelineProps {
  releases: Release[];
  onToggleApproved: (id: string) => void;
  onToggleDistributed: (id: string) => void;
  onToggleCoverDone: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (release: Release) => void;
}

function NeedsCover({ releases, open, onToggle, onToggleCoverDone, isMobile }: {
  releases: Release[];
  open: boolean;
  onToggle: () => void;
  onToggleCoverDone: (id: string) => void;
  isMobile: boolean;
}) {
  if (releases.length === 0) return null;

  return (
    <div style={{ marginBottom: 24, border: '1px solid var(--border)', padding: '12px 16px', backgroundColor: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: open ? 12 : 0 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>needs cover</span>
        <span style={{ fontSize: 13, color: 'var(--orange)' }}>({releases.length})</span>
        <button onClick={onToggle} style={{ fontSize: 13, color: 'var(--dim)', marginLeft: 4 }}>
          [{open ? 'hide' : 'show'}]
        </button>
      </div>
      {open && (
        <>
          {!isMobile && (
            <div style={{ display: 'grid', gridTemplateColumns: '160px 220px 90px 80px', gap: 8, paddingBottom: 6, fontSize: 12, color: 'var(--dim)', letterSpacing: '0.05em' }}>
              <span>ACT</span><span>TITLE</span><span>DATE</span><span>COVER</span>
            </div>
          )}
          {releases.map(r => (
            isMobile ? (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border)', color: 'var(--orange)', fontSize: 14 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--dim)' }}>{r.act}</div>
                  <div>{r.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--dim)' }}>{formatDate(r.date)}</div>
                </div>
                <button onClick={() => onToggleCoverDone(r.id)} style={{ fontSize: 13, color: 'var(--orange)', flexShrink: 0 }}>
                  {r.cover_done ? '[x]' : '[ ]'}
                </button>
              </div>
            ) : (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '160px 220px 90px 80px', gap: 8, padding: '8px 0', borderTop: '1px solid var(--border)', alignItems: 'center', color: 'var(--orange)', fontSize: 14 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.act}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                <span>{formatDate(r.date)}</span>
                <button onClick={() => onToggleCoverDone(r.id)} style={{ textAlign: 'left', color: 'var(--orange)', fontSize: 'inherit' }}>
                  {r.cover_done ? '[x]' : '[ ]'}
                </button>
              </div>
            )
          ))}
        </>
      )}
    </div>
  );
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'distributed';
type FilterDate = 'upcoming' | 'all' | 'past';

export function Pipeline({ releases, onToggleApproved, onToggleDistributed, onToggleCoverDone, onDelete, onEdit }: PipelineProps) {
  const isMobile = useIsMobile();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterAct, setFilterAct] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<FilterDate>('upcoming');
  const [coverOpen, setCoverOpen] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const acts = useMemo(() => {
    const set = new Set(releases.map(r => r.act));
    return Array.from(set).sort();
  }, [releases]);

  const filtered = useMemo(() => {
    return releases.filter(r => {
      const d = parseDate(r.date);
      if (filterDate === 'upcoming' && d && d < today) return false;
      if (filterDate === 'past' && d && d >= today) return false;
      if (filterAct !== 'all' && r.act !== filterAct) return false;
      if (filterStatus === 'pending' && r.approved) return false;
      if (filterStatus === 'approved' && !r.approved) return false;
      if (filterStatus === 'distributed' && !r.distributed) return false;
      return true;
    });
  }, [releases, filterDate, filterAct, filterStatus, today]);

  // Stats always reflect the date filter, regardless of act/status filter
  const statsBase = useMemo(() => releases.filter(r => {
    const d = parseDate(r.date);
    if (filterDate === 'upcoming' && d && d < today) return false;
    if (filterDate === 'past' && d && d >= today) return false;
    return true;
  }), [releases, filterDate, today]);

  const approved = statsBase.filter(r => r.approved).length;
  const distributed = statsBase.filter(r => r.distributed).length;

  const needsCoverReleases = useMemo(() => {
    return releases.filter(r => {
      if (r.distributed) return false;
      if (r.cover_done) return false;
      const d = parseDate(r.date);
      return d && d >= today;
    });
  }, [releases, today]);

  const upcomingDates = useMemo(() => {
    const set = new Set(releases.filter(r => {
      const d = parseDate(r.date);
      return d && d >= today;
    }).map(r => r.date));
    return set.size;
  }, [releases, today]);

  return (
    <div style={{ padding: '32px 0' }}>
      <NeedsCover
        releases={needsCoverReleases}
        open={coverOpen}
        onToggle={() => setCoverOpen(v => !v)}
        onToggleCoverDone={onToggleCoverDone}
        isMobile={isMobile}
      />
      <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <span>total: <span style={{ color: 'var(--text)' }}>{statsBase.length} releases</span></span>
        <span>approved: <span style={{ color: 'var(--text)' }}>{approved}/{statsBase.length}</span></span>
        <span>distributed: <span style={{ color: 'var(--text)' }}>{distributed}/{statsBase.length}</span></span>
        <span>weeks covered: <span style={{ color: 'var(--text)' }}>{upcomingDates}</span></span>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', fontSize: 13, alignItems: 'center' }}>
        <span style={{ color: 'var(--dim)' }}>filter:</span>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as FilterStatus)}>
          <option value="all">all releases</option>
          <option value="pending">pending approval</option>
          <option value="approved">approved</option>
          <option value="distributed">distributed</option>
        </select>
        <span style={{ color: 'var(--dim)' }}>act:</span>
        <select value={filterAct} onChange={e => setFilterAct(e.target.value)}>
          <option value="all">all acts</option>
          {acts.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <span style={{ color: 'var(--dim)' }}>date:</span>
        <select value={filterDate} onChange={e => setFilterDate(e.target.value as FilterDate)}>
          <option value="upcoming">upcoming only</option>
          <option value="all">all</option>
          <option value="past">past</option>
        </select>
      </div>

      {!isMobile && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 220px 90px 100px 110px 44px 100px', gap: 8, padding: '0 0 8px 10px', fontSize: 13, color: 'var(--dim)', letterSpacing: '0.05em' }}>
            <span>ACT</span><span>TITLE</span><span>DATE</span><span>APPROVED</span><span>DISTRIBUTED</span><span /><span />
          </div>
          <hr />
        </>
      )}
      {isMobile && <hr />}

      {filtered.length === 0 ? (
        <div style={{ color: 'var(--dim)', padding: '24px 0', fontSize: 14 }}>no releases match current filters.</div>
      ) : (
        filtered.map(r => (
          <ReleaseRow key={r.id} release={r} onToggleApproved={onToggleApproved} onToggleDistributed={onToggleDistributed} onToggleCoverDone={onToggleCoverDone} onDelete={onDelete} onEdit={onEdit} />
        ))
      )}
    </div>
  );
}
