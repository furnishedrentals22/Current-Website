import { useState, useEffect, useCallback } from 'react';
import {
  getMaintenanceRequests, createMaintenanceRequest, updateMaintenanceRequest, deleteMaintenanceRequest,
  getMaintenancePersonnel, createMaintenancePersonnel, updateMaintenancePersonnel, deleteMaintenancePersonnel,
  getProperties, getUnits
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Wrench, Plus, Pencil, Trash2, Archive, ChevronDown, X, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS = {
  gray:   { dot: 'bg-gray-400',    badge: 'bg-gray-100 text-gray-700 border border-gray-200' },
  yellow: { dot: 'bg-yellow-400',  badge: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  red:    { dot: 'bg-red-400',     badge: 'bg-red-50 text-red-700 border border-red-200' },
  green:  { dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
};

const COLOR_OPTIONS = [
  { value: 'gray',   label: 'Gray',   cls: 'bg-gray-400' },
  { value: 'yellow', label: 'Yellow', cls: 'bg-yellow-400' },
  { value: 'red',    label: 'Red',    cls: 'bg-red-400' },
  { value: 'green',  label: 'Green',  cls: 'bg-emerald-400' },
];

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const groupByMonth = (reqs) => {
  const groups = {};
  [...reqs]
    .sort((a, b) => ((b.completed_at || b.created_at || '') > (a.completed_at || a.created_at || '') ? 1 : -1))
    .forEach(r => {
      const d = new Date(r.completed_at || r.created_at || Date.now());
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = { label, reqs: [] };
      groups[key].reqs.push(r);
    });
  return Object.entries(groups)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, v]) => v);
};

const emptyReqForm = {
  property_id: '', unit_id: '', title: '', description: '', status: 'Pending',
  status_color: 'gray', access_info: '', assigned_personnel: [], notes: '',
  is_completed: false, completed_at: null
};

export default function MaintenancePage() {
  const [requests, setRequests] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [reqs, pers, props, u] = await Promise.all([
        getMaintenanceRequests({ include_completed: true }),
        getMaintenancePersonnel({ include_archived: true }),
        getProperties(),
        getUnits()
      ]);
      setRequests(reqs);
      setPersonnel(pers);
      setProperties(props);
      setUnits(u);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="py-12 text-center text-muted-foreground text-sm">Loading...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight" data-testid="maintenance-page-title">
          Maintenance
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Manage maintenance requests and personnel</p>
      </div>

      <Tabs defaultValue="requests">
        <TabsList data-testid="maintenance-tabs">
          <TabsTrigger value="requests" data-testid="mt-tab-requests">Upcoming Maintenance Requests</TabsTrigger>
          <TabsTrigger value="personnel" data-testid="mt-tab-personnel">Maintenance Personnel</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4">
          <RequestsTab
            requests={requests}
            personnel={personnel.filter(p => !p.is_archived)}
            properties={properties}
            units={units}
            onRefresh={fetchData}
          />
        </TabsContent>

        <TabsContent value="personnel" className="mt-4">
          <PersonnelTab personnel={personnel} onRefresh={fetchData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ========== REQUESTS TAB ========== */
function RequestsTab({ requests, personnel, properties, units, onRefresh }) {
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyReqForm });
  const [saving, setSaving] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [customPersonName, setCustomPersonName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const active = requests.filter(r => !r.is_completed);
  const completed = requests.filter(r => r.is_completed);
  const archiveGroups = groupByMonth(completed);

  const propMap = {};
  properties.forEach(p => { propMap[p.id] = p; });
  const unitMap = {};
  units.forEach(u => { unitMap[u.id] = u; });

  const availableUnits = units.filter(u => u.property_id === form.property_id);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyReqForm });
    setShowCustomInput(false);
    setCustomPersonName('');
    setDialog(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      property_id: r.property_id || '',
      unit_id: r.unit_id || '',
      title: r.title || '',
      description: r.description || '',
      status: r.status || 'Pending',
      status_color: r.status_color || 'gray',
      access_info: r.access_info || '',
      assigned_personnel: r.assigned_personnel || [],
      notes: r.notes || '',
      is_completed: r.is_completed || false,
      completed_at: r.completed_at || null,
    });
    setShowCustomInput(false);
    setCustomPersonName('');
    setDialog(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, property_id: form.property_id || null, unit_id: form.unit_id || null };
      if (editing) {
        await updateMaintenanceRequest(editing.id, payload);
        toast.success('Updated');
      } else {
        await createMaintenanceRequest(payload);
        toast.success('Request created');
      }
      setDialog(false);
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this request permanently?')) return;
    try { await deleteMaintenanceRequest(id); toast.success('Deleted'); onRefresh(); }
    catch { toast.error('Failed to delete'); }
  };

  const addPersonFromDropdown = (val) => {
    if (val === '_custom') { setShowCustomInput(true); return; }
    const p = personnel.find(p => p.id === val);
    if (!p || form.assigned_personnel.some(x => x.id === p.id)) return;
    setForm(f => ({ ...f, assigned_personnel: [...f.assigned_personnel, { id: p.id, name: p.name }] }));
  };

  const addCustomPerson = () => {
    if (!customPersonName.trim()) return;
    setForm(f => ({ ...f, assigned_personnel: [...f.assigned_personnel, { id: null, name: customPersonName.trim() }] }));
    setCustomPersonName('');
    setShowCustomInput(false);
  };

  const removePerson = (idx) => setForm(f => ({
    ...f, assigned_personnel: f.assigned_personnel.filter((_, i) => i !== idx)
  }));

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate} data-testid="mt-new-request-btn">
          <Plus className="h-4 w-4 mr-1" />New Request
        </Button>
      </div>

      {active.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-muted/20">
          No upcoming maintenance requests
        </div>
      ) : (
        <div className="space-y-2" data-testid="maintenance-requests-list">
          {active.map((r, idx) => (
            <RequestCard
              key={r.id} request={r} idx={idx}
              unitMap={unitMap} propMap={propMap}
              onEdit={() => openEdit(r)} onDelete={() => handleDelete(r.id)}
            />
          ))}
        </div>
      )}

      {/* Archive Section */}
      <div className="mt-8">
        <button
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full border rounded-lg px-4 py-3 bg-muted/20 hover:bg-muted/40"
          onClick={() => setShowArchive(!showArchive)}
          data-testid="mt-archive-toggle"
        >
          <Archive className="h-4 w-4" />
          Archive — Completed ({completed.length})
          <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${showArchive ? '' : '-rotate-90'}`} />
        </button>

        {showArchive && (
          <div className="mt-3 space-y-5" data-testid="mt-archive-section">
            {archiveGroups.length === 0 && (
              <p className="text-sm text-muted-foreground px-2">No completed requests yet</p>
            )}
            {archiveGroups.map(group => (
              <div key={group.label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">
                  {group.label}
                </p>
                <div className="space-y-2">
                  {group.reqs.map((r, idx) => (
                    <RequestCard
                      key={r.id} request={r} idx={idx}
                      unitMap={unitMap} propMap={propMap}
                      onEdit={() => openEdit(r)} onDelete={() => handleDelete(r.id)}
                      isArchived
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Maintenance Request' : 'New Maintenance Request'}</DialogTitle>
            <DialogDescription>Fill in the details for this maintenance request.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Property</Label>
                <Select
                  value={form.property_id || '_none'}
                  onValueChange={v => setForm(f => ({ ...f, property_id: v === '_none' ? '' : v, unit_id: '' }))}
                >
                  <SelectTrigger data-testid="mt-property-select">
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Unit (optional)</Label>
                <Select
                  value={form.unit_id || '_none'}
                  onValueChange={v => setForm(f => ({ ...f, unit_id: v === '_none' ? '' : v }))}
                >
                  <SelectTrigger data-testid="mt-unit-select">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {availableUnits.map(u => <SelectItem key={u.id} value={u.id}>{u.unit_number}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Leaky faucet in bathroom"
                data-testid="mt-title-input"
              />
            </div>

            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Details about the issue..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Status</Label>
                <Input
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  placeholder="e.g. Pending, In Progress"
                  data-testid="mt-status-input"
                />
              </div>
              <div className="space-y-1">
                <Label>Status Color</Label>
                <div className="flex gap-2 pt-1.5">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c.value}
                      title={c.label}
                      onClick={() => setForm(f => ({ ...f, status_color: c.value }))}
                      className={`h-7 w-7 rounded-full ${c.cls} border-2 transition-all ${
                        form.status_color === c.value
                          ? 'border-foreground scale-110 shadow-md'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                      data-testid={`mt-color-${c.value}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Access Info</Label>
              <Input
                value={form.access_info}
                onChange={e => setForm(f => ({ ...f, access_info: e.target.value }))}
                placeholder="e.g. Key under mat, Unit code 1234"
              />
            </div>

            <div className="space-y-2">
              <Label>Assigned Maintenance Personnel</Label>
              <Select onValueChange={addPersonFromDropdown} value="">
                <SelectTrigger data-testid="mt-personnel-select">
                  <SelectValue placeholder="Add from list..." />
                </SelectTrigger>
                <SelectContent>
                  {personnel.map(p => (
                    <SelectItem
                      key={p.id} value={p.id}
                      disabled={form.assigned_personnel.some(x => x.id === p.id)}
                    >
                      {p.name}{p.role ? ` — ${p.role}` : ''}
                    </SelectItem>
                  ))}
                  <SelectItem value="_custom">+ Add custom person...</SelectItem>
                </SelectContent>
              </Select>

              {showCustomInput && (
                <div className="flex gap-2">
                  <Input
                    value={customPersonName}
                    onChange={e => setCustomPersonName(e.target.value)}
                    placeholder="Custom person name"
                    className="flex-1"
                    onKeyDown={e => e.key === 'Enter' && addCustomPerson()}
                    data-testid="mt-custom-person-input"
                  />
                  <Button size="sm" onClick={addCustomPerson} variant="secondary">Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowCustomInput(false); setCustomPersonName(''); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {form.assigned_personnel.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {form.assigned_personnel.map((p, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent text-accent-foreground rounded-md text-xs font-medium">
                      {p.name}
                      <button onClick={() => removePerson(i)} className="ml-0.5 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="is_completed"
                checked={form.is_completed}
                onCheckedChange={v => setForm(f => ({ ...f, is_completed: v }))}
                data-testid="mt-completed-checkbox"
              />
              <Label htmlFor="is_completed" className="cursor-pointer">
                Mark as Completed (moves to archive)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="mt-save-btn">
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ========== REQUEST CARD ========== */
function RequestCard({ request: r, idx, unitMap, propMap, onEdit, onDelete, isArchived }) {
  const ci = STATUS_COLORS[r.status_color] || STATUS_COLORS.gray;
  const unit = unitMap[r.unit_id];
  const prop = propMap[r.property_id];
  const personnelNames = (r.assigned_personnel || []).map(p => p.name).join(', ');

  return (
    <div
      className={`group relative border rounded-xl p-4 cursor-pointer transition-shadow hover:shadow-md ${
        idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'
      } ${isArchived ? 'opacity-75' : ''}`}
      onClick={onEdit}
      data-testid="maintenance-request-card"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${ci.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${ci.dot}`} />
              {r.status || 'Pending'}
            </span>
            {(prop || unit) && (
              <span className="text-xs text-muted-foreground">
                {prop?.name}{unit ? ` · ${unit.unit_number}` : ''}
              </span>
            )}
          </div>

          <p className="font-medium text-sm leading-snug">{r.title}</p>

          {personnelNames && (
            <p className="text-xs text-muted-foreground mt-1">
              <UserCheck className="inline h-3 w-3 mr-1" />{personnelNames}
            </p>
          )}

          {r.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.description}</p>
          )}

          {r.notes && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{r.notes}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <p className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
            {formatDate(r.created_at)}
          </p>
          <div
            className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}
          >
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========== PERSONNEL TAB ========== */
const emptyPersonnelForm = { name: '', contact: '', role: '', notes: '', is_archived: false };

function PersonnelTab({ personnel, onRefresh }) {
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyPersonnelForm });
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const openCreate = () => { setEditing(null); setForm({ ...emptyPersonnelForm }); setDialog(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, contact: p.contact || '', role: p.role || '', notes: p.notes || '', is_archived: p.is_archived || false });
    setDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      if (editing) { await updateMaintenancePersonnel(editing.id, form); toast.success('Updated'); }
      else { await createMaintenancePersonnel(form); toast.success('Added'); }
      setDialog(false);
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (p) => {
    try {
      await updateMaintenancePersonnel(p.id, { ...p, is_archived: !p.is_archived });
      toast.success(p.is_archived ? 'Restored' : 'Archived');
      onRefresh();
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete permanently?')) return;
    try { await deleteMaintenancePersonnel(id); toast.success('Deleted'); onRefresh(); }
    catch { toast.error('Failed'); }
  };

  const active = personnel.filter(p => !p.is_archived);
  const archived = personnel.filter(p => p.is_archived);

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
        <Button onClick={openCreate} data-testid="mt-add-personnel-btn">
          <Plus className="h-4 w-4 mr-1" />Add Personnel
        </Button>
      </div>

      {active.length === 0 && !showArchived && (
        <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-muted/20">
          No maintenance personnel added yet
        </div>
      )}

      <div className="space-y-2" data-testid="mt-personnel-list">
        {active.map((p, idx) => (
          <PersonnelCard
            key={p.id} person={p} idx={idx}
            onEdit={() => openEdit(p)}
            onArchive={() => handleArchive(p)}
            onDelete={() => handleDelete(p.id)}
          />
        ))}
        {showArchived && archived.length > 0 && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2 pb-1 px-1">Archived</p>
            {archived.map((p, idx) => (
              <PersonnelCard
                key={p.id} person={p} idx={idx} isArchived
                onEdit={() => openEdit(p)}
                onArchive={() => handleArchive(p)}
                onDelete={() => handleDelete(p.id)}
              />
            ))}
          </>
        )}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Personnel' : 'Add Maintenance Personnel'}</DialogTitle>
            <DialogDescription>Enter details for this maintenance person.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  data-testid="mt-personnel-name-input"
                />
              </div>
              <div className="space-y-1">
                <Label>Contact</Label>
                <Input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Role / Specialty</Label>
              <Input
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                placeholder="e.g. Plumber, Electrician, HVAC"
              />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="mt-personnel-save-btn">
              {saving ? 'Saving...' : editing ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PersonnelCard({ person: p, idx, isArchived, onEdit, onArchive, onDelete }) {
  return (
    <div
      className={`group border rounded-xl px-4 py-3.5 flex items-start justify-between gap-4 transition-shadow hover:shadow-sm ${
        idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'
      } ${isArchived ? 'opacity-60' : ''}`}
      data-testid="mt-personnel-card"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">
          {p.name}
          {p.role && <span className="text-xs text-muted-foreground font-normal ml-2">— {p.role}</span>}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
          {p.contact && <p className="text-xs text-muted-foreground">{p.contact}</p>}
          {p.notes && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{p.notes}</p>}
        </div>
      </div>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onArchive} title={isArchived ? 'Restore' : 'Archive'}>
          <Archive className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
