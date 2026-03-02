import { useState, useEffect } from 'react';
import { getProperties, createProperty, updateProperty, deleteProperty } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = {
  name: '', address: '', owner_manager_name: '', owner_manager_phone: '',
  owner_manager_email: '', available_parking: '', pets_permitted: false,
  pet_notes: '', building_amenities: [], additional_notes: ''
};

export default function PropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [amenityInput, setAmenityInput] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProperties = async () => {
    try {
      const data = await getProperties();
      setProperties(data);
    } catch (e) {
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProperties(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (prop) => {
    setEditing(prop);
    setForm({
      name: prop.name || '', address: prop.address || '',
      owner_manager_name: prop.owner_manager_name || '',
      owner_manager_phone: prop.owner_manager_phone || '',
      owner_manager_email: prop.owner_manager_email || '',
      available_parking: prop.available_parking || '',
      pets_permitted: prop.pets_permitted || false,
      pet_notes: prop.pet_notes || '',
      building_amenities: prop.building_amenities || [],
      additional_notes: prop.additional_notes || ''
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.address) {
      toast.error('Name and address are required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateProperty(editing.id, form);
        toast.success('Property updated');
      } else {
        await createProperty(form);
        toast.success('Property created');
      }
      setDialogOpen(false);
      fetchProperties();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save property');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this property?')) return;
    try {
      await deleteProperty(id);
      toast.success('Property deleted');
      fetchProperties();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to delete property');
    }
  };

  const addAmenity = () => {
    if (amenityInput.trim()) {
      setForm({ ...form, building_amenities: [...form.building_amenities, amenityInput.trim()] });
      setAmenityInput('');
    }
  };

  const removeAmenity = (idx) => {
    setForm({ ...form, building_amenities: form.building_amenities.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Properties</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your buildings and properties</p>
        </div>
        <Button onClick={openCreate} data-testid="properties-create-button">
          <Plus className="h-4 w-4 mr-2" /> Add Property
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">Loading...</div>
      ) : properties.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-heading text-lg font-semibold">No properties yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Add your first property to get started</p>
            <Button className="mt-4" onClick={openCreate}>Add Property</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Name</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Address</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Manager</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Pets</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map(p => (
                <TableRow key={p.id} className="hover:bg-muted/40" data-testid="properties-table-row">
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-sm">{p.address}</TableCell>
                  <TableCell className="text-sm">{p.owner_manager_name}</TableCell>
                  <TableCell>
                    <Badge variant={p.pets_permitted ? 'default' : 'secondary'} className="text-xs">
                      {p.pets_permitted ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(p)} data-testid="property-edit-button">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDelete(p.id)} data-testid="property-delete-button">
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
            <DialogTitle className="font-heading">{editing ? 'Edit Property' : 'Add Property'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Property Name *</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} data-testid="property-name-input" />
              </div>
              <div className="space-y-2">
                <Label>Address *</Label>
                <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} data-testid="property-address-input" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Owner/Manager Name *</Label>
                <Input value={form.owner_manager_name} onChange={e => setForm({...form, owner_manager_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input value={form.owner_manager_phone} onChange={e => setForm({...form, owner_manager_phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={form.owner_manager_email} onChange={e => setForm({...form, owner_manager_email: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Available Parking</Label>
                <Input value={form.available_parking} onChange={e => setForm({...form, available_parking: e.target.value})} placeholder="e.g. 2 spots, street parking" />
              </div>
              <div className="space-y-2">
                <Label>Pets Permitted</Label>
                <div className="flex items-center gap-3 pt-2">
                  <Switch checked={form.pets_permitted} onCheckedChange={v => setForm({...form, pets_permitted: v})} data-testid="property-pets-toggle" />
                  <span className="text-sm">{form.pets_permitted ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
            {form.pets_permitted && (
              <div className="space-y-2">
                <Label>Pet Notes</Label>
                <Input value={form.pet_notes} onChange={e => setForm({...form, pet_notes: e.target.value})} placeholder="Weight limits, breed restrictions..." />
              </div>
            )}
            <div className="space-y-2">
              <Label>Building Amenities</Label>
              <div className="flex gap-2">
                <Input value={amenityInput} onChange={e => setAmenityInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
                  placeholder="Add amenity and press Enter" />
                <Button type="button" variant="secondary" onClick={addAmenity}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {form.building_amenities.map((a, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {a}
                    <button onClick={() => removeAmenity(i)} className="ml-1"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea value={form.additional_notes} onChange={e => setForm({...form, additional_notes: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="property-save-button">
              {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
