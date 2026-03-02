import { useState, useEffect, useCallback } from 'react';
import { getLeads, createLead, updateLead, deleteLead, getProperties, getUnits, getAvailableUnits, createNotification } from '@/lib/api';
import { useNotifications } from '@/App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { UserSearch, Plus, Pencil, Trash2, ArrowRight, UserPlus, Building2, ChevronDown, ChevronRight, AlertCircle, StickyNote, DollarSign } from 'lucide-react';
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
  converted_to_tenant: false, tenant_id: '',
  price_offered: '', preferred_contact_method: '', notes: '',
  is_unassigned: false, unassigned_note: ''
};

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [properties, setProperties] = useState([]);
  const [allUnits, setAllUnits] = useState([]);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [notifDialog, setNotifDialog] = useState(null);
  const [notifDate, setNotifDate] = useState('');
  const [noteDialog, setNoteDialog] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [noUnitsAvailable, setNoUnitsAvailable] = useState(false);

  // Expanded
  const [expandedProps, setExpandedProps] = useState({});

  const { refreshNotifications } = useNotifications();

  const fetchData = async () => {
    try {
      const [l, p, u] = await Promise.all([getLeads(), getProperties(), getUnits()]);
      setLeads(l);
      setProperties(p);
      setAllUnits(u);
    } catch (e) {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Maps
  const propMap = {};
  properties.forEach(p => { propMap[p.id] = p; });
  const unitMap = {};
  allUnits.forEach(u => { unitMap[u.id] = u; });

  // Fetch available units when dates change
  const fetchAvailableUnits = useCallback(async () => {
    try {
      const units = await getAvailableUnits(form.desired_start_date, form.desired_end_date);
      setAvailableUnits(units);
      setNoUnitsAvailable(form.desired_start_date && form.desired_end_date && units.length === 0);
    } catch (e) {
      console.error('Failed to fetch available units');
    }
  }, [form.desired_start_date, form.desired_end_date]);

  useEffect(() => {
    if (dialogOpen) fetchAvailableUnits();
  }, [dialogOpen, fetchAvailableUnits]);

  // Group leads by property
  const unassignedLeads = leads.filter(l => l.is_unassigned || (l.potential_unit_ids || []).length === 0);
  
  const leadsByProperty = {};
  leads.forEach(lead => {
    if (lead.is_unassigned) return;
    const unitIds = lead.potential_unit_ids || [];
    if (unitIds.length === 0) return;
    
    // For each unit, find the property and add lead to that property group
    const seenProps = new Set();
    unitIds.forEach(uid => {
      const unit = unitMap[uid];
      if (unit && !seenProps.has(unit.property_id)) {
        seenProps.add(unit.property_id);
        if (!leadsByProperty[unit.property_id]) leadsByProperty[unit.property_id] = [];
        leadsByProperty[unit.property_id].push(lead);
      }
    });
  });

  // CRUD
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setNoUnitsAvailable(false);
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
      tenant_id: lead.tenant_id || '',
      price_offered: lead.price_offered || '',
      preferred_contact_method: lead.preferred_contact_method || '',
      notes: lead.notes || '',
      is_unassigned: lead.is_unassigned || false,
      unassigned_note: lead.unassigned_note || ''
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      price_offered: form.price_offered ? parseFloat(form.price_offered) : null,
    };
    try {
      if (editing) {
        await updateLead(editing.id, payload);
        toast.success('Lead updated');
      } else {
        await createLead(payload);
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

  const handleSaveAsUnassigned = async () => {
    if (!form.name) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      price_offered: form.price_offered ? parseFloat(form.price_offered) : null,
      is_unassigned: true,
      potential_unit_ids: []
    };
    try {
      if (editing) {
        await updateLead(editing.id, payload);
        toast.success('Lead saved as unassigned');
      } else {
        await createLead(payload);
        toast.success('Lead saved as unassigned');
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
    
    if (nextStage === 2 && !lead.showing_date) {
      openEdit({ ...lead, progress_stage: nextStage });
      toast.info('Please set showing date and time');
      return;
    }
    
    try {
      await updateLead(lead.id, { ...lead, progress_stage: nextStage });
      toast.success(`Stage updated to: ${stageName}`);
      setNotifDialog({ leadId: lead.id, leadName: lead.name, stageName });
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
    const convertData = {
      name: lead.name, phone: lead.phone, email: lead.email,
      move_in_date: lead.desired_start_date || '',
      move_out_date: lead.desired_end_date || '',
      potential_unit_ids: lead.potential_unit_ids
    };
    window.localStorage.setItem('convert_lead', JSON.stringify({ ...convertData, lead_id: lead.id }));
    window.location.href = '/tenants';
  };

  const openNoteDialog = (lead) => {
    setNoteDialog(lead);
    setNoteText(lead.unassigned_note || '');
  };

  const saveUnassignedNote = async () => {
    if (!noteDialog) return;
    try {
      await updateLead(noteDialog.id, { ...noteDialog, unassigned_note: noteText });
      toast.success('Note saved');
      setNoteDialog(null);
      fetchData();
    } catch (e) {
      toast.error('Failed to save note');
    }
  };

  const toggleUnit = (unitId) => {
    const current = form.potential_unit_ids;
    if (current.includes(unitId)) {
      setForm({ ...form, potential_unit_ids: current.filter(id => id !== unitId) });
    } else {
      setForm({ ...form, potential_unit_ids: [...current, unitId] });
    }
  };

  // Lead row component
  const LeadRow = ({ lead }) => {
    const strength = STRENGTH_COLORS[lead.lead_strength] || STRENGTH_COLORS[1];
    const unitNames = (lead.potential_unit_ids || []).map(uid => {
      const u = unitMap[uid];
      return u ? `${u.unit_number}` : '';
    }).filter(Boolean);

    return (
      <div className={`relative flex items-center justify-between p-3 rounded-lg border transition-colors ${strength.row}`} data-testid="leads-table-row">
        <div className={`absolute left-0 top-0 h-full w-1 rounded-l ${strength.bar}`} />
        <div className="pl-3 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{lead.name}</span>
            <Badge className={`text-[10px] ${strength.row} ${strength.text} border-none`}>{strength.label}</Badge>
            {lead.source && <span className="text-xs text-muted-foreground">via {lead.source}</span>}
            {lead.price_offered && (
              <Badge variant="outline" className="text-[10px] gap-0.5 tabular-nums">
                <DollarSign className="h-2.5 w-2.5" />{parseFloat(lead.price_offered).toLocaleString()}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Progress value={(lead.progress_stage / 8) * 100} className="h-1.5 w-16" />
              <span className="text-[10px] text-muted-foreground">{STAGE_NAMES[lead.progress_stage]}</span>
            </div>
            {lead.desired_start_date && lead.desired_end_date && (
              <span className="text-xs text-muted-foreground">{lead.desired_start_date} — {lead.desired_end_date}</span>
            )}
            {unitNames.length > 0 && (
              <div className="flex gap-1">
                {unitNames.map((n, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">{n}</Badge>
                ))}
              </div>
            )}
            {lead.preferred_contact_method && (
              <span className="text-[10px] text-muted-foreground">Contact: {lead.preferred_contact_method}</span>
            )}
          </div>
          {lead.notes && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{lead.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {lead.progress_stage < 8 && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => advanceStage(lead)} data-testid="leads-stage-advance-button">
              <ArrowRight className="h-3 w-3 mr-1" /> Next
            </Button>
          )}
          {lead.progress_stage === 8 && !lead.converted_to_tenant && (
            <Button variant="default" size="sm" className="h-7 px-2 text-xs" onClick={() => handleConvertToTenant(lead)} data-testid="lead-convert-button">
              <UserPlus className="h-3 w-3 mr-1" /> Convert
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(lead)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(lead.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    );
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
        <div className="space-y-6">
          {/* ===== UNASSIGNED LEADS ===== */}
          {unassignedLeads.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-heading text-base font-semibold tracking-tight flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Unassigned Leads
                <Badge variant="secondary" className="text-xs tabular-nums">{unassignedLeads.length}</Badge>
              </h2>
              <Card className="overflow-hidden border-amber-200/50">
                <div className="space-y-2 p-4">
                  {unassignedLeads.map(lead => (
                    <div key={lead.id}>
                      <LeadRow lead={lead} />
                      {lead.is_unassigned && (
                        <div className="ml-4 mt-1 flex items-center gap-2">
                          {lead.unassigned_note ? (
                            <div className="flex items-start gap-2 p-2 rounded bg-muted/40 text-xs flex-1">
                              <StickyNote className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-muted-foreground">{lead.unassigned_note}</span>
                              <Button variant="ghost" size="sm" className="h-5 px-1 text-[10px] ml-auto" onClick={() => openNoteDialog(lead)}>Edit</Button>
                            </div>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-muted-foreground" onClick={() => openNoteDialog(lead)}>
                              <StickyNote className="h-3 w-3" /> Add Note
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ===== LEADS BY PROPERTY ===== */}
          {Object.entries(leadsByProperty).map(([propId, propLeads]) => {
            const prop = propMap[propId];
            const isOpen = expandedProps[propId] !== false; // default open
            return (
              <div key={propId} className="space-y-3">
                <Collapsible open={isOpen} onOpenChange={() => setExpandedProps(prev => ({ ...prev, [propId]: !isOpen }))}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <h2 className="font-heading text-base font-semibold tracking-tight">{prop?.name || 'Unknown Property'}</h2>
                      <Badge variant="secondary" className="text-xs tabular-nums">{propLeads.length}</Badge>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Card className="mt-2 overflow-hidden">
                      <div className="space-y-2 p-4">
                        {propLeads.map(lead => (
                          <LeadRow key={lead.id} lead={lead} />
                        ))}
                      </div>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })}

          {/* If only unassigned leads exist and no property leads */}
          {Object.keys(leadsByProperty).length === 0 && unassignedLeads.length > 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No property-assigned leads yet. Create a lead and assign units to see them grouped by property.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ===== LEAD CREATE/EDIT DIALOG ===== */}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Preferred Contact Method</Label>
                <Input value={form.preferred_contact_method} onChange={e => setForm({...form, preferred_contact_method: e.target.value})} placeholder="e.g. Text, Email, Call" data-testid="lead-contact-method" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Desired Start Date</Label>
                <Input type="date" value={form.desired_start_date} onChange={e => setForm({...form, desired_start_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Desired End Date</Label>
                <Input type="date" value={form.desired_end_date} onChange={e => setForm({...form, desired_end_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Price Offered</Label>
                <Input type="number" value={form.price_offered} onChange={e => setForm({...form, price_offered: e.target.value})} placeholder="$ amount" data-testid="lead-price-offered" />
              </div>
            </div>

            {/* Available units or no-units message */}
            <div className="space-y-2">
              <Label>Potential Units</Label>
              {noUnitsAvailable && !form.is_unassigned ? (
                <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/50">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-900">No available units for these dates</p>
                      <p className="text-xs text-amber-700 mt-1">You can save this as an unassigned lead to follow up later.</p>
                      <Button variant="outline" size="sm" className="mt-2 h-7 text-xs border-amber-300 text-amber-900 hover:bg-amber-100"
                        onClick={() => setForm({...form, is_unassigned: true})}
                        data-testid="lead-save-unassigned-toggle">
                        <AlertCircle className="h-3 w-3 mr-1" /> Mark as Unassigned
                      </Button>
                    </div>
                  </div>
                </div>
              ) : form.is_unassigned ? (
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium text-amber-900">Saving as unassigned lead</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setForm({...form, is_unassigned: false})}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 p-3 rounded-lg border min-h-[48px]">
                  {availableUnits.length === 0 ? (
                    <span className="text-sm text-muted-foreground">
                      {form.desired_start_date && form.desired_end_date
                        ? 'No available units for selected dates'
                        : 'Select dates to see available units'}
                    </span>
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
              )}
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
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Any additional notes about this lead..." data-testid="lead-notes-input" />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            {form.is_unassigned ? (
              <Button onClick={handleSaveAsUnassigned} disabled={saving} data-testid="lead-save-button">
                {saving ? 'Saving...' : 'Save as Unassigned'}
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving} data-testid="lead-save-button">
                {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== NOTIFICATION DIALOG ===== */}
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

      {/* ===== UNASSIGNED NOTE DIALOG ===== */}
      <Dialog open={!!noteDialog} onOpenChange={() => setNoteDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Unassigned Lead Note</DialogTitle>
            <DialogDescription>
              Add details about what this lead is useful for.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            <Label>{noteDialog?.name}</Label>
            <Textarea value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="What is this lead useful for? Why are they unassigned?"
              className="min-h-[100px]"
              data-testid="unassigned-note-input" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialog(null)}>Cancel</Button>
            <Button onClick={saveUnassignedNote} data-testid="unassigned-note-save">Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
