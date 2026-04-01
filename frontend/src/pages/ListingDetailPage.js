import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import {
  ChevronLeft, ChevronRight, MapPin, Lock, Unlock, Calendar, Loader2,
  Upload, X, ArrowLeft, Pencil, Trash2, Save, Settings, LogOut,
  Star, GripVertical, ArrowUp, ArrowDown, Image, Video, Plus, Check,
  Wifi, Snowflake, UtensilsCrossed, WashingMachine, Wind, Tv, Waves,
  Bath, Car, Dumbbell, ArrowUpDown, Fence, Umbrella, PawPrint, Coffee,
  Sparkles, Shirt, Flame, ShieldCheck, Laptop, Bold, Type
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const API = process.env.REACT_APP_BACKEND_URL;

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&h=900&fit=crop&q=90',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=900&fit=crop&q=90',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=900&fit=crop&q=90',
];

// Icon mapping for amenities
const AMENITY_ICONS = {
  'wifi': Wifi,
  'snowflake': Snowflake,
  'utensils-crossed': UtensilsCrossed,
  'washing-machine': WashingMachine,
  'wind': Wind,
  'tv': Tv,
  'waves': Waves,
  'bath': Bath,
  'car': Car,
  'dumbbell': Dumbbell,
  'arrow-up-down': ArrowUpDown,
  'fence': Fence,
  'umbrella': Umbrella,
  'paw-print': PawPrint,
  'coffee': Coffee,
  'sparkles': Sparkles,
  'shirt': Shirt,
  'flame': Flame,
  'shield-check': ShieldCheck,
  'laptop': Laptop,
};

function AmenityIcon({ icon, className = "h-5 w-5" }) {
  const IconComp = AMENITY_ICONS[icon] || Sparkles;
  return <IconComp className={className} />;
}

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

// ─── Rich Text Editor ─────────────────────────────────────────────────────
function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current && editorRef.current) {
      editorRef.current.innerHTML = value || '';
      isInitialMount.current = false;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCmd = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    handleInput();
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-muted/30">
        <button
          type="button"
          onClick={() => execCmd('bold')}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button
          type="button"
          onClick={() => execCmd('insertParagraph')}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="New Paragraph"
        >
          <Type className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="min-h-[120px] max-h-[300px] overflow-y-auto p-3 text-sm leading-relaxed focus:outline-none prose prose-sm max-w-none"
        data-testid="rich-text-editor"
        style={{ whiteSpace: 'pre-wrap' }}
      />
    </div>
  );
}

// ─── Description Renderer ──────────────────────────────────────────────────
function DescriptionDisplay({ html }) {
  if (!html) return null;
  return (
    <div
      className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
      data-testid="listing-description"
    />
  );
}

// ─── Map Component ─────────────────────────────────────────────────────────
function LocationMap({ lat, lng, address }) {
  if (!lat || !lng) return null;
  const position = [lat, lng];
  return (
    <div className="rounded-xl overflow-hidden border border-border/70 mt-6" data-testid="location-map">
      <MapContainer center={position} zoom={15} scrollWheelZoom={true} style={{ height: '300px', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>{address}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

// ─── Amenity Picker Dialog ─────────────────────────────────────────────────
function AmenityPicker({ open, onOpenChange, currentAmenities, onSave, adminPass }) {
  const [defaults, setDefaults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    fetch(`${API}/api/public/amenities/defaults`)
      .then(r => r.json())
      .then(setDefaults)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      setSelected(currentAmenities.map(a => ({ ...a })));
    }
  }, [open, currentAmenities]);

  const isSelected = (name) => selected.some(s => s.name === name);

  const toggleDefault = (amenity) => {
    if (isSelected(amenity.name)) {
      setSelected(prev => prev.filter(s => s.name !== amenity.name));
    } else {
      setSelected(prev => [...prev, { name: amenity.name, icon: amenity.icon }]);
    }
  };

  const addCustom = () => {
    const name = customName.trim();
    if (!name || isSelected(name)) return;
    setSelected(prev => [...prev, { name, icon: 'sparkles' }]);
    setCustomName('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Manage Amenities</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Common Amenities</Label>
            <div className="grid grid-cols-2 gap-2">
              {defaults.map(amenity => (
                <button
                  key={amenity.name}
                  onClick={() => toggleDefault(amenity)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                    isSelected(amenity.name)
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <AmenityIcon icon={amenity.icon} className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">{amenity.name}</span>
                  {isSelected(amenity.name) && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Add Custom Amenity</Label>
            <div className="flex gap-2">
              <Input
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="e.g., Rooftop Access"
                onKeyDown={e => e.key === 'Enter' && addCustom()}
              />
              <Button variant="outline" onClick={addCustom} disabled={!customName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {selected.filter(s => !defaults.some(d => d.name === s.name)).length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Custom Amenities</Label>
              <div className="flex flex-wrap gap-2">
                {selected.filter(s => !defaults.some(d => d.name === s.name)).map(s => (
                  <div key={s.name} className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1 text-xs">
                    <AmenityIcon icon={s.icon} className="h-3 w-3" />
                    <span>{s.name}</span>
                    <button onClick={() => setSelected(prev => prev.filter(p => p.name !== s.name))} className="text-destructive hover:text-destructive/80 ml-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => { onSave(selected); onOpenChange(false); }}>
              Save Amenities ({selected.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


export default function ListingDetailPage() {
  const { id } = useParams();
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

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
  const [editAddress, setEditAddress] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const [selectedMonths, setSelectedMonths] = useState([]);
  const [priceInput, setPriceInput] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);

  const [showAmenityPicker, setShowAmenityPicker] = useState(false);
  const [savingAmenities, setSavingAmenities] = useState(false);
  const [settingCover, setSettingCover] = useState(null);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('listings_admin_pass');
    if (stored) {
      fetch(`${API}/api/auth/verify-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: stored })
      }).then(r => r.json()).then(d => { if (d.valid) { setAdminUnlocked(true); setAdminPass(stored); } });
    }
  }, []);

  const fetchListing = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/public/listings/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setListing(data);
      setEditTitle(data.title);
      setEditDesc(data.description || '');
      setEditAddress(data.address || '');
    } catch { toast.error('Failed to load listing'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchListing(); }, [fetchListing]);

  const photos = useMemo(() => {
    if (listing?.photos?.length > 0) {
      return listing.photos.map(p => ({ ...p, src: p.url.startsWith('http') ? p.url : `${API}${p.url}` }));
    }
    return PLACEHOLDER_IMAGES.map((url, i) => ({ id: `ph-${i}`, src: url, filename: 'Placeholder', isPlaceholder: true }));
  }, [listing]);

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
      // Geocode address if provided
      let lat = listing?.address_lat;
      let lng = listing?.address_lng;
      if (editAddress && editAddress !== listing?.address) {
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(editAddress)}&limit=1`, {
            headers: { 'User-Agent': 'FurnishedRentals/1.0' }
          });
          const geoData = await geoRes.json();
          if (geoData.length > 0) {
            lat = parseFloat(geoData[0].lat);
            lng = parseFloat(geoData[0].lon);
          }
        } catch { /* geocoding failed, save without coords */ }
      }

      const res = await fetch(`${API}/api/public/admin/listings/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: adminPass,
          title: editTitle,
          description: editDesc,
          address: editAddress,
          address_lat: lat,
          address_lng: lng,
        })
      });
      if (res.ok) { toast.success('Listing updated'); setEditing(false); fetchListing(); }
      else toast.error('Failed to update');
    } catch { toast.error('Failed to update'); }
    finally { setSavingDetails(false); }
  };

  // Multi-file upload
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      if (files.length === 1) {
        const formData = new FormData();
        formData.append('file', files[0]);
        const res = await fetch(`${API}/api/public/admin/listings/${id}/photos?password=${encodeURIComponent(adminPass)}`, {
          method: 'POST', body: formData
        });
        if (res.ok) toast.success('Photo uploaded');
        else toast.error('Upload failed');
      } else {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        const res = await fetch(`${API}/api/public/admin/listings/${id}/photos/batch?password=${encodeURIComponent(adminPass)}`, {
          method: 'POST', body: formData
        });
        if (res.ok) {
          const data = await res.json();
          toast.success(`${data.count} photos uploaded`);
        } else toast.error('Upload failed');
      }
      setCurrentPhotoIdx(0);
      fetchListing();
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

  const handleSetCover = async (photoId) => {
    setSettingCover(photoId);
    try {
      const res = await fetch(`${API}/api/public/admin/listings/${id}/photos/cover`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass, photo_id: photoId })
      });
      if (res.ok) { toast.success('Cover photo set'); fetchListing(); }
      else toast.error('Failed to set cover');
    } catch { toast.error('Failed to set cover'); }
    finally { setSettingCover(null); }
  };

  const handleMovePhoto = async (photoId, direction) => {
    const currentPhotos = listing?.photos || [];
    const idx = currentPhotos.findIndex(p => p.id === photoId);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= currentPhotos.length) return;

    const newOrder = [...currentPhotos];
    [newOrder[idx], newOrder[newIdx]] = [newOrder[newIdx], newOrder[idx]];
    const photoIds = newOrder.map(p => p.id);

    setReordering(true);
    try {
      const res = await fetch(`${API}/api/public/admin/listings/${id}/photos/reorder`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass, photo_ids: photoIds })
      });
      if (res.ok) { fetchListing(); }
      else toast.error('Failed to reorder');
    } catch { toast.error('Failed to reorder'); }
    finally { setReordering(false); }
  };

  // Video
  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API}/api/public/admin/listings/${id}/video?password=${encodeURIComponent(adminPass)}`, {
        method: 'POST', body: formData
      });
      if (res.ok) { toast.success('Video uploaded'); fetchListing(); }
      else toast.error('Video upload failed');
    } catch { toast.error('Video upload failed'); }
    finally { setUploadingVideo(false); if (videoInputRef.current) videoInputRef.current.value = ''; }
  };

  const handleVideoDelete = async () => {
    try {
      const res = await fetch(`${API}/api/public/admin/listings/${id}/video/delete`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass })
      });
      if (res.ok) { toast.success('Video removed'); fetchListing(); }
    } catch { toast.error('Failed to delete video'); }
  };

  // Amenities
  const handleSaveAmenities = async (amenities) => {
    setSavingAmenities(true);
    try {
      const res = await fetch(`${API}/api/public/admin/listings/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass, amenities })
      });
      if (res.ok) { toast.success('Amenities updated'); fetchListing(); }
      else toast.error('Failed to save amenities');
    } catch { toast.error('Failed to save amenities'); }
    finally { setSavingAmenities(false); }
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
      if (res.ok) { toast.success(`Price set for ${selectedMonths.length} month(s)`); setSelectedMonths([]); setPriceInput(''); fetchListing(); }
    } catch { toast.error('Failed to save'); }
    finally { setSavingPrice(false); }
  };

  const handleDeletePrice = async (year, month) => {
    try {
      const res = await fetch(`${API}/api/public/admin/pricing/delete`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass, unit_id: id, year, month })
      });
      if (res.ok) { toast.success('Price removed'); fetchListing(); }
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

  const videoUrl = listing.video?.url ? (listing.video.url.startsWith('http') ? listing.video.url : `${API}${listing.video.url}`) : null;

  return (
    <div className="min-h-screen bg-background" data-testid="listing-detail-page">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/listings" className="font-heading text-xl font-bold text-primary tracking-tight">Furnished Rentals Miami</Link>
          <div className="flex items-center gap-2">
            <Link to="/listings" data-testid="see-all-listings-link">
              <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />All Listings</Button>
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
          {/* ─── Image Carousel ──────────────────────────────────────── */}
          <div className="relative" data-testid="image-carousel">
            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-muted relative">
              <img
                src={photos[currentPhotoIdx]?.src}
                alt={listing.title}
                className="w-full h-full object-cover"
                style={{ imageRendering: 'auto' }}
                decoding="async"
              />
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
                {photos.slice(0, 10).map((_, i) => (
                  <button key={i} onClick={() => setCurrentPhotoIdx(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${i === currentPhotoIdx ? 'bg-white shadow' : 'bg-white/50'}`} />
                ))}
                {photos.length > 10 && <span className="text-white text-xs ml-1">+{photos.length - 10}</span>}
              </div>
              <div className="absolute top-3 right-3 bg-black/50 text-white rounded-full px-2.5 py-0.5 text-xs font-medium">
                {currentPhotoIdx + 1} / {photos.length}
              </div>
              {photos[currentPhotoIdx]?.is_cover && (
                <div className="absolute top-3 left-3 bg-yellow-500/90 text-white rounded-full px-2.5 py-0.5 text-xs font-medium flex items-center gap-1">
                  <Star className="h-3 w-3" /> Cover
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {photos.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                {photos.map((photo, i) => (
                  <button
                    key={photo.id}
                    onClick={() => setCurrentPhotoIdx(i)}
                    className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      i === currentPhotoIdx ? 'border-primary' : 'border-transparent hover:border-border'
                    }`}
                  >
                    <img src={photo.src} alt="" className="w-full h-full object-cover" loading="lazy" />
                    {photo.is_cover && (
                      <div className="absolute inset-0 flex items-center justify-center bg-yellow-500/30">
                        <Star className="h-3 w-3 text-yellow-600" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ─── Unit Info ───────────────────────────────────────────── */}
          <div className="space-y-5" data-testid="listing-info">
            {listing.unit_size && (
              <span className="inline-block bg-muted rounded-full px-3 py-1 text-xs font-medium">{listing.unit_size}</span>
            )}
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight" data-testid="detail-title">{listing.title}</h1>
            {(listing.address || listing.property_name) && (
              <p className="text-muted-foreground flex items-center gap-1.5"><MapPin className="h-4 w-4" />{listing.address || listing.property_name}</p>
            )}
            {listing.current_price != null ? (
              <p className="text-primary font-bold text-2xl tabular-nums" data-testid="detail-price">${listing.current_price.toLocaleString()}/mo</p>
            ) : (
              <p className="text-muted-foreground">Contact for pricing</p>
            )}

            {/* Description */}
            {listing.description && <DescriptionDisplay html={listing.description} />}

            {/* Amenities */}
            {listing.amenities?.length > 0 && (
              <div data-testid="amenities-section">
                <h3 className="font-heading text-lg font-semibold mb-3">What this place offers</h3>
                <div className="grid grid-cols-2 gap-3">
                  {listing.amenities.map((amenity, i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0">
                        <AmenityIcon icon={amenity.icon} className="h-4 w-4 text-foreground" />
                      </div>
                      <span className="text-sm">{amenity.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button size="lg" className="w-full sm:w-auto" onClick={handleCheckAvailability} data-testid="check-availability-button">
              <Calendar className="h-4 w-4 mr-2" />Check Availability
            </Button>
          </div>
        </div>

        {/* ─── Video Section ────────────────────────────────────────── */}
        {videoUrl && (
          <div className="mt-8" data-testid="video-section">
            <h3 className="font-heading text-lg font-semibold mb-3">Property Video</h3>
            <div className="rounded-xl overflow-hidden border border-border/70 bg-black max-w-3xl">
              <video
                controls
                className="w-full"
                preload="metadata"
                style={{ maxHeight: '500px' }}
              >
                <source src={videoUrl} type={listing.video?.content_type || 'video/mp4'} />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}

        {/* ─── Map Section ──────────────────────────────────────────── */}
        {listing.address && listing.address_lat && listing.address_lng && (
          <div className="mt-8">
            <h3 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Location
            </h3>
            <LocationMap lat={listing.address_lat} lng={listing.address_lng} address={listing.address} />
          </div>
        )}
      </div>

      {/* ─── Availability Dialog ─────────────────────────────────────── */}
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

      {/* ─── Admin Dialog ────────────────────────────────────────────── */}
      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="detail-admin-section">
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
              {/* ─── Edit Details ──────────────────────────────── */}
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
                      <Label className="text-sm mb-1 block">Description <span className="text-muted-foreground font-normal">(supports bold text & paragraphs)</span></Label>
                      <RichTextEditor value={editDesc} onChange={setEditDesc} />
                    </div>
                    <div>
                      <Label className="text-sm mb-1 block">Address</Label>
                      <Input value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="e.g., 123 Ocean Dr, Miami Beach, FL 33139" data-testid="edit-address-input" />
                      <p className="text-xs text-muted-foreground mt-1">Address will be geocoded for map display</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveDetails} disabled={savingDetails} data-testid="save-details-button">
                        {savingDetails ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditing(false); setEditTitle(listing.title); setEditDesc(listing.description || ''); setEditAddress(listing.address || ''); }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>Title:</strong> {listing.title}</p>
                    {listing.description && <div><strong>Description:</strong> <DescriptionDisplay html={listing.description} /></div>}
                    {listing.address && <p><strong>Address:</strong> {listing.address}</p>}
                  </div>
                )}
              </div>

              <hr />

              {/* ─── Amenities ────────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" />Amenities ({listing.amenities?.length || 0})</h4>
                  <Button variant="outline" size="sm" onClick={() => setShowAmenityPicker(true)} data-testid="manage-amenities-button">
                    <Plus className="h-3 w-3 mr-1" />Manage
                  </Button>
                </div>
                {listing.amenities?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {listing.amenities.map((a, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1.5 text-xs">
                        <AmenityIcon icon={a.icon} className="h-3.5 w-3.5" />
                        <span>{a.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No amenities added yet.</p>
                )}
              </div>

              <hr />

              {/* ─── Photos Management ────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm flex items-center gap-1.5"><Image className="h-4 w-4 text-primary" />Photos ({listing.photos?.length || 0})</h4>
                  <div>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} data-testid="upload-photo-button">
                      {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                      Upload Photos
                    </Button>
                  </div>
                </div>
                {listing.photos?.length > 0 ? (
                  <div className="space-y-2">
                    {listing.photos.map((photo, idx) => (
                      <div key={photo.id} className="flex items-center gap-3 p-2 rounded-lg border border-border/70 bg-card">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          <img src={`${API}${photo.url}`} alt={photo.filename} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground truncate">{photo.filename}</p>
                          <div className="flex items-center gap-1 mt-1">
                            {photo.is_cover ? (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><Star className="h-3 w-3" />Cover</span>
                            ) : (
                              <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => handleSetCover(photo.id)} disabled={settingCover === photo.id}>
                                {settingCover === photo.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Star className="h-3 w-3 mr-1" />}Set Cover
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleMovePhoto(photo.id, -1)} disabled={idx === 0 || reordering} title="Move up">
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleMovePhoto(photo.id, 1)} disabled={idx === listing.photos.length - 1 || reordering} title="Move down">
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handlePhotoDelete(photo.id)} title="Delete" data-testid={`delete-photo-${photo.id}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No photos uploaded yet. Upload multiple photos at once.</p>
                )}
              </div>

              <hr />

              {/* ─── Video Management ─────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm flex items-center gap-1.5"><Video className="h-4 w-4 text-primary" />Video</h4>
                  {!listing.video && (
                    <div>
                      <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                      <Button variant="outline" size="sm" onClick={() => videoInputRef.current?.click()} disabled={uploadingVideo} data-testid="upload-video-button">
                        {uploadingVideo ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}Upload Video
                      </Button>
                    </div>
                  )}
                </div>
                {listing.video ? (
                  <div className="flex items-center gap-3 p-2 rounded-lg border border-border/70 bg-card">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                      <Video className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{listing.video.filename}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={handleVideoDelete} title="Delete video">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <div>
                        <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => videoInputRef.current?.click()} disabled={uploadingVideo}>
                          {uploadingVideo ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Replace'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No video uploaded.</p>
                )}
              </div>

              <hr />

              {/* ─── Pricing Management ───────────────────────── */}
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

      {/* ─── Amenity Picker ──────────────────────────────────────────── */}
      <AmenityPicker
        open={showAmenityPicker}
        onOpenChange={setShowAmenityPicker}
        currentAmenities={listing.amenities || []}
        onSave={handleSaveAmenities}
        adminPass={adminPass}
      />

      <footer className="border-t bg-card py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Furnished Rentals Miami. All rights reserved.</p>
        </div>
      </footer>
      <Toaster position="bottom-right" />
    </div>
  );
}
