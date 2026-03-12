# Furnished Rentals - Product Requirements Document

## Overview
A comprehensive property management web application for managing furnished rental properties.
Built with React (frontend) + FastAPI (backend) + MongoDB.

## Core Requirements

### Navigation Structure
- **Properties** → Properties subpage + Units subpage
- **Tenants** → Tenants subpage + Leads subpage
- **Calendar** → Calendar subpage + Vacancy subpage
- **Budgeting** → Income + Deposits + Rent Tracking
- **Notes**, **Info**, **Operations**, **Notifications**, **Features**

### Key User Personas
- Property manager (primary)
- Landlord (secondary)
- Housekeeping coordinator

---

## Architecture

### Backend (`/app/backend/`)
```
server.py          # Thin entry point (~30 lines)
database.py        # AsyncIOMotorClient connection
helpers.py         # serialize_doc, parse_date
schemas.py         # All Pydantic models
core_logic.py      # Business logic (vacancy, income calc)
routers/
  properties.py    # /api/properties, /api/units
  tenants.py       # /api/tenants, /api/misc-charges
  leads.py         # /api/leads, /api/lead-stages
  notifications.py # /api/notifications (full CRUD + checklist + bulk)
  budgeting.py     # /api/income, /api/deposits, /api/landlord-deposits, /api/rent-tracking
  calendar_router.py # /api/calendar, /api/calendar/timeline, /api/vacancy
  operations.py    # /api/move-ins-outs, /api/housekeepers, /api/cleaning-records
  parking.py       # /api/parking-spots, /api/parking-assignments
  info.py          # /api/door-codes, /api/login-accounts, /api/marketing-links, /api/notes
  admin.py         # /api/available-units, /api/dashboard, /api/team-members, /api/pins
```

### Frontend (`/app/frontend/src/`)
```
App.js             # Router + navigation structure
lib/api.js         # All API calls (axios)
pages/
  PropertiesPage.js
  UnitsPage.js
  TenantsPage.js   # 649 lines (decomposed from 1337)
  LeadsPage.js
  CalendarPage.js
  VacancyPage.js
  DepositsPage.js  # 3 tabs: Current/Past/Landlord deposits
  RentTrackingPage.js
  IncomePage.js
  NotificationsPage.js
  ParkingPage.js
  HousekeepingPage.js
  MoveInOutPage.js
  NotesPage.js
  (and more...)
components/
  TenantDetailModal.js    # Shared tenant detail modal (used in Calendar, Parking)
  tenants/
    TenantFormDialog.js   # Create/edit tenant form
    TenantDetailDialog.js # Tenant detail view dialog
    TenantDeleteDialog.js # Permanent delete confirmation
    MiscChargesSection.js # Misc charges management
    tenantUtils.js        # Shared helpers (fmtDate, sortUtils, emptyForm)
  ui/                     # shadcn/ui components
```

### Key DB Collections
- **properties**: `{name, address, building_id, ...}`
- **units**: `{property_id, unit_number, base_rent, landlord_deposit, ...}`
- **tenants**: `{property_id, unit_id, name, move_in_date, move_out_date, deposit_amount, has_parking, ...}`
- **deposits**: legacy (tenant deposit data now on tenant record)
- **misc_charges**: `{tenant_id, amount, description, charge_date}`
- **rent_payments**: `{tenant_id, year, month, paid, partial_amount, note}`
- **notifications**: `{name, type, checklist, status, ...}`
- **parking_spots**: `{spot_type, decal_number, property_ids, ...}`
- **cleaning_records**: `{tenant_id, check_out_date, assigned_cleaner_id, ...}`

---

## What's Been Implemented

### Phase 1 (Original Feature Batch)
- Navigation restructure: Properties/Tenants/Calendar/Budgeting groups
- App renamed to "Furnished Rentals"
- New **Deposits** page (3 tabs: Current/Past/Landlord)
- New **Rent Tracking** page (monthly payment tracking)
- Tenant enhancements: permanent delete, misc charges, has_parking field
- Move-out checklist notification (mandatory 3-item checklist)
- UI improvements: Properties, Units, Tenants, Calendar pages
- Shared TenantDetailModal across Calendar and Parking pages
- Bug fix: tenant move-out date off-by-one
- Bug fix: Calendar grid lines extending for future months

### Phase 2 (Follow-up Features)
- Deposits page: edit on all tabs, status notes for passed tenants
- Calendar: timeline segment-based view, tenant modal on click
- Vacancy page: sorting options (by property/unit or by date)
- Parking page: has_parking filter, search in tenant dropdown, Marlins Decal filtering

### Phase 3 (Bug Fix)
- Income page: Monthly Average calculation corrected (sum of past+current months / count)

### Phase 4 (Refactoring)
- Backend server.py split into 12 focused modules
- Frontend TenantsPage.js (1337→649 lines) decomposed into 5 components
- All APIs verified: 28/28 tests passing

---

## Prioritized Backlog

### P1 (High - Next Sprint)
- None currently identified

### P2 (Medium)
- Further frontend decomposition: DepositsPage, ParkingPage, NotificationsPage
- Add proper error boundaries to React components

### P3 (Low / Backlog)
- Add pagination for large tenant/lead lists
- Export to CSV/PDF for income reports
- Mobile-responsive design improvements
- Add search/filter across all list pages
- Unit tests for frontend components
