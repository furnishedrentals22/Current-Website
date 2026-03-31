import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

export function NotificationDialog({ notifDialog, notifDate, setNotifDate, onCreateNotification, onClose }) {
  return (
    <Dialog open={!!notifDialog} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Create Notification?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {notifDialog?.leadName} has moved to <strong>{notifDialog?.stageName}</strong>.
          Would you like to create a site notification?
        </p>
        <div className="space-y-2 mt-2">
          <Label>Notification Date</Label>
          <Input type="date" value={notifDate} onChange={e => setNotifDate(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Skip</Button>
          <Button onClick={onCreateNotification}>Create Notification</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UnassignedNoteDialog({ noteDialog, noteText, setNoteText, onSave, onClose }) {
  return (
    <Dialog open={!!noteDialog} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Unassigned Lead Note</DialogTitle>
          <DialogDescription>Add details about what this lead is useful for.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          <Label>{noteDialog?.name}</Label>
          <Textarea value={noteText} onChange={e => setNoteText(e.target.value)}
            placeholder="What is this lead useful for? Why are they unassigned?"
            className="min-h-[100px]"
            data-testid="unassigned-note-input" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave} data-testid="unassigned-note-save">Save Note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
