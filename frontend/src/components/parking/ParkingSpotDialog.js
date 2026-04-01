import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tag } from 'lucide-react';

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => String(currentYear + i));

export function ParkingSpotDialog({ open, onClose, editing, spotForm, setSpotForm, onSave, saving }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Parking Spot' : 'Add Parking Spot'}</DialogTitle>
          <DialogDescription>Configure the parking spot details.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-3">
          <div className="flex items-center gap-3">
            <Label>Type:</Label>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${spotForm.spot_type === 'designated' ? 'font-semibold' : 'text-muted-foreground'}`}>Designated Spot</span>
              <Switch
                checked={spotForm.spot_type === 'marlins_decal'}
                onCheckedChange={v => setSpotForm({ ...spotForm, spot_type: v ? 'marlins_decal' : 'designated' })}
                data-testid="parking-spot-type-toggle"
              />
              <span className={`text-sm ${spotForm.spot_type === 'marlins_decal' ? 'font-semibold' : 'text-muted-foreground'}`}>Marlins/City Decal</span>
            </div>
          </div>

          {spotForm.spot_type === 'designated' ? (
            <>
              <div className="space-y-2">
                <Label>Spot # *</Label>
                <Input value={spotForm.spot_number} onChange={e => setSpotForm({ ...spotForm, spot_number: e.target.value })} data-testid="parking-spot-number" />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={spotForm.location} onChange={e => setSpotForm({ ...spotForm, location: e.target.value })} placeholder="e.g. Garage Level 2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                  <Switch
                    checked={spotForm.needs_tag}
                    onCheckedChange={v => setSpotForm({ ...spotForm, needs_tag: v, tag_info: v ? spotForm.tag_info : '' })}
                    data-testid="parking-spot-needs-tag"
                  />
                  <Label className="cursor-pointer flex items-center gap-1.5">
                    <Tag className="h-4 w-4" />
                    Needs Tag
                  </Label>
                </div>
                {spotForm.needs_tag && (
                  <div className="space-y-2 pl-1">
                    <Label className="text-sm">Tag Information</Label>
                    <Input
                      value={spotForm.tag_info || ''}
                      onChange={e => setSpotForm({ ...spotForm, tag_info: e.target.value })}
                      placeholder="e.g. Tag #1234, Blue sticker, etc."
                      data-testid="parking-spot-tag-info"
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Decal # *</Label>
                <Input value={spotForm.decal_number} onChange={e => setSpotForm({ ...spotForm, decal_number: e.target.value })} data-testid="parking-decal-number" />
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
          <Button onClick={onSave} disabled={saving} data-testid="parking-spot-save">
            {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
