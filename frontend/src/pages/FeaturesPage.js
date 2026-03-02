import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Home, Users, UserSearch, DollarSign, BarChart3, Calendar, Bell, FileText } from 'lucide-react';

const features = [
  {
    icon: Building2,
    title: 'Properties Management',
    description: 'Full CRUD for properties/buildings.',
    details: [
      'Create, edit, and delete properties',
      'Track owner/manager contact info (name, phone, email)',
      'Available parking (number or description)',
      'Pets permitted toggle with optional pet notes',
      'Building amenities as a tag list',
      'Additional notes field',
      'Cannot delete property with existing units'
    ]
  },
  {
    icon: Home,
    title: 'Units Management',
    description: 'Units belong to properties with rent and cost tracking.',
    details: [
      'Unit number and size (dropdown: 0/1, 1/1, 2/1, 2/2, 3/1, 3/2, 3/3, or custom Other)',
      'Base rent amount',
      'Additional fixed monthly costs (repeatable name + amount fields)',
      'Availability start date (when unit becomes rentable)',
      'Optional close date (after which unit is not rentable)',
      'Filter units by property',
      'Cannot delete unit with existing tenants'
    ]
  },
  {
    icon: Users,
    title: 'Tenants Management',
    description: 'Tenant assignment with full date validation and Airbnb support.',
    details: [
      'Select property then unit (filtered by property)',
      'Name, phone, email, move-in date, move-out date',
      'Airbnb/VRBO toggle changes the form fields:',
      '  Long-term: deposit, monthly rent, partial month overrides, pets, parking, notes',
      '  Airbnb: total rent input, auto-calculated nights/rate/monthly breakdown',
      'Date validation: no overlapping tenants, move-in >= unit availability, move-out <= close date',
      'Same-day turnover allowed (move-out date can equal next move-in)',
      'Airbnb monthly breakdown stored and feeds into Income page'
    ]
  },
  {
    icon: UserSearch,
    title: 'Leads Tracking',
    description: 'Track prospective tenants through an 8-stage pipeline.',
    details: [
      'Lead fields: name, source, phone, email, desired dates',
      'Potential units (multi-select filtered by availability during selected dates)',
      'Pets and parking request fields',
      'Lead strength (4 levels): Weak (red), Fair (orange), Good (yellow), Strong (green)',
      'Color-coded rows in lead list based on strength',
      '8 progress stages: Contacted, Showing Set, Showing Complete, BG Check Submitted, BG Check Complete, Lease Sent, Lease Signed, Deposit Submitted',
      'Showing Set stage requires date and time input',
      'Each stage advancement triggers notification creation prompt',
      'At Deposit Submitted (stage 8): "Convert to Tenant" button pre-fills tenant form'
    ]
  },
  {
    icon: DollarSign,
    title: 'Income Page',
    description: 'Dynamically generated income from tenant data.',
    details: [
      'Current month total income displayed prominently',
      'Yearly total and monthly average KPI cards',
      'Year navigation with arrow buttons',
      'Expandable monthly breakdown: Month -> Property -> Unit -> Tenant',
      'Long-term tenants: monthly_rent + additional_monthly_costs',
      'Partial first/last month overrides supported',
      'Airbnb tenants: income distributed by nights per month',
      'Deposits excluded from income totals',
      'Additional monthly costs included in income totals'
    ]
  },
  {
    icon: BarChart3,
    title: 'Vacancy Page',
    description: 'Vacancy analytics with multiple breakdown views.',
    details: [
      'By Building (Monthly): vacancy %, total vacant days for each property',
      'Expandable to see per-unit vacancy within each month',
      'By Unit Size: grouped across all buildings, showing monthly vacancy %',
      'Upcoming Vacancies (next 3 months): property, unit, vacancy start date',
      'Shows "Vacant from [date] forward" if no future tenant exists',
      'Same-day turnover (move-out = next move-in) counts as 0 vacancy days',
      'Year navigation supported'
    ]
  },
  {
    icon: Calendar,
    title: 'Calendar Page',
    description: '12-month visual calendar showing occupancy per unit.',
    details: [
      'Shows all 12 months in a 3-column grid layout',
      'Units grouped by property',
      'Color-coded day cells: green (occupied), blue (Airbnb), gray (vacant)',
      'Lead interest shown as amber ring overlay on requested dates',
      'Hover tooltip shows tenant name, lead names, and status',
      'Year navigation with arrow buttons'
    ]
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: 'In-app notification system triggered from lead stage changes.',
    details: [
      'Bell icon in top bar with unread count badge',
      'Side panel (Sheet) opens with Active and Viewed sections',
      'Each notification shows lead name, stage, message, and due date',
      'Mark as read/unread functionality',
      'Delete individual notifications',
      'Created when advancing lead through stages (optional per stage)',
      'Auto-refreshes every 30 seconds'
    ]
  },
  {
    icon: FileText,
    title: 'Features Reference (This Page)',
    description: 'Complete documentation of all system features.',
    details: [
      'Lists every feature built into the system',
      'Includes field descriptions and validation rules',
      'Useful as a reference when making updates or edits'
    ]
  }
];

export default function FeaturesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Features Reference</h1>
        <p className="text-sm text-muted-foreground mt-1">Complete documentation of all system features for reference</p>
      </div>

      <div className="space-y-4">
        {features.map((feature, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                  <feature.icon className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">{feature.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {feature.details.map((detail, i) => (
                  <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                    <span className="text-primary mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                    {detail}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">System Rules</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <Badge className="mt-0.5 flex-shrink-0">Validation</Badge>
              <span>No overlapping tenants in the same unit</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge className="mt-0.5 flex-shrink-0">Validation</Badge>
              <span>Move-in must be after unit availability date</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge className="mt-0.5 flex-shrink-0">Calculation</Badge>
              <span>Airbnb checkout day is not a billable night</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge className="mt-0.5 flex-shrink-0">Calculation</Badge>
              <span>Same-day turnover = 0 vacancy days</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge className="mt-0.5 flex-shrink-0">Income</Badge>
              <span>Deposits excluded from income totals</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge className="mt-0.5 flex-shrink-0">Income</Badge>
              <span>Additional monthly costs included in income</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
