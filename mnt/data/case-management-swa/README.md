# Azure Static Web Apps Case Management Starter

A deployable starter for a lightweight case-management portal:

- React + Vite frontend
- Azure Static Web Apps hosting
- Managed Azure Functions API under `/api`
- Azure Table Storage persistence for cases
- Admin route prepared for Azure Static Web Apps authentication

## Features

Users can:

- Submit a support case with name, email, category, priority, title, and description.
- See confirmation with a generated case number.

Internal users can:

- View the case queue.
- Search and filter cases.
- Update case status.

## Project structure

```text
.
├── api/                         # Azure Functions API
│   ├── src/functions/cases.js    # GET/POST/PATCH endpoints
│   └── src/storage.js            # Azure Table Storage repository
├── infra/main.bicep              # Optional Azure resource template
├── src/                          # React app
├── staticwebapp.config.json      # Routes, auth, headers, SPA fallback
└── .github/workflows/            # GitHub Actions deployment workflow
```

## API endpoints

| Method | URL | Purpose |
|---|---|---|
| GET | `/api/cases` | List cases |
| POST | `/api/cases` | Create a case |
| PATCH | `/api/cases/{id}` | Update a case status |

## Local development

Prerequisites:

- Node.js 20+
- Azure Functions Core Tools v4
- Azurite, if you want local Table Storage
- Azure Static Web Apps CLI, optional but recommended for full local frontend + API testing

Install dependencies:

```bash
npm install
cd api && npm install && cd ..
```

For local API settings:

```bash
cp api/local.settings.json.example api/local.settings.json
```

Start Azurite if you want durable local storage:

```bash
azurite
```

Run frontend only:

```bash
npm run dev
```

Run frontend + API together with Static Web Apps CLI:

```bash
npm install -g @azure/static-web-apps-cli
swa start http://localhost:5173 --run "npm run dev" --api-location api
```

> Without `AZURE_STORAGE_CONNECTION_STRING`, the API falls back to an in-memory demo store. This is fine for smoke testing but not for production.

## Azure deployment

### Option A: Azure Portal + GitHub

1. Push this folder to a GitHub repository.
2. In Azure Portal, create **Static Web App**.
3. Choose your GitHub repository and branch.
4. Use these build settings:
   - App location: `/`
   - API location: `api`
   - Output location: `dist`
5. Azure creates a GitHub Actions secret called `AZURE_STATIC_WEB_APPS_API_TOKEN`.
6. Create or use an Azure Storage Account.
7. In the Static Web App, go to **Configuration** and add:
   - `AZURE_STORAGE_CONNECTION_STRING`: your storage account connection string
   - `CASE_TABLE_NAME`: `Cases`
8. Redeploy from GitHub Actions.

### Option B: Bicep resources first

```bash
az group create --name rg-case-management --location uksouth
az deployment group create \
  --resource-group rg-case-management \
  --template-file infra/main.bicep \
  --parameters staticWebAppName=<unique-swa-name> storageAccountName=<uniquestorageacct>
```

Then set the Static Web App configuration values from the deployment output.

## Authentication notes

The app currently lets anyone submit a case. The `/admin` route is configured for `authenticated` users in `staticwebapp.config.json`.

For production, configure Static Web Apps authentication and invite internal users. You can also split routes further, for example:

```json
{ "route": "/admin/*", "allowedRoles": ["administrator"] }
```

Then assign users to the `administrator` role from the Static Web Apps invitation flow.

## Production hardening checklist

- Restrict `GET /api/cases` and `PATCH /api/cases/{id}` to admin users.
- Add email notifications when a case is created or updated.
- Add comments/activity history per case.
- Add file attachment support with Blob Storage.
- Add rate limiting or CAPTCHA for public submissions.
- Use Application Insights for monitoring.
- Avoid exposing storage connection strings in code or public repos.
