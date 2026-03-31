import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronRight, Home, MapPin, User, Phone, Mail, PawPrint, Car, Info, Shield } from 'lucide-react';

export function PropertyCard({
  prop, units, decals, unitMap,
  expanded, toggles, handlers,
  decalInput, onDecalInputChange
}) {
  const { details: isDetailsOpen, units: isUnitsOpen, decals: isDecalsOpen } = expanded;

  return (
    <Card className="overflow-hidden border-l-4 border-l-primary/30 shadow-sm" data-testid="properties-table-row">
      {/* Property Summary Header */}
      <div className="p-5 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-heading text-lg font-semibold tracking-tight truncate">{prop.name}</h2>
              {prop.building_id != null && (
                <Badge variant="outline" className="text-xs flex-shrink-0 tabular-nums">Bldg #{prop.building_id}</Badge>
              )}
              <Badge variant="secondary" className="text-xs flex-shrink-0 tabular-nums">
                {units.length} {units.length === 1 ? 'Unit' : 'Units'}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{prop.address}</span>
            </div>
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
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handlers.editProp} data-testid="property-edit-button">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={handlers.deleteProp} data-testid="property-delete-button">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2 mt-4 pt-3 border-t border-border/50">
          <Button variant={isDetailsOpen ? "secondary" : "ghost"} size="sm" className="h-8 text-xs gap-1.5" onClick={toggles.details} data-testid="property-details-toggle">
            {isDetailsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <Info className="h-3.5 w-3.5" /> Property Details
          </Button>
          <Button variant={isUnitsOpen ? "secondary" : "ghost"} size="sm" className="h-8 text-xs gap-1.5" onClick={toggles.units} data-testid="property-units-toggle">
            {isUnitsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <Home className="h-3.5 w-3.5" /> Units ({units.length})
          </Button>
        </div>
      </div>

      {/* Property Details */}
      {isDetailsOpen && (
        <div className="px-5 pb-5 border-t bg-amber-50/40">
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><User className="h-3.5 w-3.5" /> Owner / Manager</div>
              <p className="text-sm font-medium">{prop.owner_manager_name || '-'}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Phone className="h-3.5 w-3.5" /> Phone</div>
              <p className="text-sm">{prop.owner_manager_phone || '-'}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Mail className="h-3.5 w-3.5" /> Email</div>
              <p className="text-sm">{prop.owner_manager_email || '-'}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Car className="h-3.5 w-3.5" /> Parking</div>
              <p className="text-sm">{prop.available_parking || 'Not specified'}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><PawPrint className="h-3.5 w-3.5" /> Pets</div>
              <div className="flex items-center gap-2">
                <Badge variant={prop.pets_permitted ? 'default' : 'secondary'} className="text-xs">
                  {prop.pets_permitted ? 'Permitted' : 'Not Permitted'}
                </Badge>
                {prop.pets_permitted && prop.pet_notes && (
                  <span className="text-xs text-muted-foreground">{prop.pet_notes}</span>
                )}
              </div>
            </div>
            {prop.marlins_decal_property && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Marlins Decal</p>
                <Badge className="text-xs bg-blue-50 text-blue-700 border border-blue-200">Marlins Decal Property</Badge>
              </div>
            )}
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

      {/* Units Table */}
      {isUnitsOpen && (
        <div className="border-t">
          <div className="px-5 py-3 flex items-center justify-between bg-muted/30">
            <h3 className="text-sm font-semibold">Units</h3>
            <Button size="sm" className="h-7 text-xs" onClick={handlers.createUnit} data-testid="units-create-button">
              <Plus className="h-3 w-3 mr-1" /> Add Unit
            </Button>
          </div>
          {units.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Home className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No units added yet</p>
              <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={handlers.createUnit}>Add First Unit</Button>
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
                          <Badge variant="secondary" className="text-xs">{u.unit_size === 'other' ? u.unit_size_custom : u.unit_size}</Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">${parseFloat(u.base_rent).toLocaleString()}</TableCell>
                        <TableCell className="tabular-nums">
                          {addlTotal > 0 ? (
                            <span className="text-xs">
                              +${addlTotal.toLocaleString()}
                              <span className="text-muted-foreground ml-1">({(u.additional_monthly_costs || []).map(c => c.name).join(', ')})</span>
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{u.availability_start_date}</TableCell>
                        <TableCell className="text-sm">{u.close_date || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handlers.editUnit(u)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handlers.deleteUnit(u.id)}>
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

      {/* Decals Section */}
      {prop.marlins_decal_property && (
        <div className="border-t">
          <button
            className="w-full px-5 py-3 flex items-center justify-between bg-blue-50/60 hover:bg-blue-50 transition-colors"
            onClick={toggles.decals}
            data-testid={`decals-expand-${prop.id}`}
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-blue-800">Decal Assignments</h3>
              <span className="text-xs text-blue-600">({decals.length} decals)</span>
            </div>
            <ChevronRight className={`h-4 w-4 text-blue-600 transition-transform ${isDecalsOpen ? 'rotate-90' : ''}`} />
          </button>
          {isDecalsOpen && (
            <div className="px-5 py-4 space-y-3 bg-blue-50/20" data-testid={`decals-section-${prop.id}`}>
              <div className="flex gap-2">
                <Input
                  placeholder="Decal number or ID..."
                  value={decalInput}
                  onChange={e => onDecalInputChange(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlers.addDecal()}
                  className="flex-1 h-8 text-sm"
                  data-testid={`decal-input-${prop.id}`}
                />
                <Button size="sm" className="h-8" onClick={handlers.addDecal} data-testid={`decal-add-btn-${prop.id}`}>
                  <Plus className="h-3 w-3 mr-1" />Add
                </Button>
              </div>
              {decals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No decals added yet. Enter a decal number above.</p>
              ) : (
                <div className="space-y-1.5">
                  {decals.map(d => (
                    <div key={d.id} className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border text-sm" data-testid="decal-row">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold text-blue-800">{d.decal_number}</span>
                        {d.assigned_tenant ? (
                          <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            {d.assigned_tenant.name}
                            {unitMap[d.assigned_tenant.unit_id] && (
                              <span className="text-emerald-600 ml-1">· Unit {unitMap[d.assigned_tenant.unit_id].unit_number}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Available</span>
                        )}
                      </div>
                      <Button
                        variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => handlers.deleteDecal(d.id)}
                        data-testid={`decal-delete-${d.id}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
