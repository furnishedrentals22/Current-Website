import { Button } from '@/components/ui/button';
import { Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { fmt, fmtMoney, fmtDate, tdClass, rowBaseClass } from './tenantUtils';

export function TenantCurrentRow({ tenant, unitMap, idx, isFuture, isPending, onDetail, onEdit, onDelete, onConfirmMoveout }) {
  const unit = unitMap[tenant.unit_id];
  const unitNum = unit?.unit_number || '?';
  const isAirbnb = tenant.is_airbnb_vrbo;
  const rentDisplay = isAirbnb ? fmtMoney(tenant.total_rent) : fmtMoney(tenant.monthly_rent);
  const bgClass = isFuture ? 'bg-sky-50/70' : isPending ? 'bg-amber-50/60' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';

  return (
    <tr key={tenant.id} className={`${rowBaseClass} ${bgClass}`} onClick={() => onDetail(tenant)} data-testid="tenants-table-row">
      <td className={tdClass}>
        {isFuture && <span className="text-muted-foreground mr-1">{'\u21B3'}</span>}
        {unitNum}
      </td>
      <td className={tdClass}>
        <span className="font-medium">{tenant.name}</span>
        {isAirbnb && <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-100 text-sky-800 border border-sky-200">Airbnb/VRBO</span>}
        {isPending && <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">Pending</span>}
      </td>
      <td className={`${tdClass} tabular-nums`}>{fmtDate(tenant.move_in_date)}</td>
      <td className={`${tdClass} tabular-nums`}>{fmtDate(tenant.move_out_date)}</td>
      <td className={`${tdClass} tabular-nums`}>{rentDisplay}</td>
      <td className={`${tdClass} max-w-[180px] truncate`} title={tenant.notes || ''}>{fmt(tenant.notes)}</td>
      <td className={tdClass}>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {isPending && (
            <Button size="sm" className="h-6 text-[10px] px-2 gap-0.5" onClick={() => onConfirmMoveout(tenant)} data-testid="confirm-moveout-button">
              <CheckCircle2 className="h-3 w-3" /> OK
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onEdit(tenant)} data-testid="tenant-edit-button">
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={(e) => onDelete(tenant.id, e)} data-testid="tenant-delete-button">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function TenantPastRow({ tenant, unitMap, idx, onDetail, onEdit, onDelete }) {
  const unit = unitMap[tenant.unit_id];
  const unitNum = unit?.unit_number || '?';
  const isAirbnb = tenant.is_airbnb_vrbo;
  const rentDisplay = isAirbnb ? fmtMoney(tenant.total_rent) : fmtMoney(tenant.monthly_rent);
  const bgClass = isAirbnb ? 'bg-emerald-50/60' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';

  return (
    <tr key={tenant.id} className={`${rowBaseClass} ${bgClass}`} onClick={() => onDetail(tenant)} data-testid="tenants-table-row">
      <td className={tdClass}>{unitNum}</td>
      <td className={tdClass}>
        <span className="font-medium">{tenant.name}</span>
        {isAirbnb && <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-100 text-sky-800 border border-sky-200">Airbnb/VRBO</span>}
      </td>
      <td className={`${tdClass} tabular-nums`}>{fmtDate(tenant.move_in_date)}</td>
      <td className={`${tdClass} tabular-nums`}>{fmtDate(tenant.move_out_date)}</td>
      <td className={`${tdClass} tabular-nums`}>{rentDisplay}</td>
      <td className={`${tdClass} max-w-[180px] truncate`} title={tenant.notes || ''}>{fmt(tenant.notes)}</td>
      <td className={tdClass}>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onEdit(tenant)} data-testid="tenant-edit-button">
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={(e) => onDelete(tenant.id, e)} data-testid="tenant-delete-button">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
