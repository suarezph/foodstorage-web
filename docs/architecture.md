# Architecture

React + Vite single-page app. It talks only to `foodstorage-api` under `/api/v1` on the same
origin (in development Vite proxies `/api` to `http://localhost:3001`). The API contract is
`foodstorage-api/docs/api.md`.

## Session

- The access token lives in `src/lib/api/client.js` memory only; a reload restores the session
  from the API's HttpOnly refresh cookie (`fs_refresh`). On a 401 the client refreshes once and
  retries.
- `AuthContext` holds `user` (with `household` and `householdRole`). A temporary password holds the
  person on `/change-password`.

## Routes

| Path               | Who                | What                                                                     |
| ------------------ | ------------------ | ------------------------------------------------------------------------ |
| `/login`           | anyone             | Username and password                                                    |
| `/change-password` | temporary password | Choose your own                                                          |
| `/`                | in a household     | Home: counts (expired, today, next 3 days, this week), "Use these first" |
| `/storage`         | in a household     | Everything, most urgent first; `?place=`, `?status=`, `?urgency=`        |
| `/household`       | in a household     | People; places and categories (managers change them)                     |
| `/admin`           | admin              | Households and people: create, roles, move, disable, reset password      |
| `/settings`        | everyone           | You, theme, password, sign out                                           |

Someone without a household sees "You are not in a household yet"; an admin without one is sent
to `/admin`. Buttons a role cannot use are hidden (`can(user, role)` in `src/lib/food.js`); the API
checks every action anyway.

## State

Server state with TanStack Query (in memory only). Query keys: `['stock', ...]` (lists, summary,
items), `['places']`, `['categories']`, `['foods']`, `['household']`, `['admin', ...]`. Any change to
food invalidates `stock`, `places` (their counts) and `foods`. Lists refetch when the app comes back
into focus, because someone else in the family may have changed something.

## Folders

```
src/app/              routes, AuthContext, the shell (sidebar, header, account menu), nav.js
src/components/ui/    shadcn/ui files (as the CLI writes them) and the kit in index.jsx
src/features/auth     login, change password
src/features/home     Home
src/features/stock    Storage page, add form, item dialog (use, open, move, finish, throw away, correct)
src/features/household household page, places and categories hooks
src/features/admin    households and people
src/features/settings settings
src/lib/              api client, food.js (wording, roles, units), theme
src/test/             setup and render.jsx (a fake API on fetch for tests)
```
