# Furnished Rentals - Product Requirements Document

## Overview
A comprehensive property management web application for managing furnished rental properties.
Built with React (frontend) + FastAPI (backend) + MongoDB.

## Core Requirements

### Navigation Structure
- **Properties** > Properties subpage + Units subpage
- **Tenants** > Tenants subpage + Leads subpage
- **Calendar** > Calendar subpage + Vacancy subpage
- **Budgeting** > Income + Deposits + Rent Tracking
- **Notes**, **Info**, **Operations**, **Notifications**, **Features**

### Key User Personas
- Property manager (primary)
- Landlord (secondary)
- Housekeeping coordinator

---

## Architecture

### Backend (`/app/backend/`)
```
main.py            # Thin entry point (~30 lines)
database.py        # AsyncIOMotorClient connection
models.py          # All Pydantic models
requirements.txt
routers/
  admin.py
  budgeting.py
  calendar.py
  info.py
  leads.py
  notifications.py
  operations.py
  parking.py
  properties.py
  tenants.py
```

### Frontend (`/app/frontend/src/`)
```
App.js             # Router + navigation structure
lib/api.js         # All API calls (axios)
pages/
  PropertiesPage.js
  UnitsPage.js
  TenantsPage.js     # Decomposed (uses tenants/ components)
  LeadsPage.js
  CalendarPage.js
  VacancyPage.js
  DepositsPage.js    # Decomposed (uses deposits/ components)
  RentTrackingPage.js
  IncomePage.js
  NotificationsPage.js # Decomposed (uses notifications/ components)
  ParkingPage.js       # Decomposed (uses parking/ components)
  HousekeepingPage.js
  MoveInOutPage.js
  NotesPage.js
  (and more...)
components/
  TenantDetailModal.js
  tenants/
    TenantFormDialog.js
    TenantDetailDialog.js
    TenantDeleteDialog.js
    MiscChargesSection.js
    tenantUtils.js
  deposits/
    EditDepositDialog.js
    ReturnDepositDialog.js
  parking/
    SpotCard.js
    SpotDialog.js
    AssignDialog.js
    AssignmentsTab.js
    AssignSection.js
  notifications/
    KanbanView.js
    ListView.js
    NotificationFormDialog.js
    SnoozeDialog.js
    notificationConstants.js
  ui/                  # shadcn/ui components
```

### Key DB Collections
- **properties**: `{name, address, building_id, ...}`
- **units**: `{property_id, unit_number, base_rent, landlord_deposit, ...}`
- **tenants**: `{property_id, unit_id, name, move_in_date, move_out_date, deposit_amount, has_parking, ...}`
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

### Phase 4 (Refactoring - Backend)
- Backend server.py split into 12 focused modules (routers, models, database)
- All APIs verified: 28/28 tests passing

### Phase 5 (Refactoring - Frontend) - Completed Mar 12, 2026
- TenantsPage.js (1337->649 lines) decomposed into 5 components
- DepositsPage.js (340 lines) uses 2 extracted dialog components
- ParkingPage.js (574->260 lines) uses 5 extracted components (SpotCard, SpotDialog, AssignDialog, AssignmentsTab, AssignSection)
- NotificationsPage.js (717->334 lines) uses 5 extracted components (KanbanView, ListView, NotificationFormDialog, SnoozeDialog, notificationConstants)
- All 23 frontend tests passing: 100% success rate

---

## Prioritized Backlog

### P1 (High - Next Sprint)
- None currently identified

### P2 (Medium)
- Further frontend decomposition: IncomePage.js, CalendarPage.js
- Add proper error boundaries to React components

### P3 (Low / Backlog)
- Fix React HTML nesting warnings in JSX
- Add pagination for large tenant/lead lists
- Export to CSV/PDF for income reports
- Mobile-responsive design improvements
- Add search/filter across all list pages
- Unit tests for frontend components
