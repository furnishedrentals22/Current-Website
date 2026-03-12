import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function IncomeKPICards({ data, year }) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const maxMonth = year === now.getFullYear() ? currentMonth : 12;
  const monthsUpToCurrent = data.months.filter(m => m.month <= maxMonth);
  const totalUpToCurrent = monthsUpToCurrent.reduce((sum, m) => sum + (m.total || 0), 0);
  const count = monthsUpToCurrent.length;
  const avg = count > 0 ? Math.round(totalUpToCurrent / count) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="income-kpi-cards">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current Month Income</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-heading text-3xl font-semibold tabular-nums">${data.current_month_total.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">{MONTH_NAMES[currentMonth]} {now.getFullYear()}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Yearly Total ({year})</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-heading text-3xl font-semibold tabular-nums">${data.yearly_total.toLocaleString()}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Monthly Average</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-heading text-3xl font-semibold tabular-nums">${avg.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">${totalUpToCurrent.toLocaleString()} / {count} months</p>
        </CardContent>
      </Card>
    </div>
  );
}
