import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';

export function SpotCard({ spot, propMap, onEdit, onDelete }) {
  const isDecal = spot.spot_type === 'marlins_decal';
  return (
    <div className="border rounded-lg p-3 bg-card hover:bg-muted/30 transition-colors" data-testid="parking-spot-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={isDecal ? 'secondary' : 'default'} className="text-xs">
            {isDecal ? 'Marlins Decal' : 'Designated'}
          </Badge>
          <span className="font-medium text-sm">
            {isDecal ? `Decal #${spot.decal_number}` : `Spot #${spot.spot_number}`}
          </span>
          {isDecal && spot.decal_year && <span className="text-xs text-muted-foreground">Year: {spot.decal_year}</span>}
          {!isDecal && spot.location && <span className="text-xs text-muted-foreground">{spot.location}</span>}
          {!isDecal && spot.cost && <span className="text-xs text-muted-foreground">${spot.cost}/mo</span>}
          {!isDecal && spot.property_ids?.length > 0 && (
            <div className="flex gap-1">
              {spot.property_ids.map(pid => (
                <Badge key={pid} variant="outline" className="text-[10px]">{propMap[pid]?.name || pid}</Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      {spot.notes && <p className="text-xs text-muted-foreground mt-1 ml-1">{spot.notes}</p>}
    </div>
  );
}
