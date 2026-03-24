import { Badge } from '@/components/ui/badge';
import { UnitRow } from './UnitRow';
import { dateToX, LEFT_COL_WIDTH, PROPERTY_HEADER_HEIGHT, COLORS } from './calendarConstants';

export function PropertyGroup({ property, rangeStart, rangeEnd, months, totalWidth, onTenantClick, onLeadClick }) {
  return (
    <div>
      <div className="flex" style={{ height: PROPERTY_HEADER_HEIGHT }}>
        <div className="sticky left-0 z-10 flex items-center px-4 bg-muted/50 border-b border-r"
          style={{ width: LEFT_COL_WIDTH, minWidth: LEFT_COL_WIDTH }}>
          <span className="text-sm font-semibold tracking-tight truncate">{property.property_name}</span>
          <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
            {property.units.length} {property.units.length === 1 ? 'unit' : 'units'}
          </Badge>
        </div>
        <div className="relative bg-muted/50 border-b" style={{ width: totalWidth }}>
          {months.map((month, i) => (
            <div key={i} className="absolute top-0 h-full border-r" style={{ left: dateToX(month, rangeStart), borderColor: COLORS.monthBorder }} />
          ))}
        </div>
      </div>
      {property.units.map((unit) => (
        <UnitRow key={unit.unit_id} unit={unit} rangeStart={rangeStart} rangeEnd={rangeEnd}
          months={months} totalWidth={totalWidth} onTenantClick={onTenantClick} onLeadClick={onLeadClick} />
      ))}
    </div>
  );
}
