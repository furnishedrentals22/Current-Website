import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, UserPlus, Pencil, Trash2, DollarSign } from 'lucide-react';

export const STAGE_NAMES = {
  1: 'Contacted', 2: 'Showing Set', 3: 'Showing Complete',
  4: 'BG Check Submitted', 5: 'BG Check Complete',
  6: 'Lease Sent', 7: 'Lease Signed', 8: 'Deposit Submitted'
};

export const STRENGTH_COLORS = {
  1: { row: 'bg-red-50/60', bar: 'bg-red-500', text: 'text-red-900', label: 'Weak' },
  2: { row: 'bg-orange-50/70', bar: 'bg-orange-500', text: 'text-orange-900', label: 'Fair' },
  3: { row: 'bg-yellow-50/70', bar: 'bg-yellow-500', text: 'text-yellow-900', label: 'Good' },
  4: { row: 'bg-emerald-50/70', bar: 'bg-emerald-500', text: 'text-emerald-900', label: 'Strong' }
};

export function LeadRow({ lead, unitMap, onAdvanceStage, onConvert, onEdit, onDelete }) {
  const strength = STRENGTH_COLORS[lead.lead_strength] || STRENGTH_COLORS[1];
  const unitNames = (lead.potential_unit_ids || []).map(uid => {
    const u = unitMap[uid];
    return u ? u.unit_number : '';
  }).filter(Boolean);

  return (
    <div className={`relative flex items-center justify-between p-3 rounded-lg border transition-colors ${strength.row}`} data-testid="leads-table-row">
      <div className={`absolute left-0 top-0 h-full w-1 rounded-l ${strength.bar}`} />
      <div className="pl-3 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{lead.name}</span>
          <Badge className={`text-[10px] ${strength.row} ${strength.text} border-none`}>{strength.label}</Badge>
          {lead.source && <span className="text-xs text-muted-foreground">via {lead.source}</span>}
          {lead.price_offered && (
            <Badge variant="outline" className="text-[10px] gap-0.5 tabular-nums">
              <DollarSign className="h-2.5 w-2.5" />{parseFloat(lead.price_offered).toLocaleString()}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Progress value={(lead.progress_stage / 8) * 100} className="h-1.5 w-16" />
            <span className="text-[10px] text-muted-foreground">{STAGE_NAMES[lead.progress_stage]}</span>
          </div>
          {lead.desired_start_date && lead.desired_end_date && (
            <span className="text-xs text-muted-foreground">{lead.desired_start_date} — {lead.desired_end_date}</span>
          )}
          {unitNames.length > 0 && (
            <div className="flex gap-1">
              {unitNames.map((n, i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">{n}</Badge>
              ))}
            </div>
          )}
          {lead.preferred_contact_method && (
            <span className="text-[10px] text-muted-foreground">Contact: {lead.preferred_contact_method}</span>
          )}
        </div>
        {lead.notes && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{lead.notes}</p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
        {lead.progress_stage < 8 && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onAdvanceStage(lead)} data-testid="leads-stage-advance-button">
            <ArrowRight className="h-3 w-3 mr-1" /> Next
          </Button>
        )}
        {lead.progress_stage === 8 && !lead.converted_to_tenant && (
          <Button variant="default" size="sm" className="h-7 px-2 text-xs" onClick={() => onConvert(lead)} data-testid="lead-convert-button">
            <UserPlus className="h-3 w-3 mr-1" /> Convert
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(lead)}><Pencil className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => onDelete(lead.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}
