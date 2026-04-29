# Contacts X

A bilingual (Arabic/English) Master Data Management platform for managing contacts, entities, and their relationships.

## Architecture

- **Backend**: ASP.NET Core 8.0 Web API (C#) on port 3001
- **Database**: PostgreSQL (Replit built-in), Entity Framework Core
- **Auth**: JWT Bearer tokens, BCrypt password hashing
- **Frontend**: React 18 + TypeScript on port 5000 (Vite dev server)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Routing**: React Router DOM v6
- **Data Fetching**: TanStack React Query v5
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts

## Project Structure

```
server/ContactsX.Api/
  Program.cs                 - App entry, DI, middleware, DB migration, seed
  Models/                    - EF Core entity models (7 tables)
  Data/AppDbContext.cs       - EF Core DbContext with PostgreSQL
  Controllers/               - API controllers (Auth, Contacts, Entities, etc.)
  Services/                  - Business logic services
  DTOs/                      - Data transfer objects

src/
  App.tsx                    - Root app with routing and auth
  main.tsx                   - Entry point
  pages/                     - Page-level components
  components/                - Reusable UI components
    layout/                  - App layout (sidebar, header, bottom nav)
    ui/                      - shadcn/ui components
  contexts/                  - React context providers (Auth, Layout)
  hooks/                     - Custom hooks (useTranslation)
  lib/
    api.ts                   - JWT-aware fetch wrapper
    utils.ts                 - Utility functions

start.sh                     - Script to run both .NET backend and Vite frontend
vite.config.ts               - Vite config with proxy /api -> localhost:3001
```

## Database Tables

1. **Users** - Admin users with BCrypt-hashed passwords
2. **Contacts** - Individual contact records with profile completeness scoring
3. **Entities** - Organization/entity records with hierarchy support
4. **ContactEntityRelations** - M:N relationships between contacts and entities
5. **AuditLogs** - Change tracking for all CRUD operations
6. **DuplicateCandidates** - Potential duplicate pairs with match scoring, record snapshots (record1_snapshot, record2_snapshot jsonb) stored on merge/dismiss for history view
7. **KpiSnapshots** - Dashboard KPI snapshots

## API Endpoints

- `POST /api/auth/login` - JWT authentication (default: admin/admin123)
- `GET/POST /api/contacts` - Contacts CRUD
- `GET/PATCH/DELETE /api/contacts/:id` - Contact detail operations
- `GET/POST /api/entities` - Entities CRUD
- `GET/PATCH/DELETE /api/entities/:id` - Entity detail operations
- `POST/DELETE /api/relations` - Contact-entity relationships
- `GET /api/lookups/nationalities` - Nationality dropdown lookup list
- `GET /api/search?query=` - Unified search (ILike partial match on contacts EN/AR names, nationalId; entities nameEn/nameAr, registrationId, contactPoints JSON, child entity names)
- `GET /api/duplicates?status=` - Duplicate listing with status filter (all/pending/merged/dismissed), includes record snapshots and resolvedByName for history view
- `POST /api/duplicates/detect` - Run duplicate detection
- `POST /api/duplicates/:id/merge|dismiss` - Duplicate resolution (guards: only pending candidates)
- `POST /api/import/contacts|entities` - Bulk import
- `GET /api/stats` - Overview statistics
- `GET /api/dashboards/executive|governance|operational|analytics` - Dashboard KPIs
- `GET /api/kpis/*` - KPI drill-downs
- `GET /api/audit-logs?entityType=&action=&entityId=` - Audit log listing with filters

## Pages

- `/login` - Login page (JWT auth)
- `/` - Dashboard with 5 tabs: Overview, Executive, Governance, Operational, Analytics
- `/contacts` - Contacts list with search and import
- `/contacts/new` - Create contact form
- `/contacts/:id` - Contact detail view
- `/contacts/:id/edit` - Edit contact form
- `/entities` - Entities list with search and import
- `/entities/new` - Create entity form
- `/entities/:id` - Entity detail view
- `/entities/:id/edit` - Edit entity form
- `/duplicates` - Duplicate detection and resolution
- `/analytics` - Analytics charts
- `/search` - Unified search
- `/audit-logs` - Audit log viewer

## Key Implementation Notes

- **Entity Completeness**: Requires sector field (15pts) for 100% score. EntityForm includes sector input.
- **Duplicate Snapshots**: `DuplicatesController` uses explicit `JsonSerializerOptions` with `CamelCasePolicy` to ensure snapshot JSON matches API convention (camelCase).
- **Bilingual Support**: All user-facing strings use `t("key")` from `src/lib/translations.ts` with EN/AR pairs. Never hardcode UI text. Entity type labels use `entityType.{type}` keys, contact types use `contactType.{type}` keys.
- **Nationality Validation**: Backend validates against `NationalityLookup.cs` (e.g., "Saudi" not "Saudi Arabian"). Frontend dropdown fetches from `GET /api/lookups/nationalities`.
- **Language/Theme Persistence**: Stored in `localStorage` keys `contactsx-dir` and `contactsx-theme`.
- **Import System**: Frontend `ImportDialog` uses case-sensitive header matching (key + label + aliases). No positional fallback. Gender/contactType are normalized in preview via `normalize` functions on field definitions. DOB validated for format and future dates on both frontend and backend.
- **Audit Log Filtering**: Backend supports `entityId` filter parameter for detail pages to show only relevant logs.

## Running the Project

The "Start application" workflow builds the .NET project, then runs both the .NET backend (port 3001) and Vite dev server (port 5000) concurrently. Vite proxies `/api` requests to the .NET backend.

## Default Credentials

- Username: `admin`
- Password: `admin123`
