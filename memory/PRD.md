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
database.py        # MongoDB connection setup
models.py          # All Pydantic models
requirements.txt
routers/
  admin.py, budgeting.py, calendar.py, info.py, leads.py,
  notifications.py, operations.py, parking.py, properties.py, tenants.py
```

### Frontend (`/app/frontend/src/`)
```
App.js             # Router + ErrorBoundary wrapping
lib/api.js         # All API calls (axios)
pages/
  CalendarPage.js     # 160 lines (decomposed from 661)
  IncomePage.js       # 60 lines (decomposed from 204)
  DepositsPage.js     # 340 lines (decomposed)
  ParkingPage.js      # 260 lines (decomposed from 574)
  NotificationsPage.js # 334 lines (decomposed from 717)
  TenantsPage.js      # Decomposed
  VacancyPage.js      # Fixed useCallback warning
  + PropertiesPage, UnitsPage, LeadsPage, RentTrackingPage,
    HousekeepingPage, MoveInOutPage, NotesPage, etc.
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

---

## Prioritized Backlog

### P3 (Low / Backlog)
- Add pagination for large tenant/lead lists
- Export to CSV/PDF for income reports
- Mobile-responsive design improvements
- Add search/filter across all list pages
- Unit tests for frontend components
- Minor Radix UI cosmetic warning (data-state on Fragment) - library issue
