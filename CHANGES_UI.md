# LifeHub – UI/UX pass (on top of the P0 security patch)

## Checked here
- `tsc --noEmit` clean, `eslint src --quiet` clean, **52 unit tests pass** (4 DB tests skipped by design).
- A real `next build` (Turbopack) compiles all 21 routes, including the new ones. (Run with the Google font stubbed,
  because the sandbox cannot reach Google Fonts; your normal build is unaffected.)
- Smoke test of the built server: `/login`, `/forgot-password`, `/reset-password` render; protected pages redirect to `/login`.

## NOT checked here (please look at these on your phone and laptop)
No browser was available, so **nothing was checked visually**. In particular review: the Today screen, the bottom bar
and More menu, the quick-add dialog, and every screen touched by the automated style clean-up (see below), where
spacing may need small tweaks.

## What changed
**Daily-use speed**
- **Today** replaces the stat-tile dashboard: what is due or late (tick it off right there, with Undo), shopping list summary,
  what to use soon, this month's spending in plain words.
- **Quick add** button (bottom-right; press `c` on desktop): task, grocery item or expense in one field. Remembers your last choice.
- Grocery ticks and the Shopping screen are **instant**. The per-item browser `prompt()` for prices is gone: one tap puts an item in the cart
  (Undo available) and you enter the receipt total at the end.
- Actions confirm with a toast and **Undo** instead of blocking pop-ups.

**Navigation**
- Phone bottom bar: Today, Tasks, Groceries, Pantry, **More** (Money, Groups, Settings, group switcher, Sign out; Admin only for admins).
  Groups and Settings were previously unreachable on phones.
- Admin link is hidden for non-admins. Safe-area padding for phones with a home bar.

**Looks and wording (less "generated", more human)**
- Automated clean-up across 45 component files: no extra-bold uppercase micro-labels, no wide letter-spacing, no 9-11px text, no italics,
  no blur, no coloured glows, no hover-zoom, heavy shadows toned down, gradients replaced by flat colours. Generator comments removed from the CSS.
- Plain-spoken copy: login, notifications ("Overdue", "Picked up", "Done"), empty states, confirmations. No exclamation marks.
- Native `confirm()` / `alert()` replaced everywhere by one dialog and toasts. Toasts now sit bottom-centre above the nav.
- Follows the device's light/dark setting until you choose a theme.
- Loading skeleton, friendly error page with "Try again", and a 404 page.

**Accounts**
- New **Forgot password** and **Reset password** pages (completes the P0 reset-flow fix). Link added to sign-in.

**Correctness**
- One money formatter: no more hard-coded `$`. Set `NEXT_PUBLIC_DEFAULT_CURRENCY` (e.g. `BDT`) for all amounts and new entries.
- Overdue reminders no longer fire for cancelled tasks or tasks that are only due today.
- ~35 icon-only buttons now have accessible labels; list-item action buttons are visible on touch screens (they used to appear only on hover).
- Account deletion text now says what really happens (account closed and signed out).

## Still to do
- Per-user currency, timezone and week-start settings (today: one app-wide currency; "today" uses the server's timezone for the Today query).
- PWA install and offline shopping list.
- Page-by-page design review of Tasks, Finance and Pantry beyond the automated clean-up; remaining stray `slate-*` colours instead of theme tokens.
- Remaining icon-only controls that are not `Button size="icon"` have not been audited for labels.
- Keep `.env` out of zips you share: your upload contained one. If that zip was shared, rotate its secrets.
