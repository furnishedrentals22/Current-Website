import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
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

  const eligibleTenants = useMemo(() => {
    if (!assignForm.start_date || !assignForm.end_date) return [];
    return tenants.filter(t => {
      if (!t.move_in_date || !t.move_out_date) return false;
      const overlaps = t.move_in_date <= assignForm.end_date && t.move_out_date >= assignForm.start_date;
      if (!overlaps) return false;
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
    });
  }, [tenants, assignForm.start_date, assignForm.end_date, buildingFilter, search, unitMap, propMap]);

  const handleTenantSelect = (tenantId) => {
    const t = tenants.find(x => x.id === tenantId);
    if (t) {
      setAssignForm(f => ({
        ...f,
        tenant_id: tenantId,
        tenant_name: t.name,
        property_id: t.property_id || '',
        unit_id: t.unit_id || '',
      }));
    }
  };

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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input type="date" value={assignForm.start_date} onChange={e => setAssignForm({ ...assignForm, start_date: e.target.value })} data-testid="parking-assign-start" />
            </div>
            <div className="space-y-2">
              <Label>End Date *</Label>
              <Input type="date" value={assignForm.end_date} onChange={e => setAssignForm({ ...assignForm, end_date: e.target.value })} data-testid="parking-assign-end" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Filter by Building</Label>
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

          <div className="space-y-2">
            <Label>Tenant *</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search tenants..." value={search} onChange={e => setSearch(e.target.value)} data-testid="parking-assign-search" />
            </div>
            <div className="max-h-40 overflow-y-auto border rounded-md" data-testid="parking-assign-tenant-list">
              {!assignForm.start_date || !assignForm.end_date ? (
                <p className="px-3 py-4 text-xs text-muted-foreground text-center">Select dates first to see eligible tenants</p>
              ) : eligibleTenants.length === 0 ? (
                <p className="px-3 py-4 text-xs text-muted-foreground text-center">No tenants staying during these dates</p>
              ) : eligibleTenants.map(t => {
                const unit = unitMap[t.unit_id];
                const prop = propMap[t.property_id];
                const isSelected = assignForm.tenant_id === t.id;
                return (
                  <button
                    key={t.id}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 border-b border-border/30 transition-colors ${isSelected ? 'bg-primary/10 font-medium' : ''}`}
                    onClick={() => handleTenantSelect(t.id)}
                    data-testid="parking-assign-tenant-option"
                  >
                    <span>{t.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      ({prop?.name || ''} - Unit {unit?.unit_number || '?'})
                    </span>
                  </button>
                );
              })}
            </div>
            {assignForm.tenant_id && (
              <p className="text-xs text-muted-foreground">Selected: <strong>{assignForm.tenant_name}</strong></p>
            )}
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
