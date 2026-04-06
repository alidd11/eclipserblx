// Centralized date utility — single import point for all date-fns usage.
// Import from '@/lib/dateUtils' instead of 'date-fns' directly.

export {
  format,
  formatDistanceToNow,
  subDays,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  isAfter,
  isBefore,
  isFuture,
  isPast,
  isWithinInterval,
  eachDayOfInterval,
  subMonths,
  subHours,
  parseISO,
  endOfMonth,
  endOfDay,
  endOfWeek,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  addDays,
  addHours,
} from 'date-fns';

// ── Project-standard formatters ──────────────────────────────────────

import { format as _fmt, formatDistanceToNow as _fdr } from 'date-fns';

/** "Jan 5, 2025" */
export function formatDate(date: string | Date): string {
  return _fmt(new Date(date), 'MMM d, yyyy');
}

/** "Jan 5, 2025 2:30 PM" */
export function formatDateTime(date: string | Date): string {
  return _fmt(new Date(date), 'MMM d, yyyy h:mm a');
}

/** "3 hours ago" */
export function formatRelative(date: string | Date): string {
  return _fdr(new Date(date), { addSuffix: true });
}
