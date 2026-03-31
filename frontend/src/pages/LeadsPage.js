import { useState, useEffect } from 'react';
import { getLeads, createLead, updateLead, deleteLead, getProperties, getUnits, createNotification } from '@/lib/api';
import { useNotifications } from '@/App';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { UserSearch, Plus, Building2, ChevronDown, ChevronRight, AlertCircle, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { LeadRow, STAGE_NAMES } from '@/components/leads/LeadRow';
import { LeadFormDialog } from '@/components/leads/LeadFormDialog';
import { NotificationDialog, UnassignedNoteDialog } from '@/components/leads/NotificationDialogs';

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
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [notifDialog, setNotifDialog] = useState(null);
  const [notifDate, setNotifDate] = useState('');
  const [noteDialog, setNoteDialog] = useState(null);
  const [noteText, setNoteText] = useState('');

  const [expandedProps, setExpandedProps] = useState({});
  const { refreshNotifications } = useNotifications();

  const fetchData = async () => {
    try {
      const [l, p, u] = await Promise.all([getLeads(), getProperties(), getUnits()]);
      setLeads(l);
      setProperties(p);
      setAllUnits(u);
    } catch {
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

  // Group leads by property
  const unassignedLeads = leads.filter(l => l.is_unassigned || (l.potential_unit_ids || []).length === 0);
  const leadsByProperty = {};
  leads.forEach(lead => {
    if (lead.is_unassigned) return;
    const unitIds = lead.potential_unit_ids || [];
    if (unitIds.length === 0) return;
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
    if (!form.name) { toast.error('Name is required'); return; }
    setSaving(true);
    const payload = { ...form, price_offered: form.price_offered ? parseFloat(form.price_offered) : null };
    try {
      if (editing) { await updateLead(editing.id, payload); toast.success('Lead updated'); }
      else { await createLead(payload); toast.success('Lead created'); }
      setDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save lead');
    } finally { setSaving(false); }
  };

  const handleSaveAsUnassigned = async () => {
    if (!form.name) { toast.error('Name is required'); return; }
    setSaving(true);
    const payload = { ...form, price_offered: form.price_offered ? parseFloat(form.price_offered) : null, is_unassigned: true, potential_unit_ids: [] };
    try {
      if (editing) { await updateLead(editing.id, payload); toast.success('Lead saved as unassigned'); }
      else { await createLead(payload); toast.success('Lead saved as unassigned'); }
      setDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save lead');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this lead?')) return;
    try { await deleteLead(id); toast.success('Lead deleted'); fetchData(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Failed to delete lead'); }
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
    if (!notifDate) { toast.error('Please enter a notification date'); return; }
    try {
      await createNotification({
        lead_id: notifDialog.leadId, lead_name: notifDialog.leadName,
        stage_name: notifDialog.stageName, notification_date: notifDate,
        message: `${notifDialog.leadName} - ${notifDialog.stageName}`
      });
      toast.success('Notification created');
      refreshNotifications();
    } catch { toast.error('Failed to create notification'); }
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
    } catch { toast.error('Failed to save note'); }
  };

  // Shared row handler props
  const rowHandlers = {
    onAdvanceStage: advanceStage,
    onConvert: handleConvertToTenant,
    onEdit: openEdit,
    onDelete: handleDelete,
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
          {/* Unassigned Leads */}
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
                      <LeadRow lead={lead} unitMap={unitMap} {...rowHandlers} />
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

          {/* Leads by Property */}
          {Object.entries(leadsByProperty).map(([propId, propLeads]) => {
            const prop = propMap[propId];
            const isOpen = expandedProps[propId] !== false;
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
                          <LeadRow key={lead.id} lead={lead} unitMap={unitMap} {...rowHandlers} />
                        ))}
                      </div>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })}

          {Object.keys(leadsByProperty).length === 0 && unassignedLeads.length > 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No property-assigned leads yet. Create a lead and assign units to see them grouped by property.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <LeadFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        form={form}
        setForm={setForm}
        onSave={handleSave}
        onSaveAsUnassigned={handleSaveAsUnassigned}
        saving={saving}
      />

      <NotificationDialog
        notifDialog={notifDialog}
        notifDate={notifDate}
        setNotifDate={setNotifDate}
        onCreateNotification={handleCreateNotification}
        onClose={() => { setNotifDialog(null); setNotifDate(''); }}
      />

      <UnassignedNoteDialog
        noteDialog={noteDialog}
        noteText={noteText}
        setNoteText={setNoteText}
        onSave={saveUnassignedNote}
        onClose={() => setNoteDialog(null)}
      />
    </div>
  );
}
