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
- Tenants page redesign (Current/Future + Past tabs, spreadsheet-style)
- Leads management with pipeline stages
- Income calculation engine (monthly/yearly)
- Vacancy tracking (by building, by unit size, upcoming)
- Calendar timeline view
- Notes system

### Phase 2 (Feb 2026)
- **Info Menu** — Collapsible sidebar group with 4 sub-pages
- **Parking Page** (2 tabs: Parking Info + Tenant Assignments)
- **Door Codes Page** — PIN-protected admin codes, cross-populated to Units page
- **Login Information Page** — 3 sensitivity levels with different PINs
- **Marketing Page** — Per-unit listing links, cross-populated to Units page
- **Team Members** — Simple CRUD for assigning people

### Phase 3 (Feb 2026 — Current)
- **Notifications/Tasks Page — Full Overhaul**:
  - **Kanban Board View** — 5 status columns (Upcoming, In Progress, Done, Reassigned, Archived) with priority-sorted cards
  - **List View** — Sortable table with all columns (priority, name, category, property/unit, assigned, date, status, actions)
  - **View Toggle** — Switch between Kanban and List views
  - **Search** — Real-time search across name, notes, tenant, assigned person
  - **Multi-Filters** — Status, Priority, Category, Property, Assigned Person with clear button
  - **Bulk Actions** — Select multiple → Mark Done, Archive, In Progress, Delete
  - **Snooze** — Quick snooze (+1h, +1d, +1w) or custom date/time, pushes reminder forward
  - **Duplicate** — Copy notification as template with "(Copy)" prefix
  - **Priority Levels** — Low (green), Medium (amber), High (orange), Urgent (red) with color dots
  - **Category Tags** — manual, parking, door_code, deposit, move_in, move_out, housekeeping, lead, other
  - **Recurring** — Daily/Weekly/Monthly with optional end date
  - **Multiple Reminder Times** — Add additional time slots per notification
  - **Status History** — Tracks all status changes with timestamps
  - **Rich Form** — Full create/edit with all fields including priority, category, property, unit, assigned person, recurring, multiple times

## Database Collections
- `properties`, `units`, `tenants`, `leads`, `notes`
- `notifications` — name, status, priority, category, reminder_date/time, reminder_times[], is_recurring, recurrence_pattern, recurrence_end_date, snooze_until, status_history[], assigned_person, property_id, unit_id, notes
- `parking_spots`, `parking_assignments`
- `door_codes`, `login_accounts`, `marketing_links`
- `team_members`, `settings` (PIN config)

## Key API Endpoints
- `/api/notifications` — Full CRUD with query params (status, priority, category, property_id, assigned_person)
- `/api/notifications/{id}/snooze` — Snooze to new date/time
- `/api/notifications/{id}/duplicate` — Create copy
- `/api/notifications/bulk-action` — Bulk status change or delete
- All other CRUD endpoints for properties, units, tenants, leads, parking, door codes, login accounts, marketing links, team members, pins

## Prioritized Backlog
- P0: Auto-notification hooks in other pages (tenant creation → move-in/move-out reminders, etc.)
- P1: User feedback on all new features
- P2: Refactor TenantsPage.js and server.py into smaller modules
- P3: Housekeeping reminders integration
