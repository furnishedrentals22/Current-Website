import { useState, useEffect, useCallback } from 'react';
import { getMoveInsOuts, createNotification } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDownUp, Bell, LogIn, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function MoveInOutPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifDialog, setNotifDialog] = useState(false);
  const [notifTarget, setNotifTarget] = useState(null);
  const [notifType, setNotifType] = useState('move_in');
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('09:00');

  const fetchData = useCallback(async () => {
    try { setItems(await getMoveInsOuts()); }
    catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const today = new Date().toISOString().split('T')[0];

  const moveIns = items.filter(t => t.move_in_date >= today).sort((a, b) => a.move_in_date.localeCompare(b.move_in_date));
  const moveOuts = items.filter(t => t.move_out_date >= today).sort((a, b) => a.move_out_date.localeCompare(b.move_out_date));

  const openNotif = (tenant, type) => {
    setNotifTarget(tenant);
    setNotifType(type);
    setCustomDate('');
    setCustomTime('09:00');
    setNotifDialog(true);
  };

  const createQuickNotif = async (preset) => {
    const t = notifTarget;
    const refDate = notifType === 'move_in' ? t.move_in_date : t.move_out_date;
    const refDt = new Date(refDate + 'T00:00:00');
    let reminderDate, reminderTime = '09:00', label;

    if (preset === '3_days') {
      reminderDate = new Date(refDt.getTime() - 3 * 86400000).toISOString().split('T')[0];
      label = `3 days before ${notifType === 'move_in' ? 'check-in' : 'check-out'}`;
    } else if (preset === '1_day') {
      reminderDate = new Date(refDt.getTime() - 86400000).toISOString().split('T')[0];
      label = `1 day before ${notifType === 'move_in' ? 'check-in' : 'check-out'}`;
    } else if (preset === 'day_of') {
      reminderDate = refDate;
      label = `Day of ${notifType === 'move_in' ? 'check-in' : 'check-out'}`;
    } else if (preset === 'time_of') {
      reminderDate = refDate;
      reminderTime = '12:00';
      label = `Time of ${notifType === 'move_in' ? 'move-in' : 'move-out'}`;
    } else if (preset === 'custom') {
      if (!customDate) { toast.error('Select a date'); return; }
      reminderDate = customDate;
      reminderTime = customTime;
      label = `Custom reminder`;
    }

    try {
      await createNotification({
        name: `${label} - ${t.name} (Unit ${t.unit_number})`,
        property_id: t.property_id,
        unit_id: t.unit_id,
        reminder_date: reminderDate,
        reminder_time: reminderTime,
        status: 'upcoming',
        priority: 'medium',
        category: notifType,
        notification_type: notifType,
        tenant_id: t.id,
        tenant_name: t.name,
        message: `${label} for ${t.name} at ${t.property_name} Unit ${t.unit_number}`,
      });
      toast.success('Reminder created');
      setNotifDialog(false);
    } catch { toast.error('Failed to create reminder'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight" data-testid="move-in-out-page-title">Move In / Move Out</h1>
        <p className="text-sm text-muted-foreground mt-1">Upcoming move-ins and move-outs sorted by date</p>
      </div>

      {loading ? <div className="text-center py-12 text-muted-foreground">Loading...</div> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Move Ins */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <LogIn className="h-5 w-5 text-emerald-600" />
              <h2 className="font-semibold text-base">Upcoming Move-Ins</h2>
              <Badge variant="secondary">{moveIns.length}</Badge>
            </div>
            <div className="border rounded-lg overflow-hidden" data-testid="move-ins-table">
              <Table>
                <TableHeader>
                  <TableRow className="bg-emerald-50/50">
                    <TableHead className="text-[10px] font-semibold uppercase">Property / Unit</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase">Tenant</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase">Move In</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase">Move Out</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {moveIns.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">No upcoming move-ins</TableCell></TableRow>
                  ) : moveIns.map(t => (
                    <TableRow key={`in-${t.id}`} className="hover:bg-muted/30" data-testid="move-in-row">
                      <TableCell className="text-xs font-medium">{t.property_name} / U{t.unit_number}</TableCell>
                      <TableCell className="text-xs">{t.name}</TableCell>
                      <TableCell className="text-xs tabular-nums font-medium text-emerald-700">{t.move_in_date}</TableCell>
                      <TableCell className="text-xs tabular-nums">{t.move_out_date}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openNotif(t, 'move_in')} title="Set reminder" data-testid="move-in-notify-btn">
                          <Bell className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Move Outs */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <LogOut className="h-5 w-5 text-orange-600" />
              <h2 className="font-semibold text-base">Upcoming Move-Outs</h2>
              <Badge variant="secondary">{moveOuts.length}</Badge>
            </div>
            <div className="border rounded-lg overflow-hidden" data-testid="move-outs-table">
              <Table>
                <TableHeader>
                  <TableRow className="bg-orange-50/50">
                    <TableHead className="text-[10px] font-semibold uppercase">Property / Unit</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase">Tenant</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase">Move In</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase">Move Out</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {moveOuts.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">No upcoming move-outs</TableCell></TableRow>
                  ) : moveOuts.map(t => (
                    <TableRow key={`out-${t.id}`} className="hover:bg-muted/30" data-testid="move-out-row">
                      <TableCell className="text-xs font-medium">{t.property_name} / U{t.unit_number}</TableCell>
                      <TableCell className="text-xs">{t.name}</TableCell>
                      <TableCell className="text-xs tabular-nums">{t.move_in_date}</TableCell>
                      <TableCell className="text-xs tabular-nums font-medium text-orange-700">{t.move_out_date}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openNotif(t, 'move_out')} title="Set reminder" data-testid="move-out-notify-btn">
                          <Bell className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Notification Quick-Create Dialog */}
      <Dialog open={notifDialog} onOpenChange={setNotifDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              <Bell className="h-4 w-4 inline mr-2" />
              Set Reminder - {notifType === 'move_in' ? 'Check-In' : 'Check-Out'}
            </DialogTitle>
            <DialogDescription>
              {notifTarget?.name} — {notifTarget?.property_name} Unit {notifTarget?.unit_number}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-3">
            <Button variant="outline" className="justify-start text-sm h-9" onClick={() => createQuickNotif('3_days')} data-testid="notif-3days">
              <Clock3Icon /> 3 days before
            </Button>
            <Button variant="outline" className="justify-start text-sm h-9" onClick={() => createQuickNotif('1_day')} data-testid="notif-1day">
              <Clock3Icon /> 1 day before
            </Button>
            <Button variant="outline" className="justify-start text-sm h-9" onClick={() => createQuickNotif('day_of')} data-testid="notif-dayof">
              <Clock3Icon /> Day of {notifType === 'move_in' ? 'move-in' : 'move-out'}
            </Button>
            <Button variant="outline" className="justify-start text-sm h-9" onClick={() => createQuickNotif('time_of')} data-testid="notif-timeof">
              <Clock3Icon /> Time of {notifType === 'move_in' ? 'move-in' : 'move-out'}
            </Button>
            <div className="border-t pt-3 mt-1 space-y-2">
              <Label className="text-xs text-muted-foreground">Or set custom date & time:</Label>
              <div className="flex gap-2">
                <Input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="flex-1" />
                <Input type="time" value={customTime} onChange={e => setCustomTime(e.target.value)} className="w-28" />
              </div>
              <Button variant="default" size="sm" className="w-full" onClick={() => createQuickNotif('custom')} data-testid="notif-custom">
                Set Custom Reminder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Clock3Icon() {
  return <ArrowDownUp className="h-4 w-4 mr-2 text-muted-foreground" />;
}
