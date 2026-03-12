import {
  differenceInDays,
  endOfMonth,
  isBefore,
  isAfter,
} from 'date-fns';

export const DAY_WIDTH = 5;
export const ROW_HEIGHT = 44;
export const HEADER_HEIGHT = 52;
export const LEFT_COL_WIDTH = 220;
export const PROPERTY_HEADER_HEIGHT = 40;
export const BAR_HEIGHT = 28;
export const BAR_TOP_OFFSET = 8;

export const COLORS = {
  booking: {
    bg: 'hsl(146, 33%, 38%)',
    text: '#fff',
    hover: 'hsl(146, 33%, 32%)',
  },
  airbnb: {
    bg: 'hsl(210, 45%, 46%)',
    text: '#fff',
    hover: 'hsl(210, 45%, 38%)',
  },
  lead: {
    bg: 'hsl(28, 70%, 52%)',
    bgAlpha: 'hsla(28, 70%, 52%, 0.25)',
    stripe: 'hsla(28, 70%, 52%, 0.45)',
    text: 'hsl(28, 70%, 30%)',
    hover: 'hsla(28, 70%, 52%, 0.35)',
  },
  vacant: 'hsl(220, 14%, 95%)',
  todayLine: 'hsl(0, 74%, 50%)',
  monthBorder: 'hsl(220, 14%, 88%)',
  background: 'hsl(0, 0%, 100%)',
};

export function dateToX(d, rangeStart) {
  return differenceInDays(d, rangeStart) * DAY_WIDTH;
}

export function dateSpanWidth(start, end) {
  return Math.max(differenceInDays(end, start) * DAY_WIDTH, DAY_WIDTH);
}

export function clampDate(d, rangeStart, rangeEnd) {
  if (isBefore(d, rangeStart)) return rangeStart;
  if (isAfter(d, rangeEnd)) return rangeEnd;
  return d;
}

export function formatRent(amount) {
  if (amount == null) return 'N/A';
  return `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
