import { useState, useEffect, useCallback } from 'react';
import { getDoorCodes, saveDoorCode, getProperties, getUnits, verifyPin, getPinStatus, setPin } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DoorOpen, ChevronDown, ChevronRight, Eye, EyeOff, Lock, Save, Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function DoorCodesPage() {
  const [doorCodes, setDoorCodes] = useState([]);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedProps, setExpandedProps] = useState({});
  const [editingUnit, setEditingUnit] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editDialog, setEditDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState({});
  const [pinDialog, setPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinTarget, setPinTarget] = useState(null);
  const [pinStatus, setPinStatus] = useState({});
  const [setupDialog, setSetupDialog] = useState(false);
  const [newPin, setNewPin] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [dc, p, u, ps] = await Promise.all([getDoorCodes(), getProperties(), getUnits(), getPinStatus()]);
      setDoorCodes(dc); setProperties(p); setUnits(u); setPinStatus(ps);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const propMap = {};
  properties.forEach(p => { propMap[p.id] = p; });
  const codeMap = {};
  doorCodes.forEach(dc => { codeMap[dc.unit_id] = dc; });

  const toggleProp = (id) => setExpandedProps(p => ({ ...p, [id]: !p[id] }));

  const unitsByProp = {};
  units.forEach(u => {
    if (!unitsByProp[u.property_id]) unitsByProp[u.property_id] = [];
    unitsByProp[u.property_id].push(u);
  });
  Object.values(unitsByProp).forEach(arr => arr.sort((a, b) => {
    const na = parseInt(a.unit_number) || 0, nb = parseInt(b.unit_number) || 0;
    return na - nb;
  }));

  const sortedProps = [...properties].sort((a, b) => {
    const ai = a.building_id ?? Infinity, bi = b.building_id ?? Infinity;
    return ai - bi || a.name.localeCompare(b.name);
  });

  const openEdit = (unit) => {
    const existing = codeMap[unit.id];
    setEditingUnit(unit);
    setEditForm({
      admin_code: existing?.admin_code || '', admin_code_note: existing?.admin_code_note || '',
      housekeeping_code: existing?.housekeeping_code || '', housekeeping_code_note: existing?.housekeeping_code_note || '',
      guest_code: existing?.guest_code || '', guest_code_note: existing?.guest_code_note || '',
      backup_code_1: existing?.backup_code_1 || '', backup_code_1_note: existing?.backup_code_1_note || '',
      backup_code_2: existing?.backup_code_2 || '', backup_code_2_note: existing?.backup_code_2_note || '',
    });
    setEditDialog(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveDoorCode({ unit_id: editingUnit.id, property_id: editingUnit.property_id, ...editForm });
      toast.success('Door codes saved');
      setEditDialog(false); fetchData();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const requestAdminUnlock = (unitId) => {
    if (!pinStatus.shared_pin_set) {
      toast.error('No PIN configured. Set one in settings.'); setSetupDialog(true); return;
    }
    setPinTarget(unitId); setPinInput(''); setPinDialog(true);
  };

  const handlePinVerify = async () => {
    try {
      const res = await verifyPin({ pin: pinInput, pin_type: 'shared' });
      if (res.valid) {
        setAdminUnlocked(p => ({ ...p, [pinTarget]: true }));
        setPinDialog(false); toast.success('Admin code unlocked');
      } else { toast.error('Incorrect PIN'); }
    } catch { toast.error('Verification failed'); }
  };

  const handleSetPin = async () => {
    if (!newPin || newPin.length < 4) { toast.error('PIN must be at least 4 digits'); return; }
    try {
      await setPin({ pin: newPin, pin_type: 'shared' });
      toast.success('PIN set successfully');
      setSetupDialog(false); setNewPin(''); fetchData();
    } catch { toast.error('Failed to set PIN'); }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight" data-testid="door-codes-page-title">Door Codes</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage entry codes for each unit</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSetupDialog(true)} data-testid="door-codes-pin-settings">
          <Settings className="h-4 w-4 mr-2" />PIN Settings
        </Button>
      </div>

      {sortedProps.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <DoorOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No properties found. Add properties first.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedProps.map(prop => {
            const propUnits = unitsByProp[prop.id] || [];
            const codesCount = propUnits.filter(u => codeMap[u.id]).length;
            return (
              <div key={prop.id} className="border rounded-lg overflow-hidden" data-testid="door-codes-property-group">
                <div className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer" onClick={() => toggleProp(prop.id)}>
                  <div className="flex items-center gap-2">
                    {expandedProps[prop.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-medium text-sm">{prop.name}</span>
                    <span className="text-xs text-muted-foreground">{codesCount}/{propUnits.length} units configured</span>
                  </div>
                </div>
                {expandedProps[prop.id] && (
                  <div className="border-t">
                    {propUnits.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-3">No units in this property</p>
                    ) : propUnits.map(unit => {
                      const codes = codeMap[unit.id];
                      const isUnlocked = adminUnlocked[unit.id];
                      return (
                        <div key={unit.id} className="border-b last:border-0 p-3" data-testid="door-codes-unit-row">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">Unit {unit.unit_number}</span>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(unit)}>
                              <Save className="h-3 w-3 mr-1" />{codes ? 'Edit Codes' : 'Set Codes'}
                            </Button>
                          </div>
                          {codes ? (
                            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                              <CodeDisplay label="Admin" code={codes.admin_code} note={codes.admin_code_note}
                                isProtected={!isUnlocked} onUnlock={() => requestAdminUnlock(unit.id)} />
                              <CodeDisplay label="Housekeeping" code={codes.housekeeping_code} note={codes.housekeeping_code_note} />
                              <CodeDisplay label="Guest" code={codes.guest_code} note={codes.guest_code_note} isGuest />
                              <CodeDisplay label="Backup 1" code={codes.backup_code_1} note={codes.backup_code_1_note} />
                              <CodeDisplay label="Backup 2" code={codes.backup_code_2} note={codes.backup_code_2_note} />
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No codes set</p>
                          )}
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

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Door Codes - Unit {editingUnit?.unit_number}</DialogTitle>
            <DialogDescription>Set entry codes for this unit.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            {[
              { key: 'admin_code', label: 'Admin Code (PIN Protected)' },
              { key: 'housekeeping_code', label: 'Housekeeping Code' },
              { key: 'guest_code', label: 'Guest Code' },
              { key: 'backup_code_1', label: 'Backup Code 1' },
              { key: 'backup_code_2', label: 'Backup Code 2' },
            ].map(({ key, label }) => (
              <div key={key} className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input value={editForm[key] || ''} onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                    data-testid={`door-code-${key}-input`} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Note</Label>
                  <Input value={editForm[`${key}_note`] || ''} onChange={e => setEditForm({ ...editForm, [`${key}_note`]: e.target.value })} placeholder="Optional note" />
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="door-code-save-btn">{saving ? 'Saving...' : 'Save Codes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIN Verify Dialog */}
      <Dialog open={pinDialog} onOpenChange={setPinDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle><Lock className="h-4 w-4 inline mr-2" />Enter PIN</DialogTitle>
            <DialogDescription>Enter the shared PIN to view admin code.</DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Input type="password" placeholder="Enter PIN" value={pinInput} onChange={e => setPinInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePinVerify()} data-testid="door-code-pin-input" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinDialog(false)}>Cancel</Button>
            <Button onClick={handlePinVerify} data-testid="door-code-pin-verify-btn">Verify</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIN Setup Dialog */}
      <Dialog open={setupDialog} onOpenChange={setSetupDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>PIN Settings</DialogTitle>
            <DialogDescription>Set or update the shared PIN for admin door codes and other protected areas.</DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-3">
            <div className="space-y-2">
              <Label>Shared PIN (min 4 digits)</Label>
              <Input type="password" value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="Enter new PIN" data-testid="pin-setup-input" />
            </div>
            <p className="text-xs text-muted-foreground">
              Status: {pinStatus.shared_pin_set ? 'PIN is set' : 'No PIN set'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupDialog(false)}>Cancel</Button>
            <Button onClick={handleSetPin} data-testid="pin-setup-save-btn">Save PIN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CodeDisplay({ label, code, note, isProtected, onUnlock, isGuest }) {
  return (
    <div className={`rounded-md border p-2 ${isGuest ? 'bg-amber-50 border-amber-200' : 'bg-card'}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      {isProtected ? (
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-mono tracking-wider">****</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onUnlock} data-testid="door-code-unlock-btn">
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <p className={`font-mono tracking-wider ${isGuest ? 'text-base font-bold' : 'text-sm'}`}>
          {code || <span className="text-muted-foreground italic text-xs">Not set</span>}
        </p>
      )}
      {note && <p className="text-[10px] text-muted-foreground mt-0.5">{note}</p>}
    </div>
  );
}
