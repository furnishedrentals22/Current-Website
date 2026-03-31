import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { MapPin, Lock, Unlock, Calendar, Loader2 } from 'lucide-react';

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

const getFirstDayOfWeek = (year, month) => new Date(year, month - 1, 1).getDay();

function MonthCalendar({ year, month, days, price }) {
  const firstDay = getFirstDayOfWeek(year, month);
  return (
    <div className="border border-border/70 rounded-lg p-4 bg-card" data-testid="month-calendar">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-heading font-semibold text-sm">
          {MONTH_NAMES[month - 1]} {year}
        </h4>
        {price != null ? (
          <span className="text-primary font-semibold text-sm tabular-nums">
            ${price.toLocaleString()}/mo
          </span>
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
          <div
            key={day.day}
            className={`rounded text-[11px] py-1 font-medium ${
              day.status === 'available'
                ? 'bg-emerald-100 text-emerald-800'
                : day.status === 'occupied'
                ? 'bg-slate-200 text-slate-400'
                : 'bg-slate-50 text-slate-300'
            }`}
          >
            {day.day}
          </div>
        ))}
      </div>
    </div>
  );
}

function ListingCard({ listing, index, onCheckAvailability }) {
  const image = listing.photos?.[0] || PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];
  return (
    <div
      className="group bg-card rounded-xl border border-border/70 overflow-hidden transition-shadow duration-300 hover:shadow-lg"
      data-testid="listing-card"
    >
      <div className="aspect-[4/3] overflow-hidden bg-muted relative">
        <img
          src={image}
          alt={listing.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {listing.unit_size && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium shadow-sm">
            {listing.unit_size}
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-heading text-lg font-semibold tracking-tight" data-testid="listing-title">
          {listing.title}
        </h3>
        {listing.property_name && (
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            {listing.property_name}
          </p>
        )}
        {listing.current_price != null ? (
          <p className="text-primary font-semibold text-lg mt-2 tabular-nums" data-testid="listing-price">
            ${listing.current_price.toLocaleString()}/mo
          </p>
        ) : (
          <p className="text-muted-foreground text-sm mt-2">Contact for pricing</p>
        )}
        <Button
          className="w-full mt-4"
          onClick={() => onCheckAvailability(listing)}
          data-testid="check-availability-button"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Check Availability
        </Button>
      </div>
    </div>
  );
}

export default function ListingsPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [availDialogOpen, setAvailDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [loadingAvail, setLoadingAvail] = useState(false);

  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [adminError, setAdminError] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [pricingInputs, setPricingInputs] = useState({});
  const [savingPricing, setSavingPricing] = useState(false);

  const fetchListings = async () => {
    try {
      const res = await fetch(`${API}/api/public/listings`);
      const data = await res.json();
      setListings(data);
    } catch {
      console.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchListings(); }, []);

  const handleCheckAvailability = async (listing) => {
    setSelectedListing(listing);
    setAvailDialogOpen(true);
    setAvailability(null);
    setLoadingAvail(true);
    try {
      const res = await fetch(`${API}/api/public/listings/${listing.id}/availability`);
      const data = await res.json();
      setAvailability(data);
    } catch {
      toast.error('Failed to load availability');
    } finally {
      setLoadingAvail(false);
    }
  };

  const handleAdminUnlock = async (e) => {
    e.preventDefault();
    setAdminError('');
    try {
      const res = await fetch(`${API}/api/auth/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass })
      });
      const data = await res.json();
      if (data.valid) {
        setAdminUnlocked(true);
        toast.success('Admin access granted');
      } else {
        setAdminError('Invalid password');
        setAdminPass('');
      }
    } catch {
      setAdminError('Failed to verify');
    }
  };

  const handleUnitSelect = (unitId) => {
    setSelectedUnitId(unitId);
    const listing = listings.find(l => l.id === unitId);
    const inputs = {};
    if (listing?.pricing) {
      listing.pricing.forEach(p => {
        inputs[`${p.year}-${p.month}`] = p.price;
      });
    }
    setPricingInputs(inputs);
  };

  const getNext12Months = () => {
    const today = new Date();
    const months = [];
    for (let i = 0; i < 12; i++) {
      let m = today.getMonth() + 1 + i;
      let y = today.getFullYear();
      while (m > 12) { m -= 12; y++; }
      months.push({ year: y, month: m });
    }
    return months;
  };

  const handleSavePricing = async () => {
    if (!selectedUnitId) return;
    setSavingPricing(true);

    const entries = [];
    getNext12Months().forEach(({ year, month }) => {
      const key = `${year}-${month}`;
      const price = pricingInputs[key];
      if (price !== undefined && price !== '') {
        entries.push({ year, month, price: parseFloat(price) });
      }
    });

    if (entries.length === 0) {
      toast.error('Enter at least one price');
      setSavingPricing(false);
      return;
    }

    try {
      const res = await fetch(`${API}/api/public/admin/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass, unit_id: selectedUnitId, entries })
      });
      if (res.ok) {
        toast.success('Pricing saved successfully');
        fetchListings();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Failed to save pricing');
      }
    } catch {
      toast.error('Failed to save pricing');
    } finally {
      setSavingPricing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid="listings-page">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border/60" data-testid="listings-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <h1 className="font-heading text-xl font-bold text-primary tracking-tight">
            Furnished Rentals Miami
          </h1>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-4 text-center bg-[radial-gradient(60%_60%_at_50%_0%,rgba(45,148,140,0.08)_0%,rgba(45,148,140,0)_60%)]">
        <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground">
          Find Your Furnished Rental
        </h2>
        <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-base">
          Browse our curated collection of fully furnished apartments. Check real-time availability and monthly rates.
        </p>
      </section>

      {/* Listings Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No listings available yet. Add units to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" data-testid="listings-grid">
            {listings.map((listing, idx) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                index={idx}
                onCheckAvailability={handleCheckAvailability}
              />
            ))}
          </div>
        )}
      </section>

      {/* Availability Dialog */}
      <Dialog open={availDialogOpen} onOpenChange={setAvailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="availability-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight">
              {selectedListing?.title}
            </DialogTitle>
            {selectedListing?.unit_size && (
              <p className="text-sm text-muted-foreground">{selectedListing.unit_size}</p>
            )}
          </DialogHeader>

          {loadingAvail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : availability ? (
            <div className="space-y-4">
              <div className="flex gap-4 text-xs items-center flex-wrap">
                <span className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200" />
                  Available
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-slate-200 border border-slate-300" />
                  Occupied
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-slate-50 border border-slate-100" />
                  Past
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {availability.months.map(month => (
                  <MonthCalendar
                    key={`${month.year}-${month.month}`}
                    year={month.year}
                    month={month.month}
                    days={month.days}
                    price={month.price}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Admin Pricing Section */}
      <section className="border-t bg-muted/20 py-12" data-testid="admin-pricing-section">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {!adminUnlocked ? (
            <Card className="shadow-sm">
              <CardContent className="py-8 text-center">
                <Lock className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                <h3 className="font-heading text-lg font-semibold mb-1">Admin Access</h3>
                <p className="text-sm text-muted-foreground mb-5">Enter password to manage listing pricing</p>
                <form onSubmit={handleAdminUnlock} className="flex gap-2 max-w-xs mx-auto">
                  <Input
                    type="password"
                    placeholder="Password"
                    value={adminPass}
                    onChange={(e) => { setAdminPass(e.target.value); setAdminError(''); }}
                    data-testid="admin-password-input"
                  />
                  <Button type="submit" data-testid="admin-unlock-button">Unlock</Button>
                </form>
                {adminError && <p className="text-sm text-destructive mt-2" data-testid="admin-error">{adminError}</p>}
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm">
              <CardContent className="py-6">
                <div className="flex items-center gap-2 mb-6">
                  <Unlock className="h-5 w-5 text-primary" />
                  <h3 className="font-heading text-lg font-semibold">Manage Listing Pricing</h3>
                </div>

                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Select Unit</Label>
                    <Select value={selectedUnitId} onValueChange={handleUnitSelect}>
                      <SelectTrigger data-testid="admin-unit-select">
                        <SelectValue placeholder="Choose a unit..." />
                      </SelectTrigger>
                      <SelectContent>
                        {listings.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedUnitId && (
                    <>
                      <div>
                        <Label className="text-sm font-medium mb-3 block">Monthly Pricing (next 12 months)</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                          {getNext12Months().map(({ year, month }) => {
                            const key = `${year}-${month}`;
                            return (
                              <div key={key} className="border border-border/70 rounded-lg p-3 bg-background">
                                <Label className="text-xs text-muted-foreground block mb-1.5">
                                  {MONTH_NAMES[month - 1]} {year}
                                </Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    className="pl-7"
                                    value={pricingInputs[key] ?? ''}
                                    onChange={(e) => setPricingInputs(prev => ({ ...prev, [key]: e.target.value }))}
                                    data-testid={`pricing-input-${month}-${year}`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <Button
                        onClick={handleSavePricing}
                        disabled={savingPricing}
                        className="w-full sm:w-auto"
                        data-testid="save-pricing-button"
                      >
                        {savingPricing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Pricing'
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Furnished Rentals Miami. All rights reserved.
          </p>
        </div>
      </footer>

      <Toaster position="bottom-right" />
    </div>
  );
}
