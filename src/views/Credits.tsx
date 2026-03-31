import { useState, useMemo, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import type { Release, CreditRow } from '../types';
import { parseDate, formatDate } from '../utils/dates';
import { useIsMobile } from '../hooks/useIsMobile';

interface CreditsProps {
  releases: Release[];
  credits: Record<string, CreditRow>;
  onUpsert: (releaseId: string, fields: Partial<Omit<CreditRow, 'id' | 'release_id'>>) => void;
}

type CreditField = 'producer' | 'lyrics' | 'mastered' | 'cover_art';
const CREDIT_FIELDS: { key: CreditField; label: string }[] = [
  { key: 'producer', label: 'PRODUCER' },
  { key: 'lyrics', label: 'LYRICS' },
  { key: 'mastered', label: 'MASTERED' },
  { key: 'cover_art', label: 'COVER ART' },
];

type AnyField = CreditField | 'pseudo';

interface FillDrag {
  field: AnyField;
  value: string;
  weekKey: string;
  startRow: number;
  endRow: number;
}

const INPUT_STYLE = {
  background: 'var(--surface)',
  border: '1px solid var(--accent)',
  color: 'var(--text)',
  fontSize: 13,
  fontFamily: 'inherit',
  padding: '2px 6px',
  width: '100%',
  outline: 'none',
} as const;

function EditableCell({
  value,
  listId,
  suggestions,
  highlighted,
  title,
  onSave,
  onFillMouseDown,
  onRowMouseEnter,
}: {
  value: string | undefined;
  listId: string;
  suggestions: string[];
  highlighted: boolean;
  title?: string;
  onSave: (val: string) => void;
  onFillMouseDown: (e: React.MouseEvent) => void;
  onRowMouseEnter: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(value ?? '');
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setLocalVal(value ?? '');
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    onSave(localVal.trim());
  }

  function revert() {
    setEditing(false);
    setLocalVal(value ?? '');
  }

  if (editing) {
    return (
      <>
        <datalist id={listId}>
          {suggestions.map(s => <option key={s} value={s} />)}
        </datalist>
        <input
          ref={inputRef}
          list={listId}
          value={localVal}
          onChange={e => setLocalVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') revert();
          }}
          style={INPUT_STYLE}
        />
      </>
    );
  }

  return (
    <div
      style={{ position: 'relative', background: highlighted ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : undefined }}
      onMouseEnter={() => { setHovered(true); onRowMouseEnter(); }}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        onClick={() => setEditing(true)}
        title={title ?? 'click to edit'}
        style={{
          cursor: 'pointer',
          color: value ? 'var(--text)' : 'var(--dim)',
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          paddingRight: 10,
        }}
      >
        {value || '—'}
      </span>
      {(hovered || highlighted) && (
        <span
          onMouseDown={onFillMouseDown}
          title="drag to fill down"
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 7,
            height: 7,
            background: 'var(--accent)',
            cursor: 'crosshair',
          }}
        />
      )}
    </div>
  );
}

function exportWeekCsv(
  dateKey: string,
  weekReleases: Release[],
  credits: Record<string, CreditRow>,
) {
  const rows = weekReleases.map(r => {
    const c = credits[r.id] ?? {};
    return {
      'Song Name': r.title,
      'Act': r.act,
      'Pseudo': c.pseudo ?? '',
      'Producer': c.producer ?? '',
      'Lyrics': c.lyrics ?? '',
      'Mastered': c.mastered ?? '',
      'Cover Art': c.cover_art ?? '',
      'Release Date': formatDate(r.date),
    };
  });
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `credits-${dateKey}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function Credits({ releases, credits, onUpsert }: CreditsProps) {
  const isMobile = useIsMobile();
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  const [fillDrag, setFillDrag] = useState<FillDrag | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [menuOpen]);

  // Global mouseup: commit fill-down
  useEffect(() => {
    if (!fillDrag) return;
    function onMouseUp() {
      setFillDrag(drag => {
        if (!drag) return null;
        const week = weekGroups.find(([k]) => k === drag.weekKey);
        if (week) {
          const lo = Math.min(drag.startRow, drag.endRow);
          const hi = Math.max(drag.startRow, drag.endRow);
          for (let i = lo; i <= hi; i++) {
            const r = week[1][i];
            if (!r) continue;
            if (drag.field === 'pseudo') {
              applyPseudo(r.act, drag.value);
            } else {
              onUpsert(r.id, { [drag.field]: drag.value });
            }
          }
        }
        return null;
      });
    }
    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, [fillDrag]); // eslint-disable-line react-hooks/exhaustive-deps

  const suggestions = useMemo(() => {
    const map: Record<CreditField, Set<string>> = {
      producer: new Set(),
      lyrics: new Set(),
      mastered: new Set(),
      cover_art: new Set(),
    };
    for (const c of Object.values(credits)) {
      for (const f of CREDIT_FIELDS) {
        const v = c[f.key];
        if (v) map[f.key].add(v);
      }
    }
    return {
      producer: Array.from(map.producer),
      lyrics: Array.from(map.lyrics),
      mastered: Array.from(map.mastered),
      cover_art: Array.from(map.cover_art),
    };
  }, [credits]);

  const pseudoSuggestions = useMemo(() => {
    const seen = new Set<string>();
    for (const c of Object.values(credits)) {
      if (c.pseudo) seen.add(c.pseudo);
    }
    return Array.from(seen);
  }, [credits]);

  // Propagate pseudo to all songs by this act (overwrite)
  function applyPseudo(act: string, pseudo: string) {
    const actKey = act.toLowerCase().trim();
    for (const r of releases) {
      if (r.act.toLowerCase().trim() === actKey) {
        onUpsert(r.id, { pseudo });
      }
    }
  }

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

  function exportAllCsv() {
    const rows = weekGroups.flatMap(([, weekReleases]) =>
      weekReleases.map(r => {
        const c = credits[r.id] ?? {};
        return {
          'Song Name': r.title,
          'Act': r.act,
          'Pseudo': c.pseudo ?? '',
          'Producer': c.producer ?? '',
          'Lyrics': c.lyrics ?? '',
          'Mastered': c.mastered ?? '',
          'Cover Art': c.cover_art ?? '',
          'Release Date': formatDate(r.date),
        };
      })
    );
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credits-all.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getPseudoForAct(act: string): string | undefined {
    const actKey = act.toLowerCase().trim();
    for (const r of releases) {
      if (r.act.toLowerCase().trim() === actKey && credits[r.id]?.pseudo) {
        return credits[r.id].pseudo;
      }
    }
    return undefined;
  }

  function isDragHighlighted(weekKey: string, rowIdx: number, field: AnyField) {
    if (!fillDrag || fillDrag.weekKey !== weekKey || fillDrag.field !== field) return false;
    const lo = Math.min(fillDrag.startRow, fillDrag.endRow);
    const hi = Math.max(fillDrag.startRow, fillDrag.endRow);
    return rowIdx >= lo && rowIdx <= hi;
  }

  if (isMobile) {
    return (
      <div style={{ padding: '32px 16px', color: 'var(--dim)', fontSize: 14 }}>
        credits is only available on desktop.
      </div>
    );
  }

  const colTemplate = '1fr 110px 100px 110px 110px 110px 110px';

  return (
    <div style={{ padding: '32px 0', userSelect: fillDrag ? 'none' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <span style={{ fontSize: 16, fontWeight: 700 }}>credits</span>
        <button onClick={() => setShowAll(v => !v)} style={{ fontSize: 13, color: 'var(--dim)' }}>
          [{showAll ? 'upcoming only' : 'show all'}]
        </button>
        <div ref={menuRef} style={{ position: 'relative', marginLeft: 'auto' }}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{ fontSize: 13, color: 'var(--dim)', letterSpacing: '0.1em' }}
          >
            · · ·
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '6px 0',
              zIndex: 20,
              minWidth: 140,
            }}>
              <button
                onClick={() => { exportAllCsv(); setMenuOpen(false); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', fontSize: 13, color: 'var(--dim)', padding: '6px 14px' }}
              >
                export all csv
              </button>
            </div>
          )}
        </div>
      </div>

      {weekGroups.length === 0 ? (
        <div style={{ color: 'var(--dim)', padding: '24px 0', fontSize: 14 }}>no releases found.</div>
      ) : (
        weekGroups.map(([dateKey, weekReleases]) => {
          const isExpanded = expandedWeek === dateKey;
          return (
            <div key={dateKey} style={{ borderTop: '1px solid var(--border)' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', cursor: 'pointer' }}
                onClick={() => setExpandedWeek(prev => prev === dateKey ? null : dateKey)}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', minWidth: 80 }}>
                  {formatDate(dateKey)}
                </span>
                <span style={{ fontSize: 13, color: 'var(--dim)' }}>
                  {weekReleases.length} track{weekReleases.length !== 1 ? 's' : ''}
                </span>
                {isExpanded && (
                  <button
                    onClick={e => { e.stopPropagation(); exportWeekCsv(dateKey, weekReleases, credits); }}
                    style={{ fontSize: 13, color: 'var(--dim)', marginLeft: 'auto' }}
                  >
                    [export csv]
                  </button>
                )}
                <span style={{ fontSize: 13, color: 'var(--dim)', marginLeft: isExpanded ? 0 : 'auto' }}>
                  {isExpanded ? '▲' : '▼'}
                </span>
              </div>

              {isExpanded && (
                <div style={{ paddingBottom: 16 }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: colTemplate,
                    gap: 8,
                    paddingBottom: 8,
                    fontSize: 12,
                    color: 'var(--dim)',
                    letterSpacing: '0.05em',
                  }}>
                    <span>TITLE</span>
                    <span>ACT</span>
                    <span>PSEUDO</span>
                    {CREDIT_FIELDS.map(f => <span key={f.key}>{f.label}</span>)}
                  </div>
                  <hr style={{ marginBottom: 4 }} />

                  {weekReleases.map((r, rowIdx) => {
                    const c = credits[r.id] ?? {};
                    const pseudo = getPseudoForAct(r.act);
                    return (
                      <div
                        key={r.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: colTemplate,
                          gap: 8,
                          padding: '7px 0',
                          borderTop: '1px solid var(--border)',
                          alignItems: 'center',
                          fontSize: 13,
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                          {r.title}
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--dim)' }}>
                          {r.act}
                        </span>
                        <EditableCell
                          value={pseudo}
                          listId="dl-pseudo"
                          suggestions={pseudoSuggestions}
                          highlighted={isDragHighlighted(dateKey, rowIdx, 'pseudo')}
                          title="click to edit — updates all songs by this act"
                          onSave={val => val && applyPseudo(r.act, val)}
                          onFillMouseDown={e => {
                            e.preventDefault();
                            setFillDrag({ field: 'pseudo', value: pseudo ?? '', weekKey: dateKey, startRow: rowIdx, endRow: rowIdx });
                          }}
                          onRowMouseEnter={() => {
                            if (fillDrag?.field === 'pseudo' && fillDrag.weekKey === dateKey) {
                              setFillDrag(prev => prev ? { ...prev, endRow: rowIdx } : null);
                            }
                          }}
                        />
                        {CREDIT_FIELDS.map(f => (
                          <EditableCell
                            key={f.key}
                            value={c[f.key]}
                            listId={`dl-${f.key}`}
                            suggestions={suggestions[f.key]}
                            highlighted={isDragHighlighted(dateKey, rowIdx, f.key)}
                            onSave={val => onUpsert(r.id, { [f.key]: val })}
                            onFillMouseDown={e => {
                              e.preventDefault();
                              setFillDrag({ field: f.key, value: c[f.key] ?? '', weekKey: dateKey, startRow: rowIdx, endRow: rowIdx });
                            }}
                            onRowMouseEnter={() => {
                              if (fillDrag?.field === f.key && fillDrag.weekKey === dateKey) {
                                setFillDrag(prev => prev ? { ...prev, endRow: rowIdx } : null);
                              }
                            }}
                          />
                        ))}
                      </div>
                    );
                  })}

                  {/* Render datalists once per field outside the rows */}
                  <datalist id="dl-pseudo">
                    {pseudoSuggestions.map(s => <option key={s} value={s} />)}
                  </datalist>
                  {CREDIT_FIELDS.map(f => (
                    <datalist key={f.key} id={`dl-${f.key}`}>
                      {suggestions[f.key].map(s => <option key={s} value={s} />)}
                    </datalist>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
