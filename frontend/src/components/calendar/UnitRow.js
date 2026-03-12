import { Badge } from '@/components/ui/badge';
import { BookingBar } from './BookingBar';
import { LeadOverlay } from './LeadOverlay';
import { dateToX, ROW_HEIGHT, LEFT_COL_WIDTH, COLORS } from './calendarConstants';

export function UnitRow({ unit, rangeStart, rangeEnd, months, totalWidth, onTenantClick }) {
  return (
    <div className="flex" style={{ height: ROW_HEIGHT }} data-testid="calendar-timeline-unit-row">
      <div className="sticky left-0 z-10 flex items-center gap-2 px-4 border-r border-b bg-card"
        style={{ width: LEFT_COL_WIDTH, minWidth: LEFT_COL_WIDTH }}>
        <Badge variant="secondary" className="text-xs font-medium px-2 py-0.5">{unit.unit_number}</Badge>
        <span className="text-xs text-muted-foreground truncate">{unit.unit_size}</span>
      </div>
      <div className="relative border-b" style={{ width: totalWidth, backgroundColor: COLORS.vacant }}>
        {months.map((month, i) => (
          <div key={i} className="absolute top-0 h-full border-r" style={{ left: dateToX(month, rangeStart), borderColor: COLORS.monthBorder }} />
        ))}
        {unit.leads.map((lead) => (
          <LeadOverlay key={lead.lead_id} lead={lead} bookings={unit.bookings} rangeStart={rangeStart} rangeEnd={rangeEnd} onLeadClick={() => {}} />
        ))}
        {unit.bookings.map((booking) => (
          <BookingBar key={booking.tenant_id} booking={booking} rangeStart={rangeStart} rangeEnd={rangeEnd} onTenantClick={onTenantClick} />
        ))}
      </div>
    </div>
  );
}
