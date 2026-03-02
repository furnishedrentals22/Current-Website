import { useState, useEffect } from 'react';
import { getVacancy } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, ChevronDown, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function VacancyPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedBuildings, setExpandedBuildings] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await getVacancy(year);
      setData(result);
    } catch (e) {
      toast.error('Failed to load vacancy data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [year]);

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
        <Tabs defaultValue="building" className="space-y-4">
          <TabsList>
            <TabsTrigger value="building">By Building</TabsTrigger>
            <TabsTrigger value="size">By Unit Size</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming Vacancies</TabsTrigger>
          </TabsList>

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
                                <CollapsibleContent asChild>
                                  <>
                                    {month.units.map(unit => (
                                      <TableRow key={unit.unit_id} className="bg-muted/10">
                                        <TableCell className="pl-8 text-sm text-muted-foreground">Unit {unit.unit_number}</TableCell>
                                        <TableCell className={`tabular-nums text-sm ${getVacancyColor(unit.vacancy_pct)}`}>{unit.vacancy_pct}%</TableCell>
                                        <TableCell className="tabular-nums text-sm">{unit.vacant_days}</TableCell>
                                        <TableCell className="tabular-nums text-sm">{unit.total_days}</TableCell>
                                        <TableCell></TableCell>
                                      </TableRow>
                                    ))}
                                  </>
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

          {/* UPCOMING VACANCIES */}
          <TabsContent value="upcoming" className="space-y-4">
            {data.upcoming_vacancies.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground">No upcoming vacancies in the next 3 months</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Property</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Unit</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Vacancy Starts</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.upcoming_vacancies.map((v, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/40">
                        <TableCell className="font-medium">{v.property_name}</TableCell>
                        <TableCell>{v.unit_number}</TableCell>
                        <TableCell>{v.vacancy_start}</TableCell>
                        <TableCell>
                          {v.has_future_tenant ? (
                            <Badge variant="secondary" className="text-xs">
                              Until {v.vacancy_end}
                            </Badge>
                          ) : (
                            <Badge className="text-xs bg-amber-50 text-amber-900 border-amber-200">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Vacant forward
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
