import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createMiscCharge, getMiscCharges, deleteMiscCharge } from '@/lib/api';
import { fmtDate } from './tenantUtils';

export function MiscChargesSection({ tenantId, fetchData }) {
  const [charges, setCharges] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newCharge, setNewCharge] = useState({
    amount: '', description: '', charge_date: new Date().toISOString().split('T')[0]
  });

  const loadCharges = useCallback(async () => {
    try {
      const data = await getMiscCharges({ tenant_id: tenantId });
      setCharges(data);
    } catch { /* ignore */ }
  }, [tenantId]);

  useEffect(() => { loadCharges(); }, [loadCharges]);

  const handleAdd = async () => {
    if (!newCharge.amount || !newCharge.charge_date) { toast.error('Amount and date required'); return; }
    try {
      await createMiscCharge(tenantId, {
        amount: parseFloat(newCharge.amount),
        description: newCharge.description,
        charge_date: newCharge.charge_date
      });
      toast.success('Misc charge added');
      setNewCharge({ amount: '', description: '', charge_date: new Date().toISOString().split('T')[0] });
      setShowAdd(false);
      loadCharges();
      if (fetchData) fetchData();
    } catch { toast.error('Failed to add charge'); }
  };

  const handleRemove = async (id) => {
    try {
      await deleteMiscCharge(id);
      toast.success('Charge removed');
      loadCharges();
    } catch { toast.error('Failed to remove'); }
  };

  return (
    <div data-testid="misc-charges-section">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Misc Charges</p>
      {charges.length > 0 && (
        <div className="space-y-1 mb-2">
          {charges.map(c => (
            <div key={c.id} className="flex items-center justify-between p-2 rounded-lg border bg-muted/20 text-sm">
              <div className="flex items-center gap-3">
                <span className="tabular-nums font-medium">${parseFloat(c.amount).toLocaleString()}</span>
                <span className="text-muted-foreground">{c.description || 'Misc'}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{fmtDate(c.charge_date)}</span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleRemove(c.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {showAdd ? (
        <div className="space-y-2 p-3 border rounded-lg bg-muted/10">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Amount *</Label>
              <Input type="number" value={newCharge.amount} onChange={e => setNewCharge({ ...newCharge, amount: e.target.value })} placeholder="0.00" className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input value={newCharge.description} onChange={e => setNewCharge({ ...newCharge, description: e.target.value })} placeholder="e.g. Late fee" className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date *</Label>
              <Input type="date" value={newCharge.charge_date} onChange={e => setNewCharge({ ...newCharge, charge_date: e.target.value })} className="h-8" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} data-testid="save-misc-charge-btn">Save</Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAdd(true)} data-testid="add-misc-charge-btn">
          + Add Misc Charge
        </Button>
      )}
    </div>
  );
}
