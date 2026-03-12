import { endOfMonth, format } from 'date-fns';
import { dateToX, dateSpanWidth, HEADER_HEIGHT, LEFT_COL_WIDTH, COLORS } from './calendarConstants';

export function TimelineHeader({ months, rangeStart, totalWidth }) {
  return (
    <div className="sticky top-0 z-20 flex" style={{ height: HEADER_HEIGHT }} data-testid="calendar-timeline-month-header">
      <div className="sticky left-0 z-30 flex items-end pb-2 px-4 border-b border-r bg-card"
        style={{ width: LEFT_COL_WIDTH, minWidth: LEFT_COL_WIDTH }}>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Property / Unit</span>
      </div>
      <div className="relative border-b bg-card" style={{ width: totalWidth }}>
        {months.map((month, i) => {
          const x = dateToX(month, rangeStart);
          const w = dateSpanWidth(month, endOfMonth(month));
          return (
            <div key={i} className="absolute top-0 flex items-end pb-2 px-3 border-r"
              style={{ left: x, width: w, height: HEADER_HEIGHT, borderColor: COLORS.monthBorder }}>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                {format(month, 'MMM yyyy')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
