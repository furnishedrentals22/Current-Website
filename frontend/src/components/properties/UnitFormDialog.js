import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';

const UNIT_SIZES = ['0/1', '1/1', '2/1', '2/2', '3/1', '3/2', '3/3', 'other'];

export function UnitFormDialog({ open, onOpenChange, editing, form, setForm, onSave, saving }) {
  const addCost = () => {
    setForm(f => ({ ...f, additional_monthly_costs: [...f.additional_monthly_costs, { name: '', amount: '' }] }));
  };

  const updateCost = (idx, field, value) => {
    setForm(f => {
      const costs = [...f.additional_monthly_costs];
      costs[idx] = { ...costs[idx], [field]: field === 'amount' ? parseFloat(value) || '' : value };
      return { ...f, additional_monthly_costs: costs };
    });
  };

  const removeCost = (idx) => {
    setForm(f => ({ ...f, additional_monthly_costs: f.additional_monthly_costs.filter((_, i) => i !== idx) }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{editing ? 'Edit Unit' : 'Add Unit'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Unit Number *</Label>
              <Input value={form.unit_number} onChange={e => setForm(f => ({...f, unit_number: e.target.value}))} data-testid="unit-number-input" />
            </div>
            <div className="space-y-2">
              <Label>Unit Size *</Label>
              <Select value={form.unit_size} onValueChange={v => setForm(f => ({...f, unit_size: v}))}>
                <SelectTrigger data-testid="unit-size-select"><SelectValue placeholder="Select size" /></SelectTrigger>
                <SelectContent>
                  {UNIT_SIZES.map(s => (<SelectItem key={s} value={s}>{s === 'other' ? 'Other' : s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.unit_size === 'other' && (
            <div className="space-y-2">
              <Label>Custom Size</Label>
              <Input value={form.unit_size_custom} onChange={e => setForm(f => ({...f, unit_size_custom: e.target.value}))} placeholder="e.g. Studio, 4/2" />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Base Rent *</Label>
              <Input type="number" value={form.base_rent} onChange={e => setForm(f => ({...f, base_rent: e.target.value}))} data-testid="unit-rent-input" />
            </div>
            <div className="space-y-2">
              <Label>Availability Start Date *</Label>
              <Input type="date" value={form.availability_start_date} onChange={e => setForm(f => ({...f, availability_start_date: e.target.value}))} data-testid="unit-avail-date" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Close Date (optional)</Label>
            <Input type="date" value={form.close_date} onChange={e => setForm(f => ({...f, close_date: e.target.value}))} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Additional Monthly Costs</Label>
              <Button type="button" variant="secondary" size="sm" onClick={addCost} data-testid="units-costs-add-row-button">
                <Plus className="h-3 w-3 mr-1" /> Add Cost
              </Button>
            </div>
            {form.additional_monthly_costs.map((cost, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                <Input className="flex-1" placeholder="Cost name" value={cost.name} onChange={e => updateCost(idx, 'name', e.target.value)} />
                <Input className="w-32" type="number" placeholder="Amount" value={cost.amount} onChange={e => updateCost(idx, 'amount', e.target.value)} />
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => removeCost(idx)}><X className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={saving} data-testid="unit-save-button">
            {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
