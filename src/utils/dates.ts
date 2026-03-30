import { parseISO, parse, isValid, getDay, differenceInCalendarWeeks, startOfDay } from 'date-fns';

export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Try ISO format first
  let d = parseISO(dateStr);
  if (isValid(d)) return d;

  // Try Notion's human-readable formats: "April 7, 2025", "Apr 7, 2025"
  const formats = [
    'MMMM d, yyyy',
    'MMM d, yyyy',
    'MMMM dd, yyyy',
    'MMM dd, yyyy',
    'MM/dd/yyyy',
    'M/d/yyyy',
    // Month/day without year — e.g. "3/31", "4/7"
    'M/d',
    // Month name without year — e.g. "Apr 7", "April 7"
    'MMMM d',
    'MMM d',
    'MMMM dd',
    'MMM dd',
  ];

  for (const fmt of formats) {
    d = parse(dateStr, fmt, new Date());
    if (isValid(d)) return d;
  }

  return null;
}

export function snapToNextTuesday(date: Date): { date: Date; snapped: boolean } {
  const day = getDay(date); // 0=Sun, 2=Tue
  if (day === 2) return { date, snapped: false };

  // Find next Tuesday
  let next = new Date(date);
  let daysToAdd = (2 - day + 7) % 7;
  if (daysToAdd === 0) daysToAdd = 7;
  next.setDate(next.getDate() + daysToAdd);
  return { date: next, snapped: true };
}

export function weeksOut(releaseDate: Date, today: Date): number {
  return differenceInCalendarWeeks(startOfDay(releaseDate), startOfDay(today));
}

export function formatDate(dateStr: string): string {
  const d = parseDate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Find the next Tuesday at or after (latestDate + cadence) that has fewer than target releases.
// releasesPerDate maps ISO date string → release count for all releases.
export function findNextOpenSlot(
  latestDate: Date,
  cadence: number,
  releasesPerDate: Map<string, number>,
  target: number = 7
): Date {
  // Start from the ideal date and snap to the next Tuesday
  let candidate = addDays(latestDate, cadence);
  const day = candidate.getDay(); // 0=Sun, 2=Tue
  if (day !== 2) {
    const daysToTuesday = (2 - day + 7) % 7 || 7;
    candidate = addDays(candidate, daysToTuesday);
  }

  // Walk forward week by week until we find a slot with room
  for (let i = 0; i < 13; i++) {
    const key = isoDateString(candidate);
    if ((releasesPerDate.get(key) ?? 0) < target) return candidate;
    candidate = addDays(candidate, 7);
  }

  return candidate; // fallback: return even if full
}

export function isoDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
