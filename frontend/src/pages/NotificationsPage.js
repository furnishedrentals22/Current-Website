import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getNotifications, createNotification, updateNotification, updateNotificationStatus,
  deleteNotification, snoozeNotification, duplicateNotification, bulkNotificationAction,
  getProperties, getUnits, getTeamMembers
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell, Plus, Pencil, Trash2, Clock, CheckCircle, Archive, ArrowRightLeft, Search,
  LayoutGrid, List, Copy, AlarmClock, ChevronDown, ChevronRight, X, Filter
} from 'lucide-react';
import { toast } from 'sonner';

const STATUSES = [
  { value: 'upcoming', label: 'Upcoming', icon: Clock, color: 'bg-amber-500' },
  { value: 'in_progress', label: 'In Progress', icon: ArrowRightLeft, color: 'bg-blue-500' },
  { value: 'done', label: 'Done', icon: CheckCircle, color: 'bg-emerald-500' },
  { value: 'reassigned', label: 'Reassigned', icon: ArrowRightLeft, color: 'bg-purple-500' },
  { value: 'archived', label: 'Archived', icon: Archive, color: 'bg-stone-400' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', dot: 'bg-emerald-400', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  { value: 'medium', label: 'Medium', dot: 'bg-amber-400', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
  { value: 'high', label: 'High', dot: 'bg-orange-500', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
  { value: 'urgent', label: 'Urgent', dot: 'bg-red-600', bg: 'bg-red-50 border-red-200', text: 'text-red-700' },
];

const CATEGORIES = [
  'manual', 'parking', 'door_code', 'deposit', 'move_in', 'move_out', 'housekeeping', 'lead', 'deposit_return', 'other'
];

const STATUS_BG = {
  upcoming: 'bg-amber-50/70 border-amber-200',
  in_progress: 'bg-blue-50/70 border-blue-200',
  done: 'bg-emerald-50/70 border-emerald-200',
  reassigned: 'bg-purple-50/70 border-purple-200',
  archived: 'bg-stone-50/70 border-stone-200',
};

const emptyForm = {
  name: '', property_id: '', unit_id: '', assigned_person: '',
  reminder_date: '', reminder_time: '', status: 'upcoming',
  is_recurring: false, recurrence_pattern: '', recurrence_end_date: '',
  reminder_times: [], notes: '', notification_type: 'manual',
  priority: 'medium', category: 'manual', message: '',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('kanban');
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterProperty, setFilterProperty] = useState('all');
  const [filterPerson, setFilterPerson] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [snoozeDialog, setSnoozeDialog] = useState(false);
  const [snoozeTarget, setSnoozeTarget] = useState(null);
  const [snoozeForm, setSnoozeForm] = useState({ date: '', time: '' });
  const [listSort, setListSort] = useState({ col: 'reminder_date', dir: 'asc' });

  const fetchData = useCallback(async () => {
    try {
      const [n, p, u, tm] = await Promise.all([getNotifications(), getProperties(), getUnits(), getTeamMembers()]);
      setNotifications(n); setProperties(p); setUnits(u); setTeamMembers(tm);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const propMap = useMemo(() => {
    const m = {}; properties.forEach(p => { m[p.id] = p; }); return m;
  }, [properties]);
  const unitMap = useMemo(() => {
    const m = {}; units.forEach(u => { m[u.id] = u; }); return m;
  }, [units]);

  // Filtered + searched notifications
  const filtered = useMemo(() => {
    return notifications.filter(n => {
      const s = n.status || (n.is_read ? 'done' : 'upcoming');
      if (filterStatus !== 'all' && s !== filterStatus) return false;
      if (filterPriority !== 'all' && (n.priority || 'medium') !== filterPriority) return false;
      if (filterCategory !== 'all' && (n.category || n.notification_type || 'manual') !== filterCategory) return false;
      if (filterProperty !== 'all' && n.property_id !== filterProperty) return false;
      if (filterPerson !== 'all' && n.assigned_person !== filterPerson) return false;
      if (search) {
        const q = search.toLowerCase();
        const text = `${n.name || ''} ${n.notes || ''} ${n.message || ''} ${n.tenant_name || ''} ${n.assigned_person || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [notifications, filterStatus, filterPriority, filterCategory, filterProperty, filterPerson, search]);

  // Group by status for kanban
  const kanbanGroups = useMemo(() => {
    const groups = {};
    STATUSES.forEach(s => { groups[s.value] = []; });
    filtered.forEach(n => {
      const st = n.status || (n.is_read ? 'done' : 'upcoming');
      if (groups[st]) groups[st].push(n);
    });
    // Sort each group by reminder_date ascending
    Object.values(groups).forEach(arr => arr.sort((a, b) => {
      const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const pa = pOrder[a.priority] ?? 2, pb = pOrder[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return (a.reminder_date || '').localeCompare(b.reminder_date || '');
    }));
    return groups;
  }, [filtered]);

  // Sorted list for table view
  const sortedList = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let va, vb;
      if (listSort.col === 'priority') {
        const order = { urgent: 0, high: 1, medium: 2, low: 3 };
        va = order[a.priority] ?? 2; vb = order[b.priority] ?? 2;
      } else if (listSort.col === 'name') {
        va = (a.name || '').toLowerCase(); vb = (b.name || '').toLowerCase();
      } else if (listSort.col === 'status') {
        va = a.status || ''; vb = b.status || '';
      } else if (listSort.col === 'category') {
        va = a.category || ''; vb = b.category || '';
      } else if (listSort.col === 'assigned_person') {
        va = a.assigned_person || ''; vb = b.assigned_person || '';
      } else {
        va = a.reminder_date || '9999'; vb = b.reminder_date || '9999';
      }
      return listSort.dir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
    });
    return arr;
  }, [filtered, listSort]);

  const statusCounts = useMemo(() => {
    const c = {}; STATUSES.forEach(s => { c[s.value] = 0; });
    notifications.forEach(n => { const st = n.status || (n.is_read ? 'done' : 'upcoming'); if (c[st] !== undefined) c[st]++; });
    return c;
  }, [notifications]);

  // Actions
  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setDialogOpen(true); };
  const openEdit = (n) => {
    setEditing(n);
    setForm({
      name: n.name || '', property_id: n.property_id || '', unit_id: n.unit_id || '',
      assigned_person: n.assigned_person || '', reminder_date: n.reminder_date || '',
      reminder_time: n.reminder_time || '', status: n.status || 'upcoming',
      is_recurring: n.is_recurring || false, recurrence_pattern: n.recurrence_pattern || '',
      recurrence_end_date: n.recurrence_end_date || '', reminder_times: n.reminder_times || [],
      notes: n.notes || n.message || '', notification_type: n.notification_type || 'manual',
      priority: n.priority || 'medium', category: n.category || n.notification_type || 'manual',
      message: n.message || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Name is required'); return; }
    setSaving(true);
    const payload = { ...form, message: form.notes || form.name };
    try {
      if (editing) { await updateNotification(editing.id, payload); toast.success('Updated'); }
      else { await createNotification(payload); toast.success('Created'); }
      setDialogOpen(false); fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try { await updateNotificationStatus(id, newStatus); fetchData(); }
    catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete?')) return;
    try { await deleteNotification(id); toast.success('Deleted'); setSelected(s => { const ns = new Set(s); ns.delete(id); return ns; }); fetchData(); }
    catch { toast.error('Failed'); }
  };

  const handleDuplicate = async (id) => {
    try { await duplicateNotification(id); toast.success('Duplicated'); fetchData(); }
    catch { toast.error('Failed'); }
  };

  const openSnooze = (n) => {
    setSnoozeTarget(n);
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    setSnoozeForm({ date: tomorrow.toISOString().split('T')[0], time: n.reminder_time || '09:00' });
    setSnoozeDialog(true);
  };

  const handleSnooze = async () => {
    if (!snoozeForm.date) { toast.error('Date required'); return; }
    try {
      await snoozeNotification(snoozeTarget.id, { snooze_until_date: snoozeForm.date, snooze_until_time: snoozeForm.time });
      toast.success(`Snoozed to ${snoozeForm.date}`); setSnoozeDialog(false); fetchData();
    } catch { toast.error('Failed'); }
  };

  const quickSnooze = async (n, hours) => {
    const d = new Date();
    if (hours >= 24) { d.setDate(d.getDate() + Math.floor(hours / 24)); }
    else { d.setHours(d.getHours() + hours); }
    try {
      await snoozeNotification(n.id, {
        snooze_until_date: d.toISOString().split('T')[0],
        snooze_until_time: d.toTimeString().slice(0, 5)
      });
      toast.success(`Snoozed ${hours >= 24 ? `${hours / 24}d` : `${hours}h`}`); fetchData();
    } catch { toast.error('Failed'); }
  };

  const toggleSelect = (id) => {
    setSelected(s => { const ns = new Set(s); if (ns.has(id)) ns.delete(id); else ns.add(id); return ns; });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(n => n.id)));
  };

  const handleBulkAction = async (action, newStatus) => {
    if (selected.size === 0) { toast.error('Select notifications first'); return; }
    try {
      await bulkNotificationAction({ ids: Array.from(selected), action, new_status: newStatus });
      toast.success(`${action === 'delete' ? 'Deleted' : 'Updated'} ${selected.size} notifications`);
      setSelected(new Set()); fetchData();
    } catch { toast.error('Bulk action failed'); }
  };

  const addReminderTime = () => setForm(f => ({ ...f, reminder_times: [...f.reminder_times, ''] }));
  const updateReminderTime = (idx, val) => {
    const arr = [...form.reminder_times]; arr[idx] = val; setForm({ ...form, reminder_times: arr });
  };
  const removeReminderTime = (idx) => setForm(f => ({ ...f, reminder_times: f.reminder_times.filter((_, i) => i !== idx) }));

  const filteredUnits = form.property_id ? units.filter(u => u.property_id === form.property_id) : units;
  const clearFilters = () => {
    setFilterPriority('all'); setFilterCategory('all'); setFilterProperty('all'); setFilterPerson('all'); setFilterStatus('all'); setSearch('');
  };
  const hasFilters = filterPriority !== 'all' || filterCategory !== 'all' || filterProperty !== 'all' || filterPerson !== 'all' || filterStatus !== 'all' || search;

  const toggleSort = (col) => {
    setListSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' });
  };

  const getPriorityInfo = (p) => PRIORITIES.find(pr => pr.value === p) || PRIORITIES[1];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight" data-testid="notifications-page-title">Notifications & Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {notifications.length} total | {statusCounts.upcoming} upcoming | {statusCounts.in_progress} in progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg overflow-hidden">
            <Button variant={view === 'kanban' ? 'default' : 'ghost'} size="sm" className="rounded-none h-8" onClick={() => setView('kanban')} data-testid="view-kanban-btn">
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={view === 'list' ? 'default' : 'ghost'} size="sm" className="rounded-none h-8" onClick={() => setView('list')} data-testid="view-list-btn">
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={openCreate} data-testid="notifications-add-btn"><Plus className="h-4 w-4 mr-1.5" />Add</Button>
        </div>
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search notifications..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9" data-testid="notifications-search" />
        </div>
        <Button variant={showFilters ? 'default' : 'outline'} size="sm" className="h-9" onClick={() => setShowFilters(!showFilters)} data-testid="notifications-filter-toggle">
          <Filter className="h-4 w-4 mr-1" />Filters{hasFilters && <Badge className="ml-1.5 h-4 px-1 text-[10px]">!</Badge>}
        </Button>
      </div>

      {/* Filter Row */}
      {showFilters && (
        <div className="flex items-center gap-2 flex-wrap p-3 rounded-lg border bg-muted/20" data-testid="notifications-filters">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterProperty} onValueChange={setFilterProperty}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Property" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPerson} onValueChange={setFilterPerson}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Person" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All People</SelectItem>
              {teamMembers.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {hasFilters && <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>Clear</Button>}
        </div>
      )}

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-lg border bg-blue-50 border-blue-200" data-testid="bulk-actions-bar">
          <span className="text-sm font-medium text-blue-700">{selected.size} selected</span>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkAction('status', 'done')}>Mark Done</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkAction('status', 'archived')}>Archive</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkAction('status', 'in_progress')}>In Progress</Button>
          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleBulkAction('delete')}>Delete</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      {loading ? <div className="text-center py-16 text-muted-foreground">Loading...</div> :
        view === 'kanban' ? (
          <KanbanView groups={kanbanGroups} propMap={propMap} unitMap={unitMap} selected={selected}
            onToggleSelect={toggleSelect} onEdit={openEdit} onDelete={handleDelete}
            onStatusChange={handleStatusChange} onDuplicate={handleDuplicate}
            onSnooze={openSnooze} onQuickSnooze={quickSnooze} getPriorityInfo={getPriorityInfo} />
        ) : (
          <ListView items={sortedList} propMap={propMap} unitMap={unitMap} selected={selected} allSelected={selected.size === filtered.length && filtered.length > 0}
            onToggleSelect={toggleSelect} onSelectAll={selectAll} onEdit={openEdit} onDelete={handleDelete}
            onStatusChange={handleStatusChange} onDuplicate={handleDuplicate}
            onSnooze={openSnooze} listSort={listSort} onToggleSort={toggleSort} getPriorityInfo={getPriorityInfo} />
        )
      }

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Notification' : 'Create Notification'}</DialogTitle>
            <DialogDescription>Configure notification details, schedule, and priority.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Notification name" data-testid="notif-name-input" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger data-testid="notif-priority-select"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger data-testid="notif-category-select"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Property</Label>
                <Select value={form.property_id || '_none'} onValueChange={v => setForm({ ...form, property_id: v === '_none' ? '' : v, unit_id: '' })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="_none">None</SelectItem>{properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={form.unit_id || '_none'} onValueChange={v => setForm({ ...form, unit_id: v === '_none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="_none">None</SelectItem>{filteredUnits.map(u => <SelectItem key={u.id} value={u.id}>Unit {u.unit_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assigned Person</Label>
              <Select value={form.assigned_person || '_none'} onValueChange={v => setForm({ ...form, assigned_person: v === '_none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent><SelectItem value="_none">Unassigned</SelectItem>{teamMembers.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Reminder Date</Label>
                <Input type="date" value={form.reminder_date} onChange={e => setForm({ ...form, reminder_date: e.target.value })} data-testid="notif-date-input" />
              </div>
              <div className="space-y-2">
                <Label>Reminder Time</Label>
                <Input type="time" value={form.reminder_time} onChange={e => setForm({ ...form, reminder_time: e.target.value })} />
              </div>
            </div>
            {/* Multiple reminder times */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Additional Reminder Times</Label>
                <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={addReminderTime}><Plus className="h-3 w-3 mr-1" />Add Time</Button>
              </div>
              {form.reminder_times.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input type="time" value={t} onChange={e => updateReminderTime(i, e.target.value)} className="w-40" />
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeReminderTime(i)}><X className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_recurring} onCheckedChange={v => setForm({ ...form, is_recurring: v })} />
                <Label>Recurring</Label>
              </div>
              {form.is_recurring && (
                <>
                  <Select value={form.recurrence_pattern || 'daily'} onValueChange={v => setForm({ ...form, recurrence_pattern: v })}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="date" placeholder="End date" value={form.recurrence_end_date} onChange={e => setForm({ ...form, recurrence_end_date: e.target.value })} className="w-40" />
                </>
              )}
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Details, instructions, or context..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="notif-save-btn">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Snooze Dialog */}
      <Dialog open={snoozeDialog} onOpenChange={setSnoozeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle><AlarmClock className="h-4 w-4 inline mr-2" />Snooze Notification</DialogTitle>
            <DialogDescription>Push this reminder to a later date/time.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => quickSnooze(snoozeTarget, 1).then(() => setSnoozeDialog(false))}>+1 hour</Button>
              <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => quickSnooze(snoozeTarget, 24).then(() => setSnoozeDialog(false))}>+1 day</Button>
              <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => quickSnooze(snoozeTarget, 168).then(() => setSnoozeDialog(false))}>+1 week</Button>
            </div>
            <div className="border-t pt-3 space-y-2">
              <Label>Custom Date</Label>
              <Input type="date" value={snoozeForm.date} onChange={e => setSnoozeForm({ ...snoozeForm, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input type="time" value={snoozeForm.time} onChange={e => setSnoozeForm({ ...snoozeForm, time: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSnoozeDialog(false)}>Cancel</Button>
            <Button onClick={handleSnooze} data-testid="snooze-save-btn">Snooze</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ========== KANBAN VIEW ========== */
function KanbanView({ groups, propMap, unitMap, selected, onToggleSelect, onEdit, onDelete, onStatusChange, onDuplicate, onSnooze, onQuickSnooze, getPriorityInfo }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="kanban-view">
      {STATUSES.map(status => {
        const items = groups[status.value] || [];
        return (
          <div key={status.value} className="flex flex-col rounded-lg border bg-muted/20 min-h-[200px]" data-testid={`kanban-col-${status.value}`}>
            <div className="flex items-center gap-2 p-2.5 border-b bg-muted/40 rounded-t-lg">
              <div className={`h-2.5 w-2.5 rounded-full ${status.color}`} />
              <span className="text-xs font-semibold uppercase tracking-wide">{status.label}</span>
              <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px]">{items.length}</Badge>
            </div>
            <ScrollArea className="flex-1 p-1.5">
              <div className="space-y-1.5">
                {items.map(n => (
                  <KanbanCard key={n.id} n={n} propMap={propMap} unitMap={unitMap}
                    isSelected={selected.has(n.id)} onToggleSelect={() => onToggleSelect(n.id)}
                    onEdit={() => onEdit(n)} onDelete={() => onDelete(n.id)} onDuplicate={() => onDuplicate(n.id)}
                    onSnooze={() => onSnooze(n)} onStatusChange={onStatusChange}
                    currentStatus={status.value} getPriorityInfo={getPriorityInfo} />
                ))}
                {items.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-6">Empty</p>}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ n, propMap, unitMap, isSelected, onToggleSelect, onEdit, onDelete, onDuplicate, onSnooze, onStatusChange, currentStatus, getPriorityInfo }) {
  const [expanded, setExpanded] = useState(false);
  const pri = getPriorityInfo(n.priority || 'medium');
  const prop = propMap[n.property_id];
  const unit = unitMap[n.unit_id];
  const cat = (n.category || n.notification_type || 'manual').replace('_', ' ');

  const nextStatuses = {
    upcoming: ['in_progress', 'done'],
    in_progress: ['done', 'reassigned'],
    done: ['archived'],
    reassigned: ['in_progress', 'upcoming'],
    archived: ['upcoming'],
  };

  return (
    <div className={`rounded-md border p-2 bg-card hover:shadow-sm transition-shadow cursor-pointer ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
      data-testid="kanban-card" onClick={() => setExpanded(!expanded)}>
      <div className="flex items-start gap-1.5">
        <div className="pt-0.5" onClick={e => { e.stopPropagation(); onToggleSelect(); }}>
          <Checkbox checked={isSelected} className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <div className={`h-2 w-2 rounded-full flex-shrink-0 ${pri.dot}`} title={pri.label} />
            <span className="text-xs font-medium truncate">{n.name || 'Untitled'}</span>
          </div>
          <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
            {n.reminder_date && <span>{n.reminder_date}</span>}
            {n.reminder_time && <span>{n.reminder_time}</span>}
            {cat !== 'manual' && <Badge variant="outline" className="h-4 px-1 text-[9px]">{cat}</Badge>}
          </div>
          {(prop || unit || n.assigned_person) && (
            <div className="flex flex-wrap gap-1 mt-0.5 text-[10px] text-muted-foreground">
              {prop && <span>{prop.name}</span>}
              {unit && <span>U{unit.unit_number}</span>}
              {n.assigned_person && <span className="font-medium">{n.assigned_person}</span>}
            </div>
          )}
        </div>
      </div>
      {expanded && (
        <div className="mt-2 pt-2 border-t space-y-1.5" onClick={e => e.stopPropagation()}>
          {(n.notes || n.message) && <p className="text-[10px] text-muted-foreground">{n.notes || n.message}</p>}
          {n.is_recurring && <Badge variant="secondary" className="text-[9px] h-4">Recurring: {n.recurrence_pattern}</Badge>}
          <div className="flex flex-wrap gap-1">
            {(nextStatuses[currentStatus] || []).map(s => (
              <Button key={s} variant="outline" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => onStatusChange(n.id, s)}>
                {s.replace('_', ' ')}
              </Button>
            ))}
          </div>
          <div className="flex gap-1 pt-1">
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={onEdit}><Pencil className="h-3 w-3 mr-0.5" />Edit</Button>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={onSnooze}><AlarmClock className="h-3 w-3 mr-0.5" />Snooze</Button>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={onDuplicate}><Copy className="h-3 w-3 mr-0.5" />Dup</Button>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5 text-destructive" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== LIST VIEW ========== */
function ListView({ items, propMap, unitMap, selected, allSelected, onToggleSelect, onSelectAll, onEdit, onDelete, onStatusChange, onDuplicate, onSnooze, listSort, onToggleSort, getPriorityInfo }) {
  const SortHeader = ({ col, label }) => (
    <TableHead className="text-[10px] font-semibold uppercase tracking-wide cursor-pointer select-none" onClick={() => onToggleSort(col)}>
      <span className="flex items-center gap-1">{label}{listSort.col === col && (listSort.dir === 'asc' ? ' \u2191' : ' \u2193')}</span>
    </TableHead>
  );

  return (
    <div className="border rounded-lg overflow-hidden" data-testid="list-view">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-8"><Checkbox checked={allSelected} onCheckedChange={onSelectAll} className="h-3.5 w-3.5" /></TableHead>
            <SortHeader col="priority" label="Pri" />
            <SortHeader col="name" label="Name" />
            <SortHeader col="category" label="Category" />
            <TableHead className="text-[10px] font-semibold uppercase tracking-wide">Property / Unit</TableHead>
            <SortHeader col="assigned_person" label="Assigned" />
            <SortHeader col="reminder_date" label="Date" />
            <SortHeader col="status" label="Status" />
            <TableHead className="text-[10px] font-semibold uppercase tracking-wide w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">No notifications match your filters</TableCell></TableRow>
          ) : items.map(n => {
            const pri = getPriorityInfo(n.priority || 'medium');
            const prop = propMap[n.property_id];
            const unit = unitMap[n.unit_id];
            const st = n.status || 'upcoming';
            const cat = (n.category || n.notification_type || 'manual').replace('_', ' ');
            return (
              <TableRow key={n.id} className={`${STATUS_BG[st] || ''} ${selected.has(n.id) ? 'ring-1 ring-inset ring-blue-400' : ''}`} data-testid="list-view-row">
                <TableCell><Checkbox checked={selected.has(n.id)} onCheckedChange={() => onToggleSelect(n.id)} className="h-3.5 w-3.5" /></TableCell>
                <TableCell><div className={`h-2.5 w-2.5 rounded-full ${pri.dot}`} title={pri.label} /></TableCell>
                <TableCell className="font-medium text-xs max-w-[200px] truncate">{n.name || 'Untitled'}</TableCell>
                <TableCell><Badge variant="outline" className="text-[9px] h-4">{cat}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{prop ? prop.name : ''}{unit ? ` / U${unit.unit_number}` : ''}</TableCell>
                <TableCell className="text-xs">{n.assigned_person || '-'}</TableCell>
                <TableCell className="text-xs tabular-nums">{n.reminder_date || '-'}{n.reminder_time ? ` ${n.reminder_time}` : ''}</TableCell>
                <TableCell><Badge className={`text-[9px] h-4 ${STATUS_BG[st]}`}>{st.replace('_', ' ')}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onEdit(n)} title="Edit"><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onSnooze(n)} title="Snooze"><AlarmClock className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onDuplicate(n.id)} title="Duplicate"><Copy className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => onDelete(n.id)} title="Delete"><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
