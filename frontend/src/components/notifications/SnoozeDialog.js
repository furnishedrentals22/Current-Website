import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlarmClock } from 'lucide-react';

export function SnoozeDialog({ open, onClose, target, snoozeForm, setSnoozeForm, onSnooze, onQuickSnooze }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle><AlarmClock className="h-4 w-4 inline mr-2" />Snooze Notification</DialogTitle>
          <DialogDescription>Push this reminder to a later date/time.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-3">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => onQuickSnooze(target, 1).then(() => onClose(false))}>+1 hour</Button>
            <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => onQuickSnooze(target, 24).then(() => onClose(false))}>+1 day</Button>
            <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => onQuickSnooze(target, 168).then(() => onClose(false))}>+1 week</Button>
          </div>
          <div className="border-t pt-3 space-y-2">
            <Label>Custom Date</Label>
            <Input type="date" value={snoozeForm.date} onChange={e => setSnoozeForm({ ...snoozeForm, date: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Time</Label>
            <Input type="time" value={snoozeForm.time} onChange={e => setSnoozeForm({ ...snoozeForm, time: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>Cancel</Button>
          <Button onClick={onSnooze} data-testid="snooze-save-btn">Snooze</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
