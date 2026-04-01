import { useState, useEffect, useCallback } from 'react';
import { getLoginAccounts, createLoginAccount, updateLoginAccount, deleteLoginAccount, verifyPin, getPinStatus, setPin } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Eye, EyeOff, Lock, Shield, Copy, Settings } from 'lucide-react';
import { toast } from 'sonner';

const LEVELS = [
  { value: 1, label: 'Low', color: 'bg-emerald-100 text-emerald-800', pinType: 'level_1' },
  { value: 2, label: 'Medium', color: 'bg-amber-100 text-amber-800', pinType: 'level_2' },
  { value: 3, label: 'High', color: 'bg-red-100 text-red-800', pinType: 'level_3' },
];

const emptyForm = {
  account_name: '', sensitivity_level: 1, username: '', password: '', email: '',
  url: '', security_question_1: '', security_answer_1: '', security_question_2: '',
  security_answer_2: '', phone: '', account_pin: '', account_type: '', notes: '',
};

export default function LoginInfoPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pinStatus, setPinStatusState] = useState({});
  const [unlockedLevels, setUnlockedLevels] = useState({});
  const [pinDialog, setPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinTarget, setPinTarget] = useState(null);
  const [formDialog, setFormDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});

  // PIN Settings state
  const [setupDialog, setSetupDialog] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminVerified, setAdminVerified] = useState(false);
  const [setupLevel, setSetupLevel] = useState('level_1');
  const [newPin, setNewPin] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [acc, ps] = await Promise.all([getLoginAccounts(), getPinStatus()]);
      setAccounts(acc); setPinStatusState(ps);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const requestUnlock = (level) => {
    const lvl = LEVELS.find(l => l.value === level);
    if (!lvl?.pinType) return;
    const pinField = `${lvl.pinType}_pin_set`;
    if (!pinStatus[pinField]) {
      toast.error(`No PIN set for ${lvl.label} level. Configure in PIN Settings.`);
      return;
    }
    setPinTarget(level); setPinInput(''); setPinDialog(true);
  };

  const handlePinVerify = async () => {
    const lvl = LEVELS.find(l => l.value === pinTarget);
    try {
      const res = await verifyPin({ pin: pinInput, pin_type: lvl.pinType });
      if (res.valid) {
        setUnlockedLevels(p => ({ ...p, [pinTarget]: true }));
        setPinDialog(false); toast.success(`${lvl.label} level unlocked`);
      } else { toast.error(res.message || 'Incorrect PIN'); }
    } catch { toast.error('Verification failed'); }
  };

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setFormDialog(true); };
  const openEdit = (acc) => {
    setEditing(acc);
    setForm({
      account_name: acc.account_name || '', sensitivity_level: acc.sensitivity_level || 1,
      username: acc.username || '', password: acc.password || '', email: acc.email || '',
      url: acc.url || '', security_question_1: acc.security_question_1 || '',
      security_answer_1: acc.security_answer_1 || '', security_question_2: acc.security_question_2 || '',
      security_answer_2: acc.security_answer_2 || '', phone: acc.phone || '',
      account_pin: acc.account_pin || '', account_type: acc.account_type || '', notes: acc.notes || '',
    });
    setFormDialog(true);
  };

  const handleSave = async () => {
    if (!form.account_name) { toast.error('Account name is required'); return; }
    setSaving(true);
    try {
      if (editing) { await updateLoginAccount(editing.id, form); toast.success('Account updated'); }
      else { await createLoginAccount(form); toast.success('Account created'); }
      setFormDialog(false); fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this account?')) return;
    try { await deleteLoginAccount(id); toast.success('Deleted'); fetchData(); }
    catch { toast.error('Failed to delete'); }
  };

  const openSetup = () => {
    setAdminPinInput(''); setAdminVerified(false); setNewPin(''); setSetupLevel('level_1');
    setSetupDialog(true);
  };

  const handleAdminVerify = async () => {
    try {
      const res = await verifyPin({ pin: adminPinInput, pin_type: 'level_3' });
      if (res.valid) {
        setAdminVerified(true); toast.success('Admin verified');
      } else { toast.error('Incorrect admin PIN'); }
    } catch { toast.error('Verification failed'); }
  };

  const handleSetPin = async () => {
    if (!newPin || newPin.length < 4) { toast.error('PIN must be at least 4 digits'); return; }
    try {
      await setPin({ pin: newPin, pin_type: setupLevel, admin_pin: adminPinInput });
      toast.success('PIN saved');
      setNewPin(''); fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to set PIN'); }
  };

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); toast.success('Copied'); };
  const togglePassword = (id) => setShowPasswords(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight" data-testid="login-info-page-title">Login Information</h1>
          <p className="text-sm text-muted-foreground mt-1">Securely store account credentials with sensitivity levels</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openSetup} data-testid="login-info-pin-settings">
            <Settings className="h-4 w-4 mr-2" />PIN Settings
          </Button>
          <Button onClick={openCreate} data-testid="login-info-add-btn"><Plus className="h-4 w-4 mr-2" />Add Account</Button>
        </div>
      </div>

      {loading ? <div className="text-center py-12 text-muted-foreground">Loading...</div> : (
        <div className="space-y-6">
          {LEVELS.map(level => {
            const levelAccounts = accounts.filter(a => (a.sensitivity_level || 1) === level.value);
            const isUnlocked = unlockedLevels[level.value];
            const pinField = `${level.pinType}_pin_set`;
            const hasPinSet = pinStatus[pinField];
            return (
              <div key={level.value} data-testid={`login-info-level-${level.value}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={level.color}><Shield className="h-3 w-3 mr-1" />{level.label} Sensitivity</Badge>
                  <span className="text-xs text-muted-foreground">{levelAccounts.length} accounts</span>
                  {!isUnlocked && (
                    <Button variant="outline" size="sm" className="h-6 text-xs ml-2" onClick={() => requestUnlock(level.value)} data-testid={`login-unlock-level-${level.value}`}>
                      <Lock className="h-3 w-3 mr-1" />Unlock
                    </Button>
                  )}
                </div>
                {!isUnlocked ? (
                  <div className="border border-dashed rounded-lg p-6 text-center bg-muted/20">
                    <Lock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {hasPinSet
                        ? `Enter PIN to view ${level.label.toLowerCase()} sensitivity accounts`
                        : `No PIN set for ${level.label.toLowerCase()} level. Set one in PIN Settings.`}
                    </p>
                  </div>
                ) : levelAccounts.length === 0 ? (
                  <div className="border border-dashed rounded-lg p-4 text-center">
                    <p className="text-xs text-muted-foreground">No accounts at this level</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {levelAccounts.map(acc => (
                      <AccountCard key={acc.id} account={acc} level={level}
                        showPassword={showPasswords[acc.id]} onTogglePassword={() => togglePassword(acc.id)}
                        onCopy={copyToClipboard} onEdit={() => openEdit(acc)} onDelete={() => handleDelete(acc.id)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Account Form Dialog */}
      <Dialog open={formDialog} onOpenChange={setFormDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Account' : 'Add Account'}</DialogTitle>
            <DialogDescription>Store login credentials securely.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Name *</Label>
                <Input value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })} data-testid="login-account-name-input" />
              </div>
              <div className="space-y-2">
                <Label>Account Type</Label>
                <Input value={form.account_type} onChange={e => setForm({ ...form, account_type: e.target.value })} placeholder="e.g. Banking, Email, Utility" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sensitivity Level</Label>
              <Select value={String(form.sensitivity_level)} onValueChange={v => setForm({ ...form, sensitivity_level: parseInt(v) })}>
                <SelectTrigger data-testid="login-sensitivity-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map(l => <SelectItem key={l.value} value={String(l.value)}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Username</Label><Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></div>
              <div className="space-y-2"><Label>Password</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>URL</Label><Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://" /></div>
            <div className="space-y-2"><Label>Account PIN</Label><Input value={form.account_pin} onChange={e => setForm({ ...form, account_pin: e.target.value })} placeholder="PIN for this specific account" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Security Question 1</Label><Input value={form.security_question_1} onChange={e => setForm({ ...form, security_question_1: e.target.value })} /></div>
              <div className="space-y-2"><Label>Answer 1</Label><Input value={form.security_answer_1} onChange={e => setForm({ ...form, security_answer_1: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Security Question 2</Label><Input value={form.security_question_2} onChange={e => setForm({ ...form, security_question_2: e.target.value })} /></div>
              <div className="space-y-2"><Label>Answer 2</Label><Input value={form.security_answer_2} onChange={e => setForm({ ...form, security_answer_2: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="login-account-save-btn">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIN Verify Dialog */}
      <Dialog open={pinDialog} onOpenChange={setPinDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle><Lock className="h-4 w-4 inline mr-2" />Enter PIN</DialogTitle>
            <DialogDescription>Enter the PIN for this sensitivity level.</DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Input type="password" placeholder="Enter PIN" value={pinInput} onChange={e => setPinInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePinVerify()} data-testid="login-pin-input" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinDialog(false)}>Cancel</Button>
            <Button onClick={handlePinVerify} data-testid="login-pin-verify-btn">Verify</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIN Settings Dialog (gated behind High PIN) */}
      <Dialog open={setupDialog} onOpenChange={setSetupDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>PIN Settings</DialogTitle>
            <DialogDescription>
              {adminVerified
                ? 'Set PINs for Low and Medium sensitivity levels.'
                : 'Enter the High sensitivity PIN (admin) to manage PINs.'}
            </DialogDescription>
          </DialogHeader>
          {!adminVerified ? (
            <div className="py-3 space-y-3">
              <div className="space-y-2">
                <Label>High Sensitivity PIN (Admin)</Label>
                <Input type="password" value={adminPinInput} onChange={e => setAdminPinInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdminVerify()}
                  placeholder="Enter admin PIN" data-testid="login-pin-admin-verify-input" autoFocus />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSetupDialog(false)}>Cancel</Button>
                <Button onClick={handleAdminVerify} data-testid="login-pin-admin-verify-btn">Verify</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="py-3 space-y-4">
              <div className="space-y-2">
                <Label>Level</Label>
                <Select value={setupLevel} onValueChange={setSetupLevel}>
                  <SelectTrigger data-testid="login-pin-level-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="level_1">Low Sensitivity</SelectItem>
                    <SelectItem value="level_2">Medium Sensitivity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>New PIN (min 4 digits)</Label>
                <Input type="password" value={newPin} onChange={e => setNewPin(e.target.value)}
                  placeholder="Enter new PIN" data-testid="login-pin-setup-input" />
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Low PIN: {pinStatus.level_1_pin_set ? 'Set' : 'Not set'}</p>
                <p>Medium PIN: {pinStatus.level_2_pin_set ? 'Set' : 'Not set'}</p>
                <p>High PIN: Always set (admin)</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSetupDialog(false)}>Cancel</Button>
                <Button onClick={handleSetPin} data-testid="login-pin-setup-save-btn">Save PIN</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AccountCard({ account: acc, level, showPassword, onTogglePassword, onCopy, onEdit, onDelete }) {
  return (
    <div className="border rounded-lg p-3 bg-card hover:bg-muted/20 transition-colors" data-testid="login-account-card">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{acc.account_name}</span>
            {acc.account_type && <Badge variant="outline" className="text-[10px]">{acc.account_type}</Badge>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
            {acc.username && <div><span className="text-muted-foreground">User: </span><span>{acc.username}</span>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-1" onClick={() => onCopy(acc.username)}><Copy className="h-3 w-3" /></Button></div>}
            {acc.password && <div><span className="text-muted-foreground">Pass: </span>
              <span className="font-mono">{showPassword ? acc.password : '********'}</span>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-1" onClick={onTogglePassword}>{showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}</Button>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => onCopy(acc.password)}><Copy className="h-3 w-3" /></Button></div>}
            {acc.email && <div><span className="text-muted-foreground">Email: </span><span>{acc.email}</span></div>}
            {acc.phone && <div><span className="text-muted-foreground">Phone: </span><span>{acc.phone}</span></div>}
            {acc.url && <div className="sm:col-span-2"><span className="text-muted-foreground">URL: </span>
              <a href={acc.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{acc.url}</a></div>}
          </div>
        </div>
        <div className="flex gap-1 ml-2">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    </div>
  );
}
