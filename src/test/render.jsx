import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { App } from '../app/App.jsx';
import { AuthProvider } from '../app/AuthContext.jsx';

export const HOUSEHOLD = {
  id: 'h1',
  name: 'Suarez Family Food Storage',
  timeZone: 'Asia/Singapore',
};

export const userWith = (overrides = {}) => ({
  id: 'u1',
  username: 'alex',
  email: 'alex@example.com',
  name: 'Alex',
  role: 'user',
  household: HOUSEHOLD,
  householdRole: 'manager',
  mustChangePassword: false,
  createdAt: '2026-10-31T00:00:00.000Z',
  ...overrides,
});

export const PLACES = [
  { id: 'p1', name: 'Fridge', kind: 'fridge', position: 0, activeCount: 2 },
  { id: 'p2', name: 'Freezer', kind: 'freezer', position: 1, activeCount: 0 },
  { id: 'p3', name: 'Pantry', kind: 'pantry', position: 2, activeCount: 0 },
];

export const CATEGORIES = [
  { id: 'c1', name: 'Dairy', fridgeDays: 7, freezerDays: 90, pantryDays: null, openedDays: 5 },
  { id: 'c2', name: 'Snacks', fridgeDays: null, freezerDays: null, pantryDays: 90, openedDays: 14 },
];

export const item = (overrides = {}) => ({
  id: 's1',
  food: { id: 'f1', name: 'Fresh milk', category: { id: 'c1', name: 'Dairy' } },
  place: { id: 'p1', name: 'Fridge', kind: 'fridge' },
  quantity: 2,
  unit: 'carton',
  dateKind: 'use_by',
  expiresOn: '2026-11-02',
  expiresEstimated: false,
  addedOn: '2026-10-30',
  openedOn: null,
  openedExpiresOn: null,
  useBefore: '2026-11-02',
  urgency: { level: 'soon', daysLeft: 2 },
  status: 'active',
  discardReason: null,
  closedOn: null,
  notes: null,
  addedBy: 'Alex',
  ...overrides,
});

/**
 * A fake API on `fetch`. `routes` maps "METHOD /path" to a function (body, url) returning the
 * `data` to send, or `{ status, error }` for a failure. Unmatched calls answer 404. Every call is
 * recorded in `calls` as { method, path, body, query }.
 */
export function mockApi(routes) {
  const calls = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init = {}) => {
    const url = new URL(String(input), 'http://x');
    const path = url.pathname.replace(/^\/api\/v1/, '');
    const method = init.method ?? 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method, path, body, query: Object.fromEntries(url.searchParams) });
    const handler = routes[`${method} ${path}`];
    if (!handler) {
      return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found' } }), {
        status: 404,
      });
    }
    const out = await handler(body, url);
    if (out?.error) {
      return new Response(JSON.stringify({ error: out.error }), { status: out.status ?? 400 });
    }
    if (out === null) return new Response(null, { status: 204 });
    return new Response(JSON.stringify({ data: out }), { status: 200 });
  });
  return calls;
}

/** The routes every signed-in page needs: the session, places and categories. */
export const signedIn = (user = userWith()) => ({
  'POST /auth/refresh': () => ({ accessToken: 't', expiresIn: 900, user }),
  'GET /me': () => user,
  'GET /places': () => PLACES,
  'GET /categories': () => CATEGORIES,
  'GET /foods': () => [],
});

export function renderApp(path = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
