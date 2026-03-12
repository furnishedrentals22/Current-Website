import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Bell } from 'lucide-react';

export function AssignSection({ title, items, tenantMap, propMap, unitMap, bgClass, onEdit, onDelete, isDecal, onAddReminder, onTenantClick }) {
  return (
    <div>
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b bg-muted/20">{title}</div>
      {items.map(a => {
        const unit = unitMap[a.unit_id];
        return (
          <div key={a.id} className={`flex items-center justify-between px-3 py-2 border-b last:border-0 ${bgClass}`} data-testid="parking-assignment-row">
            <div className="flex items-center gap-3 text-sm">
              <button className="font-medium text-blue-600 hover:underline" onClick={() => onTenantClick && onTenantClick(a.tenant_id)}>
                {a.tenant_name || tenantMap[a.tenant_id]?.name || 'Unknown'}
              </button>
              {propMap[a.property_id] && <span className="text-xs text-muted-foreground">{propMap[a.property_id].name}</span>}
              {unit && <span className="text-xs text-muted-foreground">Unit {unit.unit_number}</span>}
              <span className="text-xs text-muted-foreground">{a.start_date} to {a.end_date}</span>
              {a.notes && <span className="text-xs text-muted-foreground italic">{a.notes}</span>}
            </div>
            <div className="flex gap-1">
              {isDecal && (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onAddReminder(a)} title="Add reminder">
                  <Bell className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => onDelete(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
