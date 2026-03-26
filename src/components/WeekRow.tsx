import type { Release } from '../types';
import { ProgressBar } from './ProgressBar';
import { ReleaseRow } from './ReleaseRow';
import { formatDate } from '../utils/dates';

interface WeekRowProps {
  dateKey: string;
  releases: Release[];
  weeksOutNum: number;
  isExpanded: boolean;
  onToggle: () => void;
  onToggleApproved: (id: string) => void;
  onToggleDistributed: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (release: Release) => void;
}

const TARGET = 7;

export function WeekRow({ dateKey, releases, weeksOutNum, isExpanded, onToggle, onToggleApproved, onToggleDistributed, onDelete, onEdit }: WeekRowProps) {
  const count = releases.length;
  const approved = releases.filter(r => r.approved).length;
  const distributed = releases.filter(r => r.distributed).length;

  let weeksLabel: string;
  if (weeksOutNum === 0) weeksLabel = 'this week';
  else if (weeksOutNum === 1) weeksLabel = '1 week';
  else weeksLabel = `${weeksOutNum} weeks`;

  const rowColor = count === 0 ? 'var(--dim)' : count >= TARGET ? 'var(--green)' : 'var(--amber)';

  return (
    <div>
      <div
        onClick={onToggle}
        style={{ display: 'grid', gridTemplateColumns: '90px 200px 60px 90px 100px 90px', gap: 8, padding: '10px 0', borderTop: '1px solid var(--border)', cursor: 'pointer', color: rowColor, alignItems: 'center', userSelect: 'none' }}
      >
        <span>{formatDate(dateKey)}</span>
        <span><ProgressBar count={count} target={TARGET} /></span>
        <span style={{ color: 'var(--dim)' }}>{count}</span>
        <span style={{ color: approved === count && count > 0 ? 'var(--green)' : 'var(--text)' }}>{approved}</span>
        <span style={{ color: distributed === count && count > 0 ? 'var(--green)' : 'var(--text)' }}>{distributed}</span>
        <span style={{ color: 'var(--dim)' }}>{weeksLabel}</span>
      </div>
      {isExpanded && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '180px 80px 80px 80px', gap: 8, padding: '6px 0 6px 24px', fontSize: 13, color: 'var(--dim)' }}>
            <span>TITLE</span>
            <span>DATE</span>
            <span>APPR.</span>
            <span>DIST.</span>
          </div>
          {releases.map(r => (
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
      )}
    </div>
  );
}
