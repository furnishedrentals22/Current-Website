import { parseISO, format, max as dateMax, min as dateMin } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { dateToX, dateSpanWidth, BAR_TOP_OFFSET, BAR_HEIGHT, COLORS, formatRent } from './calendarConstants';

export function BookingBar({ booking, rangeStart, rangeEnd, onTenantClick }) {
  const start = dateMax([parseISO(booking.start_date), rangeStart]);
  const end = dateMin([parseISO(booking.end_date), rangeEnd]);
  const x = dateToX(start, rangeStart);
  const w = dateSpanWidth(start, end);
  const isAirbnb = booking.is_airbnb_vrbo;
  const colors = isAirbnb ? COLORS.airbnb : COLORS.booking;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="absolute cursor-pointer transition-shadow duration-150 hover:shadow-md"
            style={{ left: x, width: w, top: BAR_TOP_OFFSET, height: BAR_HEIGHT, backgroundColor: colors.bg, borderRadius: 6, overflow: 'hidden', zIndex: 3 }}
            onClick={(e) => { e.stopPropagation(); onTenantClick(booking.tenant_id); }}
            data-testid="calendar-timeline-booking-bar">
            {w > 60 && (
              <span className="absolute inset-0 flex items-center px-2 text-xs font-medium truncate" style={{ color: colors.text }}>
                {booking.name}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg max-w-xs text-foreground">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{booking.name}</p>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{isAirbnb ? 'Airbnb/VRBO' : 'Long-term'}</Badge>
              {!isAirbnb && booking.is_m2m && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-200">M2M</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(parseISO(booking.start_date), 'MMM d, yyyy')} — {format(parseISO(booking.end_date), 'MMM d, yyyy')}
            </p>
            <p className="text-sm font-medium tabular-nums">
              {isAirbnb ? `Total: ${formatRent(booking.rent_amount)}` : `${formatRent(booking.rent_amount)}/mo`}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
