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

| Path               | Who                | What                                                                                                                                                                                                   |
| ------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/login`           | anyone             | Username or email, and password                                                                                                                                                                        |
| `/change-password` | temporary password | Choose your own                                                                                                                                                                                        |
| `/`                | in a household     | Home: counts (expired, today, next 3 days, this week), "Use these first", "What can I cook?", a "Getting started" checklist for new households; `?add=1` opens Add food (the installed app's shortcut) |
| `/storage`         | in a household     | Everything, most urgent first; `?place=`, `?status=`, `?urgency=`                                                                                                                                      |
| `/freezer`         | in a household     | Every freezer, grouped by how long ago it went in (`placedOn`)                                                                                                                                         |
| `/shopping`        | in a household     | Shopping list; staples running low; "Put away" a bought item (Add food filled in)                                                                                                                      |
| `/waste`           | in a household     | Waste report: thrown away against eaten, why, what, per month                                                                                                                                          |
| `/household`       | in a household     | People; places and categories (managers change them)                                                                                                                                                   |
| `/admin`           | admin              | Households and people: create, roles, move, disable, reset password                                                                                                                                    |
| `/settings`        | everyone           | You (with email), daily summary (on/off, hour, by email and/or push on this device, tests), theme, password, sign out                                                                                  |

Someone without a household sees "You are not in a household yet"; an admin without one is sent
to `/admin`. Buttons a role cannot use are hidden (`can(user, role)` in `src/lib/food.js`); the API
checks every action anyway.

## Installable app and notifications

- `public/manifest.webmanifest` (name, icons, shortcuts) and `public/sw.js`, registered in
  `main.jsx`. The service worker caches nothing; it only shows push messages and opens the app at
  the message's `url` when one is tapped.
- The daily summary can also come by email (API ADR 0007). The Settings card shows both ways:
  "Email it to …" with a test email, and push for this device. Which ways the server supports
  comes from `GET /push/settings` (`available`).
- `src/lib/push.js`: `pushSupport()` (`ok`, `ios-install`, `unsupported`, `denied`),
  `turnOnPush(publicKey)` (permission, `pushManager.subscribe`, `POST /push/subscriptions`) and
  `turnOffPush()` (this device only). On iPhone push needs the app on the Home Screen, and the
  settings card says so.
- Icons: `favicon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (full bleed),
  `apple-touch-icon.png`.

## Barcodes

The add form looks a barcode up with `GET /foods/barcode/:code` (the household's own food first,
then Open Food Facts on the server). `BarcodeScanner.jsx` uses the back camera with the browser's
`BarcodeDetector` when it has one (Chrome on Android), otherwise the `barcode-detector` polyfill
(ZXing in WebAssembly, iPhone Safari), imported only when scanning starts, with its `.wasm` served
from our own `/assets/`. The digits can always be typed. The camera
stops as soon as a code is read or the form closes. nginx allows `camera=(self)`.

## Deploying

GitHub Actions builds the app (`npm run build`, plus `dist/version.txt`) and streams `dist/` as a
`.tar.gz` over SSH; the server's `foodstorage-deploy` (API repo `deploy/deploy.sh`) unpacks it into
`/var/www/foodstorage`. Nothing is built on the server.

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
src/features/admin    households and people (with email; add one to older accounts)
src/features/settings settings, notifications card
src/lib/              api client, food.js (wording, roles, units), push.js, theme
public/               sw.js, manifest, icons, theme.js
src/test/             setup and render.jsx (a fake API on fetch for tests)
```
