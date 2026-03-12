import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getNotifications, createNotification, updateNotification, updateNotificationStatus,
  deleteNotification, snoozeNotification, duplicateNotification, bulkNotificationAction,
  getProperties, getUnits, getTeamMembers, updateNotificationChecklist
} from '@/lib/api';
import { KanbanView } from '@/components/notifications/KanbanView';
import { ListView } from '@/components/notifications/ListView';
import { NotificationFormDialog } from '@/components/notifications/NotificationFormDialog';
import { SnoozeDialog } from '@/components/notifications/SnoozeDialog';
import { STATUSES, PRIORITIES, CATEGORIES, emptyNotificationForm } from '@/components/notifications/notificationConstants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, LayoutGrid, List, Filter } from 'lucide-react';
import { toast } from 'sonner';

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
  const [form, setForm] = useState(emptyNotificationForm);
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

  const kanbanGroups = useMemo(() => {
    const groups = {};
    STATUSES.forEach(s => { groups[s.value] = []; });
    filtered.forEach(n => {
      const st = n.status || (n.is_read ? 'done' : 'upcoming');
      if (groups[st]) groups[st].push(n);
    });
    Object.values(groups).forEach(arr => arr.sort((a, b) => {
      const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const pa = pOrder[a.priority] ?? 2, pb = pOrder[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return (a.reminder_date || '').localeCompare(b.reminder_date || '');
    }));
    return groups;
  }, [filtered]);

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

  const openCreate = () => { setEditing(null); setForm({ ...emptyNotificationForm }); setDialogOpen(true); };
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
    catch (e) { toast.error(e.response?.data?.detail || 'Failed to delete — check all checklist items first'); }
  };

  const handleDuplicate = async (id) => {
    try { await duplicateNotification(id); toast.success('Duplicated'); fetchData(); }
    catch { toast.error('Failed'); }
  };

  const handleChecklistToggle = async (notifId, key, checked) => {
    try { await updateNotificationChecklist(notifId, key, checked); fetchData(); }
    catch { toast.error('Failed to update checklist'); }
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

  const filteredUnits = form.property_id ? units.filter(u => u.property_id === form.property_id) : units;
  const clearFilters = () => {
    setFilterPriority('all'); setFilterCategory('all'); setFilterProperty('all'); setFilterPerson('all'); setFilterStatus('all'); setSearch('');
  };
  const hasFilters = filterPriority !== 'all' || filterCategory !== 'all' || filterProperty !== 'all' || filterPerson !== 'all' || filterStatus !== 'all' || search;

  const toggleSort = (col) => {
    setListSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' });
  };

  return (
    <div className="space-y-3">
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
            onSnooze={openSnooze} onQuickSnooze={quickSnooze} onChecklistToggle={handleChecklistToggle} />
        ) : (
          <ListView items={sortedList} propMap={propMap} unitMap={unitMap} selected={selected} allSelected={selected.size === filtered.length && filtered.length > 0}
            onToggleSelect={toggleSelect} onSelectAll={selectAll} onEdit={openEdit} onDelete={handleDelete}
            onStatusChange={handleStatusChange} onDuplicate={handleDuplicate}
            onSnooze={openSnooze} listSort={listSort} onToggleSort={toggleSort} onChecklistToggle={handleChecklistToggle} />
        )
      }

      <NotificationFormDialog open={dialogOpen} onClose={setDialogOpen} editing={editing}
        form={form} setForm={setForm} onSave={handleSave} saving={saving}
        properties={properties} filteredUnits={filteredUnits} teamMembers={teamMembers} />

      <SnoozeDialog open={snoozeDialog} onClose={setSnoozeDialog} target={snoozeTarget}
        snoozeForm={snoozeForm} setSnoozeForm={setSnoozeForm} onSnooze={handleSnooze} onQuickSnooze={quickSnooze} />
    </div>
  );
}
