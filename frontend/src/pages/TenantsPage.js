import { useState, useEffect, useCallback } from 'react';
import { getTenants, createTenant, updateTenant, deleteTenant, confirmMoveout, getPendingMoveouts, getProperties, getUnits, createNotification } from '@/lib/api';
import { useNotifications } from '@/App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Users, Plus, Pencil, Trash2, ChevronDown, ChevronRight, Building2, Home, CalendarDays, AlertTriangle, CheckCircle2, Eye } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = {
  property_id: '', unit_id: '', name: '', phone: '', email: '',
  move_in_date: '', move_out_date: '', is_airbnb_vrbo: false,
  deposit_amount: '', deposit_date: '', monthly_rent: '',
  partial_first_month: '', partial_last_month: '',
  pets: '', parking: '', notes: '', total_rent: '',
  payment_method: '', rent_due_date: '',
  moveout_confirmed: false, moveout_confirmed_date: null
};

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

  // Expanded states
  const [expandedFuture, setExpandedFuture] = useState({});
  const [expandedPast, setExpandedPast] = useState({});
  const [showPastSection, setShowPastSection] = useState(false);

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

  // Show moveout popup for pending moveouts
  useEffect(() => {
    if (pendingMoveouts.length > 0 && !moveoutDialog) {
      setMoveoutDialog(pendingMoveouts[0]);
    }
  }, [pendingMoveouts, moveoutDialog]);

  // Maps
  const propMap = {};
  properties.forEach(p => { propMap[p.id] = p; });
  const unitMap = {};
  allUnits.forEach(u => { unitMap[u.id] = u; });

  const filteredUnits = allUnits.filter(u => u.property_id === form.property_id);

  // Categorize tenants
  const today = new Date().toISOString().split('T')[0];

  const currentTenants = tenants.filter(t =>
    t.move_in_date <= today && t.move_out_date > today
  );

  const pendingMoveoutTenants = tenants.filter(t =>
    t.move_out_date <= today && !t.moveout_confirmed
  );

  const futureTenants = tenants.filter(t =>
    t.move_in_date > today
  );

  const pastTenants = tenants.filter(t =>
    t.move_out_date <= today && t.moveout_confirmed
  );

  // Group by property
  const groupByProperty = (list) => {
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

  const currentGrouped = groupByProperty([...currentTenants, ...pendingMoveoutTenants]);
  const futureGrouped = groupByProperty(futureTenants);
  const pastGrouped = groupByProperty(pastTenants);

  // CRUD
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
      moveout_confirmed_date: tenant.moveout_confirmed_date || null
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
      moveout_confirmed_date: form.moveout_confirmed_date || null
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

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this tenant?')) return;
    try {
      await deleteTenant(id);
      toast.success('Tenant deleted');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to delete tenant');
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

  // Render tenant row
  const TenantRow = ({ tenant, showActions = true, isPending = false }) => {
    const unit = unitMap[tenant.unit_id];
    return (
      <div
        className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/40 ${isPending ? 'border-amber-200 bg-amber-50/50' : 'bg-card'}`}
        onClick={() => setDetailTenant(tenant)}
        data-testid="tenants-table-row"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{tenant.name}</span>
              <Badge variant={tenant.is_airbnb_vrbo ? 'default' : 'secondary'}
                className={`text-[10px] flex-shrink-0 ${tenant.is_airbnb_vrbo ? 'bg-sky-100 text-sky-900 border-sky-200' : ''}`}>
                {tenant.is_airbnb_vrbo ? 'Airbnb/VRBO' : 'Long-term'}
              </Badge>
              {isPending && (
                <Badge className="text-[10px] bg-amber-100 text-amber-900 border-amber-200 flex-shrink-0">
                  <AlertTriangle className="h-3 w-3 mr-0.5" /> Pending Move-out
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span>{tenant.move_in_date} — {tenant.move_out_date}</span>
              <span className="tabular-nums">
                {tenant.is_airbnb_vrbo
                  ? `$${parseFloat(tenant.total_rent || 0).toLocaleString()} total`
                  : `$${parseFloat(tenant.monthly_rent || 0).toLocaleString()}/mo`
                }
              </span>
            </div>
          </div>
        </div>
        {showActions && (
          <div className="flex items-center gap-1 flex-shrink-0 ml-2" onClick={e => e.stopPropagation()}>
            {isPending && (
              <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleConfirmMoveout(tenant)} data-testid="confirm-moveout-button">
                <CheckCircle2 className="h-3 w-3" /> Confirm
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(tenant)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(tenant.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Tenants</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage current, future, and past tenants</p>
        </div>
        <Button onClick={() => openCreate()} data-testid="tenants-create-button">
          <Plus className="h-4 w-4 mr-2" /> Add Tenant
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">Loading...</div>
      ) : tenants.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-heading text-lg font-semibold">No tenants yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Add tenants to your units</p>
            <Button className="mt-4" onClick={() => openCreate()}>Add Tenant</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ===== SECTION 1: CURRENT TENANTS ===== */}
          <div className="space-y-4">
            <h2 className="font-heading text-lg font-semibold tracking-tight flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Current Tenants
              <Badge variant="secondary" className="text-xs tabular-nums">
                {currentTenants.length + pendingMoveoutTenants.length}
              </Badge>
            </h2>

            {Object.keys(currentGrouped).length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No current tenants
                </CardContent>
              </Card>
            ) : (
              Object.entries(currentGrouped).map(([propId, units]) => {
                const prop = propMap[propId];
                return (
                  <Card key={propId} className="overflow-hidden">
                    <div className="px-4 py-3 bg-muted/30 border-b flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">{prop?.name || 'Unknown Property'}</span>
                    </div>
                    <div className="divide-y">
                      {Object.entries(units).map(([unitId, unitTenants]) => {
                        const unit = unitMap[unitId];
                        const unitFuture = (futureGrouped[propId]?.[unitId] || []).sort(
                          (a, b) => a.move_in_date.localeCompare(b.move_in_date)
                        );
                        const futureKey = `future-${unitId}`;

                        return (
                          <div key={unitId} className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Badge variant="outline" className="text-xs gap-1">
                                <Home className="h-3 w-3" />
                                Unit {unit?.unit_number || '?'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {unit?.unit_size === 'other' ? unit?.unit_size_custom : unit?.unit_size}
                              </span>
                            </div>

                            <div className="space-y-2">
                              {unitTenants.map(t => (
                                <TenantRow
                                  key={t.id}
                                  tenant={t}
                                  isPending={t.move_out_date <= today && !t.moveout_confirmed}
                                />
                              ))}
                            </div>

                            {/* Future tenants dropdown */}
                            {unitFuture.length > 0 && (
                              <Collapsible open={expandedFuture[futureKey]} onOpenChange={() => setExpandedFuture(prev => ({ ...prev, [futureKey]: !prev[futureKey] }))}>
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs gap-1 text-muted-foreground">
                                    {expandedFuture[futureKey] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    <CalendarDays className="h-3 w-3" />
                                    Future Tenants ({unitFuture.length})
                                  </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="mt-2 space-y-2 pl-4 border-l-2 border-primary/20">
                                    {unitFuture.map(t => (
                                      <TenantRow key={t.id} tenant={t} />
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            )}
                          </div>
                        );
                      })}

                      {/* Show future tenants for units that have no current tenants */}
                      {Object.entries(futureGrouped[propId] || {})
                        .filter(([uid]) => !units[uid])
                        .map(([unitId, unitFuture]) => {
                          const unit = unitMap[unitId];
                          const sorted = [...unitFuture].sort((a, b) => a.move_in_date.localeCompare(b.move_in_date));
                          const futureKey = `future-empty-${unitId}`;
                          return (
                            <div key={unitId} className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Home className="h-3 w-3" />
                                  Unit {unit?.unit_number || '?'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">Currently vacant</span>
                              </div>
                              <Collapsible open={expandedFuture[futureKey]} onOpenChange={() => setExpandedFuture(prev => ({ ...prev, [futureKey]: !prev[futureKey] }))}>
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground">
                                    {expandedFuture[futureKey] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    <CalendarDays className="h-3 w-3" />
                                    Future Tenants ({sorted.length})
                                  </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="mt-2 space-y-2 pl-4 border-l-2 border-primary/20">
                                    {sorted.map(t => (<TenantRow key={t.id} tenant={t} />))}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                          );
                        })
                      }
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* ===== SECTION 2: PAST TENANTS ===== */}
          <div className="space-y-4">
            <Collapsible open={showPastSection} onOpenChange={setShowPastSection}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="past-tenants-toggle">
                  {showPastSection ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Past Tenants
                  <Badge variant="secondary" className="text-xs tabular-nums">{pastTenants.length}</Badge>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-4 space-y-4">
                  {pastTenants.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="py-8 text-center text-sm text-muted-foreground">
                        No past tenants
                      </CardContent>
                    </Card>
                  ) : (
                    Object.entries(pastGrouped).map(([propId, units]) => {
                      const prop = propMap[propId];
                      const pastPropKey = `past-${propId}`;
                      return (
                        <Collapsible key={propId} open={expandedPast[pastPropKey]} onOpenChange={() => setExpandedPast(prev => ({ ...prev, [pastPropKey]: !prev[pastPropKey] }))}>
                          <CollapsibleTrigger asChild>
                            <Card className="overflow-hidden cursor-pointer hover:bg-muted/20 transition-colors">
                              <div className="px-4 py-3 flex items-center gap-2">
                                {expandedPast[pastPropKey] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold text-sm">{prop?.name || 'Unknown'}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {Object.values(units).flat().length} tenants
                                </Badge>
                              </div>
                            </Card>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <Card className="mt-1 overflow-hidden border-t-0 rounded-t-none">
                              <div className="divide-y">
                                {Object.entries(units).map(([unitId, unitTenants]) => {
                                  const unit = unitMap[unitId];
                                  const pastUnitKey = `past-${propId}-${unitId}`;
                                  return (
                                    <Collapsible key={unitId} open={expandedPast[pastUnitKey]} onOpenChange={() => setExpandedPast(prev => ({ ...prev, [pastUnitKey]: !prev[pastUnitKey] }))}>
                                      <CollapsibleTrigger className="w-full">
                                        <div className="px-4 py-2.5 flex items-center gap-2 hover:bg-muted/30 transition-colors">
                                          {expandedPast[pastUnitKey] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                          <Badge variant="outline" className="text-xs gap-1">
                                            <Home className="h-3 w-3" />
                                            Unit {unit?.unit_number || '?'}
                                          </Badge>
                                          <span className="text-xs text-muted-foreground">{unitTenants.length} past tenants</span>
                                        </div>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent>
                                        <div className="px-4 pb-3 space-y-2">
                                          {unitTenants.sort((a, b) => b.move_out_date.localeCompare(a.move_out_date)).map(t => (
                                            <TenantRow key={t.id} tenant={t} showActions={true} />
                                          ))}
                                        </div>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  );
                                })}
                              </div>
                            </Card>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </>
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
                  {(detailTenant.partial_first_month || detailTenant.partial_last_month) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Partial First Month</p>
                        <p className="text-sm tabular-nums">{detailTenant.partial_first_month ? `$${parseFloat(detailTenant.partial_first_month).toLocaleString()}` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Partial Last Month</p>
                        <p className="text-sm tabular-nums">{detailTenant.partial_last_month ? `$${parseFloat(detailTenant.partial_last_month).toLocaleString()}` : '-'}</p>
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

      {/* ===== MOVE-OUT CONFIRMATION POPUP ===== */}
      <Dialog open={!!moveoutDialog} onOpenChange={() => dismissMoveoutDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Move-out
            </DialogTitle>
            <DialogDescription>
              The following tenant's move-out date has passed. Please confirm they have moved out.
            </DialogDescription>
          </DialogHeader>
          {moveoutDialog && (
            <div className="py-2 space-y-3">
              <div className="p-3 rounded-lg border bg-amber-50/50 border-amber-200">
                <p className="font-medium">{moveoutDialog.name}</p>
                <p className="text-sm text-muted-foreground">
                  {propMap[moveoutDialog.property_id]?.name || ''} — Unit {unitMap[moveoutDialog.unit_id]?.unit_number || ''}
                </p>
                <p className="text-sm text-muted-foreground">Move-out date: {moveoutDialog.move_out_date}</p>
              </div>
              {!moveoutDialog.is_airbnb_vrbo && moveoutDialog.deposit_amount && (
                <p className="text-sm text-muted-foreground">
                  A deposit return reminder (${parseFloat(moveoutDialog.deposit_amount).toLocaleString()}) will be created for 3 days after confirmation.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={dismissMoveoutDialog}>Later</Button>
            <Button onClick={() => moveoutDialog && handleConfirmMoveout(moveoutDialog)}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirm Moved Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== TENANT CREATE/EDIT DIALOG ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? 'Edit Tenant' : 'Add Tenant'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Property *</Label>
                <Select value={form.property_id} onValueChange={v => setForm({...form, property_id: v, unit_id: ''})}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    {properties.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit *</Label>
                <Select value={form.unit_id} onValueChange={v => setForm({...form, unit_id: v})} disabled={!form.property_id}>
                  <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>
                    {filteredUnits.map(u => (<SelectItem key={u.id} value={u.id}>{u.unit_number} ({u.unit_size})</SelectItem>))}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                </div>
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
    </div>
  );
}
