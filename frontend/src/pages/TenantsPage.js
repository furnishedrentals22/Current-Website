import { useState, useEffect, useCallback, useMemo } from 'react';
import { getTenants, createTenant, updateTenant, deleteTenant, confirmMoveout, getPendingMoveouts, getProperties, getUnits, createNotification, createMiscCharge, getMiscCharges, deleteMiscCharge } from '@/lib/api';
import { useNotifications } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Plus, Pencil, Trash2, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// SORT HELPERS (global, reusable)
// ============================================================
export const sortPropertiesByBuildingId = (properties) => {
  return [...properties].sort((a, b) => {
    const aId = a.building_id;
    const bId = b.building_id;
    if (aId == null && bId == null) return (a.name || '').localeCompare(b.name || '');
    if (aId == null) return 1;
    if (bId == null) return -1;
    if (aId !== bId) return aId - bId;
    return (a.name || '').localeCompare(b.name || '');
  });
};

export const sortUnitsNumerically = (units) => {
  return [...units].sort((a, b) => {
    const aNum = parseInt(a.unit_number, 10);
    const bNum = parseInt(b.unit_number, 10);
    if (isNaN(aNum) && isNaN(bNum)) return (a.unit_number || '').localeCompare(b.unit_number || '');
    if (isNaN(aNum)) return 1;
    if (isNaN(bNum)) return -1;
    return aNum - bNum;
  });
};

// ============================================================
// EMPTY FORM
// ============================================================
const emptyForm = {
  property_id: '', unit_id: '', name: '', phone: '', email: '',
  move_in_date: '', move_out_date: '', is_airbnb_vrbo: false,
  deposit_amount: '', deposit_date: '', monthly_rent: '',
  partial_first_month: '', partial_last_month: '',
  pets: '', parking: '', notes: '', total_rent: '',
  payment_method: '', rent_due_date: '',
  moveout_confirmed: false, moveout_confirmed_date: null,
  deposit_return_date: '', deposit_return_amount: '', deposit_return_method: ''
};

// ============================================================
// FORMATTING HELPERS
// ============================================================
const fmt = (v) => v || '';
const fmtMoney = (v) => {
  if (v == null || v === '' || v === 0) return '';
  return `$${parseFloat(v).toLocaleString()}`;
};
const fmtDate = (v) => {
  if (!v) return '';
  // Show as MM/DD/YY for compact display
  try {
    const d = new Date(v + 'T00:00:00');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
  } catch {
    return v;
  }
};

// ============================================================
// QUARTER HELPERS
// ============================================================
const getQuarterLabel = (dateStr) => {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr + 'T00:00:00');
  const m = d.getMonth(); // 0-11
  const y = String(d.getFullYear()).slice(-2);
  const quarters = ['Jan\u2013Mar', 'Apr\u2013Jun', 'Jul\u2013Sep', 'Oct\u2013Dec'];
  return `${quarters[Math.floor(m / 3)]} '${y}`;
};

const getQuarterSortKey = (dateStr) => {
  if (!dateStr) return '0000-0';
  const d = new Date(dateStr + 'T00:00:00');
  const y = d.getFullYear();
  const q = Math.floor(d.getMonth() / 3);
  return `${y}-${q}`;
};

// ============================================================
// MISC CHARGES SECTION (for tenant edit dialog)
// ============================================================
function MiscChargesSection({ tenantId, fetchData }) {
  const [charges, setCharges] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newCharge, setNewCharge] = useState({ amount: '', description: '', charge_date: new Date().toISOString().split('T')[0] });

  const loadCharges = useCallback(async () => {
    try {
      const data = await getMiscCharges({ tenant_id: tenantId });
      setCharges(data);
    } catch { /* ignore */ }
  }, [tenantId]);

  useEffect(() => { loadCharges(); }, [loadCharges]);

  const handleAdd = async () => {
    if (!newCharge.amount || !newCharge.charge_date) { toast.error('Amount and date required'); return; }
    try {
      await createMiscCharge(tenantId, { amount: parseFloat(newCharge.amount), description: newCharge.description, charge_date: newCharge.charge_date });
      toast.success('Misc charge added');
      setNewCharge({ amount: '', description: '', charge_date: new Date().toISOString().split('T')[0] });
      setShowAdd(false);
      loadCharges();
    } catch { toast.error('Failed to add charge'); }
  };

  const handleRemove = async (id) => {
    try {
      await deleteMiscCharge(id);
      toast.success('Charge removed');
      loadCharges();
    } catch { toast.error('Failed to remove'); }
  };

  return (
    <div data-testid="misc-charges-section">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Misc Charges</p>
      {charges.length > 0 && (
        <div className="space-y-1 mb-2">
          {charges.map(c => (
            <div key={c.id} className="flex items-center justify-between p-2 rounded-lg border bg-muted/20 text-sm">
              <div className="flex items-center gap-3">
                <span className="tabular-nums font-medium">${parseFloat(c.amount).toLocaleString()}</span>
                <span className="text-muted-foreground">{c.description || 'Misc'}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{fmtDate(c.charge_date)}</span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleRemove(c.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {showAdd ? (
        <div className="space-y-2 p-3 border rounded-lg bg-muted/10">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Amount *</Label>
              <Input type="number" value={newCharge.amount} onChange={e => setNewCharge({ ...newCharge, amount: e.target.value })} placeholder="0.00" className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input value={newCharge.description} onChange={e => setNewCharge({ ...newCharge, description: e.target.value })} placeholder="e.g. Late fee" className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date *</Label>
              <Input type="date" value={newCharge.charge_date} onChange={e => setNewCharge({ ...newCharge, charge_date: e.target.value })} className="h-8" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} data-testid="save-misc-charge-btn">Save</Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAdd(true)} data-testid="add-misc-charge-btn">
          + Add Misc Charge
        </Button>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [allUnits, setAllUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingMoveouts, setPendingMoveouts] = useState([]);

  // Form dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Detail dialog
  const [detailTenant, setDetailTenant] = useState(null);

  // Moveout confirmation dialog
  const [moveoutDialog, setMoveoutDialog] = useState(null);

  // Active tab
  const [activeTab, setActiveTab] = useState('current-future');

  // Expanded states for property rows (collapsed by default)
  const [expandedProps, setExpandedProps] = useState({});
  // Expanded states for future tenants per unit
  const [expandedFuture, setExpandedFuture] = useState({});
  // Expanded states for past units
  const [expandedPastUnits, setExpandedPastUnits] = useState({});
  // Expanded states for past properties
  const [expandedPastProps, setExpandedPastProps] = useState({});
  // Expanded states for quarter sections
  const [expandedQuarters, setExpandedQuarters] = useState({});

  // Past sort mode
  const [pastSortMode, setPastSortMode] = useState('by-unit');

  const { refreshNotifications } = useNotifications();

  const fetchData = useCallback(async () => {
    try {
      const [t, p, u, pm] = await Promise.all([
        getTenants(), getProperties(), getUnits(), getPendingMoveouts()
      ]);
      setTenants(t);
      setProperties(p);
      setAllUnits(u);
      setPendingMoveouts(pm);
    } catch (e) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Show moveout popup for pending moveouts - REMOVED (handled by notifications only)

  // Maps
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

  // Sorted properties by building_id
  const sortedProperties = useMemo(() => sortPropertiesByBuildingId(properties), [properties]);

  // Sorted units by property
  const unitsByProperty = useMemo(() => {
    const grouped = {};
    allUnits.forEach(u => {
      if (!grouped[u.property_id]) grouped[u.property_id] = [];
      grouped[u.property_id].push(u);
    });
    // Sort each group numerically
    Object.keys(grouped).forEach(pid => {
      grouped[pid] = sortUnitsNumerically(grouped[pid]);
    });
    return grouped;
  }, [allUnits]);

  const filteredUnits = allUnits.filter(u => u.property_id === form.property_id);

  // Categorize tenants
  const today = new Date().toISOString().split('T')[0];

  const currentTenants = useMemo(() => tenants.filter(t =>
    t.move_in_date <= today && t.move_out_date >= today
  ), [tenants, today]);

  const pendingMoveoutTenants = useMemo(() => tenants.filter(t =>
    t.move_out_date < today && !t.moveout_confirmed
  ), [tenants, today]);

  const futureTenants = useMemo(() => tenants.filter(t =>
    t.move_in_date > today
  ), [tenants, today]);

  const pastTenants = useMemo(() => tenants.filter(t =>
    t.move_out_date < today && t.moveout_confirmed
  ), [tenants, today]);

  // Group tenants by property_id -> unit_id
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

  // Occupancy per property
  const getOccupancy = (propId) => {
    const units = unitsByProperty[propId] || [];
    const total = units.length;
    let occupied = 0;
    const currentAndPending = [...currentTenants, ...pendingMoveoutTenants];
    units.forEach(u => {
      if (currentAndPending.some(t => t.unit_id === u.id)) occupied++;
    });
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
      property_id: tenant.property_id || '',
      unit_id: tenant.unit_id || '',
      name: tenant.name || '',
      phone: tenant.phone || '',
      email: tenant.email || '',
      move_in_date: tenant.move_in_date || '',
      move_out_date: tenant.move_out_date || '',
      is_airbnb_vrbo: tenant.is_airbnb_vrbo || false,
      deposit_amount: tenant.deposit_amount || '',
      deposit_date: tenant.deposit_date || '',
      monthly_rent: tenant.monthly_rent || '',
      partial_first_month: tenant.partial_first_month || '',
      partial_last_month: tenant.partial_last_month || '',
      pets: tenant.pets || '',
      parking: tenant.parking || '',
      notes: tenant.notes || '',
      total_rent: tenant.total_rent || '',
      payment_method: tenant.payment_method || '',
      rent_due_date: tenant.rent_due_date || '',
      moveout_confirmed: tenant.moveout_confirmed || false,
      moveout_confirmed_date: tenant.moveout_confirmed_date || null,
      deposit_return_date: tenant.deposit_return_date || '',
      deposit_return_amount: tenant.deposit_return_amount || '',
      deposit_return_method: tenant.deposit_return_method || ''
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.property_id || !form.unit_id || !form.name || !form.move_in_date || !form.move_out_date) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!form.is_airbnb_vrbo && !form.monthly_rent) {
      toast.error('Monthly rent is required for long-term tenants');
      return;
    }
    if (form.is_airbnb_vrbo && !form.total_rent) {
      toast.error('Total rent is required for Airbnb/VRBO tenants');
      return;
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

  // Permanent delete state
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(0);

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    const tenant = tenants.find(t => t.id === id);
    setDeleteDialog(tenant);
    setDeleteConfirmStep(1);
  };

  const handlePermanentDelete = async () => {
    if (deleteConfirmStep === 1) {
      setDeleteConfirmStep(2);
      return;
    }
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
    } catch (e) {
      toast.error('Failed to confirm move-out');
    }
  };

  const dismissMoveoutDialog = () => {
    const remaining = pendingMoveouts.filter(p => p.id !== moveoutDialog?.id);
    setMoveoutDialog(remaining.length > 0 ? remaining[0] : null);
  };

  // Airbnb calculation
  const calcNights = () => {
    if (form.move_in_date && form.move_out_date) {
      const d1 = new Date(form.move_in_date);
      const d2 = new Date(form.move_out_date);
      const diff = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 0;
    }
    return 0;
  };

  const nights = calcNights();
  const perNight = form.total_rent && nights > 0 ? (parseFloat(form.total_rent) / nights).toFixed(2) : 0;

  // ============================================================
  // SPREADSHEET STYLES
  // ============================================================
  const thClass = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap border-b border-border/60";
  const tdClass = "px-3 py-2 text-[12px] whitespace-nowrap border-b border-border/40";
  const rowBaseClass = "transition-colors cursor-pointer hover:bg-muted/30";

  // ============================================================
  // CURRENT/FUTURE TAB COLUMNS
  // ============================================================
  const currentColumns = [
    { key: 'unit', label: 'Unit', w: '70px' },
    { key: 'name', label: 'Tenant Name', w: '200px' },
    { key: 'move_in', label: 'Move In', w: '90px' },
    { key: 'move_out', label: 'Move Out', w: '90px' },
    { key: 'rent', label: 'Monthly Rent', w: '110px' },
    { key: 'notes', label: 'Notes', w: '180px' },
    { key: 'actions', label: 'Actions', w: '80px' },
  ];

  // PAST TAB COLUMNS
  const pastColumns = [
    { key: 'unit', label: 'Unit', w: '70px' },
    { key: 'name', label: 'Tenant Name', w: '200px' },
    { key: 'move_in', label: 'Move In', w: '90px' },
    { key: 'move_out', label: 'Move Out', w: '90px' },
    { key: 'rent', label: 'Rent', w: '100px' },
    { key: 'notes', label: 'Notes', w: '180px' },
    { key: 'actions', label: 'Actions', w: '80px' },
  ];

  // ============================================================
  // ROW RENDER - CURRENT/FUTURE
  // ============================================================
  const renderCurrentRow = (tenant, idx, isFuture = false, isPending = false) => {
    const unit = unitMap[tenant.unit_id];
    const unitNum = unit?.unit_number || '?';
    const isAirbnb = tenant.is_airbnb_vrbo;
    const rentDisplay = isAirbnb ? fmtMoney(tenant.total_rent) : fmtMoney(tenant.monthly_rent);

    const bgClass = isFuture
      ? 'bg-sky-50/70'
      : isPending
        ? 'bg-amber-50/60'
        : idx % 2 === 0
          ? 'bg-white'
          : 'bg-slate-50';

    return (
      <tr
        key={tenant.id}
        className={`${rowBaseClass} ${bgClass}`}
        onClick={() => setDetailTenant(tenant)}
        data-testid="tenants-table-row"
      >
        <td className={tdClass}>
          {isFuture && <span className="text-muted-foreground mr-1">{'\u21B3'}</span>}
          {unitNum}
        </td>
        <td className={tdClass}>
          <span className="font-medium">{tenant.name}</span>
          {isAirbnb && (
            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-100 text-sky-800 border border-sky-200">
              Airbnb/VRBO
            </span>
          )}
          {isPending && (
            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
              Pending
            </span>
          )}
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

  // ============================================================
  // ROW RENDER - PAST
  // ============================================================
  const renderPastRow = (tenant, idx) => {
    const unit = unitMap[tenant.unit_id];
    const unitNum = unit?.unit_number || '?';
    const isAirbnb = tenant.is_airbnb_vrbo;
    const rentDisplay = isAirbnb ? fmtMoney(tenant.total_rent) : fmtMoney(tenant.monthly_rent);

    const bgClass = isAirbnb
      ? 'bg-emerald-50/60'
      : idx % 2 === 0
        ? 'bg-white'
        : 'bg-slate-50';

    return (
      <tr
        key={tenant.id}
        className={`${rowBaseClass} ${bgClass}`}
        onClick={() => setDetailTenant(tenant)}
        data-testid="tenants-table-row"
      >
        <td className={tdClass}>{unitNum}</td>
        <td className={tdClass}>
          <span className="font-medium">{tenant.name}</span>
          {isAirbnb && (
            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-100 text-sky-800 border border-sky-200">
              Airbnb/VRBO
            </span>
          )}
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
  // TABLE HEADER RENDER
  // ============================================================
  const renderTableHeader = (columns) => (
    <thead className="sticky top-0 z-10 bg-[hsl(36,18%,94%)]">
      <tr>
        {columns.map(col => (
          <th key={col.key} className={thClass} style={{ minWidth: col.w }}>
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
  );

  // ============================================================
  // TAB 1: CURRENT & FUTURE TENANTS
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

      // Check if this property has any current/future tenants
      const hasAnyTenants = Object.keys(currentInProp).length > 0 || Object.keys(futureInProp).length > 0;
      if (!hasAnyTenants) return null;

      const { occupied, total } = getOccupancy(propId);
      const isExpanded = expandedProps[`cf-${propId}`];

      return (
        <div key={propId} className="mb-3 rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden" data-testid={`property-group-${propId}`}>
          {/* Property Header Row */}
          <button
            className="w-full flex items-center gap-3 px-4 py-3 text-left bg-slate-100 hover:bg-slate-200 transition-colors border-b border-border/40"
            onClick={() => setExpandedProps(prev => ({ ...prev, [`cf-${propId}`]: !prev[`cf-${propId}`] }))}
            data-testid={`property-toggle-${propId}`}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
            <span className="text-[13px] font-semibold">{prop.address || prop.name}</span>
            <span className="text-[11px] text-muted-foreground tabular-nums">{occupied} / {total} occupied</span>
          </button>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                {renderTableHeader(currentColumns)}
                <tbody>
                  {propUnits.map(unit => {
                    const unitId = unit.id;
                    const unitCurrentTenants = (currentInProp[unitId] || []).sort(
                      (a, b) => a.move_in_date.localeCompare(b.move_in_date)
                    );
                    const unitFutureTenants = (futureInProp[unitId] || []).sort(
                      (a, b) => a.move_in_date.localeCompare(b.move_in_date)
                    );

                    if (unitCurrentTenants.length === 0 && unitFutureTenants.length === 0) return null;

                    const futureKey = `future-${unitId}`;
                    const isFutureExpanded = expandedFuture[futureKey];
                    let rowIdx = 0;

                    return [
                      // Current tenant rows
                      ...unitCurrentTenants.map(t => {
                        const isPending = t.move_out_date < today && !t.moveout_confirmed;
                        return renderCurrentRow(t, rowIdx++, false, isPending);
                      }),
                      // Future toggle row (if future tenants exist)
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
                      // Future tenant rows (if expanded)
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
  // TAB 2: PAST TENANTS - BY UNIT
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
              {/* Sub-group by unit */}
              {sortUnitsNumerically(propUnits.filter(u => pastInProp[u.id])).map(unit => {
                const unitId = unit.id;
                const unitPast = (pastInProp[unitId] || []).sort(
                  (a, b) => b.move_out_date.localeCompare(a.move_out_date)
                );
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
                          <tbody>
                            {unitPast.map((t, idx) => renderPastRow(t, idx))}
                          </tbody>
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
  // TAB 2: PAST TENANTS - BY MOVE-OUT DATE (QUARTERLY)
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

    // Group past tenants by quarter of move_out_date
    const quarterGroups = {};
    pastTenants.forEach(t => {
      const qLabel = getQuarterLabel(t.move_out_date);
      const qKey = getQuarterSortKey(t.move_out_date);
      if (!quarterGroups[qKey]) quarterGroups[qKey] = { label: qLabel, tenants: [] };
      quarterGroups[qKey].tenants.push(t);
    });

    // Sort quarters descending (most recent first)
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
                <tbody>
                  {sorted.map((t, idx) => renderPastRow(t, idx))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    });
  };

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <div className="space-y-4" data-testid="tenants-page">
      {/* Page Header */}
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
              <Badge variant="secondary" className="ml-2 text-[10px] tabular-nums">
                {pastTenants.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: CURRENT & FUTURE */}
          <TabsContent value="current-future" className="mt-0">
            <div className="rounded-lg border border-border/70 bg-[hsl(36,33%,97%)] overflow-hidden" data-testid="current-future-table">
              {renderCurrentFutureTab()}
            </div>
          </TabsContent>

          {/* TAB 2: PAST */}
          <TabsContent value="past" className="mt-0">
            {/* Sort toggle */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[12px] font-medium text-muted-foreground">Sort By:</span>
              <div className="flex rounded-md border border-border/70 overflow-hidden">
                <button
                  className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${pastSortMode === 'by-unit' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted/40'}`}
                  onClick={() => setPastSortMode('by-unit')}
                  data-testid="past-sort-by-unit"
                >
                  By Unit
                </button>
                <button
                  className={`px-3 py-1.5 text-[12px] font-medium transition-colors border-l border-border/70 ${pastSortMode === 'by-moveout' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted/40'}`}
                  onClick={() => setPastSortMode('by-moveout')}
                  data-testid="past-sort-by-moveout"
                >
                  By Move-Out Date
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-[hsl(36,33%,97%)] overflow-hidden" data-testid="past-tenants-table">
              {pastSortMode === 'by-unit' ? renderPastByUnit() : renderPastByMoveOut()}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* ===== TENANT DETAIL DIALOG ===== */}
      <Dialog open={!!detailTenant} onOpenChange={() => setDetailTenant(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              {detailTenant?.name}
              <Badge variant={detailTenant?.is_airbnb_vrbo ? 'default' : 'secondary'}
                className={`text-xs ${detailTenant?.is_airbnb_vrbo ? 'bg-sky-100 text-sky-900' : ''}`}>
                {detailTenant?.is_airbnb_vrbo ? 'Airbnb/VRBO' : 'Long-term'}
              </Badge>
            </DialogTitle>
            <DialogDescription className="sr-only">Tenant details</DialogDescription>
          </DialogHeader>
          {detailTenant && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Property</p>
                  <p className="text-sm">{propMap[detailTenant.property_id]?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unit</p>
                  <p className="text-sm">{unitMap[detailTenant.unit_id]?.unit_number || '-'}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</p>
                  <p className="text-sm">{detailTenant.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</p>
                  <p className="text-sm">{detailTenant.email || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Move-in</p>
                  <p className="text-sm">{detailTenant.move_in_date}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Move-out</p>
                  <p className="text-sm">{detailTenant.move_out_date}</p>
                </div>
              </div>

              {!detailTenant.is_airbnb_vrbo ? (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Monthly Rent</p>
                      <p className="text-sm tabular-nums">${parseFloat(detailTenant.monthly_rent || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment Method</p>
                      <p className="text-sm">{detailTenant.payment_method || '-'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rent Due Date</p>
                      <p className="text-sm">{detailTenant.rent_due_date || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deposit</p>
                      <p className="text-sm tabular-nums">
                        {detailTenant.deposit_amount ? `$${parseFloat(detailTenant.deposit_amount).toLocaleString()}` : '-'}
                        {detailTenant.deposit_date ? ` (${detailTenant.deposit_date})` : ''}
                      </p>
                    </div>
                  </div>
                  {(detailTenant.deposit_return_date || detailTenant.deposit_return_amount) && (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deposit Return Date</p>
                        <p className="text-sm">{detailTenant.deposit_return_date || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deposit Return Amt</p>
                        <p className="text-sm tabular-nums">{detailTenant.deposit_return_amount ? `$${parseFloat(detailTenant.deposit_return_amount).toLocaleString()}` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deposit Return Method</p>
                        <p className="text-sm">{detailTenant.deposit_return_method || '-'}</p>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pets</p>
                      <p className="text-sm">{detailTenant.pets || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parking</p>
                      <p className="text-sm">{detailTenant.parking || '-'}</p>
                    </div>
                  </div>
                  {detailTenant.notes && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
                      <p className="text-sm text-muted-foreground">{detailTenant.notes}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Separator />
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Rent</p>
                      <p className="text-sm tabular-nums">${parseFloat(detailTenant.total_rent || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Nights</p>
                      <p className="text-sm tabular-nums">{detailTenant.total_nights || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Per Night</p>
                      <p className="text-sm tabular-nums">{detailTenant.rent_per_night ? `$${detailTenant.rent_per_night}` : '-'}</p>
                    </div>
                  </div>
                  {detailTenant.monthly_breakdown && detailTenant.monthly_breakdown.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Monthly Breakdown</p>
                      <div className="space-y-1">
                        {detailTenant.monthly_breakdown.map((mb, i) => (
                          <div key={i} className="flex justify-between text-xs px-2 py-1 rounded bg-muted/30">
                            <span>{mb.month}/{mb.year}</span>
                            <span className="tabular-nums">{mb.nights} nights — ${mb.income.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {detailTenant.notes && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
                      <p className="text-sm text-muted-foreground">{detailTenant.notes}</p>
                    </div>
                  )}
                </>
              )}

              {detailTenant.moveout_confirmed && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-muted-foreground">
                      Move-out confirmed on {detailTenant.moveout_confirmed_date || 'N/A'}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailTenant(null)}>Close</Button>
            <Button onClick={() => { setDetailTenant(null); openEdit(detailTenant); }}>Edit Tenant</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== TENANT CREATE/EDIT DIALOG ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? 'Edit Tenant' : 'Add Tenant'}</DialogTitle>
            <DialogDescription className="sr-only">{editing ? 'Edit tenant information' : 'Add a new tenant'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Property *</Label>
                <Select value={form.property_id} onValueChange={v => setForm({...form, property_id: v, unit_id: ''})}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    {sortedProperties.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}{p.building_id != null ? ` (#${p.building_id})` : ''}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit *</Label>
                <Select value={form.unit_id} onValueChange={v => setForm({...form, unit_id: v})} disabled={!form.property_id}>
                  <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>
                    {sortUnitsNumerically(filteredUnits).map(u => (<SelectItem key={u.id} value={u.id}>{u.unit_number} ({u.unit_size})</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} data-testid="tenant-name-input" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Move-in Date *</Label>
                <Input type="date" value={form.move_in_date} onChange={e => setForm({...form, move_in_date: e.target.value})} data-testid="tenant-movein-date" />
              </div>
              <div className="space-y-2">
                <Label>Move-out Date *</Label>
                <Input type="date" value={form.move_out_date} onChange={e => setForm({...form, move_out_date: e.target.value})} data-testid="tenant-moveout-date" />
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
              <Switch checked={form.is_airbnb_vrbo} onCheckedChange={v => setForm({...form, is_airbnb_vrbo: v})} data-testid="tenants-airbnb-toggle" />
              <Label className="cursor-pointer">Airbnb / VRBO</Label>
            </div>

            {!form.is_airbnb_vrbo ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Monthly Rent *</Label>
                    <Input type="number" value={form.monthly_rent} onChange={e => setForm({...form, monthly_rent: e.target.value})} data-testid="tenant-monthly-rent" />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Input value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})} placeholder="e.g. Bank transfer, Zelle, Check" data-testid="tenant-payment-method" />
                  </div>
                  <div className="space-y-2">
                    <Label>Rent Due Date</Label>
                    <Input value={form.rent_due_date} onChange={e => setForm({...form, rent_due_date: e.target.value})} placeholder="e.g. 1st, 15th" data-testid="tenant-rent-due-date" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Deposit Amount</Label>
                    <Input type="number" value={form.deposit_amount} onChange={e => setForm({...form, deposit_amount: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Deposit Date</Label>
                    <Input type="date" value={form.deposit_date} onChange={e => setForm({...form, deposit_date: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Partial First Month Override</Label>
                    <Input type="number" value={form.partial_first_month} onChange={e => setForm({...form, partial_first_month: e.target.value})} placeholder="Leave blank for full rent" />
                  </div>
                  <div className="space-y-2">
                    <Label>Partial Last Month Override</Label>
                    <Input type="number" value={form.partial_last_month} onChange={e => setForm({...form, partial_last_month: e.target.value})} placeholder="Leave blank for full rent" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pets</Label>
                    <Input value={form.pets} onChange={e => setForm({...form, pets: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Parking</Label>
                    <Input value={form.parking} onChange={e => setForm({...form, parking: e.target.value})} />
                  </div>
                </div>
                {/* Deposit Return Fields */}
                <Separator />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deposit Return (fill after move-out)</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Deposit Return Date</Label>
                    <Input type="date" value={form.deposit_return_date} onChange={e => setForm({...form, deposit_return_date: e.target.value})} data-testid="tenant-deposit-return-date" />
                  </div>
                  <div className="space-y-2">
                    <Label>Deposit Return Amount</Label>
                    <Input type="number" value={form.deposit_return_amount} onChange={e => setForm({...form, deposit_return_amount: e.target.value})} data-testid="tenant-deposit-return-amount" />
                  </div>
                  <div className="space-y-2">
                    <Label>Deposit Return Method</Label>
                    <Input value={form.deposit_return_method} onChange={e => setForm({...form, deposit_return_method: e.target.value})} placeholder="e.g. Check, Zelle" data-testid="tenant-deposit-return-method" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                </div>
                {/* Misc Charges Section */}
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
                  <Input type="number" value={form.total_rent} onChange={e => setForm({...form, total_rent: e.target.value})} data-testid="tenant-total-rent" />
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
                  <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Add any notes about this Airbnb/VRBO stay..." data-testid="tenant-airbnb-notes" />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="tenant-save-button">{saving ? 'Saving...' : (editing ? 'Update' : 'Create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== PERMANENT DELETE DIALOG ===== */}
      <Dialog open={!!deleteDialog} onOpenChange={() => { setDeleteDialog(null); setDeleteConfirmStep(0); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {deleteConfirmStep === 2 ? 'Final Confirmation' : 'Delete Tenant Permanently'}
            </DialogTitle>
            <DialogDescription>
              {deleteConfirmStep === 2
                ? 'This action cannot be undone.'
                : 'Are you sure you want to permanently delete this tenant?'}
            </DialogDescription>
          </DialogHeader>
          {deleteDialog && (
            <div className="py-2 space-y-3">
              <div className="p-3 rounded-lg border bg-red-50/50 border-red-200">
                <p className="font-medium">{deleteDialog.name}</p>
                <p className="text-sm text-muted-foreground">
                  {propMap[deleteDialog.property_id]?.name || ''} — Unit {unitMap[deleteDialog.unit_id]?.unit_number || ''}
                </p>
              </div>
              {deleteConfirmStep === 1 && (
                <div className="p-3 rounded-lg border-2 border-red-300 bg-red-50">
                  <p className="text-sm font-semibold text-red-800">Warning: This will permanently delete:</p>
                  <ul className="text-xs text-red-700 mt-1 space-y-0.5 list-disc ml-4">
                    <li>All income records from this tenant</li>
                    <li>All notifications associated with this tenant</li>
                    <li>All cleaning records</li>
                    <li>All misc charges</li>
                    <li>All rent payment tracking data</li>
                  </ul>
                </div>
              )}
              {deleteConfirmStep === 2 && (
                <div className="p-3 rounded-lg border-2 border-red-400 bg-red-100">
                  <p className="text-sm font-bold text-red-900">ARE YOU ABSOLUTELY SURE?</p>
                  <p className="text-xs text-red-800 mt-1">This will permanently delete {deleteDialog.name} and ALL associated data. This cannot be reversed.</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialog(null); setDeleteConfirmStep(0); }}>Cancel</Button>
            <Button variant="destructive" onClick={handlePermanentDelete} data-testid="confirm-permanent-delete-btn">
              {deleteConfirmStep === 2 ? 'Yes, Delete Everything' : 'Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
