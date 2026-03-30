import { useState, useEffect, useCallback } from 'react';
import { getParkingSpots, createParkingSpot, updateParkingSpot, deleteParkingSpot,
  getParkingAssignments, createParkingAssignment, updateParkingAssignment, deleteParkingAssignment,
  getProperties, getUnits, getTenants, createNotification } from '@/lib/api';
import { TenantDetailModal } from '@/components/TenantDetailModal';
import { SpotCard } from '@/components/parking/SpotCard';
import { SpotDialog } from '@/components/parking/SpotDialog';
import { AssignDialog } from '@/components/parking/AssignDialog';
import { AssignmentsTab } from '@/components/parking/AssignmentsTab';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Car, Plus } from 'lucide-react';
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
    // All referenced functions are stable module imports
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const openAssign = (spotId) => {
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

      <SpotDialog open={spotDialog} onClose={() => setSpotDialog(false)} editing={editingSpot}
        spotForm={spotForm} setSpotForm={setSpotForm} onSave={handleSaveSpot} saving={saving} properties={properties} />

      <AssignDialog open={assignDialog} onClose={setAssignDialog} editing={editingAssign}
        assignForm={assignForm} setAssignForm={setAssignForm} onSave={handleSaveAssign} saving={saving}
        tenants={tenants} tenantSearch={tenantSearch} setTenantSearch={setTenantSearch}
        spotMap={spotMap} propMap={propMap} unitMap={unitMap} properties={properties}
        onTenantSelect={handleTenantSelect} />

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

      <TenantDetailModal tenantId={tenantDetailId} open={!!tenantDetailId} onClose={() => setTenantDetailId(null)} />
    </div>
  );
}
