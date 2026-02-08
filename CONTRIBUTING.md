# Contributing

This document covers the development workflow, coding conventions, and architecture patterns used in this project. Read it before making changes.

## Table of Contents

- [Development Setup](#development-setup)
- [Architecture](#architecture)
- [Backend Conventions](#backend-conventions)
- [Frontend Conventions](#frontend-conventions)
- [Shared Schemas](#shared-schemas)
- [Adding a New Feature](#adding-a-new-feature)
- [Adding a New Bank Parser](#adding-a-new-bank-parser)
- [Database Changes](#database-changes)
- [API Documentation](#api-documentation)
- [Code Quality](#code-quality)

## Development Setup

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | >= 20 |
| pnpm | >= 9 (activate with `corepack enable`) |
| Docker | Latest stable |

### First-time setup

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
pnpm --filter api infra:up

# Copy environment config
cp .env.example .env

# Generate initial migration and apply
pnpm --filter api db:migrate:create
pnpm --filter api db:migrate

# Start both API and web in watch mode
pnpm dev
```

The API runs on http://localhost:3001, the web app on http://localhost:3000.

### Daily workflow

```bash
# Start everything
pnpm --filter api infra:up   # PostgreSQL (if not already running)
pnpm dev                      # API + Web in parallel

# After modifying entities
pnpm --filter api db:migrate:create   # Generate migration
pnpm --filter api db:migrate          # Apply migration

# After modifying API endpoints
pnpm --filter web codegen    # Regenerate frontend API client

# Before committing
pnpm check-types             # TypeScript check across all packages
pnpm lint                    # ESLint across all packages
```

### Useful debugging tools

```bash
# NestJS REPL -- interact with services directly
pnpm --filter api repl

# TypeScript REPL with full app context
pnpm --filter api repl:ts

# Swagger UI for API exploration
open http://localhost:3001/docs
```

## Architecture

### Module Layers (Backend)

The backend follows a four-layer architecture:

```
Platform Layer       Auth, Database (infrastructure concerns)
     ↓
Domain Layer         Transaction, Category, BankAccount, Subscription,
                     Loan, IncomeSource, BudgetTarget (entity CRUD)
     ↓
Logic Layer          ExchangeRate, BankImport, BudgetCalculator
                     (business logic that spans multiple domains)
     ↓
Facade Layer         Dashboard (orchestrates domain + logic for API consumers)
```

- **Platform modules** are `@Global()` and provide foundational services.
- **Domain modules** own a single entity and expose CRUD operations. They know nothing about other domains.
- **Logic modules** contain business rules that involve multiple entities or external APIs.
- **Facade modules** compose domain and logic services into higher-level endpoints.

### Module File Structure

Every domain module follows this structure:

```
<module>/
  controllers/<module>.controller.ts    # REST endpoints
  services/<module>.service.ts          # Business logic
  entities/<module>.entity.ts           # MikroORM entity
  dto/create-<module>.dto.ts            # Input validation (nestjs-zod)
  dto/update-<module>.dto.ts
  dto/query-<module>.dto.ts             # (if needed)
  <module>.module.ts                    # NestJS module registration
```

### Frontend Architecture

The frontend uses a **feature-first** organization:

```
features/
  dashboard/
    components/
      DashboardView/
        DashboardView.tsx               # 'use client' component
        DashboardView.module.scss       # Layout/positioning only
        index.ts                        # Re-export
    hooks/
      use-monthly-summary.ts            # TanStack Query hook
```

Pages in `app/` are thin wrappers that render feature components:

```tsx
// app/page.tsx
import { DashboardView } from '@/features/dashboard/components/DashboardView';
export default function DashboardPage() {
  return <DashboardView />;
}
```

## Backend Conventions

### Entities

- **UUID primary keys** using `randomUUID()` from `crypto`.
- **`decimal(12,2)`** for all monetary amounts, stored as strings in TypeScript.
- **Amounts are always positive.** The `type` enum determines direction.
- **`timestamptz`** for `createdAt`/`updatedAt`, `date` (no time) for transaction dates and exchange rates.
- **`& Opt`** suffix on properties with defaults to satisfy MikroORM's type system.
- Foreign keys use `ON UPDATE CASCADE`. Delete rules are `CASCADE` for user-owned entities, `SET NULL` for optional references like category.

```typescript
@Entity({ tableName: 'transaction' })
export class Transaction {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID();

  @Property({ type: 'decimal', precision: 12, scale: 2 })
  amount!: string;

  @Property({ type: 'timestamptz', defaultRaw: 'NOW()' })
  createdAt: Date & Opt = new Date();
}
```

### DTOs and Validation

DTOs are created with `nestjs-zod`, wrapping Zod schemas from `@budget/schemas`:

```typescript
import { createZodDto } from 'nestjs-zod';
import { CreateTransactionSchema } from '@budget/schemas';

export class CreateTransactionDto extends createZodDto(CreateTransactionSchema) {}
```

This provides both runtime validation (via the global `ZodValidationPipe`) and automatic Swagger schema generation.

### Enum Casting

Zod schemas infer string literal unions (`'USD' | 'GEL' | ...`), but MikroORM entities use TypeScript enums. Always cast when passing validated data to `em.create()` or `em.assign()`:

```typescript
const entity = this.em.create(Transaction, {
  ...data,
  currency: data.currency as Currency,
  type: data.type as TransactionType,
});
```

### Controllers

- Decorate with `@ApiTags('ModuleName')` for Swagger grouping.
- Use `@CurrentUser()` to get the authenticated user.
- Use `@Public()` to opt out of the global auth guard.
- All routes are protected by default.

### Services

- Inject `EntityManager` from `@mikro-orm/postgresql`.
- Use `Logger` from `@nestjs/common` for structured logging.
- Throw `NotFoundException` with an object payload: `{ message: '...', id }`.
- Always call `em.flush()` after mutations.

## Frontend Conventions

### Blueprint.js v6

- All UI components come from `@blueprintjs/core`, `@blueprintjs/icons`, `@blueprintjs/select`, `@blueprintjs/datetime2`, or `@blueprintjs/table`.
- The app runs in **dark mode** (`className="bp5-dark"` on `<html>`).
- Use Blueprint's `Intent` enum for color-coding: `SUCCESS` for income, `DANGER` for expenses, `WARNING` for loan costs, `PRIMARY` for neutral/actions.

### SCSS Modules

- **No Tailwind CSS.** Layout and positioning use `.module.scss` files.
- Blueprint handles visual styling (colors, typography, spacing via component props). SCSS handles layout (grid, flex, margins, widths).
- Import shared utilities at the top of every SCSS module:

```scss
@use "@/styles/tools/toRem" as *;
@use "@/styles/mixins/container" as *;
@use "@/styles/colors" as *;
```

### Container-Position Pattern

Components follow a recursive **container -> position -> container** hierarchy:

- **Container**: Visual styles (background, padding, borders, flex display) but NOT positional styles.
- **Position**: Only positional styles (width, margin, grid placement).

```tsx
<div className={styles.container}>
  <div className={styles.headerPosition}>
    <HeaderComponent />
  </div>
  <div className={styles.contentPosition}>
    <ContentComponent />
  </div>
</div>
```

### Client vs. Server Components

- Pages in `app/` are **server components** by default (thin wrappers).
- Feature components that use hooks, state, or Blueprint interactive components must have `'use client'` at the top.
- Static display components that receive data as props should remain server components when possible.

### API Hooks

Custom hooks in `features/<module>/hooks/` use TanStack Query:

```typescript
'use client';
import { useQuery } from '@tanstack/react-query';
import { apiInstance } from '@/lib/api-instance';

export function useTransactions(filters: QueryTransactionsInput) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const { data } = await apiInstance.get('/transaction', { params: filters });
      return data;
    },
  });
}
```

After the API is stable, run `pnpm --filter web codegen` to generate hooks automatically from the OpenAPI spec via orval.

## Shared Schemas

The `packages/schemas` package is the single source of truth for:

- **Enums**: `Currency`, `TransactionType`, `CategoryType`, `AccountType`, `ExchangeRateSource`
- **Financial reporting groups**: `REAL_INCOME_TYPES`, `REAL_EXPENSE_TYPES`, `LOAN_COST_TYPES`, `FINANCING_NOISE_TYPES`
- **Zod schemas**: `CreateTransactionSchema`, `UpdateTransactionSchema`, `QueryTransactionsSchema`, etc.
- **TypeScript types**: Inferred from Zod schemas (`CreateTransactionInput`, `UpdateTransactionInput`, etc.)

Both the backend and frontend import from `@budget/schemas`. Changes here propagate to both apps automatically.

When adding a new entity:

1. Create the Zod schemas in `packages/schemas/src/<entity>.ts`.
2. Re-export from `packages/schemas/src/index.ts`.
3. Use `createZodDto()` in the backend DTOs.
4. Import types directly in the frontend.

## Adding a New Feature

### Backend

1. **Schema**: Add Zod schemas to `packages/schemas/src/<feature>.ts` and export from `index.ts`.
2. **Entity**: Create `apps/api/src/<feature>/entities/<feature>.entity.ts` following the entity conventions above.
3. **DTOs**: Create DTO files in `apps/api/src/<feature>/dto/` using `createZodDto()`.
4. **Service**: Create `apps/api/src/<feature>/services/<feature>.service.ts` with CRUD methods.
5. **Controller**: Create `apps/api/src/<feature>/controllers/<feature>.controller.ts` with REST endpoints.
6. **Module**: Create `apps/api/src/<feature>/<feature>.module.ts`. Register the entity, service, and controller.
7. **Register**: Import the new module in `apps/api/src/app.module.ts`.
8. **Migration**: Run `pnpm --filter api db:migrate:create` then `pnpm --filter api db:migrate`.

### Frontend

1. **Hook**: Create `apps/web/src/features/<feature>/hooks/use-<feature>.ts` with TanStack Query hooks.
2. **Component**: Create `apps/web/src/features/<feature>/components/<View>/<View>.tsx` (with `.module.scss` and `index.ts`).
3. **Page**: Create `apps/web/src/app/<route>/page.tsx` that renders the feature component.
4. **Navigation**: Add a nav item in `apps/web/src/components/shared/AppNavbar/AppNavbar.tsx`.

## Adding a New Bank Parser

The bank import system uses a pluggable parser interface:

```typescript
interface BankStatementParser {
  canParse(workbook: XLSX.WorkBook): boolean;
  parseDetails(workbook: XLSX.WorkBook): BankStatementDetails;
  parseTransactions(workbook: XLSX.WorkBook): ParsedTransaction[];
}
```

To add support for a new bank:

1. Create a new parser in `apps/api/src/bank-import/parsers/<bank-name>.parser.ts`.
2. Implement the three interface methods.
3. Add format detection logic in `canParse()` (check sheet names, cell patterns, etc.).
4. Update `BankImportService.processFile()` to try the new parser (currently hardcoded to `BankOfGeorgiaParser` -- this should be refactored to iterate through registered parsers).

### Transaction Type Classification

The parser must classify each transaction into one of the 11 types. The Bank of Georgia parser uses string matching on the transaction details field:

| Pattern in details | Classified as |
|--------------------|---------------|
| "Loan disbursement" | `LOAN_DISBURSEMENT` |
| "Loan repayment, Loan N" | `LOAN_REPAYMENT` |
| "Repayment of interest; Loan N" | `LOAN_INTEREST` |
| "Foreign Exchange" | `FX_CONVERSION` |
| "Placing funds on deposit" | `DEPOSIT` |
| "Interest payment" | `INTEREST_INCOME` |
| "Credit Funds" | `INCOME` |
| "Payment - Amount: ... Merchant:" | `EXPENSE` |
| "Withdrawal - Amount: ... ATM:" | `ATM_WITHDRAWAL` |
| Default | `EXPENSE` |

## Database Changes

### Creating a migration

After modifying any MikroORM entity:

```bash
pnpm --filter api db:migrate:create
```

This generates a migration file in `apps/api/src/database/migrations/` based on the diff between your entities and the current database schema.

### Applying migrations

```bash
pnpm --filter api db:migrate
```

### Starting fresh

```bash
pnpm --filter api db:migrate:fresh
```

This drops all tables and re-runs all migrations from scratch. Useful during development.

### Entity naming conventions

- **Table names**: snake_case, singular (`transaction`, `bank_account`, `budget_target`).
- **Column names**: snake_case (MikroORM handles this automatically via `underscoreNaming` strategy).
- **Primary keys**: `id` column, UUID type, generated with `randomUUID()`.
- **Timestamps**: Every entity has `createdAt` and `updatedAt` as `timestamptz`.
- **Money columns**: `decimal(12,2)` precision. Stored and handled as strings in TypeScript.

## API Documentation

Swagger UI is auto-generated from the codebase. Every DTO created with `createZodDto()` is automatically included in the OpenAPI spec.

To keep docs accurate:

- Always use DTOs for request bodies and query parameters.
- Add `@ApiTags('TagName')` to controllers for grouping.
- Add `@ApiOperation({ summary: '...' })` to endpoints for descriptions.
- Use `.describe('...')` on Zod schema fields for property-level documentation.

## Code Quality

### Type checking

```bash
pnpm check-types    # All packages
```

This runs `tsc --noEmit` across `packages/schemas`, `apps/api`, and `apps/web`. All three must pass cleanly.

### Linting

```bash
pnpm lint           # All packages
```

### Building

```bash
pnpm build          # All packages in dependency order
```

Turborepo ensures `packages/schemas` builds before `apps/api` and `apps/web`.

### Pre-commit checklist

Before committing, make sure:

1. `pnpm check-types` passes with no errors.
2. `pnpm lint` passes with no errors.
3. `pnpm build` succeeds.
4. If you changed API endpoints, run `pnpm --filter web codegen` and commit the updated `generated.ts`.
5. If you changed entities, create and commit the migration file.
