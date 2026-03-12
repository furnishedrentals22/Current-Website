import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Pencil, Trash2, AlarmClock, Copy } from 'lucide-react';
import { STATUSES, getPriorityInfo } from './notificationConstants';

export function KanbanView({ groups, propMap, unitMap, selected, onToggleSelect, onEdit, onDelete, onStatusChange, onDuplicate, onSnooze, onQuickSnooze, onChecklistToggle }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="kanban-view">
      {STATUSES.map(status => {
        const items = groups[status.value] || [];
        return (
          <div key={status.value} className="flex flex-col rounded-lg border bg-muted/20 min-h-[200px]" data-testid={`kanban-col-${status.value}`}>
            <div className="flex items-center gap-2 p-2.5 border-b bg-muted/40 rounded-t-lg">
              <div className={`h-2.5 w-2.5 rounded-full ${status.color}`} />
              <span className="text-xs font-semibold uppercase tracking-wide">{status.label}</span>
              <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px]">{items.length}</Badge>
            </div>
            <ScrollArea className="flex-1 p-1.5">
              <div className="space-y-1.5">
                {items.map(n => (
                  <KanbanCard key={n.id} n={n} propMap={propMap} unitMap={unitMap}
                    isSelected={selected.has(n.id)} onToggleSelect={() => onToggleSelect(n.id)}
                    onEdit={() => onEdit(n)} onDelete={() => onDelete(n.id)} onDuplicate={() => onDuplicate(n.id)}
                    onSnooze={() => onSnooze(n)} onStatusChange={onStatusChange}
                    currentStatus={status.value} onChecklistToggle={onChecklistToggle} />
                ))}
                {items.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-6">Empty</p>}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ n, propMap, unitMap, isSelected, onToggleSelect, onEdit, onDelete, onDuplicate, onSnooze, onStatusChange, currentStatus, onChecklistToggle }) {
  const [expanded, setExpanded] = useState(false);
  const pri = getPriorityInfo(n.priority || 'medium');
  const prop = propMap[n.property_id];
  const unit = unitMap[n.unit_id];
  const cat = (n.category || n.notification_type || 'manual').replace('_', ' ');

  return (
    <div className={`rounded-md border p-2 bg-card hover:shadow-sm transition-shadow ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
      data-testid="kanban-card">
      <div className="flex items-start gap-1.5">
        <div className="pt-0.5" onClick={e => { e.stopPropagation(); onToggleSelect(); }}>
          <Checkbox checked={isSelected} className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-1 mb-0.5">
            <div className={`h-2 w-2 rounded-full flex-shrink-0 ${pri.dot}`} title={pri.label} />
            <span className="text-xs font-medium truncate">{n.name || 'Untitled'}</span>
          </div>
          <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
            {n.reminder_date && <span>{n.reminder_date}</span>}
            {n.reminder_time && <span>{n.reminder_time}</span>}
            {cat !== 'manual' && <Badge variant="outline" className="h-4 px-1 text-[9px]">{cat}</Badge>}
          </div>
          {(prop || unit || n.assigned_person) && (
            <div className="flex flex-wrap gap-1 mt-0.5 text-[10px] text-muted-foreground">
              {prop && <span>{prop.name}</span>}
              {unit && <span>U{unit.unit_number}</span>}
              {n.assigned_person && <span className="font-medium">{n.assigned_person}</span>}
            </div>
          )}
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <Select value={currentStatus} onValueChange={val => onStatusChange(n.id, val)}>
          <SelectTrigger className="h-6 text-[10px] w-full px-2 py-0" data-testid="card-status-toggle">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => (
              <SelectItem key={s.value} value={s.value} className="text-xs">
                <span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${s.color}`} />{s.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {expanded && (
        <div className="mt-2 pt-2 border-t space-y-1.5" onClick={e => e.stopPropagation()}>
          {(n.notes || n.message) && <p className="text-[10px] text-muted-foreground">{n.notes || n.message}</p>}
          {n.checklist && n.checklist.length > 0 && (
            <div className="space-y-1" data-testid="notification-checklist">
              {n.checklist.map(item => (
                <div key={item.key} className="flex items-center gap-2">
                  <Checkbox checked={item.checked} onCheckedChange={() => onChecklistToggle(n.id, item.key, !item.checked)} className="h-3.5 w-3.5" data-testid={`checklist-${item.key}`} />
                  <span className={`text-[10px] ${item.checked ? 'line-through text-muted-foreground' : ''}`}>{item.label}</span>
                </div>
              ))}
            </div>
          )}
          {n.is_recurring && <Badge variant="secondary" className="text-[9px] h-4">Recurring: {n.recurrence_pattern}</Badge>}
          <div className="flex gap-1 pt-1">
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={onEdit}><Pencil className="h-3 w-3 mr-0.5" />Edit</Button>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={onSnooze}><AlarmClock className="h-3 w-3 mr-0.5" />Snooze</Button>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={onDuplicate}><Copy className="h-3 w-3 mr-0.5" />Dup</Button>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5 text-destructive" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
