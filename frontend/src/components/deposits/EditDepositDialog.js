import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function EditDepositDialog({ open, onClose, deposit, editForm, setEditForm, onSave, saving }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Edit Deposit</DialogTitle>
          <DialogDescription>Edit deposit information for {deposit?.name}</DialogDescription>
        </DialogHeader>

        {deposit && (
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Deposit Amount</Label>
                <Input type="number" value={editForm.deposit_amount} onChange={e => setEditForm({ ...editForm, deposit_amount: e.target.value })} data-testid="edit-deposit-amount" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Deposit Date</Label>
                <Input type="date" value={editForm.deposit_date} onChange={e => setEditForm({ ...editForm, deposit_date: e.target.value })} data-testid="edit-deposit-date" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payment Method</Label>
              <Input value={editForm.payment_method} onChange={e => setEditForm({ ...editForm, payment_method: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
            </div>
            {deposit.deposit_return_date && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2">Return Info</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Return Date</Label>
                    <Input type="date" value={editForm.deposit_return_date} onChange={e => setEditForm({ ...editForm, deposit_return_date: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Return Amount</Label>
                    <Input type="number" value={editForm.deposit_return_amount} onChange={e => setEditForm({ ...editForm, deposit_return_amount: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Return Method</Label>
                    <Input value={editForm.deposit_return_method} onChange={e => setEditForm({ ...editForm, deposit_return_method: e.target.value })} />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave} disabled={saving} data-testid="save-deposit-edit-btn">
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
