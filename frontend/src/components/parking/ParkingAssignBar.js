import { parseISO, format, max as dateMax, min as dateMin } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { dateToX, dateSpanWidth, BAR_TOP_OFFSET, BAR_HEIGHT, COLORS } from '@/components/calendar/calendarConstants';

const PARKING_COLOR = {
  bg: 'hsl(262, 40%, 50%)',
  text: '#fff',
  hover: 'hsl(262, 40%, 42%)',
};

export function ParkingAssignBar({ assignment, rangeStart, rangeEnd, onClick }) {
  const start = dateMax([parseISO(assignment.start_date), rangeStart]);
  const end = dateMin([parseISO(assignment.end_date), rangeEnd]);
  const x = dateToX(start, rangeStart);
  const w = dateSpanWidth(start, end);

  const label = `${assignment.tenant_name}${assignment.unit_number ? ` | ${assignment.unit_number}` : ''}`;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="absolute cursor-pointer transition-shadow duration-150 hover:shadow-md"
            style={{
              left: x, width: w, top: BAR_TOP_OFFSET, height: BAR_HEIGHT,
              backgroundColor: PARKING_COLOR.bg, borderRadius: 6, overflow: 'hidden', zIndex: 3,
            }}
            onClick={(e) => { e.stopPropagation(); onClick(assignment); }}
            data-testid="parking-assignment-bar"
          >
            {w > 60 && (
              <span className="absolute inset-0 flex items-center px-2 text-xs font-medium truncate" style={{ color: PARKING_COLOR.text }}>
                {label}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg max-w-xs text-foreground">
          <div className="space-y-1">
            <p className="text-sm font-semibold">{assignment.tenant_name}</p>
            {assignment.unit_number && <p className="text-xs text-muted-foreground">Unit {assignment.unit_number}</p>}
            <p className="text-xs text-muted-foreground">
              {format(parseISO(assignment.start_date), 'MMM d, yyyy')} — {format(parseISO(assignment.end_date), 'MMM d, yyyy')}
            </p>
            {assignment.notes && <p className="text-xs italic text-muted-foreground">{assignment.notes}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
