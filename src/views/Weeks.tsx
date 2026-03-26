import { useState, useMemo } from 'react';
import type { Release } from '../types';
import { WeekRow } from '../components/WeekRow';
import { parseDate, weeksOut } from '../utils/dates';
import { useIsMobile } from '../hooks/useIsMobile';

interface WeeksProps {
  releases: Release[];
  onToggleApproved: (id: string) => void;
  onToggleDistributed: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (release: Release) => void;
}

export function Weeks({ releases, onToggleApproved, onToggleDistributed, onDelete, onEdit }: WeeksProps) {
  const isMobile = useIsMobile();
  const [showAll, setShowAll] = useState(false);
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weekGroups = useMemo(() => {
    const groups = new Map<string, Release[]>();
    for (const r of releases) {
      const d = parseDate(r.date);
      if (!d) continue;
      if (!showAll && d < today) continue;
      if (!groups.has(r.date)) groups.set(r.date, []);
      groups.get(r.date)!.push(r);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [releases, showAll, today]);

  return (
    <div style={{ padding: '32px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <span style={{ fontSize: 16, fontWeight: 700 }}>weeks</span>
        <button onClick={() => setShowAll(v => !v)} style={{ fontSize: 13, color: 'var(--dim)' }}>
          [{showAll ? 'upcoming only' : 'show all'}]
        </button>
      </div>

      {!isMobile && (
        <div style={{ display: 'grid', gridTemplateColumns: '90px 200px 60px 90px 100px 90px', gap: 8, paddingBottom: 8, fontSize: 13, color: 'var(--dim)', letterSpacing: '0.05em' }}>
          <span>WEEK</span><span>PIPELINE</span><span>SCHED</span><span>APPROVED</span><span>DISTRIBUTED</span><span>WEEKS OUT</span>
        </div>
      )}
      <hr />

      {weekGroups.length === 0 ? (
        <div style={{ color: 'var(--dim)', padding: '24px 0', fontSize: 14 }}>no upcoming weeks found.</div>
      ) : (
        weekGroups.map(([dateKey, weekReleases]) => {
          const d = parseDate(dateKey);
          const wo = d ? weeksOut(d, today) : 0;
          return (
            <WeekRow
              key={dateKey}
              dateKey={dateKey}
              releases={weekReleases}
              weeksOutNum={wo}
              isExpanded={expandedWeek === dateKey}
              onToggle={() => setExpandedWeek(prev => prev === dateKey ? null : dateKey)}
              onToggleApproved={onToggleApproved}
              onToggleDistributed={onToggleDistributed}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          );
        })
      )}
    </div>
  );
}
