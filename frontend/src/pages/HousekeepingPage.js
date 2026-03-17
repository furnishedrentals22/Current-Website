import { useState, useEffect, useCallback } from 'react';
import {
  getCleaningRecords, updateCleaningRecord,
  getHousekeepers, createHousekeeper, updateHousekeeper, deleteHousekeeper,
  getHousekeepingLeads, createHousekeepingLead, updateHousekeepingLead, deleteHousekeepingLead,
  getProperties, getUnits, getMaintenancePersonnel
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, Archive, Wrench } from 'lucide-react';
import { toast } from 'sonner';

const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getDay()]}, ${d.getMonth() + 1}/${d.getDate()}`;
};

export default function HousekeepingPage() {
  const [records, setRecords] = useState([]);
  const [housekeepers, setHousekeepers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [maintenancePersonnel, setMaintenancePersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [r, hk, hl, p, u, mp] = await Promise.all([
        getCleaningRecords(),
        getHousekeepers({ include_archived: showArchived }),
        getHousekeepingLeads({ include_archived: showArchived }),
        getProperties(),
        getUnits(),
        getMaintenancePersonnel()
      ]);
      setRecords(r);
      setHousekeepers(hk);
      setLeads(hl);
      setProperties(p);
      setUnits(u);
      setMaintenancePersonnel(mp);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const unitMap = {};
  units.forEach(u => { unitMap[u.id] = u; });
  const propMap = {};
  properties.forEach(p => { propMap[p.id] = p; });

  if (loading) return <div className="py-12 text-center text-muted-foreground text-sm">Loading...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight" data-testid="housekeeping-page-title">
          Housekeeping
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Manage cleanings, housekeepers, and leads</p>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList data-testid="housekeeping-tabs">
          <TabsTrigger value="upcoming" data-testid="hk-tab-upcoming">Upcoming Cleanings</TabsTrigger>
          <TabsTrigger value="housekeepers" data-testid="hk-tab-housekeepers">Current Housekeepers</TabsTrigger>
          <TabsTrigger value="leads" data-testid="hk-tab-leads">Housekeeping Leads</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          <UpcomingCleaningsTab
            records={records}
            housekeepers={housekeepers.filter(h => !h.is_archived)}
            maintenancePersonnel={maintenancePersonnel}
            unitMap={unitMap}
            propMap={propMap}
            onRefresh={fetchData}
          />
        </TabsContent>

        <TabsContent value="housekeepers" className="mt-4">
          <HousekeepersTab
            housekeepers={housekeepers}
            showArchived={showArchived}
            setShowArchived={setShowArchived}
            onRefresh={fetchData}
          />
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          <HousekeepingLeadsTab
            leads={leads}
            showArchived={showArchived}
            setShowArchived={setShowArchived}
            onRefresh={fetchData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ========== UPCOMING CLEANINGS TAB ========== */
function UpcomingCleaningsTab({ records, housekeepers, maintenancePersonnel, unitMap, propMap, onRefresh }) {
  const [editModal, setEditModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [useCustomMaint, setUseCustomMaint] = useState(false);

  const openEdit = (r) => {
    setSelectedRecord(r);
    setEditForm({
      check_out_time: r.check_out_time || '',
      check_in_time: r.check_in_time || '',
      cleaning_time: r.cleaning_time || '',
      assigned_cleaner_id: r.assigned_cleaner_id || null,
      assigned_cleaner_name: r.assigned_cleaner_name || '',
      confirmed: r.confirmed || false,
      notes: r.notes || '',
      assigned_maintenance_id: r.assigned_maintenance_id || null,
      assigned_maintenance_name: r.assigned_maintenance_name || '',
      maintenance_note: r.maintenance_note || '',
    });
    setUseCustomMaint(!r.assigned_maintenance_id && !!r.assigned_maintenance_name);
    setEditModal(true);
  };

  const handleMaintSelect = (val) => {
    if (val === '_none') {
      setEditForm(f => ({ ...f, assigned_maintenance_id: null, assigned_maintenance_name: '' }));
      setUseCustomMaint(false);
    } else if (val === '_custom') {
      setEditForm(f => ({ ...f, assigned_maintenance_id: null, assigned_maintenance_name: '' }));
      setUseCustomMaint(true);
    } else {
      const p = maintenancePersonnel.find(p => p.id === val);
      setEditForm(f => ({ ...f, assigned_maintenance_id: val, assigned_maintenance_name: p?.name || '' }));
      setUseCustomMaint(false);
    }
  };

  const handleSave = async () => {
    if (!selectedRecord) return;
    setSaving(true);
    try {
      const payload = { ...editForm };
      if (payload.assigned_cleaner_id) {
        payload.assigned_cleaner_name = housekeepers.find(h => h.id === payload.assigned_cleaner_id)?.name || '';
      } else {
        payload.assigned_cleaner_id = null;
        payload.assigned_cleaner_name = '';
      }
      await updateCleaningRecord(selectedRecord.id, payload);
      setEditModal(false);
      onRefresh();
      toast.success('Updated');
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const modalUnit = selectedRecord ? unitMap[selectedRecord.unit_id] : null;
  const modalProp = selectedRecord ? propMap[selectedRecord.property_id] : null;
  const hasMaintAssigned = editForm.assigned_maintenance_id || editForm.assigned_maintenance_name;

  const anyMaint = records.some(r => r.assigned_maintenance_name);

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">
        Upcoming checkouts in the next 60 days. Click any row to edit details.
      </p>

      {records.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm border rounded bg-muted/20">
          No upcoming cleanings
        </div>
      ) : (
        <div className="rounded border border-border/60 overflow-hidden bg-white" data-testid="upcoming-cleanings-list">
          <table className="w-full text-sm" data-testid="upcoming-cleanings-table">
            <thead>
              <tr className="bg-[#f5f0eb] text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-border/50">
                <th className="px-3 py-2.5">Unit</th>
                <th className="px-3 py-2.5">Check-out</th>
                <th className="px-3 py-2.5">Check-in</th>
                <th className="px-3 py-2.5">Cleaning Time</th>
                <th className="px-3 py-2.5">Cleaner</th>
                {anyMaint && <th className="px-3 py-2.5">Maintenance</th>}
                <th className="px-3 py-2.5">Notes</th>
                <th className="px-3 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => {
                const u = unitMap[r.unit_id];
                const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-[#fafaf7]';

                return (
                  <tr
                    key={r.id}
                    className={`${rowBg} cursor-pointer hover:bg-[#f0ece6] transition-colors border-b border-border/30 last:border-b-0`}
                    onClick={() => openEdit(r)}
                    data-testid="cleaning-row"
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="font-semibold tabular-nums">{u?.unit_number || '?'}</span>
                      <span className="text-muted-foreground ml-1.5 text-xs">{r.tenant_name || ''}</span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {formatShortDate(r.check_out_date)}
                      {r.check_out_time && <span className="text-muted-foreground ml-1">{r.check_out_time}</span>}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {r.next_check_in_date ? formatShortDate(r.next_check_in_date) : '—'}
                      {r.check_in_time && <span className="text-muted-foreground ml-1">{r.check_in_time}</span>}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {r.cleaning_time || '—'}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {r.assigned_cleaner_name || '—'}
                    </td>
                    {anyMaint && (
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {r.assigned_maintenance_name ? (
                          <span className="inline-flex items-center gap-1 text-amber-700">
                            <Wrench className="h-3 w-3" />
                            {r.assigned_maintenance_name}
                            {r.maintenance_note && <span className="text-amber-500 text-xs">— {r.maintenance_note}</span>}
                          </span>
                        ) : '—'}
                      </td>
                    )}
                    <td className="px-3 py-2.5 max-w-[200px] truncate text-muted-foreground">
                      {r.notes || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <span className={`text-xs px-2 py-0.5 rounded border ${
                        r.confirmed
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`} data-testid="cleaning-status-badge">
                        {r.confirmed ? 'Done' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={editModal} onOpenChange={setEditModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {modalUnit ? `Unit ${modalUnit.unit_number}` : 'Cleaning Details'}
              {modalProp && (
                <span className="text-sm font-normal text-muted-foreground ml-2">— {modalProp.name}</span>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedRecord?.tenant_name}
              {selectedRecord?.check_out_date && ` · Checkout: ${formatShortDate(selectedRecord.check_out_date)}`}
              {selectedRecord?.next_check_in_date && ` → Check-in: ${formatShortDate(selectedRecord.next_check_in_date)}`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Checkout Time</Label>
                <Input
                  type="time"
                  value={editForm.check_out_time || ''}
                  onChange={e => setEditForm(f => ({ ...f, check_out_time: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Check-in Time</Label>
                <Input
                  type="time"
                  value={editForm.check_in_time || ''}
                  onChange={e => setEditForm(f => ({ ...f, check_in_time: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cleaning Time</Label>
                <Input
                  type="time"
                  value={editForm.cleaning_time || ''}
                  onChange={e => setEditForm(f => ({ ...f, cleaning_time: e.target.value }))}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Assigned Cleaner</Label>
              <Select
                value={editForm.assigned_cleaner_id || '_none'}
                onValueChange={v => setEditForm(f => ({ ...f, assigned_cleaner_id: v === '_none' ? null : v }))}
              >
                <SelectTrigger data-testid="hk-edit-cleaner-select">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Unassigned</SelectItem>
                  {housekeepers.map(h => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Assign Maintenance Person</Label>
              <Select
                value={useCustomMaint ? '_custom' : (editForm.assigned_maintenance_id || '_none')}
                onValueChange={handleMaintSelect}
              >
                <SelectTrigger data-testid="hk-edit-maintenance-select">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {maintenancePersonnel.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}{p.role ? ` — ${p.role}` : ''}
                    </SelectItem>
                  ))}
                  <SelectItem value="_custom">+ Custom person...</SelectItem>
                </SelectContent>
              </Select>
              {useCustomMaint && (
                <Input
                  className="mt-1 text-sm"
                  value={editForm.assigned_maintenance_name || ''}
                  placeholder="Enter maintenance person name"
                  onChange={e => setEditForm(f => ({ ...f, assigned_maintenance_name: e.target.value }))}
                  data-testid="hk-custom-maint-input"
                />
              )}
            </div>

            {hasMaintAssigned && (
              <div className="space-y-1">
                <Label>Maintenance Note</Label>
                <Input
                  value={editForm.maintenance_note || ''}
                  onChange={e => setEditForm(f => ({ ...f, maintenance_note: e.target.value }))}
                  placeholder="e.g. Check kitchen faucet"
                  data-testid="hk-maint-note-input"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes || ''}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                placeholder="Cleaning notes..."
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="hk-confirmed"
                checked={editForm.confirmed || false}
                onCheckedChange={v => setEditForm(f => ({ ...f, confirmed: v }))}
                data-testid="cleaning-confirmed-checkbox"
              />
              <Label htmlFor="hk-confirmed" className="cursor-pointer">Mark as Done</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="hk-edit-save-btn">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ========== HOUSEKEEPERS TAB ========== */
const emptyHkForm = { name: '', contact: '', availability: '', preference: '', pay: '', notes: '', is_archived: false };

function HousekeepersTab({ housekeepers, showArchived, setShowArchived, onRefresh }) {
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyHkForm });
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setEditing(null); setForm({ ...emptyHkForm }); setDialog(true); };
  const openEdit = (h) => {
    setEditing(h);
    setForm({
      name: h.name, contact: h.contact || '', availability: h.availability || '',
      preference: h.preference || '', pay: h.pay || '', notes: h.notes || '',
      is_archived: h.is_archived || false
    });
    setDialog(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      if (editing) { await updateHousekeeper(editing.id, form); toast.success('Updated'); }
      else { await createHousekeeper(form); toast.success('Created'); }
      setDialog(false);
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (h) => {
    try {
      await updateHousekeeper(h.id, { ...h, is_archived: !h.is_archived });
      toast.success(h.is_archived ? 'Restored' : 'Archived');
      onRefresh();
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete permanently?')) return;
    try { await deleteHousekeeper(id); toast.success('Deleted'); onRefresh(); }
    catch { toast.error('Failed'); }
  };

  const active = housekeepers.filter(h => !h.is_archived);
  const archived = housekeepers.filter(h => h.is_archived);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button
          size="sm"
          variant={showArchived ? 'secondary' : 'outline'}
          className="text-xs h-8"
          onClick={() => setShowArchived(!showArchived)}
        >
          <Archive className="h-3 w-3 mr-1" />{showArchived ? 'Hide' : 'Show'} Archived
        </Button>
        <Button onClick={openCreate} data-testid="hk-add-btn">
          <Plus className="h-4 w-4 mr-1" />Add Housekeeper
        </Button>
      </div>

      {active.length === 0 && !showArchived && (
        <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-muted/20">
          No housekeepers added yet
        </div>
      )}

      <div className="space-y-2" data-testid="housekeepers-list">
        {active.map((h, idx) => (
          <HousekeeperCard
            key={h.id} housekeeper={h} idx={idx}
            onEdit={() => openEdit(h)}
            onArchive={() => handleArchive(h)}
            onDelete={() => handleDelete(h.id)}
          />
        ))}
        {showArchived && archived.length > 0 && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2 pb-1 px-1">Archived</p>
            {archived.map((h, idx) => (
              <HousekeeperCard
                key={h.id} housekeeper={h} idx={idx} isArchived
                onEdit={() => openEdit(h)}
                onArchive={() => handleArchive(h)}
                onDelete={() => handleDelete(h.id)}
              />
            ))}
          </>
        )}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Housekeeper' : 'Add Housekeeper'}</DialogTitle>
            <DialogDescription>Enter housekeeper details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="hk-name-input" />
              </div>
              <div className="space-y-1">
                <Label>Contact</Label>
                <Input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Availability</Label>
                <Input value={form.availability} onChange={e => setForm({ ...form, availability: e.target.value })} placeholder="e.g. Mon-Fri" />
              </div>
              <div className="space-y-1">
                <Label>Preference</Label>
                <Input value={form.preference} onChange={e => setForm({ ...form, preference: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Pay</Label>
              <Input value={form.pay} onChange={e => setForm({ ...form, pay: e.target.value })} placeholder="e.g. $100/cleaning" />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="hk-save-btn">
              {saving ? 'Saving...' : editing ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HousekeeperCard({ housekeeper: h, idx, isArchived, onEdit, onArchive, onDelete }) {
  return (
    <div
      className={`group border rounded-xl px-4 py-3.5 ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'} ${isArchived ? 'opacity-60' : ''} hover:shadow-sm transition-shadow`}
      data-testid="housekeeper-row"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{h.name}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
            {h.contact && <span className="text-xs text-muted-foreground">{h.contact}</span>}
            {h.availability && <span className="text-xs text-muted-foreground">Avail: {h.availability}</span>}
            {h.pay && <span className="text-xs text-muted-foreground">Pay: {h.pay}</span>}
            {h.preference && <span className="text-xs text-muted-foreground">Pref: {h.preference}</span>}
          </div>
          {h.notes && <p className="text-xs text-muted-foreground mt-1">{h.notes}</p>}
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onArchive}>
            <Archive className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ========== HOUSEKEEPING LEADS TAB ========== */
const emptyLeadForm = {
  name: '', contact: '', notes: '', call_time: '',
  interview_pay: '', trial: '', additional_notes: '', is_archived: false
};

function HousekeepingLeadsTab({ leads, showArchived, setShowArchived, onRefresh }) {
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyLeadForm });
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setEditing(null); setForm({ ...emptyLeadForm }); setDialog(true); };
  const openEdit = (l) => {
    setEditing(l);
    setForm({
      name: l.name, contact: l.contact || '', notes: l.notes || '',
      call_time: l.call_time || '', interview_pay: l.interview_pay || '',
      trial: l.trial || '', additional_notes: l.additional_notes || '',
      is_archived: l.is_archived || false
    });
    setDialog(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      if (editing) { await updateHousekeepingLead(editing.id, form); toast.success('Updated'); }
      else { await createHousekeepingLead(form); toast.success('Created'); }
      setDialog(false);
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (l) => {
    try {
      await updateHousekeepingLead(l.id, { ...l, is_archived: !l.is_archived });
      toast.success(l.is_archived ? 'Restored' : 'Archived');
      onRefresh();
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete permanently?')) return;
    try { await deleteHousekeepingLead(id); toast.success('Deleted'); onRefresh(); }
    catch { toast.error('Failed'); }
  };

  const active = leads.filter(l => !l.is_archived);
  const archived = leads.filter(l => l.is_archived);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button
          size="sm"
          variant={showArchived ? 'secondary' : 'outline'}
          className="text-xs h-8"
          onClick={() => setShowArchived(!showArchived)}
        >
          <Archive className="h-3 w-3 mr-1" />{showArchived ? 'Hide' : 'Show'} Archived
        </Button>
        <Button onClick={openCreate} data-testid="hk-lead-add-btn">
          <Plus className="h-4 w-4 mr-1" />Add Lead
        </Button>
      </div>

      {active.length === 0 && !showArchived && (
        <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-muted/20">
          No housekeeping leads added
        </div>
      )}

      <div className="space-y-2" data-testid="hk-leads-list">
        {active.map((l, idx) => (
          <LeadCard
            key={l.id} lead={l} idx={idx}
            onEdit={() => openEdit(l)}
            onArchive={() => handleArchive(l)}
            onDelete={() => handleDelete(l.id)}
          />
        ))}
        {showArchived && archived.length > 0 && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2 pb-1 px-1">Archived</p>
            {archived.map((l, idx) => (
              <LeadCard
                key={l.id} lead={l} idx={idx} isArchived
                onEdit={() => openEdit(l)}
                onArchive={() => handleArchive(l)}
                onDelete={() => handleDelete(l.id)}
              />
            ))}
          </>
        )}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Housekeeping Lead' : 'Add Housekeeping Lead'}</DialogTitle>
            <DialogDescription>Enter lead details for potential housekeepers.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="hk-lead-name-input" />
              </div>
              <div className="space-y-1">
                <Label>Contact</Label>
                <Input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Call Time</Label>
                <Input value={form.call_time} onChange={e => setForm({ ...form, call_time: e.target.value })} placeholder="e.g. 2pm" />
              </div>
              <div className="space-y-1">
                <Label>Interview Pay</Label>
                <Input value={form.interview_pay} onChange={e => setForm({ ...form, interview_pay: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Trial</Label>
              <Input value={form.trial} onChange={e => setForm({ ...form, trial: e.target.value })} placeholder="e.g. Trial cleaning scheduled 3/15" />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1">
              <Label>Additional Notes</Label>
              <Textarea value={form.additional_notes} onChange={e => setForm({ ...form, additional_notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="hk-lead-save-btn">
              {saving ? 'Saving...' : editing ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LeadCard({ lead: l, idx, isArchived, onEdit, onArchive, onDelete }) {
  return (
    <div
      className={`group border rounded-xl px-4 py-3.5 ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'} ${isArchived ? 'opacity-60' : ''} hover:shadow-sm transition-shadow`}
      data-testid="hk-lead-row"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{l.name}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
            {l.contact && <span className="text-xs text-muted-foreground">{l.contact}</span>}
            {l.call_time && <span className="text-xs text-muted-foreground">Call: {l.call_time}</span>}
            {l.interview_pay && <span className="text-xs text-muted-foreground">Pay: {l.interview_pay}</span>}
            {l.trial && <span className="text-xs text-muted-foreground">Trial: {l.trial}</span>}
          </div>
          {l.notes && <p className="text-xs text-muted-foreground mt-1">{l.notes}</p>}
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onArchive}>
            <Archive className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
