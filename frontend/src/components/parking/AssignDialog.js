import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search } from 'lucide-react';

export function AssignDialog({ open, onClose, editing, assignForm, setAssignForm, onSave, saving, tenants, tenantSearch, setTenantSearch, spotMap, propMap, unitMap, properties, onTenantSelect }) {
  const spot = spotMap[assignForm.parking_spot_id];
  const isDecal = spot?.spot_type === 'decal';
  const spotPropIds = spot?.property_ids || [];
  const prop1542 = properties.find(p => p.name?.includes('1542') || p.address?.includes('1542'));

  let filteredTenants = tenants;
  if (isDecal && prop1542) {
    filteredTenants = tenants.filter(t => t.property_id === prop1542.id);
  } else if (!isDecal && spotPropIds.length > 0) {
    filteredTenants = tenants.filter(t => spotPropIds.includes(t.property_id) && t.has_parking);
  }
  if (tenantSearch.trim()) {
    const q = tenantSearch.toLowerCase();
    filteredTenants = filteredTenants.filter(t =>
      t.name?.toLowerCase().includes(q) ||
      (unitMap[t.unit_id]?.unit_number || '').toLowerCase().includes(q) ||
      (propMap[t.property_id]?.name || '').toLowerCase().includes(q)
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onClose(v); setTenantSearch(''); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Assignment' : 'Assign Tenant'}</DialogTitle>
          <DialogDescription>Assign a tenant to this parking space.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-3">
          <div className="space-y-2">
            <Label>Tenant *</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search tenants..."
                value={tenantSearch}
                onChange={e => setTenantSearch(e.target.value)}
                data-testid="assign-tenant-search"
              />
            </div>
            <div className="max-h-40 overflow-y-auto border rounded-md" data-testid="assign-tenant-list">
              {filteredTenants.length === 0 ? (
                <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                  {!isDecal && spotPropIds.length > 0 ? 'No tenants with parking enabled for this property' : 'No matching tenants'}
                </p>
              ) : filteredTenants.map(t => {
                const unit = unitMap[t.unit_id];
                const prop = propMap[t.property_id];
                const isSelected = assignForm.tenant_id === t.id;
                return (
                  <button
                    key={t.id}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 border-b border-border/30 transition-colors ${isSelected ? 'bg-primary/10 font-medium' : ''}`}
                    onClick={() => onTenantSelect(t.id)}
                    data-testid="assign-tenant-option"
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input type="date" value={assignForm.start_date} onChange={e => setAssignForm({ ...assignForm, start_date: e.target.value })} data-testid="assign-start-date" />
            </div>
            <div className="space-y-2">
              <Label>End Date *</Label>
              <Input type="date" value={assignForm.end_date} onChange={e => setAssignForm({ ...assignForm, end_date: e.target.value })} data-testid="assign-end-date" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={assignForm.notes} onChange={e => setAssignForm({ ...assignForm, notes: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={saving} data-testid="assign-save-btn">
            {saving ? 'Saving...' : editing ? 'Update' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
