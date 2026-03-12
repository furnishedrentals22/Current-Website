import { useState, useEffect } from 'react';
import { getIncome } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DollarSign, ChevronDown, ChevronRight, ChevronLeft, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function IncomePage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedMonths, setExpandedMonths] = useState({});
  const [expandedProps, setExpandedProps] = useState({});
  const [expandedUnits, setExpandedUnits] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await getIncome(year);
      setData(result);
    } catch (e) {
      toast.error('Failed to load income data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [year]);

  const toggleMonth = (m) => setExpandedMonths(prev => ({ ...prev, [m]: !prev[m] }));
  const toggleProp = (key) => setExpandedProps(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleUnit = (key) => setExpandedUnits(prev => ({ ...prev, [key]: !prev[key] }));

  const currentMonth = new Date().getMonth() + 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Income</h1>
          <p className="text-sm text-muted-foreground mt-1">Track rental income across all properties</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setYear(y => y - 1)} data-testid="income-year-prev">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-heading text-lg font-semibold tabular-nums w-16 text-center">{year}</span>
          <Button variant="outline" size="sm" onClick={() => setYear(y => y + 1)} data-testid="income-year-next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">Loading...</div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current Month Income</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-heading text-3xl font-semibold tabular-nums">
                  ${data.current_month_total.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{MONTH_NAMES[currentMonth]} {new Date().getFullYear()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Yearly Total ({year})</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-heading text-3xl font-semibold tabular-nums">
                  ${data.yearly_total.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Monthly Average</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-heading text-3xl font-semibold tabular-nums">
                  ${(() => {
                    const now = new Date();
                    const maxMonth = year === now.getFullYear() ? now.getMonth() + 1 : 12;
                    const monthsUpToCurrent = data.months.filter(m => m.month <= maxMonth);
                    return monthsUpToCurrent.length > 0
                      ? Math.round(data.yearly_total / monthsUpToCurrent.length).toLocaleString()
                      : '0';
                  })()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {year === new Date().getFullYear()
                    ? `Based on ${Math.min(new Date().getMonth() + 1, 12)} months`
                    : 'Based on 12 months'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Breakdown */}
          <div className="space-y-2">
            {data.months.map(month => (
              <Card key={month.month} className={`overflow-hidden ${month.month === currentMonth && year === new Date().getFullYear() ? 'ring-2 ring-primary/30' : ''}`}>
                <Collapsible open={expandedMonths[month.month]} onOpenChange={() => toggleMonth(month.month)}>
                  <CollapsibleTrigger className="w-full" data-testid="income-month-row-toggle">
                    <div className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-3">
                        {expandedMonths[month.month] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-medium">{MONTH_NAMES[month.month]} {year}</span>
                        {month.month === currentMonth && year === new Date().getFullYear() && (
                          <Badge variant="secondary" className="text-xs">Current</Badge>
                        )}
                      </div>
                      <span className="font-heading text-lg font-semibold tabular-nums">${month.total.toLocaleString()}</span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {month.properties.length === 0 ? (
                      <div className="px-4 pb-4 pl-11 text-sm text-muted-foreground">No income this month</div>
                    ) : (
                      <div className="px-4 pb-4 space-y-2">
                        {month.properties.map(prop => {
                          const propKey = `${month.month}-${prop.property_id}`;
                          return (
                            <Collapsible key={propKey} open={expandedProps[propKey]} onOpenChange={() => toggleProp(propKey)}>
                              <CollapsibleTrigger className="w-full">
                                <div className="flex items-center justify-between pl-8 pr-2 py-2 rounded-lg hover:bg-muted/30 transition-colors">
                                  <div className="flex items-center gap-2">
                                    {expandedProps[propKey] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    <span className="text-sm font-medium">{prop.property_name}</span>
                                  </div>
                                  <span className="text-sm font-semibold tabular-nums">${prop.total.toLocaleString()}</span>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="pl-14 space-y-1">
                                  {prop.units.map(unit => {
                                    const unitKey = `${propKey}-${unit.unit_id}`;
                                    return (
                                      <Collapsible key={unitKey} open={expandedUnits[unitKey]} onOpenChange={() => toggleUnit(unitKey)}>
                                        <CollapsibleTrigger className="w-full">
                                          <div className="flex items-center justify-between pr-2 py-1.5 rounded hover:bg-muted/20 transition-colors">
                                            <div className="flex items-center gap-2">
                                              {expandedUnits[unitKey] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                              <span className="text-sm">Unit {unit.unit_number}</span>
                                            </div>
                                            <span className="text-sm tabular-nums">${unit.total.toLocaleString()}</span>
                                          </div>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                          <div className="pl-6 space-y-1">
                                            {unit.tenants.map((tenant, idx) => (
                                              <div key={idx}>
                                                <div className="flex items-center justify-between py-1 pr-2">
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">{tenant.tenant_name}</span>
                                                    {tenant.is_airbnb && <Badge className="text-[10px] bg-sky-100 text-sky-900 border-sky-200">Airbnb</Badge>}
                                                  </div>
                                                  <span className="text-xs tabular-nums">${tenant.income.toLocaleString()}</span>
                                                </div>
                                                {tenant.misc_charges && tenant.misc_charges.length > 0 && tenant.misc_charges.map((mc, mi) => (
                                                  <div key={mi} className="flex items-center justify-between py-0.5 pr-2 pl-4">
                                                    <span className="text-[11px] text-muted-foreground italic">Misc: {mc.description || 'Misc charge'}</span>
                                                    <span className="text-[11px] tabular-nums text-muted-foreground">${mc.amount.toLocaleString()}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            ))}
                                          </div>
                                        </CollapsibleContent>
                                      </Collapsible>
                                    );
                                  })}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
