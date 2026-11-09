# Server Actions & API Reference Specification

This document provides a comprehensive technical contract for all **Next.js Server Actions** (`"use server"`) and HTTP API endpoints in LifeHub.

---

## 1. Action Contract & Result Format

Server actions return either their primary payload or follow the standardized `ActionResult<T>` pattern defined in `src/lib/types.ts`:

```ts
export type ActionResult<T = void> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never };
```

---

## 2. Authentication & Credential Actions (`src/lib/actions/auth.ts`)

### `registerUser(values)`
- **Input**: `{ email: string, password: string (10–72 chars), name: string }`
- **Behavior**: Validates schema with Zod, hashes password with bcrypt (cost 12), creates user record, and generates a SHA-256 hashed verification token with 24h expiration.
- **Returns**: `{ success: string, rawVerificationToken?: string }` or `{ error: string }`.

### `loginUser(values)`
- **Input**: `{ email: string, password: string }`
- **Behavior**: Authenticates credentials, verifies active status, and initiates NextAuth JWT session redirecting to `/dashboard`.
- **Returns**: `{ error: string }` on invalid credentials or inactive account.

### `requestPasswordReset(values)`
- **Input**: `{ email: string }`
- **Behavior**: Generates a 1-hour expiration token hashed with SHA-256 in `VerificationToken`. Protects against user enumeration by returning a generic success message.
- **Returns**: `{ success: string, rawToken?: string }`.

### `resetPasswordWithToken(values)`
- **Input**: `{ token: string, password: string (10–72 chars) }`
- **Behavior**: Verifies token hash and expiration, updates password hash, increments `sessionVersion` to revoke existing sessions, and deletes the token.
- **Returns**: `{ success: string }` or `{ error: string }`.

---

## 3. User & Group Context Actions (`src/lib/actions/user.ts`)

### `getActiveGroupId(userId?)`
- **Input**: `userId?: string` (optional, defaults to current session user)
- **Behavior**: Reads `active_group_id` cookie and validates active membership. Results are cached per-request using React `cache()`.
- **Returns**: `Promise<string | null>`.

### `setActiveGroup(groupId)`
- **Input**: `groupId: string | null`
- **Behavior**: Validates that the caller is an active member of `groupId` before setting the `active_group_id` cookie (1-year TTL). Passing `null` removes the cookie.

### `changePassword(values)`
- **Input**: `{ currentPassword: string, newPassword: string (10–72 chars) }`
- **Behavior**: Verifies current password, updates hash, increments `sessionVersion` to revoke concurrent sessions, and creates an `AuditLog` entry.

### `getUserProfile()`
- **Returns**: User metadata, creation date, and entity counts (`tasks`, `groceryItems`, `transactions`, `pantryItems`).

---

## 4. Group Management Actions (`src/lib/actions/groups.ts`)

### `createGroup(name, description?)`
- **Input**: `name: string, description?: string`
- **Behavior**: Creates group, adds creator as `OWNER`, and writes to `AuditLog`.

### `generateInvitation(groupId, email)`
- **Input**: `groupId: string, email: string`
- **Authorization**: Requires caller to hold `OWNER` or `ADMIN` role.
- **Security**: Generates a 32-byte raw token, stores only its SHA-256 hash in `GroupInvitation` (7-day TTL), and returns `rawToken` to caller.

### `acceptInvitation(rawToken)`
- **Input**: `rawToken: string`
- **Behavior**: Hashes token with SHA-256, validates expiration and email match, adds user as `MEMBER`, and marks invitation `ACCEPTED`.

### `updateGroupDetails(id, data)`
- **Input**: `id: string, data: { name?: string, description?: string, icon?: string }`
- **Authorization**: Requires caller to hold `OWNER` or `ADMIN` role in group `id`.

### `updateMemberRole(groupId, memberId, role)`
- **Input**: `groupId: string, memberId: string, role: "ADMIN" | "MEMBER" | "GUEST"`
- **Authorization**: Requires caller to hold `OWNER` or `ADMIN` role.

### `transferOwnership(groupId, newOwnerId)`
- **Input**: `groupId: string, newOwnerId: string`
- **Authorization**: Restricted strictly to the current `OWNER`.
- **Behavior**: Atomically assigns `ownerId`, promotes `newOwnerId` to `OWNER`, and demotes prior owner to `ADMIN`.

### `deleteGroup(groupId)`
- **Input**: `groupId: string`
- **Authorization**: Restricted to `OWNER`.
- **Behavior**: Executes manual cascading deletion inside `prisma.$transaction` across invitations, members, pantry goods, grocery items/lists, tasks/lists, transactions, budgets, and recurring rules.

---

## 5. Task Actions (`src/lib/actions/tasks.ts`)

### `createTask(values)`
- **Input**:
  ```ts
  {
    listId: string;
    title: string;
    description?: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    dueDate?: Date | null;
    dueTime?: Date | null;
    recurrence?: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | null;
    recurrenceEnd?: Date | null;
    assignedUserIds?: string[];
  }
  ```
- **Authorization**: Validates `requireGroupAccess("TASK_LIST", listId, userId, "MEMBER")`.
- **Returns**: Created `Task` record.

### `updateTaskStatus(taskId, status)`
- **Input**: `taskId: string, status: TaskStatus`
- **Authorization**: Requires at least `GUEST` or `VIEWER` access.
- **Recurrence Logic**: If set to `COMPLETED` and `recurrence != 'NONE'`, automatically computes next due date and duplicates all `TaskAssignment` records. Dispatches `TASK_COMPLETED` notification.

### `deleteTask(taskId)`
- **Input**: `taskId: string`
- **Authorization**: Validates `requireGroupAccess("TASK", taskId, userId, "MEMBER")`.

---

## 6. Groceries & Pantry Actions (`src/lib/actions/groceries.ts`)

### `finalizeShoppingSession(itemPrices, manualTotal?)`
- **Input**: `itemPrices: Record<string, number>, manualTotal?: number`
- **Atomic Pipeline (`prisma.$transaction`)**:
  1. Queries all pending items and updates status to `PURCHASED` with recorded prices.
  2. Aggregates subtotals by category. If `manualTotal` is provided, scales category subtotals proportionally.
  3. Creates `EXPENSE` transactions with GCM AAD-bound AES-256-GCM encryption.
  4. Migrates items to `PantryItem`, merging quantities with existing stock to eliminate duplicates.

### `consumePantryItem(id, amount?)`
- **Input**: `id: string, amount: number (default: 1)`
- **Authorization**: Validates `requireGroupAccess("PANTRY_ITEM", id, userId, "MEMBER")`.
- **Behavior**: Decrements stock. If quantity reaches 0, removes item.

---

## 7. Finance & Recurring Ledger Actions (`src/lib/actions/finance.ts`)

### `createTransaction(values)`
- **Input**:
  ```ts
  {
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    amount: number;
    currency?: string;
    categoryId: string;
    date: Date;
    description?: string;
    paymentMethod?: "CASH" | "CREDIT_CARD" | "DEBIT_CARD" | "BANK_TRANSFER" | "DIGITAL_WALLET";
    isRecurring?: boolean;
    recurrencePattern?: string;
  }
  ```
- **Behavior**: Encrypts amount with GCM AAD bound to `userId` and writes plaintext `amount` for query aggregation.

### `createRecurringRule(values)`
- **Input**:
  ```ts
  {
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    amount: number;
    currency?: string;
    categoryId: string;
    description?: string;
    paymentMethod?: PaymentMethod;
    frequency: "DAILY" | "WEEKLY" | "MONTHLY";
    startDate: Date;
    endDate?: Date | null;
  }
  ```
- **Behavior**: Registers scheduled rule for automated processing by background cron workers.

### `getFinanceStats()`
- **Behavior**: Calculates current month vs. previous month income, expenses, net balance, and percentage deltas.

---

## 8. Administrative Actions (`src/lib/actions/admin.ts`)

All administrative actions require `checkAdmin()` (`user.role === "ADMIN" || user.role === "SUPERADMIN"`):

- `getAllUsersAdmin()`: Lists all non-deleted users with account statistics.
- `createUser(values)`: Creates a new user with password (min 10, max 72 bytes) and optional system role.
- `updateUser(values)`: Modifies user display name, email, or system role.
- `deactivateUser(values)`: Sets `isActive: false`, `deletedAt: new Date()`, and increments `sessionVersion` to revoke active JWT tokens.
- `reactivateUser(userId)`: Restores an account and resets `sessionVersion`.
- `resetUserPassword(userId, newPassword)`: Updates password hash and revokes active sessions.
- `deleteUser(userId)`: Executes full cascading deletion across all user-owned lists, items, memberships, and shares.

---

## 9. Scheduled Background Endpoints

### `GET /api/cron/recurring`
- **Security**: Validates `Authorization: Bearer <CRON_SECRET>` via `crypto.timingSafeEqual`.
- **Implementation**: `src/lib/jobs/recurring-transactions.ts`
- **Output**:
  ```json
  {
    "success": true,
    "timestamp": "2026-11-09T20:30:00.000Z",
    "createdCount": 2,
    "rulesProcessed": 5
  }
  ```

### `GET /api/cron/overdue-tasks`
- **Security**: Validates `Authorization: Bearer <CRON_SECRET>` via `crypto.timingSafeEqual`.
- **Implementation**: `src/lib/jobs/overdue-tasks.ts`
- **Output**:
  ```json
  {
    "success": true,
    "timestamp": "2026-11-09T20:30:00.000Z",
    "notifiedCount": 3
  }
  ```
