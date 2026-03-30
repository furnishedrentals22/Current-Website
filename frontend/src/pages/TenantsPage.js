import { useState, useEffect, useCallback, useMemo } from 'react';
import { getTenants, createTenant, updateTenant, deleteTenant, confirmMoveout, getPendingMoveouts, getProperties, getUnits, getMarlinsDecals } from '@/lib/api';
import { useNotifications } from '@/App';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Plus, Pencil, Trash2, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { TenantFormDialog } from '@/components/tenants/TenantFormDialog';
import { TenantDetailDialog } from '@/components/tenants/TenantDetailDialog';
import { TenantDeleteDialog } from '@/components/tenants/TenantDeleteDialog';
import {
  sortPropertiesByBuildingId, sortUnitsNumerically,
  emptyForm, fmt, fmtMoney, fmtDate,
  getQuarterLabel, getQuarterSortKey
} from '@/components/tenants/tenantUtils';

// Re-export for backward compatibility
export { sortPropertiesByBuildingId, sortUnitsNumerically };

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [allUnits, setAllUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingMoveouts, setPendingMoveouts] = useState([]);
  const [marlinsDecals, setMarlinsDecals] = useState([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [detailTenant, setDetailTenant] = useState(null);
  const [moveoutDialog, setMoveoutDialog] = useState(null);
  const [activeTab, setActiveTab] = useState('current-future');

  const [expandedProps, setExpandedProps] = useState({});
  const [expandedFuture, setExpandedFuture] = useState({});
  const [expandedPastUnits, setExpandedPastUnits] = useState({});
  const [expandedPastProps, setExpandedPastProps] = useState({});
  const [expandedQuarters, setExpandedQuarters] = useState({});
  const [pastSortMode, setPastSortMode] = useState('by-unit');

  const [deleteDialog, setDeleteDialog] = useState(null);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(0);

  const { refreshNotifications } = useNotifications();

  const fetchData = useCallback(async () => {
    try {
      const [t, p, u, pm, decals] = await Promise.all([getTenants(), getProperties(), getUnits(), getPendingMoveouts(), getMarlinsDecals()]);
      setTenants(t);
      setProperties(p);
      setAllUnits(u);
      setPendingMoveouts(pm);
      setMarlinsDecals(decals);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
    // All referenced functions are stable module imports
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const propMap = useMemo(() => {
    const m = {};
    properties.forEach(p => { m[p.id] = p; });
    return m;
  }, [properties]);

  const unitMap = useMemo(() => {
    const m = {};
    allUnits.forEach(u => { m[u.id] = u; });
    return m;
  }, [allUnits]);

  const sortedProperties = useMemo(() => sortPropertiesByBuildingId(properties), [properties]);

  const unitsByProperty = useMemo(() => {
    const grouped = {};
    allUnits.forEach(u => {
      if (!grouped[u.property_id]) grouped[u.property_id] = [];
      grouped[u.property_id].push(u);
    });
    Object.keys(grouped).forEach(pid => { grouped[pid] = sortUnitsNumerically(grouped[pid]); });
    return grouped;
  }, [allUnits]);

  const filteredUnits = allUnits.filter(u => u.property_id === form.property_id);
  const today = new Date().toISOString().split('T')[0];

  const currentTenants = useMemo(() => tenants.filter(t => t.move_in_date <= today && t.move_out_date >= today), [tenants, today]);
  const pendingMoveoutTenants = useMemo(() => tenants.filter(t => t.move_out_date < today && !t.moveout_confirmed), [tenants, today]);
  const futureTenants = useMemo(() => tenants.filter(t => t.move_in_date > today), [tenants, today]);
  const pastTenants = useMemo(() => tenants.filter(t => t.move_out_date < today && t.moveout_confirmed), [tenants, today]);

  const groupByPropUnit = (list) => {
    const grouped = {};
    list.forEach(t => {
      const pid = t.property_id;
      if (!grouped[pid]) grouped[pid] = {};
      const uid = t.unit_id;
      if (!grouped[pid][uid]) grouped[pid][uid] = [];
      grouped[pid][uid].push(t);
    });
    return grouped;
  };

  const currentGrouped = useMemo(() => groupByPropUnit([...currentTenants, ...pendingMoveoutTenants]), [currentTenants, pendingMoveoutTenants]);
  const futureGrouped = useMemo(() => groupByPropUnit(futureTenants), [futureTenants]);
  const pastGrouped = useMemo(() => groupByPropUnit(pastTenants), [pastTenants]);

  const getOccupancy = (propId) => {
    const units = unitsByProperty[propId] || [];
    const total = units.length;
    let occupied = 0;
    const currentAndPending = [...currentTenants, ...pendingMoveoutTenants];
    units.forEach(u => { if (currentAndPending.some(t => t.unit_id === u.id)) occupied++; });
    return { occupied, total };
  };

  // ============================================================
  // CRUD
  // ============================================================
  const openCreate = (prefill = {}) => {
    setEditing(null);
    setForm({ ...emptyForm, ...prefill });
    setDialogOpen(true);
  };

  const openEdit = (tenant) => {
    setEditing(tenant);
    setForm({
      property_id: tenant.property_id || '', unit_id: tenant.unit_id || '',
      name: tenant.name || '', phone: tenant.phone || '', email: tenant.email || '',
      move_in_date: tenant.move_in_date || '', move_out_date: tenant.move_out_date || '',
      is_airbnb_vrbo: tenant.is_airbnb_vrbo || false,
      deposit_amount: tenant.deposit_amount || '', deposit_date: tenant.deposit_date || '',
      monthly_rent: tenant.monthly_rent || '', partial_first_month: tenant.partial_first_month || '',
      partial_last_month: tenant.partial_last_month || '', pets: tenant.pets || '',
      parking: tenant.parking || '', has_parking: tenant.has_parking || false,
      notes: tenant.notes || '', total_rent: tenant.total_rent || '',
      payment_method: tenant.payment_method || '', rent_due_date: tenant.rent_due_date || '',
      moveout_confirmed: tenant.moveout_confirmed || false,
      moveout_confirmed_date: tenant.moveout_confirmed_date || null,
      deposit_return_date: tenant.deposit_return_date || '',
      deposit_return_amount: tenant.deposit_return_amount || '',
      deposit_return_method: tenant.deposit_return_method || '',
      marlins_decal_id: tenant.marlins_decal_id || null
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.property_id || !form.unit_id || !form.name || !form.move_in_date || !form.move_out_date) {
      toast.error('Please fill all required fields'); return;
    }
    if (!form.is_airbnb_vrbo && !form.monthly_rent) {
      toast.error('Monthly rent is required for long-term tenants'); return;
    }
    if (form.is_airbnb_vrbo && !form.total_rent) {
      toast.error('Total rent is required for Airbnb/VRBO tenants'); return;
    }
    setSaving(true);
    const payload = {
      ...form,
      deposit_amount: form.deposit_amount ? parseFloat(form.deposit_amount) : null,
      monthly_rent: form.monthly_rent ? parseFloat(form.monthly_rent) : null,
      partial_first_month: form.partial_first_month ? parseFloat(form.partial_first_month) : null,
      partial_last_month: form.partial_last_month ? parseFloat(form.partial_last_month) : null,
      total_rent: form.total_rent ? parseFloat(form.total_rent) : null,
      deposit_date: form.deposit_date || null,
      moveout_confirmed_date: form.moveout_confirmed_date || null,
      deposit_return_date: form.deposit_return_date || null,
      deposit_return_amount: form.deposit_return_amount ? parseFloat(form.deposit_return_amount) : null,
      deposit_return_method: form.deposit_return_method || ''
    };
    try {
      if (editing) {
        await updateTenant(editing.id, payload);
        toast.success('Tenant updated');
      } else {
        await createTenant(payload);
        toast.success('Tenant created');
      }
      setDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save tenant');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    const tenant = tenants.find(t => t.id === id);
    setDeleteDialog(tenant);
    setDeleteConfirmStep(1);
  };

  const handlePermanentDelete = async () => {
    if (deleteConfirmStep === 1) { setDeleteConfirmStep(2); return; }
    try {
      await deleteTenant(deleteDialog.id);
      toast.success('Tenant and all associated data permanently deleted');
      setDeleteDialog(null);
      setDeleteConfirmStep(0);
      refreshNotifications();
      fetchData();
    } catch (e2) {
      toast.error(e2.response?.data?.detail || 'Failed to delete tenant');
    }
  };

  const handleConfirmMoveout = async (tenant) => {
    try {
      await confirmMoveout(tenant.id);
      toast.success(`${tenant.name} confirmed moved out`);
      if (!tenant.is_airbnb_vrbo && tenant.deposit_amount) {
        toast.info('Deposit return reminder created for 3 days from now');
      }
      refreshNotifications();
      setMoveoutDialog(null);
      fetchData();
    } catch {
      toast.error('Failed to confirm move-out');
    }
  };

  // ============================================================
  // TABLE STYLES & COLUMNS
  // ============================================================
  const thClass = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap border-b border-border/60";
  const tdClass = "px-3 py-2 text-[12px] whitespace-nowrap border-b border-border/40";
  const rowBaseClass = "transition-colors cursor-pointer hover:bg-muted/30";

  const currentColumns = [
    { key: 'unit', label: 'Unit', w: '70px' },
    { key: 'name', label: 'Tenant Name', w: '200px' },
    { key: 'move_in', label: 'Move In', w: '90px' },
    { key: 'move_out', label: 'Move Out', w: '90px' },
    { key: 'rent', label: 'Monthly Rent', w: '110px' },
    { key: 'notes', label: 'Notes', w: '180px' },
    { key: 'actions', label: 'Actions', w: '80px' },
  ];

  const pastColumns = [
    { key: 'unit', label: 'Unit', w: '70px' },
    { key: 'name', label: 'Tenant Name', w: '200px' },
    { key: 'move_in', label: 'Move In', w: '90px' },
    { key: 'move_out', label: 'Move Out', w: '90px' },
    { key: 'rent', label: 'Rent', w: '100px' },
    { key: 'notes', label: 'Notes', w: '180px' },
    { key: 'actions', label: 'Actions', w: '80px' },
  ];

  const renderTableHeader = (columns) => (
    <thead className="sticky top-0 z-10 bg-[hsl(36,18%,94%)]">
      <tr>
        {columns.map(col => (
          <th key={col.key} className={thClass} style={{ minWidth: col.w }}>{col.label}</th>
        ))}
      </tr>
    </thead>
  );

  const renderCurrentRow = (tenant, idx, isFuture = false, isPending = false) => {
    const unit = unitMap[tenant.unit_id];
    const unitNum = unit?.unit_number || '?';
    const isAirbnb = tenant.is_airbnb_vrbo;
    const rentDisplay = isAirbnb ? fmtMoney(tenant.total_rent) : fmtMoney(tenant.monthly_rent);
    const bgClass = isFuture ? 'bg-sky-50/70' : isPending ? 'bg-amber-50/60' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';

    return (
      <tr key={tenant.id} className={`${rowBaseClass} ${bgClass}`} onClick={() => setDetailTenant(tenant)} data-testid="tenants-table-row">
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
              <Button size="sm" className="h-6 text-[10px] px-2 gap-0.5" onClick={() => handleConfirmMoveout(tenant)} data-testid="confirm-moveout-button">
                <CheckCircle2 className="h-3 w-3" /> OK
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEdit(tenant)} data-testid="tenant-edit-button">
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={(e) => handleDelete(tenant.id, e)} data-testid="tenant-delete-button">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  const renderPastRow = (tenant, idx) => {
    const unit = unitMap[tenant.unit_id];
    const unitNum = unit?.unit_number || '?';
    const isAirbnb = tenant.is_airbnb_vrbo;
    const rentDisplay = isAirbnb ? fmtMoney(tenant.total_rent) : fmtMoney(tenant.monthly_rent);
    const bgClass = isAirbnb ? 'bg-emerald-50/60' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';

    return (
      <tr key={tenant.id} className={`${rowBaseClass} ${bgClass}`} onClick={() => setDetailTenant(tenant)} data-testid="tenants-table-row">
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
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEdit(tenant)} data-testid="tenant-edit-button">
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={(e) => handleDelete(tenant.id, e)} data-testid="tenant-delete-button">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  // ============================================================
  // TAB: CURRENT & FUTURE
  // ============================================================
  const renderCurrentFutureTab = () => {
    const allCurrentFuture = [...currentTenants, ...pendingMoveoutTenants, ...futureTenants];
    if (allCurrentFuture.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No current or future tenants</p>
          <Button className="mt-4" size="sm" onClick={() => openCreate()}>Add Tenant</Button>
        </div>
      );
    }

    return sortedProperties.map(prop => {
      const propId = prop.id;
      const propUnits = unitsByProperty[propId] || [];
      const currentInProp = currentGrouped[propId] || {};
      const futureInProp = futureGrouped[propId] || {};
      const hasAnyTenants = Object.keys(currentInProp).length > 0 || Object.keys(futureInProp).length > 0;
      if (!hasAnyTenants) return null;

      const { occupied, total } = getOccupancy(propId);
      const isExpanded = expandedProps[`cf-${propId}`];

      return (
        <div key={propId} className="mb-3 rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden" data-testid={`property-group-${propId}`}>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 text-left bg-slate-100 hover:bg-slate-200 transition-colors border-b border-border/40"
            onClick={() => setExpandedProps(prev => ({ ...prev, [`cf-${propId}`]: !prev[`cf-${propId}`] }))}
            data-testid={`property-toggle-${propId}`}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
            <span className="text-[13px] font-semibold">{prop.address || prop.name}</span>
            <span className="text-[11px] text-muted-foreground tabular-nums">{occupied} / {total} occupied</span>
          </button>

          {isExpanded && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                {renderTableHeader(currentColumns)}
                <tbody>
                  {propUnits.map(unit => {
                    const unitId = unit.id;
                    const unitCurrentTenants = (currentInProp[unitId] || []).sort((a, b) => a.move_in_date.localeCompare(b.move_in_date));
                    const unitFutureTenants = (futureInProp[unitId] || []).sort((a, b) => a.move_in_date.localeCompare(b.move_in_date));
                    if (unitCurrentTenants.length === 0 && unitFutureTenants.length === 0) return null;

                    const futureKey = `future-${unitId}`;
                    const isFutureExpanded = expandedFuture[futureKey];
                    let rowIdx = 0;

                    return [
                      ...unitCurrentTenants.map(t => {
                        const isPending = t.move_out_date < today && !t.moveout_confirmed;
                        return renderCurrentRow(t, rowIdx++, false, isPending);
                      }),
                      unitFutureTenants.length > 0 && (
                        <tr key={`future-toggle-${unitId}`} className="bg-transparent">
                          <td colSpan={currentColumns.length} className="px-3 py-1 border-b border-border/40">
                            <button
                              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                              onClick={(e) => { e.stopPropagation(); setExpandedFuture(prev => ({ ...prev, [futureKey]: !prev[futureKey] })); }}
                              data-testid={`future-toggle-${unitId}`}
                            >
                              {isFutureExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              Future Tenants ({unitFutureTenants.length})
                            </button>
                          </td>
                        </tr>
                      ),
                      ...(isFutureExpanded ? unitFutureTenants.map((t, fi) => renderCurrentRow(t, fi, true, false)) : [])
                    ];
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    });
  };

  // ============================================================
  // TAB: PAST BY UNIT
  // ============================================================
  const renderPastByUnit = () => {
    if (pastTenants.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No past tenants</p>
        </div>
      );
    }

    return sortedProperties.map(prop => {
      const propId = prop.id;
      const pastInProp = pastGrouped[propId];
      if (!pastInProp) return null;

      const propUnits = unitsByProperty[propId] || [];
      const totalPastInProp = Object.values(pastInProp).flat().length;
      const isExpanded = expandedPastProps[`past-${propId}`];

      return (
        <div key={propId} className="mb-3 rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden" data-testid={`past-property-group-${propId}`}>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 text-left bg-slate-100 hover:bg-slate-200 transition-colors border-b border-border/40"
            onClick={() => setExpandedPastProps(prev => ({ ...prev, [`past-${propId}`]: !prev[`past-${propId}`] }))}
            data-testid={`past-property-toggle-${propId}`}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
            <span className="text-[13px] font-semibold">{prop.address || prop.name}</span>
            <span className="text-[11px] text-muted-foreground">{totalPastInProp} past tenants</span>
          </button>

          {isExpanded && (
            <div>
              {sortUnitsNumerically(propUnits.filter(u => pastInProp[u.id])).map(unit => {
                const unitId = unit.id;
                const unitPast = (pastInProp[unitId] || []).sort((a, b) => b.move_out_date.localeCompare(a.move_out_date));
                if (unitPast.length === 0) return null;

                const unitKey = `past-unit-${unitId}`;
                const isUnitExpanded = expandedPastUnits[unitKey];

                return (
                  <div key={unitId} className="border-t border-border/30">
                    <button
                      className="w-full flex items-center gap-2 px-6 py-2 text-left hover:bg-muted/20 transition-colors"
                      onClick={() => setExpandedPastUnits(prev => ({ ...prev, [unitKey]: !prev[unitKey] }))}
                      data-testid={`past-unit-toggle-${unitId}`}
                    >
                      {isUnitExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                      <span className="text-[12px] font-medium">Unit {unit.unit_number}</span>
                      <span className="text-[11px] text-muted-foreground">{unitPast.length} tenants</span>
                    </button>
                    {isUnitExpanded && (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          {renderTableHeader(pastColumns)}
                          <tbody>{unitPast.map((t, idx) => renderPastRow(t, idx))}</tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };

  // ============================================================
  // TAB: PAST BY QUARTERLY
  // ============================================================
  const renderPastByMoveOut = () => {
    if (pastTenants.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No past tenants</p>
        </div>
      );
    }

    const quarterGroups = {};
    pastTenants.forEach(t => {
      const qLabel = getQuarterLabel(t.move_out_date);
      const qKey = getQuarterSortKey(t.move_out_date);
      if (!quarterGroups[qKey]) quarterGroups[qKey] = { label: qLabel, tenants: [] };
      quarterGroups[qKey].tenants.push(t);
    });

    const sortedQuarters = Object.entries(quarterGroups).sort((a, b) => b[0].localeCompare(a[0]));

    return sortedQuarters.map(([qKey, { label, tenants: qTenants }]) => {
      const sorted = [...qTenants].sort((a, b) => b.move_out_date.localeCompare(a.move_out_date));
      const isExpanded = expandedQuarters[qKey];

      return (
        <div key={qKey} className="border-b border-border/60" data-testid={`quarter-group-${qKey}`}>
          <button
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/30 transition-colors"
            onClick={() => setExpandedQuarters(prev => ({ ...prev, [qKey]: !prev[qKey] }))}
            data-testid={`quarter-toggle-${qKey}`}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
            <span className="text-[13px] font-semibold">{label}</span>
            <span className="text-[11px] text-muted-foreground">{sorted.length} tenants</span>
          </button>
          {isExpanded && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                {renderTableHeader(pastColumns)}
                <tbody>{sorted.map((t, idx) => renderPastRow(t, idx))}</tbody>
              </table>
            </div>
          )}
        </div>
      );
    });
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-4" data-testid="tenants-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Tenants</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage current, future, and past tenants</p>
        </div>
        <Button onClick={() => openCreate()} data-testid="tenants-create-button">
          <Plus className="h-4 w-4 mr-2" /> Add Tenant
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">Loading...</div>
      ) : tenants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-lg">
          <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-heading text-lg font-semibold">No tenants yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Add tenants to your units</p>
          <Button className="mt-4" onClick={() => openCreate()}>Add Tenant</Button>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-3" data-testid="tenants-tabs">
            <TabsTrigger value="current-future" data-testid="tab-current-future">
              Current & Future Tenants
              <Badge variant="secondary" className="ml-2 text-[10px] tabular-nums">
                {currentTenants.length + pendingMoveoutTenants.length + futureTenants.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="past" data-testid="tab-past">
              Past Tenants
              <Badge variant="secondary" className="ml-2 text-[10px] tabular-nums">{pastTenants.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current-future" className="mt-0">
            <div className="rounded-lg border border-border/70 bg-[hsl(36,33%,97%)] overflow-hidden" data-testid="current-future-table">
              {renderCurrentFutureTab()}
            </div>
          </TabsContent>

          <TabsContent value="past" className="mt-0">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[12px] font-medium text-muted-foreground">Sort By:</span>
              <div className="flex rounded-md border border-border/70 overflow-hidden">
                <button
                  className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${pastSortMode === 'by-unit' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted/40'}`}
                  onClick={() => setPastSortMode('by-unit')}
                  data-testid="past-sort-by-unit"
                >By Unit</button>
                <button
                  className={`px-3 py-1.5 text-[12px] font-medium transition-colors border-l border-border/70 ${pastSortMode === 'by-moveout' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted/40'}`}
                  onClick={() => setPastSortMode('by-moveout')}
                  data-testid="past-sort-by-moveout"
                >By Move-Out Date</button>
              </div>
            </div>
            <div className="rounded-lg border border-border/70 bg-[hsl(36,33%,97%)] overflow-hidden" data-testid="past-tenants-table">
              {pastSortMode === 'by-unit' ? renderPastByUnit() : renderPastByMoveOut()}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Dialogs */}
      <TenantDetailDialog
        tenant={detailTenant}
        onClose={() => setDetailTenant(null)}
        propMap={propMap}
        unitMap={unitMap}
        onEdit={openEdit}
        marlinsDecals={marlinsDecals}
      />

      <TenantFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        form={form}
        setForm={setForm}
        handleSave={handleSave}
        saving={saving}
        sortedProperties={sortedProperties}
        filteredUnits={filteredUnits}
        fetchData={fetchData}
        marlinsDecals={marlinsDecals}
      />

      <TenantDeleteDialog
        tenant={deleteDialog}
        step={deleteConfirmStep}
        onClose={() => { setDeleteDialog(null); setDeleteConfirmStep(0); }}
        onContinue={handlePermanentDelete}
        propMap={propMap}
        unitMap={unitMap}
      />
    </div>
  );
}
