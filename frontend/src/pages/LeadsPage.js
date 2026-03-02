import { useState, useEffect, useCallback } from 'react';
import { getLeads, createLead, updateLead, deleteLead, getProperties, getAvailableUnits, createNotification, createTenant } from '@/lib/api';
import { useNotifications } from '@/App';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { UserSearch, Plus, Pencil, Trash2, ArrowRight, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

const STAGE_NAMES = {
  1: 'Contacted', 2: 'Showing Set', 3: 'Showing Complete',
  4: 'BG Check Submitted', 5: 'BG Check Complete',
  6: 'Lease Sent', 7: 'Lease Signed', 8: 'Deposit Submitted'
};

const STRENGTH_COLORS = {
  1: { row: 'bg-red-50/60', bar: 'bg-red-500', text: 'text-red-900', label: 'Weak' },
  2: { row: 'bg-orange-50/70', bar: 'bg-orange-500', text: 'text-orange-900', label: 'Fair' },
  3: { row: 'bg-yellow-50/70', bar: 'bg-yellow-500', text: 'text-yellow-900', label: 'Good' },
  4: { row: 'bg-emerald-50/70', bar: 'bg-emerald-500', text: 'text-emerald-900', label: 'Strong' }
};

const emptyForm = {
  name: '', source: '', phone: '', email: '',
  desired_start_date: '', desired_end_date: '',
  potential_unit_ids: [], pets: '', parking_request: '',
  lead_strength: 1, progress_stage: 1, showing_date: '',
  converted_to_tenant: false, tenant_id: ''
};

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [notifDialog, setNotifDialog] = useState(null); // {leadName, stageName, callback}
  const [notifDate, setNotifDate] = useState('');
  const { refreshNotifications } = useNotifications();

  const fetchData = async () => {
    try {
      const data = await getLeads();
      setLeads(data);
    } catch (e) {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const fetchUnits = useCallback(async () => {
    try {
      const units = await getAvailableUnits(form.desired_start_date, form.desired_end_date);
      setAvailableUnits(units);
    } catch (e) {
      console.error('Failed to fetch available units');
    }
  }, [form.desired_start_date, form.desired_end_date]);

  useEffect(() => {
    if (dialogOpen) fetchUnits();
  }, [dialogOpen, fetchUnits]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (lead) => {
    setEditing(lead);
    setForm({
      name: lead.name || '', source: lead.source || '',
      phone: lead.phone || '', email: lead.email || '',
      desired_start_date: lead.desired_start_date || '',
      desired_end_date: lead.desired_end_date || '',
      potential_unit_ids: lead.potential_unit_ids || [],
      pets: lead.pets || '', parking_request: lead.parking_request || '',
      lead_strength: lead.lead_strength || 1,
      progress_stage: lead.progress_stage || 1,
      showing_date: lead.showing_date || '',
      converted_to_tenant: lead.converted_to_tenant || false,
      tenant_id: lead.tenant_id || ''
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateLead(editing.id, form);
        toast.success('Lead updated');
      } else {
        await createLead(form);
        toast.success('Lead created');
      }
      setDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save lead');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this lead?')) return;
    try {
      await deleteLead(id);
      toast.success('Lead deleted');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to delete lead');
    }
  };

  const advanceStage = async (lead) => {
    const nextStage = Math.min(lead.progress_stage + 1, 8);
    const stageName = STAGE_NAMES[nextStage];
    
    // If stage 2, need showing date
    if (nextStage === 2 && !lead.showing_date) {
      openEdit({ ...lead, progress_stage: nextStage });
      toast.info('Please set showing date and time');
      return;
    }
    
    try {
      await updateLead(lead.id, { ...lead, progress_stage: nextStage });
      toast.success(`Stage updated to: ${stageName}`);
      
      // Prompt for notification
      setNotifDialog({
        leadId: lead.id,
        leadName: lead.name,
        stageName: stageName
      });
      
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to advance stage');
    }
  };

  const handleCreateNotification = async () => {
    if (!notifDate) {
      toast.error('Please enter a notification date');
      return;
    }
    try {
      await createNotification({
        lead_id: notifDialog.leadId,
        lead_name: notifDialog.leadName,
        stage_name: notifDialog.stageName,
        notification_date: notifDate,
        message: `${notifDialog.leadName} - ${notifDialog.stageName}`
      });
      toast.success('Notification created');
      refreshNotifications();
    } catch (e) {
      toast.error('Failed to create notification');
    }
    setNotifDialog(null);
    setNotifDate('');
  };

  const handleConvertToTenant = (lead) => {
    // Navigate to tenant creation with prefilled data
    // For now, open a simple conversion dialog
    const convertData = {
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      move_in_date: lead.desired_start_date || '',
      move_out_date: lead.desired_end_date || '',
      potential_unit_ids: lead.potential_unit_ids
    };
    window.localStorage.setItem('convert_lead', JSON.stringify({ ...convertData, lead_id: lead.id }));
    window.location.href = '/tenants';
  };

  const toggleUnit = (unitId) => {
    const current = form.potential_unit_ids;
    if (current.includes(unitId)) {
      setForm({ ...form, potential_unit_ids: current.filter(id => id !== unitId) });
    } else {
      setForm({ ...form, potential_unit_ids: [...current, unitId] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and manage prospective tenants</p>
        </div>
        <Button onClick={openCreate} data-testid="leads-create-button">
          <Plus className="h-4 w-4 mr-2" /> Add Lead
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">Loading...</div>
      ) : leads.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <UserSearch className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-heading text-lg font-semibold">No leads yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Start tracking prospective tenants</p>
            <Button className="mt-4" onClick={openCreate}>Add Lead</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Name</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Source</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Strength</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Stage</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Desired Dates</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide w-[160px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map(lead => {
                const strength = STRENGTH_COLORS[lead.lead_strength] || STRENGTH_COLORS[1];
                return (
                  <TableRow key={lead.id} className={`relative ${strength.row} hover:opacity-90`} data-testid="leads-table-row">
                    <TableCell className="font-medium relative">
                      <div className={`absolute left-0 top-0 h-full w-1 rounded-l ${strength.bar}`} />
                      <span className="pl-2">{lead.name}</span>
                    </TableCell>
                    <TableCell className="text-sm">{lead.source || '-'}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${strength.row} ${strength.text} border-none`}>{strength.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={(lead.progress_stage / 8) * 100} className="h-2 w-20" />
                        <span className="text-xs text-muted-foreground">{STAGE_NAMES[lead.progress_stage]}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {lead.desired_start_date && lead.desired_end_date
                        ? `${lead.desired_start_date} - ${lead.desired_end_date}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {lead.progress_stage < 8 && (
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => advanceStage(lead)} data-testid="leads-stage-advance-button">
                            <ArrowRight className="h-3 w-3 mr-1" /> Next
                          </Button>
                        )}
                        {lead.progress_stage === 8 && !lead.converted_to_tenant && (
                          <Button variant="default" size="sm" className="h-8 px-2 text-xs" onClick={() => handleConvertToTenant(lead)} data-testid="lead-convert-button">
                            <UserPlus className="h-3 w-3 mr-1" /> Convert
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(lead)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDelete(lead.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Lead Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? 'Edit Lead' : 'Add Lead'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} data-testid="lead-name-input" />
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Input value={form.source} onChange={e => setForm({...form, source: e.target.value})} placeholder="Where was lead found" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label>Desired Start Date</Label>
                <Input type="date" value={form.desired_start_date} onChange={e => setForm({...form, desired_start_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Desired End Date</Label>
                <Input type="date" value={form.desired_end_date} onChange={e => setForm({...form, desired_end_date: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Potential Units (select available units)</Label>
              <div className="flex flex-wrap gap-2 p-3 rounded-lg border min-h-[48px]">
                {availableUnits.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No available units for selected dates</span>
                ) : (
                  availableUnits.map(u => (
                    <Badge key={u.id}
                      variant={form.potential_unit_ids.includes(u.id) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleUnit(u.id)}>
                      {u.property_name} - {u.unit_number}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pets</Label>
                <Input value={form.pets} onChange={e => setForm({...form, pets: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Parking Request</Label>
                <Input value={form.parking_request} onChange={e => setForm({...form, parking_request: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lead Strength</Label>
                <Select value={String(form.lead_strength)} onValueChange={v => setForm({...form, lead_strength: parseInt(v)})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Weak (Red)</SelectItem>
                    <SelectItem value="2">2 - Fair (Orange)</SelectItem>
                    <SelectItem value="3">3 - Good (Yellow)</SelectItem>
                    <SelectItem value="4">4 - Strong (Green)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Progress Stage</Label>
                <Select value={String(form.progress_stage)} onValueChange={v => setForm({...form, progress_stage: parseInt(v)})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STAGE_NAMES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{k}. {v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.progress_stage >= 2 && (
              <div className="space-y-2">
                <Label>Showing Date & Time {form.progress_stage === 2 ? '*' : ''}</Label>
                <Input type="datetime-local" value={form.showing_date} onChange={e => setForm({...form, showing_date: e.target.value})} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="lead-save-button">{saving ? 'Saving...' : (editing ? 'Update' : 'Create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification Creation Dialog */}
      <Dialog open={!!notifDialog} onOpenChange={() => { setNotifDialog(null); setNotifDate(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Create Notification?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {notifDialog?.leadName} has moved to <strong>{notifDialog?.stageName}</strong>.
            Would you like to create a site notification?
          </p>
          <div className="space-y-2 mt-2">
            <Label>Notification Date</Label>
            <Input type="date" value={notifDate} onChange={e => setNotifDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNotifDialog(null); setNotifDate(''); }}>Skip</Button>
            <Button onClick={handleCreateNotification}>Create Notification</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
