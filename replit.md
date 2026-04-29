# Contacts X

A bilingual (Arabic/English) Master Data Management platform for managing contacts, entities, and their relationships.

## Architecture

- **Backend**: ASP.NET Core 8.0 Web API (C#) — runs on `localhost:3001` in development
- **Database**: PostgreSQL (Replit built-in), Entity Framework Core (Npgsql)
- **Auth**: JWT Bearer tokens, BCrypt password hashing
- **Frontend**: React 18 + TypeScript + Vite — runs on `0.0.0.0:5000`
- **Styling**: Tailwind CSS + shadcn/ui components
- **Routing**: React Router DOM v6
- **Data Fetching**: TanStack React Query v5

The Vite dev server proxies `/api/*` requests to the backend on `localhost:3001`.
In production, the .NET backend serves the built static frontend (`UseStaticFiles` +
`MapFallbackToFile("index.html")`) on a single port (5000).

## Project Structure

```
backend/                  ASP.NET Core 8.0 Web API
  Program.cs              App entry, DI, middleware, DB migration, seed
  Models/                 EF Core entity models
  Data/                   EF Core DbContext
  Controllers/            API controllers
  Services/               Business logic services

frontend/                 React + Vite SPA
  src/
    App.tsx               Root app + routing + auth
    pages/                Page-level components
    components/           Reusable UI components
    contexts/             React context providers
    hooks/                Custom hooks
    lib/                  API client + utilities
  vite.config.ts          Vite dev server configuration
```

## Development Setup (Replit)

Two workflows are configured:

1. **Backend API** (console, port 3001) — `cd backend && API_PORT=3001 dotnet run --no-build --urls http://0.0.0.0:3001`
2. **Frontend** (webview, port 5000) — `cd frontend && npm run dev`

The Vite dev server is configured with:
- `host: "0.0.0.0"` — accept external connections (Replit proxy)
- `port: 5000` — required for Replit webview
- `allowedHosts: true` — trust the Replit proxy host header
- `proxy: { "/api": "http://localhost:3001" }` — forward API calls to the backend

## Database

The backend reads `DATABASE_URL` (Replit built-in PostgreSQL). The `BuildConnectionString`
helper in `Program.cs` converts the standard `postgres://` URI into the Npgsql
key-value form. Schema is created automatically via `EnsureCreatedAsync` and a few
idempotent ALTER statements at startup.

## Default Credentials

A seed admin user is created on first run:
- **Username**: `admin`
- **Password**: `admin123`

## Deployment

Configured for Replit Autoscale.

- **Build**: install npm deps, build frontend, copy `dist/*` into `backend/wwwroot`,
  publish backend in Release.
- **Run**: `dotnet ./publish/ContactsX.Api.dll --urls http://0.0.0.0:5000` — the
  backend serves both the API (`/api/*`) and the SPA static files.

## Recent Changes (April 29, 2026)

- Imported from GitHub. Switched runtime module from `dotnet-7.0` to `dotnet-8.0`
  to match the project's `net8.0` target.
- Added `BuildConnectionString` in `Program.cs` to support the Replit
  `DATABASE_URL` URI format.
- Configured Replit workflows (Backend API + Frontend) and Autoscale deployment.
