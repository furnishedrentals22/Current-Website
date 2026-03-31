# Furnished Rentals - Property Management App

## Original Problem Statement
A comprehensive property management tool for furnished rentals, covering properties, tenants, calendar, budgeting, operations (housekeeping, maintenance, move in/out), and more.

## Stack
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB
- **No Authentication**: Open access

## Completed Features

### Core
- Properties CRUD, Units CRUD, Tenants CRUD, Leads management
- Calendar, Vacancy tracking (90-day window, sorted by building numeric ID)
- Income tracking, Deposits, Rent Tracking
- Notes, Notifications, Door Codes, Login Info, Marketing, Parking
- Move In/Out management
- Features page

### Housekeeping (Operations)
- **Upcoming Cleanings tab**: Spreadsheet-style table with date range filters and search
- **Current Housekeepers tab**: CRUD with archive support
- **Housekeeping Leads tab**: CRUD with archive support
- Maintenance person assignment integration
- Manual cleanings feature

### Maintenance (Operations)
- Full maintenance request CRUD

### Marlins Decal Inventory System
- `marlins_decals` collection with per-property inventory
- Assign specific decal from inventory to a tenant via dropdown

### UI/UX Enhancements (Completed)
- Date formatting: `Day, M/D` on Move In/Out and Vacancy pages
- Unit name formatting: `[Property] Apt [Unit]`
- Sidebar navigation: headers as NavLinks, chevrons as dropdown toggles
- Calendar Lead Detail Modal
- Vacancy Page: Merged "Vacant Forward" into "Upcoming Vacancies" tab

### Component Refactoring (2026-03-31)
- **PropertiesPage.js**: 706 -> 296 lines. Extracted PropertyFormDialog, UnitFormDialog, PropertyCard
- **LeadsPage.js**: 625 -> 339 lines. Extracted LeadRow, LeadFormDialog, NotificationDialogs
- **HousekeepingPage.js**: Extracted CleaningEditDialog, ManualCleaningDialog, housekeepingUtils
- **TenantsPage.js**: 657 -> 341 lines. Extracted TenantRow, CurrentFutureTab, PastTenantsTab
- **core_logic.py**: 504 -> 460 lines. Extracted _make_vacancy, _add_vacancy_with_future_check, _calculate_end_date helpers

## Key DB Collections
- `properties`, `units`, `tenants`, `leads`
- `cleaning_records`, `housekeepers`, `housekeeping_leads`
- `maintenance_requests`, `maintenance_personnel`
- `marlins_decals`, `manual_cleanings`
- `notifications`, `notes`, `income_records`, `deposits`, `rent_tracking`

## Key API Endpoints
- `/api/vacancy` (GET) - 90-day vacancy window
- `/api/vacant-forward` (GET) - 5-year vacancy scan
- `/api/leads/{id}` (GET) - Lead details for Calendar modal
- `/api/marlins_decals/` (GET, POST), `/api/marlins_decals/{id}` (PUT, DELETE)
- `/api/maintenance/` (GET, POST), `/api/maintenance/{id}` (PUT, DELETE)
- `/api/cleaning-records/`, `/api/housekeepers/`, `/api/housekeeping-leads/`
- `/api/manual-cleanings` (GET, POST, PUT, DELETE)

## Component Architecture
```
frontend/src/components/
  properties/  -> PropertyFormDialog, UnitFormDialog, PropertyCard
  leads/       -> LeadRow, LeadFormDialog, NotificationDialogs
  housekeeping/ -> CleaningEditDialog, ManualCleaningDialog, housekeepingUtils
  tenants/     -> TenantRow, CurrentFutureTab, PastTenantsTab, TenantFormDialog, TenantDetailDialog, TenantDeleteDialog, MiscChargesSection, tenantUtils
  calendar/    -> LeadDetailModal, LeadOverlay, BookingBar, PropertyGroup, TimelineHeader, TodayMarker, UnitRow
```

## Backlog
- P2: Split HousekeepingPage UpcomingCleaningsTab (still 693 lines) into smaller subcomponents
- P2: Add "Days Vacant" counter on Vacancy page rows
- P2: Further date range filters for Upcoming Cleanings
