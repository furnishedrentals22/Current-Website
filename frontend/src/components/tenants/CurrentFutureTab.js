import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users, ChevronDown, ChevronRight } from 'lucide-react';
import { currentColumns, renderTableHeader } from './tenantUtils';
import { TenantCurrentRow } from './TenantRow';

export function CurrentFutureTab({
  sortedProperties, unitsByProperty, currentGrouped, futureGrouped,
  currentTenants, pendingMoveoutTenants, futureTenants,
  getOccupancy, today, unitMap, onDetail, onEdit, onDelete, onConfirmMoveout, onOpenCreate
}) {
  const [expandedProps, setExpandedProps] = useState({});
  const [expandedFuture, setExpandedFuture] = useState({});

  const allCurrentFuture = [...currentTenants, ...pendingMoveoutTenants, ...futureTenants];
  if (allCurrentFuture.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Users className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">No current or future tenants</p>
        <Button className="mt-4" size="sm" onClick={() => onOpenCreate()}>Add Tenant</Button>
      </div>
    );
  }

  return sortedProperties.map(prop => {
    const propId = prop.id;
    const propUnits = unitsByProperty[propId] || [];
    const currentInProp = currentGrouped[propId] || {};
    const futureInProp = futureGrouped[propId] || {};
    const hasAnyTenants = Object.keys(currentInProp).length > 0 || Object.keys(futureInProp).length > 0;
    if (!hasAnyTenants) return null;

    const { occupied, total } = getOccupancy(propId);
    const isExpanded = expandedProps[`cf-${propId}`];

    return (
      <div key={propId} className="mb-3 rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden" data-testid={`property-group-${propId}`}>
        <button
          className="w-full flex items-center gap-3 px-4 py-3 text-left bg-slate-100 hover:bg-slate-200 transition-colors border-b border-border/40"
          onClick={() => setExpandedProps(prev => ({ ...prev, [`cf-${propId}`]: !prev[`cf-${propId}`] }))}
          data-testid={`property-toggle-${propId}`}
        >
          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          <span className="text-[13px] font-semibold">{prop.address || prop.name}</span>
          <span className="text-[11px] text-muted-foreground tabular-nums">{occupied} / {total} occupied</span>
        </button>

        {isExpanded && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              {renderTableHeader(currentColumns)}
              <tbody>
                {propUnits.map(unit => {
                  const unitId = unit.id;
                  const unitCurrentTenants = (currentInProp[unitId] || []).sort((a, b) => a.move_in_date.localeCompare(b.move_in_date));
                  const unitFutureTenants = (futureInProp[unitId] || []).sort((a, b) => a.move_in_date.localeCompare(b.move_in_date));
                  if (unitCurrentTenants.length === 0 && unitFutureTenants.length === 0) return null;

                  const futureKey = `future-${unitId}`;
                  const isFutureExpanded = expandedFuture[futureKey];
                  let rowIdx = 0;

                  return [
                    ...unitCurrentTenants.map(t => {
                      const isPending = t.move_out_date < today && !t.moveout_confirmed;
                      return (
                        <TenantCurrentRow
                          key={t.id}
                          tenant={t}
                          unitMap={unitMap}
                          idx={rowIdx++}
                          isFuture={false}
                          isPending={isPending}
                          onDetail={onDetail}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onConfirmMoveout={onConfirmMoveout}
                        />
                      );
                    }),
                    unitFutureTenants.length > 0 && (
                      <tr key={`future-toggle-${unitId}`} className="bg-transparent">
                        <td colSpan={currentColumns.length} className="px-3 py-1 border-b border-border/40">
                          <button
                            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                            onClick={(e) => { e.stopPropagation(); setExpandedFuture(prev => ({ ...prev, [futureKey]: !prev[futureKey] })); }}
                            data-testid={`future-toggle-${unitId}`}
                          >
                            {isFutureExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            Future Tenants ({unitFutureTenants.length})
                          </button>
                        </td>
                      </tr>
                    ),
                    ...(isFutureExpanded ? unitFutureTenants.map((t, fi) => (
                      <TenantCurrentRow
                        key={t.id}
                        tenant={t}
                        unitMap={unitMap}
                        idx={fi}
                        isFuture={true}
                        isPending={false}
                        onDetail={onDetail}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onConfirmMoveout={onConfirmMoveout}
                      />
                    )) : [])
                  ];
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  });
}
