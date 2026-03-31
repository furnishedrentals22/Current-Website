import { useState, useEffect, useCallback } from 'react';
import { getAvailableUnits } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { STAGE_NAMES } from './LeadRow';

export function LeadFormDialog({ open, onOpenChange, editing, form, setForm, onSave, onSaveAsUnassigned, saving }) {
  const [availableUnits, setAvailableUnits] = useState([]);
  const [noUnitsAvailable, setNoUnitsAvailable] = useState(false);

  const fetchAvailableUnits = useCallback(async () => {
    try {
      const units = await getAvailableUnits(form.desired_start_date, form.desired_end_date);
      setAvailableUnits(units);
      setNoUnitsAvailable(form.desired_start_date && form.desired_end_date && units.length === 0);
    } catch {
      toast.error('Failed to fetch available units');
    }
  }, [form.desired_start_date, form.desired_end_date]);

  useEffect(() => {
    if (open) fetchAvailableUnits();
  }, [open, fetchAvailableUnits]);

  const toggleUnit = (unitId) => {
    const current = form.potential_unit_ids;
    if (current.includes(unitId)) {
      setForm(f => ({ ...f, potential_unit_ids: current.filter(id => id !== unitId) }));
    } else {
      setForm(f => ({ ...f, potential_unit_ids: [...current, unitId] }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{editing ? 'Edit Lead' : 'Add Lead'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} data-testid="lead-name-input" />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Input value={form.source} onChange={e => setForm(f => ({...f, source: e.target.value}))} placeholder="Where was lead found" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
            </div>
            <div className="space-y-2">
              <Label>Preferred Contact Method</Label>
              <Input value={form.preferred_contact_method} onChange={e => setForm(f => ({...f, preferred_contact_method: e.target.value}))} placeholder="e.g. Text, Email, Call" data-testid="lead-contact-method" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Desired Start Date</Label>
              <Input type="date" value={form.desired_start_date} onChange={e => setForm(f => ({...f, desired_start_date: e.target.value}))} />
            </div>
            <div className="space-y-2">
              <Label>Desired End Date</Label>
              <Input type="date" value={form.desired_end_date} onChange={e => setForm(f => ({...f, desired_end_date: e.target.value}))} />
            </div>
            <div className="space-y-2">
              <Label>Price Offered</Label>
              <Input type="number" value={form.price_offered} onChange={e => setForm(f => ({...f, price_offered: e.target.value}))} placeholder="$ amount" data-testid="lead-price-offered" />
            </div>
          </div>

          {/* Available units */}
          <div className="space-y-2">
            <Label>Potential Units</Label>
            {noUnitsAvailable && !form.is_unassigned ? (
              <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/50">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">No available units for these dates</p>
                    <p className="text-xs text-amber-700 mt-1">You can save this as an unassigned lead to follow up later.</p>
                    <Button variant="outline" size="sm" className="mt-2 h-7 text-xs border-amber-300 text-amber-900 hover:bg-amber-100"
                      onClick={() => setForm(f => ({...f, is_unassigned: true}))}
                      data-testid="lead-save-unassigned-toggle">
                      <AlertCircle className="h-3 w-3 mr-1" /> Mark as Unassigned
                    </Button>
                  </div>
                </div>
              </div>
            ) : form.is_unassigned ? (
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-amber-900">Saving as unassigned lead</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setForm(f => ({...f, is_unassigned: false}))}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 p-3 rounded-lg border min-h-[48px]">
                {availableUnits.length === 0 ? (
                  <span className="text-sm text-muted-foreground">
                    {form.desired_start_date && form.desired_end_date
                      ? 'No available units for selected dates'
                      : 'Select dates to see available units'}
                  </span>
                ) : (
                  availableUnits.map(u => (
                    <Badge key={u.id}
                      variant={form.potential_unit_ids.includes(u.id) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleUnit(u.id)}>
                      {u.property_name} - {u.unit_number}
                    </Badge>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pets</Label>
              <Input value={form.pets} onChange={e => setForm(f => ({...f, pets: e.target.value}))} />
            </div>
            <div className="space-y-2">
              <Label>Parking Request</Label>
              <Input value={form.parking_request} onChange={e => setForm(f => ({...f, parking_request: e.target.value}))} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lead Strength</Label>
              <Select value={String(form.lead_strength)} onValueChange={v => setForm(f => ({...f, lead_strength: parseInt(v)}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Weak (Red)</SelectItem>
                  <SelectItem value="2">2 - Fair (Orange)</SelectItem>
                  <SelectItem value="3">3 - Good (Yellow)</SelectItem>
                  <SelectItem value="4">4 - Strong (Green)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Progress Stage</Label>
              <Select value={String(form.progress_stage)} onValueChange={v => setForm(f => ({...f, progress_stage: parseInt(v)}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STAGE_NAMES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{k}. {v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.progress_stage >= 2 && (
            <div className="space-y-2">
              <Label>Showing Date & Time {form.progress_stage === 2 ? '*' : ''}</Label>
              <Input type="datetime-local" value={form.showing_date} onChange={e => setForm(f => ({...f, showing_date: e.target.value}))} />
            </div>
          )}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Any additional notes about this lead..." data-testid="lead-notes-input" />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {form.is_unassigned ? (
            <Button onClick={onSaveAsUnassigned} disabled={saving} data-testid="lead-save-button">
              {saving ? 'Saving...' : 'Save as Unassigned'}
            </Button>
          ) : (
            <Button onClick={onSave} disabled={saving} data-testid="lead-save-button">
              {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
