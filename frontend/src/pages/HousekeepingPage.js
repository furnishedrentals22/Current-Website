import { useState, useEffect, useCallback } from 'react';
import {
  getCleaningRecords, updateCleaningRecord,
  getHousekeepers, createHousekeeper, updateHousekeeper, deleteHousekeeper,
  getHousekeepingLeads, createHousekeepingLead, updateHousekeepingLead, deleteHousekeepingLead,
  getProperties, getUnits, getMaintenancePersonnel,
  getManualCleanings, createManualCleaning, updateManualCleaning, deleteManualCleaning
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Archive, Wrench, Search } from 'lucide-react';
import { toast } from 'sonner';
import { formatShortDate } from '@/components/housekeeping/housekeepingUtils';
import { CleaningEditDialog } from '@/components/housekeeping/CleaningEditDialog';
import { ManualCleaningDialog } from '@/components/housekeeping/ManualCleaningDialog';

export default function HousekeepingPage() {
  const [records, setRecords] = useState([]);
  const [manualCleanings, setManualCleanings] = useState([]);
  const [housekeepers, setHousekeepers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [maintenancePersonnel, setMaintenancePersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [r, mc, hk, hl, p, u, mp] = await Promise.all([
        getCleaningRecords(),
        getManualCleanings(),
        getHousekeepers({ include_archived: showArchived }),
        getHousekeepingLeads({ include_archived: showArchived }),
        getProperties(),
        getUnits(),
        getMaintenancePersonnel()
      ]);
      setRecords(r);
      setManualCleanings(mc);
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
            manualCleanings={manualCleanings}
            housekeepers={housekeepers.filter(h => !h.is_archived)}
            maintenancePersonnel={maintenancePersonnel}
            unitMap={unitMap}
            propMap={propMap}
            units={units}
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
function UpcomingCleaningsTab({ records, manualCleanings, housekeepers, maintenancePersonnel, unitMap, propMap, units, onRefresh }) {
  const [editModal, setEditModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [isEditingManual, setIsEditingManual] = useState(false);

  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    unit_id: '', tenant_name: '', check_out_date: '', next_check_in_date: '',
    check_out_time: '', check_in_time: '', cleaning_time: '',
    assigned_cleaner_id: null, assigned_cleaner_name: '',
    assigned_maintenance_id: null, assigned_maintenance_name: '',
    maintenance_note: '', notes: '', confirmed: false,
  });
  const [creating, setCreating] = useState(false);

  // Filters
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Merge regular + manual cleanings, sorted chronologically
  const mergedRecords = [
    ...records.map(r => ({ ...r, _isManual: false })),
    ...manualCleanings.map(mc => ({ ...mc, _isManual: true, check_out_date: mc.check_out_date || '' })),
  ].sort((a, b) => (a.check_out_date || '').localeCompare(b.check_out_date || ''));

  // Apply filters
  const filteredRecords = mergedRecords.filter(r => {
    if (filterFrom && r.check_out_date && r.check_out_date < filterFrom) return false;
    if (filterTo && r.check_out_date && r.check_out_date > filterTo) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const u = unitMap[r.unit_id];
      const propName = propMap[u?.property_id]?.name || '';
      const text = `${propName} ${u?.unit_number || ''} ${r.tenant_name || ''} ${r.assigned_cleaner_name || ''} ${r.notes || ''}`.toLowerCase();
      if (!text.includes(term)) return false;
    }
    return true;
  });

  const openEdit = (r) => {
    setSelectedRecord(r);
    setIsEditingManual(!!r._isManual);
    setEditForm({
      unit_id: r.unit_id || '',
      tenant_name: r.tenant_name || '',
      check_out_date: r.check_out_date || '',
      next_check_in_date: r.next_check_in_date || '',
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
    setEditModal(true);
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
      if (isEditingManual) {
        const u = unitMap[payload.unit_id];
        payload.unit_label = u ? u.unit_number : '';
        await updateManualCleaning(selectedRecord.id, payload);
      } else {
        await updateCleaningRecord(selectedRecord.id, payload);
      }
      setEditModal(false);
      onRefresh();
      toast.success('Updated');
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.unit_id) { toast.error('Please select a unit'); return; }
    if (!createForm.check_out_date) { toast.error('Please select a date'); return; }
    setCreating(true);
    try {
      const payload = { ...createForm };
      if (payload.assigned_cleaner_id) {
        payload.assigned_cleaner_name = housekeepers.find(h => h.id === payload.assigned_cleaner_id)?.name || '';
      } else {
        payload.assigned_cleaner_id = null;
        payload.assigned_cleaner_name = '';
      }
      const u = unitMap[payload.unit_id];
      payload.unit_label = u ? u.unit_number : '';
      await createManualCleaning(payload);
      setCreateModal(false);
      setCreateForm({
        unit_id: '', tenant_name: '', check_out_date: '', next_check_in_date: '',
        check_out_time: '', check_in_time: '', cleaning_time: '',
        assigned_cleaner_id: null, assigned_cleaner_name: '',
        assigned_maintenance_id: null, assigned_maintenance_name: '',
        maintenance_note: '', notes: '', confirmed: false,
      });
      onRefresh();
      toast.success('Manual cleaning created');
    } catch {
      toast.error('Failed to create');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteManual = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this manual cleaning?')) return;
    try { await deleteManualCleaning(id); onRefresh(); toast.success('Deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  const anyMaint = filteredRecords.some(r => r.assigned_maintenance_name);

  return (
    <div>
      {/* Filters and actions */}
      <div className="flex items-end gap-3 mb-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-2">
            Upcoming checkouts in the next 60 days. Click any row to edit details.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={filterFrom}
                onChange={e => setFilterFrom(e.target.value)}
                className="h-8 w-36 text-xs"
                data-testid="cleaning-filter-from"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={filterTo}
                onChange={e => setFilterTo(e.target.value)}
                className="h-8 w-36 text-xs"
                data-testid="cleaning-filter-to"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-8 w-52 text-xs pl-8"
                placeholder="Search unit, cleaner, notes..."
                data-testid="cleaning-search-input"
              />
            </div>
            {(filterFrom || filterTo || searchTerm) && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFilterFrom(''); setFilterTo(''); setSearchTerm(''); }}>
                Clear
              </Button>
            )}
          </div>
        </div>
        <Button size="sm" onClick={() => setCreateModal(true)} data-testid="add-manual-cleaning-btn">
          <Plus className="h-4 w-4 mr-1" />Add Manual Cleaning
        </Button>
      </div>

      {filteredRecords.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm border rounded bg-muted/20">
          {mergedRecords.length === 0 ? 'No upcoming cleanings' : 'No cleanings match your filters'}
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
              {filteredRecords.map((r, idx) => {
                const u = unitMap[r.unit_id];
                const isManual = r._isManual;
                const rowBg = isManual ? 'bg-red-50' : idx % 2 === 0 ? 'bg-white' : 'bg-[#fafaf7]';
                return (
                  <tr
                    key={r.id}
                    className={`${rowBg} cursor-pointer hover:bg-[#f0ece6] transition-colors border-b border-border/30 last:border-b-0`}
                    onClick={() => openEdit(r)}
                    data-testid={isManual ? 'manual-cleaning-row' : 'cleaning-row'}
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {(() => {
                        const prop = propMap[u?.property_id];
                        const propName = prop?.name || '';
                        const unitNum = u?.unit_number || r.unit_label || '?';
                        return <span className="font-semibold tabular-nums">{propName ? `${propName} Apt ${unitNum}` : unitNum}</span>;
                      })()}
                      <span className="text-muted-foreground ml-1.5 text-xs">{r.tenant_name || ''}</span>
                      {isManual && (
                        <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-red-600 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded" data-testid="manual-label">Manual</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {formatShortDate(r.check_out_date)}
                      {r.check_out_time && <span className="text-muted-foreground ml-1">{r.check_out_time}</span>}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {r.next_check_in_date ? formatShortDate(r.next_check_in_date) : '\u2014'}
                      {r.check_in_time && <span className="text-muted-foreground ml-1">{r.check_in_time}</span>}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{r.cleaning_time || '\u2014'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{r.assigned_cleaner_name || '\u2014'}</td>
                    {anyMaint && (
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {r.assigned_maintenance_name ? (
                          <span className="inline-flex items-center gap-1 text-amber-700">
                            <Wrench className="h-3 w-3" />
                            {r.assigned_maintenance_name}
                            {r.maintenance_note && <span className="text-amber-500 text-xs">{'\u2014'} {r.maintenance_note}</span>}
                          </span>
                        ) : '\u2014'}
                      </td>
                    )}
                    <td className="px-3 py-2.5 max-w-[200px] truncate text-muted-foreground">{r.notes || '\u2014'}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded border ${
                          r.confirmed
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-50 text-gray-500 border-gray-200'
                        }`} data-testid="cleaning-status-badge">
                          {r.confirmed ? 'Done' : 'Pending'}
                        </span>
                        {isManual && (
                          <button
                            onClick={(e) => handleDeleteManual(e, r.id)}
                            className="p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
                            data-testid="delete-manual-cleaning-btn"
                            title="Delete manual cleaning"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CleaningEditDialog
        open={editModal}
        onOpenChange={setEditModal}
        record={selectedRecord}
        isManual={isEditingManual}
        form={editForm}
        setForm={setEditForm}
        housekeepers={housekeepers}
        maintenancePersonnel={maintenancePersonnel}
        units={units}
        unitMap={unitMap}
        propMap={propMap}
        onSave={handleSave}
        saving={saving}
      />

      <ManualCleaningDialog
        open={createModal}
        onOpenChange={setCreateModal}
        form={createForm}
        setForm={setCreateForm}
        housekeepers={housekeepers}
        maintenancePersonnel={maintenancePersonnel}
        units={units}
        onSave={handleCreate}
        saving={creating}
      />
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
        <Button size="sm" variant={showArchived ? 'secondary' : 'outline'} className="text-xs h-8" onClick={() => setShowArchived(!showArchived)}>
          <Archive className="h-3 w-3 mr-1" />{showArchived ? 'Hide' : 'Show'} Archived
        </Button>
        <Button onClick={openCreate} data-testid="hk-add-btn">
          <Plus className="h-4 w-4 mr-1" />Add Housekeeper
        </Button>
      </div>

      {active.length === 0 && !showArchived && (
        <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-muted/20">No housekeepers added yet</div>
      )}

      <div className="space-y-2" data-testid="housekeepers-list">
        {active.map((h, idx) => (
          <HousekeeperCard key={h.id} housekeeper={h} idx={idx} onEdit={() => openEdit(h)} onArchive={() => handleArchive(h)} onDelete={() => handleDelete(h.id)} />
        ))}
        {showArchived && archived.length > 0 && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2 pb-1 px-1">Archived</p>
            {archived.map((h, idx) => (
              <HousekeeperCard key={h.id} housekeeper={h} idx={idx} isArchived onEdit={() => openEdit(h)} onArchive={() => handleArchive(h)} onDelete={() => handleDelete(h.id)} />
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
              <div className="space-y-1"><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="hk-name-input" /></div>
              <div className="space-y-1"><Label>Contact</Label><Input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Availability</Label><Input value={form.availability} onChange={e => setForm({ ...form, availability: e.target.value })} placeholder="e.g. Mon-Fri" /></div>
              <div className="space-y-1"><Label>Preference</Label><Input value={form.preference} onChange={e => setForm({ ...form, preference: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>Pay</Label><Input value={form.pay} onChange={e => setForm({ ...form, pay: e.target.value })} placeholder="e.g. $100/cleaning" /></div>
            <div className="space-y-1"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="hk-save-btn">{saving ? 'Saving...' : editing ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HousekeeperCard({ housekeeper: h, idx, isArchived, onEdit, onArchive, onDelete }) {
  return (
    <div className={`group border rounded-xl px-4 py-3.5 ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'} ${isArchived ? 'opacity-60' : ''} hover:shadow-sm transition-shadow`} data-testid="housekeeper-row">
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
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onArchive}><Archive className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
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
        <Button size="sm" variant={showArchived ? 'secondary' : 'outline'} className="text-xs h-8" onClick={() => setShowArchived(!showArchived)}>
          <Archive className="h-3 w-3 mr-1" />{showArchived ? 'Hide' : 'Show'} Archived
        </Button>
        <Button onClick={openCreate} data-testid="hk-lead-add-btn">
          <Plus className="h-4 w-4 mr-1" />Add Lead
        </Button>
      </div>

      {active.length === 0 && !showArchived && (
        <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-muted/20">No housekeeping leads added</div>
      )}

      <div className="space-y-2" data-testid="hk-leads-list">
        {active.map((l, idx) => (
          <LeadCard key={l.id} lead={l} idx={idx} onEdit={() => openEdit(l)} onArchive={() => handleArchive(l)} onDelete={() => handleDelete(l.id)} />
        ))}
        {showArchived && archived.length > 0 && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2 pb-1 px-1">Archived</p>
            {archived.map((l, idx) => (
              <LeadCard key={l.id} lead={l} idx={idx} isArchived onEdit={() => openEdit(l)} onArchive={() => handleArchive(l)} onDelete={() => handleDelete(l.id)} />
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
              <div className="space-y-1"><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="hk-lead-name-input" /></div>
              <div className="space-y-1"><Label>Contact</Label><Input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Call Time</Label><Input value={form.call_time} onChange={e => setForm({ ...form, call_time: e.target.value })} placeholder="e.g. 2pm" /></div>
              <div className="space-y-1"><Label>Interview Pay</Label><Input value={form.interview_pay} onChange={e => setForm({ ...form, interview_pay: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>Trial</Label><Input value={form.trial} onChange={e => setForm({ ...form, trial: e.target.value })} placeholder="e.g. Trial cleaning scheduled 3/15" /></div>
            <div className="space-y-1"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <div className="space-y-1"><Label>Additional Notes</Label><Textarea value={form.additional_notes} onChange={e => setForm({ ...form, additional_notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="hk-lead-save-btn">{saving ? 'Saving...' : editing ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LeadCard({ lead: l, idx, isArchived, onEdit, onArchive, onDelete }) {
  return (
    <div className={`group border rounded-xl px-4 py-3.5 ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'} ${isArchived ? 'opacity-60' : ''} hover:shadow-sm transition-shadow`} data-testid="hk-lead-row">
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
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onArchive}><Archive className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    </div>
  );
}
