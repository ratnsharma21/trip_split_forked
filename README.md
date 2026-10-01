# TripSplit Expense Splitter

Live shared travel-expense app built on Hatchable + PostgreSQL.

## Folders
- `frontend/` — HTML, CSS and browser JavaScript
- `backend/api/` — Hatchable API functions
- `database/schema.sql` — complete fresh PostgreSQL schema

## Features
- Create/join trips with 6-character codes
- Multiple phones share the same trip
- Add expenses and calculate equal shares
- Live balances and settlement plan
- Rename travelers
- Trip history/resume
- Mobile responsive UI
- INR currency

## Hatchable note
The backend uses `import { db } from "hatchable"`; it is not a standalone Express server. GitHub stores the source, while Hatchable provides the serverless runtime and database integration.

## API
POST `/api/trips/create`
GET `/api/trips/history`
GET/DELETE `/api/trips/:id`
POST `/api/trips/:id/expenses`
DELETE `/api/trips/:id/expenses/:expenseId`
PUT `/api/trips/:id/travelers/:travelerId`
POST `/api/trips/:id/travelers/sync`

## Live app
https://tripsplit-expense.hatchable.site/

## Environment Configuration (.env)

All sensitive settings and database parameters are configured via `.env` (use `.env.example` as a template):

```env
# Server
PORT=3000
NODE_ENV=production

# Database Connection (PostgreSQL)
DB_TYPE=postgres
DB_HOST=postgres
DB_PORT=5432
DB_NAME=tripsplit
DB_USER=tripsplit_user
DB_PASSWORD=tripsplit_secure_password

# PostgreSQL Container Admin / Root Settings
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres_root_password
POSTGRES_DB=tripsplit

# Local SQLite Fallback
DB_SQLITE_PATH=./data/tripsplit.sqlite
```

## Run Locally
Requires Node.js 22.5 or newer.

```bash
# Install dependencies
npm install

# Start local server (connects to PostgreSQL if configured or SQLite fallback)
npm start
```

Open http://localhost:3000 in your browser.

## Run with Docker Compose (Recommended)

Docker Compose starts both the **PostgreSQL database** (`tripsplit-db`) and the **TripSplit web application** (`tripsplit-app`) securely with healthchecks:

```bash
# Build & start all services in background
docker compose up -d --build

# View logs
docker compose logs -f

# Stop services
docker compose down
```

## Security
- All database credentials (host, port, user, password, db name, admin/root) are parameterized and kept out of codebase using `.env`.
- Parametric SQL queries prevent SQL injection across both PostgreSQL and SQLite.
- `.env` is ignored in git (`.gitignore`).


