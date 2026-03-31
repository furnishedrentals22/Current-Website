import { useState, useEffect, useMemo } from 'react';
import { getProperties, createProperty, updateProperty, deleteProperty, getUnits, createUnit, updateUnit, deleteUnit } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { PropertyFormDialog } from '@/components/properties/PropertyFormDialog';
import { UnitFormDialog } from '@/components/properties/UnitFormDialog';
import { PropertyCard } from '@/components/properties/PropertyCard';

const emptyPropertyForm = {
  name: '', address: '', owner_manager_name: '', owner_manager_phone: '',
  owner_manager_email: '', available_parking: '', pets_permitted: false,
  pet_notes: '', building_amenities: [], additional_notes: '', building_id: '',
};

const emptyUnitForm = {
  property_id: '', unit_number: '', unit_size: '', unit_size_custom: '',
  base_rent: '', additional_monthly_costs: [], availability_start_date: '', close_date: ''
};

export default function PropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [unitsByProperty, setUnitsByProperty] = useState({});
  const [loading, setLoading] = useState(true);

  const [propDialogOpen, setPropDialogOpen] = useState(false);
  const [editingProp, setEditingProp] = useState(null);
  const [propForm, setPropForm] = useState(emptyPropertyForm);
  const [savingProp, setSavingProp] = useState(false);

  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitForm, setUnitForm] = useState(emptyUnitForm);
  const [savingUnit, setSavingUnit] = useState(false);

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
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const unitMap = useMemo(() => {
    const m = {};
    Object.values(unitsByProperty).forEach(arr => arr.forEach(u => { m[u.id] = u; }));
    return m;
  }, [unitsByProperty]);

  // ---- Property CRUD ----
  const openCreateProp = () => {
    setEditingProp(null);
    setPropForm(emptyPropertyForm);
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
            return (
              <PropertyCard
                key={prop.id}
                prop={prop}
                units={units}
                unitMap={unitMap}
                expanded={{
                  details: expandedDetails[prop.id],
                  units: expandedUnits[prop.id],
                }}
                toggles={{
                  details: () => setExpandedDetails(prev => ({ ...prev, [prop.id]: !prev[prop.id] })),
                  units: () => setExpandedUnits(prev => ({ ...prev, [prop.id]: !prev[prop.id] })),
                }}
                handlers={{
                  editProp: () => openEditProp(prop),
                  deleteProp: () => handleDeleteProp(prop.id),
                  createUnit: () => openCreateUnit(prop.id),
                  editUnit: openEditUnit,
                  deleteUnit: handleDeleteUnit,
                }}
              />
            );
          })}
        </div>
      )}

      <PropertyFormDialog
        open={propDialogOpen}
        onOpenChange={setPropDialogOpen}
        editing={editingProp}
        form={propForm}
        setForm={setPropForm}
        onSave={handleSaveProp}
        saving={savingProp}
      />

      <UnitFormDialog
        open={unitDialogOpen}
        onOpenChange={setUnitDialogOpen}
        editing={editingUnit}
        form={unitForm}
        setForm={setUnitForm}
        onSave={handleSaveUnit}
        saving={savingUnit}
      />
    </div>
  );
}
