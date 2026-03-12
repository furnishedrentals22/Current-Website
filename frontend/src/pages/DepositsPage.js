import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentDeposits, getPastDeposits, returnDeposit, getLandlordDeposits, updateLandlordDeposit } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, ChevronDown, ChevronRight, Pencil, Check, X, ArrowDownLeft } from 'lucide-react';
import { toast } from 'sonner';

const fmtMoney = (v) => v != null && v !== '' ? `$${parseFloat(v).toLocaleString()}` : '-';
const fmtDate = (v) => {
  if (!v) return '-';
  try {
    const d = new Date(v + 'T00:00:00');
    return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`;
  } catch { return v; }
};

const getQuarterLabel = (dateStr) => {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr + 'T00:00:00');
  const quarters = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];
  return `${quarters[Math.floor(d.getMonth() / 3)]} ${d.getFullYear()}`;
};
const getQuarterKey = (dateStr) => {
  if (!dateStr) return '0000-0';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}-${Math.floor(d.getMonth() / 3)}`;
};

export default function DepositsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('current');
  const [currentData, setCurrentData] = useState({ deposits: [], total: 0 });
  const [pastData, setPastData] = useState({ deposits: [] });
  const [landlordData, setLandlordData] = useState({ properties: [], total: 0 });
  const [loading, setLoading] = useState(true);

  // Return deposit dialog
  const [returnDialog, setReturnDialog] = useState(null);
  const [returnForm, setReturnForm] = useState({ return_date: '', return_method: '', return_amount: '' });
  const [confirmReturn, setConfirmReturn] = useState(false);
  const [saving, setSaving] = useState(false);

  // Landlord deposit editing
  const [editingLandlord, setEditingLandlord] = useState(null);
  const [landlordAmount, setLandlordAmount] = useState('');

  // Collapsed state for past quarters and landlord properties
  const [expandedQuarters, setExpandedQuarters] = useState({});
  const [expandedLandlordProps, setExpandedLandlordProps] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [curr, past, landlord] = await Promise.all([
        getCurrentDeposits(), getPastDeposits(), getLandlordDeposits()
      ]);
      setCurrentData(curr);
      setPastData(past);
      setLandlordData(landlord);
    } catch (e) {
      toast.error('Failed to load deposits data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openReturnDialog = (deposit) => {
    setReturnDialog(deposit);
    setReturnForm({
      return_date: new Date().toISOString().split('T')[0],
      return_method: '',
      return_amount: deposit.deposit_amount || ''
    });
    setConfirmReturn(false);
  };

  const handleReturnDeposit = async () => {
    if (!confirmReturn) {
      setConfirmReturn(true);
      return;
    }
    setSaving(true);
    try {
      await returnDeposit(returnDialog.id, {
        return_date: returnForm.return_date,
        return_method: returnForm.return_method,
        return_amount: returnForm.return_amount ? parseFloat(returnForm.return_amount) : null
      });
      toast.success('Deposit returned successfully');
      setReturnDialog(null);
      fetchData();
    } catch (e) {
      toast.error('Failed to return deposit');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLandlordDeposit = async (unitId) => {
    try {
      await updateLandlordDeposit(unitId, parseFloat(landlordAmount) || 0);
      toast.success('Landlord deposit updated');
      setEditingLandlord(null);
      fetchData();
    } catch (e) {
      toast.error('Failed to update');
    }
  };

  const thClass = "px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap border-b border-border/60";
  const tdClass = "px-3 py-2.5 text-[12px] whitespace-nowrap border-b border-border/40";

  // ============ TAB 1: CURRENT DEPOSITS ============
  const renderCurrentTab = () => (
    <div>
      <Card className="mb-4 bg-emerald-50 border-emerald-200">
        <CardContent className="py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total Deposits Held</p>
          <p className="font-heading text-3xl font-bold tabular-nums text-emerald-900" data-testid="deposits-total">
            {fmtMoney(currentData.total)}
          </p>
        </CardContent>
      </Card>

      {currentData.deposits.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No current deposits</div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-muted/50">
                <tr>
                  <th className={thClass}>Tenant</th>
                  <th className={thClass}>Property / Unit</th>
                  <th className={thClass}>Move In</th>
                  <th className={thClass}>Move Out</th>
                  <th className={thClass}>Deposit Amount</th>
                  <th className={thClass}>Deposit Method</th>
                  <th className={thClass}>Deposit Date</th>
                  <th className={thClass}>Notes</th>
                  <th className={thClass}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentData.deposits.map((d, idx) => (
                  <tr key={d.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'} data-testid="deposit-row">
                    <td className={tdClass}>
                      <button className="font-medium text-blue-600 hover:underline" onClick={() => navigate('/tenants')}>{d.name}</button>
                    </td>
                    <td className={tdClass}>
                      <button className="text-blue-600 hover:underline" onClick={() => navigate('/')}>{d.property_name}</button>
                      {' / '}
                      <button className="text-blue-600 hover:underline" onClick={() => navigate('/units')}>Unit {d.unit_number}</button>
                    </td>
                    <td className={`${tdClass} tabular-nums`}>{fmtDate(d.move_in_date)}</td>
                    <td className={`${tdClass} tabular-nums`}>{fmtDate(d.move_out_date)}</td>
                    <td className={`${tdClass} tabular-nums font-medium`}>{fmtMoney(d.deposit_amount)}</td>
                    <td className={tdClass}>{d.payment_method || '-'}</td>
                    <td className={`${tdClass} tabular-nums`}>{fmtDate(d.deposit_date)}</td>
                    <td className={`${tdClass} max-w-[150px] truncate`} title={d.notes || ''}>{d.notes || '-'}</td>
                    <td className={tdClass}>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openReturnDialog(d)} data-testid="return-deposit-btn">
                        <ArrowDownLeft className="h-3 w-3" /> Return
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );

  // ============ TAB 2: PAST DEPOSITS ============
  const renderPastTab = () => {
    const deposits = pastData.deposits || [];
    if (deposits.length === 0) return <div className="text-center py-12 text-muted-foreground text-sm">No past deposits</div>;

    // Group by quarter of return date
    const quarterGroups = {};
    deposits.forEach(d => {
      const qKey = getQuarterKey(d.deposit_return_date);
      const qLabel = getQuarterLabel(d.deposit_return_date);
      if (!quarterGroups[qKey]) quarterGroups[qKey] = { label: qLabel, deposits: [] };
      quarterGroups[qKey].deposits.push(d);
    });

    const sorted = Object.entries(quarterGroups).sort((a, b) => b[0].localeCompare(a[0]));

    return (
      <div className="space-y-2">
        {sorted.map(([qKey, { label, deposits: qDeposits }]) => {
          const isExpanded = expandedQuarters[qKey];
          return (
            <Card key={qKey} className="overflow-hidden">
              <button className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors" onClick={() => setExpandedQuarters(p => ({ ...p, [qKey]: !p[qKey] }))}>
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="text-sm font-semibold">{label}</span>
                  <Badge variant="secondary" className="text-xs">{qDeposits.length}</Badge>
                </div>
              </button>
              {isExpanded && (
                <div className="overflow-x-auto border-t">
                  <table className="w-full border-collapse">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className={thClass}>Tenant</th>
                        <th className={thClass}>Property / Unit</th>
                        <th className={thClass}>Move In</th>
                        <th className={thClass}>Move Out</th>
                        <th className={thClass}>Deposit Amt</th>
                        <th className={thClass}>Return Date</th>
                        <th className={thClass}>Return Amt</th>
                        <th className={thClass}>Return Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {qDeposits.map((d, idx) => (
                        <tr key={d.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'}>
                          <td className={tdClass}>
                            <button className="font-medium text-blue-600 hover:underline" onClick={() => navigate('/tenants')}>{d.name}</button>
                          </td>
                          <td className={tdClass}>{d.property_name} / Unit {d.unit_number}</td>
                          <td className={`${tdClass} tabular-nums`}>{fmtDate(d.move_in_date)}</td>
                          <td className={`${tdClass} tabular-nums`}>{fmtDate(d.move_out_date)}</td>
                          <td className={`${tdClass} tabular-nums`}>{fmtMoney(d.deposit_amount)}</td>
                          <td className={`${tdClass} tabular-nums`}>{fmtDate(d.deposit_return_date)}</td>
                          <td className={`${tdClass} tabular-nums`}>{fmtMoney(d.deposit_return_amount)}</td>
                          <td className={tdClass}>{d.deposit_return_method || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    );
  };

  // ============ TAB 3: LANDLORD DEPOSITS ============
  const renderLandlordTab = () => (
    <div>
      <Card className="mb-4 bg-amber-50 border-amber-200">
        <CardContent className="py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Total Landlord Deposits</p>
          <p className="font-heading text-3xl font-bold tabular-nums text-amber-900" data-testid="landlord-deposits-total">
            {fmtMoney(landlordData.total)}
          </p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {landlordData.properties?.map(prop => {
          const isExpanded = expandedLandlordProps[prop.property_id];
          return (
            <Card key={prop.property_id} className="overflow-hidden">
              <button className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedLandlordProps(p => ({ ...p, [prop.property_id]: !p[prop.property_id] }))}>
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <button className="text-sm font-semibold text-blue-600 hover:underline" onClick={(e) => { e.stopPropagation(); navigate('/'); }}>{prop.property_name}</button>
                  {prop.building_id != null && <Badge variant="outline" className="text-xs">Bldg #{prop.building_id}</Badge>}
                </div>
                <span className="text-sm font-semibold tabular-nums">{fmtMoney(prop.total)}</span>
              </button>
              {isExpanded && (
                <div className="border-t">
                  {prop.units.map((u, idx) => (
                    <div key={u.unit_id} className={`flex items-center justify-between px-6 py-3 ${idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'} border-b border-border/30`}>
                      <button className="text-sm text-blue-600 hover:underline" onClick={() => navigate('/units')}>Unit {u.unit_number}</button>
                      {editingLandlord === u.unit_id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">$</span>
                          <Input className="w-28 h-8 text-sm" type="number" value={landlordAmount}
                            onChange={e => setLandlordAmount(e.target.value)} />
                          <Button size="sm" className="h-7 w-7 p-0" onClick={() => handleSaveLandlordDeposit(u.unit_id)}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingLandlord(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm tabular-nums font-medium">{u.landlord_deposit ? fmtMoney(u.landlord_deposit) : '-'}</span>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingLandlord(u.unit_id); setLandlordAmount(u.landlord_deposit || ''); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="deposits-page">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Deposits</h1>
        <p className="text-sm text-muted-foreground mt-1">Track tenant and landlord deposits</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">Loading...</div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList data-testid="deposits-tabs">
            <TabsTrigger value="current" data-testid="tab-current-deposits">
              Current Deposits <Badge variant="secondary" className="ml-2 text-xs">{currentData.deposits.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="past" data-testid="tab-past-deposits">
              Past Deposits <Badge variant="secondary" className="ml-2 text-xs">{pastData.deposits?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="landlord" data-testid="tab-landlord-deposits">
              Landlord Deposits
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="mt-4">{renderCurrentTab()}</TabsContent>
          <TabsContent value="past" className="mt-4">{renderPastTab()}</TabsContent>
          <TabsContent value="landlord" className="mt-4">{renderLandlordTab()}</TabsContent>
        </Tabs>
      )}

      {/* Return Deposit Dialog */}
      <Dialog open={!!returnDialog} onOpenChange={() => { setReturnDialog(null); setConfirmReturn(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {confirmReturn ? 'Confirm Deposit Return' : 'Return Deposit'}
            </DialogTitle>
            <DialogDescription>
              {confirmReturn
                ? 'Please confirm the deposit return details below.'
                : `Return deposit for ${returnDialog?.name}`
              }
            </DialogDescription>
          </DialogHeader>
          {returnDialog && !confirmReturn && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg border bg-muted/30">
                <p className="text-sm font-medium">{returnDialog.name}</p>
                <p className="text-xs text-muted-foreground">{returnDialog.property_name} - Unit {returnDialog.unit_number}</p>
                <p className="text-xs text-muted-foreground">Original deposit: {fmtMoney(returnDialog.deposit_amount)}</p>
              </div>
              <div className="space-y-2">
                <Label>Return Date</Label>
                <Input type="date" value={returnForm.return_date} onChange={e => setReturnForm({ ...returnForm, return_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Return Method</Label>
                <Input value={returnForm.return_method} onChange={e => setReturnForm({ ...returnForm, return_method: e.target.value })} placeholder="e.g. Check, Zelle, Cash" />
              </div>
              <div className="space-y-2">
                <Label>Return Amount</Label>
                <Input type="number" value={returnForm.return_amount} onChange={e => setReturnForm({ ...returnForm, return_amount: e.target.value })} />
              </div>
            </div>
          )}
          {confirmReturn && (
            <div className="py-2 space-y-2">
              <div className="p-4 rounded-lg border-2 border-amber-300 bg-amber-50">
                <p className="text-sm font-semibold mb-2">Are you sure you want to return this deposit?</p>
                <p className="text-xs">Tenant: <strong>{returnDialog?.name}</strong></p>
                <p className="text-xs">Amount: <strong>{fmtMoney(returnForm.return_amount)}</strong></p>
                <p className="text-xs">Date: <strong>{returnForm.return_date}</strong></p>
                <p className="text-xs">Method: <strong>{returnForm.return_method || 'N/A'}</strong></p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReturnDialog(null); setConfirmReturn(false); }}>Cancel</Button>
            <Button onClick={handleReturnDeposit} disabled={saving} data-testid="confirm-return-deposit-btn">
              {saving ? 'Saving...' : confirmReturn ? 'Confirm Return' : 'Next'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
