import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Lock, Unlock, Search, Loader2, X, Settings, LogOut } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1759238136859-b6fe007fe126?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1759722667849-1a08d026db89?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1759722668109-0ce25491240a?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1774716925888-190de2471de2?w=800&h=600&fit=crop&q=80',
  'https://images.pexels.com/photos/7511701/pexels-photo-7511701.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop',
];

function ListingCard({ listing, index }) {
  const image = listing.photos?.[0]
    ? `${API}${listing.photos[0].url}`
    : PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];

  return (
    <Link to={`/listings/${listing.id}`} className="block" data-testid="listing-card-link">
      <div className="group bg-card rounded-xl border border-border/70 overflow-hidden transition-shadow duration-300 hover:shadow-lg">
        <div className="aspect-[4/3] overflow-hidden bg-muted relative">
          <img src={image} alt={listing.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
          {listing.unit_size && (
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium shadow-sm">{listing.unit_size}</div>
          )}
        </div>
        <div className="p-5">
          <h3 className="font-heading text-lg font-semibold tracking-tight" data-testid="listing-title">{listing.title}</h3>
          {listing.property_name && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />{listing.property_name}
            </p>
          )}
          {listing.current_price != null ? (
            <p className="text-primary font-semibold text-lg mt-2 tabular-nums" data-testid="listing-price">${listing.current_price.toLocaleString()}/mo</p>
          ) : (
            <p className="text-muted-foreground text-sm mt-2">Contact for pricing</p>
          )}
        </div>
      </div>
    </Link>
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

export default function ListingsPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchStart, setSearchStart] = useState('');
  const [searchEnd, setSearchEnd] = useState('');
  const [searching, setSearching] = useState(false);

  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPass, setAdminPass] = useState(() => sessionStorage.getItem('listings_admin_pass') || '');
  const [adminError, setAdminError] = useState('');
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [priceInput, setPriceInput] = useState('');
  const [savingPricing, setSavingPricing] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('listings_admin_pass');
    if (stored) {
      fetch(`${API}/api/auth/verify-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: stored })
      }).then(r => r.json()).then(d => { if (d.valid) { setAdminUnlocked(true); setAdminPass(stored); } });
    }
  }, []);

  const fetchListings = async (start, end) => {
    setSearching(true);
    try {
      let url = `${API}/api/public/listings`;
      const params = new URLSearchParams();
      if (start) params.set('start_date', start);
      if (end) params.set('end_date', end);
      if (params.toString()) url += `?${params}`;
      const res = await fetch(url);
      const data = await res.json();
      setListings(data);
    } catch { console.error('Failed to load listings'); }
    finally { setLoading(false); setSearching(false); }
  };

  useEffect(() => { fetchListings(); }, []);

  const handleSearch = () => {
    if (searchStart && searchEnd) fetchListings(searchStart, searchEnd);
    else fetchListings();
  };

  const clearSearch = () => {
    setSearchStart(''); setSearchEnd('');
    fetchListings();
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

  const toggleMonth = (year, month) => {
    const key = `${year}-${month}`;
    setSelectedMonths(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleSetPrice = async () => {
    if (!selectedUnitId || selectedMonths.length === 0 || !priceInput) {
      toast.error('Select a unit, months, and enter a price');
      return;
    }
    setSavingPricing(true);
    const entries = selectedMonths.map(key => {
      const [y, m] = key.split('-').map(Number);
      return { year: y, month: m, price: parseFloat(priceInput) };
    });
    try {
      const res = await fetch(`${API}/api/public/admin/pricing`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass, unit_id: selectedUnitId, entries })
      });
      if (res.ok) {
        toast.success(`Price set for ${selectedMonths.length} month(s)`);
        setSelectedMonths([]); setPriceInput('');
        fetchListings(searchStart || undefined, searchEnd || undefined);
      } else toast.error('Failed to save');
    } catch { toast.error('Failed to save'); }
    finally { setSavingPricing(false); }
  };

  const handleDeletePrice = async (unitId, year, month) => {
    try {
      const res = await fetch(`${API}/api/public/admin/pricing/delete`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass, unit_id: unitId, year, month })
      });
      if (res.ok) { toast.success('Price removed'); fetchListings(); }
    } catch { toast.error('Failed to delete'); }
  };

  const selectedListing = listings.find(l => l.id === selectedUnitId);

  const handleAdminLogout = () => {
    setAdminUnlocked(false);
    setAdminPass('');
    sessionStorage.removeItem('listings_admin_pass');
    setShowAdminDialog(false);
    setSelectedUnitId('');
    setSelectedMonths([]);
    setPriceInput('');
    toast.success('Logged out of admin');
  };

  return (
    <div className="min-h-screen bg-background" data-testid="listings-page">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border/60" data-testid="listings-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="font-heading text-xl font-bold text-primary tracking-tight">Furnished Rentals Miami</h1>
          {adminUnlocked ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAdminDialog(true)} data-testid="admin-open-button">
                <Settings className="h-4 w-4 mr-1" />Admin
              </Button>
              <Button variant="ghost" size="sm" onClick={handleAdminLogout} data-testid="admin-logout-button">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setShowAdminDialog(true)} className="text-muted-foreground" data-testid="admin-open-button">
              <Lock className="h-4 w-4 mr-1" />Admin
            </Button>
          )}
        </div>
      </header>

      <section className="py-12 px-4 text-center bg-[radial-gradient(60%_60%_at_50%_0%,rgba(45,148,140,0.08)_0%,rgba(45,148,140,0)_60%)]">
        <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground">Find Your Furnished Rental</h2>
        <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-base">Browse our curated collection of fully furnished apartments.</p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 items-end justify-center max-w-xl mx-auto" data-testid="date-search">
          <div className="text-left w-full sm:w-auto">
            <Label className="text-xs text-muted-foreground mb-1 block">Check-in</Label>
            <Input type="date" value={searchStart} onChange={e => setSearchStart(e.target.value)} className="w-full sm:w-44" data-testid="search-start-date" />
          </div>
          <div className="text-left w-full sm:w-auto">
            <Label className="text-xs text-muted-foreground mb-1 block">Check-out</Label>
            <Input type="date" value={searchEnd} onChange={e => setSearchEnd(e.target.value)} className="w-full sm:w-44" data-testid="search-end-date" />
          </div>
          <Button onClick={handleSearch} disabled={searching} data-testid="search-button">
            <Search className="h-4 w-4 mr-1" />{searching ? 'Searching...' : 'Search'}
          </Button>
          {(searchStart || searchEnd) && (
            <Button variant="ghost" size="sm" onClick={clearSearch} data-testid="clear-search"><X className="h-4 w-4" /></Button>
          )}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">{searchStart && searchEnd ? 'No units available for those dates.' : 'No listings available yet.'}</p>
            {searchStart && searchEnd && <Button variant="outline" className="mt-4" onClick={clearSearch}>Clear Search</Button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" data-testid="listings-grid">
            {listings.map((listing, idx) => <ListingCard key={listing.id} listing={listing} index={idx} />)}
          </div>
        )}
      </section>

      {/* Admin Dialog */}
      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="admin-pricing-section">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg flex items-center gap-2">
              {adminUnlocked ? <><Unlock className="h-5 w-5 text-primary" />Manage Pricing</> : <><Lock className="h-5 w-5 text-muted-foreground" />Admin Access</>}
            </DialogTitle>
          </DialogHeader>
          {!adminUnlocked ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">Enter password to manage listing pricing</p>
              <form onSubmit={handleAdminUnlock} className="flex gap-2 max-w-xs mx-auto">
                <Input type="password" placeholder="Password" value={adminPass} onChange={e => { setAdminPass(e.target.value); setAdminError(''); }} data-testid="admin-password-input" />
                <Button type="submit" data-testid="admin-unlock-button">Unlock</Button>
              </form>
              {adminError && <p className="text-sm text-destructive mt-2">{adminError}</p>}
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-medium mb-2 block">Select Unit</Label>
                <Select value={selectedUnitId} onValueChange={v => { setSelectedUnitId(v); setSelectedMonths([]); }}>
                  <SelectTrigger data-testid="admin-unit-select"><SelectValue placeholder="Choose a unit..." /></SelectTrigger>
                  <SelectContent>{listings.map(l => <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {selectedUnitId && (
                <>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Select Months <span className="text-muted-foreground font-normal">({selectedMonths.length} selected)</span></Label>
                    <div className="flex flex-wrap gap-2">
                      {getNext18Months().map(({ year, month }) => {
                        const key = `${year}-${month}`;
                        const selected = selectedMonths.includes(key);
                        return (
                          <button key={key} onClick={() => toggleMonth(year, month)} data-testid={`month-chip-${month}-${year}`}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-muted'}`}>
                            {MONTH_NAMES[month - 1].slice(0, 3)} '{String(year).slice(2)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 max-w-[200px]">
                      <Label className="text-sm font-medium mb-1 block">Price</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input type="number" placeholder="0" className="pl-7" value={priceInput} onChange={e => setPriceInput(e.target.value)} data-testid="price-input" />
                      </div>
                    </div>
                    <Button onClick={handleSetPrice} disabled={savingPricing || selectedMonths.length === 0} data-testid="set-price-button">
                      {savingPricing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                      Set Price{selectedMonths.length > 0 ? ` for ${selectedMonths.length} mo` : ''}
                    </Button>
                  </div>

                  {selectedListing?.pricing?.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Current Pricing</Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedListing.pricing.sort((a, b) => a.year - b.year || a.month - b.month).map(p => (
                          <div key={`${p.year}-${p.month}`} className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1 text-xs">
                            <span className="font-medium">{MONTH_NAMES[p.month - 1].slice(0, 3)} {p.year}</span>
                            <span className="text-primary font-semibold">${p.price.toLocaleString()}</span>
                            <button onClick={() => handleDeletePrice(selectedUnitId, p.year, p.month)} className="text-destructive hover:text-destructive/80 ml-1" data-testid={`delete-price-${p.month}-${p.year}`}>
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
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
