import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Car } from 'lucide-react';
import { getTenants, getProperties, getUnits, getParkingAssignments } from '@/lib/api';

const fmtDate = (v) => {
  if (!v) return '-';
  try {
    const d = new Date(v + 'T00:00:00');
    return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`;
  } catch { return v; }
};
const fmtMoney = (v) => v != null && v !== '' && v !== 0 ? `$${parseFloat(v).toLocaleString()}` : '-';

let cachedTenants = null;
let cachedProps = null;
let cachedUnits = null;

async function ensureCache() {
  if (!cachedTenants) cachedTenants = await getTenants();
  if (!cachedProps) cachedProps = await getProperties();
  if (!cachedUnits) cachedUnits = await getUnits();
  return { tenants: cachedTenants, props: cachedProps, units: cachedUnits };
}

export function invalidateTenantCache() {
  cachedTenants = null;
  cachedProps = null;
  cachedUnits = null;
}

export function TenantDetailModal({ tenantId, tenantData, open, onClose }) {
  const [tenant, setTenant] = useState(tenantData || null);
  const [propName, setPropName] = useState('');
  const [unitNum, setUnitNum] = useState('');
  const [loading, setLoading] = useState(false);
  const [parkingAssignments, setParkingAssignments] = useState([]);

  useEffect(() => {
    if (!open) return;
    if (tenantData) {
      setTenant(tenantData);
      return;
    }
    if (!tenantId) return;

    setLoading(true);
    ensureCache().then(({ tenants, props, units }) => {
      const t = tenants.find(t => t.id === tenantId);
      if (t) {
        setTenant(t);
        const prop = props.find(p => p.id === t.property_id);
        const unit = units.find(u => u.id === t.unit_id);
        setPropName(prop?.name || prop?.address || '');
        setUnitNum(unit?.unit_number || '');
      }
      setLoading(false);
    });
  }, [open, tenantId, tenantData]);

  useEffect(() => {
    if (tenant && !propName) {
      ensureCache().then(({ props, units }) => {
        const prop = props.find(p => p.id === tenant.property_id);
        const unit = units.find(u => u.id === tenant.unit_id);
        setPropName(prop?.name || prop?.address || '');
        setUnitNum(unit?.unit_number || '');
      });
    }
  }, [tenant, propName]);

  useEffect(() => {
    const tid = tenantId || tenantData?.id;
    if (open && tid) {
      getParkingAssignments({ tenant_id: tid }).then(setParkingAssignments).catch(() => {});
    } else {
      setParkingAssignments([]);
    }
  }, [open, tenantId, tenantData?.id]);

  const isAirbnb = tenant?.is_airbnb_vrbo;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" data-testid="tenant-detail-modal">
        <DialogHeader>
          <DialogTitle className="font-heading">{tenant?.name || 'Tenant Details'}</DialogTitle>
          <DialogDescription>
            {propName && unitNum ? `${propName} - Unit ${unitNum}` : 'Loading...'}
          </DialogDescription>
        </DialogHeader>

        {loading && <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>}

        {tenant && !loading && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={isAirbnb ? 'secondary' : 'default'}>
                {isAirbnb ? 'Airbnb/VRBO' : 'Long-term'}
              </Badge>
              {!isAirbnb && tenant.is_m2m && (
                <Badge className="text-xs bg-amber-100 text-amber-900 border border-amber-200">M2M</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Move In</p>
                <p className="text-sm tabular-nums">{fmtDate(tenant.move_in_date)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Move Out</p>
                <p className="text-sm tabular-nums">{fmtDate(tenant.move_out_date)}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Phone</p>
                <p className="text-sm">{tenant.phone || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Email</p>
                <p className="text-sm break-all">{tenant.email || '-'}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              {!isAirbnb && (
                <>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Monthly Rent</p>
                    <p className="text-sm tabular-nums font-medium">{fmtMoney(tenant.monthly_rent)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Payment Method</p>
                    <p className="text-sm">{tenant.payment_method || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rent Due</p>
                    <p className="text-sm">{tenant.rent_due_date || '-'}</p>
                  </div>
                </>
              )}
              {isAirbnb && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Rent</p>
                  <p className="text-sm tabular-nums font-medium">{fmtMoney(tenant.total_rent)}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Deposit Amount</p>
                <p className="text-sm tabular-nums">{fmtMoney(tenant.deposit_amount)}</p>
              </div>
            </div>

            {(tenant.deposit_return_date) && (
              <>
                <Separator />
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Deposit Returned</p>
                    <p className="text-sm tabular-nums">{fmtDate(tenant.deposit_return_date)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Return Amount</p>
                    <p className="text-sm tabular-nums">{fmtMoney(tenant.deposit_return_amount)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Return Method</p>
                    <p className="text-sm">{tenant.deposit_return_method || '-'}</p>
                  </div>
                </div>
              </>
            )}

            {(tenant.pets || tenant.notes) && (
              <>
                <Separator />
                {tenant.pets && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pets</p>
                    <p className="text-sm">{tenant.pets}</p>
                  </div>
                )}
                {tenant.notes && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{tenant.notes}</p>
                  </div>
                )}
              </>
            )}

            {parkingAssignments.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Parking</p>
                  <div className="space-y-1.5">
                    {parkingAssignments.map(pa => (
                      <div key={pa.id} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded bg-violet-50 border border-violet-200" data-testid="tenant-parking-note">
                        <Car className="h-3.5 w-3.5 text-violet-600 flex-shrink-0" />
                        <span className="font-medium text-violet-800">{pa.spot_label}</span>
                        <span className="text-xs text-violet-600">{pa.start_date} to {pa.end_date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
