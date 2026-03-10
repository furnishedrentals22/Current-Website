import { useState, useEffect, useCallback } from 'react';
import { getMarketingLinks, saveMarketingLink, getProperties, getUnits } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Megaphone, ChevronDown, ChevronRight, Copy, ExternalLink, Pencil, Plus, X, Image } from 'lucide-react';
import { toast } from 'sonner';

export default function MarketingPage() {
  const [links, setLinks] = useState([]);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedProps, setExpandedProps] = useState({});
  const [editDialog, setEditDialog] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [form, setForm] = useState({ airbnb_link: '', furnished_finder_link: '', photos_link: '', additional_links: [] });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [ml, p, u] = await Promise.all([getMarketingLinks(), getProperties(), getUnits()]);
      setLinks(ml); setProperties(p); setUnits(u);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const linkMap = {};
  links.forEach(l => { linkMap[l.unit_id] = l; });

  const unitsByProp = {};
  units.forEach(u => {
    if (!unitsByProp[u.property_id]) unitsByProp[u.property_id] = [];
    unitsByProp[u.property_id].push(u);
  });
  Object.values(unitsByProp).forEach(arr => arr.sort((a, b) => {
    return (parseInt(a.unit_number) || 0) - (parseInt(b.unit_number) || 0);
  }));

  const sortedProps = [...properties].sort((a, b) => {
    const ai = a.building_id ?? Infinity, bi = b.building_id ?? Infinity;
    return ai - bi || a.name.localeCompare(b.name);
  });

  const toggleProp = (id) => setExpandedProps(p => ({ ...p, [id]: !p[id] }));
  const copyLink = (url) => { navigator.clipboard.writeText(url); toast.success('Link copied'); };

  const openEdit = (unit) => {
    const existing = linkMap[unit.id];
    setEditingUnit(unit);
    setForm({
      airbnb_link: existing?.airbnb_link || '',
      furnished_finder_link: existing?.furnished_finder_link || '',
      photos_link: existing?.photos_link || '',
      additional_links: existing?.additional_links || [],
    });
    setEditDialog(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveMarketingLink({ unit_id: editingUnit.id, property_id: editingUnit.property_id, ...form });
      toast.success('Links saved');
      setEditDialog(false); fetchData();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const addLink = () => setForm({ ...form, additional_links: [...form.additional_links, { name: '', url: '' }] });
  const updateLink = (idx, field, val) => {
    const arr = [...form.additional_links];
    arr[idx] = { ...arr[idx], [field]: val };
    setForm({ ...form, additional_links: arr });
  };
  const removeLink = (idx) => setForm({ ...form, additional_links: form.additional_links.filter((_, i) => i !== idx) });

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight" data-testid="marketing-page-title">Marketing Links</h1>
        <p className="text-sm text-muted-foreground mt-1">Listing links and photos for each unit</p>
      </div>

      {sortedProps.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <Megaphone className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No properties found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedProps.map(prop => {
            const propUnits = unitsByProp[prop.id] || [];
            const linkCount = propUnits.filter(u => linkMap[u.id]).length;
            return (
              <div key={prop.id} className="border rounded-lg overflow-hidden" data-testid="marketing-property-group">
                <div className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer" onClick={() => toggleProp(prop.id)}>
                  <div className="flex items-center gap-2">
                    {expandedProps[prop.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-medium text-sm">{prop.name}</span>
                    <span className="text-xs text-muted-foreground">{linkCount}/{propUnits.length} units have links</span>
                  </div>
                </div>
                {expandedProps[prop.id] && (
                  <div className="border-t">
                    {propUnits.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-3">No units</p>
                    ) : propUnits.map(unit => {
                      const ml = linkMap[unit.id];
                      return (
                        <div key={unit.id} className="border-b last:border-0 p-3" data-testid="marketing-unit-row">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">Unit {unit.unit_number}</span>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(unit)}>
                              <Pencil className="h-3 w-3 mr-1" />{ml ? 'Edit Links' : 'Add Links'}
                            </Button>
                          </div>
                          {ml ? (
                            <div className="flex flex-wrap gap-2">
                              {ml.airbnb_link && <LinkBadge label="Airbnb" url={ml.airbnb_link} onCopy={() => copyLink(ml.airbnb_link)} />}
                              {ml.furnished_finder_link && <LinkBadge label="Furnished Finder" url={ml.furnished_finder_link} onCopy={() => copyLink(ml.furnished_finder_link)} />}
                              {ml.photos_link && <LinkBadge label="Photos" url={ml.photos_link} onCopy={() => copyLink(ml.photos_link)} icon={<Image className="h-3 w-3" />} />}
                              {ml.additional_links?.map((al, i) => (
                                <LinkBadge key={i} label={al.name} url={al.url} onCopy={() => copyLink(al.url)} />
                              ))}
                            </div>
                          ) : <p className="text-xs text-muted-foreground italic">No links added</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Marketing Links - Unit {editingUnit?.unit_number}</DialogTitle>
            <DialogDescription>Add listing links and photo storage for this unit.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="space-y-2">
              <Label>Airbnb Listing URL</Label>
              <Input value={form.airbnb_link} onChange={e => setForm({ ...form, airbnb_link: e.target.value })} placeholder="https://airbnb.com/rooms/..." data-testid="marketing-airbnb-input" />
            </div>
            <div className="space-y-2">
              <Label>Furnished Finder URL</Label>
              <Input value={form.furnished_finder_link} onChange={e => setForm({ ...form, furnished_finder_link: e.target.value })} placeholder="https://furnishedfinder.com/..." data-testid="marketing-ff-input" />
            </div>
            <div className="space-y-2">
              <Label>Photos Storage URL</Label>
              <Input value={form.photos_link} onChange={e => setForm({ ...form, photos_link: e.target.value })} placeholder="https://drive.google.com/..." />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Additional Links</Label>
                <Button variant="secondary" size="sm" onClick={addLink}><Plus className="h-3 w-3 mr-1" />Add Link</Button>
              </div>
              {form.additional_links.map((al, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input className="w-1/3" placeholder="Label" value={al.name} onChange={e => updateLink(idx, 'name', e.target.value)} />
                  <Input className="flex-1" placeholder="URL" value={al.url} onChange={e => updateLink(idx, 'url', e.target.value)} />
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => removeLink(idx)}><X className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="marketing-save-btn">{saving ? 'Saving...' : 'Save Links'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LinkBadge({ label, url, onCopy, icon }) {
  return (
    <div className="inline-flex items-center gap-1 border rounded-full px-2.5 py-1 bg-card text-xs">
      {icon || <ExternalLink className="h-3 w-3 text-muted-foreground" />}
      <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{label}</a>
      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-0.5" onClick={onCopy} data-testid="marketing-copy-btn">
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}
