import { useState, useEffect, useCallback } from 'react';
import { getRentTracking, updateRentPayment, createNotification } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronRight, ChevronLeft, Bell, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmtMoney = (v) => v != null && v !== '' && v !== 0 ? `$${parseFloat(v).toLocaleString()}` : '-';

export default function RentTrackingPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [openMonth, setOpenMonth] = useState(now.getMonth() + 1);
  const [monthData, setMonthData] = useState({});
  const [loading, setLoading] = useState({});

  // Partial payment dialog
  const [partialDialog, setPartialDialog] = useState(null);
  const [partialAmount, setPartialAmount] = useState('');

  // Note / notification dialog
  const [noteDialog, setNoteDialog] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [createNotif, setCreateNotif] = useState(false);

  const fetchMonth = useCallback(async (y, m) => {
    setLoading(prev => ({ ...prev, [`${y}-${m}`]: true }));
    try {
      const data = await getRentTracking({ year: y, month: m });
      setMonthData(prev => ({ ...prev, [`${y}-${m}`]: data }));
    } catch {
      toast.error('Failed to load rent data');
    } finally {
      setLoading(prev => ({ ...prev, [`${y}-${m}`]: false }));
    }
  }, []);

  useEffect(() => {
    if (openMonth) fetchMonth(year, openMonth);
  }, [year, openMonth, fetchMonth]);

  const handleTogglePaid = async (tenant, m) => {
    const newPaid = !tenant.paid;
    try {
      await updateRentPayment(tenant.tenant_id, { paid: newPaid, partial_amount: tenant.partial_amount, note: tenant.note }, year, m);
      fetchMonth(year, m);
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleSavePartial = async () => {
    if (!partialDialog) return;
    const amt = parseFloat(partialAmount) || 0;
    try {
      await updateRentPayment(partialDialog.tenant.tenant_id, {
        paid: false, partial_amount: amt > 0 ? amt : null, note: partialDialog.tenant.note
      }, year, partialDialog.month);
      toast.success('Partial payment recorded');
      setPartialDialog(null);
      fetchMonth(year, partialDialog.month);
    } catch {
      toast.error('Failed to save');
    }
  };

  const handleSaveNote = async () => {
    if (!noteDialog) return;
    try {
      await updateRentPayment(noteDialog.tenant.tenant_id, {
        paid: noteDialog.tenant.paid, partial_amount: noteDialog.tenant.partial_amount, note: noteText
      }, year, noteDialog.month);

      if (createNotif && noteText) {
        await createNotification({
          name: `Rent Note - ${noteDialog.tenant.tenant_name}`,
          message: noteText,
          property_id: noteDialog.tenant.property_id,
          unit_id: noteDialog.tenant.unit_id,
          reminder_date: new Date().toISOString().split('T')[0],
          status: 'upcoming',
          priority: 'medium',
          category: 'rent',
          notification_type: 'rent_note',
          tenant_id: noteDialog.tenant.tenant_id,
          tenant_name: noteDialog.tenant.tenant_name,
          notification_date: new Date().toISOString().split('T')[0],
          is_read: false
        });
        toast.success('Note saved & notification created');
      } else {
        toast.success('Note saved');
      }
      setNoteDialog(null);
      fetchMonth(year, noteDialog.month);
    } catch {
      toast.error('Failed to save');
    }
  };

  const renderMonthContent = (m) => {
    const key = `${year}-${m}`;
    const data = monthData[key];
    const isLoading = loading[key];

    if (isLoading) return <div className="px-4 py-8 text-center text-muted-foreground text-sm">Loading...</div>;
    if (!data || !data.tenants || data.tenants.length === 0) return <div className="px-4 py-8 text-center text-muted-foreground text-sm">No long-term tenants for this month</div>;

    // Group by property
    const byProp = {};
    data.tenants.forEach(t => {
      const pid = t.property_id;
      if (!byProp[pid]) byProp[pid] = { name: t.property_name, building_id: t.building_id, tenants: [] };
      byProp[pid].tenants.push(t);
    });

    return (
      <div className="divide-y divide-border/40">
        {Object.entries(byProp).sort((a, b) => (a[1].building_id || 999) - (b[1].building_id || 999)).map(([pid, pData]) => (
          <div key={pid} className="px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{pData.name}</p>
            <div className="space-y-1">
              {pData.tenants.sort((a, b) => (parseInt(a.unit_number) || 999) - (parseInt(b.unit_number) || 999)).map((t, idx) => (
                <div key={t.tenant_id} className={`flex items-center gap-4 px-3 py-2.5 rounded-lg ${idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'}`}
                  data-testid="rent-tracking-row">
                  <Checkbox
                    checked={t.paid}
                    onCheckedChange={() => handleTogglePaid(t, m)}
                    data-testid="rent-paid-checkbox"
                    className="h-5 w-5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Unit {t.unit_number}</span>
                      <span className="text-sm text-muted-foreground">-</span>
                      <span className="text-sm">{t.tenant_name}</span>
                    </div>
                  </div>
                  <span className="text-sm tabular-nums font-medium">{fmtMoney(t.monthly_rent)}</span>
                  {t.partial_amount && !t.paid && (
                    <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-50">
                      Partial: {fmtMoney(t.partial_amount)}
                    </Badge>
                  )}
                  {t.note && <Badge variant="secondary" className="text-xs">Note</Badge>}
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => { setPartialDialog({ tenant: t, month: m }); setPartialAmount(t.partial_amount || ''); }}>
                      Partial
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setNoteDialog({ tenant: t, month: m }); setNoteText(t.note || ''); setCreateNotif(false); }}>
                      <Bell className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const isCurrentMonth = (m) => year === now.getFullYear() && m === now.getMonth() + 1;

  return (
    <div className="space-y-6" data-testid="rent-tracking-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Rent Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">Track monthly rent payments for long-term tenants</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setYear(y => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-heading text-lg font-semibold tabular-nums w-16 text-center">{year}</span>
          <Button variant="outline" size="sm" onClick={() => setYear(y => y + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
          const isOpen = openMonth === m;
          const isCurrent = isCurrentMonth(m);
          return (
            <Card key={m} className={`overflow-hidden ${isCurrent ? 'ring-2 ring-primary/30' : ''}`}>
              <button className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                onClick={() => setOpenMonth(isOpen ? null : m)}
                data-testid={`month-toggle-${m}`}>
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="font-medium">{MONTH_NAMES[m]} {year}</span>
                  {isCurrent && <Badge variant="secondary" className="text-xs">Current</Badge>}
                </div>
              </button>
              {isOpen && (
                <div className="border-t">
                  {renderMonthContent(m)}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Partial Payment Dialog */}
      <Dialog open={!!partialDialog} onOpenChange={() => setPartialDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Partial Payment</DialogTitle>
            <DialogDescription>Record a partial payment for {partialDialog?.tenant?.tenant_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Amount Paid</Label>
              <Input type="number" value={partialAmount} onChange={e => setPartialAmount(e.target.value)} placeholder="0.00" />
            </div>
            <p className="text-xs text-muted-foreground">Full rent: {fmtMoney(partialDialog?.tenant?.monthly_rent)}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPartialDialog(null)}>Cancel</Button>
            <Button onClick={handleSavePartial}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note / Notification Dialog */}
      <Dialog open={!!noteDialog} onOpenChange={() => setNoteDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>Add a note for {noteDialog?.tenant?.tenant_name}'s rent</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="e.g. Late payment, will pay by 15th..." />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={createNotif} onCheckedChange={setCreateNotif} />
              <Label className="text-sm cursor-pointer">Also create a notification</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialog(null)}>Cancel</Button>
            <Button onClick={handleSaveNote}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
