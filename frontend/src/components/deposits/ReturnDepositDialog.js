import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ReturnDepositDialog({ open, onClose, deposit, returnForm, setReturnForm, confirmReturn, onNext, saving, fmtMoney }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">{confirmReturn ? 'Confirm Deposit Return' : 'Return Deposit'}</DialogTitle>
          <DialogDescription>
            {confirmReturn ? 'Please confirm the deposit return details below.' : `Return deposit for ${deposit?.name}`}
          </DialogDescription>
        </DialogHeader>

        {deposit && !confirmReturn && (
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg border bg-muted/30">
              <p className="text-sm font-medium">{deposit.name}</p>
              <p className="text-xs text-muted-foreground">{deposit.property_name} - Unit {deposit.unit_number}</p>
              <p className="text-xs text-muted-foreground">Original deposit: {fmtMoney(deposit.deposit_amount)}</p>
            </div>
            <div className="space-y-2">
              <Label>Return Date</Label>
              <Input type="date" value={returnForm.return_date} onChange={e => setReturnForm({ ...returnForm, return_date: e.target.value })} data-testid="return-date-input" />
            </div>
            <div className="space-y-2">
              <Label>Return Method</Label>
              <Input value={returnForm.return_method} onChange={e => setReturnForm({ ...returnForm, return_method: e.target.value })} placeholder="e.g. Check, Zelle, Cash" data-testid="return-method-input" />
            </div>
            <div className="space-y-2">
              <Label>Return Amount</Label>
              <Input type="number" value={returnForm.return_amount} onChange={e => setReturnForm({ ...returnForm, return_amount: e.target.value })} data-testid="return-amount-input" />
            </div>
          </div>
        )}

        {confirmReturn && deposit && (
          <div className="py-2 space-y-2">
            <div className="p-4 rounded-lg border-2 border-amber-300 bg-amber-50">
              <p className="text-sm font-semibold mb-2">Are you sure?</p>
              <p className="text-xs">Tenant: <strong>{deposit.name}</strong></p>
              <p className="text-xs">Amount: <strong>{fmtMoney(returnForm.return_amount)}</strong></p>
              <p className="text-xs">Date: <strong>{returnForm.return_date}</strong></p>
              <p className="text-xs">Method: <strong>{returnForm.return_method || 'N/A'}</strong></p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onNext} disabled={saving} data-testid="return-deposit-confirm-btn">
            {saving ? 'Saving...' : confirmReturn ? 'Confirm Return' : 'Next'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
