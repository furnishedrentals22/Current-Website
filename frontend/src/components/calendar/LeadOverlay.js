import { parseISO, format, isBefore, isSameDay, max as dateMax, min as dateMin } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { dateToX, dateSpanWidth, BAR_TOP_OFFSET, BAR_HEIGHT, COLORS, formatRent } from './calendarConstants';

export function LeadOverlay({ lead, bookings, rangeStart, rangeEnd, onLeadClick }) {
  const leadStart = dateMax([parseISO(lead.start_date), rangeStart]);
  const leadEnd = dateMin([parseISO(lead.end_date), rangeEnd]);
  if (!isBefore(leadStart, leadEnd) && !isSameDay(leadStart, leadEnd)) return null;

  const occupied = bookings.map((b) => ({ start: parseISO(b.start_date), end: parseISO(b.end_date) }));
  const vacantSegments = [];
  let cursor = leadStart;
  const sorted = [...occupied].sort((a, b) => a.start - b.start);

  for (const occ of sorted) {
    const occStart = dateMax([occ.start, rangeStart]);
    const occEnd = dateMin([occ.end, rangeEnd]);
    if (isBefore(cursor, occStart)) {
      const gapEnd = dateMin([occStart, leadEnd]);
      if (isBefore(cursor, gapEnd)) vacantSegments.push({ start: cursor, end: gapEnd });
    }
    cursor = dateMax([cursor, occEnd]);
  }
  if (isBefore(cursor, leadEnd)) vacantSegments.push({ start: cursor, end: leadEnd });
  if (vacantSegments.length === 0) return null;

  return (
    <>
      {vacantSegments.map((seg, i) => {
        const x = dateToX(seg.start, rangeStart);
        const w = dateSpanWidth(seg.start, seg.end);
        return (
          <TooltipProvider key={i} delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="absolute cursor-pointer transition-opacity duration-150 hover:opacity-80"
                  style={{
                    left: x, width: w, top: BAR_TOP_OFFSET, height: BAR_HEIGHT, borderRadius: 6, overflow: 'hidden', zIndex: 2,
                    border: `1.5px dashed ${COLORS.lead.bg}`,
                    background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Cpath d='M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4' stroke='${encodeURIComponent(COLORS.lead.stripe)}' stroke-width='2'/%3E%3C/svg%3E"), ${COLORS.lead.bgAlpha}`,
                  }}
                  onClick={(e) => { e.stopPropagation(); if (onLeadClick) onLeadClick(lead.lead_id); }}
                  data-testid="calendar-timeline-lead-overlay">
                  {w > 70 && (
                    <span className="absolute inset-0 flex items-center px-2 text-[11px] font-medium truncate" style={{ color: COLORS.lead.text }}>
                      {lead.name}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg max-w-xs text-foreground">
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
