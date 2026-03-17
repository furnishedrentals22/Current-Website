import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MiscChargesSection } from './MiscChargesSection';
import { sortUnitsNumerically } from './tenantUtils';

export function TenantFormDialog({
  open, onOpenChange, editing, form, setForm, handleSave, saving,
  sortedProperties, filteredUnits, fetchData
}) {
  const nights = (() => {
    if (form.move_in_date && form.move_out_date) {
      const d1 = new Date(form.move_in_date);
      const d2 = new Date(form.move_out_date);
      const diff = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 0;
    }
    return 0;
  })();
  const perNight = form.total_rent && nights > 0 ? (parseFloat(form.total_rent) / nights).toFixed(2) : 0;

  const selectedProperty = sortedProperties.find(p => p.id === form.property_id);
  const isMarlinsProp = !!selectedProperty?.marlins_decal_property;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{editing ? 'Edit Tenant' : 'Add Tenant'}</DialogTitle>
          <DialogDescription className="sr-only">{editing ? 'Edit tenant information' : 'Add a new tenant'}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Property *</Label>
              <Select value={form.property_id} onValueChange={v => setForm({ ...form, property_id: v, unit_id: '' })}>
                <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>
                  {sortedProperties.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}{p.building_id != null ? ` (#${p.building_id})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit *</Label>
              <Select value={form.unit_id} onValueChange={v => setForm({ ...form, unit_id: v })} disabled={!form.property_id}>
                <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                <SelectContent>
                  {sortUnitsNumerically(filteredUnits).map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.unit_number} ({u.unit_size})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="tenant-name-input" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Move-in Date *</Label>
              <Input type="date" value={form.move_in_date} onChange={e => setForm({ ...form, move_in_date: e.target.value })} data-testid="tenant-movein-date" />
            </div>
            <div className="space-y-2">
              <Label>Move-out Date *</Label>
              <Input type="date" value={form.move_out_date} onChange={e => setForm({ ...form, move_out_date: e.target.value })} data-testid="tenant-moveout-date" />
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
            <Switch checked={form.is_airbnb_vrbo} onCheckedChange={v => setForm({ ...form, is_airbnb_vrbo: v })} data-testid="tenants-airbnb-toggle" />
            <Label className="cursor-pointer">Airbnb / VRBO</Label>
          </div>

          {!form.is_airbnb_vrbo ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Monthly Rent *</Label>
                  <Input type="number" value={form.monthly_rent} onChange={e => setForm({ ...form, monthly_rent: e.target.value })} data-testid="tenant-monthly-rent" />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Input value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} placeholder="e.g. Bank transfer, Zelle, Check" data-testid="tenant-payment-method" />
                </div>
                <div className="space-y-2">
                  <Label>Rent Due Date</Label>
                  <Input value={form.rent_due_date} onChange={e => setForm({ ...form, rent_due_date: e.target.value })} placeholder="e.g. 1st, 15th" data-testid="tenant-rent-due-date" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Deposit Amount</Label>
                  <Input type="number" value={form.deposit_amount} onChange={e => setForm({ ...form, deposit_amount: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Deposit Date</Label>
                  <Input type="date" value={form.deposit_date} onChange={e => setForm({ ...form, deposit_date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Partial First Month Override</Label>
                  <Input type="number" value={form.partial_first_month} onChange={e => setForm({ ...form, partial_first_month: e.target.value })} placeholder="Leave blank for full rent" />
                </div>
                <div className="space-y-2">
                  <Label>Partial Last Month Override</Label>
                  <Input type="number" value={form.partial_last_month} onChange={e => setForm({ ...form, partial_last_month: e.target.value })} placeholder="Leave blank for full rent" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pets</Label>
                  <Input value={form.pets} onChange={e => setForm({ ...form, pets: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Parking Info</Label>
                  <Input value={form.parking} onChange={e => setForm({ ...form, parking: e.target.value })} />
                  <div className="flex items-center gap-2 mt-1">
                    <Checkbox checked={form.has_parking || false} onCheckedChange={(v) => setForm({ ...form, has_parking: !!v })} data-testid="tenant-has-parking-checkbox" />
                    <Label className="text-xs cursor-pointer">Has parking spot</Label>
                  </div>
                </div>
              </div>
              <Separator />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deposit Return (fill after move-out)</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Deposit Return Date</Label>
                  <Input type="date" value={form.deposit_return_date} onChange={e => setForm({ ...form, deposit_return_date: e.target.value })} data-testid="tenant-deposit-return-date" />
                </div>
                <div className="space-y-2">
                  <Label>Deposit Return Amount</Label>
                  <Input type="number" value={form.deposit_return_amount} onChange={e => setForm({ ...form, deposit_return_amount: e.target.value })} data-testid="tenant-deposit-return-amount" />
                </div>
                <div className="space-y-2">
                  <Label>Deposit Return Method</Label>
                  <Input value={form.deposit_return_method} onChange={e => setForm({ ...form, deposit_return_method: e.target.value })} placeholder="e.g. Check, Zelle" data-testid="tenant-deposit-return-method" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              {editing && (
                <>
                  <Separator />
                  <MiscChargesSection tenantId={editing} fetchData={fetchData} />
                </>
              )}
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Total Rent *</Label>
                <Input type="number" value={form.total_rent} onChange={e => setForm({ ...form, total_rent: e.target.value })} data-testid="tenant-total-rent" />
              </div>
              {nights > 0 && form.total_rent && (
                <Card className="bg-sky-50 border-sky-200">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Total Nights</p>
                        <p className="font-heading text-xl font-semibold tabular-nums">{nights}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Per Night</p>
                        <p className="font-heading text-xl font-semibold tabular-nums">${perNight}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Total</p>
                        <p className="font-heading text-xl font-semibold tabular-nums">${parseFloat(form.total_rent).toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Add any notes about this Airbnb/VRBO stay..." data-testid="tenant-airbnb-notes" />
              </div>
              <div className="space-y-2">
                <Label>Parking Info</Label>
                <Input value={form.parking} onChange={e => setForm({ ...form, parking: e.target.value })} placeholder="e.g. Spot #12, Street" data-testid="tenant-parking-airbnb" />
                <div className="flex items-center gap-2 mt-1">
                  <Checkbox checked={form.has_parking || false} onCheckedChange={(v) => setForm({ ...form, has_parking: !!v })} data-testid="tenant-has-parking-checkbox" />
                  <Label className="text-xs cursor-pointer">Has parking spot</Label>
                </div>
              </div>
            </>
          )}

          {isMarlinsProp && (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-blue-50 border-blue-200">
              <Checkbox
                id="marlins-decal"
                checked={form.marlins_decal || false}
                onCheckedChange={v => setForm({ ...form, marlins_decal: !!v })}
                data-testid="tenant-marlins-decal-checkbox"
              />
              <Label htmlFor="marlins-decal" className="cursor-pointer text-blue-800 font-medium">
                Assign Marlins Decal to Tenant
              </Label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} data-testid="tenant-save-button">
            {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
