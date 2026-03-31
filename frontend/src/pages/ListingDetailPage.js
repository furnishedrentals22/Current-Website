import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { ChevronLeft, ChevronRight, MapPin, Lock, Unlock, Calendar, Loader2, Upload, X, ArrowLeft, Pencil, Trash2, Save, Settings, LogOut } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1759238136859-b6fe007fe126?w=1200&h=900&fit=crop&q=80',
  'https://images.unsplash.com/photo-1759722667849-1a08d026db89?w=1200&h=900&fit=crop&q=80',
  'https://images.unsplash.com/photo-1759722668109-0ce25491240a?w=1200&h=900&fit=crop&q=80',
];

const getFirstDayOfWeek = (year, month) => new Date(year, month - 1, 1).getDay();

function MonthCalendar({ year, month, days, price }) {
  const firstDay = getFirstDayOfWeek(year, month);
  return (
    <div className="border border-border/70 rounded-lg p-4 bg-card" data-testid="month-calendar">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-heading font-semibold text-sm">{MONTH_NAMES[month - 1]} {year}</h4>
        {price != null ? (
          <span className="text-primary font-semibold text-sm tabular-nums">${price.toLocaleString()}/mo</span>
        ) : (
          <span className="text-muted-foreground text-xs">Contact for pricing</span>
        )}
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-[10px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
        {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
        {days.map(day => (
          <div key={day.day} className={`rounded text-[11px] py-1 font-medium ${
            day.status === 'available' ? 'bg-emerald-100 text-emerald-800' :
            day.status === 'occupied' ? 'bg-slate-200 text-slate-400' : 'bg-slate-50 text-slate-300'
          }`}>{day.day}</div>
        ))}
      </div>
    </div>
  );
}

function getNext18Months() {
  const today = new Date();
  const months = [];
  for (let i = 0; i < 18; i++) {
    let m = today.getMonth() + 1 + i;
    let y = today.getFullYear();
    while (m > 12) { m -= 12; y++; }
    months.push({ year: y, month: m });
  }
  return months;
}

export default function ListingDetailPage() {
  const { id } = useParams();
  const fileInputRef = useRef(null);

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);

  const [availability, setAvailability] = useState(null);
  const [showAvailDialog, setShowAvailDialog] = useState(false);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [availStartYear, setAvailStartYear] = useState(() => new Date().getFullYear());
  const [availStartMonth, setAvailStartMonth] = useState(() => new Date().getMonth() + 1);
  const [availMonthCount, setAvailMonthCount] = useState(6);

  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPass, setAdminPass] = useState(() => sessionStorage.getItem('listings_admin_pass') || '');
  const [adminError, setAdminError] = useState('');
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [selectedMonths, setSelectedMonths] = useState([]);
  const [priceInput, setPriceInput] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('listings_admin_pass');
    if (stored) {
      fetch(`${API}/api/auth/verify-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: stored })
      }).then(r => r.json()).then(d => { if (d.valid) { setAdminUnlocked(true); setAdminPass(stored); } });
    }
  }, []);

  const fetchListing = async () => {
    try {
      const res = await fetch(`${API}/api/public/listings/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setListing(data);
      setEditTitle(data.title);
      setEditDesc(data.description || '');
    } catch { toast.error('Failed to load listing'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchListing(); }, [id]);

  const photos = listing?.photos?.length > 0
    ? listing.photos.map(p => ({ ...p, src: p.url.startsWith('http') ? p.url : `${API}${p.url}` }))
    : PLACEHOLDER_IMAGES.map((url, i) => ({ id: `ph-${i}`, src: url, filename: 'Placeholder', isPlaceholder: true }));

  const fetchAvailability = async (sy, sm, count) => {
    setLoadingAvail(true);
    try {
      const params = new URLSearchParams({ start_year: sy, start_month: sm, num_months: count });
      const res = await fetch(`${API}/api/public/listings/${id}/availability?${params}`);
      setAvailability(await res.json());
    } catch { toast.error('Failed to load availability'); }
    finally { setLoadingAvail(false); }
  };

  const handleCheckAvailability = async () => {
    setShowAvailDialog(true);
    fetchAvailability(availStartYear, availStartMonth, availMonthCount);
  };

  const navigateAvail = (dir) => {
    let newM = availStartMonth + (dir * availMonthCount);
    let newY = availStartYear;
    while (newM > 12) { newM -= 12; newY++; }
    while (newM < 1) { newM += 12; newY--; }
    setAvailStartMonth(newM);
    setAvailStartYear(newY);
    fetchAvailability(newY, newM, availMonthCount);
  };

  const changeMonthCount = (count) => {
    setAvailMonthCount(count);
    fetchAvailability(availStartYear, availStartMonth, count);
  };

  const handleAdminUnlock = async (e) => {
    e.preventDefault();
    setAdminError('');
    try {
      const res = await fetch(`${API}/api/auth/verify-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass })
      });
      const data = await res.json();
      if (data.valid) {
        setAdminUnlocked(true);
        sessionStorage.setItem('listings_admin_pass', adminPass);
        toast.success('Admin access granted');
      } else { setAdminError('Invalid password'); setAdminPass(''); }
    } catch { setAdminError('Failed to verify'); }
  };

  const handleAdminLogout = () => {
    setAdminUnlocked(false);
    setAdminPass('');
    sessionStorage.removeItem('listings_admin_pass');
    setShowAdminDialog(false);
    setEditing(false);
    setSelectedMonths([]);
    setPriceInput('');
    toast.success('Logged out of admin');
  };

  const handleSaveDetails = async () => {
    setSavingDetails(true);
    try {
      const res = await fetch(`${API}/api/public/admin/listings/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass, title: editTitle, description: editDesc })
      });
      if (res.ok) { toast.success('Listing updated'); setEditing(false); fetchListing(); }
      else toast.error('Failed to update');
    } catch { toast.error('Failed to update'); }
    finally { setSavingDetails(false); }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API}/api/public/admin/listings/${id}/photos?password=${encodeURIComponent(adminPass)}`, {
        method: 'POST', body: formData
      });
      if (res.ok) { toast.success('Photo uploaded'); setCurrentPhotoIdx(0); fetchListing(); }
      else toast.error('Upload failed');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handlePhotoDelete = async (photoId) => {
    try {
      const res = await fetch(`${API}/api/public/admin/listings/${id}/photos/delete`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass, photo_id: photoId })
      });
      if (res.ok) { toast.success('Photo removed'); setCurrentPhotoIdx(0); fetchListing(); }
    } catch { toast.error('Failed to delete'); }
  };

  const toggleMonth = (year, month) => {
    const key = `${year}-${month}`;
    setSelectedMonths(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleSetPrice = async () => {
    if (selectedMonths.length === 0 || !priceInput) { toast.error('Select months and enter a price'); return; }
    setSavingPrice(true);
    const entries = selectedMonths.map(key => {
      const [y, m] = key.split('-').map(Number);
      return { year: y, month: m, price: parseFloat(priceInput) };
    });
    try {
      const res = await fetch(`${API}/api/public/admin/pricing`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass, unit_id: id, entries })
      });
      if (res.ok) { toast.success(`Price set for ${selectedMonths.length} month(s)`); setSelectedMonths([]); setPriceInput(''); fetchListing(); fetchAvailability(availStartYear, availStartMonth, availMonthCount); }
    } catch { toast.error('Failed to save'); }
    finally { setSavingPrice(false); }
  };

  const handleDeletePrice = async (year, month) => {
    try {
      const res = await fetch(`${API}/api/public/admin/pricing/delete`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass, unit_id: id, year, month })
      });
      if (res.ok) { toast.success('Price removed'); fetchListing(); fetchAvailability(availStartYear, availStartMonth, availMonthCount); }
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  );

  if (!listing) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground text-lg">Listing not found</p>
      <Link to="/listings"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />See All Listings</Button></Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background" data-testid="listing-detail-page">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/listings" className="font-heading text-xl font-bold text-primary tracking-tight">Furnished Rentals Miami</Link>
          <div className="flex items-center gap-2">
            <Link to="/listings" data-testid="see-all-listings-link">
              <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />See All Listings</Button>
            </Link>
            {adminUnlocked ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setShowAdminDialog(true)} data-testid="detail-admin-open-button">
                  <Settings className="h-4 w-4 mr-1" />Admin
                </Button>
                <Button variant="ghost" size="sm" onClick={handleAdminLogout} data-testid="detail-admin-logout-button">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setShowAdminDialog(true)} className="text-muted-foreground" data-testid="detail-admin-open-button">
                <Lock className="h-4 w-4 mr-1" />Admin
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Carousel */}
          <div className="relative" data-testid="image-carousel">
            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-muted relative">
              <img src={photos[currentPhotoIdx]?.src} alt={listing.title} className="w-full h-full object-cover" />
              {photos.length > 1 && (
                <>
                  <button onClick={() => setCurrentPhotoIdx(i => (i - 1 + photos.length) % photos.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white transition-colors"
                    data-testid="carousel-prev"><ChevronLeft className="h-5 w-5" /></button>
                  <button onClick={() => setCurrentPhotoIdx(i => (i + 1) % photos.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white transition-colors"
                    data-testid="carousel-next"><ChevronRight className="h-5 w-5" /></button>
                </>
              )}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {photos.map((_, i) => (
                  <button key={i} onClick={() => setCurrentPhotoIdx(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${i === currentPhotoIdx ? 'bg-white shadow' : 'bg-white/50'}`} />
                ))}
              </div>
              <div className="absolute top-3 right-3 bg-black/50 text-white rounded-full px-2.5 py-0.5 text-xs font-medium">
                {currentPhotoIdx + 1} / {photos.length}
              </div>
            </div>
          </div>

          {/* Unit Info */}
          <div className="space-y-4" data-testid="listing-info">
            {listing.unit_size && (
              <span className="inline-block bg-muted rounded-full px-3 py-1 text-xs font-medium">{listing.unit_size}</span>
            )}
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight" data-testid="detail-title">{listing.title}</h1>
            {listing.property_name && (
              <p className="text-muted-foreground flex items-center gap-1.5"><MapPin className="h-4 w-4" />{listing.property_name}</p>
            )}
            {listing.current_price != null ? (
              <p className="text-primary font-bold text-2xl tabular-nums" data-testid="detail-price">${listing.current_price.toLocaleString()}/mo</p>
            ) : (
              <p className="text-muted-foreground">Contact for pricing</p>
            )}
            {listing.description && <p className="text-sm text-muted-foreground leading-relaxed">{listing.description}</p>}
            <Button size="lg" className="w-full sm:w-auto" onClick={handleCheckAvailability} data-testid="check-availability-button">
              <Calendar className="h-4 w-4 mr-2" />Check Availability
            </Button>
          </div>
        </div>
      </div>

      {/* Availability Dialog */}
      <Dialog open={showAvailDialog} onOpenChange={setShowAvailDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="availability-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">{listing.title}</DialogTitle>
          </DialogHeader>
          {loadingAvail ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : availability ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex gap-4 text-xs items-center flex-wrap">
                  <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200" />Available</span>
                  <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-slate-200 border border-slate-300" />Occupied</span>
                  <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-slate-50 border border-slate-100" />Past</span>
                </div>
                <div className="flex items-center gap-1">
                  {[3, 6, 12].map(n => (
                    <button key={n} onClick={() => changeMonthCount(n)} data-testid={`avail-count-${n}`}
                      className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${availMonthCount === n ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted'}`}>
                      {n}mo
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => navigateAvail(-1)} data-testid="avail-prev">
                  <ChevronLeft className="h-4 w-4 mr-1" />Prev
                </Button>
                <span className="text-sm font-medium text-muted-foreground">
                  {MONTH_NAMES[availStartMonth - 1]} {availStartYear} &ndash; {availability.months?.length > 0 ? `${MONTH_NAMES[availability.months[availability.months.length - 1].month - 1]} ${availability.months[availability.months.length - 1].year}` : ''}
                </span>
                <Button variant="outline" size="sm" onClick={() => navigateAvail(1)} data-testid="avail-next">
                  Next<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {availability.months.map(month => (
                  <MonthCalendar key={`${month.year}-${month.month}`} year={month.year} month={month.month} days={month.days} price={month.price} />
                ))}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Admin Dialog */}
      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="detail-admin-section">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg flex items-center gap-2">
              {adminUnlocked ? <><Unlock className="h-5 w-5 text-primary" />Edit Listing</> : <><Lock className="h-5 w-5 text-muted-foreground" />Admin Access</>}
            </DialogTitle>
          </DialogHeader>
          {!adminUnlocked ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">Enter password to edit this listing</p>
              <form onSubmit={handleAdminUnlock} className="flex gap-2 max-w-xs mx-auto">
                <Input type="password" placeholder="Password" value={adminPass} onChange={e => { setAdminPass(e.target.value); setAdminError(''); }} data-testid="detail-admin-password" />
                <Button type="submit" data-testid="detail-admin-unlock">Unlock</Button>
              </form>
              {adminError && <p className="text-sm text-destructive mt-2">{adminError}</p>}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Edit Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm flex items-center gap-1.5"><Pencil className="h-4 w-4 text-primary" />Details</h4>
                  {!editing && <Button variant="outline" size="sm" onClick={() => setEditing(true)} data-testid="edit-details-button"><Pencil className="h-3 w-3 mr-1" />Edit</Button>}
                </div>
                {editing ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm mb-1 block">Title</Label>
                      <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} data-testid="edit-title-input" />
                    </div>
                    <div>
                      <Label className="text-sm mb-1 block">Description</Label>
                      <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} data-testid="edit-description-input" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveDetails} disabled={savingDetails} data-testid="save-details-button">
                        {savingDetails ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditing(false); setEditTitle(listing.title); setEditDesc(listing.description || ''); }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <p><strong>Title:</strong> {listing.title}</p>
                    {listing.description && <p className="mt-1"><strong>Description:</strong> {listing.description}</p>}
                  </div>
                )}
              </div>

              <hr />

              {/* Photos Management */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm flex items-center gap-1.5"><Upload className="h-4 w-4 text-primary" />Photos</h4>
                  <div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} data-testid="upload-photo-button">
                      {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}Upload
                    </Button>
                  </div>
                </div>
                {listing.photos?.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {listing.photos.map(photo => (
                      <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                        <img src={`${API}${photo.url}`} alt={photo.filename} className="w-full h-full object-cover" />
                        <button onClick={() => handlePhotoDelete(photo.id)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`delete-photo-${photo.id}`}>
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No photos uploaded yet.</p>
                )}
              </div>

              <hr />

              {/* Pricing Management */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-1.5"><Unlock className="h-4 w-4 text-primary" />Pricing</h4>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Select Months ({selectedMonths.length} selected)</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {getNext18Months().map(({ year, month }) => {
                      const key = `${year}-${month}`;
                      const sel = selectedMonths.includes(key);
                      return (
                        <button key={key} onClick={() => toggleMonth(year, month)} data-testid={`detail-month-chip-${month}-${year}`}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${sel ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-muted'}`}>
                          {MONTH_NAMES[month - 1].slice(0, 3)} '{String(year).slice(2)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-3 items-end">
                  <div className="flex-1 max-w-[180px]">
                    <Label className="text-sm mb-1 block">Price</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input type="number" placeholder="0" className="pl-7" value={priceInput} onChange={e => setPriceInput(e.target.value)} data-testid="detail-price-input" />
                    </div>
                  </div>
                  <Button size="sm" onClick={handleSetPrice} disabled={savingPrice || selectedMonths.length === 0} data-testid="detail-set-price-button">
                    {savingPrice ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Set Price{selectedMonths.length > 0 ? ` for ${selectedMonths.length} mo` : ''}
                  </Button>
                </div>
                {listing.pricing?.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Current Pricing</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {listing.pricing.sort((a, b) => a.year - b.year || a.month - b.month).map(p => (
                        <div key={`${p.year}-${p.month}`} className="flex items-center gap-1.5 bg-muted rounded-full px-2.5 py-1 text-xs">
                          <span className="font-medium">{MONTH_NAMES[p.month - 1].slice(0, 3)} {p.year}</span>
                          <span className="text-primary font-semibold">${p.price.toLocaleString()}</span>
                          <button onClick={() => handleDeletePrice(p.year, p.month)} className="text-destructive hover:text-destructive/80 ml-0.5"><X className="h-3 w-3" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <footer className="border-t bg-card py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Furnished Rentals Miami. All rights reserved.</p>
        </div>
      </footer>
      <Toaster position="bottom-right" />
    </div>
  );
}
