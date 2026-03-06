import { useState, useEffect } from 'react';
import { getProperties, createProperty, updateProperty, deleteProperty, getUnits, createUnit, updateUnit, deleteUnit } from '@/lib/api';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Building2, Plus, Pencil, Trash2, X, ChevronDown, ChevronRight, Home, MapPin, User, Phone, Mail, PawPrint, Car, Info } from 'lucide-react';
import { toast } from 'sonner';

const UNIT_SIZES = ['0/1', '1/1', '2/1', '2/2', '3/1', '3/2', '3/3', 'other'];

const emptyPropertyForm = {
  name: '', address: '', owner_manager_name: '', owner_manager_phone: '',
  owner_manager_email: '', available_parking: '', pets_permitted: false,
  pet_notes: '', building_amenities: [], additional_notes: '', building_id: ''
};

const emptyUnitForm = {
  property_id: '', unit_number: '', unit_size: '', unit_size_custom: '',
  base_rent: '', additional_monthly_costs: [], availability_start_date: '', close_date: ''
};

export default function PropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [unitsByProperty, setUnitsByProperty] = useState({});
  const [loading, setLoading] = useState(true);

  // Property dialog
  const [propDialogOpen, setPropDialogOpen] = useState(false);
  const [editingProp, setEditingProp] = useState(null);
  const [propForm, setPropForm] = useState(emptyPropertyForm);
  const [amenityInput, setAmenityInput] = useState('');
  const [savingProp, setSavingProp] = useState(false);

  // Unit dialog
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitForm, setUnitForm] = useState(emptyUnitForm);
  const [savingUnit, setSavingUnit] = useState(false);

  // Expanded states
  const [expandedDetails, setExpandedDetails] = useState({});
  const [expandedUnits, setExpandedUnits] = useState({});

  const fetchData = async () => {
    try {
      const [props, units] = await Promise.all([getProperties(), getUnits()]);
      setProperties(props);
      const grouped = {};
      units.forEach(u => {
        if (!grouped[u.property_id]) grouped[u.property_id] = [];
        grouped[u.property_id].push(u);
      });
      setUnitsByProperty(grouped);
    } catch (e) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleDetails = (id) => setExpandedDetails(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleUnits = (id) => setExpandedUnits(prev => ({ ...prev, [id]: !prev[id] }));

  // ---- Property CRUD ----
  const openCreateProp = () => {
    setEditingProp(null);
    setPropForm(emptyPropertyForm);
    setAmenityInput('');
    setPropDialogOpen(true);
  };

  const openEditProp = (prop) => {
    setEditingProp(prop);
    setPropForm({
      name: prop.name || '', address: prop.address || '',
      owner_manager_name: prop.owner_manager_name || '',
      owner_manager_phone: prop.owner_manager_phone || '',
      owner_manager_email: prop.owner_manager_email || '',
      available_parking: prop.available_parking || '',
      pets_permitted: prop.pets_permitted || false,
      pet_notes: prop.pet_notes || '',
      building_amenities: prop.building_amenities || [],
      additional_notes: prop.additional_notes || '',
      building_id: prop.building_id != null ? prop.building_id : ''
    });
    setAmenityInput('');
    setPropDialogOpen(true);
  };

  const handleSaveProp = async () => {
    if (!propForm.name || !propForm.address) {
      toast.error('Name and address are required');
      return;
    }
    setSavingProp(true);
    const payload = {
      ...propForm,
      building_id: propForm.building_id !== '' ? parseInt(propForm.building_id, 10) : null
    };
    try {
      if (editingProp) {
        await updateProperty(editingProp.id, payload);
        toast.success('Property updated');
      } else {
        await createProperty(payload);
        toast.success('Property created');
      }
      setPropDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save property');
    } finally {
      setSavingProp(false);
    }
  };

  const handleDeleteProp = async (id) => {
    if (!window.confirm('Delete this property? All units must be removed first.')) return;
    try {
      await deleteProperty(id);
      toast.success('Property deleted');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to delete property');
    }
  };

  const addAmenity = () => {
    if (amenityInput.trim()) {
      setPropForm({ ...propForm, building_amenities: [...propForm.building_amenities, amenityInput.trim()] });
      setAmenityInput('');
    }
  };

  const removeAmenity = (idx) => {
    setPropForm({ ...propForm, building_amenities: propForm.building_amenities.filter((_, i) => i !== idx) });
  };

  // ---- Unit CRUD ----
  const openCreateUnit = (propertyId) => {
    setEditingUnit(null);
    setUnitForm({ ...emptyUnitForm, property_id: propertyId });
    setUnitDialogOpen(true);
  };

  const openEditUnit = (unit) => {
    setEditingUnit(unit);
    setUnitForm({
      property_id: unit.property_id || '',
      unit_number: unit.unit_number || '',
      unit_size: unit.unit_size || '',
      unit_size_custom: unit.unit_size_custom || '',
      base_rent: unit.base_rent || '',
      additional_monthly_costs: unit.additional_monthly_costs || [],
      availability_start_date: unit.availability_start_date || '',
      close_date: unit.close_date || ''
    });
    setUnitDialogOpen(true);
  };

  const addCost = () => {
    setUnitForm({ ...unitForm, additional_monthly_costs: [...unitForm.additional_monthly_costs, { name: '', amount: '' }] });
  };

  const updateCost = (idx, field, value) => {
    const costs = [...unitForm.additional_monthly_costs];
    costs[idx] = { ...costs[idx], [field]: field === 'amount' ? parseFloat(value) || '' : value };
    setUnitForm({ ...unitForm, additional_monthly_costs: costs });
  };

  const removeCost = (idx) => {
    setUnitForm({ ...unitForm, additional_monthly_costs: unitForm.additional_monthly_costs.filter((_, i) => i !== idx) });
  };

  const handleSaveUnit = async () => {
    if (!unitForm.property_id || !unitForm.unit_number || !unitForm.unit_size || !unitForm.base_rent || !unitForm.availability_start_date) {
      toast.error('Please fill all required fields');
      return;
    }
    setSavingUnit(true);
    const payload = {
      ...unitForm,
      base_rent: parseFloat(unitForm.base_rent),
      additional_monthly_costs: unitForm.additional_monthly_costs.filter(c => c.name && c.amount).map(c => ({ name: c.name, amount: parseFloat(c.amount) })),
      close_date: unitForm.close_date || null
    };
    try {
      if (editingUnit) {
        await updateUnit(editingUnit.id, payload);
        toast.success('Unit updated');
      } else {
        await createUnit(payload);
        toast.success('Unit created');
      }
      setUnitDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save unit');
    } finally {
      setSavingUnit(false);
    }
  };

  const handleDeleteUnit = async (id) => {
    if (!window.confirm('Delete this unit? All tenants must be removed first.')) return;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Properties</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your buildings, units, and details</p>
        </div>
        <Button onClick={openCreateProp} data-testid="properties-create-button">
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
            <Button className="mt-4" onClick={openCreateProp}>Add Property</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {properties.map(prop => {
            const units = unitsByProperty[prop.id] || [];
            const isDetailsOpen = expandedDetails[prop.id];
            const isUnitsOpen = expandedUnits[prop.id];

            return (
              <Card key={prop.id} className="overflow-hidden" data-testid="properties-table-row">
                {/* Property Summary Header - Always Visible */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="font-heading text-lg font-semibold tracking-tight truncate">{prop.name}</h2>
                        {prop.building_id != null && (
                          <Badge variant="outline" className="text-xs flex-shrink-0 tabular-nums">
                            Bldg #{prop.building_id}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs flex-shrink-0 tabular-nums">
                          {units.length} {units.length === 1 ? 'Unit' : 'Units'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{prop.address}</span>
                      </div>
                      {/* Unit badges */}
                      {units.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {units.map(u => (
                            <Badge key={u.id} variant="outline" className="text-xs font-normal gap-1">
                              <Home className="h-3 w-3" />
                              {u.unit_number}
                              <span className="text-muted-foreground">({u.unit_size === 'other' ? u.unit_size_custom : u.unit_size})</span>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditProp(prop)} data-testid="property-edit-button">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDeleteProp(prop.id)} data-testid="property-delete-button">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expand toggles */}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-border/50">
                    <Button
                      variant={isDetailsOpen ? "secondary" : "ghost"}
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => toggleDetails(prop.id)}
                      data-testid="property-details-toggle"
                    >
                      {isDetailsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      <Info className="h-3.5 w-3.5" />
                      Property Details
                    </Button>
                    <Button
                      variant={isUnitsOpen ? "secondary" : "ghost"}
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => toggleUnits(prop.id)}
                      data-testid="property-units-toggle"
                    >
                      {isUnitsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      <Home className="h-3.5 w-3.5" />
                      Units ({units.length})
                    </Button>
                  </div>
                </div>

                {/* Expandable: Property Details */}
                {isDetailsOpen && (
                  <div className="px-5 pb-5 border-t bg-muted/20">
                    <div className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <User className="h-3.5 w-3.5" /> Owner / Manager
                        </div>
                        <p className="text-sm font-medium">{prop.owner_manager_name || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" /> Phone
                        </div>
                        <p className="text-sm">{prop.owner_manager_phone || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" /> Email
                        </div>
                        <p className="text-sm">{prop.owner_manager_email || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <Car className="h-3.5 w-3.5" /> Parking
                        </div>
                        <p className="text-sm">{prop.available_parking || 'Not specified'}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <PawPrint className="h-3.5 w-3.5" /> Pets
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={prop.pets_permitted ? 'default' : 'secondary'} className="text-xs">
                            {prop.pets_permitted ? 'Permitted' : 'Not Permitted'}
                          </Badge>
                          {prop.pets_permitted && prop.pet_notes && (
                            <span className="text-xs text-muted-foreground">{prop.pet_notes}</span>
                          )}
                        </div>
                      </div>
                      {prop.building_amenities && prop.building_amenities.length > 0 && (
                        <div className="space-y-1 md:col-span-2 lg:col-span-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amenities</p>
                          <div className="flex flex-wrap gap-1.5">
                            {prop.building_amenities.map((a, i) => (
                              <Badge key={i} variant="outline" className="text-xs font-normal">{a}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {prop.additional_notes && (
                      <div className="mt-4 pt-3 border-t border-border/50">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
                        <p className="text-sm text-muted-foreground">{prop.additional_notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Expandable: Units */}
                {isUnitsOpen && (
                  <div className="border-t">
                    <div className="px-5 py-3 flex items-center justify-between bg-muted/30">
                      <h3 className="text-sm font-semibold">Units</h3>
                      <Button size="sm" className="h-7 text-xs" onClick={() => openCreateUnit(prop.id)} data-testid="units-create-button">
                        <Plus className="h-3 w-3 mr-1" /> Add Unit
                      </Button>
                    </div>
                    {units.length === 0 ? (
                      <div className="px-5 py-8 text-center">
                        <Home className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No units added yet</p>
                        <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => openCreateUnit(prop.id)}>
                          Add First Unit
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/20">
                              <TableHead className="text-xs font-semibold uppercase tracking-wide">Unit #</TableHead>
                              <TableHead className="text-xs font-semibold uppercase tracking-wide">Size</TableHead>
                              <TableHead className="text-xs font-semibold uppercase tracking-wide">Base Rent</TableHead>
                              <TableHead className="text-xs font-semibold uppercase tracking-wide">Add'l Costs</TableHead>
                              <TableHead className="text-xs font-semibold uppercase tracking-wide">Available From</TableHead>
                              <TableHead className="text-xs font-semibold uppercase tracking-wide">Close Date</TableHead>
                              <TableHead className="text-xs font-semibold uppercase tracking-wide w-[80px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {units.map(u => {
                              const addlTotal = (u.additional_monthly_costs || []).reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
                              return (
                                <TableRow key={u.id} className="hover:bg-muted/30" data-testid="units-table-row">
                                  <TableCell className="font-medium">{u.unit_number}</TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className="text-xs">
                                      {u.unit_size === 'other' ? u.unit_size_custom : u.unit_size}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="tabular-nums">${parseFloat(u.base_rent).toLocaleString()}</TableCell>
                                  <TableCell className="tabular-nums">
                                    {addlTotal > 0 ? (
                                      <span className="text-xs">
                                        +${addlTotal.toLocaleString()}
                                        <span className="text-muted-foreground ml-1">
                                          ({(u.additional_monthly_costs || []).map(c => c.name).join(', ')})
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm">{u.availability_start_date}</TableCell>
                                  <TableCell className="text-sm">{u.close_date || '-'}</TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditUnit(u)}>
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteUnit(u.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Property Create/Edit Dialog */}
      <Dialog open={propDialogOpen} onOpenChange={setPropDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editingProp ? 'Edit Property' : 'Add Property'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Property Name *</Label>
                <Input value={propForm.name} onChange={e => setPropForm({...propForm, name: e.target.value})} data-testid="property-name-input" />
              </div>
              <div className="space-y-2">
                <Label>Address *</Label>
                <Input value={propForm.address} onChange={e => setPropForm({...propForm, address: e.target.value})} data-testid="property-address-input" />
              </div>
              <div className="space-y-2">
                <Label>Building ID</Label>
                <Input type="number" value={propForm.building_id} onChange={e => setPropForm({...propForm, building_id: e.target.value})} placeholder="e.g. 1, 2, 3" data-testid="property-building-id-input" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Owner/Manager Name *</Label>
                <Input value={propForm.owner_manager_name} onChange={e => setPropForm({...propForm, owner_manager_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input value={propForm.owner_manager_phone} onChange={e => setPropForm({...propForm, owner_manager_phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={propForm.owner_manager_email} onChange={e => setPropForm({...propForm, owner_manager_email: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Available Parking</Label>
                <Input value={propForm.available_parking} onChange={e => setPropForm({...propForm, available_parking: e.target.value})} placeholder="e.g. 2 spots, street parking" />
              </div>
              <div className="space-y-2">
                <Label>Pets Permitted</Label>
                <div className="flex items-center gap-3 pt-2">
                  <Switch checked={propForm.pets_permitted} onCheckedChange={v => setPropForm({...propForm, pets_permitted: v})} data-testid="property-pets-toggle" />
                  <span className="text-sm">{propForm.pets_permitted ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
            {propForm.pets_permitted && (
              <div className="space-y-2">
                <Label>Pet Notes</Label>
                <Input value={propForm.pet_notes} onChange={e => setPropForm({...propForm, pet_notes: e.target.value})} placeholder="Weight limits, breed restrictions..." />
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
                {propForm.building_amenities.map((a, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {a}
                    <button onClick={() => removeAmenity(i)} className="ml-1"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea value={propForm.additional_notes} onChange={e => setPropForm({...propForm, additional_notes: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPropDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveProp} disabled={savingProp} data-testid="property-save-button">
              {savingProp ? 'Saving...' : (editingProp ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unit Create/Edit Dialog */}
      <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editingUnit ? 'Edit Unit' : 'Add Unit'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit Number *</Label>
                <Input value={unitForm.unit_number} onChange={e => setUnitForm({...unitForm, unit_number: e.target.value})} data-testid="unit-number-input" />
              </div>
              <div className="space-y-2">
                <Label>Unit Size *</Label>
                <Select value={unitForm.unit_size} onValueChange={v => setUnitForm({...unitForm, unit_size: v})}>
                  <SelectTrigger data-testid="unit-size-select"><SelectValue placeholder="Select size" /></SelectTrigger>
                  <SelectContent>
                    {UNIT_SIZES.map(s => (<SelectItem key={s} value={s}>{s === 'other' ? 'Other' : s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {unitForm.unit_size === 'other' && (
              <div className="space-y-2">
                <Label>Custom Size</Label>
                <Input value={unitForm.unit_size_custom} onChange={e => setUnitForm({...unitForm, unit_size_custom: e.target.value})} placeholder="e.g. Studio, 4/2" />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Base Rent *</Label>
                <Input type="number" value={unitForm.base_rent} onChange={e => setUnitForm({...unitForm, base_rent: e.target.value})} data-testid="unit-rent-input" />
              </div>
              <div className="space-y-2">
                <Label>Availability Start Date *</Label>
                <Input type="date" value={unitForm.availability_start_date} onChange={e => setUnitForm({...unitForm, availability_start_date: e.target.value})} data-testid="unit-avail-date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Close Date (optional)</Label>
              <Input type="date" value={unitForm.close_date} onChange={e => setUnitForm({...unitForm, close_date: e.target.value})} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Additional Monthly Costs</Label>
                <Button type="button" variant="secondary" size="sm" onClick={addCost} data-testid="units-costs-add-row-button">
                  <Plus className="h-3 w-3 mr-1" /> Add Cost
                </Button>
              </div>
              {unitForm.additional_monthly_costs.map((cost, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                  <Input className="flex-1" placeholder="Cost name" value={cost.name} onChange={e => updateCost(idx, 'name', e.target.value)} />
                  <Input className="w-32" type="number" placeholder="Amount" value={cost.amount} onChange={e => updateCost(idx, 'amount', e.target.value)} />
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => removeCost(idx)}><X className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnitDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveUnit} disabled={savingUnit} data-testid="unit-save-button">
              {savingUnit ? 'Saving...' : (editingUnit ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
