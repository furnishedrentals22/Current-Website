import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getCalendarTimeline, getProperties } from '@/lib/api';
import { TenantDetailModal } from '@/components/TenantDetailModal';
import { LeadDetailModal } from '@/components/calendar/LeadDetailModal';
import { TimelineHeader } from '@/components/calendar/TimelineHeader';
import { PropertyGroup } from '@/components/calendar/PropertyGroup';
import { TodayMarker } from '@/components/calendar/TodayMarker';
import { dateToX, DAY_WIDTH, HEADER_HEIGHT, PROPERTY_HEADER_HEIGHT, ROW_HEIGHT, COLORS } from '@/components/calendar/calendarConstants';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { differenceInDays, parseISO, eachMonthOfInterval } from 'date-fns';

export default function CalendarPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [tenantDetailId, setTenantDetailId] = useState(null);
  const [leadDetailId, setLeadDetailId] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => { getProperties().then(setProperties).catch(() => {}); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedProperty !== 'all') params.property_id = selectedProperty;
      const result = await getCalendarTimeline(params);
      setData(result);
    } catch { toast.error('Failed to load timeline data'); }
    finally { setLoading(false); }
  }, [selectedProperty]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const { rangeStart, rangeEnd, months, totalWidth, today, totalHeight } = useMemo(() => {
    if (!data) return { rangeStart: new Date(), rangeEnd: new Date(), months: [], totalWidth: 0, today: new Date(), totalHeight: 0 };
    const rs = parseISO(data.range_start);
    const re = parseISO(data.range_end);
    const t = parseISO(data.today);
    const ms = eachMonthOfInterval({ start: rs, end: re });
    const tw = differenceInDays(re, rs) * DAY_WIDTH;
    let th = HEADER_HEIGHT;
    for (const prop of data.properties) {
      th += PROPERTY_HEADER_HEIGHT;
      th += prop.units.length * ROW_HEIGHT;
    }
    return { rangeStart: rs, rangeEnd: re, months: ms, totalWidth: tw, today: t, totalHeight: th };
  }, [data]);

  useEffect(() => {
    if (data && scrollRef.current) {
      const todayX = dateToX(today, rangeStart);
      scrollRef.current.scrollLeft = Math.max(0, todayX - 200);
    }
  }, [data, today, rangeStart]);

  const scrollBy = (direction) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: direction * 30 * DAY_WIDTH * 3, behavior: 'smooth' });
  };

  return (
    <div className="space-y-5" data-testid="calendar-timeline-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Occupancy Timeline</h1>
          <p className="text-sm text-muted-foreground mt-1">Scroll horizontally to view occupancy across months</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedProperty} onValueChange={setSelectedProperty} data-testid="calendar-property-selector">
            <SelectTrigger className="w-[200px] h-9 text-sm" data-testid="calendar-property-selector-trigger">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => scrollBy(-1)} data-testid="calendar-scroll-left-button">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" data-testid="calendar-scroll-today-button"
              onClick={() => { if (scrollRef.current) { scrollRef.current.scrollTo({ left: Math.max(0, dateToX(today, rangeStart) - 200), behavior: 'smooth' }); } }}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => scrollBy(1)} data-testid="calendar-scroll-right-button">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

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
          <div className="h-3.5 w-8 rounded" style={{
            border: `1.5px dashed ${COLORS.lead.bg}`,
            background: `repeating-linear-gradient(45deg, transparent, transparent 2px, ${COLORS.lead.stripe} 2px, ${COLORS.lead.stripe} 4px)`,
          }} />
          <span className="text-muted-foreground">Lead Interest</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3.5 w-0.5 rounded" style={{ backgroundColor: COLORS.todayLine }} />
          <span className="text-muted-foreground">Today</span>
        </div>
      </div>

      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {!loading && data && data.properties.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CalendarIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-heading text-lg font-semibold">No properties to display</h3>
            <p className="text-sm text-muted-foreground mt-1">Add properties and units to see the timeline</p>
          </CardContent>
        </Card>
      )}

      {!loading && data && data.properties.length > 0 && (
        <Card className="overflow-hidden border border-border/70" data-testid="calendar-timeline-card">
          <div ref={scrollRef} className="overflow-auto relative" style={{ maxHeight: 'calc(100vh - 280px)' }} data-testid="calendar-timeline-scroll">
            <TimelineHeader months={months} rangeStart={rangeStart} totalWidth={totalWidth} />
            {data.properties.map((property) => (
              <PropertyGroup key={property.property_id} property={property} rangeStart={rangeStart} rangeEnd={rangeEnd}
                months={months} totalWidth={totalWidth} onTenantClick={(tid) => setTenantDetailId(tid)} onLeadClick={(lid) => setLeadDetailId(lid)} />
            ))}
            <TodayMarker today={today} rangeStart={rangeStart} totalHeight={totalHeight} />
          </div>
        </Card>
      )}

      <TenantDetailModal tenantId={tenantDetailId} open={!!tenantDetailId} onClose={() => setTenantDetailId(null)} />
      <LeadDetailModal leadId={leadDetailId} open={!!leadDetailId} onClose={() => setLeadDetailId(null)} />
    </div>
  );
}
