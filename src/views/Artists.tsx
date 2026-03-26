import { useMemo, useState } from 'react';
import type { Release } from '../types';
import { parseDate } from '../utils/dates';
import { ReleaseRow } from '../components/ReleaseRow';

interface ArtistsProps {
  releases: Release[];
  onToggleApproved: (id: string) => void;
  onToggleDistributed: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (release: Release) => void;
}

export function Artists({ releases, onToggleApproved, onToggleDistributed, onDelete, onEdit }: ArtistsProps) {
  const [filterAct, setFilterAct] = useState<string>('all');

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const upcomingReleases = useMemo(
    () => releases.filter(r => { const d = parseDate(r.date); return d && d >= today; }),
    [releases, today]
  );

  const acts = useMemo(() => {
    const set = new Set(upcomingReleases.map(r => r.act));
    return Array.from(set).sort();
  }, [upcomingReleases]);

  const actGroups = useMemo(() => {
    const groups = new Map<string, Release[]>();
    for (const r of upcomingReleases) {
      if (!groups.has(r.act)) groups.set(r.act, []);
      groups.get(r.act)!.push(r);
    }
    return Array.from(groups.entries())
      .filter(([act]) => filterAct === 'all' || act === filterAct)
      .sort((a, b) => b[1].length - a[1].length);
  }, [upcomingReleases, filterAct]);

  return (
    <div style={{ padding: '32px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <span style={{ fontSize: 16, fontWeight: 700 }}>artists</span>
        <span style={{ color: 'var(--dim)', fontSize: 13 }}>act:</span>
        <select value={filterAct} onChange={e => setFilterAct(e.target.value)} style={{ fontSize: 13 }}>
          <option value="all">all acts</option>
          {acts.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {actGroups.length === 0 ? (
        <div style={{ color: 'var(--dim)', fontSize: 14 }}>no upcoming releases found.</div>
      ) : (
        actGroups.map(([act, actReleases]) => {
          const sorted = [...actReleases].sort((a, b) => a.date.localeCompare(b.date));
          return (
            <div key={act} style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>{act}</span>
                <span style={{ flex: 1, borderTop: '1px solid var(--border)', marginLeft: 4 }} />
                <span style={{ fontSize: 13, color: 'var(--dim)', whiteSpace: 'nowrap' }}>{sorted.length} upcoming</span>
              </div>

              {sorted.map(r => (
                <ReleaseRow
                  key={r.id}
                  release={r}
                  onToggleApproved={onToggleApproved}
                  onToggleDistributed={onToggleDistributed}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  compact
                />
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
