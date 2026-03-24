import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getLead } from '@/lib/api';

const fmtDate = (v) => {
  if (!v) return '-';
  try {
    const d = new Date(v + 'T00:00:00');
    const day = d.toLocaleDateString('en-US', { weekday: 'short' });
    return `${day}, ${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
  } catch { return v; }
};

const STRENGTH_LABELS = { 1: 'Low', 2: 'Medium', 3: 'High' };
const STRENGTH_COLORS = { 1: 'bg-gray-100 text-gray-600', 2: 'bg-yellow-100 text-yellow-700', 3: 'bg-emerald-100 text-emerald-700' };

export function LeadDetailModal({ leadId, open, onClose }) {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !leadId) return;
    setLead(null);
    setLoading(true);
    getLead(leadId)
      .then(setLead)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, leadId]);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" data-testid="lead-detail-modal">
        <DialogHeader>
          <DialogTitle className="font-heading">{lead?.name || 'Lead Details'}</DialogTitle>
          <DialogDescription>
            {lead?.source ? `Source: ${lead.source}` : 'Prospective tenant details'}
          </DialogDescription>
        </DialogHeader>

        {loading && <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>}

        {lead && !loading && (
          <div className="space-y-4">
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">Lead</Badge>
              {lead.lead_strength && (
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${STRENGTH_COLORS[lead.lead_strength] || STRENGTH_COLORS[1]}`}>
                  {STRENGTH_LABELS[lead.lead_strength] || 'Low'} Interest
                </span>
              )}
              {lead.converted_to_tenant && <Badge variant="default" className="bg-emerald-600">Converted</Badge>}
            </div>

            {/* Desired Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Desired Move-In</p>
                <p className="text-sm tabular-nums">{fmtDate(lead.desired_start_date)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Desired Move-Out</p>
                <p className="text-sm tabular-nums">{fmtDate(lead.desired_end_date)}</p>
              </div>
            </div>

            <Separator />

            {/* Contact */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Phone</p>
                <p className="text-sm">{lead.phone || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Email</p>
                <p className="text-sm break-all">{lead.email || '-'}</p>
              </div>
            </div>

            {lead.preferred_contact_method && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Preferred Contact</p>
                <p className="text-sm">{lead.preferred_contact_method}</p>
              </div>
            )}

            <Separator />

            {/* Financial */}
            {lead.price_offered != null && lead.price_offered !== '' && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Price Offered</p>
                <p className="text-sm tabular-nums font-medium">${parseFloat(lead.price_offered).toLocaleString()}</p>
              </div>
            )}

            {/* Extras */}
            {(lead.pets || lead.parking_request || lead.notes || lead.unassigned_note) && (
              <>
                <Separator />
                {lead.pets && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pets</p>
                    <p className="text-sm">{lead.pets}</p>
                  </div>
                )}
                {lead.parking_request && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Parking Request</p>
                    <p className="text-sm">{lead.parking_request}</p>
                  </div>
                )}
                {lead.showing_date && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Showing Date</p>
                    <p className="text-sm">{fmtDate(lead.showing_date)}</p>
                  </div>
                )}
                {lead.notes && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
                  </div>
                )}
                {lead.unassigned_note && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Unassigned Note</p>
                    <p className="text-sm whitespace-pre-wrap">{lead.unassigned_note}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
