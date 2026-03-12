import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function IncomeMonthRow({ month, year, isCurrentMonth, defaultOpen }) {
  const [expanded, setExpanded] = useState(defaultOpen || false);
  const [expandedProps, setExpandedProps] = useState({});
  const [expandedUnits, setExpandedUnits] = useState({});

  const toggleProp = (key) => setExpandedProps(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleUnit = (key) => setExpandedUnits(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <Card className={`overflow-hidden ${isCurrentMonth ? 'ring-2 ring-primary/30' : ''}`}>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger className="w-full" data-testid="income-month-row-toggle">
          <div className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-3">
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="font-medium">{MONTH_NAMES[month.month]} {year}</span>
              {isCurrentMonth && <Badge variant="secondary" className="text-xs">Current</Badge>}
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
  );
}
