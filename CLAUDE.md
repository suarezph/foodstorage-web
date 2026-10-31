# UseFirst Web

React + Vite client for **UseFirst**, a private family app: what food a household has, where,
and what expires soon. Backend and API contract: `suarezph/foodstorage-api` (`docs/api.md` is the
source of truth; the date rules are in its `docs/features/stock.md`). No public sign-up: the admin
creates households and accounts (API ADR 0002). Built on a copy of Basemint's web base; the two
apps share nothing at runtime (API ADR 0001).

**Name:** the app is called **UseFirst** (renamed from "Food Storage" on 2026-10-31) at **usefirst.alexjohnsuarez.com**. Repos, the
database, the system user, service names keep `foodstorage`: they are
technical names nobody sees, and renaming them would mean a migration for no gain.

## Status

| Area                                                                                                 | State     |
| ---------------------------------------------------------------------------------------------------- | --------- |
| Login with a username or email, session restore, change password, temporary passwords                | **Built** |
| App shell (shadcn sidebar-16), household name in the sidebar, light/dark                             | **Built** |
| Home: expired, today, next 3 days, this week; "Use these first"                                      | **Built** |
| Storage: places, search, in storage / finished / thrown away, add food, item dialog                  | **Built** |
| Household: people; places and categories with default days (managers)                                | **Built** |
| Admin: households, people, household roles, disable, reset password                                  | **Built** |
| Installable app (manifest, service worker), daily summary by push and/or email, settings card        | **Built** |
| Barcode scan (also iPhone) or type, shopping list with Put away, staples, waste report, freezer view | **Built** |
| "What can I cook?" and a Getting started checklist on Home                                           | **Built** |
| Medicine section (members and managers): 14-day flag, cabinet, for whom, dose note (API ADR 0008)    | **Built** |
| Production: https://usefirst.alexjohnsuarez.com, deployed by CI on push to main (with the API)       | **Live**  |

Tests: `npm test` (fake API on `fetch`, never the network; plus a check that docs/stack.md matches package.json).

## Commands

```bash
npm run dev       # vite on :5174; proxies /api to http://localhost:3001 (VITE_DEV_API_TARGET)
npm run build     # production build to dist/
npm test          # vitest run
npm run lint      # eslint + prettier --check
```

Run the API first (`foodstorage-api`: `npm run dev`). Create the first admin there with
`npm run user:create -- --username you --name You`, sign in, create a household under
"Households & people", put yourself in it as Manager, add your family.

## Hard rules

- **The access token lives in `lib/api/client.js` memory only**; the session comes back from the
  HttpOnly refresh cookie. Never put tokens in web storage, URLs or logs.
- **Roles are enforced by the API.** Hiding a button (`can(user, 'member' | 'manager')`) is
  convenience only.
- **No sign-up UI, ever, without an ADR.**
- **Dates from the API are plain `YYYY-MM-DD`**; urgency comes from the API (the household's time
  zone). Word it with `lib/food.js`: use by = "do not eat" when expired, best before = "check it".
- **Medicine is not for viewers**: nav `minRole: "member"` and the route guard hide it; the API
  refuses anyway. Never show a dose as advice: it is the family's own note.
- **Never colour alone**: urgency badges always carry words.
- No `dangerouslySetInnerHTML`, no `eval`, no third-party scripts.
- **The service worker caches nothing** (no stale app after a deploy). It shows push messages and
  opens the app; keep it that way unless an ADR says otherwise.
- **The camera is only on while scanning** and stops when a code is read or the form closes.

## UI conventions

- Mobile first (the app is used in the kitchen on a phone). Theme tokens only (`bg-primary`,
  `text-negative`, `text-warning`, ...), no palette classes or hex in components.
- Feature folders own their components; `components/ui/index.jsx` is the kit (Button, Field,
  Dialog, Select, ...). Add a shadcn component with `npx shadcn@4.21.0 add <name>`.
- Commits: Conventional Commits. Stack changes update `docs/stack.md` (a test checks it).

## Definition of done

Docs match the code in the same PR: `docs/architecture.md` (routes, state), `docs/stack.md`, this
file, README, and the API repo's docs for any contract change.
