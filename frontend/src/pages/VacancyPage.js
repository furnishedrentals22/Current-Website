import { useState, useEffect, useCallback } from 'react';
import { getVacancy } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, ChevronDown, ChevronRight, ChevronLeft, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatVacancyDate(dateStr) {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
  return `${dayName}, ${month}/${day}`;
}
const FULL_MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function VacantForwardView({ vacancies }) {
  const [sortMode, setSortMode] = useState('date');
  const [expanded, setExpanded] = useState({});
  const toggle = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  const VFRow = ({ v, idx }) => (
    <TableRow className={`hover:bg-muted/40 ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
      <TableCell className="font-medium">{v.property_name}</TableCell>
      <TableCell>Unit {v.unit_number}</TableCell>
      <TableCell className="tabular-nums font-medium text-amber-700">{formatVacancyDate(v.vacancy_start)}</TableCell>
    </TableRow>
  );

  const sortedByDate = [...vacancies].sort((a, b) => a.vacancy_start.localeCompare(b.vacancy_start));

  const tableHead = (
    <TableHeader><TableRow className="bg-muted/30">
      <TableHead className="text-xs font-semibold uppercase tracking-wide">Property</TableHead>
      <TableHead className="text-xs font-semibold uppercase tracking-wide">Unit</TableHead>
      <TableHead className="text-xs font-semibold uppercase tracking-wide">Next Vacant Forward</TableHead>
    </TableRow></TableHeader>
  );

  const sortButtons = (
    <div className="flex gap-2 mb-2">
      <Button size="sm" variant={sortMode === 'date' ? 'default' : 'outline'} onClick={() => setSortMode('date')} className="text-xs gap-1"><ArrowUpDown className="h-3 w-3" /> Next Vacant Forward</Button>
      <Button size="sm" variant={sortMode === 'property' ? 'default' : 'outline'} onClick={() => setSortMode('property')} className="text-xs gap-1"><ArrowUpDown className="h-3 w-3" /> By Building</Button>
    </div>
  );

  if (sortMode === 'date') {
    const byMonth = {};
    sortedByDate.forEach(v => {
      const d = new Date(v.vacancy_start + 'T00:00:00');
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${FULL_MONTH_NAMES[d.getMonth() + 1]} ${d.getFullYear()}`;
      if (!byMonth[key]) byMonth[key] = { label, items: [] };
      byMonth[key].items.push(v);
    });
    return (
      <div className="space-y-2">
        {sortButtons}
        {Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])).map(([monthKey, { label, items }]) => {
          const isOpen = expanded[monthKey] !== false;
          return (
            <Card key={monthKey} className="overflow-hidden">
              <button className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors" onClick={() => toggle(monthKey)}>
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="text-sm font-semibold">{label}</span>
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                </div>
              </button>
              {isOpen && <Table>{tableHead}<TableBody>{items.map((v, idx) => <VFRow key={idx} v={v} idx={idx} />)}</TableBody></Table>}
            </Card>
          );
        })}
      </div>
    );
  }

  // By building (property)
  const grouped = {};
  vacancies.forEach(v => {
    const key = v.property_name || 'Unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(v);
  });
  Object.values(grouped).forEach(arr => arr.sort((a, b) => a.vacancy_start.localeCompare(b.vacancy_start)));

  return (
    <div className="space-y-2">
      {sortButtons}
      {Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0])).map(([propName, items]) => {
        const isOpen = expanded[propName] !== false;
        return (
          <Card key={propName} className="overflow-hidden">
            <button className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors" onClick={() => toggle(propName)}>
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="text-sm font-semibold">{propName}</span>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>
            </button>
            {isOpen && <Table>{tableHead}<TableBody>{items.map((v, idx) => <VFRow key={idx} v={v} idx={idx} />)}</TableBody></Table>}
          </Card>
        );
      })}
    </div>
  );
}

function UpcomingVacanciesView({ vacancies }) {
  const [sortMode, setSortMode] = useState('property');
  const [expanded, setExpanded] = useState({});

  const toggle = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  const VacancyRow = ({ v, idx }) => (
    <TableRow key={idx} className={`hover:bg-muted/40 ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
      <TableCell className="font-medium">{v.property_name}</TableCell>
      <TableCell>Unit {v.unit_number}</TableCell>
      <TableCell className="tabular-nums">{formatVacancyDate(v.vacancy_start)}</TableCell>
      <TableCell>
        {v.has_future_tenant ? (
          <Badge variant="secondary" className="text-xs">Until {formatVacancyDate(v.vacancy_end)}</Badge>
        ) : (
          <Badge className="text-xs bg-amber-50 text-amber-900 border-amber-200"><AlertTriangle className="h-3 w-3 mr-1" />Vacant forward</Badge>
        )}
      </TableCell>
    </TableRow>
  );

  if (sortMode === 'property') {
    const grouped = {};
    vacancies.forEach(v => {
      const key = v.property_name || 'Unknown';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(v);
    });
    Object.values(grouped).forEach(arr => arr.sort((a, b) => {
      const aNum = parseInt(a.unit_number, 10) || 999;
      const bNum = parseInt(b.unit_number, 10) || 999;
      return aNum - bNum;
    }));

    return (
      <div className="space-y-2">
        <div className="flex gap-2 mb-2">
          <Button size="sm" variant={sortMode === 'property' ? 'default' : 'outline'} onClick={() => setSortMode('property')} className="text-xs gap-1"><ArrowUpDown className="h-3 w-3" /> By Property</Button>
          <Button size="sm" variant={sortMode === 'date' ? 'default' : 'outline'} onClick={() => setSortMode('date')} className="text-xs gap-1"><ArrowUpDown className="h-3 w-3" /> By Date</Button>
        </div>
        {Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0])).map(([propName, items]) => {
          const isOpen = expanded[propName] !== false;
          return (
            <Card key={propName} className="overflow-hidden">
              <button className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors" onClick={() => toggle(propName)}>
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="text-sm font-semibold">{propName}</span>
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                </div>
              </button>
              {isOpen && (
                <Table>
                  <TableHeader><TableRow className="bg-muted/30">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Property</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Unit</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Vacancy Starts</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>{items.map((v, idx) => <VacancyRow key={idx} v={v} idx={idx} />)}</TableBody>
                </Table>
              )}
            </Card>
          );
        })}
      </div>
    );
  }

  // Sort by date with collapsible months
  const sortedByDate = [...vacancies].sort((a, b) => a.vacancy_start.localeCompare(b.vacancy_start));
  const byMonth = {};
  sortedByDate.forEach(v => {
    const d = new Date(v.vacancy_start + 'T00:00:00');
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${FULL_MONTH_NAMES[d.getMonth() + 1]} ${d.getFullYear()}`;
    if (!byMonth[key]) byMonth[key] = { label, items: [] };
    byMonth[key].items.push(v);
  });

  return (
    <div className="space-y-2">
      <div className="flex gap-2 mb-2">
        <Button size="sm" variant={sortMode === 'property' ? 'default' : 'outline'} onClick={() => setSortMode('property')} className="text-xs gap-1"><ArrowUpDown className="h-3 w-3" /> By Property</Button>
        <Button size="sm" variant={sortMode === 'date' ? 'default' : 'outline'} onClick={() => setSortMode('date')} className="text-xs gap-1"><ArrowUpDown className="h-3 w-3" /> By Date</Button>
      </div>
      {Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])).map(([monthKey, { label, items }]) => {
        const isOpen = expanded[monthKey] !== false;
        return (
          <Card key={monthKey} className="overflow-hidden">
            <button className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors" onClick={() => toggle(monthKey)}>
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="text-sm font-semibold">{label}</span>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>
            </button>
            {isOpen && (
              <Table>
                <TableHeader><TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Property</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Unit</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Vacancy Starts</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>{items.map((v, idx) => <VacancyRow key={idx} v={v} idx={idx} />)}</TableBody>
              </Table>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function UpcomingVacanciesTab({ allVacancies }) {
  const [subView, setSubView] = useState('vacant_forward');
  const vacantForward = allVacancies.filter(v => !v.has_future_tenant);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 pb-3 border-b border-border/50">
        <Button
          size="sm"
          variant={subView === 'vacant_forward' ? 'default' : 'outline'}
          onClick={() => setSubView('vacant_forward')}
          data-testid="subview-vacant-forward-btn"
        >
          Vacant Forward
        </Button>
        <Button
          size="sm"
          variant={subView === 'all' ? 'default' : 'outline'}
          onClick={() => setSubView('all')}
          data-testid="subview-all-vacancies-btn"
        >
          All Vacancies
        </Button>
      </div>

      {subView === 'vacant_forward' ? (
        vacantForward.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">No units are currently vacant forward</p>
            </CardContent>
          </Card>
        ) : (
          <VacantForwardView vacancies={vacantForward} />
        )
      ) : (
        allVacancies.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">No upcoming vacancies in the next 90 days</p>
            </CardContent>
          </Card>
        ) : (
          <UpcomingVacanciesView vacancies={allVacancies} />
        )
      )}
    </div>
  );
}

export default function VacancyPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedBuildings, setExpandedBuildings] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getVacancy(year);
      setData(result);
    } catch (e) {
      toast.error('Failed to load vacancy data');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleBuilding = (key) => setExpandedBuildings(prev => ({ ...prev, [key]: !prev[key] }));

  const getVacancyColor = (pct) => {
    if (pct === 0) return 'text-emerald-600';
    if (pct < 25) return 'text-yellow-600';
    if (pct < 50) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Vacancy</h1>
          <p className="text-sm text-muted-foreground mt-1">Track vacancies across your portfolio</p>
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

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">Loading...</div>
      ) : data ? (
        <Tabs defaultValue="upcoming" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming Vacancies</TabsTrigger>
            <TabsTrigger value="building">By Building</TabsTrigger>
            <TabsTrigger value="size">By Unit Size</TabsTrigger>
          </TabsList>

          {/* UPCOMING VACANCIES (Vacant Forward + All) */}
          <TabsContent value="upcoming" className="space-y-4">
            <UpcomingVacanciesTab allVacancies={data.upcoming_vacancies} />
          </TabsContent>

          {/* BY BUILDING */}
          <TabsContent value="building" className="space-y-4">
            {data.by_building.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BarChart3 className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No properties to show vacancy data</p>
                </CardContent>
              </Card>
            ) : (
              data.by_building.map(building => (
                <Card key={building.property_id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">{building.property_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs font-semibold uppercase tracking-wide w-[100px]">Month</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide">Vacancy %</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide">Vacant Days</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide">Total Days</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide w-[40px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {building.months.map(month => {
                          const mKey = `${building.property_id}-${month.month}`;
                          return (
                            <Collapsible key={mKey} open={expandedBuildings[mKey]} onOpenChange={() => toggleBuilding(mKey)} asChild>
                              <>
                                <CollapsibleTrigger asChild>
                                  <TableRow className="hover:bg-muted/40 cursor-pointer">
                                    <TableCell className="font-medium">{MONTH_NAMES[month.month]}</TableCell>
                                    <TableCell className={`tabular-nums font-semibold ${getVacancyColor(month.vacancy_pct)}`}>
                                      {month.vacancy_pct}%
                                    </TableCell>
                                    <TableCell className="tabular-nums">{month.vacant_days}</TableCell>
                                    <TableCell className="tabular-nums">{month.total_days}</TableCell>
                                    <TableCell>
                                      {expandedBuildings[mKey] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </TableCell>
                                  </TableRow>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  {month.units.map(unit => (
                                    <TableRow key={unit.unit_id} className="bg-muted/10">
                                      <TableCell className="pl-8 text-sm text-muted-foreground">Unit {unit.unit_number}</TableCell>
                                      <TableCell className={`tabular-nums text-sm ${getVacancyColor(unit.vacancy_pct)}`}>{unit.vacancy_pct}%</TableCell>
                                      <TableCell className="tabular-nums text-sm">{unit.vacant_days}</TableCell>
                                      <TableCell className="tabular-nums text-sm">{unit.total_days}</TableCell>
                                      <TableCell></TableCell>
                                    </TableRow>
                                  ))}
                                </CollapsibleContent>
                              </>
                            </Collapsible>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* BY UNIT SIZE */}
          <TabsContent value="size" className="space-y-4">
            {data.by_unit_size.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground">No unit data available</p>
                </CardContent>
              </Card>
            ) : (
              data.by_unit_size.map(size => (
                <Card key={size.unit_size} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Unit Size: {size.unit_size}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs font-semibold uppercase tracking-wide">Month</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide">Vacancy %</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide">Vacant Days</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide">Total Days</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {size.months.map(month => (
                          <TableRow key={month.month} className="hover:bg-muted/40">
                            <TableCell className="font-medium">{MONTH_NAMES[month.month]}</TableCell>
                            <TableCell className={`tabular-nums font-semibold ${getVacancyColor(month.vacancy_pct)}`}>
                              {month.vacancy_pct}%
                            </TableCell>
                            <TableCell className="tabular-nums">{month.vacant_days}</TableCell>
                            <TableCell className="tabular-nums">{month.total_days}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>


        </Tabs>
      ) : null}
    </div>
  );
}
