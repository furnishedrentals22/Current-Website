import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ManualCleaningDialog({
  open, onOpenChange,
  form, setForm,
  housekeepers, maintenancePersonnel, units,
  onSave, saving
}) {
  const [useCustomMaint, setUseCustomMaint] = useState(false);
  const hasMaintAssigned = form.assigned_maintenance_id || form.assigned_maintenance_name;

  const handleMaintSelect = (val) => {
    if (val === '_none') {
      setForm(f => ({ ...f, assigned_maintenance_id: null, assigned_maintenance_name: '' }));
      setUseCustomMaint(false);
    } else if (val === '_custom') {
      setForm(f => ({ ...f, assigned_maintenance_id: null, assigned_maintenance_name: '' }));
      setUseCustomMaint(true);
    } else {
      const p = maintenancePersonnel.find(mp => mp.id === val);
      setForm(f => ({ ...f, assigned_maintenance_id: val, assigned_maintenance_name: p?.name || '' }));
      setUseCustomMaint(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Add Manual Cleaning
            <span className="ml-2 text-xs font-normal text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">Manual</span>
          </DialogTitle>
          <DialogDescription>Create a standalone cleaning entry not tied to any reservation.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Unit *</Label>
              <Select value={form.unit_id || '_none'} onValueChange={v => setForm(f => ({ ...f, unit_id: v === '_none' ? '' : v }))}>
                <SelectTrigger data-testid="mc-unit-select"><SelectValue placeholder="Select unit" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Select unit</SelectItem>
                  {units.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.unit_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Label / Guest Name</Label>
              <Input value={form.tenant_name} onChange={e => setForm(f => ({ ...f, tenant_name: e.target.value }))} placeholder="e.g. Deep clean" className="text-sm" data-testid="mc-tenant-name-input" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Date (Check-out) *</Label>
              <Input type="date" value={form.check_out_date} onChange={e => setForm(f => ({ ...f, check_out_date: e.target.value }))} className="text-sm" data-testid="mc-checkout-date-input" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Check-in Date</Label>
              <Input type="date" value={form.next_check_in_date} onChange={e => setForm(f => ({ ...f, next_check_in_date: e.target.value }))} className="text-sm" data-testid="mc-checkin-date-input" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Checkout Time</Label>
              <Input type="time" value={form.check_out_time} onChange={e => setForm(f => ({ ...f, check_out_time: e.target.value }))} className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Check-in Time</Label>
              <Input type="time" value={form.check_in_time} onChange={e => setForm(f => ({ ...f, check_in_time: e.target.value }))} className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cleaning Time</Label>
              <Input type="time" value={form.cleaning_time} onChange={e => setForm(f => ({ ...f, cleaning_time: e.target.value }))} className="text-sm" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Assigned Cleaner</Label>
            <Select value={form.assigned_cleaner_id || '_none'} onValueChange={v => setForm(f => ({ ...f, assigned_cleaner_id: v === '_none' ? null : v }))}>
              <SelectTrigger data-testid="mc-cleaner-select"><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Unassigned</SelectItem>
                {housekeepers.map(h => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Assign Maintenance Person</Label>
            <Select value={useCustomMaint ? '_custom' : (form.assigned_maintenance_id || '_none')} onValueChange={handleMaintSelect}>
              <SelectTrigger data-testid="mc-maintenance-select"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {maintenancePersonnel.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}{p.role ? ` — ${p.role}` : ''}</SelectItem>
                ))}
                <SelectItem value="_custom">+ Custom person...</SelectItem>
              </SelectContent>
            </Select>
            {useCustomMaint && (
              <Input className="mt-1 text-sm" value={form.assigned_maintenance_name || ''} placeholder="Enter maintenance person name" onChange={e => setForm(f => ({ ...f, assigned_maintenance_name: e.target.value }))} />
            )}
          </div>

          {hasMaintAssigned && (
            <div className="space-y-1">
              <Label>Maintenance Note</Label>
              <Input value={form.maintenance_note || ''} onChange={e => setForm(f => ({ ...f, maintenance_note: e.target.value }))} placeholder="e.g. Check kitchen faucet" />
            </div>
          )}

          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Cleaning notes..." data-testid="mc-notes-input" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={saving} data-testid="mc-create-btn">
            {saving ? 'Creating...' : 'Add Cleaning'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
