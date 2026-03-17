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
server.py          # Thin entry point
database.py        # MongoDB connection setup
schemas.py         # All Pydantic schemas (including MaintenancePersonnelCreate, MaintenanceRequestCreate)
helpers.py         # Utilities (serialize_doc, parse_date)
requirements.txt
routers/
  admin.py, budgeting.py, calendar_router.py, info.py, leads.py,
  notifications.py, operations.py, parking.py, properties.py, tenants.py,
  maintenance.py    # NEW — maintenance requests + personnel CRUD
```

### Frontend (`/app/frontend/src/`)
```
App.js             # Router + ErrorBoundary + Maintenance route added
lib/api.js         # All API calls (axios) — maintenance API added
pages/
  CalendarPage.js       # Decomposed from 661 lines
  IncomePage.js         # Decomposed from 204 lines
  DepositsPage.js       # Decomposed
  ParkingPage.js        # Decomposed
  NotificationsPage.js  # Decomposed
  TenantsPage.js        # Decomposed
  VacancyPage.js        # Fixed useCallback warning
  HousekeepingPage.js   # REDESIGNED — card-based, click-to-edit modal, maintenance integration
  MaintenancePage.js    # NEW — full maintenance requests + personnel management
  + PropertiesPage, UnitsPage, LeadsPage, RentTrackingPage, MoveInOutPage, NotesPage, etc.
components/
  ErrorBoundary.js    # NEW - React error boundary
  TenantDetailModal.js
  calendar/           # NEW - 7 components
    calendarConstants.js, TimelineHeader.js, BookingBar.js,
    LeadOverlay.js, UnitRow.js, PropertyGroup.js, TodayMarker.js
  income/             # NEW - 2 components
    IncomeKPICards.js, IncomeMonthRow.js
  tenants/            # 5 components
  deposits/           # 2 components
  parking/            # 5 components
  notifications/      # 5 components
  ui/                 # shadcn/ui components
```

---

## What's Been Implemented

### Phase 1: Original Feature Batch
- Navigation restructure, app renamed to "Furnished Rentals"
- Deposits page (3 tabs), Rent Tracking page, Tenant enhancements
- Move-out checklist, UI improvements, bug fixes

### Phase 2: Follow-up Features
- Deposits edit, Calendar timeline, Vacancy sorting, Parking enhancements

### Phase 3: Bug Fix
- Income page Monthly Average calculation corrected

### Phase 4: Backend Refactoring
- server.py split into 12 focused modules (routers, models, database)

### Phase 5: Frontend Refactoring (Mar 12, 2026)
- TenantsPage decomposed into 5 components
- DepositsPage uses 2 extracted dialog components
- ParkingPage (574->260 lines) uses 5 extracted components
- NotificationsPage (717->334 lines) uses 5 extracted components

### Phase 6: Further Frontend Refactoring + Error Boundary (Mar 12, 2026)
- CalendarPage (661->160 lines) decomposed into 7 components
- IncomePage (204->60 lines) decomposed into 2 components
- ErrorBoundary added wrapping all routes in App.js
- React hook warnings fixed in IncomePage and VacancyPage (useCallback)
- All 32 frontend tests passed (100% success rate)

### Phase 7: Maintenance Page + Housekeeping Redesign (Mar 17, 2026)
- **New Maintenance page** under Operations (`/ops/maintenance`):
  - Tab 1: Upcoming Maintenance Requests — card grid, click-to-edit modal, archive section (grouped by month)
  - Tab 2: Maintenance Personnel — card list with full CRUD + archive
  - New MongoDB collections: `maintenance_requests`, `maintenance_personnel`
  - New backend router: `maintenance.py` with 8 endpoints
  - Status colors: gray/yellow/red/green (4 swatches)
  - Assigned personnel: multi-select from list + custom manual entry
  - Completed requests auto-move to archive section (collapsed by default)
- **Housekeeping page redesigned** (all 3 tabs → card-based layout):
  - Unit numbers without "U" prefix
  - Dates formatted as `Tue, 3/17`
  - Times only shown when they exist
  - Click-to-edit modal (replaces inline table editing)
  - Maintenance person assignment field in cleaning modal
  - Amber maintenance indicator on card when assigned
  - Alternating card backgrounds
  - Housekeepers + Leads tabs also converted to card layout
- 100% test pass rate (24/24 backend, all frontend flows)

---

### P3 (Low / Backlog)
- Add pagination for large tenant/lead lists
- Export to CSV/PDF for income reports
- Mobile-responsive design improvements
- Add search/filter across all list pages
- Unit tests for frontend components
- Minor Radix UI cosmetic warning (data-state on Fragment) - library issue
