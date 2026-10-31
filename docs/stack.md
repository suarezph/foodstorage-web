# Stack

Everything the Food Storage web app uses, with versions. `src/stack-doc.test.js` fails if the
"Installed packages" tables and `package.json` disagree. Update this file in the same change as any
dependency.

The base (shadcn/ui kit, app shell, API client, auth screens, theme) is copied from Basemint's web
app, not shared (API repo ADR 0001).

- **Styling:** Tailwind CSS 4 + shadcn/ui (Radix). Theme tokens in `src/index.css`: neutral with
  orange as the brand colour; `negative` (expired), `warning` (soon). System fonts.
- **Icons:** lucide-react. **Charts:** none yet. **Animation:** Tailwind transitions only.

## Installed packages

<!-- installed:start -->

### App

| Package                    | Version | Used for                                         |
| -------------------------- | ------- | ------------------------------------------------ |
| `react`                    | 19.3    | UI                                               |
| `react-dom`                | 19.3    | Rendering                                        |
| `react-router-dom`         | 7.18    | Routes, filters in the address                   |
| `@tanstack/react-query`    | 5.105   | Server state (in-memory cache only)              |
| `react-hook-form`          | 7.91    | Login and password forms                         |
| `@hookform/resolvers`      | 5.9     | zod with react-hook-form                         |
| `zod`                      | 4.6     | Form validation                                  |
| `radix-ui`                 | 1.6     | shadcn/ui primitives (dialog, dropdown, sidebar) |
| `class-variance-authority` | 0.7     | shadcn/ui variants                               |
| `cn`                       | 0.4     | Class name merging                               |
| `lucide-react`             | 1.65    | Icons                                            |

### Build and tests

| Package                       | Version | Used for                                   |
| ----------------------------- | ------- | ------------------------------------------ |
| `vite`                        | 8.3     | Dev server (proxies `/api`) and build      |
| `@vitejs/plugin-react`        | 6.1     | React in Vite                              |
| `tailwindcss`                 | 4.3     | Styles                                     |
| `@tailwindcss/vite`           | 4.3     | Tailwind in Vite                           |
| `vitest`                      | 5.0     | Tests                                      |
| `jsdom`                       | 29.1    | Browser environment for tests              |
| `@testing-library/react`      | 16.3    | Component tests                            |
| `@testing-library/user-event` | 14.6    | Typing and clicking in tests               |
| `@testing-library/jest-dom`   | 7.0     | DOM matchers                               |
| `eslint`                      | 9.39    | Lint (eslint-plugin-react supports 9 only) |
| `@eslint/js`                  | 9.39    | ESLint's recommended rules                 |
| `eslint-plugin-react`         | 7.37    | React lint rules                           |
| `eslint-plugin-react-hooks`   | 7.1     | Hooks lint rules                           |
| `globals`                     | 17.13   | Browser and Node globals for ESLint        |
| `prettier`                    | 3.9     | Formatting                                 |

<!-- installed:end -->
