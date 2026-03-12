import { useState, useEffect } from 'react';
import { getUnits, createUnit, updateUnit, deleteUnit, getProperties, getDoorCodes, getMarketingLinks } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Home, Plus, Pencil, Trash2, X, ChevronDown, ChevronRight, Copy, ExternalLink, Lock, DoorOpen, Megaphone } from 'lucide-react';
import { toast } from 'sonner';

const UNIT_SIZES = ['0/1', '1/1', '2/1', '2/2', '3/1', '3/2', '3/3', 'other'];

const emptyForm = {
  property_id: '', unit_number: '', unit_size: '', unit_size_custom: '',
  base_rent: '', additional_monthly_costs: [], availability_start_date: '', close_date: ''
};

export default function UnitsPage() {
  const [units, setUnits] = useState([]);
  const [properties, setProperties] = useState([]);
  const [doorCodes, setDoorCodes] = useState([]);
  const [marketingLinks, setMarketingLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filterProp, setFilterProp] = useState('all');
  const [saving, setSaving] = useState(false);
  const [expandedUnit, setExpandedUnit] = useState(null);

  const fetchData = async () => {
    try {
      const [u, p, dc, ml] = await Promise.all([getUnits(), getProperties(), getDoorCodes(), getMarketingLinks()]);
      setUnits(u);
      setProperties(p);
      setDoorCodes(dc);
      setMarketingLinks(ml);
    } catch (e) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const propMap = {};
  properties.forEach(p => { propMap[p.id] = p; });
  const codeMap = {};
  doorCodes.forEach(dc => { codeMap[dc.unit_id] = dc; });
  const linkMap = {};
  marketingLinks.forEach(ml => { linkMap[ml.unit_id] = ml; });

  const filtered = filterProp === 'all' ? units : units.filter(u => u.property_id === filterProp);

  // Sort by property building_id first, then unit_number
  const sortedProps = [...properties].sort((a, b) => {
    const aId = a.building_id != null ? a.building_id : 99999;
    const bId = b.building_id != null ? b.building_id : 99999;
    if (aId !== bId) return aId - bId;
    return (a.name || '').localeCompare(b.name || '');
  });

  const groupedByProp = {};
  filtered.forEach(u => {
    const pid = u.property_id;
    if (!groupedByProp[pid]) groupedByProp[pid] = [];
    groupedByProp[pid].push(u);
  });
  // Sort units numerically within each group
  Object.values(groupedByProp).forEach(arr => arr.sort((a, b) => {
    const aNum = parseInt(a.unit_number, 10);
    const bNum = parseInt(b.unit_number, 10);
    if (isNaN(aNum) && isNaN(bNum)) return 0;
    if (isNaN(aNum)) return 1;
    if (isNaN(bNum)) return -1;
    return aNum - bNum;
  }));

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, property_id: filterProp !== 'all' ? filterProp : '' });
    setDialogOpen(true);
  };

  const openEdit = (unit) => {
    setEditing(unit);
    setForm({
      property_id: unit.property_id || '',
      unit_number: unit.unit_number || '',
      unit_size: unit.unit_size || '',
      unit_size_custom: unit.unit_size_custom || '',
      base_rent: unit.base_rent || '',
      additional_monthly_costs: unit.additional_monthly_costs || [],
      availability_start_date: unit.availability_start_date || '',
      close_date: unit.close_date || ''
    });
    setDialogOpen(true);
  };

  const addCost = () => {
    setForm({ ...form, additional_monthly_costs: [...form.additional_monthly_costs, { name: '', amount: '' }] });
  };

  const updateCost = (idx, field, value) => {
    const costs = [...form.additional_monthly_costs];
    costs[idx] = { ...costs[idx], [field]: field === 'amount' ? parseFloat(value) || '' : value };
    setForm({ ...form, additional_monthly_costs: costs });
  };

  const removeCost = (idx) => {
    setForm({ ...form, additional_monthly_costs: form.additional_monthly_costs.filter((_, i) => i !== idx) });
  };

  const handleSave = async () => {
    if (!form.property_id || !form.unit_number || !form.unit_size || !form.base_rent || !form.availability_start_date) {
      toast.error('Please fill all required fields');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      base_rent: parseFloat(form.base_rent),
      additional_monthly_costs: form.additional_monthly_costs.filter(c => c.name && c.amount).map(c => ({ name: c.name, amount: parseFloat(c.amount) })),
      close_date: form.close_date || null
    };
    try {
      if (editing) {
        await updateUnit(editing.id, payload);
        toast.success('Unit updated');
      } else {
        await createUnit(payload);
        toast.success('Unit created');
      }
      setDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save unit');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this unit?')) return;
    try {
      await deleteUnit(id);
      toast.success('Unit deleted');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to delete unit');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Units</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage units across your properties</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterProp} onValueChange={setFilterProp}>
            <SelectTrigger className="w-[200px]" data-testid="units-property-filter">
              <SelectValue placeholder="Filter by property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} data-testid="units-create-button">
            <Plus className="h-4 w-4 mr-2" /> Add Unit
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Home className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-heading text-lg font-semibold">No units yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Add units to your properties</p>
            <Button className="mt-4" onClick={openCreate}>Add Unit</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedProps.filter(p => groupedByProp[p.id]).map(prop => {
            const propUnits = groupedByProp[prop.id] || [];
            return (
              <Card key={prop.id} className="overflow-hidden" data-testid={`units-property-group-${prop.id}`}>
                <div className="px-4 py-3 bg-slate-100 border-b border-border/50 flex items-center gap-2">
                  <span className="text-sm font-semibold">{prop.name}</span>
                  {prop.building_id != null && <Badge variant="outline" className="text-xs">Bldg #{prop.building_id}</Badge>}
                  <Badge variant="secondary" className="text-xs">{propUnits.length} units</Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Unit #</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Size</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Base Rent</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Available From</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Close Date</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {propUnits.map((u, idx) => {
                      const codes = codeMap[u.id];
                      const mlinks = linkMap[u.id];
                      const hasInfo = codes || mlinks;
                      const isExpanded = expandedUnit === u.id;
                      const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                      return (
                        <>
                        <TableRow key={u.id} className={`${rowBg} hover:bg-muted/40 ${hasInfo ? 'cursor-pointer' : ''}`} data-testid="units-table-row"
                          onClick={() => hasInfo && setExpandedUnit(isExpanded ? null : u.id)}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1.5">
                              {hasInfo && (isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />)}
                              {u.unit_number}
                              {codes && <DoorOpen className="h-3 w-3 text-muted-foreground" />}
                              {mlinks && <Megaphone className="h-3 w-3 text-muted-foreground" />}
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="secondary">{u.unit_size === 'other' ? u.unit_size_custom : u.unit_size}</Badge></TableCell>
                          <TableCell className="tabular-nums">${parseFloat(u.base_rent).toLocaleString()}</TableCell>
                          <TableCell className="text-sm">{u.availability_start_date}</TableCell>
                          <TableCell className="text-sm">{u.close_date || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDelete(u.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${u.id}-detail`} className="bg-amber-50/40">
                            <TableCell colSpan={6} className="p-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {codes && (
                                  <div data-testid="unit-door-codes-section">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1"><DoorOpen className="h-3.5 w-3.5" />Door Codes</p>
                                    <div className="grid grid-cols-5 gap-1.5">
                                      <div className="text-xs"><span className="text-muted-foreground block">Admin</span><span className="font-mono flex items-center gap-0.5"><Lock className="h-3 w-3" />****</span></div>
                                      <div className="text-xs"><span className="text-muted-foreground block">Housekeeping</span><span className="font-mono">{codes.housekeeping_code || '-'}</span></div>
                                      <div className="text-xs"><span className="text-muted-foreground block">Guest</span><span className="font-mono font-bold text-sm">{codes.guest_code || '-'}</span></div>
                                      <div className="text-xs"><span className="text-muted-foreground block">Backup 1</span><span className="font-mono">{codes.backup_code_1 || '-'}</span></div>
                                      <div className="text-xs"><span className="text-muted-foreground block">Backup 2</span><span className="font-mono">{codes.backup_code_2 || '-'}</span></div>
                                    </div>
                                  </div>
                                )}
                                {mlinks && (
                                  <div data-testid="unit-marketing-links-section">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1"><Megaphone className="h-3.5 w-3.5" />Marketing Links</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {mlinks.airbnb_link && <UnitLinkBadge label="Airbnb" url={mlinks.airbnb_link} />}
                                      {mlinks.furnished_finder_link && <UnitLinkBadge label="Furnished Finder" url={mlinks.furnished_finder_link} />}
                                      {mlinks.photos_link && <UnitLinkBadge label="Photos" url={mlinks.photos_link} />}
                                      {mlinks.additional_links?.map((al, i) => <UnitLinkBadge key={i} label={al.name} url={al.url} />)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? 'Edit Unit' : 'Add Unit'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Property *</Label>
                <Select value={form.property_id} onValueChange={v => setForm({...form, property_id: v})}>
                  <SelectTrigger data-testid="unit-property-select"><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    {properties.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit Number *</Label>
                <Input value={form.unit_number} onChange={e => setForm({...form, unit_number: e.target.value})} data-testid="unit-number-input" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit Size *</Label>
                <Select value={form.unit_size} onValueChange={v => setForm({...form, unit_size: v})}>
                  <SelectTrigger data-testid="unit-size-select"><SelectValue placeholder="Select size" /></SelectTrigger>
                  <SelectContent>
                    {UNIT_SIZES.map(s => (<SelectItem key={s} value={s}>{s === 'other' ? 'Other' : s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              {form.unit_size === 'other' && (
                <div className="space-y-2">
                  <Label>Custom Size</Label>
                  <Input value={form.unit_size_custom} onChange={e => setForm({...form, unit_size_custom: e.target.value})} placeholder="e.g. Studio, 4/2" />
                </div>
              )}
              <div className="space-y-2">
                <Label>Base Rent *</Label>
                <Input type="number" value={form.base_rent} onChange={e => setForm({...form, base_rent: e.target.value})} data-testid="unit-rent-input" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Availability Start Date *</Label>
                <Input type="date" value={form.availability_start_date} onChange={e => setForm({...form, availability_start_date: e.target.value})} data-testid="unit-avail-date" />
              </div>
              <div className="space-y-2">
                <Label>Close Date (optional)</Label>
                <Input type="date" value={form.close_date} onChange={e => setForm({...form, close_date: e.target.value})} />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Additional Monthly Costs</Label>
                <Button type="button" variant="secondary" size="sm" onClick={addCost} data-testid="units-costs-add-row-button">
                  <Plus className="h-3 w-3 mr-1" /> Add Cost
                </Button>
              </div>
              {form.additional_monthly_costs.map((cost, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                  <Input className="flex-1" placeholder="Cost name" value={cost.name} onChange={e => updateCost(idx, 'name', e.target.value)} />
                  <Input className="w-32" type="number" placeholder="Amount" value={cost.amount} onChange={e => updateCost(idx, 'amount', e.target.value)} />
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => removeCost(idx)}><X className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="unit-save-button">{saving ? 'Saving...' : (editing ? 'Update' : 'Create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UnitLinkBadge({ label, url }) {
  const copy = () => { navigator.clipboard.writeText(url); toast.success('Link copied'); };
  return (
    <span className="inline-flex items-center gap-1 border rounded-full px-2 py-0.5 bg-card text-xs">
      <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5">
        <ExternalLink className="h-3 w-3" />{label}
      </a>
      <button className="hover:text-foreground text-muted-foreground" onClick={copy}><Copy className="h-3 w-3" /></button>
    </span>
  );
}
