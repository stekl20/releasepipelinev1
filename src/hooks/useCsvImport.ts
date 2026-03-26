import Papa from 'papaparse';
import type { Release } from '../types';
import { parseDate, snapToNextTuesday, isoDateString } from '../utils/dates';
import { slugify } from '../utils/slugify';

export interface ImportResult {
  releases: Release[];
  warnings: string[];
  error?: string;
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

function findColumn(row: Record<string, string>, ...names: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const name of names) {
    const found = keys.find(k => normalizeKey(k) === name.toLowerCase());
    if (found !== undefined) return row[found];
  }
  return undefined;
}

function findColumnName(headers: string[], ...names: string[]): string | undefined {
  for (const name of names) {
    const found = headers.find(h => normalizeKey(h) === name.toLowerCase());
    if (found) return found;
  }
  return undefined;
}

export function parseCsv(
  csvText: string,
  existingReleases: Release[] = []
): ImportResult {
  const warnings: string[] = [];

  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    return { releases: [], warnings, error: `could not parse csv: ${result.errors[0].message}` };
  }

  const headers = result.meta.fields || [];
  const normalizedHeaders = headers.map(normalizeKey);

  const hasAct = normalizedHeaders.includes('act');
  const hasTitle = normalizedHeaders.includes('title');
  const hasDate = findColumnName(headers, 'release date') !== undefined;
  const hasDistributed = normalizedHeaders.includes('distributed');

  const missing: string[] = [];
  if (!hasAct) missing.push('Act');
  if (!hasTitle) missing.push('Title');
  if (!hasDate) missing.push('Release Date');
  if (!hasDistributed) warnings.push('missing column: Distributed (defaulting to false)');

  if (missing.length > 0) {
    return {
      releases: [],
      warnings,
      error: `could not parse csv. missing required column: ${missing.join(', ')}`,
    };
  }

  const existingById = new Map<string, Release>(existingReleases.map(r => [r.id, r]));

  const releases: Release[] = [];

  for (const row of result.data) {
    const act = findColumn(row, 'act') || '';
    const title = findColumn(row, 'title') || '';
    const dateRaw = findColumn(row, 'release date') || '';
    const distributedRaw = findColumn(row, 'distributed') || 'false';

    if (!act && !title) continue;

    const parsedDate = parseDate(dateRaw);
    if (!parsedDate) {
      warnings.push(`could not parse date "${dateRaw}" for ${act} - ${title}, skipping`);
      continue;
    }

    const { date: snappedDate, snapped } = snapToNextTuesday(parsedDate);
    if (snapped) {
      warnings.push(`date for "${title}" by ${act} was not a Tuesday — snapped to ${isoDateString(snappedDate)}`);
    }

    const isoDate = isoDateString(snappedDate);
    const id = slugify(`${act}-${title}-${isoDate}`);

    const distributed =
      distributedRaw.trim().toLowerCase() === 'true' ||
      distributedRaw.trim() === '1' ||
      distributedRaw.trim().toLowerCase() === 'yes';

    const existing = existingById.get(id);

    releases.push({
      id,
      act,
      title,
      date: isoDate,
      distributed,
      approved: existing?.approved ?? false,
    });
  }

  return { releases, warnings };
}
