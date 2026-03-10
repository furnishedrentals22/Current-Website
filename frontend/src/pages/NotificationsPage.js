import { useState, useEffect, useCallback } from 'react';
import { getNotifications, createNotification, updateNotification, updateNotificationStatus, deleteNotification, getProperties, getUnits, getTeamMembers } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Bell, Plus, Pencil, Trash2, Clock, CheckCircle, Archive, ArrowRightLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_TABS = [
  { value: 'upcoming', label: 'Upcoming', icon: Clock },
  { value: 'in_progress', label: 'In Progress', icon: ArrowRightLeft },
  { value: 'done', label: 'Done', icon: CheckCircle },
  { value: 'reassigned', label: 'Reassigned', icon: ArrowRightLeft },
  { value: 'archived', label: 'Archived', icon: Archive },
];

const STATUS_COLORS = {
  upcoming: 'bg-amber-50 border-amber-200 text-amber-800',
  in_progress: 'bg-blue-50 border-blue-200 text-blue-800',
  done: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  reassigned: 'bg-purple-50 border-purple-200 text-purple-800',
  archived: 'bg-stone-100 border-stone-200 text-stone-600',
};

const emptyForm = {
  name: '', property_id: '', unit_id: '', assigned_person: '',
  reminder_date: '', reminder_time: '', status: 'upcoming',
  is_recurring: false, recurrence_pattern: '', reminder_times: [],
  notes: '', notification_type: 'manual', message: '',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [sortBy, setSortBy] = useState('date');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [n, p, u, tm] = await Promise.all([
        getNotifications(), getProperties(), getUnits(), getTeamMembers()
      ]);
      setNotifications(n);
      setProperties(p);
      setUnits(u);
      setTeamMembers(tm);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const propMap = {};
  properties.forEach(p => { propMap[p.id] = p; });
  const unitMap = {};
  units.forEach(u => { unitMap[u.id] = u; });

  const filtered = notifications.filter(n => {
    const s = n.status || (n.is_read ? 'done' : 'upcoming');
    return s === activeTab;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'property') {
      const pA = propMap[a.property_id]?.name || '';
      const pB = propMap[b.property_id]?.name || '';
      return pA.localeCompare(pB) || (a.reminder_date || '').localeCompare(b.reminder_date || '');
    }
    return (a.reminder_date || '').localeCompare(b.reminder_date || '');
  });

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setDialogOpen(true); };
  const openEdit = (n) => {
    setEditing(n);
    setForm({
      name: n.name || '', property_id: n.property_id || '', unit_id: n.unit_id || '',
      assigned_person: n.assigned_person || '', reminder_date: n.reminder_date || '',
      reminder_time: n.reminder_time || '', status: n.status || 'upcoming',
      is_recurring: n.is_recurring || false, recurrence_pattern: n.recurrence_pattern || '',
      reminder_times: n.reminder_times || [], notes: n.notes || n.message || '',
      notification_type: n.notification_type || 'manual', message: n.message || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Notification name is required'); return; }
    setSaving(true);
    const payload = { ...form, message: form.notes || form.name };
    try {
      if (editing) {
        await updateNotification(editing.id, payload);
        toast.success('Notification updated');
      } else {
        await createNotification(payload);
        toast.success('Notification created');
      }
      setDialogOpen(false);
      fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateNotificationStatus(id, newStatus);
      toast.success(`Moved to ${newStatus.replace('_', ' ')}`);
      fetchData();
    } catch { toast.error('Failed to update status'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this notification?')) return;
    try { await deleteNotification(id); toast.success('Deleted'); fetchData(); }
    catch { toast.error('Failed to delete'); }
  };

  const statusCounts = {};
  STATUS_TABS.forEach(t => { statusCounts[t.value] = 0; });
  notifications.forEach(n => {
    const s = n.status || (n.is_read ? 'done' : 'upcoming');
    if (statusCounts[s] !== undefined) statusCounts[s]++;
  });

  const filteredUnits = form.property_id ? units.filter(u => u.property_id === form.property_id) : units;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight" data-testid="notifications-page-title">Notifications & Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">Central hub for all reminders and tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]" data-testid="notifications-sort-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Sort by Date</SelectItem>
              <SelectItem value="property">Sort by Property</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={openCreate} data-testid="notifications-add-btn">
            <Plus className="h-4 w-4 mr-2" /> Add Notification
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 h-auto flex-wrap" data-testid="notifications-tabs">
          {STATUS_TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs gap-1.5" data-testid={`notifications-tab-${t.value}`}>
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              {statusCounts[t.value] > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{statusCounts[t.value]}</Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map(tab => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-lg">
                <Bell className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No {tab.label.toLowerCase()} notifications</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sorted.map(n => (
                  <NotificationCard key={n.id} notification={n} propMap={propMap} unitMap={unitMap}
                    onEdit={() => openEdit(n)} onDelete={() => handleDelete(n.id)}
                    onStatusChange={(s) => handleStatusChange(n.id, s)} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Notification' : 'Add Notification'}</DialogTitle>
            <DialogDescription>Fill in the details for this notification or reminder.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="space-y-2">
              <Label>Notification Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="notif-name-input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Related Property</Label>
                <Select value={form.property_id || '_none'} onValueChange={v => setForm({ ...form, property_id: v === '_none' ? '' : v, unit_id: '' })}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Related Unit</Label>
                <Select value={form.unit_id || '_none'} onValueChange={v => setForm({ ...form, unit_id: v === '_none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {filteredUnits.map(u => <SelectItem key={u.id} value={u.id}>Unit {u.unit_number}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assigned Person</Label>
                <Select value={form.assigned_person || '_none'} onValueChange={v => setForm({ ...form, assigned_person: v === '_none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Unassigned</SelectItem>
                    {teamMembers.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_TABS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reminder Date</Label>
                <Input type="date" value={form.reminder_date} onChange={e => setForm({ ...form, reminder_date: e.target.value })} data-testid="notif-date-input" />
              </div>
              <div className="space-y-2">
                <Label>Reminder Time</Label>
                <Input type="time" value={form.reminder_time} onChange={e => setForm({ ...form, reminder_time: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_recurring} onCheckedChange={v => setForm({ ...form, is_recurring: v })} />
              <Label>Recurring</Label>
              {form.is_recurring && (
                <Select value={form.recurrence_pattern || 'daily'} onValueChange={v => setForm({ ...form, recurrence_pattern: v })}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="notif-save-btn">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NotificationCard({ notification: n, propMap, unitMap, onEdit, onDelete, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const prop = propMap[n.property_id];
  const unit = unitMap[n.unit_id];
  const statusClass = STATUS_COLORS[n.status] || STATUS_COLORS.upcoming;
  const typeBadge = n.notification_type !== 'manual' ? n.notification_type?.replace('_', ' ') : null;

  const nextStatuses = {
    upcoming: ['in_progress', 'done', 'archived'],
    in_progress: ['done', 'reassigned', 'archived'],
    done: ['archived', 'upcoming'],
    reassigned: ['upcoming', 'in_progress', 'done'],
    archived: ['upcoming'],
  };

  return (
    <div className={`border rounded-lg p-3 ${statusClass}`} data-testid="notification-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
            <span className="font-medium text-sm truncate">{n.name || n.message || 'Untitled'}</span>
            {typeBadge && <Badge variant="outline" className="text-[10px] h-5">{typeBadge}</Badge>}
            {n.is_recurring && <Badge variant="secondary" className="text-[10px] h-5">Recurring</Badge>}
          </div>
          <div className="flex items-center gap-3 mt-1 ml-6 text-xs text-muted-foreground">
            {n.reminder_date && <span>{n.reminder_date}{n.reminder_time ? ` at ${n.reminder_time}` : ''}</span>}
            {prop && <span>{prop.name}</span>}
            {unit && <span>Unit {unit.unit_number}</span>}
            {n.assigned_person && <span>Assigned: {n.assigned_person}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit} data-testid="notif-edit-btn">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={onDelete} data-testid="notif-delete-btn">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 ml-6 space-y-2">
          {(n.notes || n.message) && <p className="text-xs">{n.notes || n.message}</p>}
          {n.tenant_name && <p className="text-xs text-muted-foreground">Tenant: {n.tenant_name}</p>}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(nextStatuses[n.status] || []).map(s => (
              <Button key={s} variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => onStatusChange(s)}>
                Move to {s.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
