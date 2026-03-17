import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2 } from 'lucide-react';

export function TenantDetailDialog({ tenant, onClose, propMap, unitMap, onEdit, marlinsDecals = [] }) {
  if (!tenant) return null;

  const assignedDecal = tenant.marlins_decal_id
    ? marlinsDecals.find(d => d.id === tenant.marlins_decal_id)
    : null;

  return (
    <Dialog open={!!tenant} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            {tenant.name}
            <Badge variant={tenant.is_airbnb_vrbo ? 'default' : 'secondary'}
              className={`text-xs ${tenant.is_airbnb_vrbo ? 'bg-sky-100 text-sky-900' : ''}`}>
              {tenant.is_airbnb_vrbo ? 'Airbnb/VRBO' : 'Long-term'}
            </Badge>
          </DialogTitle>
          <DialogDescription className="sr-only">Tenant details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Property</p>
              <p className="text-sm">{propMap[tenant.property_id]?.name || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unit</p>
              <p className="text-sm">{unitMap[tenant.unit_id]?.unit_number || '-'}</p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</p>
              <p className="text-sm">{tenant.phone || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</p>
              <p className="text-sm">{tenant.email || '-'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Move-in</p>
              <p className="text-sm">{tenant.move_in_date}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Move-out</p>
              <p className="text-sm">{tenant.move_out_date}</p>
            </div>
          </div>

          {!tenant.is_airbnb_vrbo ? (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Monthly Rent</p>
                  <p className="text-sm tabular-nums">${parseFloat(tenant.monthly_rent || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment Method</p>
                  <p className="text-sm">{tenant.payment_method || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rent Due Date</p>
                  <p className="text-sm">{tenant.rent_due_date || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deposit</p>
                  <p className="text-sm tabular-nums">
                    {tenant.deposit_amount ? `$${parseFloat(tenant.deposit_amount).toLocaleString()}` : '-'}
                    {tenant.deposit_date ? ` (${tenant.deposit_date})` : ''}
                  </p>
                </div>
              </div>
              {(tenant.deposit_return_date || tenant.deposit_return_amount) && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deposit Return Date</p>
                    <p className="text-sm">{tenant.deposit_return_date || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deposit Return Amt</p>
                    <p className="text-sm tabular-nums">{tenant.deposit_return_amount ? `$${parseFloat(tenant.deposit_return_amount).toLocaleString()}` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deposit Return Method</p>
                    <p className="text-sm">{tenant.deposit_return_method || '-'}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pets</p>
                  <p className="text-sm">{tenant.pets || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parking</p>
                  <p className="text-sm">{tenant.parking || '-'}</p>
                </div>
              </div>
              {tenant.notes && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
                  <p className="text-sm text-muted-foreground">{tenant.notes}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <Separator />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Rent</p>
                  <p className="text-sm tabular-nums">${parseFloat(tenant.total_rent || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Nights</p>
                  <p className="text-sm tabular-nums">{tenant.total_nights || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Per Night</p>
                  <p className="text-sm tabular-nums">{tenant.rent_per_night ? `$${tenant.rent_per_night}` : '-'}</p>
                </div>
              </div>
              {tenant.monthly_breakdown && tenant.monthly_breakdown.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Monthly Breakdown</p>
                  <div className="space-y-1">
                    {tenant.monthly_breakdown.map((mb, i) => (
                      <div key={i} className="flex justify-between text-xs px-2 py-1 rounded bg-muted/30">
                        <span>{mb.month}/{mb.year}</span>
                        <span className="tabular-nums">{mb.nights} nights — ${mb.income.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {tenant.notes && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
                  <p className="text-sm text-muted-foreground">{tenant.notes}</p>
                </div>
              )}
              {(tenant.parking || tenant.has_parking) && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parking</p>
                  <p className="text-sm">{tenant.parking || (tenant.has_parking ? 'Has parking spot' : '-')}</p>
                </div>
              )}
            </>
          )}

          {(tenant.marlins_decal_id || tenant.marlins_decal) && (
            <>
              <Separator />
              <div className="flex items-center gap-2">
                <Badge className="text-xs bg-blue-50 text-blue-700 border border-blue-200">
                  {assignedDecal ? `Marlins Decal: ${assignedDecal.decal_number}` : 'Marlins Decal Assigned'}
                </Badge>
              </div>
            </>
          )}

          {tenant.moveout_confirmed && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-muted-foreground">
                  Move-out confirmed on {tenant.moveout_confirmed_date || 'N/A'}
                </span>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => { onClose(); onEdit(tenant); }}>Edit Tenant</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
