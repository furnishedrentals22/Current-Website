import { useState, useEffect, useCallback } from 'react';
import { getIncome } from '@/lib/api';
import { IncomeKPICards } from '@/components/income/IncomeKPICards';
import { IncomeMonthRow } from '@/components/income/IncomeMonthRow';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function IncomePage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await getIncome(year)); }
    catch { toast.error('Failed to load income data'); }
    finally { setLoading(false); }
  }, [year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

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
          <IncomeKPICards data={data} year={year} />
          <div className="space-y-2">
            {data.months.map(month => (
              <IncomeMonthRow key={month.month} month={month} year={year}
                isCurrentMonth={month.month === currentMonth && year === currentYear} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
