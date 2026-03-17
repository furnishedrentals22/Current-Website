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
- **Upcoming Cleanings tab**: Spreadsheet-style table (Unit, Check-out, Check-in, Cleaning Time, Cleaner, Maintenance, Notes, Status) with row-click edit modal
- **Current Housekeepers tab**: CRUD with archive support
- **Housekeeping Leads tab**: CRUD with archive support
- Maintenance person assignment integration

### Maintenance (Operations)
- Full maintenance request CRUD

### Marlins Decal Inventory System
- `marlins_decals` collection with per-property inventory
- Assign specific decal from inventory to a tenant via dropdown
- Display decal assignments on property details page

### Tenant Enhancements
- Parking option for Airbnb tenants

### Bug Fixes
- Vacancy logic: properly accounts for future tenants beyond 90-day view
- Marlins Decal: changed from simple toggle to full inventory selection

## Key DB Collections
- `properties`, `units`, `tenants`, `leads`
- `cleaning_records`, `housekeepers`, `housekeeping_leads`
- `maintenance_requests`, `maintenance_personnel`
- `marlins_decals`
- `notifications`, `notes`, `income_records`, `deposits`, `rent_tracking`

## Key API Endpoints
- `/api/marlins_decals/` (GET, POST), `/api/marlins_decals/{id}` (PUT, DELETE)
- `/api/maintenance/` (GET, POST), `/api/maintenance/{id}` (PUT, DELETE)
- `/api/calendar/vacancy` (GET)
- `/api/cleaning-records/`, `/api/housekeepers/`, `/api/housekeeping-leads/`

## Backlog
- No pending tasks. Awaiting user direction.
