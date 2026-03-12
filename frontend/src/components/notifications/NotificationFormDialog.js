import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { STATUSES, PRIORITIES, CATEGORIES } from './notificationConstants';

export function NotificationFormDialog({ open, onClose, editing, form, setForm, onSave, saving, properties, filteredUnits, teamMembers }) {
  const addReminderTime = () => setForm(f => ({ ...f, reminder_times: [...f.reminder_times, ''] }));
  const updateReminderTime = (idx, val) => {
    const arr = [...form.reminder_times]; arr[idx] = val; setForm({ ...form, reminder_times: arr });
  };
  const removeReminderTime = (idx) => setForm(f => ({ ...f, reminder_times: f.reminder_times.filter((_, i) => i !== idx) }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Notification' : 'Create Notification'}</DialogTitle>
          <DialogDescription>Configure notification details, schedule, and priority.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-3">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Notification name" data-testid="notif-name-input" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                <SelectTrigger data-testid="notif-priority-select"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger data-testid="notif-category-select"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Property</Label>
              <Select value={form.property_id || '_none'} onValueChange={v => setForm({ ...form, property_id: v === '_none' ? '' : v, unit_id: '' })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={form.unit_id || '_none'} onValueChange={v => setForm({ ...form, unit_id: v === '_none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {filteredUnits.map(u => <SelectItem key={u.id} value={u.id}>Unit {u.unit_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Assigned Person</Label>
            <Select value={form.assigned_person || '_none'} onValueChange={v => setForm({ ...form, assigned_person: v === '_none' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Unassigned</SelectItem>
                {teamMembers.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Reminder Date</Label>
              <Input type="date" value={form.reminder_date} onChange={e => setForm({ ...form, reminder_date: e.target.value })} data-testid="notif-date-input" />
            </div>
            <div className="space-y-2">
              <Label>Reminder Time</Label>
              <Input type="time" value={form.reminder_time} onChange={e => setForm({ ...form, reminder_time: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Additional Reminder Times</Label>
              <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={addReminderTime}><Plus className="h-3 w-3 mr-1" />Add Time</Button>
            </div>
            {form.reminder_times.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input type="time" value={t} onChange={e => updateReminderTime(i, e.target.value)} className="w-40" />
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeReminderTime(i)}><X className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={form.is_recurring} onCheckedChange={v => setForm({ ...form, is_recurring: v })} />
              <Label>Recurring</Label>
            </div>
            {form.is_recurring && (
              <>
                <Select value={form.recurrence_pattern || 'daily'} onValueChange={v => setForm({ ...form, recurrence_pattern: v })}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" placeholder="End date" value={form.recurrence_end_date} onChange={e => setForm({ ...form, recurrence_end_date: e.target.value })} className="w-40" />
              </>
            )}
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Details, instructions, or context..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={saving} data-testid="notif-save-btn">
            {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
