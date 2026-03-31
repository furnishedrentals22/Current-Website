import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';

export function ParkingSpotsList({ spots, onEdit, onDelete }) {
  if (spots.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed rounded-lg">
        <p className="text-sm text-muted-foreground">No parking spots added yet. Click "Add Spot" above to create one.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {spots.map(s => {
        const isDecal = s.spot_type === 'marlins_decal';
        return (
          <div key={s.id} className="flex items-center justify-between border rounded-lg p-3 bg-card hover:bg-muted/30 transition-colors" data-testid="parking-spots-list-item">
            <div className="flex items-center gap-3 min-w-0">
              <Badge variant={isDecal ? 'secondary' : 'default'} className="text-xs flex-shrink-0">
                {isDecal ? 'Marlins/City Decal' : 'Designated'}
              </Badge>
              <span className="font-medium text-sm">
                {isDecal ? `Decal #${s.decal_number}` : `Spot #${s.spot_number}`}
              </span>
              {isDecal && s.decal_year && <span className="text-xs text-muted-foreground">Year: {s.decal_year}</span>}
              {!isDecal && s.location && <span className="text-xs text-muted-foreground">{s.location}</span>}
              {!isDecal && s.needs_tag && <Badge variant="outline" className="text-[10px]">Tag</Badge>}
              {s.notes && <span className="text-xs text-muted-foreground italic truncate max-w-[200px]">{s.notes}</span>}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(s)} data-testid="parking-spot-edit-btn">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => onDelete(s.id)} data-testid="parking-spot-delete-btn">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
