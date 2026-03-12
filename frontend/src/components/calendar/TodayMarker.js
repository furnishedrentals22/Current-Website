import { dateToX, LEFT_COL_WIDTH, COLORS } from './calendarConstants';

export function TodayMarker({ today, rangeStart, totalHeight }) {
  const x = dateToX(today, rangeStart);
  return (
    <div className="absolute top-0 z-10 pointer-events-none"
      style={{ left: LEFT_COL_WIDTH + x, width: 2, height: totalHeight, backgroundColor: COLORS.todayLine, opacity: 0.6 }}>
      <div className="absolute -top-0 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-semibold text-white whitespace-nowrap"
        style={{ backgroundColor: COLORS.todayLine }}>
        Today
      </div>
    </div>
  );
}
