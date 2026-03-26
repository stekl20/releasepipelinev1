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

export function isoDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
