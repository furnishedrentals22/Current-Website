import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  getParkingTimeline, getParkingSpots, createParkingSpot, updateParkingSpot, deleteParkingSpot,
  createParkingAssignment, updateParkingAssignment, deleteParkingAssignment,
  getProperties, getUnits, getTenants,
} from '@/lib/api';
import { ParkingSpotRow } from '@/components/parking/ParkingSpotRow';
import { ParkingSpotDialog } from '@/components/parking/ParkingSpotDialog';
import { ParkingAssignDialog } from '@/components/parking/ParkingAssignDialog';
import { ParkingSpotsList } from '@/components/parking/ParkingSpotsList';
import { TimelineHeader } from '@/components/calendar/TimelineHeader';
import { TodayMarker } from '@/components/calendar/TodayMarker';
import { dateToX, DAY_WIDTH, HEADER_HEIGHT, ROW_HEIGHT } from '@/components/calendar/calendarConstants';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Car, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays, parseISO, eachMonthOfInterval } from 'date-fns';

const emptySpotForm = { spot_type: 'designated', spot_number: '', location: '', needs_tag: false, decal_number: '', decal_year: '', notes: '' };
const emptyAssignForm = { parking_spot_id: '', tenant_id: '', tenant_name: '', property_id: '', unit_id: '', start_date: '', end_date: '', notes: '', is_active: true };

export default function ParkingPage() {
  const [timeline, setTimeline] = useState(null);
  const [spots, setSpots] = useState([]);
  const [properties, setProperties] = useState([]);
  const [allUnits, setAllUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  const [spotDialog, setSpotDialog] = useState(false);
  const [editingSpot, setEditingSpot] = useState(null);
  const [spotForm, setSpotForm] = useState(emptySpotForm);

  const [assignDialog, setAssignDialog] = useState(false);
  const [editingAssign, setEditingAssign] = useState(null);
  const [assignForm, setAssignForm] = useState(emptyAssignForm);

  const [saving, setSaving] = useState(false);
  const [manageExpanded, setManageExpanded] = useState(false);

  const scrollRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [tl, sp, props, units, ten] = await Promise.all([
        getParkingTimeline(), getParkingSpots(), getProperties(), getUnits(), getTenants(),
      ]);
      setTimeline(tl);
      setSpots(sp);
      setProperties(props);
      setAllUnits(units);
      setTenants(ten);
    } catch { toast.error('Failed to load parking data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const propMap = useMemo(() => {
    const m = {};
    properties.forEach(p => { m[p.id] = p; });
    return m;
  }, [properties]);

  const unitMap = useMemo(() => {
    const m = {};
    allUnits.forEach(u => { m[u.id] = u; });
    return m;
  }, [allUnits]);

  const spotMap = useMemo(() => {
    const m = {};
    spots.forEach(s => { m[s.id] = s; });
    return m;
  }, [spots]);

  const { rangeStart, rangeEnd, months, totalWidth, today, totalHeight } = useMemo(() => {
    if (!timeline) return { rangeStart: new Date(), rangeEnd: new Date(), months: [], totalWidth: 0, today: new Date(), totalHeight: 0 };
    const rs = parseISO(timeline.range_start);
    const re = parseISO(timeline.range_end);
    const t = parseISO(timeline.today);
    const ms = eachMonthOfInterval({ start: rs, end: re });
    const tw = differenceInDays(re, rs) * DAY_WIDTH;
    const th = HEADER_HEIGHT + timeline.spots.length * ROW_HEIGHT;
    return { rangeStart: rs, rangeEnd: re, months: ms, totalWidth: tw, today: t, totalHeight: th };
  }, [timeline]);

  useEffect(() => {
    if (timeline && scrollRef.current) {
      const todayX = dateToX(today, rangeStart);
      scrollRef.current.scrollLeft = Math.max(0, todayX - 200);
    }
  }, [timeline, today, rangeStart]);

  const scrollBy = (dir) => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 30 * DAY_WIDTH * 3, behavior: 'smooth' });
  };

  // Spot CRUD
  const openCreateSpot = () => { setEditingSpot(null); setSpotForm({ ...emptySpotForm }); setSpotDialog(true); };
  const openEditSpot = (s) => {
    setEditingSpot(s);
    setSpotForm({
      spot_type: s.spot_type || 'designated', spot_number: s.spot_number || '', location: s.location || '',
      needs_tag: s.needs_tag || false, decal_number: s.decal_number || '', decal_year: s.decal_year || '', notes: s.notes || '',
    });
    setSpotDialog(true);
  };
  const handleSaveSpot = async () => {
    if (spotForm.spot_type === 'designated' && !spotForm.spot_number) { toast.error('Spot number is required'); return; }
    if (spotForm.spot_type === 'marlins_decal' && !spotForm.decal_number) { toast.error('Decal number is required'); return; }
    setSaving(true);
    try {
      if (editingSpot) { await updateParkingSpot(editingSpot.id, spotForm); toast.success('Spot updated'); }
      else { await createParkingSpot(spotForm); toast.success('Spot created'); }
      setSpotDialog(false); fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };
  const handleDeleteSpot = async (id) => {
    if (!window.confirm('Delete this parking spot and all its assignments?')) return;
    try { await deleteParkingSpot(id); toast.success('Deleted'); fetchData(); } catch { toast.error('Failed to delete'); }
  };

  // Assignment CRUD
  const openAssign = (spotId, startDate) => {
    setEditingAssign(null);
    setAssignForm({ ...emptyAssignForm, parking_spot_id: spotId, start_date: startDate || '' });
    setAssignDialog(true);
  };
  const openEditAssign = (a) => {
    setEditingAssign(a);
    setAssignForm({
      parking_spot_id: a.parking_spot_id || '',
      tenant_id: a.tenant_id, tenant_name: a.tenant_name || '',
      property_id: a.property_id || '', unit_id: a.unit_id || '',
      start_date: a.start_date, end_date: a.end_date, notes: a.notes || '', is_active: a.is_active ?? true,
    });
    setAssignDialog(true);
  };
  const handleSaveAssign = async () => {
    if (!assignForm.parking_spot_id || !assignForm.tenant_id || !assignForm.start_date || !assignForm.end_date) {
      toast.error('Please fill all required fields'); return;
    }
    setSaving(true);
    try {
      if (editingAssign) { await updateParkingAssignment(editingAssign.id, assignForm); toast.success('Assignment updated'); }
      else { await createParkingAssignment(assignForm); toast.success('Tenant assigned'); }
      setAssignDialog(false); fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };
  const handleDeleteAssign = async (a) => {
    if (!window.confirm(`Remove ${a.tenant_name} from this spot?`)) return;
    try { await deleteParkingAssignment(a.id); toast.success('Removed'); fetchData(); } catch { toast.error('Failed to delete'); }
  };

  // Find the spot_id from timeline data for a given assignment (assignments on timeline have parking_spot_id implicitly via parent)
  const handleBarClick = (assignment) => {
    // Find which spot this assignment belongs to
    const parentSpot = timeline?.spots?.find(s => s.assignments.some(a => a.id === assignment.id));
    openEditAssign({ ...assignment, parking_spot_id: parentSpot?.id || '' });
  };

  return (
    <div className="space-y-5" data-testid="parking-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight" data-testid="parking-page-title">Parking</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage parking spots and tenant assignments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateSpot} data-testid="parking-add-spot-btn">
            <Plus className="h-4 w-4 mr-2" />Add Spot
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => scrollBy(-1)} data-testid="parking-scroll-left">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" data-testid="parking-scroll-today"
              onClick={() => { if (scrollRef.current) scrollRef.current.scrollTo({ left: Math.max(0, dateToX(today, rangeStart) - 200), behavior: 'smooth' }); }}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => scrollBy(1)} data-testid="parking-scroll-right">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-3.5 w-8 rounded" style={{ backgroundColor: 'hsl(262, 40%, 50%)' }} />
          <span className="text-muted-foreground">Assigned Tenant</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3.5 w-0.5 rounded" style={{ backgroundColor: 'hsl(0, 74%, 50%)' }} />
          <span className="text-muted-foreground">Today</span>
        </div>
      </div>

      {/* Calendar Timeline */}
      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {!loading && timeline && timeline.spots.length === 0 && (
        <Card className="border-dashed">
          <div className="flex flex-col items-center justify-center py-16">
            <Car className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-heading text-lg font-semibold">No parking spots yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Add parking spots to see them on the timeline</p>
            <Button className="mt-4" onClick={openCreateSpot}>Add Spot</Button>
          </div>
        </Card>
      )}

      {!loading && timeline && timeline.spots.length > 0 && (
        <Card className="overflow-hidden border border-border/70" data-testid="parking-timeline-card">
          <div ref={scrollRef} className="overflow-auto relative" style={{ maxHeight: 'calc(100vh - 320px)' }} data-testid="parking-timeline-scroll">
            <TimelineHeader months={months} rangeStart={rangeStart} totalWidth={totalWidth} />
            {timeline.spots.map((spot) => (
              <ParkingSpotRow
                key={spot.id}
                spot={spot}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                months={months}
                totalWidth={totalWidth}
                onAssignClick={(spotId) => openAssign(spotId, '')}
                onBarClick={handleBarClick}
                onRowClick={(spotId, dateStr) => openAssign(spotId, dateStr)}
              />
            ))}
            <TodayMarker today={today} rangeStart={rangeStart} totalHeight={totalHeight} />
          </div>
        </Card>
      )}

      {/* Manage Spots Section */}
      {!loading && (
        <div className="border rounded-lg overflow-hidden">
          <button
            className="w-full px-4 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
            onClick={() => setManageExpanded(!manageExpanded)}
            data-testid="parking-manage-toggle"
          >
            <span className="text-sm font-semibold">Manage Parking Spots ({spots.length})</span>
            {manageExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {manageExpanded && (
            <div className="p-4">
              <ParkingSpotsList spots={spots} onEdit={openEditSpot} onDelete={handleDeleteSpot} />
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <ParkingSpotDialog
        open={spotDialog} onClose={() => setSpotDialog(false)} editing={editingSpot}
        spotForm={spotForm} setSpotForm={setSpotForm} onSave={handleSaveSpot} saving={saving}
      />
      <ParkingAssignDialog
        open={assignDialog} onClose={() => setAssignDialog(false)} editing={editingAssign}
        assignForm={assignForm} setAssignForm={setAssignForm} onSave={handleSaveAssign} saving={saving}
        tenants={tenants} properties={properties} unitMap={unitMap} spotMap={spotMap} propMap={propMap}
      />
    </div>
  );
}
