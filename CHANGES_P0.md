# LifeHub – P0 Security Patch

Verified here: `tsc --noEmit` clean, `eslint src --quiet` clean, **44 unit tests pass**
(Prisma is mocked). **Not verified here:** anything against a real database or a running
app (the sandbox cannot download Prisma engines). Run the integration test below before deploying.

## Deploy steps
1. `npx prisma db push` – adds one table, `rate_limits` (additive, no data migration).
2. Optional env vars (all fall back safely):
   - `RESEND_API_KEY`, `MAIL_FROM` – needed to actually email verification / reset links.
     Without them, links are printed to the server log in development only and never returned to the browser.
   - `REQUIRE_EMAIL_VERIFICATION=true` – only after mail works; blocks sign-in until the email is confirmed.
   - `AUTH_URL` – public base URL used inside emailed links.
3. `TEST_DATABASE_URL=<disposable postgres> npx vitest run src/test/isolation.integration.test.ts`
   – real two-user isolation test (skipped otherwise).

## What was fixed
| # | Issue | Fix |
|---|---|---|
| 1 | `groupId \|\| undefined` matched every row for users without a group (38 sites: read/update/delete of other users' tasks, groceries, pantry, finance, search, dashboard) | New `src/lib/scope.ts` (`NO_GROUP`, `mine`, `getWritableGroupId`, `onlyIfMember`); all 38 sites replaced; regression test scans the source tree and fails if the pattern returns |
| 2 | **Unauthenticated account takeover**: `requestPasswordReset` returned the raw reset token to the caller | Token is only emailed; response is always generic; per-email and per-IP rate limit; older links invalidated |
| 3 | `registerUser` returned the verification token; verification never enforced | Token emailed only; new `/api/verify-email`; enforcement opt-in via env |
| 4 | Group IDOR: `updateMemberRole` / `removeMember` accepted any member id from any group; admins could demote/remove the OWNER | Target must belong to the group; OWNER protected; only OWNER manages admins; no self role change; audit entries |
| 5 | `addMemberByUserId` silently added anyone (even as ADMIN) | Role limits, active-user check, duplicate check, audit entry |
| 6 | `updateGroupDetails` spread client input into Prisma (could set `ownerId`) | Field whitelist and length limits |
| 7 | `acceptInvitation` demoted existing OWNER/ADMIN to MEMBER | Existing role is kept |
| 8 | Any user could edit/delete any category (incl. system) | Own, non-system only; categories with history are archived instead of deleted |
| 9 | `finalizeShoppingSession`: no access check, helpers outside the transaction, unvalidated prices, duplicate expense on double tap with a manual total | Access-scoped query (owner / writable group / editor share), everything inside one transaction (+timeout), price validation, integer-cent allocation that sums exactly to the receipt |
| 10 | `updateItemStatus` created duplicate pantry + expense rows each time it was marked purchased; not atomic | Transactional and idempotent; viewer shares / guests can't change items |
| 11 | Task actions: assignees and `groupId` accepted from client; `getGroupMembersByList` leaked members of any list; CUSTOM recurrence cloned the task; double completion spawned duplicates | Assignees must be group members; group must be writable by caller; access check on member list; month-end pinning; conditional update (optimistic lock) + transaction |
| 12 | Server actions trusted a client-supplied `groupId` argument (`getTaskLists`, `getGroceryLists`, …) | Honoured only if the caller is a member |
| 13 | Any ADMIN could create/promote SUPERADMIN or reset/delete a SUPERADMIN | Only SUPERADMIN manages admin accounts; no self role change; email change revokes sessions |
| 14 | No rate limiting on login/register/reset | DB-backed limiter (`rate_limits`); login limited per account and per IP |
| 15 | Docs said 10-char passwords; code accepted 6 | 10 min (new passwords only) |
| 16 | Revoked/deleted session showed a blank page; delete-account didn't sign out | Redirect to `/login`; `deleteAccount` bumps `sessionVersion` and deactivates |
| 17 | Budget / recurring rule / transaction inputs unvalidated or category not checked | Zod parse + category must be visible to the caller; stale `new Date()` default fixed |
| 18 | `active_group_id` cookie flags | `httpOnly`, `sameSite=lax`, `secure` in production |

## Behaviour changes you will notice
- A trip with a receipt total but **no pending items** no longer creates an expense (that path caused the duplicate-on-double-tap bug).
- Deleting a category that has transactions archives it instead.
- Group admins can no longer promote admins or touch the owner.
- Login is throttled after 8 failed attempts per account / 15 min.

## NOT done yet (be aware)
- **No forgot/reset-password pages exist.** The emailed reset link points to `/reset-password`, which you still need to build (actions are ready).
- `sharing.ts`, pantry mutations, `deleteGroceryItem`, `renameCategory`, and admin read actions were not reviewed line by line; they now use the safe group filter, but GUEST read-only is enforced only in the paths above.
- P1/P2 from the review (single `authorize()` layer, Decimal money/currency, loading/error pages, optimistic UI, mobile nav, copy and styling pass, PWA) are untouched.
- `encryptedAmount` still sits beside the plaintext `amount`.
