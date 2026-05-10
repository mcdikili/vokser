# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A case management starter app built on **Azure Static Web Apps** (React SPA + Azure Functions backend + Azure Table Storage). Users submit support cases via a public form; admins manage the queue via a dashboard view.

## Commands

### Frontend (root)
```bash
npm install
npm run dev       # Vite dev server at http://localhost:5173
npm run build     # Production build → dist/
npm run preview   # Serve production build locally
```

### Backend (api/)
```bash
cd api && npm install
npm start         # Azure Functions at http://localhost:7071
```

### Full local stack (recommended)
```bash
npm install -g @azure/static-web-apps-cli
swa start http://localhost:5173 --run "npm run dev" --api-location api
```
This proxies the frontend and API together, matching the production SWA routing. The API falls back to an in-memory store when `AZURE_STORAGE_CONNECTION_STRING` is not set (demo mode).

### Copy API env config
```bash
cp api/local.settings.json.example api/local.settings.json
# Then fill in AZURE_STORAGE_CONNECTION_STRING and CASE_TABLE_NAME
```

## Architecture

### Frontend — [src/main.jsx](src/main.jsx)
Single-file React app (~210 lines). No routing library — tab switching (`view` state) controls which panel renders. No state management library — plain `useState`/`useMemo`. Icons from `lucide-react`. Styling in [src/styles.css](src/styles.css) (pure CSS, custom properties, responsive at 900px).

Two views:
- **Raise issue** — public case submission form
- **Manage cases** — admin dashboard with search, filter by status/priority, status updates

### Backend — [api/src/functions/cases.js](api/src/functions/cases.js)
Three Azure Functions HTTP endpoints:
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/cases` | List all cases |
| POST | `/api/cases` | Create case (validates & sanitizes) |
| PATCH | `/api/cases/{id}` | Update case status |

Storage abstraction lives in [api/src/storage.js](api/src/storage.js). In production it uses Azure Table Storage (partition key `"CASE"`); without a connection string it uses an in-memory `Map` (demo mode).

Case IDs are UUIDs; case numbers are `CASE-YYYY-######`.

### Routing & Auth — [staticwebapp.config.json](staticwebapp.config.json)
SWA handles routing:
- `/admin/*` requires `authenticated` role (Azure AD); 401s redirect to `/.auth/login/aad`
- `/api/*` allows both anonymous and authenticated callers

**Note:** the frontend itself has no auth gate — the admin UI is accessible to any visitor client-side. True access control relies on locking the API endpoints in `staticwebapp.config.json` (GET/PATCH currently allow anonymous — see README for hardening steps).

### Infrastructure — [infra/main.bicep](infra/main.bicep)
Bicep template provisions SWA + Storage Account. CI/CD via [.github/workflows/azure-static-web-app.yml](.github/workflows/azure-static-web-app.yml) (deploy on push to `main`, preview on PR).

## Key Environment Variables

Set these in Azure Portal (or `api/local.settings.json` locally):
- `AZURE_STORAGE_CONNECTION_STRING` — Table Storage connection string (omit for in-memory demo mode)
- `CASE_TABLE_NAME` — Table name, defaults to `"Cases"`

## Notable Constraints

- No TypeScript — plain JavaScript/JSX throughout
- No ESLint or test suite configured
- All frontend logic in a single file; keep it that way unless the feature genuinely warrants extraction
- The backend has manual field-level validation (max lengths, email regex) in `cases.js` — no validation library
