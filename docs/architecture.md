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

| Path               | Who                | What                                                                                                                                                 |
| ------------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/login`           | anyone             | Username and password                                                                                                                                |
| `/change-password` | temporary password | Choose your own                                                                                                                                      |
| `/`                | in a household     | Home: counts (expired, today, next 3 days, this week), "Use these first", "What can I cook?"; `?add=1` opens Add food (the installed app's shortcut) |
| `/storage`         | in a household     | Everything, most urgent first; `?place=`, `?status=`, `?urgency=`                                                                                    |
| `/freezer`         | in a household     | Every freezer, grouped by how long ago it went in (`placedOn`)                                                                                       |
| `/shopping`        | in a household     | Shopping list; staples running low                                                                                                                   |
| `/waste`           | in a household     | Waste report: thrown away against eaten, why, what, per month                                                                                        |
| `/household`       | in a household     | People; places and categories (managers change them)                                                                                                 |
| `/admin`           | admin              | Households and people: create, roles, move, disable, reset password                                                                                  |
| `/settings`        | everyone           | You, notifications (this device, hour, test), theme, password, sign out                                                                              |

Someone without a household sees "You are not in a household yet"; an admin without one is sent
to `/admin`. Buttons a role cannot use are hidden (`can(user, role)` in `src/lib/food.js`); the API
checks every action anyway.

## Installable app and notifications

- `public/manifest.webmanifest` (name, icons, shortcuts) and `public/sw.js`, registered in
  `main.jsx`. The service worker caches nothing; it only shows push messages and opens the app at
  the message's `url` when one is tapped.
- `src/lib/push.js`: `pushSupport()` (`ok`, `ios-install`, `unsupported`, `denied`),
  `turnOnPush(publicKey)` (permission, `pushManager.subscribe`, `POST /push/subscriptions`) and
  `turnOffPush()` (this device only). On iPhone push needs the app on the Home Screen, and the
  settings card says so.
- Icons: `favicon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (full bleed),
  `apple-touch-icon.png`.

## Barcodes

The add form looks a barcode up with `GET /foods/barcode/:code` (the household's own food first,
then Open Food Facts on the server). `BarcodeScanner.jsx` uses the browser's `BarcodeDetector`
and the back camera when both exist (Chrome on Android); otherwise the digits are typed. The camera
stops as soon as a code is read or the form closes. nginx allows `camera=(self)`.

## State

Server state with TanStack Query (in memory only). Query keys: `['stock', ...]` (lists, summary,
items), `['places']`, `['categories']`, `['foods']`, `['household']`, `['shopping']`,
`['reports', 'waste', months]`, `['push', ...]`, `['admin', ...]`. Any change to food invalidates
`stock`, `places` (their counts), `foods` and `shopping`. "What can I cook?" is a mutation (asked
each time, never cached). Lists refetch when the app comes back
into focus, because someone else in the family may have changed something.

## Folders

```
src/app/              routes, AuthContext, the shell (sidebar, header, account menu), nav.js
src/components/ui/    shadcn/ui files (as the CLI writes them) and the kit in index.jsx
src/features/auth     login, change password
src/features/home     Home, "What can I cook?"
src/features/stock    Storage, Freezer, add form (barcode), item dialog (use, open, move, finish, throw away, staple, correct)
src/features/shopping shopping list
src/features/reports  waste report
src/features/household household page, places and categories hooks
src/features/admin    households and people
src/features/settings settings, notifications card
src/lib/              api client, food.js (wording, roles, units), push.js, theme
public/               sw.js, manifest, icons, theme.js
src/test/             setup and render.jsx (a fake API on fetch for tests)
```
