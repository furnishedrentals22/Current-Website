# HarborRent - Property Management Platform PRD

## Original Problem Statement
Build a comprehensive property management application for managing rental properties, tenants, leads, income tracking, and vacancy analysis. The system should handle both long-term and Airbnb/VRBO short-term rentals.

## Core Architecture
- **Stack**: FastAPI (Python) + React + MongoDB (FARM stack)
- **Frontend**: React with Shadcn/UI components, Tailwind CSS
- **Backend**: FastAPI with Motor (async MongoDB driver)
- **Database**: MongoDB

## What's Been Implemented

### Phase 1 (Previous sessions)
- Properties CRUD with building_id for sorting
- Units CRUD with additional monthly costs
- Tenants CRUD with Airbnb/VRBO support, deposit tracking
- Leads management with pipeline stages
- Income calculation engine (monthly/yearly)
- Vacancy tracking (by building, by unit size, upcoming)
- Calendar timeline view
- Notes system
- Basic notification system (lead reminders, deposit returns)
- Tenants page redesign (Current/Future + Past tabs, spreadsheet-style)

### Phase 2 (Current session - Feb 2026)
- **Info Menu** - Collapsible sidebar group with 4 sub-pages
- **Parking Page** (2 tabs):
  - Parking Info: CRUD for Designated Spots + Marlins Decals
  - Tenant Assignments: Assign tenants to spots with dates, archive past tenants
  - Auto-reminders for Marlins Decal checkout → Notifications
  - Manual reminder creation for decal pickup
- **Door Codes Page**:
  - Property → Unit hierarchy with 5 code types per unit
  - PIN-protected admin codes (shared PIN system)
  - Guest code displayed bold/large
  - Cross-populated to Units page (expandable detail rows)
  - Auto-reminder on tenant move-in to update codes → Notifications
- **Login Information Page**:
  - 3 sensitivity levels (Low/Medium/High) with different PINs
  - Full account credential storage (username, password, email, URL, security questions, etc.)
  - Copy-to-clipboard for credentials
  - PIN gate for Medium and High sensitivity levels
- **Marketing Page**:
  - Per-unit listing links (Airbnb, Furnished Finder, Photos)
  - Additional custom links
  - Copy-to-clipboard functionality
  - Cross-populated to Units page (expandable detail rows)
- **Notifications/Tasks Page** (Central hub - standalone top-level):
  - 5 status tabs: Upcoming, In Progress, Done, Reassigned, Archived
  - Full CRUD for notifications
  - Fields: name, property, unit, assigned person, date/time, recurring, notes
  - Sort by date or property
  - All system reminders (parking, door codes, deposits, move-ins) flow here
- **Team Members** - Simple CRUD for assigning people to notifications
- **Units page updated** - Shows door code and marketing link icons, expandable detail rows
- **Bell icon panel updated** - Works with new status-based notification model

## Database Collections
- `properties` - building_id, name, address, etc.
- `units` - property_id, unit_number, base_rent, etc.
- `tenants` - property_id, unit_id, dates, deposit info, etc.
- `leads` - pipeline stages, potential units, etc.
- `notifications` - overhauled: name, status, reminder_date/time, recurring, assigned_person, etc.
- `notes` - title, content, color
- `parking_spots` - spot_type (designated/marlins_decal), properties, cost, etc.
- `parking_assignments` - parking_spot_id, tenant_id, dates
- `door_codes` - unit_id, 5 code types with notes
- `login_accounts` - sensitivity_level, credentials, security questions
- `marketing_links` - unit_id, airbnb/furnished_finder/photos links
- `team_members` - name, role, phone, email
- `settings` - PIN configuration (shared_pin, level_2_pin, level_3_pin)

## Key API Endpoints
- `/api/properties` - CRUD (sorted by building_id)
- `/api/units` - CRUD (sorted numerically)
- `/api/tenants` - CRUD (with auto door code reminders)
- `/api/leads` - CRUD with pipeline stages
- `/api/notifications` - CRUD with status management
- `/api/parking-spots` - CRUD
- `/api/parking-assignments` - CRUD (auto Marlins Decal reminders)
- `/api/door-codes` - CRUD (upsert per unit)
- `/api/login-accounts` - CRUD
- `/api/marketing-links` - CRUD (upsert per unit)
- `/api/team-members` - CRUD
- `/api/pins/set`, `/api/pins/verify`, `/api/pins/status`

## Prioritized Backlog
- P1: User feedback on new Info pages
- P2: Refactor TenantsPage.js into smaller components
- P2: Refactor server.py into modular routers
- P3: Housekeeping reminders integration
- P3: Move-in/move-out reminders integration
