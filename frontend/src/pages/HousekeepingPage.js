import { useState, useEffect, useCallback } from 'react';
import {
  getCleaningRecords, updateCleaningRecord,
  getHousekeepers, createHousekeeper, updateHousekeeper, deleteHousekeeper,
  getHousekeepingLeads, createHousekeepingLead, updateHousekeepingLead, deleteHousekeepingLead,
  getProperties, getUnits
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Brush, Plus, Pencil, Trash2, Archive, UserSearch } from 'lucide-react';
import { toast } from 'sonner';

export default function HousekeepingPage() {
  const [records, setRecords] = useState([]);
  const [housekeepers, setHousekeepers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [r, hk, hl, p, u] = await Promise.all([
        getCleaningRecords(), getHousekeepers({ include_archived: showArchived }),
        getHousekeepingLeads({ include_archived: showArchived }), getProperties(), getUnits()
      ]);
      setRecords(r); setHousekeepers(hk); setLeads(hl); setProperties(p); setUnits(u);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, [showArchived]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const unitMap = {};
  units.forEach(u => { unitMap[u.id] = u; });
  const propMap = {};
  properties.forEach(p => { propMap[p.id] = p; });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight" data-testid="housekeeping-page-title">Housekeeping</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage cleanings, housekeepers, and leads</p>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList data-testid="housekeeping-tabs">
          <TabsTrigger value="upcoming" data-testid="hk-tab-upcoming">Upcoming Cleanings</TabsTrigger>
          <TabsTrigger value="housekeepers" data-testid="hk-tab-housekeepers">Current Housekeepers</TabsTrigger>
          <TabsTrigger value="leads" data-testid="hk-tab-leads">Housekeeping Leads</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          <UpcomingCleaningsTab records={records} housekeepers={housekeepers.filter(h => !h.is_archived)}
            unitMap={unitMap} propMap={propMap} onRefresh={fetchData} />
        </TabsContent>

        <TabsContent value="housekeepers" className="mt-4">
          <HousekeepersTab housekeepers={housekeepers} showArchived={showArchived}
            setShowArchived={setShowArchived} onRefresh={fetchData} />
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          <HousekeepingLeadsTab leads={leads} showArchived={showArchived}
            setShowArchived={setShowArchived} onRefresh={fetchData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ========== UPCOMING CLEANINGS TAB ========== */
function UpcomingCleaningsTab({ records, housekeepers, unitMap, propMap, onRefresh }) {
  const [saving, setSaving] = useState({});

  const handleFieldChange = async (id, field, value) => {
    const rec = records.find(r => r.id === id);
    if (!rec) return;
    setSaving(s => ({ ...s, [id]: true }));
    try {
      await updateCleaningRecord(id, {
        check_in_time: rec.check_in_time || '',
        check_out_time: rec.check_out_time || '',
        cleaning_time: rec.cleaning_time || '',
        assigned_cleaner_id: rec.assigned_cleaner_id || null,
        assigned_cleaner_name: rec.assigned_cleaner_name || '',
        confirmed: rec.confirmed || false,
        notes: rec.notes || '',
        [field]: value,
        ...(field === 'assigned_cleaner_id' ? { assigned_cleaner_name: housekeepers.find(h => h.id === value)?.name || '' } : {}),
      });
      onRefresh();
    } catch { toast.error('Failed to update'); }
    finally { setSaving(s => ({ ...s, [id]: false })); }
  };

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">Showing checkouts in the next 60 days. Times and assignments are editable inline.</p>
      <div className="border rounded-lg overflow-x-auto" data-testid="upcoming-cleanings-table">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-[10px] font-semibold uppercase min-w-[90px]">Unit</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase min-w-[90px]">Check Out</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase min-w-[80px]">Out Time</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase min-w-[100px]">Next Check In</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase min-w-[80px]">In Time</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase min-w-[80px]">Clean Time</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase min-w-[130px]">Assigned Cleaner</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase min-w-[60px]">Done</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase min-w-[120px]">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">No upcoming cleanings</TableCell></TableRow>
            ) : records.map(r => {
              const unit = unitMap[r.unit_id];
              const prop = propMap[r.property_id];
              return (
                <TableRow key={r.id} className={`${r.confirmed ? 'bg-emerald-50/50' : ''}`} data-testid="cleaning-record-row">
                  <TableCell className="text-xs font-medium">
                    {prop?.name ? <span className="text-muted-foreground">{prop.name} </span> : null}
                    U{unit?.unit_number || '?'}
                    <br /><span className="text-[10px] text-muted-foreground">{r.tenant_name}</span>
                  </TableCell>
                  <TableCell className="text-xs tabular-nums font-medium">{r.check_out_date}</TableCell>
                  <TableCell>
                    <Input type="time" defaultValue={r.check_out_time || ''} className="h-7 text-xs w-20 px-1"
                      onBlur={e => { if (e.target.value !== (r.check_out_time || '')) handleFieldChange(r.id, 'check_out_time', e.target.value); }} />
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {r.next_check_in_date ? (
                      <div>
                        <span className="font-medium text-emerald-700">{r.next_check_in_date}</span>
                        <br /><span className="text-[10px] text-muted-foreground">{r.next_check_in_tenant_name}</span>
                      </div>
                    ) : <span className="text-muted-foreground italic">None</span>}
                  </TableCell>
                  <TableCell>
                    <Input type="time" defaultValue={r.check_in_time || ''} className="h-7 text-xs w-20 px-1"
                      onBlur={e => { if (e.target.value !== (r.check_in_time || '')) handleFieldChange(r.id, 'check_in_time', e.target.value); }} />
                  </TableCell>
                  <TableCell>
                    <Input type="time" defaultValue={r.cleaning_time || ''} className="h-7 text-xs w-20 px-1"
                      onBlur={e => { if (e.target.value !== (r.cleaning_time || '')) handleFieldChange(r.id, 'cleaning_time', e.target.value); }} />
                  </TableCell>
                  <TableCell>
                    <Select value={r.assigned_cleaner_id || '_none'} onValueChange={v => handleFieldChange(r.id, 'assigned_cleaner_id', v === '_none' ? null : v)}>
                      <SelectTrigger className="h-7 text-xs w-28 px-1"><SelectValue placeholder="Assign" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Unassigned</SelectItem>
                        {housekeepers.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox checked={r.confirmed || false} onCheckedChange={v => handleFieldChange(r.id, 'confirmed', v)}
                      className="h-4 w-4" data-testid="cleaning-confirmed-checkbox" />
                  </TableCell>
                  <TableCell>
                    <Input defaultValue={r.notes || ''} className="h-7 text-xs w-28 px-1" placeholder="Notes"
                      onBlur={e => { if (e.target.value !== (r.notes || '')) handleFieldChange(r.id, 'notes', e.target.value); }} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ========== HOUSEKEEPERS TAB ========== */
const emptyHkForm = { name: '', contact: '', availability: '', preference: '', pay: '', notes: '', is_archived: false };

function HousekeepersTab({ housekeepers, showArchived, setShowArchived, onRefresh }) {
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyHkForm);
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setEditing(null); setForm({ ...emptyHkForm }); setDialog(true); };
  const openEdit = (h) => {
    setEditing(h);
    setForm({ name: h.name, contact: h.contact || '', availability: h.availability || '',
      preference: h.preference || '', pay: h.pay || '', notes: h.notes || '', is_archived: h.is_archived || false });
    setDialog(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      if (editing) { await updateHousekeeper(editing.id, form); toast.success('Updated'); }
      else { await createHousekeeper(form); toast.success('Created'); }
      setDialog(false); onRefresh();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleArchive = async (h) => {
    try { await updateHousekeeper(h.id, { ...h, is_archived: !h.is_archived }); toast.success(h.is_archived ? 'Restored' : 'Archived'); onRefresh(); }
    catch { toast.error('Failed'); }
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
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant={showArchived ? 'secondary' : 'outline'} className="text-xs h-7" onClick={() => setShowArchived(!showArchived)}>
            <Archive className="h-3 w-3 mr-1" />{showArchived ? 'Hide' : 'Show'} Archived
          </Button>
        </div>
        <Button onClick={openCreate} data-testid="hk-add-btn"><Plus className="h-4 w-4 mr-1" />Add Housekeeper</Button>
      </div>

      <div className="border rounded-lg overflow-hidden" data-testid="housekeepers-table">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-[10px] font-semibold uppercase">Name</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase">Contact</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase">Availability</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase">Preference</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase">Pay</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase">Notes</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.length === 0 && !showArchived ? (
              <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">No housekeepers added</TableCell></TableRow>
            ) : null}
            {active.map(h => (
              <TableRow key={h.id} className="hover:bg-muted/30" data-testid="housekeeper-row">
                <TableCell className="text-xs font-medium">{h.name}</TableCell>
                <TableCell className="text-xs">{h.contact || '-'}</TableCell>
                <TableCell className="text-xs">{h.availability || '-'}</TableCell>
                <TableCell className="text-xs">{h.preference || '-'}</TableCell>
                <TableCell className="text-xs">{h.pay || '-'}</TableCell>
                <TableCell className="text-xs max-w-[150px] truncate">{h.notes || '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEdit(h)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleArchive(h)}><Archive className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDelete(h.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {showArchived && archived.length > 0 && (
              <>
                <TableRow><TableCell colSpan={7} className="text-[10px] font-semibold uppercase bg-muted/30 py-1 px-3">Archived</TableCell></TableRow>
                {archived.map(h => (
                  <TableRow key={h.id} className="bg-stone-50/50 opacity-70" data-testid="housekeeper-archived-row">
                    <TableCell className="text-xs">{h.name}</TableCell>
                    <TableCell className="text-xs">{h.contact || '-'}</TableCell>
                    <TableCell className="text-xs">{h.availability || '-'}</TableCell>
                    <TableCell className="text-xs">{h.preference || '-'}</TableCell>
                    <TableCell className="text-xs">{h.pay || '-'}</TableCell>
                    <TableCell className="text-xs">{h.notes || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleArchive(h)} title="Restore"><Archive className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDelete(h.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </>
            )}
          </TableBody>
        </Table>
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

/* ========== HOUSEKEEPING LEADS TAB ========== */
const emptyLeadForm = { name: '', contact: '', notes: '', call_time: '', interview_pay: '', trial: '', additional_notes: '', is_archived: false };

function HousekeepingLeadsTab({ leads, showArchived, setShowArchived, onRefresh }) {
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyLeadForm);
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setEditing(null); setForm({ ...emptyLeadForm }); setDialog(true); };
  const openEdit = (l) => {
    setEditing(l);
    setForm({ name: l.name, contact: l.contact || '', notes: l.notes || '', call_time: l.call_time || '',
      interview_pay: l.interview_pay || '', trial: l.trial || '', additional_notes: l.additional_notes || '', is_archived: l.is_archived || false });
    setDialog(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      if (editing) { await updateHousekeepingLead(editing.id, form); toast.success('Updated'); }
      else { await createHousekeepingLead(form); toast.success('Created'); }
      setDialog(false); onRefresh();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleArchive = async (l) => {
    try { await updateHousekeepingLead(l.id, { ...l, is_archived: !l.is_archived }); toast.success(l.is_archived ? 'Restored' : 'Archived'); onRefresh(); }
    catch { toast.error('Failed'); }
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
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant={showArchived ? 'secondary' : 'outline'} className="text-xs h-7" onClick={() => setShowArchived(!showArchived)}>
            <Archive className="h-3 w-3 mr-1" />{showArchived ? 'Hide' : 'Show'} Archived
          </Button>
        </div>
        <Button onClick={openCreate} data-testid="hk-lead-add-btn"><Plus className="h-4 w-4 mr-1" />Add Lead</Button>
      </div>

      <div className="border rounded-lg overflow-hidden" data-testid="hk-leads-table">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-[10px] font-semibold uppercase">Name</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase">Contact</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase">Call Time</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase">Interview Pay</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase">Trial</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase">Notes</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.length === 0 && !showArchived ? (
              <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">No housekeeping leads</TableCell></TableRow>
            ) : null}
            {active.map(l => (
              <TableRow key={l.id} className="hover:bg-muted/30" data-testid="hk-lead-row">
                <TableCell className="text-xs font-medium">{l.name}</TableCell>
                <TableCell className="text-xs">{l.contact || '-'}</TableCell>
                <TableCell className="text-xs">{l.call_time || '-'}</TableCell>
                <TableCell className="text-xs">{l.interview_pay || '-'}</TableCell>
                <TableCell className="text-xs">{l.trial || '-'}</TableCell>
                <TableCell className="text-xs max-w-[150px] truncate">{l.notes || '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEdit(l)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleArchive(l)}><Archive className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDelete(l.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {showArchived && archived.length > 0 && (
              <>
                <TableRow><TableCell colSpan={7} className="text-[10px] font-semibold uppercase bg-muted/30 py-1 px-3">Archived</TableCell></TableRow>
                {archived.map(l => (
                  <TableRow key={l.id} className="bg-stone-50/50 opacity-70" data-testid="hk-lead-archived-row">
                    <TableCell className="text-xs">{l.name}</TableCell>
                    <TableCell className="text-xs">{l.contact || '-'}</TableCell>
                    <TableCell className="text-xs">{l.call_time || '-'}</TableCell>
                    <TableCell className="text-xs">{l.interview_pay || '-'}</TableCell>
                    <TableCell className="text-xs">{l.trial || '-'}</TableCell>
                    <TableCell className="text-xs">{l.notes || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleArchive(l)}><Archive className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDelete(l.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </>
            )}
          </TableBody>
        </Table>
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
