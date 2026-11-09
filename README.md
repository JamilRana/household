# LifeHub (Household Management Platform)

> A modern, collaborative multi-group household management platform integrating tasks, grocery planning, smart pantry inventory, financial accounting, and group administration.

[![Next.js](https://img.shields.io/badge/Next.js-16.2.2-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-blue?logo=react)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19.3-2D3748?logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![NextAuth.js](https://img.shields.io/badge/NextAuth.js-v5_Beta-purple)](https://authjs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)

---

## 📑 Table of Contents
1. [Overview & Core Value](#-overview--core-value)
2. [Module Directory & Key Capabilities](#-module-directory--key-capabilities)
3. [System Architecture](#-system-architecture)
4. [Role-Based Access Control (RBAC) Matrix](#-role-based-access-control-rbac-matrix)
5. [Prerequisites & Environment Configuration](#-prerequisites--environment-configuration)
6. [Getting Started & Local Setup](#-getting-started--local-setup)
7. [Database Schema & Migrations](#-database-schema--migrations)
8. [Background Workers & Scheduled Jobs](#-background-workers--scheduled-jobs)
9. [Testing & Quality Assurance](#-testing--quality-assurance)
10. [Functional Roadmap](#-functional-roadmap)
11. [Detailed Documentation Suite](#-detailed-documentation-suite)

---

## 🌟 Overview & Core Value

**LifeHub** connects the disconnected elements of shared living—chores, pantry stocks, grocery shopping, and shared bills—into a cohesive, real-time operating system for households. Built with a mobile-first philosophy, LifeHub allows roommates, partners, and families to share tasks and ledgers without losing individual privacy.

---

## 🚀 Module Directory & Key Capabilities

### 1. 👥 Multi-Group & Collaborative Scoping
- **Context Isolation**: Switch active household scope seamlessly via cookie-cached context (`active_group_id`), optimized with React `cache()` per request.
- **Granular Roles**: Strict hierarchical permissions (`OWNER`, `ADMIN`, `MEMBER`, `GUEST`).
- **Cryptographic Invitations**: Secure 32-byte tokens stored as SHA-256 hashes with 7-day expiration.
- **Session Revocation**: Real-time session invalidation via `sessionVersion` and `isActive` checks on every JWT cycle.

### 2. ✅ Task Management & Kanban Board
- **Interactive Kanban**: Drag-and-drop column board powered by `@dnd-kit`.
- **Recurring Engine**: Auto-regenerates next occurrences (`DAILY`, `WEEKLY`, `MONTHLY`) preserving assignees.
- **Overdue Detection**: Scheduled background worker flags overdue chores and dedupes daily alerts using `overdueNotifiedAt`.
- **Notifications**: Distinct `TASK_COMPLETED` and `TASK_OVERDUE` event dispatches.

### 3. 🛒 Groceries & Live Shopping Mode
- **Mobile In-Store Mode**: Streamlined touch interface for real-time price logging and budget tallying.
- **Atomic & Idempotent Finalization**:
  - Automatically converts purchased items into categorized **Finance Transactions**.
  - Scales receipt discrepancies proportionally across categories when `manualTotal` is provided.
  - Ingests items into **Pantry / Food Inventory**, merging quantities with existing stock to avoid duplicates.

### 4. 🍞 Smart Pantry & Food Waste Prevention
- **Dynamic Routing**: Classifies items into `Fridge`, `Freezer`, or `Pantry` based on category heuristics.
- **Shelf-Life Estimation**: Auto-sets expiration dates (Meat: 3d, Produce: 5d, Dairy: 7d, Frozen: 90d, Canned: 365d).
- **Stock Depletion**: One-click quantity consumption with automatic zero-stock purge.

### 5. 💰 Finance & Recurring Ledger
- **Multi-Type Double Ledger**: `INCOME`, `EXPENSE`, and `TRANSFER` operations.
- **Robust Recurring Ledger**: Powered by `RecurringRule` with unique constraints (`@@unique([recurringRuleId, occurrenceDate])`), catch-up loops for missed intervals, and month-end date pinning (e.g. Jan 31 $\rightarrow$ Feb 28 $\rightarrow$ Mar 31).
- **Cryptographic Protection**: AES-256-GCM authenticated encryption with 12-byte IV, key version headers, and GCM AAD record binding to prevent row-swapping attacks.
- **Transparent Dual Storage**: Plaintext `amount` is maintained for native PostgreSQL aggregations, while `encryptedAmount` satisfies tamper-evident cryptographic verification.

---

## 🔐 Role-Based Access Control (RBAC) Matrix

LifeHub enforces strict access boundaries using the unified helper `requireGroupAccess(kind, resourceId, userId, minRole)`:

| Operation / Capability | GUEST (1) | MEMBER (2) | ADMIN (3) | OWNER (4) | SUPERADMIN (System) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **View Tasks / Groceries / Pantry** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Complete Task / Check Item** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Create Task / Grocery / Pantry Item** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Delete Own Items / Edit Task** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Manage Group Categories & Budgets** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Invite Members / Remove Members** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Update Group Details / Rename** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Transfer Ownership / Delete Group** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Platform User Admin (`/admin/users`)** | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## ⚙️ Prerequisites & Environment Configuration

### Required Environment Variables

All variables are strictly validated at application startup using Zod in `src/lib/env.ts`:

| Key | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | String (URL) | PostgreSQL connection pool URL (SSL required) | `postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` |
| `DIRECT_URL` | String (URL) | Direct connection URL for Prisma migrations | `postgresql://user:pass@ep-xyz.neon.tech/neondb` |
| `AUTH_SECRET` | String (min 16) | NextAuth v5 session signing secret | Generate via `openssl rand -base64 32` |
| `NEXTAUTH_URL` | String (URL) | Canonical application URL | `http://localhost:3000` |
| `ENCRYPTION_KEY` | String (min 32) | Master secret for AES-256-GCM key derivation | 32+ character random secret string |
| `CRON_SECRET` | String (min 16) | Secret for authenticating cron endpoints | High-entropy random bearer secret |
| `AUTH_GOOGLE_ID` | String (optional) | Google OAuth Client ID | `xyz.apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | String (optional) | Google OAuth Client Secret | Cloud Console Secret |

---

## 🛠 Getting Started & Local Setup

### 1. Clone & Install
```bash
git clone <repository-url>
cd "Cost management/household"

# Install with legacy-peer-deps enabled via .npmrc
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your PostgreSQL/Neon credentials and secrets
```

### 3. Synchronize Database & Seed
```bash
# Push Prisma schema to PostgreSQL
npx prisma db push

# Seed system income, expense, and pantry categories
npx prisma db seed
```

### 4. Run Development Server
```bash
npm run dev
```

### 5. Default Seed Users & Credentials
When you run `npx prisma db seed`, the following accounts are initialized for testing:

| Account Type | Email | Password | System Role | Permissions |
| :--- | :--- | :--- | :---: | :--- |
| **Super Admin** | `admin@lifehub.local` | `Password123!` | `SUPERADMIN` | Platform Administration, User Management, All Groups |
| **Standard User** | `demo@lifehub.local` | `Password123!` | `USER` | Household member, creates/manages personal & group resources |

### 6. Run Linter & Tests
```bash
# Run unit tests and permission matrix
npm run test

# Run ESLint (Flat Config)
npm run lint
```

---

## 🗄 Database Schema & Migrations

- **Provider**: PostgreSQL via Neon Serverless.
- **Relation Mode**: `relationMode = "prisma"` (application-level cascading and foreign key index management).
- **Core Entities**:
  - `User`: Accounts, credentials, system role (`USER`, `ADMIN`, `SUPERADMIN`), `sessionVersion`, `isActive`.
  - `Group` & `GroupMember`: Workspaces with membership roles.
  - `GroupInvitation`: Tokenized invitations stored as SHA-256 hashes.
  - `TaskList` & `Task`: Kanban lists, multi-user assignments, recurrence, `overdueNotifiedAt`.
  - `GroceryList` & `GroceryItem`: Shopping items with estimated/actual prices.
  - `PantryItem` & `PantryCategory`: Food inventory with location (`Fridge`, `Freezer`, `Pantry`) and expiration tracking.
  - `Transaction` & `RecurringRule`: Ledger records with `@@unique([recurringRuleId, occurrenceDate])` and AES-256-GCM encrypted amounts.
  - `AuditLog`: Action logs for role changes, user admin actions, ownership transfers, and security events.

---

## ⏱ Background Workers & Scheduled Jobs

All background jobs are implemented in plain server modules (`src/lib/jobs/`) to prevent unauthorized client invocation:

### 1. Recurring Ledger Processor
- **Endpoint**: `GET /api/cron/recurring`
- **Security**: Validates `Authorization: Bearer <CRON_SECRET>` using constant-time `crypto.timingSafeEqual`.
- **Implementation**: `src/lib/jobs/recurring-transactions.ts`

### 2. Overdue Tasks Scanner
- **Endpoint**: `GET /api/cron/overdue-tasks`
- **Security**: Validates `Authorization: Bearer <CRON_SECRET>` using constant-time `crypto.timingSafeEqual`.
- **Implementation**: `src/lib/jobs/overdue-tasks.ts`
- **Deduplication**: Suppresses repeat alerts within 24 hours using `overdueNotifiedAt`.

---

## 🧪 Testing & Quality Assurance

LifeHub includes comprehensive Vitest test coverage:
- `src/lib/permissions.test.ts`: Permission evaluation matrix testing Owner, Admin, Member, Guest, and unauthorized access across all resources.
- `src/lib/actions/finance.test.ts`: Transaction creation and recurring ledger idempotency.
- `src/lib/actions/groceries.test.ts`: Shopping cart status changes, shopping session finalization, and pantry migration.
- `src/lib/actions/tasks.test.ts`: Task generation, status updates, and recurrence generation.
- `src/lib/actions/sharing.test.ts`: Invitation token hashing and membership acceptance.

---

## 🔮 Functional Roadmap

High-value household features planned for upcoming iterations:
1. **Pantry $\rightarrow$ Groceries Feedback Loop**: Automatic grocery suggestions when pantry items hit low stock thresholds or approach expiry dates.
2. **Shared Expense Splitting**: "Who owes whom" settle-up calculation and balance resolution between group members.
3. **Multi-Account Wallets**: Bank accounts, cash envelopes, and credit cards with transfer reconciliation.
4. **Offline PWA Shopping Mode**: IndexedDB local storage and queued sync for unreliable in-store connectivity.

---

## 📚 Detailed Documentation Suite

- [Architectural Blueprint & Security Design](docs/ARCHITECTURE.md)
- [Server Actions & API Reference](docs/API_AND_ACTIONS.md)
- [Security Audit & Vulnerability Remediation](docs/SECURITY_REVIEW.md)
