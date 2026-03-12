import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export function TenantDeleteDialog({ tenant, step, onClose, onContinue, propMap, unitMap }) {
  if (!tenant) return null;

  return (
    <Dialog open={!!tenant} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {step === 2 ? 'Final Confirmation' : 'Delete Tenant Permanently'}
          </DialogTitle>
          <DialogDescription>
            {step === 2
              ? 'This action cannot be undone.'
              : 'Are you sure you want to permanently delete this tenant?'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <div className="p-3 rounded-lg border bg-red-50/50 border-red-200">
            <p className="font-medium">{tenant.name}</p>
            <p className="text-sm text-muted-foreground">
              {propMap[tenant.property_id]?.name || ''} — Unit {unitMap[tenant.unit_id]?.unit_number || ''}
            </p>
          </div>
          {step === 1 && (
            <div className="p-3 rounded-lg border-2 border-red-300 bg-red-50">
              <p className="text-sm font-semibold text-red-800">Warning: This will permanently delete:</p>
              <ul className="text-xs text-red-700 mt-1 space-y-0.5 list-disc ml-4">
                <li>All income records from this tenant</li>
                <li>All notifications associated with this tenant</li>
                <li>All cleaning records</li>
                <li>All misc charges</li>
                <li>All rent payment tracking data</li>
              </ul>
            </div>
          )}
          {step === 2 && (
            <div className="p-3 rounded-lg border-2 border-red-400 bg-red-100">
              <p className="text-sm font-bold text-red-900">ARE YOU ABSOLUTELY SURE?</p>
              <p className="text-xs text-red-800 mt-1">
                This will permanently delete {tenant.name} and ALL associated data. This cannot be reversed.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onContinue} data-testid="confirm-permanent-delete-btn">
            {step === 2 ? 'Yes, Delete Everything' : 'Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
