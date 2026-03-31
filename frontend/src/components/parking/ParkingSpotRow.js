import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ParkingAssignBar } from './ParkingAssignBar';
import { dateToX, ROW_HEIGHT, LEFT_COL_WIDTH, COLORS } from '@/components/calendar/calendarConstants';
import { UserPlus } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

export function ParkingSpotRow({ spot, rangeStart, rangeEnd, months, totalWidth, onAssignClick, onBarClick, onRowClick }) {
  const isDecal = spot.spot_type === 'marlins_decal';

  const handleTimelineClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xClick = e.clientX - rect.left;
    const daysFromStart = Math.floor(xClick / 5);
    const clickedDate = new Date(rangeStart);
    clickedDate.setDate(clickedDate.getDate() + daysFromStart);
    const dateStr = clickedDate.toISOString().split('T')[0];
    onRowClick(spot.id, dateStr);
  };

  return (
    <div className="flex" style={{ height: ROW_HEIGHT }} data-testid="parking-spot-row">
      <div
        className="sticky left-0 z-10 flex items-center gap-2 px-3 border-r border-b bg-card"
        style={{ width: LEFT_COL_WIDTH, minWidth: LEFT_COL_WIDTH }}
      >
        <Badge variant={isDecal ? 'secondary' : 'default'} className="text-[10px] px-1.5 py-0 flex-shrink-0">
          {isDecal ? 'Decal' : 'Spot'}
        </Badge>
        <span className="text-xs font-medium truncate">{spot.label}</span>
        {!isDecal && spot.needs_tag && (
          <Badge variant="outline" className="text-[9px] px-1 py-0 flex-shrink-0">Tag</Badge>
        )}
        <Button
          variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto flex-shrink-0"
          onClick={(e) => { e.stopPropagation(); onAssignClick(spot.id); }}
          data-testid="parking-spot-assign-btn"
        >
          <UserPlus className="h-3 w-3" />
        </Button>
      </div>
      <div
        className="relative border-b cursor-crosshair"
        style={{ width: totalWidth, backgroundColor: COLORS.vacant }}
        onClick={handleTimelineClick}
      >
        {months.map((month, i) => (
          <div key={i} className="absolute top-0 h-full border-r" style={{ left: dateToX(month, rangeStart), borderColor: COLORS.monthBorder }} />
        ))}
        {spot.assignments.map((a) => (
          <ParkingAssignBar key={a.id} assignment={a} rangeStart={rangeStart} rangeEnd={rangeEnd} onClick={onBarClick} />
        ))}
      </div>
    </div>
  );
}
