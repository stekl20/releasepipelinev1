import { useState } from 'react';
import type { Release } from '../types';
import { parseDate, snapToNextTuesday, isoDateString } from '../utils/dates';
import { slugify } from '../utils/slugify';

interface QuickEntryProps {
  existingReleases: Release[];
  onAdd: (releases: Release[]) => void;
  onClose: () => void;
}

interface ParsedEntry {
  act: string;
  title: string;
  date: string;
  distributed: boolean;
}

function parseQuickText(text: string): { entries: ParsedEntry[]; errors: string[] } {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const entries: ParsedEntry[] = [];
  const errors: string[] = [];

  let currentDate: string | null = null;
  let currentDistributed = false;

  for (const line of lines) {
    // Check for "distributed for date: act - title" or "date: act - title" single-line format
    let checkLine = line;
    let singleLineDistributed = false;
    if (/^distributed\s+for\s+/i.test(line)) {
      singleLineDistributed = true;
      checkLine = line.replace(/^distributed\s+for\s+/i, '');
    } else if (/^for\s+/i.test(line)) {
      checkLine = line.replace(/^for\s+/i, '');
    }
    const colonIdx = checkLine.indexOf(': ');
    if (colonIdx > 0) {
      const potentialDate = checkLine.slice(0, colonIdx);
      const rest = checkLine.slice(colonIdx + 2);
      const parsedDate = parseDate(potentialDate);
      if (parsedDate && rest.includes(' - ')) {
        const { date: snapped } = snapToNextTuesday(parsedDate);
        const isoDate = isoDateString(snapped);
        const di = rest.indexOf(' - ');
        const act = rest.slice(0, di).trim();
        const title = rest.slice(di + 3).trim();
        if (act && title) {
          entries.push({ act, title, date: isoDate, distributed: singleLineDistributed });
          continue;
        }
      }
    }

    // Try to detect a date header line — e.g. "distributed for 3/31:" or "Apr 7:"
    const isActTitle = line.includes(' - ');
    const headerMatch = line.match(/^(?:(distributed)\s+for\s+|for\s+)?(.+?)[:：]?\s*$/i);

    if (!isActTitle && headerMatch) {
      const maybeDistributed = !!headerMatch[1];
      const datePart = headerMatch[2].trim();
      const parsed = parseDate(datePart);
      if (parsed) {
        const { date: snapped } = snapToNextTuesday(parsed);
        currentDate = isoDateString(snapped);
        currentDistributed = maybeDistributed;
        continue;
      }
    }

    // Try to parse as "Act - Title" using current date context
    const dashIdx = line.indexOf(' - ');
    if (dashIdx === -1) {
      errors.push(`couldn't parse line: "${line}"`);
      continue;
    }

    const act = line.slice(0, dashIdx).trim();
    const title = line.slice(dashIdx + 3).trim();

    if (!act || !title) {
      errors.push(`couldn't parse line: "${line}"`);
      continue;
    }

    if (!currentDate) {
      errors.push(`no date set before: "${line}" — add a date header like "Apr 7:" above`);
      continue;
    }

    entries.push({ act, title, date: currentDate, distributed: currentDistributed });
  }

  return { entries, errors };
}

export function QuickEntry({ existingReleases, onAdd, onClose }: QuickEntryProps) {
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  function handleSubmit() {
    const { entries, errors: errs } = parseQuickText(text);
    setErrors(errs);

    if (entries.length === 0) return;

    const existingById = new Map(existingReleases.map(r => [r.id, r]));
    const newReleases: Release[] = entries.map(e => {
      const id = slugify(`${e.act}-${e.title}-${e.date}`);
      const existing = existingById.get(id);
      return {
        id,
        act: e.act,
        title: e.title,
        date: e.date,
        distributed: e.distributed,
        approved: existing?.approved ?? false,
      };
    });

    // Merge: keep existing releases, add/update new ones
    const merged = [...existingReleases];
    for (const nr of newReleases) {
      const idx = merged.findIndex(r => r.id === nr.id);
      if (idx >= 0) {
        merged[idx] = { ...merged[idx], distributed: nr.distributed };
      } else {
        merged.push(nr);
      }
    }

    onAdd(merged);
  }

  const preview = text ? parseQuickText(text) : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          width: '100%',
          maxWidth: 540,
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>quick entry</span>
          <button onClick={onClose} style={{ color: 'var(--dim)', fontSize: 13 }}>[close]</button>
        </div>

        <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 12 }}>
          paste a list. date headers set the date for lines below them. prefix with "distributed for" to mark as distributed.
        </div>

        <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 12, fontFamily: 'inherit', lineHeight: 1.8 }}>
          <span style={{ color: 'var(--amber)' }}>distributed for 3/31:</span><br />
          Act Name - Song Title<br />
          Another Act - Another Song<br />
          <span style={{ color: 'var(--amber)' }}>Apr 7:</span><br />
          Act Name - Song Title
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={'distributed for 3/31:\nILY Ghoul - close\nKysa - menu\n\nApr 7:\nCarlyle - jean'}
          autoFocus
          style={{
            width: '100%',
            height: 200,
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            fontFamily: 'inherit',
            fontSize: 14,
            padding: 12,
            resize: 'vertical',
            outline: 'none',
            display: 'block',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />

        {/* Live preview */}
        {preview && preview.entries.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 13 }}>
            <span style={{ color: 'var(--dim)' }}>adding {preview.entries.length} release{preview.entries.length !== 1 ? 's' : ''}:</span>
            {preview.entries.map((e, i) => (
              <div key={i} style={{ color: 'var(--text)', paddingLeft: 8, marginTop: 2 }}>
                {e.act} — {e.title}
                <span style={{ color: 'var(--dim)', marginLeft: 8 }}>
                  {new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {e.distributed && <span style={{ color: 'var(--green)', marginLeft: 6 }}>distributed</span>}
                </span>
              </div>
            ))}
          </div>
        )}

        {errors.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {errors.map((err, i) => (
              <div key={i} style={{ color: 'var(--red)', fontSize: 12 }}>{err}</div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            style={{
              border: '1px solid var(--border)',
              padding: '6px 16px',
              fontSize: 13,
              color: text.trim() ? 'var(--text)' : 'var(--dim)',
              cursor: text.trim() ? 'pointer' : 'default',
            }}
          >
            [ add releases ]
          </button>
          <button onClick={onClose} style={{ fontSize: 13, color: 'var(--dim)' }}>
            cancel
          </button>
        </div>
      </div>
    </div>
  );
}
