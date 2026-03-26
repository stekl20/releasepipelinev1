import { useState, useMemo } from 'react';
import type { Release } from '../types';
import { ReleaseRow } from '../components/ReleaseRow';
import { parseDate } from '../utils/dates';

interface PipelineProps {
  releases: Release[];
  onToggleApproved: (id: string) => void;
  onToggleDistributed: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (release: Release) => void;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'distributed';
type FilterDate = 'upcoming' | 'all' | 'past';

export function Pipeline({ releases, onToggleApproved, onToggleDistributed, onDelete, onEdit }: PipelineProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterAct, setFilterAct] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<FilterDate>('upcoming');

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

  const upcomingDates = useMemo(() => {
    const set = new Set(releases.filter(r => {
      const d = parseDate(r.date);
      return d && d >= today;
    }).map(r => r.date));
    return set.size;
  }, [releases, today]);

  return (
    <div style={{ padding: '32px 0' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: '160px 220px 90px 100px 110px 44px', gap: 8, paddingBottom: 8, fontSize: 13, color: 'var(--dim)', letterSpacing: '0.05em' }}>
        <span>ACT</span>
        <span>TITLE</span>
        <span>DATE</span>
        <span>APPROVED</span>
        <span>DISTRIBUTED</span>
        <span />
      </div>
      <hr />

      {filtered.length === 0 ? (
        <div style={{ color: 'var(--dim)', padding: '24px 0', fontSize: 14 }}>no releases match current filters.</div>
      ) : (
        filtered.map(r => (
          <ReleaseRow key={r.id} release={r} onToggleApproved={onToggleApproved} onToggleDistributed={onToggleDistributed} onDelete={onDelete} onEdit={onEdit} />
        ))
      )}
    </div>
  );
}
