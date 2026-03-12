import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getCalendarTimeline, getProperties, getTenants } from '@/lib/api';
import { TenantDetailModal } from '@/components/TenantDetailModal';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  differenceInDays,
  parseISO,
  format,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  isWithinInterval,
  addMonths,
  subMonths,
  isBefore,
  isAfter,
  isSameDay,
  max as dateMax,
  min as dateMin,
} from 'date-fns';

// ============================================================
// CONSTANTS
// ============================================================
const DAY_WIDTH = 5; // pixels per day
const ROW_HEIGHT = 44; // pixels per unit row
const HEADER_HEIGHT = 52; // month header height
const LEFT_COL_WIDTH = 220; // sticky left label width
const PROPERTY_HEADER_HEIGHT = 40;
const BAR_HEIGHT = 28;
const BAR_TOP_OFFSET = 8;

// Colors per design guidelines
const COLORS = {
  booking: {
    bg: 'hsl(146, 33%, 38%)',      // chart-2 green
    text: '#fff',
    hover: 'hsl(146, 33%, 32%)',
  },
  airbnb: {
    bg: 'hsl(210, 45%, 46%)',       // chart-4 blue
    text: '#fff',
    hover: 'hsl(210, 45%, 38%)',
  },
  lead: {
    bg: 'hsl(28, 70%, 52%)',        // chart-3 amber
    bgAlpha: 'hsla(28, 70%, 52%, 0.25)',
    stripe: 'hsla(28, 70%, 52%, 0.45)',
    text: 'hsl(28, 70%, 30%)',
    hover: 'hsla(28, 70%, 52%, 0.35)',
  },
  vacant: 'hsl(220, 14%, 95%)',     // light gray
  todayLine: 'hsl(0, 74%, 50%)',    // destructive red
  monthBorder: 'hsl(220, 14%, 88%)',// border
  background: 'hsl(0, 0%, 100%)',
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/** Get the pixel x-offset for a date within the timeline range */
function dateToX(d, rangeStart) {
  const days = differenceInDays(d, rangeStart);
  return days * DAY_WIDTH;
}

/** Get the pixel width for a date span */
function dateSpanWidth(start, end) {
  const days = differenceInDays(end, start);
  return Math.max(days * DAY_WIDTH, DAY_WIDTH); // minimum 1 day wide
}

/** Clamp a date to the visible range */
function clampDate(d, rangeStart, rangeEnd) {
  if (isBefore(d, rangeStart)) return rangeStart;
  if (isAfter(d, rangeEnd)) return rangeEnd;
  return d;
}

/** Format rent as currency */
function formatRent(amount) {
  if (amount == null) return 'N/A';
  return `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ============================================================
// COMPONENTS
// ============================================================

/** Striped pattern SVG for leads */
function LeadPatternDef() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <defs>
        <pattern id="lead-stripe" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
          <rect width="4" height="8" fill={COLORS.lead.stripe} />
        </pattern>
      </defs>
    </svg>
  );
}

/** Month header row across the top */
function TimelineHeader({ months, rangeStart, totalWidth }) {
  return (
    <div
      className="sticky top-0 z-20 flex"
      style={{ height: HEADER_HEIGHT }}
      data-testid="calendar-timeline-month-header"
    >
      {/* Sticky left spacer */}
      <div
        className="sticky left-0 z-30 flex items-end pb-2 px-4 border-b border-r bg-card"
        style={{ width: LEFT_COL_WIDTH, minWidth: LEFT_COL_WIDTH }}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Property / Unit
        </span>
      </div>
      {/* Month labels */}
      <div className="relative border-b bg-card" style={{ width: totalWidth }}>
        {months.map((month, i) => {
          const x = dateToX(month, rangeStart);
          const monthEnd = endOfMonth(month);
          const w = dateSpanWidth(month, monthEnd);
          return (
            <div
              key={i}
              className="absolute top-0 flex items-end pb-2 px-3 border-r"
              style={{
                left: x,
                width: w,
                height: HEADER_HEIGHT,
                borderColor: COLORS.monthBorder,
              }}
            >
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

/** Booking bar for a confirmed tenant */
function BookingBar({ booking, rangeStart, rangeEnd, onTenantClick }) {
  const start = dateMax([parseISO(booking.start_date), rangeStart]);
  const end = dateMin([parseISO(booking.end_date), rangeEnd]);
  const x = dateToX(start, rangeStart);
  const w = dateSpanWidth(start, end);
  const isAirbnb = booking.is_airbnb_vrbo;
  const colors = isAirbnb ? COLORS.airbnb : COLORS.booking;

  const handleClick = (e) => {
    e.stopPropagation();
    onTenantClick(booking.tenant_id);
  };

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="absolute cursor-pointer transition-shadow duration-150 hover:shadow-md"
            style={{
              left: x,
              width: w,
              top: BAR_TOP_OFFSET,
              height: BAR_HEIGHT,
              backgroundColor: colors.bg,
              borderRadius: 6,
              overflow: 'hidden',
              zIndex: 3,
            }}
            onClick={handleClick}
            data-testid="calendar-timeline-booking-bar"
          >
            {w > 60 && (
              <span
                className="absolute inset-0 flex items-center px-2 text-xs font-medium truncate"
                style={{ color: colors.text }}
              >
                {booking.name}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg max-w-xs text-foreground"
        >
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{booking.name}</p>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {isAirbnb ? 'Airbnb/VRBO' : 'Long-term'}
              </Badge>
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

/** Lead overlay bar (striped pattern, only on vacant days) */
function LeadOverlay({ lead, bookings, rangeStart, rangeEnd, onLeadClick }) {
  // Split lead range into visible "vacant-only" segments
  const leadStart = dateMax([parseISO(lead.start_date), rangeStart]);
  const leadEnd = dateMin([parseISO(lead.end_date), rangeEnd]);

  if (!isBefore(leadStart, leadEnd) && !isSameDay(leadStart, leadEnd)) return null;

  // Build occupied intervals from bookings
  const occupied = bookings.map((b) => ({
    start: parseISO(b.start_date),
    end: parseISO(b.end_date),
  }));

  // Find vacant segments within lead range
  const vacantSegments = [];
  let cursor = leadStart;

  // Sort occupied by start
  const sorted = [...occupied].sort((a, b) => a.start - b.start);

  for (const occ of sorted) {
    const occStart = dateMax([occ.start, rangeStart]);
    const occEnd = dateMin([occ.end, rangeEnd]);

    if (isBefore(cursor, occStart)) {
      // Vacant gap before this booking
      const gapEnd = dateMin([occStart, leadEnd]);
      if (isBefore(cursor, gapEnd)) {
        vacantSegments.push({ start: cursor, end: gapEnd });
      }
    }
    cursor = dateMax([cursor, occEnd]);
  }

  // Remaining gap after last booking
  if (isBefore(cursor, leadEnd)) {
    vacantSegments.push({ start: cursor, end: leadEnd });
  }

  if (vacantSegments.length === 0) return null;

  const handleClick = (e) => {
    e.stopPropagation();
    if (onLeadClick) onLeadClick(lead.lead_id);
  };

  return (
    <>
      {vacantSegments.map((seg, i) => {
        const x = dateToX(seg.start, rangeStart);
        const w = dateSpanWidth(seg.start, seg.end);
        return (
          <TooltipProvider key={i} delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="absolute cursor-pointer transition-opacity duration-150 hover:opacity-80"
                  style={{
                    left: x,
                    width: w,
                    top: BAR_TOP_OFFSET,
                    height: BAR_HEIGHT,
                    borderRadius: 6,
                    overflow: 'hidden',
                    zIndex: 2,
                    border: `1.5px dashed ${COLORS.lead.bg}`,
                    background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Cpath d='M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4' stroke='${encodeURIComponent(COLORS.lead.stripe)}' stroke-width='2'/%3E%3C/svg%3E"), ${COLORS.lead.bgAlpha}`,
                  }}
                  onClick={handleClick}
                  data-testid="calendar-timeline-lead-overlay"
                >
                  {w > 70 && (
                    <span
                      className="absolute inset-0 flex items-center px-2 text-[11px] font-medium truncate"
                      style={{ color: COLORS.lead.text }}
                    >
                      {lead.name}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg max-w-xs text-foreground"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{lead.name}</p>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Lead</Badge>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(lead.start_date), 'MMM d, yyyy')} — {format(parseISO(lead.end_date), 'MMM d, yyyy')}
                  </p>
                  {lead.rent_amount != null && (
                    <p className="text-sm font-medium tabular-nums">Offered: {formatRent(lead.rent_amount)}</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </>
  );
}

/** Single unit row in the timeline */
function UnitRow({ unit, rangeStart, rangeEnd, months, totalWidth, onTenantClick }) {
  return (
    <div className="flex" style={{ height: ROW_HEIGHT }} data-testid="calendar-timeline-unit-row">
      {/* Sticky left label */}
      <div
        className="sticky left-0 z-10 flex items-center gap-2 px-4 border-r border-b bg-card"
        style={{ width: LEFT_COL_WIDTH, minWidth: LEFT_COL_WIDTH }}
      >
        <Badge variant="secondary" className="text-xs font-medium px-2 py-0.5">
          {unit.unit_number}
        </Badge>
        <span className="text-xs text-muted-foreground truncate">{unit.unit_size}</span>
      </div>
      {/* Timeline lane */}
      <div className="relative border-b" style={{ width: totalWidth, backgroundColor: COLORS.vacant }}>
        {/* Month grid lines */}
        {months.map((month, i) => {
          const x = dateToX(month, rangeStart);
          return (
            <div
              key={i}
              className="absolute top-0 h-full border-r"
              style={{ left: x, borderColor: COLORS.monthBorder }}
            />
          );
        })}
        {/* Lead overlays (render first, behind bookings) */}
        {unit.leads.map((lead) => (
          <LeadOverlay
            key={lead.lead_id}
            lead={lead}
            bookings={unit.bookings}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onLeadClick={() => {}}
          />
        ))}
        {/* Booking bars */}
        {unit.bookings.map((booking) => (
          <BookingBar
            key={booking.tenant_id}
            booking={booking}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onTenantClick={onTenantClick}
          />
        ))}
      </div>
    </div>
  );
}

/** Property group header + unit rows */
function PropertyGroup({ property, rangeStart, rangeEnd, months, totalWidth, onTenantClick }) {
  return (
    <div>
      {/* Property header */}
      <div className="flex" style={{ height: PROPERTY_HEADER_HEIGHT }}>
        <div
          className="sticky left-0 z-10 flex items-center px-4 bg-muted/50 border-b border-r"
          style={{ width: LEFT_COL_WIDTH, minWidth: LEFT_COL_WIDTH }}
        >
          <span className="text-sm font-semibold tracking-tight truncate">{property.property_name}</span>
          <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
            {property.units.length} {property.units.length === 1 ? 'unit' : 'units'}
          </Badge>
        </div>
        <div className="relative bg-muted/50 border-b" style={{ width: totalWidth }}>
          {/* Month grid lines in property header */}
          {months.map((month, i) => {
            const x = dateToX(month, rangeStart);
            return (
              <div
                key={i}
                className="absolute top-0 h-full border-r"
                style={{ left: x, borderColor: COLORS.monthBorder }}
              />
            );
          })}
        </div>
      </div>
      {/* Unit rows */}
      {property.units.map((unit) => (
        <UnitRow
          key={unit.unit_id}
          unit={unit}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          months={months}
          totalWidth={totalWidth}
          onTenantClick={onTenantClick}
        />
      ))}
    </div>
  );
}

/** Today marker line */
function TodayMarker({ today, rangeStart, totalHeight }) {
  const x = dateToX(today, rangeStart);
  return (
    <div
      className="absolute top-0 z-10 pointer-events-none"
      style={{ left: LEFT_COL_WIDTH + x, width: 2, height: totalHeight, backgroundColor: COLORS.todayLine, opacity: 0.6 }}
    >
      <div
        className="absolute -top-0 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-semibold text-white whitespace-nowrap"
        style={{ backgroundColor: COLORS.todayLine }}
      >
        Today
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function CalendarPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [tenantDetailId, setTenantDetailId] = useState(null);
  const scrollRef = useRef(null);

  // Fetch property list for selector
  useEffect(() => {
    getProperties().then(setProperties).catch(() => {});
  }, []);

  // Fetch timeline data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedProperty !== 'all') {
        params.property_id = selectedProperty;
      }
      const result = await getCalendarTimeline(params);
      setData(result);
    } catch (e) {
      toast.error('Failed to load timeline data');
    } finally {
      setLoading(false);
    }
  }, [selectedProperty]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute derived values
  const { rangeStart, rangeEnd, months, totalWidth, today, totalHeight } = useMemo(() => {
    if (!data) return { rangeStart: new Date(), rangeEnd: new Date(), months: [], totalWidth: 0, today: new Date(), totalHeight: 0 };

    const rs = parseISO(data.range_start);
    const re = parseISO(data.range_end);
    const t = parseISO(data.today);
    const ms = eachMonthOfInterval({ start: rs, end: re });
    const totalDays = differenceInDays(re, rs);
    const tw = totalDays * DAY_WIDTH;

    // Calculate total height
    let th = HEADER_HEIGHT;
    for (const prop of data.properties) {
      th += PROPERTY_HEADER_HEIGHT;
      th += prop.units.length * ROW_HEIGHT;
    }

    return { rangeStart: rs, rangeEnd: re, months: ms, totalWidth: tw, today: t, totalHeight: th };
  }, [data]);

  // Scroll to "today" on initial load
  useEffect(() => {
    if (data && scrollRef.current) {
      const todayX = dateToX(today, rangeStart);
      // Scroll so today is about 1/4 from the left
      const scrollTarget = todayX - 200;
      scrollRef.current.scrollLeft = Math.max(0, scrollTarget);
    }
  }, [data, today, rangeStart]);

  // Scroll left/right by 3 months
  const scrollBy = (direction) => {
    if (!scrollRef.current) return;
    const monthPixels = 30 * DAY_WIDTH * 3; // ~3 months
    scrollRef.current.scrollBy({ left: direction * monthPixels, behavior: 'smooth' });
  };

  return (
    <div className="space-y-5" data-testid="calendar-timeline-page">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Occupancy Timeline</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Scroll horizontally to view occupancy across months
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Property selector */}
          <Select value={selectedProperty} onValueChange={setSelectedProperty} data-testid="calendar-property-selector">
            <SelectTrigger className="w-[200px] h-9 text-sm" data-testid="calendar-property-selector-trigger">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Scroll buttons */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => scrollBy(-1)} data-testid="calendar-scroll-left-button">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (scrollRef.current) {
                  const todayX = dateToX(today, rangeStart);
                  scrollRef.current.scrollTo({ left: Math.max(0, todayX - 200), behavior: 'smooth' });
                }
              }}
              data-testid="calendar-scroll-today-button"
            >
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => scrollBy(1)} data-testid="calendar-scroll-right-button">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-3.5 w-8 rounded" style={{ backgroundColor: COLORS.booking.bg }} />
          <span className="text-muted-foreground">Long-term Tenant</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3.5 w-8 rounded" style={{ backgroundColor: COLORS.airbnb.bg }} />
          <span className="text-muted-foreground">Airbnb / VRBO</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3.5 w-8 rounded" style={{ backgroundColor: COLORS.vacant }} />
          <span className="text-muted-foreground">Vacant</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="h-3.5 w-8 rounded"
            style={{
              border: `1.5px dashed ${COLORS.lead.bg}`,
              background: `repeating-linear-gradient(45deg, transparent, transparent 2px, ${COLORS.lead.stripe} 2px, ${COLORS.lead.stripe} 4px)`,
            }}
          />
          <span className="text-muted-foreground">Lead Interest</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3.5 w-0.5 rounded" style={{ backgroundColor: COLORS.todayLine }} />
          <span className="text-muted-foreground">Today</span>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {/* Empty state */}
      {!loading && data && data.properties.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CalendarIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-heading text-lg font-semibold">No properties to display</h3>
            <p className="text-sm text-muted-foreground mt-1">Add properties and units to see the timeline</p>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {!loading && data && data.properties.length > 0 && (
        <Card className="overflow-hidden border border-border/70" data-testid="calendar-timeline-card">
          <div
            ref={scrollRef}
            className="overflow-auto relative"
            style={{ maxHeight: 'calc(100vh - 280px)' }}
            data-testid="calendar-timeline-scroll"
          >
            {/* Month header */}
            <TimelineHeader months={months} rangeStart={rangeStart} totalWidth={totalWidth} />

            {/* Property groups */}
            {data.properties.map((property) => (
              <PropertyGroup
                key={property.property_id}
                property={property}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                months={months}
                totalWidth={totalWidth}
                onTenantClick={(tid) => setTenantDetailId(tid)}
              />
            ))}

            {/* Today marker */}
            <TodayMarker today={today} rangeStart={rangeStart} totalHeight={totalHeight} />
          </div>
        </Card>
      )}

      {/* Tenant Detail Modal */}
      <TenantDetailModal
        tenantId={tenantDetailId}
        open={!!tenantDetailId}
        onClose={() => setTenantDetailId(null)}
      />
    </div>
  );
}
