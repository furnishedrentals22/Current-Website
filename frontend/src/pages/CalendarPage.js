import { useState, useEffect } from 'react';
import { getCalendarData } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function MiniCalendar({ monthData, year }) {
  const month = monthData.month;
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = monthData.days.length;

  const cells = [];
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="h-7 w-7" />);
  }

  for (const day of monthData.days) {
    const statusClasses = {
      'occupied': 'bg-emerald-100 text-emerald-950',
      'airbnb': 'bg-sky-100 text-sky-950',
      'vacant': 'bg-slate-50 text-slate-600',
    };
    const hasLead = day.lead_names && day.lead_names.length > 0;
    const dayClass = statusClasses[day.status] || statusClasses['vacant'];
    const leadClass = hasLead ? 'ring-2 ring-amber-300/70' : '';

    cells.push(
      <TooltipProvider key={day.day} delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`h-7 w-7 flex items-center justify-center rounded text-xs cursor-default transition-colors ${dayClass} ${leadClass}`}
              data-testid="calendar-day-cell">
              {day.day}
            </div>
          </TooltipTrigger>
          <TooltipContent className="text-xs">
            <p className="font-medium">{MONTH_NAMES[month - 1]} {day.day}, {year}</p>
            {day.status === 'occupied' && <p className="text-emerald-600">Tenant: {day.tenant_name}</p>}
            {day.status === 'airbnb' && <p className="text-sky-600">Airbnb: {day.tenant_name}</p>}
            {day.status === 'vacant' && <p className="text-slate-500">Vacant</p>}
            {hasLead && <p className="text-amber-600">Lead: {day.lead_names.join(', ')}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAY_HEADERS.map(d => (
          <div key={d} className="h-6 w-7 flex items-center justify-center text-[10px] font-semibold text-muted-foreground uppercase">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await getCalendarData(year);
      setData(result);
    } catch (e) {
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [year]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">Visual overview of occupancy and availability</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setYear(y => y - 1)} data-testid="calendar-year-prev-button">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-heading text-lg font-semibold tabular-nums w-16 text-center">{year}</span>
          <Button variant="outline" size="sm" onClick={() => setYear(y => y + 1)} data-testid="calendar-year-next-button">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded bg-emerald-100 border border-emerald-200" />
          <span>Occupied</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded bg-sky-100 border border-sky-200" />
          <span>Airbnb/VRBO</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded bg-slate-50 border border-slate-200" />
          <span>Vacant</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded bg-white ring-2 ring-amber-300/70" />
          <span>Lead Interest</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">Loading...</div>
      ) : data && data.properties.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CalendarIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-heading text-lg font-semibold">No properties to display</h3>
            <p className="text-sm text-muted-foreground mt-1">Add properties and units to see the calendar</p>
          </CardContent>
        </Card>
      ) : data ? (
        <div className="space-y-8">
          {data.properties.map(prop => (
            <div key={prop.property_id} className="space-y-4">
              <h2 className="font-heading text-lg font-semibold tracking-tight border-b pb-2">{prop.property_name}</h2>
              {prop.units.map(unit => (
                <div key={unit.unit_id} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{unit.unit_number}</Badge>
                    <span className="text-xs text-muted-foreground">{unit.unit_size}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {unit.months.map(monthData => (
                      <Card key={monthData.month} className="p-3">
                        <p className="text-sm font-semibold mb-2">{MONTH_NAMES[monthData.month - 1]}</p>
                        <MiniCalendar monthData={monthData} year={year} />
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
