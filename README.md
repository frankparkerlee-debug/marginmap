# MarginMap

MarginMap is an AI-powered pricing and margin intelligence platform for healthcare suppliers. It ingests invoice- and claim-level transaction data, benchmarks realized prices, exposes leakage, and produces prioritized recovery actions for finance, sales, and revenue cycle leaders.

## Feature Overview
- Email/password authentication backed by JWT.
- Secure CSV/XLSX ingest with header normalization, raw file retention, and SQLite persistence.
- Executive dashboard with revenue, COGS, gross margin, leakage, and trend visuals.
- SKU profitability explorer with payer/customer outlier detection.
- Customer profitability explorer with uplift-to-median modelling.
- Recommendation engine that persists actionable remediation items (pricing, payer, customer).
- Compliance export of all recommendations to CSV for audit trails.

## Tech Stack
- Node.js 18 + Express
- SQLite (file-backed, no external dependency)
- TailwindCSS + Chart.js (CDN-delivered)
- JWT auth, bcrypt password hashing
- csv-parse & xlsx for ingest
- dayjs for date handling

## Project Structure
```
marginmap/
├── api/
│   ├── actions.js
│   ├── auth.js
│   ├── customers.js
│   ├── dashboard.js
│   ├── sku.js
│   └── upload.js
├── db/
│   ├── index.js
│   └── migrations.sql
├── middleware/
│   └── auth.js
├── services/
│   ├── analyticsService.js
│   └── ingestService.js
├── scripts/
│   ├── migrate.js
│   └── seed.js
├── web/
│   ├── actions.html
│   ├── customers.html
│   ├── dashboard.html
│   ├── login.html
│   ├── sku.html
│   ├── upload.html
│   └── js/
│       ├── actions.js
│       ├── common.js
│       ├── customers.js
│       ├── dashboard.js
│       ├── login.js
│       ├── sku.js
│       └── upload.js
├── .env.example
├── package.json
└── server.js
```

## Getting Started
1. `cp .env.example .env` and adjust values (JWT secret, admin credentials, margin target, etc.).
2. `npm install`
3. `npm run migrate`
4. `npm run seed` (creates admin user with the credentials in `.env`)
5. `npm run dev` (nodemon) or `npm start`

Log in at `http://localhost:3000/login.html` using the seeded credentials.

## Deploying to Render
This repository includes a `render.yaml` describing a Render Web Service named `marginmap1`. Key points:

1. Push the repo to GitHub (already done).
2. In Render, choose **New → Blueprint Deployment**, point to this repo, and Render will create the service defined in `render.yaml`.
3. Attach a Persistent Disk (configured in the blueprint at `/var/data`) so the SQLite database survives restarts.
4. After the service initializes, set the following environment variables in Render:
   - `JWT_SECRET`: secure random string
   - `ADMIN_EMAIL`: login address for the out-of-box admin
   - `ADMIN_PASSWORD`: strong password for that admin
   - `COMPANY_NAME`: label shown in the UI
   - `DEFAULT_MARGIN_TARGET`: e.g. `0.6`
5. Redeploy; the `start:render` script runs migrations and seeds the admin account on each boot.
6. Access the live app at `https://marginmap1.onrender.com/login.html`.

## Environment Variables
- `PORT` – API + UI port (default 3000)
- `JWT_SECRET` – signing secret for tokens
- `SQLITE_FILE` – path to SQLite database file
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` – seeded admin user
- `COMPANY_NAME` – label for UI header
- `DEFAULT_MARGIN_TARGET` – margin threshold for SKU recommendations (e.g., 0.6 = 60%)

## Key API Endpoints
| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/register` | (Optional) create additional users |
| GET | `/api/auth/me` | Current user profile |
| POST | `/api/upload` | Multipart CSV/XLSX ingest |
| GET | `/api/dashboard/summary` | KPI + trend metrics |
| GET | `/api/sku` | SKU profitability summary |
| GET | `/api/sku/:skuCode` | SKU drill-down |
| GET | `/api/customers` | Customer profitability summary |
| GET | `/api/customers/:customerName` | Customer drill-down |
| GET | `/api/actions` | Recommendation feed (filter via `?status=open|resolved|all`) |
| POST | `/api/actions/generate` | Rebuild recommendations |
| PATCH | `/api/actions/:id` | Update recommendation status |
| GET | `/api/actions/export/csv` | CSV audit export |

All protected endpoints require `Authorization: Bearer <token>`.

## Data Ingest
- Supports `.csv`, `.xls`, `.xlsx`.
- Header aliases auto-map to required fields; validation errors flag missing columns.
- Raw files stored under `storage/uploads`.
- Each upload logged in `uploads` table; transactions tied to upload via `upload_id`.

## Recommendation Workflow
1. Load transactions.
2. `POST /api/actions/generate` to recompute insights.
3. Review in `/actions` UI; mark resolved/snoozed.
4. Export CSV for compliance via the UI or `/api/actions/export/csv`.

## Frontend Pages
- `/login`: secure entry
- `/dashboard`: executive KPIs + trend
- `/sku`: SKU/CPT explorer with drill-down
- `/customers`: customer profitability with uplift modelling
- `/actions`: prioritized recommendation feed
- `/upload`: ingest interface with ingest summary

## Scripts
- `npm run migrate` – apply migrations
- `npm run seed` – seed admin account
- `npm run dev` – nodemon auto-reload
- `npm start` – production run
