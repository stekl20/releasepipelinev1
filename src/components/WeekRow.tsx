import Papa from 'papaparse';
import type { Release } from '../types';
import { ProgressBar } from './ProgressBar';
import { ReleaseRow } from './ReleaseRow';
import { formatDate } from '../utils/dates';
import { useIsMobile } from '../hooks/useIsMobile';

function exportWeekCsv(dateKey: string, releases: Release[]) {
  const rows = releases.map(r => ({
    'Act': r.act,
    'Title': r.title,
    'Release Date': formatDate(r.date),
    'Approved': r.approved ? 'yes' : 'no',
    'Distributed': r.distributed ? 'yes' : 'no',
  }));
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `week-${dateKey}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface WeekRowProps {
  dateKey: string;
  releases: Release[];
  weeksOutNum: number;
  isExpanded: boolean;
  onToggle: () => void;
  onToggleApproved: (id: string) => void;
  onToggleDistributed: (id: string) => void;
  onToggleCoverDone: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (release: Release) => void;
}

const TARGET = 9;

export function WeekRow({ dateKey, releases, weeksOutNum, isExpanded, onToggle, onToggleApproved, onToggleDistributed, onToggleCoverDone, onDelete, onEdit }: WeekRowProps) {
  const isMobile = useIsMobile();
  const count = releases.length;
  const approved = releases.filter(r => r.approved).length;
  const distributed = releases.filter(r => r.distributed).length;

  let weeksLabel: string;
  if (weeksOutNum === 0) weeksLabel = 'this week';
  else if (weeksOutNum === 1) weeksLabel = '1w';
  else weeksLabel = `${weeksOutNum}w`;

  const rowColor = count === 0 ? 'var(--dim)' : count >= TARGET ? 'var(--green)' : 'var(--amber)';

  return (
    <div>
      <div onClick={onToggle} style={{ padding: '10px 0', borderTop: '1px solid var(--border)', cursor: 'pointer', color: rowColor, userSelect: 'none' }}>
        {isMobile ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 14 }}>{formatDate(dateKey)}</span>
              <span style={{ fontSize: 12, color: 'var(--dim)', marginLeft: 8 }}>{weeksLabel}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 13, alignItems: 'center' }}>
              <span>{count} sched</span>
              <span style={{ color: approved === count && count > 0 ? 'var(--green)' : 'var(--text)' }}>{approved} appr</span>
              <span style={{ color: distributed === count && count > 0 ? 'var(--green)' : 'var(--text)' }}>{distributed} dist</span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '90px 200px 60px 90px 100px 90px', gap: 8, alignItems: 'center' }}>
            <span>{formatDate(dateKey)}</span>
            <span><ProgressBar count={count} target={TARGET} /></span>
            <span style={{ color: 'var(--dim)' }}>{count}</span>
            <span style={{ color: approved === count && count > 0 ? 'var(--green)' : 'var(--text)' }}>{approved}</span>
            <span style={{ color: distributed === count && count > 0 ? 'var(--green)' : 'var(--text)' }}>{distributed}</span>
            <span style={{ color: 'var(--dim)' }}>{weeksOutNum === 0 ? 'this week' : weeksOutNum === 1 ? '1 week' : `${weeksOutNum} weeks`}</span>
          </div>
        )}
      </div>
      {isExpanded && (
        <div style={{ marginBottom: 8 }}>
          {isMobile && (
            <div style={{ padding: '8px 0 10px', fontSize: 13 }}>
              <ProgressBar count={count} target={TARGET} />
            </div>
          )}
          {!isMobile && (
            <div style={{ display: 'grid', gridTemplateColumns: '180px 80px 80px 80px', gap: 8, padding: '6px 0 6px 24px', fontSize: 13, color: 'var(--dim)' }}>
              <span>TITLE</span><span>DATE</span><span>APPR.</span><span>DIST.</span>
            </div>
          )}
          {releases.map(r => (
            <ReleaseRow key={r.id} release={r} onToggleApproved={onToggleApproved} onToggleDistributed={onToggleDistributed} onToggleCoverDone={onToggleCoverDone} onDelete={onDelete} onEdit={onEdit} compact={!isMobile} />
          ))}
          {releases.length > 0 && (
            <div style={{ padding: '8px 0 4px', textAlign: 'right' }}>
              <button onClick={() => exportWeekCsv(dateKey, releases)} style={{ fontSize: 13, color: 'var(--dim)' }}>
                [export csv]
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
