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

## Run locally
Requires Node.js 22.5 or newer. The local server serves the frontend and API together and stores data in `data/tripsplit.sqlite`.

```bash
npm start
```

Open http://localhost:3000 in your browser.

## Security
The current routes are public and the share code acts as access. For production, add authentication/participant authorization.
