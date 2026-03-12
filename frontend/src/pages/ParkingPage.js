import { useState, useEffect, useCallback } from 'react';
import { getParkingSpots, createParkingSpot, updateParkingSpot, deleteParkingSpot,
  getParkingAssignments, createParkingAssignment, updateParkingAssignment, deleteParkingAssignment,
  getProperties, getUnits, getTenants, createNotification } from '@/lib/api';
import { TenantDetailModal } from '@/components/TenantDetailModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Car, Plus, Pencil, Trash2, UserPlus, ChevronDown, ChevronRight, Bell, Search } from 'lucide-react';
import { toast } from 'sonner';

const emptySpotForm = {
  spot_type: 'designated', location: '', property_ids: [], spot_number: '',
  parking_pass_number: '', cost: '', notes: '', decal_number: '', decal_year: '',
};

const emptyAssignForm = {
  parking_spot_id: '', tenant_id: '', tenant_name: '', property_id: '', unit_id: '',
  start_date: '', end_date: '', notes: '', is_active: true,
};

export default function ParkingPage() {
  const [spots, setSpots] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [properties, setProperties] = useState([]);
  const [allUnits, setAllUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spotDialog, setSpotDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [reminderDialog, setReminderDialog] = useState(false);
  const [editingSpot, setEditingSpot] = useState(null);
  const [editingAssign, setEditingAssign] = useState(null);
  const [spotForm, setSpotForm] = useState(emptySpotForm);
  const [assignForm, setAssignForm] = useState(emptyAssignForm);
  const [reminderForm, setReminderForm] = useState({ date: '', time: '', notes: '' });
  const [reminderContext, setReminderContext] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantDetailId, setTenantDetailId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [sp, asgn, props, units, ten] = await Promise.all([
        getParkingSpots(), getParkingAssignments(), getProperties(), getUnits(), getTenants()
      ]);
      setSpots(sp); setAssignments(asgn); setProperties(props); setAllUnits(units); setTenants(ten);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const propMap = {};
  properties.forEach(p => { propMap[p.id] = p; });
  const unitMap = {};
  allUnits.forEach(u => { unitMap[u.id] = u; });
  const tenantMap = {};
  tenants.forEach(t => { tenantMap[t.id] = t; });
  const spotMap = {};
  spots.forEach(s => { spotMap[s.id] = s; });

  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => String(currentYear + i));

  // Spot CRUD
  const openCreateSpot = () => { setEditingSpot(null); setSpotForm({ ...emptySpotForm }); setSpotDialog(true); };
  const openEditSpot = (s) => {
    setEditingSpot(s);
    setSpotForm({
      spot_type: s.spot_type || 'designated', location: s.location || '',
      property_ids: s.property_ids || [], spot_number: s.spot_number || '',
      parking_pass_number: s.parking_pass_number || '', cost: s.cost ?? '',
      notes: s.notes || '', decal_number: s.decal_number || '', decal_year: s.decal_year || '',
    });
    setSpotDialog(true);
  };

  const handleSaveSpot = async () => {
    if (spotForm.spot_type === 'designated' && !spotForm.spot_number) {
      toast.error('Spot number is required'); return;
    }
    if (spotForm.spot_type === 'marlins_decal' && !spotForm.decal_number) {
      toast.error('Decal number is required'); return;
    }
    setSaving(true);
    const payload = { ...spotForm, cost: spotForm.cost ? parseFloat(spotForm.cost) : null };
    try {
      if (editingSpot) { await updateParkingSpot(editingSpot.id, payload); toast.success('Spot updated'); }
      else { await createParkingSpot(payload); toast.success('Spot created'); }
      setSpotDialog(false); fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDeleteSpot = async (id) => {
    if (!window.confirm('Delete this parking spot and all its assignments?')) return;
    try { await deleteParkingSpot(id); toast.success('Deleted'); fetchData(); }
    catch { toast.error('Failed to delete'); }
  };

  // Assignment CRUD
  const openAssign = (spotId) => {
    const spot = spotMap[spotId];
    setEditingAssign(null);
    setAssignForm({ ...emptyAssignForm, parking_spot_id: spotId });
    setAssignDialog(true);
  };

  const openEditAssign = (a) => {
    setEditingAssign(a);
    setAssignForm({
      parking_spot_id: a.parking_spot_id, tenant_id: a.tenant_id, tenant_name: a.tenant_name || '',
      property_id: a.property_id || '', unit_id: a.unit_id || '',
      start_date: a.start_date, end_date: a.end_date, notes: a.notes || '', is_active: a.is_active,
    });
    setAssignDialog(true);
  };

  const handleTenantSelect = (tenantId) => {
    const t = tenantMap[tenantId];
    if (t) {
      setAssignForm(f => ({
        ...f, tenant_id: tenantId, tenant_name: t.name,
        property_id: t.property_id || '', unit_id: t.unit_id || '',
        start_date: f.start_date || t.move_in_date || '', end_date: f.end_date || t.move_out_date || '',
      }));
    }
  };

  const handleSaveAssign = async () => {
    if (!assignForm.parking_spot_id || !assignForm.tenant_id || !assignForm.start_date || !assignForm.end_date) {
      toast.error('Please fill all required fields'); return;
    }
    setSaving(true);
    try {
      if (editingAssign) { await updateParkingAssignment(editingAssign.id, assignForm); toast.success('Assignment updated'); }
      else { await createParkingAssignment(assignForm); toast.success('Tenant assigned (reminders auto-created for decals)'); }
      setAssignDialog(false); fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDeleteAssign = async (id) => {
    if (!window.confirm('Remove this assignment?')) return;
    try { await deleteParkingAssignment(id); toast.success('Removed'); fetchData(); }
    catch { toast.error('Failed to delete'); }
  };

  // Manual reminder for decal
  const openReminderDialog = (assignment) => {
    setReminderContext(assignment);
    setReminderForm({ date: '', time: '', notes: '' });
    setReminderDialog(true);
  };

  const handleAddReminder = async () => {
    if (!reminderForm.date) { toast.error('Date required'); return; }
    const spot = spotMap[reminderContext.parking_spot_id];
    try {
      await createNotification({
        name: `Pickup Decal #${spot?.decal_number || ''} from ${reminderContext.tenant_name}`,
        property_id: reminderContext.property_id,
        unit_id: reminderContext.unit_id,
        reminder_date: reminderForm.date,
        reminder_time: reminderForm.time || '10:00',
        status: 'upcoming',
        notification_type: 'parking',
        related_entity_type: 'parking_assignment',
        related_entity_id: reminderContext.id,
        tenant_name: reminderContext.tenant_name,
        message: reminderForm.notes || `Pickup Marlins Decal #${spot?.decal_number || ''}`,
        notes: reminderForm.notes,
      });
      toast.success('Reminder added');
      setReminderDialog(false);
    } catch { toast.error('Failed to add reminder'); }
  };

  const togglePropertyId = (propId) => {
    const ids = [...spotForm.property_ids];
    const idx = ids.indexOf(propId);
    if (idx >= 0) ids.splice(idx, 1); else ids.push(propId);
    setSpotForm({ ...spotForm, property_ids: ids });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight" data-testid="parking-page-title">Parking</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage parking spots, decals, and tenant assignments</p>
      </div>

      <Tabs defaultValue="info">
        <TabsList data-testid="parking-tabs">
          <TabsTrigger value="info" data-testid="parking-tab-info">Parking Info</TabsTrigger>
          <TabsTrigger value="assignments" data-testid="parking-tab-assignments">Tenant Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button onClick={openCreateSpot} data-testid="parking-add-spot-btn"><Plus className="h-4 w-4 mr-2" />Add Parking Space</Button>
          </div>
          {loading ? <div className="text-center py-12 text-muted-foreground">Loading...</div> : spots.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <Car className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No parking spaces added yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {spots.map(s => (
                <SpotCard key={s.id} spot={s} propMap={propMap} onEdit={() => openEditSpot(s)} onDelete={() => handleDeleteSpot(s.id)} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <AssignmentsTab spots={spots} assignments={assignments} propMap={propMap} unitMap={unitMap} tenantMap={tenantMap}
            today={today} onAssign={openAssign} onEditAssign={openEditAssign}
            onDeleteAssign={handleDeleteAssign} onAddReminder={openReminderDialog}
            onTenantClick={(tid) => setTenantDetailId(tid)} />
        </TabsContent>
      </Tabs>

      {/* Spot Dialog */}
      <Dialog open={spotDialog} onOpenChange={setSpotDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSpot ? 'Edit Parking Space' : 'Add Parking Space'}</DialogTitle>
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
              <>
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
              </>
            )}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={spotForm.notes} onChange={e => setSpotForm({ ...spotForm, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSpotDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveSpot} disabled={saving} data-testid="spot-save-btn">{saving ? 'Saving...' : editingSpot ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignment Dialog */}
      <Dialog open={assignDialog} onOpenChange={(v) => { setAssignDialog(v); setTenantSearch(''); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAssign ? 'Edit Assignment' : 'Assign Tenant'}</DialogTitle>
            <DialogDescription>Assign a tenant to this parking space.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="space-y-2">
              <Label>Tenant *</Label>
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search tenants..."
                  value={tenantSearch}
                  onChange={e => setTenantSearch(e.target.value)}
                  data-testid="assign-tenant-search"
                />
              </div>
              {/* Filtered tenant list */}
              {(() => {
                const spot = spotMap[assignForm.parking_spot_id];
                const isDecal = spot?.spot_type === 'decal';
                const spotPropIds = spot?.property_ids || [];

                // Determine the "1542" property id
                const prop1542 = properties.find(p => p.name?.includes('1542') || p.address?.includes('1542'));

                let filteredTenants = tenants;

                if (isDecal && prop1542) {
                  // Marlins decal: only tenants from 1542 property
                  filteredTenants = tenants.filter(t => t.property_id === prop1542.id);
                } else if (!isDecal && spotPropIds.length > 0) {
                  // Designated: only tenants from the spot's property with has_parking=true
                  filteredTenants = tenants.filter(t =>
                    spotPropIds.includes(t.property_id) && t.has_parking
                  );
                }

                // Apply search filter
                if (tenantSearch.trim()) {
                  const q = tenantSearch.toLowerCase();
                  filteredTenants = filteredTenants.filter(t =>
                    t.name?.toLowerCase().includes(q) ||
                    (unitMap[t.unit_id]?.unit_number || '').toLowerCase().includes(q) ||
                    (propMap[t.property_id]?.name || '').toLowerCase().includes(q)
                  );
                }

                return (
                  <div className="max-h-40 overflow-y-auto border rounded-md" data-testid="assign-tenant-list">
                    {filteredTenants.length === 0 ? (
                      <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                        {!isDecal && spotPropIds.length > 0 ? 'No tenants with parking enabled for this property' : 'No matching tenants'}
                      </p>
                    ) : (
                      filteredTenants.map(t => {
                        const unit = unitMap[t.unit_id];
                        const prop = propMap[t.property_id];
                        const isSelected = assignForm.tenant_id === t.id;
                        return (
                          <button
                            key={t.id}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 border-b border-border/30 transition-colors ${isSelected ? 'bg-primary/10 font-medium' : ''}`}
                            onClick={() => handleTenantSelect(t.id)}
                            data-testid="assign-tenant-option"
                          >
                            <span>{t.name}</span>
                            <span className="text-muted-foreground ml-2 text-xs">
                              ({prop?.name || ''} - Unit {unit?.unit_number || '?'})
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                );
              })()}
              {assignForm.tenant_id && (
                <p className="text-xs text-muted-foreground">Selected: <strong>{assignForm.tenant_name}</strong></p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input type="date" value={assignForm.start_date} onChange={e => setAssignForm({ ...assignForm, start_date: e.target.value })} data-testid="assign-start-date" />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input type="date" value={assignForm.end_date} onChange={e => setAssignForm({ ...assignForm, end_date: e.target.value })} data-testid="assign-end-date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={assignForm.notes} onChange={e => setAssignForm({ ...assignForm, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveAssign} disabled={saving} data-testid="assign-save-btn">{saving ? 'Saving...' : editingAssign ? 'Update' : 'Assign'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Reminder Dialog */}
      <Dialog open={reminderDialog} onOpenChange={setReminderDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Reminder</DialogTitle>
            <DialogDescription>Set a custom reminder for decal pickup.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" value={reminderForm.date} onChange={e => setReminderForm({ ...reminderForm, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input type="time" value={reminderForm.time} onChange={e => setReminderForm({ ...reminderForm, time: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={reminderForm.notes} onChange={e => setReminderForm({ ...reminderForm, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReminderDialog(false)}>Cancel</Button>
            <Button onClick={handleAddReminder}>Add Reminder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tenant Detail Modal */}
      <TenantDetailModal tenantId={tenantDetailId} open={!!tenantDetailId} onClose={() => setTenantDetailId(null)} />
    </div>
  );
}

function SpotCard({ spot, propMap, onEdit, onDelete }) {
  const isDecal = spot.spot_type === 'marlins_decal';
  return (
    <div className="border rounded-lg p-3 bg-card hover:bg-muted/30 transition-colors" data-testid="parking-spot-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={isDecal ? 'secondary' : 'default'} className="text-xs">
            {isDecal ? 'Marlins Decal' : 'Designated'}
          </Badge>
          <span className="font-medium text-sm">
            {isDecal ? `Decal #${spot.decal_number}` : `Spot #${spot.spot_number}`}
          </span>
          {isDecal && spot.decal_year && <span className="text-xs text-muted-foreground">Year: {spot.decal_year}</span>}
          {!isDecal && spot.location && <span className="text-xs text-muted-foreground">{spot.location}</span>}
          {!isDecal && spot.cost && <span className="text-xs text-muted-foreground">${spot.cost}/mo</span>}
          {!isDecal && spot.property_ids?.length > 0 && (
            <div className="flex gap-1">{spot.property_ids.map(pid => (
              <Badge key={pid} variant="outline" className="text-[10px]">{propMap[pid]?.name || pid}</Badge>
            ))}</div>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      {spot.notes && <p className="text-xs text-muted-foreground mt-1 ml-1">{spot.notes}</p>}
    </div>
  );
}

function AssignmentsTab({ spots, assignments, propMap, unitMap, tenantMap, today, onAssign, onEditAssign, onDeleteAssign, onAddReminder, onTenantClick }) {
  const [expandedSpots, setExpandedSpots] = useState({});
  const toggle = (id) => setExpandedSpots(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="space-y-2">
      {spots.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">Add parking spaces first in the Parking Info tab</p>
        </div>
      ) : spots.map(spot => {
        const spotAssigns = assignments.filter(a => a.parking_spot_id === spot.id);
        const current = spotAssigns.filter(a => a.start_date <= today && a.end_date >= today);
        const future = spotAssigns.filter(a => a.start_date > today);
        const past = spotAssigns.filter(a => a.end_date < today);
        const isDecal = spot.spot_type === 'marlins_decal';
        const label = isDecal ? `Decal #${spot.decal_number}` : `Spot #${spot.spot_number}`;

        return (
          <div key={spot.id} className="border rounded-lg overflow-hidden" data-testid="parking-assignment-group">
            <div className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer" onClick={() => toggle(spot.id)}>
              <div className="flex items-center gap-2">
                {expandedSpots[spot.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Badge variant={isDecal ? 'secondary' : 'default'} className="text-xs">{isDecal ? 'Decal' : 'Spot'}</Badge>
                <span className="font-medium text-sm">{label}</span>
                <span className="text-xs text-muted-foreground">
                  {current.length > 0 ? `${current.length} active` : 'No active tenant'}
                  {future.length > 0 && ` | ${future.length} upcoming`}
                </span>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={e => { e.stopPropagation(); onAssign(spot.id); }}>
                <UserPlus className="h-3 w-3 mr-1" />Assign
              </Button>
            </div>
            {expandedSpots[spot.id] && (
              <div className="border-t">
                {spotAssigns.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3">No tenants assigned</p>
                ) : (
                  <div>
                    {current.length > 0 && <AssignSection title="Current" items={current} tenantMap={tenantMap} propMap={propMap} unitMap={unitMap}
                      bgClass="bg-emerald-50" onEdit={onEditAssign} onDelete={onDeleteAssign} isDecal={isDecal} onAddReminder={onAddReminder} onTenantClick={onTenantClick} />}
                    {future.length > 0 && <AssignSection title="Future" items={future} tenantMap={tenantMap} propMap={propMap} unitMap={unitMap}
                      bgClass="bg-blue-50" onEdit={onEditAssign} onDelete={onDeleteAssign} isDecal={isDecal} onAddReminder={onAddReminder} onTenantClick={onTenantClick} />}
                    {past.length > 0 && <AssignSection title="Archive" items={past} tenantMap={tenantMap} propMap={propMap} unitMap={unitMap}
                      bgClass="bg-stone-50" onEdit={onEditAssign} onDelete={onDeleteAssign} isDecal={isDecal} onAddReminder={onAddReminder} onTenantClick={onTenantClick} />}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AssignSection({ title, items, tenantMap, propMap, unitMap, bgClass, onEdit, onDelete, isDecal, onAddReminder, onTenantClick }) {
  return (
    <div>
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b bg-muted/20">{title}</div>
      {items.map(a => {
        const unit = unitMap[a.unit_id];
        return (
          <div key={a.id} className={`flex items-center justify-between px-3 py-2 border-b last:border-0 ${bgClass}`} data-testid="parking-assignment-row">
            <div className="flex items-center gap-3 text-sm">
              <button className="font-medium text-blue-600 hover:underline" onClick={() => onTenantClick && onTenantClick(a.tenant_id)}>
                {a.tenant_name || tenantMap[a.tenant_id]?.name || 'Unknown'}
              </button>
              {propMap[a.property_id] && <span className="text-xs text-muted-foreground">{propMap[a.property_id].name}</span>}
              {unit && <span className="text-xs text-muted-foreground">Unit {unit.unit_number}</span>}
              <span className="text-xs text-muted-foreground">{a.start_date} to {a.end_date}</span>
              {a.notes && <span className="text-xs text-muted-foreground italic">{a.notes}</span>}
            </div>
            <div className="flex gap-1">
              {isDecal && (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onAddReminder(a)} title="Add reminder">
                  <Bell className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => onDelete(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
