# Budget

A personal multi-currency budget tracking web application. Import bank statements from Bank of Georgia, track spending across currencies, manage subscriptions and loans, set monthly budget targets, and view financial summaries in any currency you choose.

## Why This Exists

This app is built around a specific financial workflow: holding savings in a Bank of Georgia Term Deposit (10.30% annual / 10.80% effective) and using cash-covered micro-loans against the deposit for daily spending. At month-end, when salary arrives (via Deel in USD), all micro-loans are repaid in one batch.

The app understands this pattern natively. It correctly classifies loan disbursements as "financing noise" rather than income, separates real loan interest costs from repayment principal, and gives you a clear picture of actual income vs. actual expenses.

## Features

- **Bank statement import** -- Upload Bank of Georgia XLSX statements. The parser auto-classifies 11 transaction types, extracts merchant info and MCC codes, and deduplicates using SHA-256 hashes.
- **Multi-currency** -- USD, GEL, RUB, EUR, GBP. No fixed base currency. Switch your display currency at any time. All amounts stored in original currency; conversion happens on-the-fly via NBG (National Bank of Georgia) daily rates using GEL as pivot.
- **Dashboard** -- Monthly overview showing gross income, total expenses, loan cost, and net income. Top spending categories at a glance.
- **Transaction management** -- Full CRUD with filtering by month, year, type, currency, category, and merchant search. Paginated table view.
- **Subscription tracking** -- Recurring expenses with billing day, owner, and active/inactive toggle. Monthly total per currency.
- **Loan tracking** -- Outstanding debts with remaining balance, monthly payment, holder, and bank loan number.
- **Budget targets** -- Monthly planned amounts per category. Actual vs. target comparison with progress bars (green < 80%, yellow 80-100%, red > 100%).
- **Category auto-assignment** -- Categories define MCC code arrays. When importing bank statements, transactions are auto-categorized by matching their MCC code.
- **Settings** -- Manage categories (with icons, colors, MCC codes), bank accounts, and income sources.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | [Turborepo](https://turbo.build/) + [pnpm](https://pnpm.io/) workspaces |
| Backend | [NestJS](https://nestjs.com/), [MikroORM v6](https://mikro-orm.io/), PostgreSQL 16 |
| Frontend | [Next.js 15](https://nextjs.org/) (App Router), [TanStack Query](https://tanstack.com/query), [Blueprint.js v6](https://blueprintjs.com/), SCSS modules |
| Auth | [better-auth](https://www.better-auth.com/) (magic links) |
| Validation | [Zod](https://zod.dev/), [nestjs-zod](https://github.com/risen228/nestjs-zod) |
| API Docs | [Swagger/OpenAPI](https://swagger.io/) at `/docs`, JSON spec at `/api-json` |
| Frontend Codegen | [orval](https://orval.dev/) -- generates TanStack Query hooks from OpenAPI spec |

## Project Structure

```
budget/
├── apps/
│   ├── api/                         # NestJS backend
│   │   ├── docker-compose.yml       # PostgreSQL 16 (local dev)
│   │   ├── mikro-orm.config.ts      # ORM configuration
│   │   └── src/
│   │       ├── auth/                # better-auth integration, guards, decorators
│   │       ├── bank-account/        # Bank account CRUD
│   │       ├── bank-import/         # XLSX parser engine (BoG parser, type classification)
│   │       ├── budget-target/       # Budget target CRUD
│   │       ├── category/            # Category CRUD with MCC codes
│   │       ├── dashboard/           # Monthly summary facade
│   │       ├── database/            # MikroORM module, migrations, seed
│   │       ├── exchange-rate/       # NBG API fetcher, convertAmount utility
│   │       ├── income-source/       # Income source CRUD
│   │       ├── loan/                # Loan CRUD
│   │       ├── subscription/        # Subscription CRUD
│   │       └── transaction/         # Transaction CRUD with filters/pagination
│   │
│   └── web/                         # Next.js frontend
│       ├── orval.config.ts          # API client codegen config
│       └── src/
│           ├── app/                  # Next.js App Router pages
│           ├── components/shared/    # AppNavbar, AppShell
│           ├── features/            # Feature modules (dashboard, transaction, etc.)
│           ├── lib/                  # API client, auth client, providers
│           └── styles/              # SCSS tools, mixins, colors
│
└── packages/
    └── schemas/                     # Shared Zod schemas, enums, TypeScript types
        └── src/
            ├── enums.ts             # Currency, TransactionType, CategoryType, etc.
            ├── transaction.ts       # Create/Update/Query/Response schemas
            ├── category.ts
            ├── subscription.ts
            ├── loan.ts
            ├── bank-account.ts
            ├── exchange-rate.ts
            ├── budget-target.ts
            ├── income-source.ts
            └── dashboard.ts
```

## Transaction Types

The app classifies every transaction into one of 11 types, which are grouped for financial reporting:

| Type | Direction | Financial Group |
|------|-----------|----------------|
| `EXPENSE` | Outflow | **Real expenses** |
| `FEE` | Outflow | **Real expenses** |
| `ATM_WITHDRAWAL` | Outflow | **Real expenses** |
| `INCOME` | Inflow | **Real income** |
| `INTEREST_INCOME` | Inflow | **Real income** |
| `LOAN_INTEREST` | Outflow | **Loan cost** |
| `TRANSFER` | Either | Financing noise |
| `LOAN_DISBURSEMENT` | Inflow | Financing noise |
| `LOAN_REPAYMENT` | Outflow | Financing noise |
| `FX_CONVERSION` | Either | Financing noise |
| `DEPOSIT` | Outflow | Financing noise |

**Financing noise** is excluded from income/expense totals. This prevents loan disbursements from inflating income figures and loan repayments from inflating expense figures.

## Exchange Rate Logic

- Rates are fetched daily from the [NBG API](https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/en/json/).
- **GEL is the pivot currency** (rate = 1.0). All other currencies are stored as "GEL per 1 unit."
- Cross-currency conversion: `USD -> EUR = (USD/GEL) / (EUR/GEL)`.
- Rates are auto-fetched on API startup and on-demand when a missing rate is requested.

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9 (`corepack enable` to activate)
- **Docker** (for local PostgreSQL)

## Getting Started

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd budget
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

The default `.env` works out of the box for local development:

```
DATABASE_URL=postgresql://budget:budget@localhost:5432/budget
BETTER_AUTH_SECRET=dev-secret-change-in-production
BETTER_AUTH_URL=http://localhost:3001
API_PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Start PostgreSQL

```bash
pnpm --filter api infra:up
```

This runs `docker compose up -d` inside `apps/api/`, starting a PostgreSQL 16 container on port 5432.

### 4. Run database migrations

```bash
pnpm --filter api db:migrate
```

If this is the first time and no migrations exist yet, generate them from the entity definitions:

```bash
pnpm --filter api db:migrate:create
pnpm --filter api db:migrate
```

### 5. Seed the database (optional)

```bash
# Start the API first (seed script calls the API to create a user via better-auth)
pnpm --filter api dev

# In another terminal:
pnpm --filter api db:seed
```

This creates a test user (`test@budget.local`).

### 6. Start development servers

```bash
pnpm dev
```

This starts both services in parallel via Turborepo:

| Service | URL |
|---------|-----|
| **API** (NestJS) | http://localhost:3001 |
| **Web** (Next.js) | http://localhost:3000 |
| **Swagger UI** | http://localhost:3001/docs |
| **OpenAPI JSON** | http://localhost:3001/api-json |

### 7. Generate frontend API client (optional)

After the API is running, generate typed TanStack Query hooks from the OpenAPI spec:

```bash
pnpm --filter web codegen
```

This runs [orval](https://orval.dev/) and outputs `apps/web/src/api/generated.ts` with fully typed hooks like `useGetTransactions()`, `useCreateTransaction()`, etc.

## Commands Reference

### Root-level (via Turborepo)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start API + Web in parallel (watch mode) |
| `pnpm build` | Build all packages (schemas first, then api + web) |
| `pnpm lint` | Run ESLint across all packages |
| `pnpm check-types` | Run `tsc --noEmit` across all packages |
| `pnpm test` | Run tests across all packages |
| `pnpm codegen` | Run orval codegen across packages |

### Infrastructure (`apps/api`)

| Command | Description |
|---------|-------------|
| `pnpm --filter api infra:up` | Start PostgreSQL container |
| `pnpm --filter api infra:down` | Stop PostgreSQL container |
| `pnpm --filter api infra:restart` | Restart PostgreSQL container |

### Database (`apps/api`)

| Command | Description |
|---------|-------------|
| `pnpm --filter api db:migrate` | Apply pending migrations |
| `pnpm --filter api db:migrate:create` | Generate migration from entity diff |
| `pnpm --filter api db:migrate:fresh` | Drop all tables and re-run migrations |
| `pnpm --filter api db:seed` | Seed database (create test user) |

### REPL (`apps/api`)

| Command | Description |
|---------|-------------|
| `pnpm --filter api repl` | NestJS REPL (interact with services) |
| `pnpm --filter api repl:ts` | TypeScript REPL with app context |

### Frontend (`apps/web`)

| Command | Description |
|---------|-------------|
| `pnpm --filter web codegen` | Generate API client from OpenAPI spec |

## API Documentation

When the API is running, visit http://localhost:3001/docs for the interactive Swagger UI. The raw OpenAPI JSON spec is available at http://localhost:3001/api-json.

All DTOs are defined using `createZodDto()` from `nestjs-zod`, which automatically generates OpenAPI schemas from Zod definitions. This means the Swagger docs are always in sync with runtime validation.

## Key Design Decisions

- **Amounts are always positive.** The `type` field on a transaction determines its financial direction. There are no negative amounts in the database.
- **MikroORM decimal fields store as strings.** Money is stored as `decimal(12,2)` in PostgreSQL, represented as strings in TypeScript to avoid floating-point precision issues.
- **SHA-256 import hashing.** Each imported transaction gets a hash of `iban|postingDate|rawDetails|amount|currency`. Re-importing the same statement is safe -- duplicates are silently skipped.
- **Pluggable bank parsers.** The `BankStatementParser` interface allows adding new bank formats without modifying the import service. Bank of Georgia is the first implementation.
- **better-auth manages its own tables.** User, session, and verification tables are created and managed by better-auth's PostgreSQL adapter. The `User` entity in MikroORM maps to the same table with additional fields.
- **Generated frontend code is committed.** The orval-generated file (`apps/web/src/api/generated.ts`) is checked into git so frontend builds don't require a running API server.

## Authentication

The app uses [better-auth](https://www.better-auth.com/) with magic link authentication. In development, magic links are logged to the API console instead of being sent by email.

All API routes are protected by default. Use the `@Public()` decorator to opt out of authentication on specific endpoints.

## License

Private project. All rights reserved.
