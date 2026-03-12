import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Trash2, AlarmClock, Copy } from 'lucide-react';
import { STATUSES, STATUS_BG, getPriorityInfo } from './notificationConstants';

export function ListView({ items, propMap, unitMap, selected, allSelected, onToggleSelect, onSelectAll, onEdit, onDelete, onStatusChange, onDuplicate, onSnooze, listSort, onToggleSort, onChecklistToggle }) {
  const SortHeader = ({ col, label }) => (
    <TableHead className="text-[10px] font-semibold uppercase tracking-wide cursor-pointer select-none" onClick={() => onToggleSort(col)}>
      <span className="flex items-center gap-1">{label}{listSort.col === col && (listSort.dir === 'asc' ? ' ↑' : ' ↓')}</span>
    </TableHead>
  );

  return (
    <div className="border rounded-lg overflow-hidden" data-testid="list-view">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-8"><Checkbox checked={allSelected} onCheckedChange={onSelectAll} className="h-3.5 w-3.5" /></TableHead>
            <SortHeader col="priority" label="Pri" />
            <SortHeader col="name" label="Name" />
            <SortHeader col="category" label="Category" />
            <TableHead className="text-[10px] font-semibold uppercase tracking-wide">Property / Unit</TableHead>
            <SortHeader col="assigned_person" label="Assigned" />
            <SortHeader col="reminder_date" label="Date" />
            <SortHeader col="status" label="Status" />
            <TableHead className="text-[10px] font-semibold uppercase tracking-wide w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">No notifications match your filters</TableCell>
            </TableRow>
          ) : items.map(n => {
            const pri = getPriorityInfo(n.priority || 'medium');
            const prop = propMap[n.property_id];
            const unit = unitMap[n.unit_id];
            const st = n.status || 'upcoming';
            const cat = (n.category || n.notification_type || 'manual').replace('_', ' ');
            return (
              <TableRow key={n.id} className={`${STATUS_BG[st] || ''} ${selected.has(n.id) ? 'ring-1 ring-inset ring-blue-400' : ''}`} data-testid="list-view-row">
                <TableCell><Checkbox checked={selected.has(n.id)} onCheckedChange={() => onToggleSelect(n.id)} className="h-3.5 w-3.5" /></TableCell>
                <TableCell><div className={`h-2.5 w-2.5 rounded-full ${pri.dot}`} title={pri.label} /></TableCell>
                <TableCell className="font-medium text-xs max-w-[200px]">
                  <span className="truncate block">{n.name || 'Untitled'}</span>
                  {n.checklist && n.checklist.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {n.checklist.map(item => (
                        <div key={item.key} className="flex items-center gap-1.5">
                          <Checkbox checked={item.checked} onCheckedChange={() => onChecklistToggle(n.id, item.key, !item.checked)} className="h-3 w-3" data-testid={`list-checklist-${item.key}`} />
                          <span className={`text-[10px] ${item.checked ? 'line-through text-muted-foreground' : ''}`}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell><Badge variant="outline" className="text-[9px] h-4">{cat}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{prop ? prop.name : ''}{unit ? ` / U${unit.unit_number}` : ''}</TableCell>
                <TableCell className="text-xs">{n.assigned_person || '-'}</TableCell>
                <TableCell className="text-xs tabular-nums">{n.reminder_date || '-'}{n.reminder_time ? ` ${n.reminder_time}` : ''}</TableCell>
                <TableCell>
                  <Select value={st} onValueChange={val => onStatusChange(n.id, val)}>
                    <SelectTrigger className="h-6 text-[10px] w-[110px] px-2 py-0 border-0 bg-transparent" data-testid="list-status-toggle">
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
                </TableCell>
                <TableCell>
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onEdit(n)} title="Edit"><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onSnooze(n)} title="Snooze"><AlarmClock className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onDuplicate(n.id)} title="Duplicate"><Copy className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => onDelete(n.id)} title="Delete"><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
