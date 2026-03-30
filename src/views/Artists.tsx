import { useMemo, useState, useRef, useEffect } from 'react';
import type { Release } from '../types';
import { parseDate, findNextOpenSlot, formatDate, isoDateString } from '../utils/dates';
import { ReleaseRow } from '../components/ReleaseRow';
import { useIsMobile } from '../hooks/useIsMobile';
import { useActConfig } from '../hooks/useActConfig';

interface ArtistsProps {
  releases: Release[];
  onToggleApproved: (id: string) => void;
  onToggleDistributed: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (release: Release) => void;
}

interface AttentionItem {
  act: string;
  actKey: string;
  latestDate: Date;
  expectedNext: Date;
  urgency: 'overdue' | 'high' | 'medium';
}

const CADENCE_OPTIONS = [
  { label: '1w', days: 7 },
  { label: '2w', days: 14 },
  { label: '3w', days: 21 },
  { label: '4w', days: 28 },
  { label: '6w', days: 42 },
  { label: '8w', days: 56 },
];

function urgencyColor(urgency: AttentionItem['urgency']) {
  if (urgency === 'overdue') return 'var(--red)';
  if (urgency === 'high') return 'var(--amber)';
  return 'var(--text)';
}

function ActMenu({ onRetire }: { onRetire: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)} style={{ fontSize: 13, color: 'var(--dim)' }}>···</button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, backgroundColor: 'var(--surface)', border: '1px solid var(--border)', zIndex: 20, minWidth: 90 }}>
          <button
            onClick={() => { setOpen(false); onRetire(); }}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px', fontSize: 13, color: 'var(--amber)' }}
          >
            retire
          </button>
        </div>
      )}
    </div>
  );
}

interface NeedsAttentionProps {
  items: AttentionItem[];
  open: boolean;
  onToggle: () => void;
  isMobile: boolean;
}

function NeedsAttention({ items, open, onToggle, isMobile }: NeedsAttentionProps) {
  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: 32, border: '1px solid var(--border)', padding: '12px 16px', backgroundColor: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: open ? 12 : 0 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>needs attention</span>
        <span style={{ fontSize: 13, color: 'var(--amber)' }}>({items.length})</span>
        <button onClick={onToggle} style={{ fontSize: 13, color: 'var(--dim)', marginLeft: 4 }}>
          [{open ? 'hide' : 'show'}]
        </button>
      </div>

      {open && (
        <>
          {!isMobile && (
            <div style={{ display: 'grid', gridTemplateColumns: '180px 120px 140px', gap: 8, paddingBottom: 6, fontSize: 12, color: 'var(--dim)', letterSpacing: '0.05em' }}>
              <span>ACT</span><span>LAST RELEASE</span><span>SUGGESTED SLOT</span>
            </div>
          )}
          {items.map(item => {
            const color = urgencyColor(item.urgency);
            return isMobile ? (
              <div key={item.act} style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color }}>{item.act}</span>
                <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 4 }}>
                  last: {formatDate(isoDateString(item.latestDate))}&nbsp;&nbsp;→&nbsp;&nbsp;
                  <span style={{ color }}>{formatDate(isoDateString(item.expectedNext))}</span>
                </div>
              </div>
            ) : (
              <div key={item.act} style={{ display: 'grid', gridTemplateColumns: '180px 120px 140px', gap: 8, padding: '6px 0', fontSize: 13, borderTop: '1px solid var(--border)', alignItems: 'center' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color }}>{item.act}</span>
                <span style={{ color: 'var(--dim)' }}>{formatDate(isoDateString(item.latestDate))}</span>
                <span style={{ color }}>{formatDate(isoDateString(item.expectedNext))}</span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

export function Artists({ releases, onToggleApproved, onToggleDistributed, onDelete, onEdit }: ArtistsProps) {
  const isMobile = useIsMobile();
  const { actConfig, loaded: actConfigLoaded, getCadence, setCadence, setRetired } = useActConfig();
  const [filterAct, setFilterAct] = useState<string>('all');
  const [attentionOpen, setAttentionOpen] = useState(true);
  const [retiredOpen, setRetiredOpen] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const attentionItems = useMemo((): AttentionItem[] => {
    const releasesPerDate = new Map<string, number>();
    for (const r of releases) {
      releasesPerDate.set(r.date, (releasesPerDate.get(r.date) ?? 0) + 1);
    }

    const byAct = new Map<string, { releases: Release[]; displayName: string }>();
    for (const r of releases) {
      const key = r.act.toLowerCase().trim();
      if (!byAct.has(key)) byAct.set(key, { releases: [], displayName: r.act });
      byAct.get(key)!.releases.push(r);
    }

    const items: AttentionItem[] = [];

    for (const [key, { releases: actReleases, displayName }] of byAct.entries()) {
      if (actConfig[key]?.retired) continue;

      const cadence = getCadence(key);
      const cadenceMs = cadence * 24 * 60 * 60 * 1000;

      let latestUpcoming: Date | null = null;
      let latestDate: Date | null = null;
      for (const r of actReleases) {
        const d = parseDate(r.date);
        if (!d) continue;
        if (!latestDate || d > latestDate) latestDate = d;
        if (d >= today && (!latestUpcoming || d > latestUpcoming)) latestUpcoming = d;
      }
      if (!latestDate) continue;

      const threshold = new Date(today.getTime() + cadenceMs);
      if (latestUpcoming && latestUpcoming >= threshold) continue;

      const suggestedSlot = findNextOpenSlot(latestDate, cadence, releasesPerDate);

      // Urgency: overdue if slot already past, high if last upcoming within 7 days, else medium
      let urgency: AttentionItem['urgency'];
      if (suggestedSlot < today) {
        urgency = 'overdue';
      } else if (!latestUpcoming || latestUpcoming.getTime() - today.getTime() <= 7 * 24 * 60 * 60 * 1000) {
        urgency = 'high';
      } else {
        urgency = 'medium';
      }

      items.push({ act: displayName, actKey: key, latestDate: latestUpcoming ?? latestDate, expectedNext: suggestedSlot, urgency });
    }

    return items.sort((a, b) => {
      const order = { overdue: 0, high: 1, medium: 2 };
      if (order[a.urgency] !== order[b.urgency]) return order[a.urgency] - order[b.urgency];
      return a.latestDate.getTime() - b.latestDate.getTime();
    });
  }, [releases, today, actConfig, getCadence]);

  // Build a quick lookup: actKey → urgency for coloring act headers
  const attentionMap = useMemo(() => {
    const map = new Map<string, AttentionItem['urgency']>();
    for (const item of attentionItems) map.set(item.actKey, item.urgency);
    return map;
  }, [attentionItems]);

  const retiredActs = useMemo(() =>
    Object.entries(actConfig)
      .filter(([, cfg]) => cfg.retired)
      .map(([act]) => act)
      .sort(),
    [actConfig]
  );

  const upcomingReleases = useMemo(
    () => releases.filter(r => { const d = parseDate(r.date); return d && d >= today; }),
    [releases, today]
  );

  const acts = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of upcomingReleases) {
      const key = r.act.toLowerCase().trim();
      if (!map.has(key)) map.set(key, r.act);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [upcomingReleases]);

  const actGroups = useMemo(() => {
    const groups = new Map<string, { releases: Release[]; displayName: string }>();
    for (const r of upcomingReleases) {
      const key = r.act.toLowerCase().trim();
      if (!groups.has(key)) groups.set(key, { releases: [], displayName: r.act });
      groups.get(key)!.releases.push(r);
    }
    return Array.from(groups.entries())
      .filter(([key]) => filterAct === 'all' || key === filterAct)
      .sort((a, b) => b[1].releases.length - a[1].releases.length);
  }, [upcomingReleases, filterAct]);

  if (!actConfigLoaded) return <div style={{ padding: '32px 0' }} />;

  return (
    <div style={{ padding: '32px 0' }}>
      <NeedsAttention
        items={attentionItems}
        open={attentionOpen}
        onToggle={() => setAttentionOpen(v => !v)}
        isMobile={isMobile}
      />

      {retiredActs.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => setRetiredOpen(v => !v)} style={{ fontSize: 13, color: 'var(--dim)' }}>
            [{retiredOpen ? 'hide' : 'show'} retired ({retiredActs.length})]
          </button>
          {retiredOpen && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {retiredActs.map(act => (
                <span key={act} style={{ fontSize: 13, color: 'var(--dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {act}
                  <button onClick={() => setRetired(act, false)} style={{ fontSize: 12, color: 'var(--dim)' }}>[unretire]</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>artists</span>
          <span style={{ color: 'var(--dim)', fontSize: 13 }}>act:</span>
          <select value={filterAct} onChange={e => setFilterAct(e.target.value)} style={{ fontSize: 13 }}>
            <option value="all">all acts</option>
            {acts.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </select>
        </div>
        <div style={{ fontSize: 12, color: 'var(--dim)', display: 'flex', gap: 16 }}>
          <span><span style={{ color: 'var(--text)' }}>[x]</span> approved</span>
          <span><span style={{ color: 'var(--text)' }}>[x]</span> distributed</span>
        </div>
      </div>

      {actGroups.length === 0 ? (
        <div style={{ color: 'var(--dim)', fontSize: 14 }}>no upcoming releases found.</div>
      ) : (
        actGroups.map(([key, { releases: actReleases, displayName }]) => {
          const sorted = [...actReleases].sort((a, b) => a.date.localeCompare(b.date));
          const urgency = attentionMap.get(key);
          const nameColor = urgency ? urgencyColor(urgency) : 'var(--text)';
          const cadence = getCadence(key);
          return (
            <div key={key} style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', color: nameColor }}>{displayName}</span>
                <span style={{ flex: 1, borderTop: '1px solid var(--border)', marginLeft: 4 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 13, color: 'var(--dim)', whiteSpace: 'nowrap' }}>{sorted.length} upcoming</span>
                  <select
                    value={cadence}
                    onChange={e => setCadence(key, Number(e.target.value))}
                    style={{ fontSize: 12 }}
                    title="release cadence"
                  >
                    {CADENCE_OPTIONS.map(o => <option key={o.days} value={o.days}>{o.label}</option>)}
                  </select>
                  <ActMenu onRetire={() => setRetired(key, true)} />
                </div>
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
