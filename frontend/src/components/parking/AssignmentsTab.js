import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, UserPlus } from 'lucide-react';
import { AssignSection } from './AssignSection';

export function AssignmentsTab({ spots, assignments, propMap, unitMap, tenantMap, today, onAssign, onEditAssign, onDeleteAssign, onAddReminder, onTenantClick }) {
  const [expandedSpots, setExpandedSpots] = useState({});
  const toggle = (id) => setExpandedSpots(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="space-y-2">
      {spots.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">Add parking spaces first in the Parking Info tab</p>
        </div>
      ) : spots.map(spot => {
        const spotAssigns = assignments.filter(a => a.parking_spot_id === spot.id);
        const current = spotAssigns.filter(a => a.start_date <= today && a.end_date >= today);
        const future = spotAssigns.filter(a => a.start_date > today);
        const past = spotAssigns.filter(a => a.end_date < today);
        const isDecal = spot.spot_type === 'marlins_decal';
        const label = isDecal ? `Decal #${spot.decal_number}` : `Spot #${spot.spot_number}`;

        return (
          <div key={spot.id} className="border rounded-lg overflow-hidden" data-testid="parking-assignment-group">
            <div className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer" onClick={() => toggle(spot.id)}>
              <div className="flex items-center gap-2">
                {expandedSpots[spot.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Badge variant={isDecal ? 'secondary' : 'default'} className="text-xs">{isDecal ? 'Decal' : 'Spot'}</Badge>
                <span className="font-medium text-sm">{label}</span>
                <span className="text-xs text-muted-foreground">
                  {current.length > 0 ? `${current.length} active` : 'No active tenant'}
                  {future.length > 0 && ` | ${future.length} upcoming`}
                </span>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={e => { e.stopPropagation(); onAssign(spot.id); }}>
                <UserPlus className="h-3 w-3 mr-1" />Assign
              </Button>
            </div>
            {expandedSpots[spot.id] && (
              <div className="border-t">
                {spotAssigns.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3">No tenants assigned</p>
                ) : (
                  <div>
                    {current.length > 0 && <AssignSection title="Current" items={current} tenantMap={tenantMap} propMap={propMap} unitMap={unitMap}
                      bgClass="bg-emerald-50" onEdit={onEditAssign} onDelete={onDeleteAssign} isDecal={isDecal} onAddReminder={onAddReminder} onTenantClick={onTenantClick} />}
                    {future.length > 0 && <AssignSection title="Future" items={future} tenantMap={tenantMap} propMap={propMap} unitMap={unitMap}
                      bgClass="bg-blue-50" onEdit={onEditAssign} onDelete={onDeleteAssign} isDecal={isDecal} onAddReminder={onAddReminder} onTenantClick={onTenantClick} />}
                    {past.length > 0 && <AssignSection title="Archive" items={past} tenantMap={tenantMap} propMap={propMap} unitMap={unitMap}
                      bgClass="bg-stone-50" onEdit={onEditAssign} onDelete={onDeleteAssign} isDecal={isDecal} onAddReminder={onAddReminder} onTenantClick={onTenantClick} />}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
