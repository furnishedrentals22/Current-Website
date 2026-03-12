import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => String(currentYear + i));

export function SpotDialog({ open, onClose, editing, spotForm, setSpotForm, onSave, saving, properties }) {
  const togglePropertyId = (propId) => {
    const ids = [...spotForm.property_ids];
    const idx = ids.indexOf(propId);
    if (idx >= 0) ids.splice(idx, 1); else ids.push(propId);
    setSpotForm({ ...spotForm, property_ids: ids });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Parking Space' : 'Add Parking Space'}</DialogTitle>
          <DialogDescription>Configure the parking space details.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-3">
          <div className="flex items-center gap-3">
            <Label>Type:</Label>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${spotForm.spot_type === 'designated' ? 'font-semibold' : 'text-muted-foreground'}`}>Designated Spot</span>
              <Switch checked={spotForm.spot_type === 'marlins_decal'}
                onCheckedChange={v => setSpotForm({ ...spotForm, spot_type: v ? 'marlins_decal' : 'designated' })}
                data-testid="parking-type-toggle" />
              <span className={`text-sm ${spotForm.spot_type === 'marlins_decal' ? 'font-semibold' : 'text-muted-foreground'}`}>Marlins Decal</span>
            </div>
          </div>
          {spotForm.spot_type === 'designated' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Spot # *</Label>
                  <Input value={spotForm.spot_number} onChange={e => setSpotForm({ ...spotForm, spot_number: e.target.value })} data-testid="spot-number-input" />
                </div>
                <div className="space-y-2">
                  <Label>Parking Pass #</Label>
                  <Input value={spotForm.parking_pass_number} onChange={e => setSpotForm({ ...spotForm, parking_pass_number: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={spotForm.location} onChange={e => setSpotForm({ ...spotForm, location: e.target.value })} placeholder="e.g. Garage Level 2" />
              </div>
              <div className="space-y-2">
                <Label>Properties</Label>
                <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px]">
                  {properties.map(p => (
                    <Badge key={p.id} variant={spotForm.property_ids.includes(p.id) ? 'default' : 'outline'}
                      className="cursor-pointer" onClick={() => togglePropertyId(p.id)}>{p.name}</Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cost</Label>
                <Input type="number" value={spotForm.cost} onChange={e => setSpotForm({ ...spotForm, cost: e.target.value })} placeholder="Monthly cost" />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Decal # *</Label>
                <Input value={spotForm.decal_number} onChange={e => setSpotForm({ ...spotForm, decal_number: e.target.value })} data-testid="decal-number-input" />
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={spotForm.decal_year || '_none'} onValueChange={v => setSpotForm({ ...spotForm, decal_year: v === '_none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Not set</SelectItem>
                    {yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={spotForm.notes} onChange={e => setSpotForm({ ...spotForm, notes: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave} disabled={saving} data-testid="spot-save-btn">
            {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
