import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { X } from 'lucide-react';

export function PropertyFormDialog({ open, onOpenChange, editing, form, setForm, onSave, saving }) {
  const [amenityInput, setAmenityInput] = useState('');
  useEffect(() => { if (open) setAmenityInput(''); }, [open]);

  const addAmenity = () => {
    if (amenityInput.trim()) {
      setForm(f => ({ ...f, building_amenities: [...f.building_amenities, amenityInput.trim()] }));
      setAmenityInput('');
    }
  };

  const removeAmenity = (idx) => {
    setForm(f => ({ ...f, building_amenities: f.building_amenities.filter((_, i) => i !== idx) }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{editing ? 'Edit Property' : 'Add Property'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Property Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} data-testid="property-name-input" />
            </div>
            <div className="space-y-2">
              <Label>Address *</Label>
              <Input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} data-testid="property-address-input" />
            </div>
            <div className="space-y-2">
              <Label>Building ID</Label>
              <Input type="number" value={form.building_id} onChange={e => setForm(f => ({...f, building_id: e.target.value}))} placeholder="e.g. 1, 2, 3" data-testid="property-building-id-input" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Owner/Manager Name *</Label>
              <Input value={form.owner_manager_name} onChange={e => setForm(f => ({...f, owner_manager_name: e.target.value}))} />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input value={form.owner_manager_phone} onChange={e => setForm(f => ({...f, owner_manager_phone: e.target.value}))} />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={form.owner_manager_email} onChange={e => setForm(f => ({...f, owner_manager_email: e.target.value}))} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Available Parking</Label>
              <Input value={form.available_parking} onChange={e => setForm(f => ({...f, available_parking: e.target.value}))} placeholder="e.g. 2 spots, street parking" />
            </div>
            <div className="space-y-2">
              <Label>Pets Permitted</Label>
              <div className="flex items-center gap-3 pt-2">
                <Switch checked={form.pets_permitted} onCheckedChange={v => setForm(f => ({...f, pets_permitted: v}))} data-testid="property-pets-toggle" />
                <span className="text-sm">{form.pets_permitted ? 'Yes' : 'No'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Marlins Decal Property</Label>
              <div className="flex items-center gap-3 pt-2">
                <Switch checked={form.marlins_decal_property} onCheckedChange={v => setForm(f => ({...f, marlins_decal_property: v}))} data-testid="property-marlins-decal-toggle" />
                <span className="text-sm">{form.marlins_decal_property ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
          {form.pets_permitted && (
            <div className="space-y-2">
              <Label>Pet Notes</Label>
              <Input value={form.pet_notes} onChange={e => setForm(f => ({...f, pet_notes: e.target.value}))} placeholder="Weight limits, breed restrictions..." />
            </div>
          )}
          <div className="space-y-2">
            <Label>Building Amenities</Label>
            <div className="flex gap-2">
              <Input value={amenityInput} onChange={e => setAmenityInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
                placeholder="Add amenity and press Enter" />
              <Button type="button" variant="secondary" onClick={addAmenity}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {form.building_amenities.map((a, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {a}
                  <button onClick={() => removeAmenity(i)} className="ml-1"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea value={form.additional_notes} onChange={e => setForm(f => ({...f, additional_notes: e.target.value}))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={saving} data-testid="property-save-button">
            {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
