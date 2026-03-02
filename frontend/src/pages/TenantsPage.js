import { useState, useEffect } from 'react';
import { getTenants, createTenant, updateTenant, deleteTenant, getProperties, getUnits } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = {
  property_id: '', unit_id: '', name: '', phone: '', email: '',
  move_in_date: '', move_out_date: '', is_airbnb_vrbo: false,
  deposit_amount: '', deposit_date: '', monthly_rent: '',
  partial_first_month: '', partial_last_month: '',
  pets: '', parking: '', notes: '', total_rent: ''
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [allUnits, setAllUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [t, p, u] = await Promise.all([getTenants(), getProperties(), getUnits()]);
      setTenants(t);
      setProperties(p);
      setAllUnits(u);
    } catch (e) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const propMap = {};
  properties.forEach(p => { propMap[p.id] = p.name; });
  const unitMap = {};
  allUnits.forEach(u => { unitMap[u.id] = u; });

  const filteredUnits = allUnits.filter(u => u.property_id === form.property_id);

  const openCreate = (prefill = {}) => {
    setEditing(null);
    setForm({ ...emptyForm, ...prefill });
    setDialogOpen(true);
  };

  const openEdit = (tenant) => {
    setEditing(tenant);
    setForm({
      property_id: tenant.property_id || '',
      unit_id: tenant.unit_id || '',
      name: tenant.name || '',
      phone: tenant.phone || '',
      email: tenant.email || '',
      move_in_date: tenant.move_in_date || '',
      move_out_date: tenant.move_out_date || '',
      is_airbnb_vrbo: tenant.is_airbnb_vrbo || false,
      deposit_amount: tenant.deposit_amount || '',
      deposit_date: tenant.deposit_date || '',
      monthly_rent: tenant.monthly_rent || '',
      partial_first_month: tenant.partial_first_month || '',
      partial_last_month: tenant.partial_last_month || '',
      pets: tenant.pets || '',
      parking: tenant.parking || '',
      notes: tenant.notes || '',
      total_rent: tenant.total_rent || ''
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.property_id || !form.unit_id || !form.name || !form.move_in_date || !form.move_out_date) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!form.is_airbnb_vrbo && !form.monthly_rent) {
      toast.error('Monthly rent is required for long-term tenants');
      return;
    }
    if (form.is_airbnb_vrbo && !form.total_rent) {
      toast.error('Total rent is required for Airbnb/VRBO tenants');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      deposit_amount: form.deposit_amount ? parseFloat(form.deposit_amount) : null,
      monthly_rent: form.monthly_rent ? parseFloat(form.monthly_rent) : null,
      partial_first_month: form.partial_first_month ? parseFloat(form.partial_first_month) : null,
      partial_last_month: form.partial_last_month ? parseFloat(form.partial_last_month) : null,
      total_rent: form.total_rent ? parseFloat(form.total_rent) : null,
      deposit_date: form.deposit_date || null
    };
    try {
      if (editing) {
        await updateTenant(editing.id, payload);
        toast.success('Tenant updated');
      } else {
        await createTenant(payload);
        toast.success('Tenant created');
      }
      setDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save tenant');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this tenant?')) return;
    try {
      await deleteTenant(id);
      toast.success('Tenant deleted');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to delete tenant');
    }
  };

  // Calculate Airbnb nights display
  const calcNights = () => {
    if (form.move_in_date && form.move_out_date) {
      const d1 = new Date(form.move_in_date);
      const d2 = new Date(form.move_out_date);
      const diff = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 0;
    }
    return 0;
  };

  const nights = calcNights();
  const perNight = form.total_rent && nights > 0 ? (parseFloat(form.total_rent) / nights).toFixed(2) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Tenants</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage tenant assignments and leases</p>
        </div>
        <Button onClick={() => openCreate()} data-testid="tenants-create-button">
          <Plus className="h-4 w-4 mr-2" /> Add Tenant
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">Loading...</div>
      ) : tenants.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-heading text-lg font-semibold">No tenants yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Add tenants to your units</p>
            <Button className="mt-4" onClick={() => openCreate()}>Add Tenant</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Name</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Property</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Unit</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Type</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Move In</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Move Out</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Rent</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map(t => (
                <TableRow key={t.id} className="hover:bg-muted/40" data-testid="tenants-table-row">
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-sm">{propMap[t.property_id] || '-'}</TableCell>
                  <TableCell className="text-sm">{unitMap[t.unit_id]?.unit_number || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={t.is_airbnb_vrbo ? 'default' : 'secondary'} className={`text-xs ${t.is_airbnb_vrbo ? 'bg-sky-100 text-sky-900 border-sky-200' : ''}`}>
                      {t.is_airbnb_vrbo ? 'Airbnb/VRBO' : 'Long-term'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{t.move_in_date}</TableCell>
                  <TableCell className="text-sm">{t.move_out_date}</TableCell>
                  <TableCell className="tabular-nums">
                    {t.is_airbnb_vrbo ? `$${parseFloat(t.total_rent || 0).toLocaleString()} total` : `$${parseFloat(t.monthly_rent || 0).toLocaleString()}/mo`}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? 'Edit Tenant' : 'Add Tenant'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Property *</Label>
                <Select value={form.property_id} onValueChange={v => setForm({...form, property_id: v, unit_id: ''})}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    {properties.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit *</Label>
                <Select value={form.unit_id} onValueChange={v => setForm({...form, unit_id: v})} disabled={!form.property_id}>
                  <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>
                    {filteredUnits.map(u => (<SelectItem key={u.id} value={u.id}>{u.unit_number} ({u.unit_size})</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} data-testid="tenant-name-input" />
              </div>
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
                <Label>Move-in Date *</Label>
                <Input type="date" value={form.move_in_date} onChange={e => setForm({...form, move_in_date: e.target.value})} data-testid="tenant-movein-date" />
              </div>
              <div className="space-y-2">
                <Label>Move-out Date *</Label>
                <Input type="date" value={form.move_out_date} onChange={e => setForm({...form, move_out_date: e.target.value})} data-testid="tenant-moveout-date" />
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
              <Switch checked={form.is_airbnb_vrbo} onCheckedChange={v => setForm({...form, is_airbnb_vrbo: v})} data-testid="tenants-airbnb-toggle" />
              <Label className="cursor-pointer">Airbnb / VRBO</Label>
            </div>

            {!form.is_airbnb_vrbo ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Monthly Rent *</Label>
                    <Input type="number" value={form.monthly_rent} onChange={e => setForm({...form, monthly_rent: e.target.value})} data-testid="tenant-monthly-rent" />
                  </div>
                  <div className="space-y-2">
                    <Label>Deposit Amount</Label>
                    <Input type="number" value={form.deposit_amount} onChange={e => setForm({...form, deposit_amount: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Deposit Date</Label>
                    <Input type="date" value={form.deposit_date} onChange={e => setForm({...form, deposit_date: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Partial First Month Override</Label>
                    <Input type="number" value={form.partial_first_month} onChange={e => setForm({...form, partial_first_month: e.target.value})} placeholder="Leave blank for full rent" />
                  </div>
                  <div className="space-y-2">
                    <Label>Partial Last Month Override</Label>
                    <Input type="number" value={form.partial_last_month} onChange={e => setForm({...form, partial_last_month: e.target.value})} placeholder="Leave blank for full rent" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pets</Label>
                    <Input value={form.pets} onChange={e => setForm({...form, pets: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Parking</Label>
                    <Input value={form.parking} onChange={e => setForm({...form, parking: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Total Rent *</Label>
                  <Input type="number" value={form.total_rent} onChange={e => setForm({...form, total_rent: e.target.value})} data-testid="tenant-total-rent" />
                </div>
                {nights > 0 && form.total_rent && (
                  <Card className="bg-sky-50 border-sky-200">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Total Nights</p>
                          <p className="font-heading text-xl font-semibold tabular-nums">{nights}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Per Night</p>
                          <p className="font-heading text-xl font-semibold tabular-nums">${perNight}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Total</p>
                          <p className="font-heading text-xl font-semibold tabular-nums">${parseFloat(form.total_rent).toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="tenant-save-button">{saving ? 'Saving...' : (editing ? 'Update' : 'Create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
