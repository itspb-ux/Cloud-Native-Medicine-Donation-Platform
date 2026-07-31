# Medicine Donation Platform — TypeScript + Express + PostgreSQL

This is the production backend rewrite of the original JSON-file prototype. Same
frontend (plain HTML/CSS/JS, unchanged), same API shape — but now backed by a
real PostgreSQL database, with TypeScript, Zod validation, JWT auth, and
transaction-safe donation/wishlist writes.

## Project structure

```
medicine-donation-platform/
├── src/
│   ├── server.ts              # Express app entrypoint
│   ├── db/
│   │   ├── pool.ts            # pg Pool (reads DATABASE_URL or PG* env vars)
│   │   └── seed.ts            # one-time seed script (safe to re-run)
│   ├── jobs/
│   │   └── expiryAlerts.ts    # scans stock, logs simulated expiry emails
│   ├── middleware/
│   │   └── auth.ts            # authenticateToken / requireRole
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── medicines.routes.ts
│   │   ├── donations.routes.ts
│   │   ├── wishlist.routes.ts
│   │   ├── admin.routes.ts
│   │   └── reports.routes.ts
│   ├── types/index.ts         # shared TS types + Express.Request augmentation
│   └── utils/
│       ├── caseMapper.ts      # snake_case DB rows -> camelCase JSON
│       └── expiry.ts          # Near Expiry vs Available rule
├── database/
│   └── schema.sql             # run this once against your Postgres DB
├── frontend/                  # static HTML/CSS/JS, served as-is by Express
├── .env.example
├── package.json
└── tsconfig.json
```

## Prerequisites

- Node.js 18+ (tested on Node 22)
- A PostgreSQL database (local install, Docker, or a hosted one like Supabase/Neon/Render)

## Setup (VS Code / local)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create your `.env`**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env`:
   - `DATABASE_URL` — your Postgres connection string
   - `JWT_SECRET` — any long random string (never reuse the example value)

   If you don't have Postgres yet, the quickest option is Docker:
   ```bash
   docker run --name medicine-db -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=medicine_donation -p 5432:5432 -d postgres:16
   ```
   That matches the default `DATABASE_URL` already in `.env.example`.

3. **Create the schema**
   ```bash
   psql "$DATABASE_URL" -f database/schema.sql
   ```
   (In VS Code you can also just open `database/schema.sql` and run it with
   any Postgres extension/GUI — e.g. pgAdmin, DBeaver, or the "PostgreSQL"
   VS Code extension.)

4. **Seed demo data** (users, medicines, donations, wishlist — safe to re-run,
   it skips itself if users already exist)
   ```bash
   npm run db:seed
   ```

   Seeded logins:
   | Role     | Email                     | Password      |
   |----------|---------------------------|----------------|
   | Admin    | admin@gmail.com           | admin123       |
   | Pharmacy | citycare@gmail.com        | pharmacy123    |
   | Pharmacy | healthplus@gmail.com      | pharmacy123    |
   | NGO      | helpinghands@gmail.com    | ngo123         |
   | NGO      | smile@gmail.com           | ngo123         |

5. **Run it**

   Development (auto-restart on file changes):
   ```bash
   npm run dev
   ```

   Production-style (compile then run):
   ```bash
   npm run build
   npm start
   ```

6. Open **http://localhost:3000** — the frontend is served from the same
   Express app, so there's no separate frontend server or CORS setup needed.

## How the pieces fit together

- `server.ts` serves the static `frontend/` folder and mounts all API routers
  under `/api/*`. Any non-`/api` route falls through to `frontend/index.html`
  (the original SPA-style catch-all), so client-side redirects still work.
- Every route file matches the original prototype's endpoints and response
  shapes 1:1 — `caseMapper.ts` converts Postgres's `snake_case` columns to the
  `camelCase` fields the existing `frontend/js/script.js` already expects, so
  **no frontend code needed to change**.
- `donations.routes.ts` and `wishlist.routes.ts` wrap their multi-table writes
  (creating a donation *and* flipping a medicine/wishlist status) in a single
  DB transaction with `SELECT ... FOR UPDATE`, so two people can't race each
  other into an inconsistent state.
- `jobs/expiryAlerts.ts` runs once at boot and then on an interval
  (`EXPIRY_CHECK_INTERVAL_MS`, default 1 hour) — it's a placeholder for the
  AWS Lambda + EventBridge job described in the project plan. Swap the
  `setInterval` in `server.ts` for that when you get to the cloud/DevOps phase.

## Troubleshooting

- **`JWT_SECRET is not set`** — you haven't created `.env` (see step 2).
- **`ECONNREFUSED` / can't connect to DB** — Postgres isn't running, or
  `DATABASE_URL` is wrong. Test with `psql "$DATABASE_URL" -c "select 1"`.
- **Login says "pending approval"** — Pharmacy/NGO accounts are created with
  `status = 'Pending'` and need an Admin to approve them via
  `PUT /api/admin/users/:id/approve` (or the Admin dashboard's Users tab).
- **Port already in use** — change `PORT` in `.env`.

## Next steps toward the full project plan

The docx build plan describes a FastAPI/Supabase stack with Docker,
GitHub Actions, and an AWS Lambda expiry job. This backend is functionally
equivalent (same DB schema, same role permissions, same automated expiry
scan) but implemented in Express/TypeScript, which is what the provided
source files use. If you need the Docker/CI wiring next, a `Dockerfile` and
`.github/workflows/ci-cd.yml` are natural next additions — say the word and
I'll scaffold those too.
