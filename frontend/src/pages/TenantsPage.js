import { useState, useEffect, useCallback, useMemo } from 'react';
import { getTenants, createTenant, updateTenant, deleteTenant, confirmMoveout, getPendingMoveouts, getProperties, getUnits, getMarlinsDecals } from '@/lib/api';
import { useNotifications } from '@/App';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { TenantFormDialog } from '@/components/tenants/TenantFormDialog';
import { TenantDetailDialog } from '@/components/tenants/TenantDetailDialog';
import { TenantDeleteDialog } from '@/components/tenants/TenantDeleteDialog';
import { CurrentFutureTab } from '@/components/tenants/CurrentFutureTab';
import { PastTenantsTab } from '@/components/tenants/PastTenantsTab';
import { sortPropertiesByBuildingId, sortUnitsNumerically, emptyForm } from '@/components/tenants/tenantUtils';

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
              <CurrentFutureTab
                sortedProperties={sortedProperties}
                unitsByProperty={unitsByProperty}
                currentGrouped={currentGrouped}
                futureGrouped={futureGrouped}
                currentTenants={currentTenants}
                pendingMoveoutTenants={pendingMoveoutTenants}
                futureTenants={futureTenants}
                getOccupancy={getOccupancy}
                today={today}
                unitMap={unitMap}
                onDetail={setDetailTenant}
                onEdit={openEdit}
                onDelete={handleDelete}
                onConfirmMoveout={handleConfirmMoveout}
                onOpenCreate={openCreate}
              />
            </div>
          </TabsContent>

          <TabsContent value="past" className="mt-0">
            <PastTenantsTab
              pastTenants={pastTenants}
              sortedProperties={sortedProperties}
              unitsByProperty={unitsByProperty}
              pastGrouped={pastGrouped}
              unitMap={unitMap}
              pastSortMode={pastSortMode}
              setPastSortMode={setPastSortMode}
              onDetail={setDetailTenant}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
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
