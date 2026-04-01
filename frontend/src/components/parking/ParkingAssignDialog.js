import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, User, Calendar } from 'lucide-react';
import { useMemo, useState } from 'react';

export function ParkingAssignDialog({
  open, onClose, editing, assignForm, setAssignForm, onSave, saving,
  tenants, properties, unitMap, spotMap, propMap,
}) {
  const [search, setSearch] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('all');

  const spot = spotMap[assignForm.parking_spot_id];
  const spotLabel = spot
    ? (spot.spot_type === 'marlins_decal' ? `Decal #${spot.decal_number}` : `Spot #${spot.spot_number}`)
    : 'Unknown';

  // Show all tenants, filtered by search and building.
  // If dates are set, also show which tenants overlap those dates.
  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      if (!t.move_in_date || !t.move_out_date) return false;
      if (buildingFilter !== 'all' && t.property_id !== buildingFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const unit = unitMap[t.unit_id];
        const prop = propMap[t.property_id];
        if (
          !t.name?.toLowerCase().includes(q) &&
          !(unit?.unit_number || '').toLowerCase().includes(q) &&
          !(prop?.name || '').toLowerCase().includes(q)
        ) return false;
      }
      return true;
    }).sort((a, b) => {
      // Sort: active tenants first (by move_out_date descending)
      return (b.move_out_date || '').localeCompare(a.move_out_date || '');
    });
  }, [tenants, buildingFilter, search, unitMap, propMap]);

  const handleTenantSelect = (tenantId) => {
    const t = tenants.find(x => x.id === tenantId);
    if (t) {
      const updates = {
        tenant_id: tenantId,
        tenant_name: t.name,
        property_id: t.property_id || '',
        unit_id: t.unit_id || '',
      };
      // Auto-fill dates from tenant's lease if not already set or if changing tenant
      if (t.move_in_date && t.move_out_date) {
        updates.start_date = t.move_in_date;
        updates.end_date = t.move_out_date;
      }
      setAssignForm(f => ({ ...f, ...updates }));
    }
  };

  const selectedTenant = tenants.find(t => t.id === assignForm.tenant_id);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setSearch(''); setBuildingFilter('all'); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Assignment' : 'Assign Tenant'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Update this parking assignment.' : `Assign a tenant to ${spotLabel}.`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-3">
          {/* Tenant Selection - FIRST */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><User className="h-4 w-4" />Tenant *</Label>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search by tenant name, unit, or building..." value={search} onChange={e => setSearch(e.target.value)} data-testid="parking-assign-search" />
              </div>
              <Select value={buildingFilter} onValueChange={setBuildingFilter} data-testid="parking-assign-building-filter">
                <SelectTrigger className="h-9 text-sm" data-testid="parking-assign-building-trigger">
                  <SelectValue placeholder="All Buildings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {properties.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}{p.building_id != null ? ` (#${p.building_id})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-44 overflow-y-auto border rounded-md" data-testid="parking-assign-tenant-list">
              {filteredTenants.length === 0 ? (
                <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                  {search ? 'No tenants match your search' : 'No tenants found'}
                </p>
              ) : filteredTenants.map(t => {
                const unit = unitMap[t.unit_id];
                const prop = propMap[t.property_id];
                const isSelected = assignForm.tenant_id === t.id;
                const today = new Date().toISOString().split('T')[0];
                const isActive = t.move_out_date >= today;
                return (
                  <button
                    key={t.id}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 border-b border-border/30 transition-colors ${isSelected ? 'bg-primary/10 font-medium' : ''}`}
                    onClick={() => handleTenantSelect(t.id)}
                    data-testid="parking-assign-tenant-option"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span>{t.name}</span>
                        {t.is_m2m && <span className="ml-1.5 inline-flex items-center px-1 py-0 rounded text-[9px] font-medium bg-amber-100 text-amber-800 border border-amber-200">M2M</span>}
                        <span className="text-muted-foreground ml-2 text-xs">
                          ({prop?.name || ''} - Unit {unit?.unit_number || '?'})
                        </span>
                      </div>
                      {!isActive && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Past</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {t.move_in_date} → {t.move_out_date}
                    </div>
                  </button>
                );
              })}
            </div>
            {assignForm.tenant_id && selectedTenant && (
              <p className="text-xs text-muted-foreground">
                Selected: <strong>{assignForm.tenant_name}</strong>
                {selectedTenant.move_in_date && (
                  <span className="ml-1">({selectedTenant.move_in_date} → {selectedTenant.move_out_date})</span>
                )}
              </p>
            )}
          </div>

          {/* Dates - auto-filled from tenant but manually editable */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Dates *
              {assignForm.tenant_id && <span className="text-xs text-muted-foreground font-normal ml-1">(auto-filled from tenant, editable)</span>}
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Start Date</Label>
                <Input type="date" value={assignForm.start_date} onChange={e => setAssignForm({ ...assignForm, start_date: e.target.value })} data-testid="parking-assign-start" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">End Date</Label>
                <Input type="date" value={assignForm.end_date} onChange={e => setAssignForm({ ...assignForm, end_date: e.target.value })} data-testid="parking-assign-end" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={assignForm.notes} onChange={e => setAssignForm({ ...assignForm, notes: e.target.value })} rows={2} data-testid="parking-assign-notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave} disabled={saving} data-testid="parking-assign-save">
            {saving ? 'Saving...' : editing ? 'Update' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
